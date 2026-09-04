/* FS Explorer -- visual filesystem manager for the Dashboard, wired to
   the ttyd/tmux shell panes (assets/script/shells-host.js). Full design
   under spec/fs-explorer/.

   Model:
     - The panel drives ONE shell pane at a time. That pane can hold a
       local shell or a reverse shell the user caught in it -- the module
       doesn't care, it only ever talks to the ttyd port.
     - Green actions (navigate, list, read, probe) run automatically.
       Amber actions (chmod, privesc, ...) land in P3 and will only ever
       be *pasted*, never run by the module.
     - Every command the module runs is shown: the exact command + its
       output in the panel's own "Journal des commandes" (non-dismissable)
       and a one-line headline in the shared System log (window.systemLog).

   P1 scope: profile `posix` only. Read-only navigation -- pane picker,
   OS probe, directory listing (find -printf, with an ls -la fallback),
   breadcrumb, hidden-files toggle, permission grid, text-file preview,
   resync. Transport = short-lived WebSockets to ws://127.0.0.1:<port>/ws,
   same mechanism as shells-host.js's pasteIntoShell(). */
(function () {
  "use strict";

  // ------------------------------------------------------------------
  // Constants
  // ------------------------------------------------------------------
  var SHELL_TYPES = {
    bash: { basePort: 7681, label: "Bash" },
    zsh: { basePort: 7691, label: "Zsh" },
    pwsh: { basePort: 7701, label: "PowerShell" },
  };

  /* Capture terminal size. We read a shell pane by attaching a
     short-lived ttyd WebSocket to the SAME tmux session the browser
     terminal shows, then screen-scraping the result between our own
     markers. tmux renders one screen shared by all clients, so:
       - width must beat the browser client so our lines don't wrap
         (tmux soft-wraps at pane width and we can't tell a soft wrap
         from a real newline);
       - a TAB delimiter is out -- tmux expands tabs to spaces;
       - output must fit WITHOUT scrolling, otherwise the 2-line prompt
         redraws mid-stream and corrupts records.
     Hence: wide-ish, tall-ish, a printable multi-char field delimiter,
     a `clear` before long commands, and a hard entry cap. The visible
     pane briefly resizes to this while we're attached (tmux
     window-size "largest", see scripts/ttyd-shells.sh) -- accepted for
     P1, documented in spec/fs-explorer/03-architecture.md §3. */
  var CAP_COLS = 220;
  var CAP_ROWS = 100;
  var LISTING_CAP = 90; // entries per directory before truncation
  var SEP = "|@|"; // field delimiter inside a listing record

  // Per-shell-family capture timing. PowerShell + PSReadLine redraws the
  // input line character by character (syntax highlighting), so a long
  // command's echo streams slowly -- it needs a longer settle before we
  // send and a longer stall window before we give up.
  var SHELL_TIMING = {
    posix: { settleMs: 300, openFallbackMs: 800, stallMs: 2000, clearWaitMs: 400 },
    powershell: { settleMs: 550, openFallbackMs: 1800, stallMs: 3500, clearWaitMs: 900 },
  };

  // find -printf: one record per line, fields joined by SEP, name is
  // field 7 and link target field 8 (empty for non-links). Literal
  // backslash-n -- single-quoted in the command so find expands it.
  var FIND_FMT =
    "%m" + SEP + "%y" + SEP + "%s" + SEP + "%u" + SEP + "%g" + SEP +
    "%TY-%Tm-%Td %TH:%TM" + SEP + "%f" + SEP + "%l\\n";

  var PREVIEW_STEPS = [4096, 65536, 262144]; // posix: bytes
  var PREVIEW_LINE_STEPS = [200, 1000, 5000]; // windows: Get-Content -TotalCount
  function previewSteps() {
    return isWin() ? PREVIEW_LINE_STEPS : PREVIEW_STEPS;
  }
  function previewStepLabel(n) {
    return isWin() ? n + " lignes" : humanSize(n);
  }
  var PREVIEW_LINE_CAP = 400;
  var JOURNAL_MAX = 300;

  var BOOKMARKS_KEY_PREFIX = "/fs-explorer/bookmarks/";
  var BOOKMARKS_MAX = 500;

  /* posix enumeration presets (P2). `kind:"paths"` -> every result line
     starts with a filesystem path: clickable, and (bookmark:true)
     auto-added to the "intéressants" list. `kind:"text"` -> free output
     shown as-is. The `find` runs are `-xdev` (stay on one filesystem)
     to dodge /proc, /sys and network mounts. Each scan writes its
     output to a temp file on the target and streams a line count back;
     see runPreset(). */
  var PRESETS = [
    { id: "suid", label: "Binaires SUID", kind: "paths", bookmark: true,
      cmd: "find / -xdev -perm -4000 -type f 2>/dev/null" },
    { id: "sgid", label: "Binaires SGID", kind: "paths", bookmark: true,
      cmd: "find / -xdev -perm -2000 -type f 2>/dev/null" },
    { id: "caps", label: "Capabilities", kind: "paths", bookmark: true,
      cmd: "getcap -r / 2>/dev/null" },
    { id: "wwdir", label: "Dossiers world-writable", kind: "paths", bookmark: false,
      cmd: "find / -xdev -type d -perm -0002 2>/dev/null" },
    { id: "cron", label: "Cron", kind: "text", bookmark: false,
      cmd: "cat /etc/crontab 2>/dev/null; echo '--- cron.d / cron.daily / cron.hourly ---'; ls -la /etc/cron.d /etc/cron.daily /etc/cron.hourly 2>/dev/null" },
    { id: "sudo", label: "sudo -l", kind: "text", bookmark: false,
      cmd: "sudo -n -l 2>&1" },
    { id: "id", label: "id / groupes", kind: "text", bookmark: false,
      cmd: "id; echo; groups 2>/dev/null" },
    { id: "flags", label: "Flags (user/root/flag.txt)", kind: "paths", bookmark: true,
      cmd: "find / -xdev -type f \\( -name user.txt -o -name root.txt -o -name flag.txt \\) 2>/dev/null" },
  ];
  var PRESET_RESULT_CAP = 90;
  var PRESET_POLL_MS = 1500;
  var PRESET_MAX_MS = 180000;

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  var els = null; // cached skeleton nodes
  var state = {
    panes: [],
    pane: null, // { type, slot, title }
    profile: null, // "posix" | "windows" | "windows-cmd" | "unknown" | null
    cwd: null,
    entries: [],
    warnings: [],
    degraded: false,
    truncated: false,
    showHidden: false,
    preview: null, // { path, size, stepIdx, text, binary, loading }
    hostname: null, // target id, for the per-target bookmarks key
    bookmarks: [], // [{ path, source, ts }]
    presetRun: null, // { id, label, kind, bookmark, file, pid, count, done, cancelled, results, error, timedOut }
    pendingHighlight: null, // entry name to flash after the next listing
    actions: null, // { path, name, suid, sgid } -- the "Actions" (amber) panel target
  };

  var AMBER_ACK_KEY = "/fs-explorer/amberAcknowledged";
  var pendingAmber = null; // fn queued behind the first-time amber ack panel

  // one command at a time
  var queue = [];
  var running = false;
  var activeCapture = null;

  // ------------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------------
  function portFor(pane) {
    var spec = pane && SHELL_TYPES[pane.type];
    return spec ? spec.basePort + pane.slot - 1 : null;
  }

  function paneLabel(pane) {
    var spec = SHELL_TYPES[pane.type];
    var base = (spec ? spec.label : pane.type) + " " + pane.slot;
    return pane.title && pane.title !== base ? pane.title + " (" + base + ")" : base;
  }

  function isWin() {
    return state.profile === "windows";
  }

  function shellForProfile(p) {
    return p === "windows" ? "powershell" : "posix";
  }

  // POSIX single-quote: wrap in '...', escaping embedded quotes.
  function shq(s) {
    return "'" + String(s).replace(/'/g, "'\\''") + "'";
  }

  // PowerShell single-quote: '...' with '' escaping.
  function psq(s) {
    return "'" + String(s).replace(/'/g, "''") + "'";
  }

  // Quote a path for the current profile's shell.
  function q(s) {
    return isWin() ? psq(s) : shq(s);
  }

  function joinPath(dir, name) {
    if (isWin()) {
      return dir.replace(/[\\/]+$/, "") + "\\" + name;
    }
    if (dir === "/") return "/" + name;
    return dir.replace(/\/+$/, "") + "/" + name;
  }

  // Parent directory of an absolute path, honouring the profile's
  // separator. "/" -> "/", "C:\\" -> "C:\\".
  function parentDir(p) {
    if (isWin()) {
      var t = String(p).replace(/[\\/]+$/, "");
      var i = t.lastIndexOf("\\");
      if (i < 0) i = t.lastIndexOf("/");
      if (i <= 0 || /^[a-zA-Z]:$/.test(t.slice(0, i))) {
        return (t.slice(0, 2) || "C:") + "\\";
      }
      return t.slice(0, i);
    }
    var tt = String(p).replace(/\/+$/, "");
    var j = tt.lastIndexOf("/");
    return j <= 0 ? "/" : tt.slice(0, j);
  }

  function stripAnsi(s) {
    return s
      .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "") // OSC (title, ...)
      .replace(/\x1b\([AB0]/g, "") // charset select (\x1b(B etc.)
      .replace(/\x1b[@-Z\\-_]/g, "") // other 2-char escapes
      .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, "") // CSI
      .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f]/g, ""); // C0 except \t \n \0
  }

  function looksBinary(s) {
    if (s.indexOf("\u0000") !== -1) return true;
    if (!s.length) return false;
    var bad = 0;
    for (var i = 0; i < s.length; i++) {
      if (s.charCodeAt(i) === 0xfffd) bad++;
    }
    return bad / s.length > 0.05;
  }

  function humanSize(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return "";
    if (n < 1024) return n + " o";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " Kio";
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " Mio";
    return (n / (1024 * 1024 * 1024)).toFixed(1) + " Gio";
  }

  // octal string ("755", "4755", "0644") -> rwx view + flags
  function modeInfo(oct) {
    var n = parseInt(oct, 8);
    if (isNaN(n)) {
      return { str: "?????????", suid: false, sgid: false, sticky: false, worldWrite: false, otherExec: false };
    }
    var perm = n & 0o777;
    var suid = !!(n & 0o4000);
    var sgid = !!(n & 0o2000);
    var sticky = !!(n & 0o1000);
    var shifts = [6, 3, 0];
    var str = "";
    for (var gi = 0; gi < 3; gi++) {
      var g = (perm >> shifts[gi]) & 7;
      var t = (g & 4 ? "r" : "-") + (g & 2 ? "w" : "-");
      if (gi === 0 && suid) t += g & 1 ? "s" : "S";
      else if (gi === 1 && sgid) t += g & 1 ? "s" : "S";
      else if (gi === 2 && sticky) t += g & 1 ? "t" : "T";
      else t += g & 1 ? "x" : "-";
      str += t;
    }
    return {
      str: str,
      suid: suid,
      sgid: sgid,
      sticky: sticky,
      worldWrite: !!(perm & 0o002),
      otherExec: !!(perm & 0o001),
    };
  }

  // PowerShell "Mode" string ("d-rh-", "-a---", "la---") -> flags.
  function winModeInfo(m) {
    m = String(m || "");
    return {
      str: m || "-----",
      isDir: m.indexOf("d") !== -1,
      isLink: m.indexOf("l") !== -1,
      hidden: m.indexOf("h") !== -1,
      system: m.indexOf("s") !== -1,
      readonly: m.indexOf("r") !== -1,
      archive: m.indexOf("a") !== -1,
    };
  }

  // ------------------------------------------------------------------
  // Transport: request the open pane list from shells-host.js
  // ------------------------------------------------------------------
  function requestPaneList() {
    return new Promise(function (resolve) {
      var reqId = "fsx-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      var timer = setTimeout(function () {
        window.removeEventListener("message", onMsg);
        resolve([]);
      }, 900);
      function onMsg(e) {
        if (!e.data || e.data.type !== "fs-shell-list-response" || e.data.requestId !== reqId) return;
        clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        resolve(Array.isArray(e.data.shells) ? e.data.shells : []);
      }
      window.addEventListener("message", onMsg);
      try {
        window.top.postMessage({ type: "fs-shell-list-request", requestId: reqId }, "*");
      } catch (err) {
        clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        resolve([]);
      }
    });
  }

  // ------------------------------------------------------------------
  // Transport: run a command in a pane and capture its output
  // ------------------------------------------------------------------
  function encodeInput(text) {
    var body = new TextEncoder().encode(text);
    var frame = new Uint8Array(body.length + 1);
    frame[0] = 48; // ttyd INPUT ('0')
    frame.set(body, 1);
    return frame;
  }

  // Pull the block between our begin/end marker lines out of the
  // captured screen text. Each marker sits alone on its line; the
  // echoed command mentions them only mid-line, so an exact match on
  // the trimmed line can't hit the echo. Lines that don't parse (the
  // prompt, the echoed command) are simply left in `output` for the
  // caller's own record filter to skip.
  // Matching B/E as a SUFFIX rather than the whole trimmed line, on
  // both ends, is deliberate: the typed command itself (the `printf
  // 'B\n'; { cmd; } ...` wrapper) is long enough to wrap onto a second
  // screen row when it's echoed back, and the cursor-repositioning
  // escape sequence tmux emits at that wrap point leaves no literal
  // newline once stripAnsi runs -- so the tail of that echoed line can
  // end up glued directly onto the real "B" marker's own output line
  // with nothing separating them. An exact-equality match on B then
  // never fires: bi stays unset for the rest of the scan, every real
  // line (including the one carrying the end marker) gets silently
  // skipped by the `bi < 0` branch, and the capture is reported as a
  // clean rc-0 success with empty output -- indistinguishable from a
  // target that's genuinely empty (see renderListing). The same fusion
  // can happen at the tail end too, if the command's last real output
  // line doesn't itself end in a newline before our end-marker printf
  // runs. Anchoring each marker to the END of its line instead (they're
  // random 12-char IDs, so a false suffix match is not a real risk)
  // means any such glued prefix is simply harmless leading garbage on
  // that one line, correctly excluded from / folded into the output.
  function parseCapture(raw, B, E) {
    var clean = stripAnsi(raw).replace(/\r/g, "");
    var lines = clean.split("\n");
    var bi = -1;
    var endRe = new RegExp(E + ":(-?\\d+)$");
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (bi < 0) {
        if (t.length >= B.length && t.slice(t.length - B.length) === B) bi = i;
        continue;
      }
      var m = t.match(endRe);
      if (m) {
        var outLines = lines.slice(bi + 1, i);
        var prefix = t.slice(0, t.length - m[0].length);
        if (prefix) outLines.push(prefix);
        return {
          complete: true,
          rc: parseInt(m[1], 10),
          output: outLines.join("\n"),
        };
      }
    }
    return { complete: false, rc: null, output: bi >= 0 ? lines.slice(bi + 1).join("\n") : "" };
  }

  /* One command, one short-lived WebSocket to the pane's ttyd.
     Sequence: wait for the prompt to go quiet -> (optionally) send
     `clear` and wait -> send `\x15` + `printf MARKER; { cmd; } 2>&1;
     printf MARKER:rc` + `\r` -> accumulate PTY output until the end
     marker (or timeout) -> hand the block between markers to the
     caller. See CAP_COLS / CAP_ROWS for why the terminal is sized the
     way it is. Returns { promise, cancel }. */
  function runCapture(port, command, opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs || 15000;
    var clearFirst = !!opts.clearFirst;
    // Every green (automatic) command is typed into the SAME tmux
    // session as the visible pane -- see the file header -- so its
    // marker-wrapped `printf`/echo and raw output linger there once
    // we're done with it, cluttering a terminal the user (or whoever
    // is watching a reverse shell) may also be reading. We've already
    // buffered everything we need into `raw` by the time a capture
    // finishes, so a `clear` sent right after can't lose data -- it
    // only tidies the shared screen. Opt out with noTidy for a tight
    // polling loop (pollPreset) where clearing every ~1.5s would just
    // make the pane flicker.
    var tidyAfter = !opts.noTidy;
    var shell = opts.shell === "powershell" ? "powershell" : "posix";
    var T = SHELL_TIMING[shell];
    var ID = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2))
      .slice(0, 12)
      .toUpperCase();
    var B = "FSXB" + ID;
    var E = "FSXE" + ID;
    var clearCmd = shell === "powershell" ? "Clear-Host" : "clear";
    var wrapped =
      shell === "powershell"
        ? "Write-Output '" + B + "'; try { " + command + " } catch { Write-Output $_.Exception.Message }; " +
          "Write-Output ('" + E + ":' + $(if($?){'0'}else{'1'}))"
        : "printf '" + B + "\\n'; { " + command + " ; } 2>&1; printf '" + E + ":%d\\n' \"$?\"";

    var ws = null;
    var raw = "";
    var dec = new TextDecoder();
    var finished = false;
    var phase = "settling"; // settling -> cleared -> sent
    var hardTimer = null;
    var settleTimer = null;
    var quietTimer = null;
    var cancelFn = function () {};

    var promise = new Promise(function (resolve, reject) {
      function finish(result, err) {
        if (finished) return;
        finished = true;
        clearTimeout(hardTimer);
        clearTimeout(settleTimer);
        clearTimeout(quietTimer);
        function closeAndSettle() {
          try {
            if (ws) ws.close();
          } catch (e) {}
          if (err) reject(err);
          else resolve(result);
        }
        // Only worth tidying up a pane we actually typed into and got a
        // real response from -- not one that errored out or never made
        // it past settling (nothing of ours is on screen there anyway).
        if (!err && tidyAfter && phase === "sent" && ws && ws.readyState === 1 /* OPEN */) {
          try {
            ws.send(encodeInput("\x15" + clearCmd + "\r"));
            setTimeout(closeAndSettle, 150);
            return;
          } catch (e) {}
        }
        closeAndSettle();
      }
      cancelFn = function () {
        finish(null, new Error("annulé"));
      };

      hardTimer = setTimeout(function () {
        var p = parseCapture(raw, B, E);
        p.timedOut = true;
        finish(p);
      }, timeoutMs);

      try {
        ws = new WebSocket("ws://127.0.0.1:" + port + "/ws", ["tty"]);
      } catch (e) {
        finish(null, e);
        return;
      }
      ws.binaryType = "arraybuffer";

      function sendReal() {
        phase = "sent";
        raw = ""; // drop the pre-command screen (prompt, stale output)
        try {
          ws.send(encodeInput("\x15" + wrapped + "\r"));
        } catch (e) {
          finish(null, e);
        }
      }

      // Called once output has been quiet for a beat (or, via the open
      // handler's fallback, if nothing was ever sent to us): clear first
      // if asked, otherwise fire the real command.
      function onSettle() {
        if (finished) return;
        if (phase === "settling" && clearFirst) {
          phase = "cleared";
          try {
            ws.send(encodeInput("\x15" + clearCmd + "\r"));
          } catch (e) {
            finish(null, e);
            return;
          }
          settleTimer = setTimeout(onSettle, T.clearWaitMs);
        } else if (phase !== "sent") {
          sendReal();
        }
      }

      ws.addEventListener("open", function () {
        ws.send(JSON.stringify({ AuthToken: "", columns: CAP_COLS, rows: CAP_ROWS }));
        // Fallback: tmux normally paints the screen on attach, but if it
        // doesn't we'd never arm the settle timer from a message.
        settleTimer = setTimeout(onSettle, T.openFallbackMs);
      });

      ws.addEventListener("message", function (ev) {
        var d = new Uint8Array(ev.data);
        if (d.length === 0 || d[0] !== 48) return; // only '0' = PTY output
        var chunk = dec.decode(d.subarray(1), { stream: true });

        if (phase !== "sent") {
          clearTimeout(settleTimer);
          settleTimer = setTimeout(onSettle, T.settleMs);
          return;
        }

        raw += chunk;
        var p = parseCapture(raw, B, E);
        if (p.complete) {
          finish(p);
          return;
        }
        clearTimeout(quietTimer);
        quietTimer = setTimeout(function () {
          finish(parseCapture(raw, B, E));
        }, T.stallMs);
      });

      ws.addEventListener("error", function () {
        finish(null, new Error("WebSocket indisponible sur :" + port));
      });
      ws.addEventListener("close", function () {
        if (!finished) finish(parseCapture(raw, B, E));
      });
    });

    return {
      promise: promise,
      cancel: function () {
        cancelFn();
      },
    };
  }

  // ------------------------------------------------------------------
  // Command queue (serialised) + journal
  // ------------------------------------------------------------------
  function run(command, opts) {
    return new Promise(function (resolve, reject) {
      queue.push({ command: command, opts: opts || {}, resolve: resolve, reject: reject });
      pump();
    });
  }

  function pump() {
    if (running || !queue.length) return;
    if (!state.pane) {
      var j = queue.shift();
      j.reject(new Error("aucun pane sélectionné"));
      return pump();
    }
    var port = portFor(state.pane);
    if (!port) {
      var j2 = queue.shift();
      j2.reject(new Error("pane invalide"));
      return pump();
    }

    running = true;
    var job = queue.shift();
    // Default the shell family from the pane's profile unless the caller
    // pinned one (the OS probe does, since the profile isn't known yet).
    if (!job.opts.shell) job.opts.shell = shellForProfile(state.profile);
    setBusy(true);
    var cap = runCapture(port, job.command, job.opts);
    activeCapture = cap;

    cap.promise.then(
      function (res) {
        var lvl = res.rc && res.rc !== 0 ? "fail" : res.timedOut ? "pending" : "ok";
        journalAppend(job.command, res.output, res, lvl, job.opts.label);
        running = false;
        activeCapture = null;
        setBusy(false);
        job.resolve(res);
        pump();
      },
      function (err) {
        journalAppend(job.command, String((err && err.message) || err), null, "fail", job.opts.label);
        running = false;
        activeCapture = null;
        setBusy(false);
        job.reject(err);
        pump();
      }
    );
  }

  function cancelActive() {
    queue.splice(0, queue.length).forEach(function (j) {
      j.reject(new Error("annulé"));
    });
    if (activeCapture) activeCapture.cancel();
  }

  function journalAppend(cmd, output, res, level, label) {
    var wrap = els.journalBody;
    var entry = document.createElement("div");
    entry.className = "fsx-jentry" + (level === "fail" ? " fail" : level === "pending" ? " pending" : "");

    // A short human descriptor above the real command line, when the
    // caller gave one -- but the "$ ..." line always shows the EXACT
    // command that ran (minus the printf capture markers), never the
    // descriptor. That's the transparency the journal is for.
    if (label) {
      var lab = document.createElement("div");
      lab.className = "fsx-jlabel";
      lab.textContent = label;
      entry.appendChild(lab);
    }

    var line = document.createElement("div");
    line.className = "fsx-jcmd";
    var rcTxt = res && typeof res.rc === "number" ? "  [rc " + res.rc + "]" : "";
    if (res && res.timedOut) rcTxt += "  [timeout]";
    line.textContent = "$ " + cmd + rcTxt;
    entry.appendChild(line);

    if (output != null && output !== "") {
      var pre = document.createElement("pre");
      pre.className = "fsx-jout";
      pre.textContent = output.length > 8000 ? output.slice(0, 8000) + "\n… (tronqué)" : output;
      entry.appendChild(pre);
    }

    wrap.appendChild(entry);
    while (wrap.children.length > JOURNAL_MAX) wrap.removeChild(wrap.firstChild);
    wrap.scrollTop = wrap.scrollHeight;

    if (window.systemLog) {
      // The System log is the headline tier -- use the short descriptor
      // when there is one, the command otherwise.
      var head = label || cmd;
      if (head.length > 90) head = head.slice(0, 90) + "…";
      window.systemLog.push({
        source: "fs",
        text: head + (res && typeof res.rc === "number" && res.rc !== 0 ? " (rc " + res.rc + ")" : ""),
        level: level === "fail" ? "fail" : level === "pending" ? "pending" : "info",
      });
    }
  }

  // ------------------------------------------------------------------
  // Filesystem operations (profile: posix)
  // ------------------------------------------------------------------
  // Try posix, then PowerShell, then cmd.exe -- each probe pinned to the
  // shell family it's written in (the profile isn't known yet).
  function detectProfile() {
    return run("uname -s 2>/dev/null || echo UNKNOWN", {
      label: "sonde OS : uname -s",
      shell: "posix",
      timeoutMs: 3500,
    }).then(function (res) {
      var out = (res.output || "").trim();
      if (res.rc === 0 && /linux|darwin|bsd|sunos|aix/i.test(out)) return "posix";
      return run("$PSVersionTable.PSVersion.ToString()", {
        label: "sonde OS : PowerShell",
        shell: "powershell",
        timeoutMs: 12000,
      }).then(
        function (r2) {
          if (/^\d+\.\d+/.test((r2.output || "").trim())) return "windows";
          return run("ver", { label: "sonde OS : ver", shell: "posix", timeoutMs: 5000 }).then(
            function (r3) {
              return /Microsoft Windows \[Version/i.test(r3.output || "") ? "windows-cmd" : "unknown";
            },
            function () {
              return "unknown";
            }
          );
        },
        function () {
          return "unknown";
        }
      );
    }, function () {
      return "unknown";
    });
  }

  function looksAbsPath(s) {
    return /^([a-zA-Z]:[\\/]|\/|\\\\)/.test(s);
  }

  function fetchPwd() {
    var cmd = isWin() ? "(Get-Location).Path" : "pwd -P";
    return run(cmd, { label: cmd }).then(function (res) {
      var lines = (res.output || "").split("\n").map(function (x) {
        return x.trim();
      });
      for (var i = lines.length - 1; i >= 0; i--) {
        if (looksAbsPath(lines[i])) return lines[i];
      }
      return isWin() ? "C:\\" : "/";
    });
  }

  // Records are "%m|@|%y|@|%s|@|%u|@|%g|@|<mtime>|@|%f|@|%l", one per
  // line. Lines that aren't a well-formed record (the prompt, the
  // echoed command, a `find:` error, but ALSO a record fragment cut by
  // an unexpected line wrap -- see runCapture's CAP_COLS comment) are
  // collected as warnings rather than silently dropped: a screen-scrape
  // that got corrupted this way still produces zero valid entries, and
  // without a warning that's indistinguishable from a genuinely empty
  // directory (see renderListing).
  function parseFindListing(text) {
    var entries = [];
    var warnings = [];
    text.split("\n").forEach(function (raw) {
      if (!raw.trim()) return;
      var f = raw.split(SEP);
      if (f.length !== 8 || !/^[0-7]{3,4}$/.test(f[0].trim()) || "fdlbcps".indexOf(f[1]) === -1) {
        warnings.push(raw.trim());
        return;
      }
      var type = f[1];
      entries.push({
        type: type === "d" ? "dir" : type === "l" ? "link" : type === "f" ? "file" : "other",
        rawType: type,
        mode: f[0].trim(),
        size: f[2],
        user: f[3],
        group: f[4],
        mtime: f[5],
        name: f[6],
        linkTarget: f[7] || "",
      });
    });
    return { entries: entries, warnings: warnings };
  }

  function parseLsListing(text) {
    var entries = [];
    var warnings = [];
    text.split("\n").forEach(function (raw) {
      if (!raw || /^total\s/i.test(raw)) return;
      // perms links owner group size <rest = date... name>
      var m = raw.match(/^([-dlbcps])(\S{9})\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(.*)$/);
      if (!m) {
        if (raw.trim()) warnings.push(raw.trim());
        return;
      }
      var rest = m[7];
      // best-effort: name is the last whitespace-delimited token (may
      // truncate names with spaces -- this path is the labelled fallback)
      var name = rest;
      var parts = rest.split(/\s+/);
      if (parts.length > 3) name = parts.slice(3).join(" ");
      var linkTarget = "";
      var arrow = name.indexOf(" -> ");
      if (arrow !== -1) {
        linkTarget = name.slice(arrow + 4);
        name = name.slice(0, arrow);
      }
      // symbolic perms -> rough octal so modeInfo() still works
      var sym = m[2];
      var oct = 0;
      [
        [0, 4],
        [1, 2],
        [2, 1],
        [3, 4],
        [4, 2],
        [5, 1],
        [6, 4],
        [7, 2],
        [8, 1],
      ].forEach(function (pair) {
        if (sym[pair[0]] !== "-" && sym[pair[0]] !== "S" && sym[pair[0]] !== "T") {
          oct += pair[1] * Math.pow(8, 2 - Math.floor(pair[0] / 3));
        }
      });
      entries.push({
        type: m[1] === "d" ? "dir" : m[1] === "l" ? "link" : m[1] === "-" ? "file" : "other",
        rawType: m[1],
        mode: oct.toString(8),
        user: m[4],
        group: m[5],
        size: m[6],
        mtime: "",
        name: name,
        linkTarget: linkTarget,
      });
    });
    return { entries: entries, warnings: warnings };
  }

  // PowerShell listing: Get-ChildItem -> compact JSON (one array, or a
  // bare object for a single entry). Immune to tab expansion; still
  // capped so it fits one screen.
  function parseWinListing(text) {
    var t = String(text || "").trim();
    // isolate the JSON (strip any leftover prompt/echo before/after)
    var s = t.indexOf("[");
    var o = t.indexOf("{");
    var start = s === -1 ? o : o === -1 ? s : Math.min(s, o);
    if (start > 0) t = t.slice(start);
    var arr;
    try {
      arr = JSON.parse(t);
    } catch (e) {
      return { entries: [], warnings: t ? [t.slice(0, 200)] : [] };
    }
    if (!Array.isArray(arr)) arr = arr ? [arr] : [];
    var entries = arr.map(function (x) {
      var mode = String(x.Mode || "");
      return {
        type: x.T === "d" ? "dir" : x.T === "l" ? "link" : "file",
        rawType: x.T,
        mode: mode, // PS Mode string ("d-r--", "-a---", "la---") -- NOT octal
        size: x.Sz == null ? "" : String(x.Sz),
        user: "",
        group: "",
        mtime: x.M || "",
        name: x.Name || "",
        linkTarget: x.Tgt || "",
      };
    });
    return { entries: entries, warnings: [] };
  }

  function listDirWin(dir) {
    var cmd =
      "Get-ChildItem -Force -LiteralPath " + psq(dir) + " -ErrorAction SilentlyContinue | " +
      "Select-Object -First " + (LISTING_CAP + 1) + " Name," +
      "@{n='T';e={if($_.PSIsContainer){'d'}elseif($_.LinkType){'l'}else{'f'}}}," +
      "@{n='Sz';e={$_.Length}},Mode," +
      "@{n='M';e={try{$_.LastWriteTime.ToString('yyyy-MM-dd HH:mm')}catch{''}}}," +
      "@{n='Tgt';e={\"$($_.Target)\"}} | ConvertTo-Json -Compress -Depth 2";
    return run(cmd, { label: "listing : " + dir, clearFirst: true }).then(function (res) {
      var parsed = parseWinListing(res.output || "");
      var truncated = parsed.entries.length > LISTING_CAP;
      if (truncated) parsed.entries = parsed.entries.slice(0, LISTING_CAP);
      return { parsed: parsed, degraded: false, truncated: truncated };
    });
  }

  function listDir(dir) {
    if (isWin()) return listDirWin(dir);
    // Cap the number of records so the output fits one screen (no
    // scroll -> no prompt redraw mid-stream, see runCapture). LC_ALL=C
    // keeps find's error strings ASCII.
    var cmd =
      "LC_ALL=C find " + shq(dir) + " -maxdepth 1 -mindepth 1 -printf '" + FIND_FMT +
      "' | head -n " + (LISTING_CAP + 1);
    return run(cmd, { label: "listing : " + dir, clearFirst: true }).then(function (res) {
      var out = res.output || "";
      var findBroken =
        /(predicate\s+.-printf.|unknown predicate|Unknown argument|Usage:\s*find|invalid option|-printf: not found)/i.test(
          out
        );
      if (findBroken) {
        state.degraded = true;
        return run("LC_ALL=C ls -la " + shq(dir) + " | head -n " + (LISTING_CAP + 1), {
          label: "listing (repli) : ls -la " + dir,
          clearFirst: true,
        }).then(function (r2) {
          return { parsed: parseLsListing(r2.output || ""), degraded: true, truncated: false };
        });
      }
      var parsed = parseFindListing(out);
      var truncated = parsed.entries.length > LISTING_CAP;
      if (truncated) parsed.entries = parsed.entries.slice(0, LISTING_CAP);
      return { parsed: parsed, degraded: false, truncated: truncated };
    });
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  function navigateTo(dir) {
    if (!state.pane || (state.profile !== "posix" && state.profile !== "windows")) return;
    state.preview = null;
    renderPreview();
    attemptListing(dir, true);
  }

  // A listing that comes back with zero entries AND zero warnings is
  // exactly the case a genuinely empty directory can't be told apart
  // from the screen-scrape capture just silently receiving nothing
  // (see runCapture / parseFindListing) -- this can happen on the very
  // first capture right after selecting a pane. A real empty directory
  // just gives the same (correct) answer again, harmlessly, so one
  // silent retry before we commit to "empty" fixes the common case
  // without the user ever having to notice and hit ⟲ themselves.
  function attemptListing(dir, retryOk) {
    listDir(dir).then(
      function (r) {
        var suspiciouslyEmpty = !r.degraded && !r.parsed.entries.length && !r.parsed.warnings.length;
        if (suspiciouslyEmpty && retryOk) {
          attemptListing(dir, false);
          return;
        }
        state.cwd = dir;
        state.entries = r.parsed.entries;
        state.warnings = r.parsed.warnings;
        state.degraded = state.degraded || r.degraded;
        state.truncated = r.truncated;
        sortEntries();
        renderBreadcrumb();
        renderListing();
      },
      function (err) {
        setBanner("Échec du listing de " + dir + " : " + ((err && err.message) || err), "fail");
      }
    );
  }

  function sortEntries() {
    state.entries.sort(function (a, b) {
      var ad = a.type === "dir" ? 0 : 1;
      var bd = b.type === "dir" ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return a.name.localeCompare(b.name);
    });
  }

  function resync() {
    if (!state.pane) return;
    setBanner("", null);
    if (state.profile !== "posix" && state.profile !== "windows") {
      selectPane(state.pane);
      return;
    }
    fetchPwd().then(function (p) {
      navigateTo(p);
    });
  }

  function selectPane(pane) {
    state.pane = pane;
    state.profile = null;
    state.cwd = null;
    state.entries = [];
    state.warnings = [];
    state.degraded = false;
    state.truncated = false;
    state.preview = null;
    state.presetRun = null;
    state.pendingHighlight = null;
    state.hostname = null;
    state.bookmarks = [];
    state.actions = null;
    setBanner("", null);
    renderBreadcrumb();
    renderListing();
    renderPreview();
    renderBookmarks();
    renderPresets();
    renderPresetResults();
    renderActions();
    setStatus("sonde de l'OS…");

    detectProfile().then(function (prof) {
      state.profile = prof;
      renderPresets();
      if (prof === "windows-cmd") {
        setStatus("");
        setBanner(
          "Shell cmd.exe détecté. Tape `powershell` dans le terminal pour l'explorateur complet, " +
            "puis clique ⟲.",
          "fail"
        );
        renderListing();
        return;
      }
      if (prof !== "posix" && prof !== "windows") {
        setStatus("");
        setBanner("Profil « " + prof + " » : non pris en charge (Linux/macOS ou Windows/PowerShell).", "fail");
        renderListing();
        return;
      }
      setStatus("");

      if (prof === "windows") {
        // One-off session setup: UTF-8 output so ConvertTo-Json and
        // Get-Content come back clean. Harmless on pwsh-on-Linux.
        run(
          "try{ if(Get-Command chcp -EA SilentlyContinue){ chcp 65001 > $null } }catch{}; " +
            "try{ [Console]::OutputEncoding=[Text.Encoding]::UTF8 }catch{}; 'ok'",
          { label: "setup encodage" }
        );
      }

      var hcmd = isWin() ? "[System.Net.Dns]::GetHostName()" : "hostname 2>/dev/null || echo local";
      run(hcmd, { label: "hostname" }).then(
        function (res) {
          state.hostname =
            ((res.output || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean)[0] || "")
              .replace(/[^\w.\-]/g, "") || "local";
          loadBookmarks();
          renderBookmarks();
          renderListing();
        },
        function () {
          state.hostname = "local";
          loadBookmarks();
          renderBookmarks();
        }
      );
      fetchPwd().then(function (p) {
        navigateTo(p);
      });
    });
  }

  function refreshPanes() {
    return requestPaneList().then(function (list) {
      state.panes = list || [];
      renderPaneSelect();
      if (!state.panes.length) {
        state.pane = null;
        setBanner(
          "Aucun shell ouvert. Ouvre un pane avec « + Shell » (et attrape-y ton reverse shell si besoin), puis reviens ici.",
          "info"
        );
        renderListing();
        return;
      }
      setBanner("", null);
      // keep current pane if still present, else take the first
      var keep =
        state.pane &&
        state.panes.some(function (p) {
          return p.type === state.pane.type && p.slot === state.pane.slot;
        });
      if (!keep) selectPane(state.panes[0]);
    });
  }

  // ------------------------------------------------------------------
  // Bookmarks ("intéressants") -- per target, localStorage
  // ------------------------------------------------------------------
  function bookmarksKey() {
    return BOOKMARKS_KEY_PREFIX + (state.hostname || "local");
  }

  function loadBookmarks() {
    try {
      var raw = localStorage.getItem(bookmarksKey());
      var arr = raw ? JSON.parse(raw) : [];
      state.bookmarks = Array.isArray(arr) ? arr : [];
    } catch (e) {
      state.bookmarks = [];
    }
  }

  function saveBookmarks() {
    try {
      localStorage.setItem(bookmarksKey(), JSON.stringify(state.bookmarks.slice(0, BOOKMARKS_MAX)));
    } catch (e) {}
  }

  function isBookmarked(path) {
    return state.bookmarks.some(function (b) {
      return b.path === path;
    });
  }

  function addBookmark(path, source) {
    if (!path || !looksAbsPath(path) || isBookmarked(path)) return false;
    state.bookmarks.push({ path: path, source: source || "manuel", ts: Date.now() });
    saveBookmarks();
    return true;
  }

  function removeBookmark(path) {
    state.bookmarks = state.bookmarks.filter(function (b) {
      return b.path !== path;
    });
    saveBookmarks();
  }

  function toggleBookmark(path, source) {
    if (isBookmarked(path)) removeBookmark(path);
    else addBookmark(path, source);
    renderBookmarks();
    renderListing();
  }

  // Navigate to a path's parent directory and flash the entry.
  function goToPath(path) {
    if (!looksAbsPath(path || "")) return;
    var trimmed = String(path).replace(/[\\/]+$/, "");
    var name = trimmed.split(/[\\/]/).pop();
    state.pendingHighlight = name;
    navigateTo(parentDir(trimmed));
  }

  // ------------------------------------------------------------------
  // Enumeration presets (P2) -- posix
  //
  // The scan itself can take a minute and its output can be long, both
  // of which corrupt a live screen-scrape (see runCapture). So: run the
  // scan in the background writing to a temp file on the target, poll a
  // one-line count while it runs, then fetch the (capped) file once
  // it's done and delete it.
  // ------------------------------------------------------------------
  function runPreset(preset) {
    if (!state.pane || state.profile !== "posix") return;
    if (state.presetRun && !state.presetRun.done) return; // one at a time

    var pr = {
      id: preset.id,
      label: preset.label,
      kind: preset.kind,
      bookmark: preset.bookmark,
      file: null,
      pid: null,
      count: 0,
      done: false,
      cancelled: false,
      results: null,
      error: null,
      timedOut: false,
    };
    state.presetRun = pr;
    renderPresetResults();

    var started = Date.now();
    var kick =
      'FSXF=$(mktemp "${TMPDIR:-/tmp}/.fsx.XXXXXX" 2>/dev/null || echo "/tmp/.fsx.$$.$RANDOM"); ' +
      "{ " + preset.cmd + ' > "$FSXF" 2>/dev/null; echo done > "$FSXF.s"; } & ' +
      'echo "$FSXF|$!"';

    run(kick, { label: "énum : " + preset.label + " (démarrage)", timeoutMs: 10000 }).then(
      function (res) {
        if (state.presetRun !== pr || pr.cancelled) return;
        var last =
          (res.output || "")
            .split("\n")
            .map(function (x) {
              return x.trim();
            })
            .filter(Boolean)
            .pop() || "";
        var parts = last.split("|");
        if (parts.length < 2 || parts[0].charAt(0) !== "/") {
          pr.error = "démarrage du scan impossible (" + (last || "pas de réponse") + ")";
          pr.done = true;
          renderPresetResults();
          return;
        }
        pr.file = parts[0];
        pr.pid = parts[1];
        pollPreset(pr, started);
      },
      function (err) {
        if (state.presetRun !== pr) return;
        pr.error = String((err && err.message) || err);
        pr.done = true;
        renderPresetResults();
      }
    );
  }

  function pollPreset(pr, started) {
    if (state.presetRun !== pr || pr.cancelled || pr.done) return;
    if (Date.now() - started > PRESET_MAX_MS) {
      finishPreset(pr, true);
      return;
    }
    var q =
      "if [ -e " + shq(pr.file + ".s") + " ]; then echo __FSXDONE__; fi; wc -l < " + shq(pr.file) + " 2>/dev/null";
    run(q, { label: "énum : " + pr.label + " (progression)", timeoutMs: 10000, noTidy: true }).then(
      function (res) {
        if (state.presetRun !== pr || pr.cancelled) return;
        var out = res.output || "";
        var mm = out.match(/(\d+)\s*$/);
        if (mm) pr.count = parseInt(mm[1], 10);
        renderPresetResults();
        if (out.indexOf("__FSXDONE__") !== -1) finishPreset(pr, false);
        else
          setTimeout(function () {
            pollPreset(pr, started);
          }, PRESET_POLL_MS);
      },
      function () {
        if (state.presetRun === pr && !pr.cancelled)
          setTimeout(function () {
            pollPreset(pr, started);
          }, PRESET_POLL_MS);
      }
    );
  }

  function finishPreset(pr, timedOut) {
    if (state.presetRun !== pr || pr.done) return;
    var fetch =
      "head -n " + PRESET_RESULT_CAP + " -- " + shq(pr.file) + "; rm -f " + shq(pr.file) + " " + shq(pr.file + ".s");
    run(fetch, { label: "énum : " + pr.label + " (résultats)", clearFirst: true, timeoutMs: 20000 }).then(
      function (res) {
        if (state.presetRun !== pr) return;
        pr.done = true;
        pr.timedOut = timedOut;
        pr.results = (res.output || "")
          .split("\n")
          .map(function (x) {
            return x.replace(/\s+$/, "");
          })
          .filter(function (x) {
            return x.length;
          });
        if (pr.bookmark) {
          var added = 0;
          pr.results.forEach(function (l) {
            var p = l.split(/\s+/)[0];
            if (addBookmark(p, "preset:" + pr.id)) added++;
          });
          if (added) renderBookmarks();
        }
        renderPresetResults();
        renderListing();
        if (window.systemLog) {
          window.systemLog.push({
            source: "fs",
            text:
              "énum " + pr.label + " — " + pr.results.length + " résultat(s)" +
              (pr.count > pr.results.length ? " (sur " + pr.count + ")" : ""),
            level: "info",
          });
        }
      },
      function (err) {
        if (state.presetRun !== pr) return;
        pr.done = true;
        pr.error = String((err && err.message) || err);
        renderPresetResults();
      }
    );
  }

  function cancelPreset() {
    var pr = state.presetRun;
    if (!pr || pr.done) return;
    pr.cancelled = true;
    pr.done = true;
    if (pr.file && pr.pid) {
      run("kill " + pr.pid + " 2>/dev/null; rm -f " + shq(pr.file) + " " + shq(pr.file + ".s"), {
        label: "énum : " + pr.label + " (annulé)",
        timeoutMs: 8000,
      });
    }
    renderPresetResults();
  }

  // ------------------------------------------------------------------
  // Amber actions (P3) -- change the target / escalate privileges.
  // First amber action of the session pops a one-time authorization
  // panel (US-23). After that the command is RUN in the driven pane
  // (sent with a trailing Enter) -- a paste-without-Enter was lost
  // whenever the dashboard was switched, so we execute instead; the
  // amber warning + the journal + the visible terminal are the record.
  // ------------------------------------------------------------------
  function amberAcknowledged() {
    try {
      return localStorage.getItem(AMBER_ACK_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  // Run `fn` now if the amber warning has been acknowledged, otherwise
  // show the panel and stash `fn` until the user confirms.
  function requestAmber(fn) {
    if (amberAcknowledged()) {
      fn();
      return;
    }
    pendingAmber = fn;
    renderAmberAck();
  }

  function confirmAmber(dontAskAgain) {
    if (dontAskAgain) {
      try {
        localStorage.setItem(AMBER_ACK_KEY, "1");
      } catch (e) {}
    }
    var fn = pendingAmber;
    pendingAmber = null;
    renderAmberAck();
    if (fn) fn();
  }

  function cancelAmber() {
    pendingAmber = null;
    renderAmberAck();
  }

  // Run an amber command in the driven pane: a short-lived WebSocket,
  // wait for the prompt to settle, send `\x15` + command + `\r`. No
  // capture -- some techniques (a GTFOBins shell escape) replace the
  // shell process, so there is no end marker to wait for; the result
  // is whatever shows up in the visible terminal.
  function execInPane(cmd, label) {
    if (!state.pane) {
      setBanner("Aucun shell sélectionné — ouvre un pane (+ Shell) puis reviens.", "fail");
      return;
    }
    var port = portFor(state.pane);
    if (!port) return;
    if (running) {
      setBanner("Une opération est en cours — réessaie dans un instant.", "info");
      return;
    }

    running = true;
    setBusy(true);
    var ws = null;
    var sent = false;
    var settle = null;
    var hard = setTimeout(finish, 9000);

    function finish() {
      clearTimeout(hard);
      clearTimeout(settle);
      try {
        if (ws) ws.close();
      } catch (e) {}
      running = false;
      setBusy(false);
      pump();
    }
    function fire() {
      if (sent) return;
      sent = true;
      try {
        ws.send(encodeInput("\x15" + cmd + "\r"));
      } catch (e) {}
      setTimeout(finish, 700);
    }

    try {
      ws = new WebSocket("ws://127.0.0.1:" + port + "/ws", ["tty"]);
    } catch (e) {
      finish();
      return;
    }
    ws.binaryType = "arraybuffer";
    ws.addEventListener("open", function () {
      ws.send(JSON.stringify({ AuthToken: "", columns: CAP_COLS, rows: CAP_ROWS }));
      settle = setTimeout(fire, 800);
    });
    ws.addEventListener("message", function (ev) {
      var d = new Uint8Array(ev.data);
      if (d.length === 0 || d[0] !== 48 || sent) return;
      clearTimeout(settle);
      settle = setTimeout(fire, 300);
    });
    ws.addEventListener("error", finish);
    ws.addEventListener("close", function () {
      if (running) finish();
    });

    // journal + headline
    var entry = document.createElement("div");
    entry.className = "fsx-jentry amber";
    var lab = document.createElement("div");
    lab.className = "fsx-jlabel";
    lab.textContent = (label ? label + " — " : "") + "AMBRE · exécuté dans le terminal";
    var line = document.createElement("div");
    line.className = "fsx-jcmd";
    line.textContent = "» " + cmd;
    entry.appendChild(lab);
    entry.appendChild(line);
    els.journalBody.appendChild(entry);
    while (els.journalBody.children.length > JOURNAL_MAX) els.journalBody.removeChild(els.journalBody.firstChild);
    els.journalBody.scrollTop = els.journalBody.scrollHeight;
    if (window.systemLog) {
      var h = cmd.length > 80 ? cmd.slice(0, 80) + "…" : cmd;
      window.systemLog.push({ source: "fs", text: "AMBRE exécuté : " + h, level: "amber" });
    }
  }

  function gtfoFor(name) {
    return typeof gtfobinsData !== "undefined" && gtfobinsData ? gtfobinsData[name] || null : null;
  }

  // LOLBAS entries are keyed by lowercased basename with ".exe".
  function lolboFor(name) {
    if (typeof lolbasData === "undefined" || !lolbasData) return null;
    var key = String(name || "").toLowerCase();
    if (!/\.exe$/.test(key)) key += ".exe";
    return lolbasData[key] || null;
  }

  // Profile-aware privesc lookup: GTFOBins on posix, LOLBAS on windows.
  function privescFor(name) {
    if (isWin()) {
      var l = lolboFor(name);
      return l ? { kind: "lolbas", data: l } : null;
    }
    var g = gtfoFor(name);
    return g ? { kind: "gtfobins", data: g } : null;
  }

  function basenameOf(p) {
    return String(p || "").replace(/[\\/]+$/, "").split(/[\\/]/).pop();
  }

  function openActions(target) {
    // target: { path, name, suid, sgid }
    state.actions = target;
    renderActions();
  }

  // ------------------------------------------------------------------
  // Preview
  // ------------------------------------------------------------------
  function openPreview(entry) {
    var path = joinPath(state.cwd, entry.name);
    state.preview = { path: path, size: entry.size, stepIdx: 0, loading: true, text: "", binary: false };
    renderPreview();
    loadPreview();
  }

  function loadPreview() {
    var pv = state.preview;
    if (!pv) return;
    pv.loading = true;
    renderPreview();

    var cmd, label;
    if (isWin()) {
      var lines = PREVIEW_LINE_STEPS[pv.stepIdx];
      pv.unit = lines + " lignes";
      cmd = "Get-Content -LiteralPath " + psq(pv.path) + " -TotalCount " + lines + " -ErrorAction Stop";
      label = "aperçu (" + lines + " lignes) : " + pv.path;
    } else {
      var bytes = PREVIEW_STEPS[pv.stepIdx];
      pv.unit = humanSize(bytes);
      pv.bytes = bytes;
      // Byte-cap for size, line-cap so a file of very short lines can't
      // scroll the capture screen (see runCapture / PREVIEW_LINE_CAP).
      cmd = "head -c " + bytes + " -- " + shq(pv.path) + " | head -n " + PREVIEW_LINE_CAP;
      label = "aperçu (" + bytes + " o) : " + pv.path;
    }

    run(cmd, { label: label, clearFirst: true }).then(
      function (res) {
        if (state.preview !== pv) return;
        pv.loading = false;
        pv.lineCapped = (res.output || "").split("\n").length >= PREVIEW_LINE_CAP;
        pv.binary = looksBinary(res.output || "");
        pv.text = res.output || "";
        renderPreview();
      },
      function (err) {
        if (state.preview !== pv) return;
        pv.loading = false;
        pv.text = "(échec : " + ((err && err.message) || err) + ")";
        renderPreview();
      }
    );
  }

  function previewMore() {
    if (state.preview && state.preview.stepIdx < previewSteps().length - 1) {
      state.preview.stepIdx++;
      loadPreview();
    }
  }

  function previewAll() {
    if (state.preview) {
      state.preview.stepIdx = previewSteps().length - 1;
      loadPreview();
    }
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  function setStatus(txt) {
    if (els) els.status.textContent = txt || "";
  }

  function setBusy(b) {
    if (!els) return;
    els.cancel.hidden = !b;
    els.status.textContent = b ? "exécution…" : els.status.textContent === "exécution…" ? "" : els.status.textContent;
  }

  function setBanner(txt, level) {
    if (!els) return;
    if (!txt) {
      els.banner.hidden = true;
      els.banner.textContent = "";
      els.banner.className = "fsx-banner";
      return;
    }
    els.banner.hidden = false;
    els.banner.textContent = txt;
    els.banner.className = "fsx-banner" + (level ? " " + level : "");
  }

  function renderPaneSelect() {
    var sel = els.paneSelect;
    sel.innerHTML = "";
    if (!state.panes.length) {
      var opt = document.createElement("option");
      opt.textContent = "— aucun shell —";
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    state.panes.forEach(function (p, i) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = paneLabel(p);
      sel.appendChild(opt);
    });
    if (state.pane) {
      var idx = state.panes.findIndex(function (p) {
        return p.type === state.pane.type && p.slot === state.pane.slot;
      });
      if (idx >= 0) sel.value = String(idx);
    }
  }

  function renderBreadcrumb() {
    var bc = els.breadcrumb;
    bc.innerHTML = "";
    if (!state.cwd) return;

    var win = isWin();
    var parts = state.cwd.split(/[\\/]+/).filter(Boolean);
    var sepChar = win ? "\\" : "/";
    // Root: "/" on posix, "C:\" (the drive) on windows.
    var rootLabel = win ? (parts[0] || "C:") + "\\" : "/";
    var rootTarget = rootLabel;

    var rootBtn = document.createElement("button");
    rootBtn.type = "button";
    rootBtn.className = "fsx-crumb";
    rootBtn.textContent = rootLabel;
    rootBtn.addEventListener("click", function () {
      navigateTo(rootTarget);
    });
    bc.appendChild(rootBtn);

    var rest = win ? parts.slice(1) : parts;
    var acc = win ? (parts[0] || "C:") : "";
    rest.forEach(function (seg) {
      acc += sepChar + seg;
      var sep = document.createElement("span");
      sep.className = "fsx-crumb-sep";
      sep.textContent = "›";
      bc.appendChild(sep);
      var target = acc;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fsx-crumb";
      b.textContent = seg;
      b.addEventListener("click", function () {
        navigateTo(target);
      });
      bc.appendChild(b);
    });
  }

  function renderListing() {
    var box = els.listing;
    box.innerHTML = "";

    if (!state.pane) return;
    if (state.profile && state.profile !== "posix" && state.profile !== "windows") return;
    if (!state.cwd) {
      box.textContent = state.profile === "posix" || state.profile === "windows" ? "…" : "";
      return;
    }

    if (state.degraded) {
      var warn = document.createElement("div");
      warn.className = "fsx-degraded";
      warn.textContent =
        "Listing dégradé : find -printf indisponible, repli sur ls -la (les noms avec espaces peuvent être tronqués).";
      box.appendChild(warn);
    }
    if (state.warnings.length) {
      var w = document.createElement("div");
      w.className = "fsx-degraded";
      w.textContent =
        state.warnings.length + " ligne(s) ignorée(s) / erreur(s) : " + state.warnings.slice(0, 3).join(" | ");
      box.appendChild(w);
    }
    if (state.truncated) {
      var tr = document.createElement("div");
      tr.className = "fsx-degraded";
      tr.textContent =
        "Liste tronquée aux " + LISTING_CAP + " premières entrées — ouvre un sous-dossier, ou (P2) les presets d'énumération.";
      box.appendChild(tr);
    }

    var win = isWin();
    var shown = state.entries.filter(function (e) {
      if (state.showHidden) return true;
      return win ? !winModeInfo(e.mode).hidden : e.name.charAt(0) !== ".";
    });

    var table = document.createElement("table");
    table.className = "fsx-table";
    var tb = document.createElement("tbody");

    if (!shown.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 6;
      td0.className = "fsx-empty";
      // Zero entries with zero warnings too is the one case a genuinely
      // empty directory can't be told apart from a scrape that silently
      // came back with nothing (see parseFindListing) -- say so instead
      // of asserting emptiness we can't actually vouch for.
      td0.textContent = state.entries.length
        ? "(tout est caché — coche « fichiers cachés »)"
        : state.warnings.length
          ? "(dossier vide, ou listing corrompu — voir les avertissements ci-dessus ; ⟲ pour réessayer)"
          : "(dossier vide, ou la capture n'a rien reçu — ⟲ pour réessayer)";
      tr0.appendChild(td0);
      tb.appendChild(tr0);
    }

    var toHighlight = null;

    shown.forEach(function (e) {
      var tr = document.createElement("tr");
      tr.className = "fsx-row fsx-" + e.type;
      var fullPath = joinPath(state.cwd, e.name);
      if (state.pendingHighlight && state.pendingHighlight === e.name) {
        tr.classList.add("fsx-hl");
        toHighlight = tr;
      }

      var mi = win ? winModeInfo(e.mode) : modeInfo(e.mode);

      var tdIcon = document.createElement("td");
      tdIcon.className = "fsx-c-icon";
      tdIcon.textContent =
        e.type === "dir" ? "📁" : e.type === "link" ? "🔗" : !win && mi.otherExec ? "▶" : "📄";
      tr.appendChild(tdIcon);

      var tdStar = document.createElement("td");
      tdStar.className = "fsx-c-star";
      var star = document.createElement("button");
      star.type = "button";
      star.className = "fsx-star" + (isBookmarked(fullPath) ? " on" : "");
      star.textContent = isBookmarked(fullPath) ? "★" : "☆";
      star.title = "Marquer comme intéressant";
      star.addEventListener("click", function (ev) {
        ev.stopPropagation();
        toggleBookmark(fullPath, "manuel");
      });
      tdStar.appendChild(star);
      tr.appendChild(tdStar);

      var tdName = document.createElement("td");
      tdName.className = "fsx-c-name";
      var nameText = document.createElement("span");
      nameText.textContent = e.name + (e.type === "link" && e.linkTarget ? "  → " + e.linkTarget : "");
      tdName.appendChild(nameText);

      // Amber affordances on files: a "⚙" for the actions panel, plus a
      // GTFOBins/LOLBAS pill when the binary matches a known technique.
      // On posix the pill only shows for SUID/SGID binaries (that's what
      // makes GTFOBins relevant); on windows LOLBAS binaries are worth
      // flagging regardless of ACLs, so the name match alone is enough.
      if (e.type === "file") {
        var isPriv = !win && (mi.suid || mi.sgid);
        var priv = privescFor(e.name);
        if ((win ? priv : isPriv && priv)) {
          var pill = document.createElement("button");
          pill.type = "button";
          pill.className = "fsx-pill";
          pill.textContent = win ? "LOLBAS" : "GTFOBins";
          pill.title = "Voir la technique de privesc";
          pill.addEventListener("click", function (ev) {
            ev.stopPropagation();
            openActions({ path: fullPath, name: e.name, suid: mi.suid, sgid: mi.sgid });
          });
          tdName.appendChild(pill);
        }
        var gear = document.createElement("button");
        gear.type = "button";
        gear.className = "fsx-gear";
        gear.textContent = "⚙";
        gear.title = "Actions (droits, privesc) — ambre";
        gear.addEventListener("click", function (ev) {
          ev.stopPropagation();
          openActions({ path: fullPath, name: e.name, suid: mi.suid, sgid: mi.sgid });
        });
        tdName.appendChild(gear);
      }
      tr.appendChild(tdName);

      var tdPerm = document.createElement("td");
      tdPerm.className = "fsx-c-perm";
      var permSpan = document.createElement("span");
      permSpan.className = "fsx-perm";
      if (win) {
        if (mi.hidden || mi.system) permSpan.classList.add("ww");
        permSpan.textContent = mi.str;
        permSpan.title =
          "Mode " + e.mode + (mi.hidden ? " · caché" : "") + (mi.system ? " · système" : "") + (mi.readonly ? " · lecture seule" : "");
      } else {
        if (mi.worldWrite) permSpan.classList.add("ww");
        if (mi.suid || mi.sgid) permSpan.classList.add("suid");
        permSpan.textContent = mi.str;
        permSpan.title =
          e.mode + " · " + e.user + ":" + e.group + (mi.suid ? " · SUID" : "") + (mi.sgid ? " · SGID" : "");
      }
      tdPerm.appendChild(permSpan);
      tr.appendChild(tdPerm);

      var tdSize = document.createElement("td");
      tdSize.className = "fsx-c-size";
      tdSize.textContent = e.type === "dir" ? "" : humanSize(e.size);
      tr.appendChild(tdSize);

      var tdTime = document.createElement("td");
      tdTime.className = "fsx-c-time";
      tdTime.textContent = e.mtime || "";
      tr.appendChild(tdTime);

      tr.addEventListener("click", function () {
        if (e.type === "dir" || e.type === "link") navigateTo(joinPath(state.cwd, e.name));
        else openPreview(e);
      });

      tb.appendChild(tr);
    });

    table.appendChild(tb);
    box.appendChild(table);

    if (toHighlight) {
      toHighlight.scrollIntoView({ block: "center" });
      setTimeout(function () {
        toHighlight.classList.remove("fsx-hl");
      }, 2200);
      state.pendingHighlight = null;
    }
  }

  function renderBookmarks() {
    var box = els.bookmarks; // <details>
    box.innerHTML = "";
    if (!state.bookmarks.length) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    try {
      box.open = localStorage.getItem("/fs-explorer/bmOpen") !== "0";
    } catch (e) {
      box.open = true;
    }

    var head = document.createElement("summary");
    head.className = "fsx-bm-head";
    head.textContent = "★ Intéressants (" + state.bookmarks.length + ")";
    box.appendChild(head);

    var list = document.createElement("div");
    list.className = "fsx-bm-list";
    state.bookmarks
      .slice()
      .sort(function (a, b) {
        return a.path.localeCompare(b.path);
      })
      .forEach(function (b) {
        var row = document.createElement("div");
        row.className = "fsx-bm-row";
        var go = document.createElement("button");
        go.type = "button";
        go.className = "fsx-bm-path";
        go.textContent = b.path;
        go.title = b.source || "manuel";
        go.addEventListener("click", function () {
          goToPath(b.path);
        });
        var x = document.createElement("button");
        x.type = "button";
        x.className = "fsx-bm-x";
        x.textContent = "✕";
        x.title = "Retirer";
        x.addEventListener("click", function () {
          removeBookmark(b.path);
          renderBookmarks();
          renderListing();
        });
        row.appendChild(go);
        row.appendChild(x);
        list.appendChild(row);
      });
    box.appendChild(list);
  }

  function renderPresets() {
    var box = els.presets;
    box.innerHTML = "";
    if (state.profile !== "posix") {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    var lbl = document.createElement("span");
    lbl.className = "fsx-presets-label";
    lbl.textContent = "Énum :";
    box.appendChild(lbl);
    PRESETS.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fsx-preset-btn";
      b.textContent = p.label;
      b.addEventListener("click", function () {
        runPreset(p);
      });
      box.appendChild(b);
    });
  }

  function renderPresetResults() {
    var box = els.presetResults;
    var pr = state.presetRun;
    if (!pr) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = "";

    var head = document.createElement("div");
    head.className = "fsx-pr-head";
    var shown = pr.results ? pr.results.length : 0;
    var status = pr.error
      ? "erreur"
      : pr.cancelled
        ? "annulé"
        : !pr.done
          ? "scan… " + pr.count
          : shown +
            " résultat(s)" +
            (pr.timedOut ? " (timeout)" : "") +
            (pr.count > shown ? " sur " + pr.count : "");
    var title = document.createElement("span");
    title.textContent = "Énumération — " + pr.label + " · " + status;
    head.appendChild(title);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fsx-pr-close";
    if (!pr.done) {
      btn.textContent = "Annuler";
      btn.addEventListener("click", cancelPreset);
    } else {
      btn.textContent = "✕";
      btn.addEventListener("click", function () {
        state.presetRun = null;
        renderPresetResults();
      });
    }
    head.appendChild(btn);
    box.appendChild(head);

    if (pr.error) {
      var e = document.createElement("div");
      e.className = "fsx-pr-note fail";
      e.textContent = pr.error;
      box.appendChild(e);
      return;
    }
    if (!pr.done) {
      var n = document.createElement("div");
      n.className = "fsx-pr-note";
      n.textContent =
        "Le scan tourne sur la cible (jusqu'à ~1 min) — sortie dans un fichier temporaire, pas dans le terminal.";
      box.appendChild(n);
      return;
    }
    if (!pr.results || !pr.results.length) {
      var z = document.createElement("div");
      z.className = "fsx-pr-note";
      z.textContent = "(aucun résultat)";
      box.appendChild(z);
      return;
    }

    if (pr.kind === "text") {
      var pre = document.createElement("pre");
      pre.className = "fsx-pr-text";
      pre.textContent = pr.results.join("\n");
      box.appendChild(pre);
      return;
    }

    var list = document.createElement("div");
    list.className = "fsx-pr-list";
    pr.results.forEach(function (line) {
      var p = line.split(/\s+/)[0];
      var extra = line.slice(p.length).trim();
      var row = document.createElement("div");
      row.className = "fsx-pr-row";

      var star = document.createElement("button");
      star.type = "button";
      function paint() {
        star.textContent = isBookmarked(p) ? "★" : "☆";
        star.className = "fsx-star" + (isBookmarked(p) ? " on" : "");
      }
      paint();
      star.addEventListener("click", function (ev) {
        ev.stopPropagation();
        toggleBookmark(p, "preset:" + pr.id);
        paint();
      });
      row.appendChild(star);

      var go = document.createElement("button");
      go.type = "button";
      go.className = "fsx-pr-path";
      go.textContent = p + (extra ? "  " + extra : "");
      go.addEventListener("click", function () {
        goToPath(p);
      });
      row.appendChild(go);

      // GTFOBins pill on SUID/SGID sweep results whose binary is known.
      if ((pr.id === "suid" || pr.id === "sgid") && gtfoFor(basenameOf(p))) {
        var pill = document.createElement("button");
        pill.type = "button";
        pill.className = "fsx-pill";
        pill.textContent = "GTFOBins";
        pill.addEventListener("click", function (ev) {
          ev.stopPropagation();
          openActions({ path: p, name: basenameOf(p), suid: pr.id === "suid", sgid: pr.id === "sgid" });
        });
        row.appendChild(pill);
      }

      list.appendChild(row);
    });
    box.appendChild(list);

    if (pr.count > shown) {
      var more = document.createElement("div");
      more.className = "fsx-pr-note";
      more.textContent = "Affichage des " + shown + " premiers sur " + pr.count + ".";
      box.appendChild(more);
    }
  }

  function renderAmberAck() {
    var box = els.amberAck;
    if (!pendingAmber) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = "";

    var card = document.createElement("div");
    card.className = "fsx-ack-card";

    var h = document.createElement("div");
    h.className = "fsx-ack-title";
    h.textContent = "⚠ Action ambre";
    card.appendChild(h);

    var p = document.createElement("p");
    p.className = "fsx-ack-text";
    p.textContent =
      "Les commandes en ambre modifient la machine cible ou élèvent tes privilèges, et sont " +
      "exécutées directement dans le terminal du pane piloté. À n'utiliser que sur des systèmes " +
      "que tu es autorisé à tester : CTF, lab personnel, ou mandat écrit du client.";
    card.appendChild(p);

    var row = document.createElement("label");
    row.className = "fsx-ack-check";
    var cb = document.createElement("input");
    cb.type = "checkbox";
    row.appendChild(cb);
    row.appendChild(document.createTextNode(" Ne plus afficher cet avertissement"));
    card.appendChild(row);

    var btns = document.createElement("div");
    btns.className = "fsx-ack-btns";
    var ok = document.createElement("button");
    ok.type = "button";
    ok.className = "fsx-ack-ok";
    ok.textContent = "J'ai compris, continuer";
    ok.addEventListener("click", function () {
      confirmAmber(cb.checked);
    });
    var no = document.createElement("button");
    no.type = "button";
    no.className = "fsx-ack-cancel";
    no.textContent = "Annuler";
    no.addEventListener("click", cancelAmber);
    btns.appendChild(ok);
    btns.appendChild(no);
    card.appendChild(btns);

    box.appendChild(card);
  }

  function renderActions() {
    var box = els.actions;
    var a = state.actions;
    if (!a) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = "";

    var head = document.createElement("div");
    head.className = "fsx-act-head";
    var title = document.createElement("span");
    title.textContent = "Actions — " + a.path;
    head.appendChild(title);
    var x = document.createElement("button");
    x.type = "button";
    x.className = "fsx-act-close";
    x.textContent = "✕";
    x.addEventListener("click", function () {
      state.actions = null;
      renderActions();
    });
    head.appendChild(x);
    box.appendChild(head);

    var amberTag = document.createElement("div");
    amberTag.className = "fsx-act-amber";
    amberTag.textContent = "AMBRE — chaque bouton EXÉCUTE la commande dans le terminal du pane piloté.";
    box.appendChild(amberTag);

    // --- change permissions (posix only -- chmod/chown don't exist in
    // PowerShell) ------------------------------------------------------
    if (!isWin()) {
      var permSec = document.createElement("div");
      permSec.className = "fsx-act-sec";
      var permH = document.createElement("div");
      permH.className = "fsx-act-sec-h";
      permH.textContent = "Modifier les droits";
      permSec.appendChild(permH);
      [
        { cmd: "chmod +x " + shq(a.path), why: "Ajoute le droit d'exécution (lancer un script / un binaire)." },
        { cmd: "chmod u+s " + shq(a.path), why: "Pose le bit SUID : le fichier s'exécutera avec les privilèges de son propriétaire. N'a d'effet que si tu es déjà root." },
        { cmd: "chmod 777 " + shq(a.path), why: "Lecture + écriture + exécution pour tout le monde." },
        { cmd: "chown \"$(id -un)\":\"$(id -gn)\" " + shq(a.path), why: "Te rend propriétaire du fichier (utile si tu peux déjà écrire mais pas changer les droits)." },
      ].forEach(function (item) {
        permSec.appendChild(actionRow(item.cmd, item.why));
      });
      box.appendChild(permSec);
    }

    // --- GTFOBins (posix) / LOLBAS (windows) --------------------------
    var pv = privescFor(a.name);
    if (pv && pv.kind === "gtfobins") {
      var g = pv.data;
      var gSec = document.createElement("div");
      gSec.className = "fsx-act-sec";
      var gH = document.createElement("div");
      gH.className = "fsx-act-sec-h";
      var capLabel = g.cap === "file-read" ? " · lecture de fichier" : g.cap === "file-write" ? " · écriture de fichier" : "";
      gH.textContent = "GTFOBins : " + a.name + capLabel;
      gSec.appendChild(gH);

      var note = document.createElement("div");
      note.className = "fsx-act-note";
      note.textContent = g.note || "";
      gSec.appendChild(note);

      // Prefer the technique matching what we know: SUID bit set -> suid
      // lines; otherwise show suid then sudo, each labelled.
      var blocks = [];
      if (a.suid && g.suid) blocks.push(["SUID", g.suid]);
      if (a.sgid && g.suid) blocks.push(["SGID (essayer la voie SUID)", g.suid]);
      if (!blocks.length && g.suid) blocks.push(["SUID", g.suid]);
      if (g.sudo) blocks.push(["via sudo", g.sudo]);

      blocks.forEach(function (b) {
        var bl = document.createElement("div");
        bl.className = "fsx-act-gblock";
        var bh = document.createElement("div");
        bh.className = "fsx-act-gblock-h";
        bh.textContent = b[0];
        bl.appendChild(bh);
        b[1].forEach(function (raw) {
          var cmd = raw.replace(/\{bin\}/g, a.path);
          bl.appendChild(actionRow(cmd, null));
        });
        gSec.appendChild(bl);
      });

      var src = document.createElement("a");
      src.className = "fsx-act-src";
      src.href = "https://gtfobins.github.io/gtfobins/" + encodeURIComponent(a.name) + "/";
      src.target = "_blank";
      src.rel = "noopener";
      src.textContent = "gtfobins.github.io/gtfobins/" + a.name + "/";
      gSec.appendChild(src);
      box.appendChild(gSec);
    } else if (pv && pv.kind === "lolbas") {
      var l = pv.data;
      var lSec = document.createElement("div");
      lSec.className = "fsx-act-sec";
      var lH = document.createElement("div");
      lH.className = "fsx-act-sec-h";
      lH.textContent = "LOLBAS : " + a.name + (l.tags && l.tags.length ? " · " + l.tags.join(", ") : "");
      lSec.appendChild(lH);

      var lNote = document.createElement("div");
      lNote.className = "fsx-act-note";
      lNote.textContent = l.note || "";
      lSec.appendChild(lNote);

      (l.lines || []).forEach(function (line) {
        lSec.appendChild(actionRow(line.cmd, line.why));
      });

      var base = a.name.replace(/\.exe$/i, "");
      var lSrc = document.createElement("a");
      lSrc.className = "fsx-act-src";
      lSrc.href = "https://lolbas-project.github.io/lolbas/Binaries/" + encodeURIComponent(base) + "/";
      lSrc.target = "_blank";
      lSrc.rel = "noopener";
      lSrc.textContent = "lolbas-project.github.io/lolbas/Binaries/" + base + "/";
      lSec.appendChild(lSrc);
      box.appendChild(lSec);
    }
  }

  // One amber command row: the command + an "Exécuter" button + optional
  // one-line explanation.
  function actionRow(cmd, why) {
    var row = document.createElement("div");
    row.className = "fsx-act-row";
    var code = document.createElement("code");
    code.className = "fsx-act-cmd";
    code.textContent = cmd;
    row.appendChild(code);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fsx-act-paste";
    btn.textContent = "Exécuter";
    btn.title = "Lance la commande dans le terminal du pane piloté";
    btn.addEventListener("click", function () {
      requestAmber(function () {
        execInPane(cmd, "actions");
      });
    });
    row.appendChild(btn);
    if (why) {
      var w = document.createElement("div");
      w.className = "fsx-act-why";
      w.textContent = why;
      row.appendChild(w);
    }
    return row;
  }

  function renderPreview() {
    var box = els.preview;
    var pv = state.preview;
    if (!pv) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = "";

    var head = document.createElement("div");
    head.className = "fsx-preview-head";
    var title = document.createElement("span");
    title.className = "fsx-preview-path";
    title.textContent = pv.path;
    head.appendChild(title);

    var close = document.createElement("button");
    close.type = "button";
    close.className = "fsx-preview-close";
    close.textContent = "✕";
    close.addEventListener("click", function () {
      state.preview = null;
      renderPreview();
    });
    head.appendChild(close);
    box.appendChild(head);

    if (pv.loading) {
      var l = document.createElement("div");
      l.className = "fsx-preview-note";
      l.textContent = "chargement…";
      box.appendChild(l);
      return;
    }

    var note = document.createElement("div");
    note.className = "fsx-preview-note";
    if (pv.binary) {
      note.textContent = "Fichier binaire" + (pv.size ? " · " + humanSize(pv.size) : "") + " — aperçu texte masqué.";
      box.appendChild(note);
      return;
    }
    var steps = previewSteps();
    note.textContent =
      "Premiers " + (pv.unit || previewStepLabel(steps[pv.stepIdx])) +
      (!isWin() && pv.size ? " sur " + humanSize(pv.size) : "") +
      " · lecture seule";
    box.appendChild(note);

    var pre = document.createElement("pre");
    pre.className = "fsx-preview-body";
    pre.textContent = pv.text;
    box.appendChild(pre);

    var actions = document.createElement("div");
    actions.className = "fsx-preview-actions";
    if (pv.stepIdx < steps.length - 1) {
      var more = document.createElement("button");
      more.type = "button";
      more.textContent = "Charger plus (" + previewStepLabel(steps[pv.stepIdx + 1]) + ")";
      more.addEventListener("click", previewMore);
      actions.appendChild(more);

      var all = document.createElement("button");
      all.type = "button";
      all.textContent = "Tout lire (max " + previewStepLabel(steps[steps.length - 1]) + ")";
      all.addEventListener("click", previewAll);
      actions.appendChild(all);
    }
    box.appendChild(actions);
  }

  // ------------------------------------------------------------------
  // Mount
  // ------------------------------------------------------------------
  function mount() {
    var root = document.getElementById("fsExplorerBody");
    if (!root) return;

    root.innerHTML =
      '<div class="fsx-toolbar">' +
      '  <select class="fsx-pane" title="Pane piloté"></select>' +
      '  <button class="fsx-resync" type="button" title="Resynchroniser (pwd + listing)">⟲</button>' +
      '  <label class="fsx-hidden-toggle"><input type="checkbox" class="fsx-hidden"> fichiers cachés</label>' +
      '  <button class="fsx-refresh" type="button" title="Rafraîchir la liste des panes">panes</button>' +
      '  <button class="fsx-cancel" type="button" hidden>Annuler</button>' +
      '  <span class="fsx-status"></span>' +
      "</div>" +
      '<details class="fsx-bookmarks" hidden></details>' +
      '<div class="fsx-presets" hidden></div>' +
      '<div class="fsx-preset-results" hidden></div>' +
      '<div class="fsx-breadcrumb"></div>' +
      '<div class="fsx-banner" hidden></div>' +
      '<div class="fsx-actions" hidden></div>' +
      '<div class="fsx-listing"></div>' +
      '<div class="fsx-preview" hidden></div>' +
      '<details class="fsx-journal" open>' +
      "  <summary>Journal des commandes</summary>" +
      '  <div class="fsx-journal-body"></div>' +
      "</details>" +
      '<div class="fsx-amber-ack" hidden></div>';

    els = {
      root: root,
      paneSelect: root.querySelector(".fsx-pane"),
      resync: root.querySelector(".fsx-resync"),
      refresh: root.querySelector(".fsx-refresh"),
      hidden: root.querySelector(".fsx-hidden"),
      cancel: root.querySelector(".fsx-cancel"),
      status: root.querySelector(".fsx-status"),
      bookmarks: root.querySelector(".fsx-bookmarks"),
      presets: root.querySelector(".fsx-presets"),
      presetResults: root.querySelector(".fsx-preset-results"),
      actions: root.querySelector(".fsx-actions"),
      amberAck: root.querySelector(".fsx-amber-ack"),
      breadcrumb: root.querySelector(".fsx-breadcrumb"),
      banner: root.querySelector(".fsx-banner"),
      listing: root.querySelector(".fsx-listing"),
      preview: root.querySelector(".fsx-preview"),
      journalBody: root.querySelector(".fsx-journal-body"),
    };

    els.paneSelect.addEventListener("change", function () {
      var i = parseInt(els.paneSelect.value, 10);
      if (state.panes[i]) selectPane(state.panes[i]);
    });
    els.resync.addEventListener("click", resync);
    els.refresh.addEventListener("click", refreshPanes);
    els.hidden.addEventListener("change", function () {
      state.showHidden = els.hidden.checked;
      renderListing();
    });
    els.cancel.addEventListener("click", cancelActive);
    els.bookmarks.addEventListener("toggle", function () {
      try {
        localStorage.setItem("/fs-explorer/bmOpen", els.bookmarks.open ? "1" : "0");
      } catch (e) {}
    });

    if (window.systemLog) {
      window.systemLog.push({ source: "fs", text: "explorateur prêt (P3)", level: "info" });
    }

    // Introspection hook (handy from the devtools console, and for the
    // repo's headless checks): current pane/profile/cwd + entry count.
    window.fsxState = function () {
      return {
        pane: state.pane ? paneLabel(state.pane) : null,
        profile: state.profile,
        hostname: state.hostname,
        cwd: state.cwd,
        entries: state.entries.length,
        degraded: state.degraded,
        truncated: state.truncated,
        warnings: state.warnings.length,
        bookmarks: state.bookmarks.length,
        preset: state.presetRun
          ? { id: state.presetRun.id, done: state.presetRun.done, count: state.presetRun.count, results: state.presetRun.results ? state.presetRun.results.length : null }
          : null,
        actions: state.actions ? state.actions.name : null,
        amberAck: amberAcknowledged(),
        gtfobins: typeof gtfobinsData !== "undefined" ? Object.keys(gtfobinsData).length : 0,
        running: running,
        queue: queue.length,
      };
    };

    refreshPanes();

    // A pane could be opened/closed after we mounted -- cheap re-poll.
    setInterval(function () {
      if (!running) refreshPanes();
    }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
