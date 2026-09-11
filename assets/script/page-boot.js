// Boilerplate identical across nearly every GRC/project page (was inline
// <script> before PlanDurcissement-Securite.txt P1 -- externalized so the
// page can run under a strict script-src CSP). Applies the saved theme
// class before first paint, and -- when the page is loaded inside a hub
// iframe (grc/index.html and friends) -- reports its own scroll height to
// the parent so the hub can size the iframe to fit.
(function () {
  const savedTheme = localStorage.getItem("/settings.html") || "standard";
  document.body.classList.add("theme-" + savedTheme);

  const embedded = window.self !== window.top;

  function reportHeight() {
    if (embedded) {
      window.parent.postMessage({ type: "hub-frame-height", height: document.documentElement.scrollHeight }, "*");
    }
  }

  if (embedded) {
    document.body.classList.add("embedded");
    new ResizeObserver(reportHeight).observe(document.body);
    window.addEventListener("load", reportHeight);
  }
})();
