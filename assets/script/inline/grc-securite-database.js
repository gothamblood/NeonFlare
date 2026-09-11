// Was an inline <script> on grc/securite/database/index.html -- externalized for CSP
// script-src (PlanDurcissement-Securite.txt P1). Must load after every
// grc-i18n*/index.js/grc-loader.js/grc-checklist.js/hub-modal.js script.
const savedTheme = localStorage.getItem("/settings.html") || "standard";
  document.body.classList.add("theme-" + savedTheme);

  // Let the parent shell (encapsulation.html) sync its sidebar theme --
  // the parent doesn't read storage directly, see settings.html.
  if (window.self !== window.top) {
    window.top.postMessage({ type: "theme-change", theme: savedTheme }, "*");
  }

  applyI18n(getSavedLang());
  renderGrcDomains(securiteDatabaseIndexConfig.domains, "#securite-database-grid", "grc.securite.database");
  renderGrcCoverage(securiteDatabaseIndexConfig.domains, "#securite-database-grid", "#grc-coverage-summary");


  // Section-scoped export/import/reset toolbar -- same functions the
  // main GRC hub uses (assets/script/grc-checklist.js), just given a
  // single-section array instead of grcAllSections's five, so none of
  // them can reach past this section's own domains (see
  // resetGrcData()/importGrcData()'s 2026-09-08 scoping fix).
  const securiteDatabaseSections = [
    { title: grcT("nav.databaseSecurity"), domains: securiteDatabaseIndexConfig.domains, basePath: "./", keyPrefix: "grc.securite.database" },
  ];

  function confirmResetSection() {
    if (!confirm(grcT("grc.hub.confirmResetSection"))) return;
    resetGrcData(securiteDatabaseSections, () => location.reload());
  }

  function handleSectionImport(file) {
    if (!file) return;
    if (!confirm(grcT("grc.hub.confirmImportSection"))) {
      document.getElementById("sectionImportInput").value = "";
      return;
    }
    importGrcData(
      file,
      securiteDatabaseSections,
      (count) => {
        alert(grcT("grc.hub.importRestoredCount").replace("{count}", count));
        location.reload();
      },
      (message) => {
        alert(grcT("grc.hub.importFailed").replace("{message}", message));
        document.getElementById("sectionImportInput").value = "";
      }
    );
  }
// Was 6 onclick=""/onchange="" attributes on the toolbar buttons --
// converted to addEventListener (PlanDurcissement-Securite.txt P1.2).
document.getElementById("btnExportJson").addEventListener("click", () => exportGrcAsJson(securiteDatabaseSections, "grc-securite-database"));
document.getElementById("btnSaveAs").addEventListener("click", () => saveGrcAsJson(securiteDatabaseSections, "grc-securite-database"));
document.getElementById("btnExportWord").addEventListener("click", () => exportGrcAsWord(securiteDatabaseSections, "grc-securite-database"));
document.getElementById("btnExportPdf").addEventListener("click", () => exportGrcAsPdf(securiteDatabaseSections));
document.getElementById("btnImportTrigger").addEventListener("click", () => document.getElementById("sectionImportInput").click());
document.getElementById("sectionImportInput").addEventListener("change", function () { handleSectionImport(this.files[0]); });
document.getElementById("btnReset").addEventListener("click", confirmResetSection);

