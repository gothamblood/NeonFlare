/* Registre de risques -- CRUD + localStorage, même pattern que
   assets/script/grc-assets.js et assets/script/network-config.js.

   Chaque risque référence un ou plusieurs actifs du registre
   grc-assets.js (assetIds), sur le même principe que la sélection
   parent/liens de Topology (project/settings.html,
   populateParentSelect() / topocfgLinkA/B) : on reconstruit les options
   du <select> à partir de l'autre registre à chaque ouverture du
   formulaire. Pas de contrainte d'intégrité forte -- si un actif
   référencé est supprimé entre-temps, il est simplement filtré à
   l'affichage (voir getRiskAssetNames), pas de blocage.

   Tout le texte affiché passe par grcT() (assets/script/grc-i18n.js) --
   STATUSES/STRATEGIES restent des clés internes stables, la traduction
   vient de grc.risques.status.* et grc.risques.strategy.* à l'affichage. */

const GRC_RISKS_KEY = "/grc/analyse-risques/registry";

const GRC_RISK_STATUSES = ["ouvert", "traite", "accepte"];

// Les 4 stratégies ISO 27005 / NIST GV.RM (voir grc/traitement-risques.html).
// "" (Non défini) reste sélectionnable : la stratégie peut ne pas encore
// être décidée pour un risque nouvellement créé.
const GRC_RISK_TREATMENT_STRATEGIES = ["", "evitement", "mitigation", "transfert", "acceptation"];

function grcRiskStrategyI18nKey(value) {
  return value ? "grc.risques.strategy." + value : "grc.risques.strategy.none";
}

