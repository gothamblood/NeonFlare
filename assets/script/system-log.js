/* Shared "System log" service for the Dashboard (#hudLogBody in
   project/dashboard.html).

   This used to be a private logLine() inside network-dashboard.js, fed
   only by the network reachability checks. It's promoted here so other
   panels -- FS Explorer (spec/fs-explorer/), and whatever comes next --
   can post to the same single timeline instead of each inventing their
   own log widget.

   API:
     window.systemLog.push({ source, text, level, selector })
       source   short tag shown before the text ("net", "fs", ...),
                also used for the per-source line cap. Optional.
       text     the message. Newlines are collapsed to a glyph so a
                multi-line blob can't blow up the ticker -- callers that
                need full multi-line output keep their own detail view.
       level    info | ok | fail | pending | amber   (default: info)
       selector CSS selector of the log body (default: #hudLogBody)

   network-dashboard.js keeps calling its own logLine(); that function is
   now a thin forwarder to this service (source "net"), so its call sites
   are untouched. */
(function () {
  "use strict";

  var DEFAULT_SELECTOR = "#hudLogBody";
  // Raised from the old hard-coded 40: several sources share the panel
  // now, so a single chatty one (a batch of network checks) mustn't be
  // able to push everything else out on its own.
  var MAX_LINES = 200;
  // ...and no single source may occupy more than this many lines, so
  // one source going noisy still can't evict the others up to MAX_LINES.
  var PER_SOURCE_CAP = 80;

  var LEVEL_CLASS = {
    info: "",
    ok: "ok",
    fail: "fail",
    pending: "pending",
    amber: "amber",
  };

  function nowStr() {
    return new Date().toLocaleTimeString();
  }

  function cleanSource(raw) {
    return String(raw || "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 12);
  }

  function push(opts) {
    opts = opts || {};
    var log = document.querySelector(opts.selector || DEFAULT_SELECTOR);
    if (!log) return;

    var level = Object.prototype.hasOwnProperty.call(LEVEL_CLASS, opts.level) ? opts.level : "info";
    var source = cleanSource(opts.source);

    var line = document.createElement("div");
    line.className = "hud-log-line" + (LEVEL_CLASS[level] ? " " + LEVEL_CLASS[level] : "");
    if (source) line.dataset.source = source;

    var text = (opts.text == null ? "" : String(opts.text)).replace(/\s*\n\s*/g, " ⏎ ");
    var prefix = "[" + nowStr() + "]";
    if (source) prefix += " " + source + " ·";
    line.textContent = prefix + " " + text;

    log.appendChild(line);

    while (log.children.length > MAX_LINES) {
      log.removeChild(log.firstChild);
    }
    if (source) {
      var mine = log.querySelectorAll('.hud-log-line[data-source="' + source + '"]');
      for (var i = 0; i + PER_SOURCE_CAP < mine.length; i++) {
        mine[i].remove();
      }
    }

    log.scrollTop = log.scrollHeight;
  }

  window.systemLog = { push: push };
})();
