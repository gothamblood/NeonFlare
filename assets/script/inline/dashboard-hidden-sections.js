// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  (function () {
    getHiddenDashboardSections(currentDashboardId).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add("dash-section-off");
    });
  })();
