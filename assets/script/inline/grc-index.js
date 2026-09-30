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

// Export/Reset act on every section at once (this hub + the 5 security
// sub-hubs), not just the 15 domains shown on this page -- same scope
// as the dashboard's "Couverture GRC" panel.
const grcAllSections = [
  { title: grcT("nav.grc"), domains: grcIndexConfig.domains, basePath: "./", keyPrefix: "grc" },
  { title: grcT("nav.networkSecurity"), domains: securiteReseauIndexConfig.domains, basePath: "securite/reseau/", keyPrefix: "grc.securite.reseau" },
  { title: grcT("nav.apiSecurity"), domains: securiteApiIndexConfig.domains, basePath: "securite/api/", keyPrefix: "grc.securite.api" },
  { title: grcT("nav.webappSecurity"), domains: securiteWebappIndexConfig.domains, basePath: "securite/webapp/", keyPrefix: "grc.securite.webapp" },
  { title: grcT("nav.databaseSecurity"), domains: securiteDatabaseIndexConfig.domains, basePath: "securite/database/", keyPrefix: "grc.securite.database" },
  { title: grcT("nav.operationalSecurity"), domains: securiteOperationnelleIndexConfig.domains, basePath: "securite/operationnelle/", keyPrefix: "grc" },
];

// Recharge APRÈS avoir laissé un tour d'event loop au navigateur pour
// committer les écritures localStorage qui viennent d'être faites. Firefox
// (surtout sous file://) valide localStorage de façon différée : un
// location.reload() synchrone juste après un lot de setItem précède le
// commit et perd les écritures (Chrome commit synchrone, d'où « marche sur
// Chrome, pas sur Firefox » — bug import 2026-09-29). Un simple setTimeout
// termine la tâche courante et laisse le commit se faire avant le reload.
function grcReloadAfterWrite() {
  setTimeout(function () { location.reload(); }, 150);
}

function confirmResetGrc() {
  if (!confirm(grcT("grc.hub.confirmReset"))) return;
  // Checklist (6 sections) puis tout le reste de la GRC : documentation,
  // registres, DDA, chaîne, exemple (grcResetAllData, grc-hub.js).
  resetGrcData(grcAllSections, () => {
    if (typeof grcResetAllData === "function") grcResetAllData();
    grcReloadAfterWrite();
  });
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
    (count, dataCount) => {
      // dataCount = blocs de données (registres, fiches, SoA, chaîne,
      // RPRP) restaurés depuis une sauvegarde complète ; absent/0 pour
      // un ancien fichier checklist-seule.
      if (dataCount) {
        alert(grcT("grc.hub.importRestoredFull")
          .replace("{domains}", count)
          .replace("{data}", dataCount));
      } else {
        alert(grcT("grc.hub.importRestoredCount").replace("{count}", count));
      }
      grcReloadAfterWrite();
    },
    (message) => {
      alert(grcT("grc.hub.importFailed").replace("{message}", message));
      document.getElementById("grcImportInput").value = "";
    },
    { full: true }
  );
}

// Was 6 onclick=""/onchange="" attributes on the toolbar buttons --
// converted to addEventListener (PlanDurcissement-Securite.txt P1.2).
document.getElementById("btnExportJson").addEventListener("click", () => exportGrcAsJson(grcAllSections, undefined, { full: true }));
document.getElementById("btnSaveAs").addEventListener("click", () => saveGrcAsJson(grcAllSections, undefined, { full: true }));
document.getElementById("btnExportWord").addEventListener("click", () => exportGrcAsWord(grcAllSections));
document.getElementById("btnExportPdf").addEventListener("click", () => exportGrcAsPdf(grcAllSections));
document.getElementById("btnImportTrigger").addEventListener("click", () => document.getElementById("grcImportInput").click());
document.getElementById("grcImportInput").addEventListener("change", function () { handleGrcImport(this.files[0]); });
document.getElementById("btnReset").addEventListener("click", confirmResetGrc);
