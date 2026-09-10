/* Owns the real shell terminals (ttyd iframes) so they survive
   navigating the sidebar -- they used to live inside dashboard.html
   and got destroyed every time #frame's src changed away from it.
   Rendered as a fixed overlay tracking dashboard.html's #shellArea
   placeholder, whose rect is reported continuously over postMessage
   since it's a separate document. See assets/script/dashboard-shells.js
   for the dashboard.html side of this handshake. */
const SHELL_TYPES = {
  bash: { basePort: 7681, label: "Bash" },
  zsh: { basePort: 7691, label: "Zsh" },
  pwsh: { basePort: 7701, label: "PowerShell" },
};

const activeShells = { bash: new Set(), zsh: new Set(), pwsh: new Set() };
// The real terminals live in ttyd/tmux, on the server -- they outlive
// a page reload. This list of *which* ones are open (and their custom
// names) is purely this page's own in-memory bookkeeping, so without
// persisting it, reloading index.html forgets every shell it knew
// about, even though the tmux sessions are all still running. The
// next "Shell" click then finds nothing in activeShells/overlayHost
// and opens what looks like a brand new window -- reconnecting to the
// same slot's port does reattach to the actual still-alive session,
// but visually it reads as "there was already one, why did it open
// another" instead of just using the one already there. Restoring
// this list on init (see restoreOpenShells) closes that gap.
const OPEN_SHELLS_STORAGE_KEY = "/index.html/openShells";
let overlayHost = null;
let modalOpen = false;
let menuOpen = false;
let lastRectAt = 0;
let lastVisible = false;
let lastRect = null; // shellArea rect, relative to dashboard.html's own viewport
let trackingRafId = null;

function anyShellActive() {
  return Object.values(activeShells).some((set) => set.size > 0);
}

/* Re-reads config/shell-session.js so window.shellSession reflects the
   token currently on disk -- scripts/ttyd-shells.sh rewrites that file on
   every start/stop, and a page loaded before (or across) a restart would
   otherwise keep a stale or empty token and get 403'd by the proxy.
   Cache-busted so it actually re-fetches under file:// too. Always calls
   back (even on error -- we fall back to whatever is already loaded). */
let _shellSessionPath = null;
function refreshShellSession(cb) {
  if (_shellSessionPath === null) {
    const self = [...document.scripts].find((s) => /\/shells-host\.js(\?|$)/.test(s.src));
    _shellSessionPath = self
      ? self.src.replace(/assets\/script\/shells-host\.js.*$/, "config/shell-session.js")
      : "config/shell-session.js";
  }
  const s = document.createElement("script");
  s.src = _shellSessionPath + (_shellSessionPath.includes("?") ? "&" : "?") + "_=" + Date.now();
  s.onload = s.onerror = () => {
    s.remove();
    try { cb(); } catch (e) {}
  };
  document.head.appendChild(s);
}

/* Calls back once el's box has stopped changing size for a beat.
   Adding a *second* shell-window to the overlay (a flex row, see
   shells-overlay.css) reflows the row -- the new one doesn't get its
   final width/height the moment it's added, it gets whatever a lone
   item gets first and then shrinks once its sibling joins the same
   row. ttyd's iframe inside it (and the xterm.js client that iframe
   loads) resizes to match, which redraws its box-drawing prompt sized
   for the new dimensions -- if a paste's own connection lands mid-
   reflow, the prompt can end up redrawn *again* right on top of it,
   which is what showed up as the same command appearing pasted twice.
   Waiting for size to stop changing here, alongside waiting for the
   iframe to load (see the shell-copy-request handler) and for its own
   output to go quiet (see pasteIntoShell), covers this from all three
   angles the connection actually has to race against. */
function waitForStableLayout(el, callback) {
  const SETTLE_MS = 250;
  let timer = setTimeout(finish, SETTLE_MS);
  const ro = new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(finish, SETTLE_MS);
  });
  ro.observe(el);
  function finish() {
    ro.disconnect();
    callback();
  }
}

function getShellOpacity() {
  const raw = parseInt(localStorage.getItem("/settings.html/shellOpacity"), 10);
  return (isNaN(raw) ? 100 : raw) / 100;
}

