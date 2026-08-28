(function () {
  const EM_DASH = "—";
  // Fallback for the "copy to shell" dropdown when no shell is open
  // yet (see populateMenu below) -- matches the types/order in
  // assets/script/shells-host.js and dashboard.html's own "+ Shell"
  // menu.
  const SHELL_MENU_TYPES = [
    { type: "bash", label: "Bash" },
    { type: "zsh", label: "Zsh" },
    { type: "pwsh", label: "PowerShell" },
  ];

  function extractCommand(rawText) {
    let text = rawText;
    const idx = text.indexOf(EM_DASH);
    if (idx !== -1) text = text.slice(idx + EM_DASH.length);
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");
  }

  // Host field: fills in every "<IP>" placeholder across the command
  // list with one target, entered once instead of by hand on every
  // command. localStorage (not sessionStorage, see settings.html) so
  // it carries over when switching tool sections -- each is its own
  // page load. Read live from the input rather than cached at load
  // time, so changing the host mid-session takes effect on the very
  // next copy/send without needing a reload.
  const HOST_STORAGE_KEY = "/tools/hostIP";
  let hostInput = null;

  function getHostIP() {
    return (hostInput ? hostInput.value : localStorage.getItem(HOST_STORAGE_KEY) || "").trim();
  }

  // Wordlist selector: same idea as the host field, for every
  // "<wordlist>" placeholder (gobuster's generic dir/dns/vhost modes).
  // A <select> of the paths this site's own command examples already
  // reference (so they're paths already known to be right for a
  // default Kali wordlists install) plus a free-text "Autre" for
  // anything else -- a real file-path picker isn't an option here:
  // <input type="file"> only ever exposes the picked file's *name* to
  // page script, never its full filesystem path, by design in every
  // browser, so it can't produce something usable as a -w argument.
  const WORDLIST_STORAGE_KEY = "/tools/wordlistPath";
  const WORDLIST_PRESETS = [
    { path: "/usr/share/wordlists/dirb/common.txt", label: "common.txt (dirb)" },
    { path: "/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt", label: "directory-list-2.3-medium.txt (dirbuster)" },
    { path: "/usr/share/wordlists/rockyou.txt", label: "rockyou.txt" },
    {
      path: "/usr/share/wordlists/SecLists/Discovery/DNS/subdomains-top1million-5000.txt",
      label: "subdomains-top1million-5000.txt (SecLists DNS)",
    },
  ];
  const WORDLIST_CUSTOM = "__custom__";
  let wordlistSelect = null;
  let wordlistCustomInput = null;

  function getWordlistPath() {
    if (!wordlistSelect) return (localStorage.getItem(WORDLIST_STORAGE_KEY) || "").trim();
    return (wordlistSelect.value === WORDLIST_CUSTOM ? wordlistCustomInput.value : wordlistSelect.value).trim();
  }

  function resolveCommand(command) {
    const ip = getHostIP();
    if (ip) command = command.split("<IP>").join(ip);
    const wordlist = getWordlistPath();
    if (wordlist) command = command.split("<wordlist>").join(wordlist);
    return command;
  }

  function createHostBar() {
    const bar = document.createElement("div");
    bar.className = "host-ip-bar";

    const hostLabel = document.createElement("label");
    hostLabel.className = "host-ip-label";
    hostLabel.textContent = "Host (<IP>) :";
    hostLabel.htmlFor = "hostIpInput";
    bar.appendChild(hostLabel);

    hostInput = document.createElement("input");
    hostInput.type = "text";
    hostInput.id = "hostIpInput";
    hostInput.className = "host-ip-input";
    hostInput.placeholder = "ex : 10.10.10.5";
    hostInput.autocomplete = "off";
    hostInput.spellcheck = false;
    hostInput.value = localStorage.getItem(HOST_STORAGE_KEY) || "";
    hostInput.addEventListener("input", () => {
      localStorage.setItem(HOST_STORAGE_KEY, hostInput.value.trim());
    });
    bar.appendChild(hostInput);

    const wlLabel = document.createElement("label");
    wlLabel.className = "host-ip-label";
    wlLabel.textContent = "Wordlist (<wordlist>) :";
    wlLabel.htmlFor = "wordlistSelect";
    bar.appendChild(wlLabel);

    wordlistSelect = document.createElement("select");
    wordlistSelect.id = "wordlistSelect";
    wordlistSelect.className = "host-ip-input wordlist-select";
    WORDLIST_PRESETS.forEach(({ path, label }) => {
      const opt = document.createElement("option");
      opt.value = path;
      opt.textContent = label;
      wordlistSelect.appendChild(opt);
    });
    const customOpt = document.createElement("option");
    customOpt.value = WORDLIST_CUSTOM;
    customOpt.textContent = "Autre (chemin personnalisé)…";
    wordlistSelect.appendChild(customOpt);
    bar.appendChild(wordlistSelect);

    wordlistCustomInput = document.createElement("input");
    wordlistCustomInput.type = "text";
    wordlistCustomInput.className = "host-ip-input wordlist-custom-input";
    wordlistCustomInput.placeholder = "/chemin/vers/wordlist.txt";
    wordlistCustomInput.autocomplete = "off";
    wordlistCustomInput.spellcheck = false;
    wordlistCustomInput.hidden = true;
    bar.appendChild(wordlistCustomInput);

    const saveWordlist = () => {
      localStorage.setItem(WORDLIST_STORAGE_KEY, getWordlistPath());
    };
    wordlistCustomInput.addEventListener("input", saveWordlist);

    // Preset by default; only switches to (and reveals) the custom
    // field when the saved value doesn't match one of the presets.
    const savedWordlist = localStorage.getItem(WORDLIST_STORAGE_KEY) || "";
    const preset = WORDLIST_PRESETS.find(({ path }) => path === savedWordlist);
    if (savedWordlist && !preset) {
      wordlistSelect.value = WORDLIST_CUSTOM;
      wordlistCustomInput.hidden = false;
      wordlistCustomInput.value = savedWordlist;
    } else if (preset) {
      wordlistSelect.value = preset.path;
    }

    wordlistSelect.addEventListener("change", () => {
      wordlistCustomInput.hidden = wordlistSelect.value !== WORDLIST_CUSTOM;
      if (wordlistSelect.value === WORDLIST_CUSTOM) wordlistCustomInput.focus();
      saveWordlist();
    });

    const title = document.querySelector(".category-title");
    if (title) title.insertAdjacentElement("afterend", bar);
    else document.body.insertBefore(bar, document.body.firstChild);
  }

  // navigator.clipboard.writeText() requires a clipboard-write permission
  // grant that has nothing to resolve it under file:// (no prompt UI, no
  // auto-grant) -- it just hangs forever instead of resolving or rejecting.
  // document.execCommand("copy") needs no permission and works synchronously
  // everywhere this site is actually opened, so it's the only method used.
  function copyText(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      /* no-op */
    }
    document.body.removeChild(ta);
  }

  // Sent straight up to index.html (window.top), which owns the shell
  // overlay -- this frame is nested two levels under it (index.html ->
  // #frame -> dashboard.html's tool modal iframe), so window.top skips
  // past dashboard.html entirely. See assets/script/shells-host.js for
  // the receiving end and how the paste actually happens. slot, when
  // given, targets that exact already-open shell instance; otherwise
  // shellType alone (or neither) falls back to shells-host.js's usual
  // "first open shell of this type, or the first one open, or open a
  // fresh bash" resolution -- unless forceNew, which always opens a
  // genuinely new shell of shellType regardless of what's already open
  // (the dropdown's "New <type>" entries; without this there'd be no
  // way to get a second, different shell once any one was open).
  function sendToShell(shellType, slot, command, forceNew) {
    window.top.postMessage(
      { type: "shell-copy-request", shellType: shellType || null, slot: slot ?? null, text: command, forceNew: !!forceNew },
      "*",
    );
  }

  // The dropdown lists actual open shells by name (see listShells() in
  // shells-host.js) rather than just types, so e.g. a shell renamed to
  // "testshell" shows up as "testshell" -- fetched fresh on every open
  // (requestId correlates the response, since more than one widget on
  // the page could have an outstanding request at once) so it reflects
  // whatever's been opened/closed/renamed since this page loaded.
  let requestSeq = 0;
  const pendingShellListRequests = new Map();

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "shell-list-response") return;
    const resolve = pendingShellListRequests.get(e.data.requestId);
    if (!resolve) return;
    pendingShellListRequests.delete(e.data.requestId);
    resolve(e.data.shells || []);
  });

  function requestShellList(timeoutMs) {
    return new Promise((resolve) => {
      const requestId = Date.now() + "_" + ++requestSeq;
      const timer = setTimeout(() => {
        pendingShellListRequests.delete(requestId);
        resolve([]); // no reply in time -- caller falls back to type-based options
      }, timeoutMs);
      pendingShellListRequests.set(requestId, (shells) => {
        clearTimeout(timer);
        resolve(shells);
      });
      window.top.postMessage({ type: "shell-list-request", requestId }, "*");
    });
  }

  // Closes every open shell-type dropdown on the page -- used both to
  // enforce "only one open at a time" and to dismiss on outside click.
  function closeAllShellMenus() {
    document.querySelectorAll(".copy-to-shell.open").forEach((el) => el.classList.remove("open"));
  }
  document.addEventListener("click", closeAllShellMenus);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllShellMenus();
  });

  function makeShellWidget(command) {
    const wrap = document.createElement("span");
    wrap.className = "copy-to-shell";
    // The whole widget (button, caret, dropdown) is its own click
    // target -- stop it from also bubbling into the line's click-to-
    // copy-to-clipboard handler, and from the document-level listener
    // above that would otherwise immediately close the dropdown this
    // same click might just have opened.
    wrap.addEventListener("click", (e) => e.stopPropagation());

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-to-shell-btn";
    btn.textContent = "Shell";
    btn.title = "Ouvrir un nouveau shell et y coller la commande (cliquez sur ▾ pour cibler un shell déjà ouvert)";
    wrap.appendChild(btn);

    const flash = (label) => {
      const original = btn.textContent;
      btn.textContent = label;
      btn.classList.add("sent");
      clearTimeout(wrap._sentResetTimer);
      wrap._sentResetTimer = setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("sent");
      }, 1000);
    };

    // Same pipeline as the dashboard's own "+ Shell" button: always
    // opens a fresh one and pastes into it -- it used to instead reuse
    // whatever shell happened to already be open, which sounds handy
    // but wasn't what it looked like it was doing: clicking "Shell" on
    // a second command while the first was still open silently landed
    // in the *same* shell as the first instead of opening its own, so
    // it read as "the second click didn't do anything." Picking a
    // specific already-open shell to reuse is still there -- that's
    // what the ▾ dropdown is for.
    btn.addEventListener("click", () => {
      sendToShell(null, null, resolveCommand(command), /* forceNew */ true);
      flash("Envoyé");
    });

    // Picking a shell type used to be a hover-only dropdown, but a
    // dropdown that only stays open while the pointer keeps tracking
    // over it (via CSS :hover) is one dead pixel away from closing --
    // once it does, it's gone for good (a hidden element isn't a valid
    // mouse target any more, so the pointer can't "land back on it").
    // A click-toggled, class-driven dropdown has no such trap: it stays
    // open regardless of pointer path until something explicit closes
    // it (another click on the caret, an outside click, Escape, or
    // picking an item).
    const caret = document.createElement("button");
    caret.type = "button";
    caret.className = "copy-to-shell-caret";
    caret.textContent = "▾";
    caret.title = "Choisir un shell";
    wrap.appendChild(caret);

    const menu = document.createElement("ul");
    menu.className = "copy-to-shell-menu";
    wrap.appendChild(menu);

    // Rebuilt on every open from a fresh list, not once at page load,
    // so it reflects shells opened/closed/renamed since -- including
    // showing e.g. "testshell" instead of "Zsh" once one's renamed.
    // Always lists existing shells (if any) *plus* one "New <type>"
    // entry per type -- listing existing ones only when none were open
    // yet meant that, the moment any single shell existed, there was
    // no longer a way to open a *different* one from here at all: e.g.
    // with only a Bash shell open, there was no option left to start a
    // Zsh one, because the type list it used to fall back to had
    // already been replaced by the (one-item) shell list.
    function populateMenu(shells) {
      menu.textContent = "";
      shells.forEach(({ type, slot, title }) => {
        const li = document.createElement("li");
        li.textContent = title || type + " " + slot;
        li.addEventListener("click", () => {
          sendToShell(type, slot, resolveCommand(command));
          flash("Envoyé");
          closeAllShellMenus();
        });
        menu.appendChild(li);
      });
      if (shells.length > 0) {
        const sep = document.createElement("hr");
        sep.className = "copy-to-shell-menu-sep";
        menu.appendChild(sep);
      }
      SHELL_MENU_TYPES.forEach(({ type, label }) => {
        const li = document.createElement("li");
        li.textContent = shells.length > 0 ? "Nouveau " + label : label;
        li.addEventListener("click", () => {
          sendToShell(type, null, resolveCommand(command), /* forceNew */ true);
          flash("Envoyé");
          closeAllShellMenus();
        });
        menu.appendChild(li);
      });
    }

    caret.addEventListener("click", async () => {
      const willOpen = !wrap.classList.contains("open");
      closeAllShellMenus();
      if (!willOpen) return;
      // 700ms (was 400): when "Link" is on, tab-link.js fetches the
      // linked tab's shell list over the inter-tab bus before replying,
      // which needs a bit more headroom than a same-tab round trip.
      populateMenu(await requestShellList(700));
      wrap.classList.add("open");
    });

    return wrap;
  }

  function makeCopyable(el) {
    const command = extractCommand(el.textContent);
    if (!command) return;

    el.classList.add("copyable");
    el.title = "Click to copy";

    const icon = document.createElement("span");
    icon.className = "copy-icon";
    icon.textContent = "Copy";
    icon.setAttribute("aria-hidden", "true");
    el.appendChild(icon);
    el.appendChild(makeShellWidget(command));

    el.addEventListener("click", () => {
      copyText(resolveCommand(command));
      icon.textContent = "Copied";
      el.classList.add("copied");
      clearTimeout(el._copyResetTimer);
      el._copyResetTimer = setTimeout(() => {
        icon.textContent = "Copy";
        el.classList.remove("copied");
      }, 1000);
    });
  }

  // Don't hijack clicks on real links, code you'd select manually, or
  // reference tables -- those aren't single copyable commands.
  function skip(el) {
    return !!el.querySelector("a, textarea, pre");
  }

  function init() {
    createHostBar();
    document.querySelectorAll(".command-cell").forEach((cell) => {
      const lines = cell.querySelectorAll(":scope > div:not(.comment-line)");
      if (lines.length > 0) {
        lines.forEach((line) => {
          if (!skip(line)) makeCopyable(line);
        });
      } else if (!skip(cell)) {
        makeCopyable(cell);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
