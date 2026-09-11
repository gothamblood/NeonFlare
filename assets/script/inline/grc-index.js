// Was an inline <script> on grc/index.html -- externalized for CSP
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
renderGrcDomains(grcIndexConfig.domains, "#grc-grid");
renderGrcCoverage(grcIndexConfig.domains, "#grc-grid", "#grc-coverage-summary");

// Export/Reset act on every section at once (this hub + the 4 security
// sub-hubs), not just the 20 domains shown on this page -- same scope
// as the dashboard's "Couverture GRC" panel.
const grcAllSections = [
  { title: grcT("nav.grc"), domains: grcIndexConfig.domains, basePath: "./", keyPrefix: "grc" },
  { title: grcT("nav.networkSecurity"), domains: securiteReseauIndexConfig.domains, basePath: "securite/reseau/", keyPrefix: "grc.securite.reseau" },
  { title: grcT("nav.apiSecurity"), domains: securiteApiIndexConfig.domains, basePath: "securite/api/", keyPrefix: "grc.securite.api" },
  { title: grcT("nav.webappSecurity"), domains: securiteWebappIndexConfig.domains, basePath: "securite/webapp/", keyPrefix: "grc.securite.webapp" },
  { title: grcT("nav.databaseSecurity"), domains: securiteDatabaseIndexConfig.domains, basePath: "securite/database/", keyPrefix: "grc.securite.database" },
];

function confirmResetGrc() {
  if (!confirm(grcT("grc.hub.confirmReset"))) return;
  resetGrcData(grcAllSections, () => location.reload());
}

function handleGrcImport(file) {
  if (!file) return;
  if (!confirm(grcT("grc.hub.confirmImport"))) {
    document.getElementById("grcImportInput").value = "";
    return;
  }
  importGrcData(
    file,
    grcAllSections,
    (count) => {
      alert(grcT("grc.hub.importRestoredCount").replace("{count}", count));
      location.reload();
    },
    (message) => {
      alert(grcT("grc.hub.importFailed").replace("{message}", message));
      document.getElementById("grcImportInput").value = "";
    }
  );
}

// Was 6 onclick=""/onchange="" attributes on the toolbar buttons --
// converted to addEventListener (PlanDurcissement-Securite.txt P1.2).
document.getElementById("btnExportJson").addEventListener("click", () => exportGrcAsJson(grcAllSections));
document.getElementById("btnSaveAs").addEventListener("click", () => saveGrcAsJson(grcAllSections));
document.getElementById("btnExportWord").addEventListener("click", () => exportGrcAsWord(grcAllSections));
document.getElementById("btnExportPdf").addEventListener("click", () => exportGrcAsPdf(grcAllSections));
document.getElementById("btnImportTrigger").addEventListener("click", () => document.getElementById("grcImportInput").click());
document.getElementById("grcImportInput").addEventListener("change", function () { handleGrcImport(this.files[0]); });
document.getElementById("btnReset").addEventListener("click", confirmResetGrc);