function getGrcRisks() {
  try {
    const raw = vaultGetItem(GRC_RISKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveGrcRisks(risks) {
  vaultSetItem(GRC_RISKS_KEY, JSON.stringify(risks));
}

function addGrcRisk(risk) {
  const risks = getGrcRisks();
  const id = "risk-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  risks.push(Object.assign({ id }, risk));
  saveGrcRisks(risks);
  return id;
}

function updateGrcRisk(id, changes) {
  const risks = getGrcRisks();
  const idx = risks.findIndex((r) => r.id === id);
  if (idx === -1) return;
  risks[idx] = Object.assign({}, risks[idx], changes);
  saveGrcRisks(risks);
}

function removeGrcRisk(id) {
  saveGrcRisks(getGrcRisks().filter((r) => r.id !== id));
}

function grcRiskCriticality(risk) {
  return (risk.probability || 1) * (risk.impact || 1);
}

function grcRiskCriticalityLabel(score) {
  if (score >= 6) return { cls: "high", text: grcT("grc.risques.crit.high") };
  if (score >= 3) return { cls: "medium", text: grcT("grc.risques.crit.medium") };
  return { cls: "low", text: grcT("grc.risques.crit.low") };
}

function grcRiskStatusLabel(value) {
  return GRC_RISK_STATUSES.includes(value) ? grcT("grc.risques.status." + value) : value;
}

function grcRiskTreatmentStrategyLabel(value) {
  return grcT(grcRiskStrategyI18nKey(value));
}

// Résout assetIds en noms d'actifs réels -- filtre silencieusement les
// ids d'actifs supprimés depuis (pas de FK réelle en localStorage).
function getRiskAssetNames(risk) {
  const assets = typeof getGrcAssets === "function" ? getGrcAssets() : [];
  return (risk.assetIds || [])
    .map((id) => assets.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => a.name);
}

async function exportGrcRisksAsJson() {
  const data = await vaultMaybeEncryptForExport(getGrcRisks());
  exportJsonFile(data, "grc-risques.json");
}

async function importGrcRisksFromJson(file) {
  const raw = await readJsonFile(file);
  const risks = await vaultMaybeDecryptImport(raw);
  if (!Array.isArray(risks)) throw new Error(grcT("grc.risques.pdf.invalidImport"));
  saveGrcRisks(risks);
}

function resetGrcRisks() {
  vaultRemoveItem(GRC_RISKS_KEY);
}

/* Rapport HTML du registre des risques seul -- même mécanique que
   exportGrcAssetsAsPdf (grc-assets.js) : aucune librairie tierce, une
   page HTML autonome imprimée via window.print() dans un nouvel onglet. */
function grcRisksReportBody() {
  const risks = getGrcRisks();
  const generated = new Date().toLocaleString("fr-CA");
  let html = "<h1>" + grcT("grc.risques.pdf.title") + "</h1><p>" + grcT("grc.common.generatedOn") + " " + grcEscapeHtml(generated) + "</p>";

  if (risks.length === 0) {
    html += "<p>" + grcT("grc.risques.pdf.empty") + "</p>";
    return html;
  }

  html += "<table><thead><tr>" +
    "<th>" + grcT("grc.risques.pdf.colName") + "</th><th>" + grcT("grc.risques.pdf.colThreat") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colVulnerability") + "</th><th>" + grcT("grc.risques.pdf.colAssets") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colProbability") + "</th><th>" + grcT("grc.risques.pdf.colImpact") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colCrit") + "</th><th>" + grcT("grc.risques.pdf.colStatus") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colOwner") + "</th><th>" + grcT("grc.risques.pdf.colReviewDate") + "</th>" +
    "<th>" + grcT("grc.risques.pdf.colStrategy") + "</th><th>" + grcT("grc.risques.pdf.colTreatment") + "</th>" +
    "</tr></thead><tbody>";
  risks.forEach((risk) => {
    const crit = grcRiskCriticalityLabel(grcRiskCriticality(risk));
    html += "<tr>" +
      "<td>" + grcEscapeHtml(risk.name) + "</td>" +
      "<td>" + grcEscapeHtml(risk.threat || "") + "</td>" +
      "<td>" + grcEscapeHtml(risk.vulnerability || "") + "</td>" +
      "<td>" + grcEscapeHtml(getRiskAssetNames(risk).join(", ")) + "</td>" +
      "<td>" + grcEscapeHtml(risk.probability) + "</td><td>" + grcEscapeHtml(risk.impact) + "</td>" +
      "<td>" + grcEscapeHtml(crit.text) + "</td>" +
      "<td>" + grcEscapeHtml(grcRiskStatusLabel(risk.status)) + "</td>" +
      "<td>" + grcEscapeHtml(risk.owner || "") + "</td>" +
      "<td>" + grcEscapeHtml(risk.reviewDate || "") + "</td>" +
      "<td>" + grcEscapeHtml(grcRiskTreatmentStrategyLabel(risk.treatmentStrategy || "")) + "</td>" +
      "<td>" + grcEscapeHtml(risk.treatment || "") + "</td>" +
      "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

function exportGrcRisksAsPdf() {
  const body = grcRisksReportBody();
  const html =
    "<!doctype html><html><head><meta charset='utf-8'><title>" + grcT("grc.risques.pdf.title") + "</title><style>" +
    "body{font-family:system-ui,Arial,sans-serif;color:#111;max-width:1100px;margin:2rem auto;line-height:1.5;}" +
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

/* Construit et branche la section "Registre des risques" de
   grc/analyse-risques.html : matrice 3x3 (probabilité x impact) +
   bouton/formulaire (add/edit) + liste accordéon (add/edit/delete),
   même mécanique que initGrcAssetRegistry(). Respecte le coffre-fort. */
function initGrcRiskRegistry() {
  const container = document.getElementById("grcRiskRegistry");
  if (!container) return;
  if (vaultGateOr(container, initGrcRiskRegistry)) return;

  let editingId = null;
  let expandedId = null;

  container.innerHTML = `
    <div class="grc-risk-matrix" id="riskMatrix"></div>
    <div class="grc-registry-toolbar">
      <button type="button" class="grc-registry-add-btn" id="riskAddBtn">${grcT("grc.risques.form.addBtn")}</button>
      <button type="button" class="grc-registry-io-btn" id="riskExportBtn">${grcT("grc.common.btnExport")}</button>
      <button type="button" class="grc-registry-io-btn" id="riskExportPdfBtn">${grcT("grc.common.btnExportPdf")}</button>
      <button type="button" class="grc-registry-io-btn" id="riskImportBtn">${grcT("grc.common.btnImport")}</button>
      <input type="file" accept="application/json" id="riskImportFile" style="display:none">
    </div>
    <form class="grc-registry-form" id="riskForm" style="display:none">
      <h3 id="riskFormTitle">${grcT("grc.risques.form.title")}</h3>
      <label>${grcT("grc.risques.form.name")} <input type="text" id="riskName" required></label>
      <label>${grcT("grc.risques.form.threat")} <input type="text" id="riskThreat"></label>
      <label>${grcT("grc.risques.form.vulnerability")} <input type="text" id="riskVulnerability"></label>
      <label>${grcT("grc.risques.form.assets")}
        <select id="riskAssetIds" multiple size="4"></select>
      </label>
      <div class="grc-registry-form-row">
        <label>${grcT("grc.risques.form.probability")} <input type="number" id="riskProbability" min="1" max="3" value="1" required></label>
        <label>${grcT("grc.risques.form.impact")} <input type="number" id="riskImpact" min="1" max="3" value="1" required></label>
      </div>
      <label>${grcT("grc.risques.form.treatmentStrategy")}
        <select id="riskTreatmentStrategy">
          ${GRC_RISK_TREATMENT_STRATEGIES.map((s) => `<option value="${s}">${grcT(grcRiskStrategyI18nKey(s))}</option>`).join("")}
        </select>
      </label>
      <label>${grcT("grc.risques.form.treatment")} <textarea id="riskTreatment" rows="2" placeholder="${grcT("grc.risques.form.treatmentPlaceholder")}"></textarea></label>
      <label>${grcT("grc.risques.form.owner")} <input type="text" id="riskOwner"></label>
      <label>${grcT("grc.risques.form.reviewDate")} <input type="date" id="riskReviewDate"></label>
      <label>${grcT("grc.risques.form.status")}
        <select id="riskStatus">
          ${GRC_RISK_STATUSES.map((s) => `<option value="${s}">${grcT("grc.risques.status." + s)}</option>`).join("")}
        </select>
      </label>
      <div class="grc-registry-form-actions">
        <button type="submit" class="grc-registry-add-btn">${grcT("grc.common.btnSave")}</button>
        <button type="button" class="grc-registry-io-btn" id="riskCancelBtn">${grcT("grc.common.btnCancel")}</button>
      </div>
    </form>
    <ul class="grc-registry-list" id="riskList"></ul>
  `;

  function populateAssetIds(selected) {
    const select = container.querySelector("#riskAssetIds");
    select.innerHTML = "";
    const assets = typeof getGrcAssets === "function" ? getGrcAssets() : [];
    assets.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.name;
      opt.selected = (selected || []).includes(a.id);
      select.appendChild(opt);
    });
  }

  function showForm(risk) {
    editingId = risk ? risk.id : null;
    container.querySelector("#riskFormTitle").textContent = risk ? grcT("grc.risques.form.titleEdit") : grcT("grc.risques.form.title");
    container.querySelector("#riskName").value = risk ? risk.name : "";
    container.querySelector("#riskThreat").value = risk ? (risk.threat || "") : "";
    container.querySelector("#riskVulnerability").value = risk ? (risk.vulnerability || "") : "";
    container.querySelector("#riskProbability").value = risk ? risk.probability : 1;
    container.querySelector("#riskImpact").value = risk ? risk.impact : 1;
    container.querySelector("#riskTreatmentStrategy").value = risk ? (risk.treatmentStrategy || "") : "";
    container.querySelector("#riskTreatment").value = risk ? (risk.treatment || "") : "";
    container.querySelector("#riskOwner").value = risk ? (risk.owner || "") : "";
    container.querySelector("#riskReviewDate").value = risk ? (risk.reviewDate || "") : "";
    container.querySelector("#riskStatus").value = risk ? risk.status : GRC_RISK_STATUSES[0];
    populateAssetIds(risk ? risk.assetIds : []);
    container.querySelector("#riskForm").style.display = "";
    container.querySelector("#riskAddBtn").style.display = "none";
    container.querySelector("#riskFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideForm() {
    editingId = null;
    container.querySelector("#riskForm").reset();
    container.querySelector("#riskForm").style.display = "none";
    container.querySelector("#riskAddBtn").style.display = "";
  }

  container.querySelector("#riskAddBtn").addEventListener("click", () => showForm(null));
  container.querySelector("#riskCancelBtn").addEventListener("click", hideForm);
  container.querySelector("#riskExportBtn").addEventListener("click", exportGrcRisksAsJson);
  container.querySelector("#riskExportPdfBtn").addEventListener("click", exportGrcRisksAsPdf);
  container.querySelector("#riskImportBtn").addEventListener("click", () => container.querySelector("#riskImportFile").click());
  container.querySelector("#riskImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importGrcRisksFromJson(file)
      .then(renderGrcRiskRegistry)
      .catch((err) => alert(err.message || grcT("grc.common.invalidJsonFile")))
      .finally(() => { e.target.value = ""; });
  });

  container.querySelector("#riskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = container.querySelector("#riskName").value.trim();
    if (!name) return;
    const assetIds = Array.from(container.querySelector("#riskAssetIds").selectedOptions).map((o) => o.value);
    const data = {
      name,
      threat: container.querySelector("#riskThreat").value.trim(),
      vulnerability: container.querySelector("#riskVulnerability").value.trim(),
      assetIds,
      probability: Number(container.querySelector("#riskProbability").value) || 1,
      impact: Number(container.querySelector("#riskImpact").value) || 1,
      treatmentStrategy: container.querySelector("#riskTreatmentStrategy").value,
      treatment: container.querySelector("#riskTreatment").value.trim(),
      owner: container.querySelector("#riskOwner").value.trim(),
      reviewDate: container.querySelector("#riskReviewDate").value,
      status: container.querySelector("#riskStatus").value,
    };
    if (editingId) updateGrcRisk(editingId, data);
    else addGrcRisk(data);
    hideForm();
    renderGrcRiskRegistry();
  });

  function buildRiskItem(risk) {
    const crit = grcRiskCriticalityLabel(grcRiskCriticality(risk));
    const li = document.createElement("li");
    li.className = "grc-registry-item" + (risk.id === expandedId ? " open" : "");

    const header = document.createElement("div");
    header.className = "grc-registry-header";
    header.innerHTML =
      `<span>${risk.name}</span>` +
      `<span class="grc-crit-badge ${crit.cls}">${crit.text}</span>` +
      `<span class="chevron">▸</span>`;
    header.onclick = () => {
      expandedId = expandedId === risk.id ? null : risk.id;
      renderGrcRiskRegistry();
    };
    li.appendChild(header);

    if (risk.id === expandedId) {
      const body = document.createElement("div");
      body.className = "grc-registry-body";

      const assetNames = getRiskAssetNames(risk);
      const controllingControls = typeof getControlsForRisk === "function"
        ? getControlsForRisk(risk.id).map((c) => c.name)
        : [];

      body.innerHTML =
        (risk.threat ? `<p>${grcT("grc.risques.detail.threat").replace("{value}", risk.threat)}</p>` : "") +
        (risk.vulnerability ? `<p>${grcT("grc.risques.detail.vulnerability").replace("{value}", risk.vulnerability)}</p>` : "") +
        (assetNames.length ? `<p>${grcT("grc.risques.detail.assets").replace("{names}", assetNames.join(", "))}</p>` : "") +
        `<p>${grcT("grc.risques.detail.probImpact").replace("{p}", risk.probability).replace("{i}", risk.impact).replace("{status}", grcRiskStatusLabel(risk.status))}</p>` +
        (risk.owner ? `<p>${grcT("grc.risques.detail.owner").replace("{owner}", risk.owner)}</p>` : "") +
        (risk.reviewDate ? `<p>${grcT("grc.risques.detail.reviewDate").replace("{date}", risk.reviewDate)}</p>` : "") +
        (risk.treatmentStrategy ? `<p>${grcT("grc.risques.detail.strategy").replace("{value}", grcRiskTreatmentStrategyLabel(risk.treatmentStrategy))}</p>` : "") +
        (risk.treatment ? `<p>${grcT("grc.risques.detail.treatment").replace("{value}", risk.treatment)}</p>` : "") +
        (controllingControls.length ? `<p>${grcT("grc.risques.detail.treatedBy").replace("{names}", controllingControls.join(", "))}</p>` : "");

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "grc-registry-add-btn";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => showForm(risk);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "grc-registry-io-btn";
      deleteBtn.textContent = grcT("grc.common.btnDelete");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", risk.name))) return;
        removeGrcRisk(risk.id);
        if (expandedId === risk.id) expandedId = null;
        renderGrcRiskRegistry();
      };
      body.appendChild(deleteBtn);

      li.appendChild(body);
    }

    return li;
  }

  function renderMatrix() {
    const risks = getGrcRisks();
    const counts = {}; // "p-i" -> count
    risks.forEach((r) => {
      const key = (r.probability || 1) + "-" + (r.impact || 1);
      counts[key] = (counts[key] || 0) + 1;
    });

    let html = '<div class="grc-risk-matrix-grid">';
    html += '<div class="grc-risk-matrix-corner"></div>';
    for (let impact = 1; impact <= 3; impact++) {
      html += `<div class="grc-risk-matrix-axis">${grcT("grc.risques.matrix.impact").replace("{n}", impact)}</div>`;
    }
    for (let prob = 3; prob >= 1; prob--) {
      html += `<div class="grc-risk-matrix-axis">${grcT("grc.risques.matrix.probability").replace("{n}", prob)}</div>`;
      for (let impact = 1; impact <= 3; impact++) {
        const score = prob * impact;
        const cls = grcRiskCriticalityLabel(score).cls;
        const count = counts[prob + "-" + impact] || 0;
        html += `<div class="grc-risk-matrix-cell ${cls}">${count}</div>`;
      }
    }
    html += "</div>";
    container.querySelector("#riskMatrix").innerHTML = html;
  }

  window.renderGrcRiskRegistry = function () {
    renderMatrix();
    const list = container.querySelector("#riskList");
    list.innerHTML = "";
    getGrcRisks().forEach((risk) => list.appendChild(buildRiskItem(risk)));
  };

  renderGrcRiskRegistry();
}
