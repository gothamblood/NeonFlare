// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  const grcDashboardSections = [
    { title: "GRC", domains: grcIndexConfig.domains, basePath: "../grc/" },
    { title: "Sécurité réseau", domains: securiteReseauIndexConfig.domains, basePath: "../grc/securite/reseau/" },
    { title: "Sécurité API", domains: securiteApiIndexConfig.domains, basePath: "../grc/securite/api/" },
    { title: "Sécurité WebApp", domains: securiteWebappIndexConfig.domains, basePath: "../grc/securite/webapp/" },
    { title: "Sécurité base de données", domains: securiteDatabaseIndexConfig.domains, basePath: "../grc/securite/database/" },
  ];
  renderGrcDashboardCoverage(grcDashboardSections, "#grc-dashboard-coverage");
  renderGrcHeaderCoverage(grcDashboardSections, "#grcHeaderStatus .grc-progress-fill", "#grcHeaderCount");