function applyShellOpacity() {
  const opacity = getShellOpacity();
  overlayHost.querySelectorAll(".shell-window").forEach((win) => {
    win.style.opacity = opacity;
  });
}

/* Whether the overlay should currently sit behind #frame: strictly
   "is a tool modal open" -- it must stay behind the whole time one is,
   full stop, so the tool list underneath is always the thing that's
   visible and clickable. (An earlier version of this briefly brought
   it back to the front right after a paste, as a way to confirm the
   paste landed -- that traded away exactly the "stays behind" this is
   for, so it's gone; the button's own brief text flash is the
   confirmation while a modal has the shells overlay behind it.) */
function updateOverlayForeground() {
  overlayHost.classList.toggle("behind", modalOpen || menuOpen);
}

function notifyDashboard() {
  const frame = document.getElementById("frame");
  if (frame && frame.contentWindow) {
    frame.contentWindow.postMessage({ type: "shells-state", active: anyShellActive() }, "*");
  }
}

// Snapshot of what's currently open (type, slot, current title), so a
// reload can restore it -- see the comment on OPEN_SHELLS_STORAGE_KEY.
// Called after every change (open, close, rename); cheap enough (at
// most a handful of shells) to just re-derive from the DOM each time
// rather than tracking a parallel structure that could drift from it.
function persistOpenShells() {
  const list = Array.from(overlayHost.querySelectorAll(".shell-window")).map((win) => ({
    type: win.dataset.type,
    slot: Number(win.dataset.slot),
    title: win.querySelector(".shell-window-title")?.textContent || "",
  }));
  localStorage.setItem(OPEN_SHELLS_STORAGE_KEY, JSON.stringify(list));
}

function startRenameShell(title, defaultName) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "shell-window-title-input";
  input.value = title.textContent;
  input.maxLength = 40;

  const commit = () => {
    const value = input.value.trim();
    title.textContent = value || defaultName;
    input.replaceWith(title);
    persistOpenShells();
  };
  const cancel = () => {
    input.replaceWith(title);
  };

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
    else if (e.key === "Escape") {
      input.removeEventListener("blur", commit);
      cancel();
    }
  });

  title.replaceWith(input);
  input.focus();
  input.select();
}

function removeShell(type, slot, el) {
  activeShells[type].delete(slot);
  el.remove();
  notifyDashboard();
  persistOpenShells();
}

// wantedSlot/savedTitle are set when restoring a previously-open shell
// after a reload (see restoreOpenShells) -- reattaches to that exact
// slot's port (and thus tmux session) with its remembered name instead
// of picking the next free slot and a fresh default name.
function addShell(type, wantedSlot, savedTitle) {
  const spec = SHELL_TYPES[type];
  if (!spec) return;

  let slot = wantedSlot || 1;
  if (!wantedSlot) while (activeShells[type].has(slot)) slot++;
  activeShells[type].add(slot);

  const port = spec.basePort + slot - 1;
  const win = document.createElement("div");
  win.className = "shell-window";
  win.dataset.type = type;
  win.dataset.slot = String(slot);

  const header = document.createElement("div");
  header.className = "shell-window-header";

  const defaultName = spec.label + " " + slot + " (:" + port + ")";
  const title = document.createElement("span");
  title.className = "shell-window-title";
  title.textContent = savedTitle || defaultName;
  title.title = "Double-cliquer pour renommer";
  title.addEventListener("dblclick", () => startRenameShell(title, defaultName));
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.className = "shell-close-btn";
  closeBtn.type = "button";
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => removeShell(type, slot, win));
  header.appendChild(closeBtn);

  const iframe = document.createElement("iframe");
  iframe.className = "shell-iframe";
  iframe.title = spec.label + " " + slot;

  win.appendChild(header);
  win.appendChild(iframe);
  win.style.opacity = getShellOpacity();
  overlayHost.appendChild(win);

  // config/shell-session.js carries the session token that the proxy in
  // front of ttyd checks (?session=...). It's baked in at page load, so a
  // dashboard that was already open when `scripts/ttyd-shells.sh start`
  // (or stop+start, which mints a NEW token) ran still holds a stale or
  // empty value -- the iframe would then 403. Pull a fresh copy right
  // before pointing the iframe at ttyd.
  refreshShellSession(() => {
    iframe.src = (window.shellSession && window.shellSession.iframeSrc(port)) ||
      ("http://127.0.0.1:" + port + "/");
  });

  notifyDashboard();
  persistOpenShells();
  return slot;
}

