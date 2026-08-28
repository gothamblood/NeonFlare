/* Custom accent colour for the "Personnalisé" theme
   (Settings > Apparence). The theme picker stores the ordinary theme
   name in localStorage["/settings.html"] exactly like the four built-in
   themes; when that name is "custom" the colour the user picked lives in
   localStorage["/settings.html/customAccent"].

   CSS can't read localStorage, so this script feeds the colour -- plus
   the handful of accent-derived shades the stylesheets expect per theme
   (see assets/css/grc.css / style.css / index.html) -- straight onto
   document.body as inline custom properties. Inline wins over every
   body.theme-* rule without any per-page CSS, and clears itself back out
   whenever the active theme isn't "custom". Loaded on every app page. */
(function () {
  "use strict";

  var THEME_KEY = "/settings.html";
  var ACCENT_KEY = "/settings.html/customAccent";
  var DEFAULT_ACCENT = "#48dbfb";

  // custom property -> alpha, one entry per accent-derived shade the
  // theme blocks in assets/css/*.css and index.html's inline <style>
  // define. Solid --accent / --logo-* are handled separately below.
  var SHADES = {
    "--accent-08": 0.08,
    "--accent-12": 0.12,
    "--accent-soft": 0.15,
    "--accent-25": 0.25,
    "--accent-glow": 0.25,
    "--accent-40": 0.4,
    "--logo-glow": 0.4,
    "--accent-50": 0.5,
    "--accent-70": 0.7
  };

  var SOLIDS = ["--accent", "--logo-border", "--logo-color"];

  function toRgb(hex) {
    var m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec((hex || "").trim());
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function apply() {
    var style = document.body && document.body.style;
    if (!style) return;

    var isCustom = (localStorage.getItem(THEME_KEY) || "standard") === "custom";
    var rgb = isCustom ? toRgb(localStorage.getItem(ACCENT_KEY) || DEFAULT_ACCENT) : null;

    if (!rgb) {
      SOLIDS.forEach(function (k) { style.removeProperty(k); });
      Object.keys(SHADES).forEach(function (k) { style.removeProperty(k); });
      return;
    }

    var solid = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    SOLIDS.forEach(function (k) { style.setProperty(k, solid); });
    Object.keys(SHADES).forEach(function (k) {
      style.setProperty(k, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + SHADES[k] + ")");
    });
  }

  if (document.body) apply();
  else document.addEventListener("DOMContentLoaded", apply);

  // Live updates -- another tab (storage event), or the Settings page
  // running inside the shell iframe (postMessage, same "theme-change"
  // payload the theme switch already sends up to index.html, now with an
  // extra `accent` field).
  window.addEventListener("storage", function (e) {
    if (!e.key || e.key === THEME_KEY || e.key === ACCENT_KEY) apply();
  });
  window.addEventListener("message", function (e) {
    var d = e && e.data;
    if (!d || d.type !== "theme-change") return;
    if (typeof d.accent === "string") {
      try { localStorage.setItem(ACCENT_KEY, d.accent); } catch (err) {}
    }
    apply();
  });

  window.applyCustomAccent = apply;
})();
