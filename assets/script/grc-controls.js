/* Registre de contrôles -- CRUD + localStorage, même pattern que
   assets/script/grc-risks.js et grc-assets.js.

   Chaque contrôle référence un ou plusieurs risques du registre
   grc-risks.js (riskIds), même principe que risk.assetIds -> le
   <select> est reconstruit à partir de l'autre registre à chaque
   ouverture du formulaire, pas de contrainte d'intégrité forte : un
   risque supprimé entre-temps est simplement filtré à l'affichage
   (voir getControlRiskNames), pas de blocage.

   getControlsForRisk() fait le chemin inverse (risque -> contrôles qui
   le traitent) : grc-risks.js l'appelle dans sa vue détail pour
   afficher "Traité par : ..." sur chaque risque, sans que grc-risks.js
   ait besoin de connaître la forme interne d'un contrôle.

   Tout le texte affiché passe par grcT() (assets/script/grc-i18n.js) --
   TYPES/STATUSES restent des clés internes stables, la traduction vient
   de grc.controles.type.* et grc.controles.status.* à l'affichage. */

const GRC_CONTROLS_KEY = "/grc/controles/registry";

const GRC_CONTROL_TYPES = ["organisationnel", "technique", "humain"];

// Les statuts d'une Déclaration d'Applicabilité (SoA) ISO 27001 --
// l'export PDF de ce registre EST la SoA (voir exportGrcControlsAsPdf).
// La 1ère valeur ("non-implemente") sert de défaut au formulaire ; les
// clés i18n (camelCase) ne peuvent pas reprendre les tirets des valeurs.
const GRC_CONTROL_STATUSES = [
  { value: "non-implemente", i18nKey: "nonImplemente" },
  { value: "partiel", i18nKey: "partiel" },
  { value: "implemente", i18nKey: "implemente" },
  { value: "non-applicable", i18nKey: "nonApplicable" },
];

function grcControlStatusI18nKey(value) {
  const found = GRC_CONTROL_STATUSES.find((s) => s.value === value);
  return "grc.controles.status." + (found ? found.i18nKey : "nonApplicable");
}