// Recreates the .shell-window UI for whatever was open before this
// page load (see OPEN_SHELLS_STORAGE_KEY) -- the tmux sessions
// themselves never went anywhere, only this bookkeeping did. Each
// reattaches to its exact port, same as re-opening a real terminal
// tab would.
function restoreOpenShells() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(OPEN_SHELLS_STORAGE_KEY) || "[]");
  } catch {
    saved = [];
  }
  saved.forEach(({ type, slot, title }) => {
    if (SHELL_TYPES[type] && Number.isInteger(slot) && slot > 0) addShell(type, slot, title);
  });
}

/* "Copy to shell" (tools/*.html command lines) targets a specific,
   already-open shell (picked by name from listShells() below) when a
   slot is given; otherwise a chosen type, or by default whichever
   shell was opened first -- in both of those cases falling back to
   opening one (bash if no type was chosen either) when nothing
   matching is open yet. */
function firstOpenShellOfType(type) {
  if (!activeShells[type] || activeShells[type].size === 0) return null;
  return Math.min(...activeShells[type]);
}

// fresh: true means this call is the one that just added the shell
// (via addShell) rather than pointing at one already sitting there --
// see the shell-copy-request handler for why that distinction matters.
function resolveShellTarget(type, slot) {
  if (type && SHELL_TYPES[type]) {
    if (slot != null && activeShells[type].has(slot)) return { type, slot, fresh: false };
    const existing = firstOpenShellOfType(type);
    if (existing !== null) return { type, slot: existing, fresh: false };
    return { type, slot: addShell(type), fresh: true };
  }
  const firstWin = overlayHost.querySelector(".shell-window");
  if (firstWin) return { type: firstWin.dataset.type, slot: Number(firstWin.dataset.slot), fresh: false };
  return { type: "bash", slot: addShell("bash"), fresh: true };
}

/* The current display name of every open shell -- its default
   "<Label> <slot> (:<port>)" title, or whatever it was renamed to
   (double-click a shell's title bar). Used to populate the "copy to
   shell" dropdown in tools/*.html with actual shell instances instead
   of just types, so e.g. a shell renamed to "testshell" shows up as
   "testshell" there. Guards against mid-rename (title swapped for an
   <input>, see startRenameShell) by falling back to the input's value. */
function listShells() {
  return Array.from(overlayHost.querySelectorAll(".shell-window")).map((win) => {
    const titleEl = win.querySelector(".shell-window-title");
    const inputEl = win.querySelector(".shell-window-title-input");
    return {
      type: win.dataset.type,
      slot: Number(win.dataset.slot),
      title: titleEl ? titleEl.textContent : inputEl ? inputEl.value : "",
    };
  });
}

