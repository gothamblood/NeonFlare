/* Journal d'incidents -- CRUD + localStorage, même pattern que
   assets/script/grc-risks.js et assets/script/grc-assets.js (TodoGRC.txt
   #3). Remplace/complète la checklist d'auto-évaluation de
   grc/incidents.html (inchangée, voir assets/script/grc-checklist.js)
   par un vrai journal : sévérité, timeline détection/réponse/résolution,
   statut, post-mortem. */

const GRC_INCIDENTS_KEY = "/grc/incidents/registry";

const GRC_INCIDENT_SEVERITIES = [
  { value: "mineur", label: "Mineur" },
  { value: "majeur", label: "Majeur" },
  { value: "critique", label: "Critique" },
];

const GRC_INCIDENT_STATUSES = [
  { value: "ouvert", label: "Ouvert" },
  { value: "en_cours", label: "En cours" },
  { value: "resolu", label: "Résolu" },
  { value: "clos", label: "Clos" },
];

function getGrcIncidents() {
  try {
    const raw = vaultGetItem(GRC_INCIDENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveGrcIncidents(incidents) {
  vaultSetItem(GRC_INCIDENTS_KEY, JSON.stringify(incidents));
}

function addGrcIncident(incident) {
  const incidents = getGrcIncidents();
  const id = "incident-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  incidents.push(Object.assign({ id }, incident));
  saveGrcIncidents(incidents);
  return id;
}

function updateGrcIncident(id, changes) {
  const incidents = getGrcIncidents();
  const idx = incidents.findIndex((i) => i.id === id);
  if (idx === -1) return;
  incidents[idx] = Object.assign({}, incidents[idx], changes);
  saveGrcIncidents(incidents);
}

function removeGrcIncident(id) {
  saveGrcIncidents(getGrcIncidents().filter((i) => i.id !== id));
}

// Réutilise le même code couleur 3 niveaux que grc-assets.js/grc-risks.js
// (.grc-crit-badge low/medium/high, déjà dans grc.css) -- mineur/majeur/
// critique se lit naturellement sur la même échelle Faible/Moyenne/Élevée.
function grcIncidentSeverityBadge(severity) {
  if (severity === "critique") return { cls: "high", text: "Critique" };
  if (severity === "majeur") return { cls: "medium", text: "Majeur" };
  return { cls: "low", text: "Mineur" };
}

function grcIncidentStatusLabel(value) {
  const found = GRC_INCIDENT_STATUSES.find((s) => s.value === value);
  return found ? found.label : value;
}

// Temps de résolution lisible (détection -> résolution), ou null si l'une
// des deux dates manque -- pas de contrainte, un incident encore ouvert
// n'a simplement pas cette info.
function grcIncidentResolutionDuration(incident) {
  if (!incident.detectedAt || !incident.resolvedAt) return null;
  const start = new Date(incident.detectedAt).getTime();
  const end = new Date(incident.resolvedAt).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return null;
  const hours = Math.round((end - start) / 36000) / 100;
  return hours < 48 ? hours + " h" : Math.round(hours / 24) + " j";
}

async function exportGrcIncidentsAsJson() {
  const data = await vaultMaybeEncryptForExport(getGrcIncidents());
  exportJsonFile(data, "grc-incidents.json");
}

async function importGrcIncidentsFromJson(file) {
  const raw = await readJsonFile(file);
  const incidents = await vaultMaybeDecryptImport(raw);
  if (!Array.isArray(incidents)) throw new Error("Format invalide : un tableau d'incidents est attendu.");
  saveGrcIncidents(incidents);
}

function resetGrcIncidents() {
  vaultRemoveItem(GRC_INCIDENTS_KEY);
}

/* Construit et branche la section "Journal des incidents" de
   grc/incidents.html : bouton/formulaire (add/edit) + liste accordéon
   (add/edit/delete), même mécanique que initGrcAssetRegistry() /
   initGrcRiskRegistry(). Respecte le coffre-fort via vaultGateOr(). */
function initGrcIncidentRegistry() {
  const container = document.getElementById("grcIncidentRegistry");
  if (!container) return;
  if (vaultGateOr(container, initGrcIncidentRegistry)) return;

  let editingId = null;
  let expandedId = null;

  container.innerHTML = `
    <div class="grc-registry-toolbar">
      <button type="button" class="grc-registry-add-btn" id="incidentAddBtn">+ Déclarer un incident</button>
      <button type="button" class="grc-registry-io-btn" id="incidentExportBtn">⬇ Exporter</button>
      <button type="button" class="grc-registry-io-btn" id="incidentImportBtn">⬆ Importer</button>
      <input type="file" accept="application/json" id="incidentImportFile" style="display:none">
    </div>
    <form class="grc-registry-form" id="incidentForm" style="display:none">
      <h3 id="incidentFormTitle">Déclarer un incident</h3>
      <label>Titre <input type="text" id="incidentTitle" required></label>
      <label>Description <textarea id="incidentDescription" rows="2"></textarea></label>
      <div class="grc-registry-form-row">
        <label>Sévérité
          <select id="incidentSeverity">
            ${GRC_INCIDENT_SEVERITIES.map((s) => `<option value="${s.value}">${s.label}</option>`).join("")}
          </select>
        </label>
        <label>Statut
          <select id="incidentStatus">
            ${GRC_INCIDENT_STATUSES.map((s) => `<option value="${s.value}">${s.label}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="grc-registry-form-row">
        <label>Détection <input type="datetime-local" id="incidentDetectedAt"></label>
        <label>Réponse <input type="datetime-local" id="incidentRespondedAt"></label>
        <label>Résolution <input type="datetime-local" id="incidentResolvedAt"></label>
      </div>
      <label>Propriétaire <input type="text" id="incidentOwner"></label>
      <label>Post-mortem / amélioration continue <textarea id="incidentPostmortem" rows="3"></textarea></label>
      <div class="grc-registry-form-actions">
        <button type="submit" class="grc-registry-add-btn">Enregistrer</button>
        <button type="button" class="grc-registry-io-btn" id="incidentCancelBtn">Annuler</button>
      </div>
    </form>
    <ul class="grc-registry-list" id="incidentList"></ul>
  `;

  function showForm(incident) {
    editingId = incident ? incident.id : null;
    container.querySelector("#incidentFormTitle").textContent = incident ? "Modifier l'incident" : "Déclarer un incident";
    container.querySelector("#incidentTitle").value = incident ? incident.title : "";
    container.querySelector("#incidentDescription").value = incident ? (incident.description || "") : "";
    container.querySelector("#incidentSeverity").value = incident ? incident.severity : GRC_INCIDENT_SEVERITIES[0].value;
    container.querySelector("#incidentStatus").value = incident ? incident.status : GRC_INCIDENT_STATUSES[0].value;
    container.querySelector("#incidentDetectedAt").value = incident ? (incident.detectedAt || "") : "";
    container.querySelector("#incidentRespondedAt").value = incident ? (incident.respondedAt || "") : "";
    container.querySelector("#incidentResolvedAt").value = incident ? (incident.resolvedAt || "") : "";
    container.querySelector("#incidentOwner").value = incident ? (incident.owner || "") : "";
    container.querySelector("#incidentPostmortem").value = incident ? (incident.postmortem || "") : "";
    container.querySelector("#incidentForm").style.display = "";
    container.querySelector("#incidentAddBtn").style.display = "none";
    container.querySelector("#incidentFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideForm() {
    editingId = null;
    container.querySelector("#incidentForm").reset();
    container.querySelector("#incidentForm").style.display = "none";
    container.querySelector("#incidentAddBtn").style.display = "";
  }

  container.querySelector("#incidentAddBtn").addEventListener("click", () => showForm(null));
  container.querySelector("#incidentCancelBtn").addEventListener("click", hideForm);
  container.querySelector("#incidentExportBtn").addEventListener("click", exportGrcIncidentsAsJson);
  container.querySelector("#incidentImportBtn").addEventListener("click", () => container.querySelector("#incidentImportFile").click());
  container.querySelector("#incidentImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importGrcIncidentsFromJson(file)
      .then(renderGrcIncidentList)
      .catch((err) => alert(err.message || "Fichier JSON invalide."))
      .finally(() => { e.target.value = ""; });
  });

  container.querySelector("#incidentForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = container.querySelector("#incidentTitle").value.trim();
    if (!title) return;
    const data = {
      title,
      description: container.querySelector("#incidentDescription").value.trim(),
      severity: container.querySelector("#incidentSeverity").value,
      status: container.querySelector("#incidentStatus").value,
      detectedAt: container.querySelector("#incidentDetectedAt").value,
      respondedAt: container.querySelector("#incidentRespondedAt").value,
      resolvedAt: container.querySelector("#incidentResolvedAt").value,
      owner: container.querySelector("#incidentOwner").value.trim(),
      postmortem: container.querySelector("#incidentPostmortem").value.trim(),
    };
    if (editingId) updateGrcIncident(editingId, data);
    else addGrcIncident(data);
    hideForm();
    renderGrcIncidentList();
  });

  function buildIncidentItem(incident) {
    const sev = grcIncidentSeverityBadge(incident.severity);
    const li = document.createElement("li");
    li.className = "grc-registry-item" + (incident.id === expandedId ? " open" : "");

    const header = document.createElement("div");
    header.className = "grc-registry-header";
    header.innerHTML =
      `<span>${incident.title} — ${grcIncidentStatusLabel(incident.status)}</span>` +
      `<span class="grc-crit-badge ${sev.cls}">${sev.text}</span>` +
      `<span class="chevron">▸</span>`;
    header.onclick = () => {
      expandedId = expandedId === incident.id ? null : incident.id;
      renderGrcIncidentList();
    };
    li.appendChild(header);

    if (incident.id === expandedId) {
      const body = document.createElement("div");
      body.className = "grc-registry-body";

      const duration = grcIncidentResolutionDuration(incident);

      body.innerHTML =
        (incident.description ? `<p>${incident.description}</p>` : "") +
        (incident.detectedAt ? `<p>Détection : ${incident.detectedAt.replace("T", " ")}</p>` : "") +
        (incident.respondedAt ? `<p>Réponse : ${incident.respondedAt.replace("T", " ")}</p>` : "") +
        (incident.resolvedAt ? `<p>Résolution : ${incident.resolvedAt.replace("T", " ")}</p>` : "") +
        (duration ? `<p>Temps de résolution : ${duration}</p>` : "") +
        (incident.owner ? `<p>Propriétaire : ${incident.owner}</p>` : "") +
        (incident.postmortem ? `<p>Post-mortem : ${incident.postmortem}</p>` : "");

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "grc-registry-add-btn";
      editBtn.textContent = "Modifier";
      editBtn.onclick = () => showForm(incident);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "grc-registry-io-btn";
      deleteBtn.textContent = "Supprimer";
      deleteBtn.onclick = () => {
        if (!confirm(`Supprimer "${incident.title}" ?`)) return;
        removeGrcIncident(incident.id);
        if (expandedId === incident.id) expandedId = null;
        renderGrcIncidentList();
      };
      body.appendChild(deleteBtn);

      li.appendChild(body);
    }

    return li;
  }

  window.renderGrcIncidentList = function () {
    const list = container.querySelector("#incidentList");
    list.innerHTML = "";
    getGrcIncidents().forEach((incident) => list.appendChild(buildIncidentItem(incident)));
  };

  renderGrcIncidentList();
}
