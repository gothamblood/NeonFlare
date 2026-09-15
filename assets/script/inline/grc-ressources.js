// grc/ressources.html is a top-level sidebar destination (peer to
// grc/index.html and the 4 securite/*/index.html hubs), NOT a sub-page
// opened in the GRC hub's modal -- so it must NOT use page-boot.js: that
// script marks the page "embedded" whenever window.self !== window.top,
// which is also true here (loaded in index.html's #frame), and
// body.embedded strips header/main padding for the small modal box
// (grc.css). Same theme-class-only pattern as assets/script/inline/
// grc-index.js, applied before first paint.
const savedTheme = localStorage.getItem("/settings.html") || "standard";
document.body.classList.add("theme-" + savedTheme);

// Let the parent shell sync its sidebar theme -- the parent doesn't read
// storage directly, see settings.html.
if (window.self !== window.top) {
  window.top.postMessage({ type: "theme-change", theme: savedTheme }, "*");
}