/* Injects a command into the shell at (type, slot) by speaking ttyd's
   own WebSocket protocol directly, bypassing its iframe entirely --
   that iframe is cross-origin (its own port), so there's no way to
   reach into it and simulate a paste/keystroke from here. This opens
   a second, short-lived connection to the same ttyd instance; it ends
   up in the same terminal as the visible iframe only because both are
   attaching to the same tmux session (see scripts/ttyd-shells.sh) --
   without that, ttyd would just spawn an unrelated hidden shell for it.
   Protocol (reverse-engineered from ttyd 1.7.7's bundled client JS,
   there's no public spec): open /ws with the "tty" subprotocol, send
   {AuthToken, columns, rows} as the first (unprefixed) message, then
   input is a single byte '0' followed by the UTF-8 text. No '\r' is
   appended, on purpose: this pastes the command onto the shell's
   current input line without running it, the same way a real paste
   would (editable, cursor at the end) -- it's still up to whoever's
   at the keyboard to look it over and press Enter themselves.

   Every ttyd port now sits behind the local token proxy
   (scripts/shell-proxy.py): the URL carries ?session=<token> (from the
   generated config/shell-session.js) so the proxy lets the upgrade
   through, and it starts ttyd with `-c dashboard:<token>`, so the first
   message's AuthToken has to be base64("dashboard:"+token) --
   shellSession.wsAuthToken() returns exactly that. GET /token is still
   a no-CORS cross-origin read we can't use from here; the closure hands
   us the value directly instead.

   Sending the input frame right after open() (as this used to do)
   loses a race: ttyd hasn't spawned the tmux/shell process yet at
   that point, so the input arrives before anything is listening for
   it and is silently dropped -- nothing errors, the command just
   never appears. ttyd starts pushing its own '1' (set title) and '2'
   (set preferences) messages back almost immediately, well before
   that process is actually up, so those aren't a reliable "ready"
   signal either -- only a '0' message (actual PTY output, i.e. the
   shell's first prompt being drawn) means it's genuinely reading
   input now, so that's what this waits for before sending, once.

   That race used to be worse for a shell this is opening itself: this
   connection and the visible iframe's own are two independent
   connections to the same port, and racing to attach to a *freshly
   created* session specifically had a further window, right as it was
   still settling, where input could still be swallowed with no error
   even past that first '0'. Two things papered over that here before
   -- confirming the paste by watching for it to be echoed back (undone
   because a shell's redrawn output, styled with ANSI colors and cursor
   moves, isn't the plain text it was given, so the check missed real
   deliveries and resent on top of them) and blind resends (undone
   because even a *correct* resend is still a second visible send,
   which a fast edit made in between could get overwritten by). Both
   were trying to paper over the same root cause from this side: the
   caller now sequences it properly instead -- waits for a freshly
   created shell's own iframe to finish loading before ever opening
   this connection, so by the time it does, the real race (this
   connection vs. that iframe's) isn't one any more. See the
   shell-copy-request handler. */
function pasteIntoShell(type, slot, text) {
  const spec = SHELL_TYPES[type];
  if (!spec) return;
  const port = spec.basePort + slot - 1;

  const wsUrl = (window.shellSession && window.shellSession.wsUrl(port)) ||
    ("ws://127.0.0.1:" + port + "/ws");
  const ws = new WebSocket(wsUrl, ["tty"]);
  ws.binaryType = "arraybuffer";
  // \x15 (Ctrl-U) first: bash/zsh/PowerShell all bind it to "clear back
  // to start of line" by default. Without it, a paste lands wherever the
  // cursor already is -- if a *previous* paste is still sitting there
  // unrun (the whole point of not auto-Enter-ing is that it's normal to
  // leave one there while reading it), the new command just tacks onto
  // the end of the old one instead of replacing it, e.g. pasting
  // "nmap ... <IP>" onto an already-there "kerbrute ... <domain>" gives
  // one garbled "kerbrute ... <domain>nmap ... <IP>" line -- which then,
  // if Enter is pressed without noticing, bash tries to run as one
  // command and errors out (worse yet if it contains "<word>": that's
  // input redirection syntax, not a placeholder, to the shell). Ctrl-U
  // makes every "Shell" click start from a clean line, matching what it
  // visibly looks like it's doing.
  const body = new TextEncoder().encode("\x15" + text);
  const frame = new Uint8Array(body.length + 1);
  frame[0] = "0".charCodeAt(0); // ttyd INPUT message type
  frame.set(body, 1);

  ws.addEventListener("open", () => {
    // scripts/ttyd-shells.sh sets tmux's window-size to "largest" for
    // exactly this connection: server-wide, the pane is sized to match
    // whichever attached client reports the biggest terminal, so this
    // short-lived one -- gone half a second later -- can never shrink
    // what's actually shown in the browser. That only holds if this
    // reports a size *smaller* than the real terminal, though: 80x24
    // (a real terminal's usual default, used here before) is often
    // *bigger* than the floating shell window actually is, so while
    // this was connected tmux briefly resized the whole pane up to
    // match it -- and the two-line box-drawing prompt this theme uses
    // positions itself with cursor moves sized for that wider layout,
    // so redrawn at the real (narrower) width it visibly split/doubled
    // up. 1x1 can't be the largest of anything.
    const authToken = (window.shellSession && window.shellSession.wsAuthToken()) || "";
    ws.send(JSON.stringify({ AuthToken: authToken, columns: 1, rows: 1 }));
  });
  // The very first '0' (real PTY output) message isn't necessarily the
  // *whole* prompt: fancier themes (see the two-line box-drawing one
  // used here) draw it across several messages -- title, then cwd
  // line, then the input line itself, each its own '0'. Sending right
  // after the first one can land the paste in the middle of that
  // sequence, before the parts drawn after it exist yet to *not*
  // collide with, which showed up as the pasted text appearing twice:
  // once plain, from landing before the prompt around it existed, and
  // once correctly inside the finished prompt. So instead of firing on
  // the first '0', treat a run of them as still-in-progress and only
  // send once they've been quiet for a beat -- not { once: true },
  // since '1'/'2' (sent before any of this) must not count as that
  // first '0' and skip straight to sending.
  const QUIET_MS = 350;
  let quietTimer = null;
  ws.addEventListener("message", function onMessage(e) {
    const data = new Uint8Array(e.data);
    if (data.length === 0 || data[0] !== "0".charCodeAt(0)) return; // '1'/'2': not ready yet
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => {
      ws.removeEventListener("message", onMessage);
      ws.send(frame);
      ws.close();
    }, QUIET_MS);
  });
  ws.addEventListener("error", (err) => {
    console.warn("copy to shell: WebSocket error on port " + port, err);
  });
}

