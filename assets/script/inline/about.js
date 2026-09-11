// Was an inline <script> + 3 onclick="" attributes on project/about.html
// -- externalized/converted to addEventListener for CSP script-src
// (PlanDurcissement-Securite.txt P1.1/P1.2). Must load after
// about-config.js, about-loader.js and wallpaper-loader.js (uses
// getAboutConfig/applyWallpaper/renderAbout, all defined there).
(function () {
  const theme = localStorage.getItem("/settings.html") || "standard";
  document.body.classList.add("theme-" + theme);

  // Let the parent shell (encapsulation.html) sync its sidebar theme --
  // the parent doesn't read storage directly, see settings.html.
  if (window.self !== window.top) {
    window.top.postMessage({ type: "theme-change", theme: theme }, "*");
  }

  // getAboutConfig() falls back to the static aboutConfig (config/about.js)
  // until a Settings > Config About edit creates a localStorage override
  // -- see assets/script/about-config.js.
  const activeAboutConfig = getAboutConfig();
  applyWallpaper(activeAboutConfig.background, "about");
  renderAbout(activeAboutConfig);

  function openModal() {
    document.getElementById("modal").style.display = "flex";
  }

  function closeModal() {
    document.getElementById("modal").style.display = "none";
  }

  document.querySelector(".barcode").addEventListener("click", openModal);
  document.querySelector(".qr").addEventListener("click", openModal);
  document.querySelector(".close-btn").addEventListener("click", closeModal);
})();
