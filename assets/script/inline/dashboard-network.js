// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  // Duplicated from the currentDashboardId computed further down (near
  // the dashboard picker) -- that one also validates the id against
  // getDashboards() and defaults dashboardId itself when missing, but
  // needs DOM that isn't ready yet this early. A background lookup on
  // an id that turns out to not exist just misses (falls through to
  // the page's own default) either way, so the extra validation isn't
  // needed here.
  const wallpaperDashboardId = new URLSearchParams(window.location.search).get("id") || "default";
  applyWallpaper(reseauConfig.background, "dashboard:" + wallpaperDashboardId);
  loadDragons("#dragonSlot");
  // Nodes come from the live registry (Config Network, see
  // assets/script/network-config.js) -- config/reseau.js is only the
  // seed for a fresh install now, never read directly here.
  function initNetworkSection() {
    const grid = document.querySelector("#reseau-grid");
    if (vaultGateOr(grid, initNetworkSection)) return;
    initNetworkDashboard({ cards: getNetworkNodes() }, {
      gridSelector: "#reseau-grid",
      gaugeSelector: ".hud-gauge",
      logSelector: "#hudLogBody",
      clockSelector: "#hudClock",
      intervalMs: 45000
    });
  }
  initNetworkSection();
  initDashboardPanels();
