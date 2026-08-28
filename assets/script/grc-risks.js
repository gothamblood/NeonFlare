/* Registre de risques -- CRUD + localStorage, même pattern que
   assets/script/grc-assets.js et assets/script/network-config.js.

   Chaque risque référence un ou plusieurs actifs du registre
   grc-assets.js (assetIds), sur le même principe que la sélection
   parent/liens de Topology (project/settings.html,
   populateParentSelect() / topocfgLinkA/B) : on reconstruit les options
   du <select> à partir de l'autre registre à chaque ouverture du
   formulaire. Pas de contrainte d'intégrité forte -- si un actif
   référencé est supprimé entre-temps, il est simplement filtré à
   l'affichage (voir getRiskAssetNames), pas de blocage. */

const GRC_RISKS_KEY = "/grc/analyse-risques/registry";

const GRC_RISK_STATUSES = [
  { value: "ouvert", label: "Ouvert" },
  { value: "traite", label: "Traité" },
  { value: "accepte", label: "Accepté" },
];

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
  if (score >= 6) return { cls: "high", text: "Élevée" };
  if (score >= 3) return { cls: "medium", text: "Moyenne" };
  return { cls: "low", text: "Faible" };
}

function grcRiskStatusLabel(value) {
  const found = GRC_RISK_STATUSES.find((s) => s.value === value);
  return found ? found.label : value;
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
  if (!Array.isArray(risks)) throw new Error("Format invalide : un tableau de risques est attendu.");
  saveGrcRisks(risks);
}

function resetGrcRisks() {
  vaultRemoveItem(GRC_RISKS_KEY);
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
      <button type="button" class="grc-registry-add-btn" id="riskAddBtn">+ Ajouter un risque</button>
      <button type="button" class="grc-registry-io-btn" id="riskExportBtn">⬇ Exporter</button>
      <button type="button" class="grc-registry-io-btn" id="riskImportBtn">⬆ Importer</button>
      <input type="file" accept="application/json" id="riskImportFile" style="display:none">
    </div>
    <form class="grc-registry-form" id="riskForm" style="display:none">
      <h3 id="riskFormTitle">Ajouter un risque</h3>
      <label>Nom du risque <input type="text" id="riskName" required></label>
      <label>Menace <input type="text" id="riskThreat"></label>
      <label>Vulnérabilité <input type="text" id="riskVulnerability"></label>
      <label>Actifs concernés
        <select id="riskAssetIds" multiple size="4"></select>
      </label>
      <div class="grc-registry-form-row">
        <label>Probabilité (1-3) <input type="number" id="riskProbability" min="1" max="3" value="1" required></label>
        <label>Impact (1-3) <input type="number" id="riskImpact" min="1" max="3" value="1" required></label>
      </div>
      <label>Plan de traitement <textarea id="riskTreatment" rows="2"></textarea></label>
      <label>Propriétaire <input type="text" id="riskOwner"></label>
      <label>Date de revue <input type="date" id="riskReviewDate"></label>
      <label>Statut
        <select id="riskStatus">
          ${GRC_RISK_STATUSES.map((s) => `<option value="${s.value}">${s.label}</option>`).join("")}
        </select>
      </label>
      <div class="grc-registry-form-actions">
        <button type="submit" class="grc-registry-add-btn">Enregistrer</button>
        <button type="button" class="grc-registry-io-btn" id="riskCancelBtn">Annuler</button>
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
    container.querySelector("#riskFormTitle").textContent = risk ? "Modifier le risque" : "Ajouter un risque";
    container.querySelector("#riskName").value = risk ? risk.name : "";
    container.querySelector("#riskThreat").value = risk ? (risk.threat || "") : "";
    container.querySelector("#riskVulnerability").value = risk ? (risk.vulnerability || "") : "";
    container.querySelector("#riskProbability").value = risk ? risk.probability : 1;
    container.querySelector("#riskImpact").value = risk ? risk.impact : 1;
    container.querySelector("#riskTreatment").value = risk ? (risk.treatment || "") : "";
    container.querySelector("#riskOwner").value = risk ? (risk.owner || "") : "";
    container.querySelector("#riskReviewDate").value = risk ? (risk.reviewDate || "") : "";
    container.querySelector("#riskStatus").value = risk ? risk.status : GRC_RISK_STATUSES[0].value;
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
  container.querySelector("#riskImportBtn").addEventListener("click", () => container.querySelector("#riskImportFile").click());
  container.querySelector("#riskImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importGrcRisksFromJson(file)
      .then(renderGrcRiskRegistry)
      .catch((err) => alert(err.message || "Fichier JSON invalide."))
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

      body.innerHTML =
        (risk.threat ? `<p>Menace : ${risk.threat}</p>` : "") +
        (risk.vulnerability ? `<p>Vulnérabilité : ${risk.vulnerability}</p>` : "") +
        (assetNames.length ? `<p>Actifs concernés : ${assetNames.join(", ")}</p>` : "") +
        `<p>Probabilité ${risk.probability} × Impact ${risk.impact} — Statut : ${grcRiskStatusLabel(risk.status)}</p>` +
        (risk.owner ? `<p>Propriétaire : ${risk.owner}</p>` : "") +
        (risk.reviewDate ? `<p>Prochaine revue : ${risk.reviewDate}</p>` : "") +
        (risk.treatment ? `<p>Traitement : ${risk.treatment}</p>` : "");

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "grc-registry-add-btn";
      editBtn.textContent = "Modifier";
      editBtn.onclick = () => showForm(risk);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "grc-registry-io-btn";
      deleteBtn.textContent = "Supprimer";
      deleteBtn.onclick = () => {
        if (!confirm(`Supprimer "${risk.name}" ?`)) return;
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
      html += `<div class="grc-risk-matrix-axis">Impact ${impact}</div>`;
    }
    for (let prob = 3; prob >= 1; prob--) {
      html += `<div class="grc-risk-matrix-axis">Probabilité ${prob}</div>`;
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