/* Core of the "copy to shell" pipeline, split out from the message
   listener so assets/script/tab-link.js can hand it a request that
   arrived from another browser tab without bouncing it back through
   window.postMessage (unreliable to the top window under file://).
   `data` is the same shape the listener used to read off e.data:
   { shellType, slot, text, forceNew }. fromRelay is set only when
   tab-link.js is replaying a request that already crossed over from
   another tab -- it must run locally then, never bounce onward. */
function handleShellCopyRequest(data, fromRelay) {
  // "Link" checkbox (assets/script/tab-link.js): when this tab is
  // linked to another, every command goes there instead of to a shell
  // here -- unless this call is itself the linked tab receiving one.
  if (!fromRelay && typeof window.tabLinkForward === "function" && window.tabLinkForward(data)) return;
  // forceNew (the default "Shell" button, not the ▾ dropdown) means
  // "open a fresh one" like the dashboard's own "+ Shell" -- same
  // fallback-to-bash as resolveShellTarget's when no type was
  // specified either (e.g. no shell open yet at all).
  const forceType = data.forceNew ? (SHELL_TYPES[data.shellType] ? data.shellType : "bash") : null;
  const { type, slot, fresh } = forceType
    ? { type: forceType, slot: addShell(forceType), fresh: true }
    : resolveShellTarget(data.shellType, data.slot);
  // Same pipeline either way -- add a shell (skipped when fresh is
  // false: one's already sitting there), then paste into it -- but
  // "then" means waiting for its iframe to actually finish loading
  // first when it's the one just added. Pasting is a *second*,
  // independent connection to the same port (see pasteIntoShell),
  // opened straight away and racing that iframe's own connection
  // used to be exactly how a freshly created shell could end up
  // with the terminal it reads from and the terminal drawn on
  // screen out of sync with each other.
  if (fresh) {
    const win = overlayHost.querySelector('.shell-window[data-type="' + type + '"][data-slot="' + slot + '"]');
    const iframe = win && win.querySelector("iframe");
    if (!iframe) {
      pasteIntoShell(type, slot, data.text);
    } else {
      // Waits for both: the iframe's own document to finish loading
      // (load firing is only "started connecting", its ttyd client
      // still has to open its websocket and get a prompt drawn from
      // there) and the shell-window's box to stop changing size
      // (a newly added window reflows the whole row, including
      // itself). Both, not just one: two different races against
      // this connection, either can lose on its own.
      let loaded = false;
      let laidOut = false;
      const proceedWhenReady = () => {
        if (loaded && laidOut) pasteIntoShell(type, slot, data.text);
      };
      iframe.addEventListener(
        "load",
        () => {
          loaded = true;
          proceedWhenReady();
        },
        { once: true },
      );
      waitForStableLayout(win, () => {
        laidOut = true;
        proceedWhenReady();
      });
    }
  } else {
    pasteIntoShell(type, slot, data.text);
  }
}

