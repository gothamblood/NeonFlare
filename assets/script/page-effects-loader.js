/* Runtime half of page-effects.js -- reads <body data-page-key="...">,
   applies whichever of vectors/stars are on for that key. Both effect
   scripts are loaded on demand (most pages never had either one) rather
   than always-included, so a page with both off pays nothing extra.
   Skips when body.embedded (the Tools/Website modal's nested iframe,
   see style.css's body.embedded rules): an ambient effect behind a
   modal that has nothing of its own to show it against just bleeds
   through the transparent embedded chrome. Note this is NOT the same
   as window.self !== window.top -- every ordinary page is already one
   level deep inside index.html's own #frame, so that check would skip
   effects on all normal navigation too. body.embedded is only ever set
   by pages meant for that nested modal context (tools/*.html and a few
   grc content pages), which is exactly the case to skip. */
(function () {
  if (document.body.classList.contains("embedded")) return;

  const pageKey = document.body.dataset.pageKey;
  if (!pageKey) return;

  function loadScriptOnce(src, onload) {
    if (document.querySelector('script[src="' + src + '"]')) {
      onload();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = onload;
    document.head.appendChild(s);
  }

  // Base path resolved the same way wallpaper-loader.js does -- this
  // script's own <script src> tells us how many "../" reach the site
  // root from wherever it was included.
  const base = (function () {
    const src = document.currentScript && document.currentScript.src;
    return src ? src.replace(/assets\/script\/page-effects-loader\.js.*$/, "") : "";
  })();

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof getPageEffect !== "function") return; // page-effects.js not loaded

    if (getPageEffect(pageKey, "vectors")) {
      loadScriptOnce(base + "assets/script/network-background.js", () => grcInitNetworkBackground());
    }
    if (getPageEffect(pageKey, "stars")) {
      loadScriptOnce(base + "assets/script/particles.js", () => spawnParticles(40));
    }
  });
})();
