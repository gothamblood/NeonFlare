/* Target-page half of the guided tour (assets/script/onboarding-wizard.js
   in index.html). The tour draws its spotlight in the parent window, so it
   can't see this iframe's own DOM -- it asks for an element's on-screen
   rect by id, this reports it back over postMessage. Scrolls the element
   into view first since a step pointing at something off-screen (eg.
   dragged below the fold, or a Settings card further down the grid)
   wouldn't be much of a tour. Shared by every page the tour can point at
   (project/dashboard.html, project/settings.html). */
window.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "onb-request-rect") return;

  const target = document.getElementById(e.data.panelId);
  const respond = (rect) => {
    window.top.postMessage({ type: "onb-rect", token: e.data.token, rect }, "*");
  };

  // offsetParent is null for display:none (eg. hidden via Settings >
  // Sections du Dashboard) or detached elements -- same check used
  // elsewhere on dashboard.html (dashboard-shells.js's isShellAreaVisible).
  if (!target || target.offsetParent === null) {
    respond(null);
    return;
  }

  // Dashboard panels (dashboard-shells.js's togglePanel) collapse to just
  // their header via a "collapsed" class -- pointing the tour at one
  // collapsed (eg. left that way from a previous session) would spotlight
  // a near-empty sliver instead of the section it's meant to introduce.
  // Same expand-and-fix-the-button-glyph pattern as applyShellsState.
  if (target.classList.contains("collapsed")) {
    target.classList.remove("collapsed");
    const btn = target.querySelector(".dash-collapse-btn");
    if (btn) btn.textContent = "–";
  }

  // "start" for a target taller than the viewport (eg. the full Settings
  // card grid, or the GRC domain grid) so the tour reveals it from the
  // top down instead of centering on whatever happens to be mid-scroll.
  target.scrollIntoView({ block: e.data.scrollAlign || "center", behavior: "instant" });
  const rect = target.getBoundingClientRect();
  respond({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
});
