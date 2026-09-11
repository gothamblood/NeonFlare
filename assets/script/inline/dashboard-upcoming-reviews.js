// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  function renderUpcomingReviews() {
    const container = document.getElementById("upcomingReviewsList");
    const items = [];
    getGrcAssets().forEach((a) => {
      if (a.nextReviewDate) items.push({ label: a.name, date: a.nextReviewDate, kind: "Actif" });
    });
    getGrcRisks().forEach((r) => {
      if (r.reviewDate) items.push({ label: r.name, date: r.reviewDate, kind: "Risque" });
    });
    items.sort((a, b) => a.date.localeCompare(b.date));

    if (items.length === 0) {
      container.innerHTML = '<p class="netcfg-desc">Aucune date de revue enregistrée sur les registres Actifs/Risques.</p>';
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    container.innerHTML = items.slice(0, 5).map((it) => {
      const overdue = it.date < today;
      return '<div class="upcoming-review-row' + (overdue ? " overdue" : "") + '">' +
        '<span>' + it.kind + ' — ' + it.label + '</span>' +
        '<span class="upcoming-review-date">' + it.date + (overdue ? " (en retard)" : "") + '</span>' +
        '</div>';
    }).join("");
  }
  renderUpcomingReviews();
