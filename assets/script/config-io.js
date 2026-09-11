/* Shared download/upload helpers for the Settings > Config Network/
   Tools/Website/Topology cards' Exporter/Importer/Rétablir buttons
   (assets/script/network-config.js, tools-config.js, website-config.js,
   topology-config.js each add their own thin export/import/reset
   functions on top of these). */

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJsonFile(data, filename) {
  triggerDownload(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}

// grcT() lives in i18n.js, and grc.common.* keys in grc-i18n.js (loaded
// right after it) -- both loaded on every page that actually calls
// readJsonFile()/wireConfigIoControls() EXCEPT project/dashboard.html
// (loads config-io.js only as a dependency of grc-pentest.js, never
// either i18n file) -- guarded rather than assumed, degrades to the
// French default there instead of a ReferenceError.
function _cfgIoT(key, fallback) {
  return typeof grcT === "function" ? grcT(key) : fallback;
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (e) {
        reject(new Error(_cfgIoT("grc.common.invalidJsonFile", "Fichier JSON invalide.")));
      }
    };
    reader.onerror = () => reject(new Error(_cfgIoT("grc.common.cannotReadFile", "Impossible de lire le fichier.")));
    reader.readAsText(file);
  });
}

// Markup + wiring shared by all four Settings > Config ... cards for
// their Exporter/Importer/Rétablir row -- each card just supplies the
// three functions that actually read/write its own registry.
function configIoControlsHtml() {
  return `
    <div class="netcfg-io-row">
      <div class="dash-btn dash-btn-block cfgio-export" data-i18n="settings.cfgIo.export">⬇ Exporter JSON</div>
      <div class="dash-btn dash-btn-block cfgio-import" data-i18n="settings.cfgIo.import">⬆ Importer JSON</div>
      <input type="file" accept="application/json" class="cfgio-import-file" style="display:none">
      <div class="dash-btn dash-btn-block cfgio-reset" data-i18n="settings.cfgIo.reset">↺ Rétablir par défaut</div>
    </div>
  `;
}

function wireConfigIoControls(card, { exportFn, importFn, resetFn, onDone, resetConfirm }) {
  card.querySelector(".cfgio-export").addEventListener("click", exportFn);

  const fileInput = card.querySelector(".cfgio-import-file");
  card.querySelector(".cfgio-import").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importFn(file)
      .then(onDone)
      .catch((err) => alert(err.message || _cfgIoT("grc.common.invalidJsonFile", "Fichier JSON invalide.")))
      .finally(() => { fileInput.value = ""; });
  });

  card.querySelector(".cfgio-reset").addEventListener("click", () => {
    if (!confirm(resetConfirm || _cfgIoT("settings.cfgIo.resetConfirmDefault",
        "Rétablir la configuration par défaut ? Cette action est irréversible."))) return;
    resetFn();
    onDone();
  });
}