function positionOverlay(rect) {
  overlayHost.style.left = rect.left + "px";
  overlayHost.style.top = rect.top + "px";
  overlayHost.style.width = rect.width + "px";
  overlayHost.style.height = rect.height + "px";
  overlayHost.classList.add("visible");
}

function hideOverlay() {
  overlayHost.classList.remove("visible");
  // Also clear the tracked rect so a sidebar toggle (or any other
  // trigger of updateOverlayFromFrame) can't flash the overlay back
  // into view at a stale position before the current page -- if any --
  // reports a fresh one.
  lastVisible = false;
  lastRect = null;
}

/* Re-derives the overlay's position from the last rect dashboard.html
   reported plus #frame's *live* rect. #frame itself only moves when
   the sidebar is toggled (index.html's #content margin-left transition)
   -- dashboard.html's own layout doesn't change during that, so
   re-reading frame.getBoundingClientRect() here is enough to track it
   exactly, without waiting on another postMessage round-trip. */
function updateOverlayFromFrame(frame) {
  if (lastVisible && lastRect && anyShellActive()) {
    const frameRect = frame.getBoundingClientRect();
    positionOverlay({
      left: frameRect.left + lastRect.left,
      top: frameRect.top + lastRect.top,
      width: lastRect.width,
      height: lastRect.height,
    });
  } else {
    hideOverlay();
  }
}