function getGrcControls() {
  try {
    const raw = vaultGetItem(GRC_CONTROLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveGrcControls(controls) {
  vaultSetItem(GRC_CONTROLS_KEY, JSON.stringify(controls));
}

function addGrcControl(control) {
  const controls = getGrcControls();
  const id = "control-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  controls.push(Object.assign({ id }, control));
  saveGrcControls(controls);
  return id;
}

function updateGrcControl(id, changes) {
  const controls = getGrcControls();
  const idx = controls.findIndex((c) => c.id === id);
  if (idx === -1) return;
  controls[idx] = Object.assign({}, controls[idx], changes);
  saveGrcControls(controls);
}

function removeGrcControl(id) {
  saveGrcControls(getGrcControls().filter((c) => c.id !== id));
}

function grcControlTypeLabel(value) {
  return GRC_CONTROL_TYPES.includes(value) ? grcT("grc.controles.type." + value) : value;
}

function grcControlStatusBadge(value) {
  const key = grcControlStatusI18nKey(value);
  if (value === "implemente") return { cls: "low", text: grcT(key) };
  if (value === "partiel") return { cls: "medium", text: grcT(key) };
  if (value === "non-implemente") return { cls: "high", text: grcT(key) };
  return { cls: "", text: grcT(key) };
}

// Résout riskIds en noms de risques réels -- filtre silencieusement les
// ids de risques supprimés depuis (pas de FK réelle en localStorage).
function getControlRiskNames(control) {
  const risks = typeof getGrcRisks === "function" ? getGrcRisks() : [];
  return (control.riskIds || [])
    .map((id) => risks.find((r) => r.id === id))
    .filter(Boolean)
    .map((r) => r.name);
}

// Chemin inverse : tous les contrôles qui traitent un risque donné --
// utilisé par grc-risks.js pour afficher "Traité par : ..." sur la
// fiche d'un risque sans dupliquer la donnée sur le risque lui-même.
function getControlsForRisk(riskId) {
  return getGrcControls().filter((c) => (c.riskIds || []).includes(riskId));
}

async function exportGrcControlsAsJson() {
  const data = await vaultMaybeEncryptForExport(getGrcControls());
  exportJsonFile(data, "grc-controles.json");
}

async function importGrcControlsFromJson(file) {
  const raw = await readJsonFile(file);
  const controls = await vaultMaybeDecryptImport(raw);
  if (!Array.isArray(controls)) throw new Error(grcT("grc.controles.pdf.invalidImport"));
  saveGrcControls(controls);
}

function resetGrcControls() {
  vaultRemoveItem(GRC_CONTROLS_KEY);
}

/* Rapport HTML du registre des contrôles seul -- Déclaration
   d'Applicabilité (SoA) : mêmes colonnes que le formulaire, même
   mécanique d'export que exportGrcAssetsAsPdf/exportGrcRisksAsPdf. */
function grcControlsReportBody() {
  const controls = getGrcControls();
  const generated = new Date().toLocaleString("fr-CA");
  let html = "<h1>" + grcT("grc.controles.pdf.title") + "</h1><p>" + grcT("grc.common.generatedOn") + " " + grcEscapeHtml(generated) + "</p>";

  if (controls.length === 0) {
    html += "<p>" + grcT("grc.controles.pdf.empty") + "</p>";
    return html;
  }

  html += "<table><thead><tr>" +
    "<th>" + grcT("grc.controles.pdf.colName") + "</th><th>" + grcT("grc.controles.pdf.colIso") + "</th>" +
    "<th>" + grcT("grc.controles.pdf.colNist") + "</th><th>" + grcT("grc.controles.pdf.colCis") + "</th>" +
    "<th>" + grcT("grc.controles.pdf.colType") + "</th><th>" + grcT("grc.controles.pdf.colStatus") + "</th>" +
    "<th>" + grcT("grc.controles.pdf.colRisks") + "</th><th>" + grcT("grc.controles.pdf.colOwner") + "</th>" +
    "<th>" + grcT("grc.controles.pdf.colEvidence") + "</th>" +
    "</tr></thead><tbody>";
  controls.forEach((control) => {
    const status = grcControlStatusBadge(control.status);
    html += "<tr>" +
      "<td>" + grcEscapeHtml(control.name) + "</td>" +
      "<td>" + grcEscapeHtml(control.isoRef || "") + "</td>" +
      "<td>" + grcEscapeHtml(control.nistRef || "") + "</td>" +
      "<td>" + grcEscapeHtml(control.cisRef || "") + "</td>" +
      "<td>" + grcEscapeHtml(grcControlTypeLabel(control.type)) + "</td>" +
      "<td>" + grcEscapeHtml(status.text) + "</td>" +
      "<td>" + grcEscapeHtml(getControlRiskNames(control).join(", ")) + "</td>" +
      "<td>" + grcEscapeHtml(control.owner || "") + "</td>" +
      "<td>" + grcEscapeHtml(control.evidence || "") + "</td>" +
      "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

function exportGrcControlsAsPdf() {
  const body = grcControlsReportBody();
  const html =
    "<!doctype html><html><head><meta charset='utf-8'><title>" + grcT("grc.controles.registryTitle") + "</title><style>" +
    "body{font-family:system-ui,Arial,sans-serif;color:#111;max-width:1200px;margin:2rem auto;line-height:1.5;}" +
    "h1{margin-bottom:0;}" +
    "table{border-collapse:collapse;width:100%;font-size:0.85em;}" +
    "th,td{border:1px solid #ccc;padding:0.4em 0.6em;text-align:left;vertical-align:top;}" +
    "th{background:#f0f0f0;}" +
    "@media print{body{margin:0;}}" +
    "</style></head><body>" + body +
    "<script>window.onload=()=>setTimeout(()=>window.print(),200);<\/script>" +
    "</body></html>";
  const win = window.open("", "_blank");
  if (!win) {
    alert(grcT("grc.common.popupBlocked"));
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* Construit et branche la section "Registre des contrôles" de
   grc/controles.html : bouton + formulaire (add/edit) + liste
   accordéon (add/edit/delete), même mécanique que
   initGrcAssetRegistry()/initGrcRiskRegistry(). Respecte le
   coffre-fort via vaultGateOr(). */
function initGrcControlRegistry() {
  const container = document.getElementById("grcControlRegistry");
  if (!container) return;
  if (vaultGateOr(container, initGrcControlRegistry)) return;

  let editingId = null;
  let expandedId = null;

  container.innerHTML = `
    <div class="grc-registry-toolbar">
      <button type="button" class="grc-registry-add-btn" id="controlAddBtn">${grcT("grc.controles.form.addBtn")}</button>
      <button type="button" class="grc-registry-io-btn" id="controlExportBtn">${grcT("grc.common.btnExport")}</button>
      <button type="button" class="grc-registry-io-btn" id="controlExportPdfBtn">${grcT("grc.common.btnExportPdf")}</button>
      <button type="button" class="grc-registry-io-btn" id="controlImportBtn">${grcT("grc.common.btnImport")}</button>
      <input type="file" accept="application/json" id="controlImportFile" style="display:none">
    </div>
    <form class="grc-registry-form" id="controlForm" style="display:none">
      <h3 id="controlFormTitle">${grcT("grc.controles.form.title")}</h3>
      <label>${grcT("grc.controles.form.name")} <input type="text" id="controlName" required></label>
      <div class="grc-registry-form-row">
        <label>${grcT("grc.controles.form.isoRef")} <input type="text" id="controlIsoRef" placeholder="ex. A.5.17"></label>
        <label>${grcT("grc.controles.form.nistRef")} <input type="text" id="controlNistRef" placeholder="ex. PR.AC"></label>
        <label>${grcT("grc.controles.form.cisRef")} <input type="text" id="controlCisRef" placeholder="ex. CIS 6"></label>
      </div>
      <label>${grcT("grc.controles.form.type")}
        <select id="controlType">
          ${GRC_CONTROL_TYPES.map((t) => `<option value="${t}">${grcT("grc.controles.type." + t)}</option>`).join("")}
        </select>
      </label>
      <label>${grcT("grc.controles.form.status")}
        <select id="controlStatus">
          ${GRC_CONTROL_STATUSES.map((s) => `<option value="${s.value}">${grcT("grc.controles.status." + s.i18nKey)}</option>`).join("")}
        </select>
      </label>
      <label>${grcT("grc.controles.form.risks")}
        <select id="controlRiskIds" multiple size="4"></select>
      </label>
      <label>${grcT("grc.controles.form.owner")} <input type="text" id="controlOwner"></label>
      <label>${grcT("grc.controles.form.evidence")} <textarea id="controlEvidence" rows="2"></textarea></label>
      <div class="grc-registry-form-actions">
        <button type="submit" class="grc-registry-add-btn">${grcT("grc.common.btnSave")}</button>
        <button type="button" class="grc-registry-io-btn" id="controlCancelBtn">${grcT("grc.common.btnCancel")}</button>
      </div>
    </form>
    <ul class="grc-registry-list" id="controlList"></ul>
  `;

  function populateRiskIds(selected) {
    const select = container.querySelector("#controlRiskIds");
    select.innerHTML = "";
    const risks = typeof getGrcRisks === "function" ? getGrcRisks() : [];
    risks.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.id;
      opt.textContent = r.name;
      opt.selected = (selected || []).includes(r.id);
      select.appendChild(opt);
    });
  }

  function showForm(control) {
    editingId = control ? control.id : null;
    container.querySelector("#controlFormTitle").textContent = control ? grcT("grc.controles.form.titleEdit") : grcT("grc.controles.form.title");
    container.querySelector("#controlName").value = control ? control.name : "";
    container.querySelector("#controlIsoRef").value = control ? (control.isoRef || "") : "";
    container.querySelector("#controlNistRef").value = control ? (control.nistRef || "") : "";
    container.querySelector("#controlCisRef").value = control ? (control.cisRef || "") : "";
    container.querySelector("#controlType").value = control ? control.type : GRC_CONTROL_TYPES[0];
    container.querySelector("#controlStatus").value = control ? control.status : GRC_CONTROL_STATUSES[0].value;
    container.querySelector("#controlOwner").value = control ? (control.owner || "") : "";
    container.querySelector("#controlEvidence").value = control ? (control.evidence || "") : "";
    populateRiskIds(control ? control.riskIds : []);
    container.querySelector("#controlForm").style.display = "";
    container.querySelector("#controlAddBtn").style.display = "none";
    container.querySelector("#controlFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideForm() {
    editingId = null;
    container.querySelector("#controlForm").reset();
    container.querySelector("#controlForm").style.display = "none";
    container.querySelector("#controlAddBtn").style.display = "";
  }

  container.querySelector("#controlAddBtn").addEventListener("click", () => showForm(null));
  container.querySelector("#controlCancelBtn").addEventListener("click", hideForm);
  container.querySelector("#controlExportBtn").addEventListener("click", exportGrcControlsAsJson);
  container.querySelector("#controlExportPdfBtn").addEventListener("click", exportGrcControlsAsPdf);
  container.querySelector("#controlImportBtn").addEventListener("click", () => container.querySelector("#controlImportFile").click());
  container.querySelector("#controlImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importGrcControlsFromJson(file)
      .then(renderGrcControlList)
      .catch((err) => alert(err.message || grcT("grc.common.invalidJsonFile")))
      .finally(() => { e.target.value = ""; });
  });

  container.querySelector("#controlForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = container.querySelector("#controlName").value.trim();
    if (!name) return;
    const riskIds = Array.from(container.querySelector("#controlRiskIds").selectedOptions).map((o) => o.value);
    const data = {
      name,
      isoRef: container.querySelector("#controlIsoRef").value.trim(),
      nistRef: container.querySelector("#controlNistRef").value.trim(),
      cisRef: container.querySelector("#controlCisRef").value.trim(),
      type: container.querySelector("#controlType").value,
      status: container.querySelector("#controlStatus").value,
      riskIds,
      owner: container.querySelector("#controlOwner").value.trim(),
      evidence: container.querySelector("#controlEvidence").value.trim(),
    };
    if (editingId) updateGrcControl(editingId, data);
    else addGrcControl(data);
    hideForm();
    renderGrcControlList();
  });

  function buildControlItem(control) {
    const status = grcControlStatusBadge(control.status);
    const li = document.createElement("li");
    li.className = "grc-registry-item" + (control.id === expandedId ? " open" : "");

    const header = document.createElement("div");
    header.className = "grc-registry-header";
    header.innerHTML =
      `<span>${control.name}${control.isoRef ? " — " + control.isoRef : ""}</span>` +
      `<span class="grc-crit-badge ${status.cls}">${status.text}</span>` +
      `<span class="chevron">▸</span>`;
    header.onclick = () => {
      expandedId = expandedId === control.id ? null : control.id;
      renderGrcControlList();
    };
    li.appendChild(header);

    if (control.id === expandedId) {
      const body = document.createElement("div");
      body.className = "grc-registry-body";

      const refs = [
        control.isoRef ? "ISO " + control.isoRef : "",
        control.nistRef ? "NIST " + control.nistRef : "",
        control.cisRef ? "CIS " + control.cisRef : "",
      ].filter(Boolean);

      const riskNames = getControlRiskNames(control);

      body.innerHTML =
        `<p>${grcT("grc.controles.detail.type").replace("{value}", grcControlTypeLabel(control.type))}</p>` +
        (refs.length ? `<p>${grcT("grc.controles.detail.refs").replace("{value}", refs.join(" · "))}</p>` : "") +
        (riskNames.length ? `<p>${grcT("grc.controles.detail.risks").replace("{names}", riskNames.join(", "))}</p>` : "") +
        (control.owner ? `<p>${grcT("grc.controles.detail.owner").replace("{owner}", control.owner)}</p>` : "") +
        (control.evidence ? `<p>${grcT("grc.controles.detail.evidence").replace("{value}", control.evidence)}</p>` : "");

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "grc-registry-add-btn";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => showForm(control);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "grc-registry-io-btn";
      deleteBtn.textContent = grcT("grc.common.btnDelete");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", control.name))) return;
        removeGrcControl(control.id);
        if (expandedId === control.id) expandedId = null;
        renderGrcControlList();
      };
      body.appendChild(deleteBtn);

      li.appendChild(body);
    }

    return li;
  }

  window.renderGrcControlList = function () {
    const list = container.querySelector("#controlList");
    list.innerHTML = "";
    getGrcControls().forEach((control) => list.appendChild(buildControlItem(control)));
  };

  renderGrcControlList();
}
