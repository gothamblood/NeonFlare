/* shell-bridge session token -- GENERATED AT RUNTIME by
   scripts/ttyd-shells.sh (start rewrites the `var TOKEN` line, stop puts
   it back to ""). The committed copy is the empty stub; never commit a
   real value. See PlanCorrectif-ShellBridge-0.1.txt.

   The token is held in a closure, not on `window`, so a page from another
   origin that pulls this file in with <script src> still cannot read it
   off a global. That alone is NOT the barrier, though -- a caller can
   still ask the helpers below for a token-bearing URL. The real control
   is server-side: nginx serves this one file with
   `Cross-Origin-Resource-Policy: same-origin`, which blocks the
   cross-origin <script src> entirely; under file:// the browser's
   cross-directory subresource policy takes that role. The closure is
   defense in depth (keeps the token out of logs / trivial reads).

   Consumers: shells-host.js (terminal iframe + "copy to shell") and
   fs-explorer.js (listing / preview / presets / amber actions). Every
   ttyd port now sits behind the local token proxy (scripts/shell-proxy.py);
   without ?session the proxy answers 403. */
(function () {
  "use strict";

  var TOKEN = "";        // scripts/ttyd-shells.sh rewrites this line
  var LOW = 7681, HIGH = 7710;   // bash 7681.. / zsh 7691.. / pwsh 7701..

  function inRange(port) {
    port = +port;
    return port >= LOW && port <= HIGH;
  }
  function qs() {
    return TOKEN ? "?session=" + encodeURIComponent(TOKEN) : "";
  }

  window.shellSession = {
    // Has `ttyd-shells.sh start` run (is there a live token)?
    active: function () { return TOKEN !== ""; },

    // http:// URL for the visible terminal iframe. The proxy validates
    // ?session, drops it, and sets a SameSite=Strict cookie so ttyd's
    // own client WebSocket (which knows nothing of the token) is let
    // through afterwards.
    iframeSrc: function (port) {
      return inRange(port) ? "http://127.0.0.1:" + port + "/" + qs() : null;
    },

    // ws:// URL for the short-lived direct connections (copy-to-shell,
    // fs-explorer). ?session is checked at the upgrade and stripped
    // before the request reaches ttyd.
    wsUrl: function (port) {
      return inRange(port) ? "ws://127.0.0.1:" + port + "/ws" + qs() : null;
    },

    // Value for the first WebSocket message's "AuthToken" field. ttyd runs
    // with no `-c` credential (its UNIX socket is already user-private, see
    // scripts/shell-proxy.py / Sweep3 §7.2a), so its protocol accepts an
    // empty AuthToken -- the proxy's ?session in wsUrl is the sole gate.
    // Kept as a helper so shells-host.js / fs-explorer.js don't hardcode "".
    wsAuthToken: function () {
      return "";
    }
  };
})();
