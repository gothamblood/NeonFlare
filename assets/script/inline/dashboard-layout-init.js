// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  initDashboardLayout(currentDashboardId);


// Was 9 onclick="" attributes on the toolbar buttons + overlay/modal
// divs -- converted to addEventListener (PlanDurcissement-Securite.txt
// P1.2). closeToolModal/closeWebsiteModal are defined earlier in this
// same load sequence (dashboard-tools-tiles.js / dashboard-website-
// tiles.js); openQuickFindingModal/closeQuickFindingModal come from
// pentest-quick-add.js.
document.getElementById("btnResetLayout").addEventListener("click", () => {
  if (window.dashLayoutReset) window.dashLayoutReset();
});
document.getElementById("btnQuickFinding").addEventListener("click", openQuickFindingModal);
document.getElementById("overlay").addEventListener("click", () => {
  closeToolModal();
  closeWebsiteModal();
  closeQuickFindingModal();
});
document.getElementById("modal-tool").addEventListener("click", closeToolModal);
document.querySelector("#modal-tool .modal").addEventListener("click", (e) => e.stopPropagation());
document.getElementById("modal-website").addEventListener("click", closeWebsiteModal);
document.querySelector("#modal-website .modal").addEventListener("click", (e) => e.stopPropagation());
document.getElementById("modal-quick-finding").addEventListener("click", closeQuickFindingModal);
document.querySelector("#modal-quick-finding .modal").addEventListener("click", (e) => e.stopPropagation());