function initShellsHost() {
  overlayHost = document.createElement("div");
  overlayHost.className = "shells-overlay-host";
  overlayHost.id = "shellsOverlayHost";
  document.body.appendChild(overlayHost);
  restoreOpenShells();

  const frame = document.getElementById("frame");

  // If #frame navigates away while a tool modal (or a dropdown) happens
  // to be open (a sidebar click doesn't care whether one's open), the
  // page that would have posted the matching "closed" message is gone
  // before it ever gets the chance to -- modalOpen/menuOpen would
  // otherwise stay stuck true forever, permanently hiding the overlay
  // behind #frame even once back on a page with neither open. Every
  // fresh page load starts with none open, so reset on every navigation.
  frame.addEventListener("load", () => {
    modalOpen = false;
    menuOpen = false;
    updateOverlayForeground();
  });

  window.addEventListener("message", (e) => {
    if (!e.data) return;

    // Only act on messages from this same top-level tab: our own window
    // (tab-link.js relays a cross-tab request by re-posting to itself),
    // or a frame nested somewhere inside #frame (dashboard.html, the
    // tools/*.html pages two levels down, fs-explorer.js). A separate
    // tab or popup that grabbed a handle to us via window.open() has
    // its own .top and is dropped here -- otherwise it could drive the
    // shells (shell-copy-request -> pasteIntoShell, shell-request-add).
    // e.origin is useless for this: under file:// (the primary usage
    // mode) every page, attacker's included, reports "null".
    // See PlanDeTestSecurite-ShellBridge.txt 0.2.
    if (!e.source || (e.source !== window && e.source.top !== window)) return;

    if (e.data.type === "shell-copy-request") {
      // Sent directly by a tools/*.html page nested two levels down
      // (index.html -> #frame -> dashboard.html's modal iframe), so
      // e.source here is that inner window, not frame.contentWindow --
      // handle it before the source check below, which is specific to
      // dashboard.html's own messages. Also the shape tab-link.js
      // re-emits for a request relayed in from another tab.
      handleShellCopyRequest(e.data);
      return;
    }

    if (e.data.type === "fs-shell-list-request") {
      // FS Explorer (assets/script/fs-explorer.js, inside dashboard.html)
      // asking which shell panes are open so it can pick one to drive.
      // Deliberately NOT routed through tab-link like shell-list-request
      // below: FS Explorer opens its own WebSocket to a ttyd port on
      // THIS machine's loopback, so it always wants the shells this tab
      // actually owns, never a linked peer's.
      e.source.postMessage(
        { type: "fs-shell-list-response", requestId: e.data.requestId, shells: listShells() },
        "*",
      );
      return;
    }

    if (e.data.type === "shell-list-request") {
      // Same two-levels-deep sender as shell-copy-request above -- the
      // "copy to shell" dropdown asks for this fresh on every open so
      // it always reflects shells opened/closed/renamed since the tool
      // page loaded. Answered straight back to e.source (that tools
      // page's own window), not broadcast.
      // When "Link" is on, the dropdown should list the *linked tab's*
      // shells (that's where the command will land) -- tab-link.js
      // fetches them over the bus and replies to e.source itself.
      if (typeof window.tabLinkListRequest === "function" && window.tabLinkListRequest(e.data, e.source)) return;
      e.source.postMessage({ type: "shell-list-response", requestId: e.data.requestId, shells: listShells() }, "*");
      return;
    }

    if (e.source !== frame.contentWindow) return;

    if (e.data.type === "dashboard-shells-ready") {
      notifyDashboard();
      return;
    }

    if (e.data.type === "shell-request-add") {
      addShell(e.data.shellType);
      return;
    }

    if (e.data.type === "tool-modal-state") {
      // dashboard.html/tools.html's own tool-list modal pops up over
      // the *same* screen area the shells overlay tracks (#shellArea
      // sits in dashboard.html's layout, but the overlay is drawn in
      // index.html on top of the whole #frame) -- normally that's the
      // point (real terminals staying usable while browsing), but a
      // modal is meant to have the user's full attention, and "click
      // beside it to dismiss" only makes sense if it's actually the
      // topmost thing on screen. Drop the overlay behind #frame
      // entirely while one's open instead of fighting over z-index.
      modalOpen = !!e.data.open;
      updateOverlayForeground();
      return;
    }

    if (e.data.type === "dashboard-menu-state") {
      // Same reasoning as "tool-modal-state" above, for the "+ Shell" /
      // "Dashboards" dropdowns instead of the tool-list modal -- they're
      // real elements inside #frame's document, so the shells overlay
      // (drawn by *this* document, on top of #frame) would otherwise
      // always render above them regardless of any z-index set in there.
      menuOpen = !!e.data.open;
      updateOverlayForeground();
      return;
    }

    if (e.data.type === "shells-rect") {
      lastRectAt = performance.now();
      lastVisible = e.data.visible;
      lastRect = e.data.rect;
      updateOverlayFromFrame(frame);
    }
  });

  /* dashboard.html only reports its rect while it's the loaded page
     and alive -- if navigation destroys it, reports stop and this
     hides the overlay instead of leaving it stuck on screen. */
  setInterval(() => {
    if (performance.now() - lastRectAt > 500) hideOverlay();
  }, 250);

  /* The sidebar toggle (index.html's own script) animates #content's
     margin-left over 0.3s, which smoothly moves #frame along with it.
     Track that frame-by-frame instead of relying on dashboard.html's
     60ms rect-polling interval -- that polling is plenty fine for
     detecting *that* something changed, but at animation speed it
     makes the overlay jump between stale snapshots instead of
     following #frame's actual position. */
  const content = document.getElementById("content");
  if (content) {
    const trackDuringTransition = () => {
      updateOverlayFromFrame(frame);
      trackingRafId = requestAnimationFrame(trackDuringTransition);
    };
    content.addEventListener("transitionrun", (e) => {
      if (e.propertyName !== "margin-left") return;
      if (trackingRafId) cancelAnimationFrame(trackingRafId);
      trackDuringTransition();
    });
    content.addEventListener("transitionend", (e) => {
      if (e.propertyName !== "margin-left") return;
      if (trackingRafId) cancelAnimationFrame(trackingRafId);
      trackingRafId = null;
      updateOverlayFromFrame(frame);
    });
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "/settings.html/shellOpacity") applyShellOpacity();
  });

  // Direct entry point for assets/script/tab-link.js: a "copy to shell"
  // request that came in from another browser tab, handed straight here
  // instead of through window.postMessage. fromRelay=true so it runs in
  // this tab and isn't forwarded again.
  window.shellsHostDeliverCommand = (data) => handleShellCopyRequest(data, true);

  // Lets tab-link.js answer a linked tab's "list your shells" request
  // (names included, so a renamed terminal shows up in the other tab's
  // "copy to shell" dropdown).
  window.shellsHostListShells = listShells;
}

initShellsHost();
