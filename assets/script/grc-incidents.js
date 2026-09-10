/* Journal d'incidents -- CRUD + localStorage, même pattern que
   assets/script/grc-risks.js et assets/script/grc-assets.js (TodoGRC.txt
   #3). Remplace/complète la checklist d'auto-évaluation de
   grc/incidents.html (inchangée, voir assets/script/grc-checklist.js)
   par un vrai journal : sévérité, timeline détection/réponse/résolution,
   statut, post-mortem.

   Tout le texte affiché passe par grcT() (assets/script/grc-i18n.js) --
   SEVERITIES/STATUSES restent des clés internes stables, la traduction
   vient de grc.incidents.severity.* et grc.incidents.status.* à
   l'affichage. */

const GRC_INCIDENTS_KEY = "/grc/incidents/registry";

const GRC_INCIDENT_SEVERITIES = ["mineur", "majeur", "critique"];

const GRC_INCIDENT_STATUSES = [
  { value: "ouvert", i18nKey: "ouvert" },
  { value: "en_cours", i18nKey: "enCours" },
  { value: "resolu", i18nKey: "resolu" },
  { value: "clos", i18nKey: "clos" },
];

/* ------------------------------------------------------------------ *
 *  Mode « Incident Response » -- voir spec/incident-response-mode/.
 *  Clés internes stables ; la traduction vient de grc.incidents.ir.*
 *  à l'affichage (même pattern que GRC_INCIDENT_STATUSES). Le Mode IR
 *  ÉTEND l'objet incident (champ optionnel `ir`), il ne crée aucun
 *  store : tout suit `grcIncidents` -> coffre, backup complet, reset.
 * ------------------------------------------------------------------ */
const GRC_IR_EVENT_KINDS = [
  "detection", "containment", "eradication", "recovery",
  "communication", "evidence", "decision", "note", "status-change",
];
const GRC_IR_IOC_TYPES = ["ip", "domain", "hash", "url", "file", "user", "host", "other"];
const GRC_IR_AFFECTED_TYPES = ["host", "account", "service", "data"];
const GRC_IR_TLP = ["CLEAR", "GREEN", "AMBER", "RED"];
const GRC_IR_HYP_STATUSES = ["open", "confirmed", "rejected"];
const GRC_IR_TASK_STATUSES = ["todo", "doing", "done"];
const GRC_IR_NIST_PHASES = ["detection", "containment", "eradication", "recovery", "lessons"];

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
  if (severity === "critique") return { cls: "high", text: grcT("grc.incidents.severity.critique") };
  if (severity === "majeur") return { cls: "medium", text: grcT("grc.incidents.severity.majeur") };
  return { cls: "low", text: grcT("grc.incidents.severity.mineur") };
}

function grcIncidentStatusLabel(value) {
  const found = GRC_INCIDENT_STATUSES.find((s) => s.value === value);
  return grcT("grc.incidents.status." + (found ? found.i18nKey : "ouvert"));
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
  return hours < 48
    ? grcT("grc.incidents.detail.durationHours").replace("{value}", hours)
    : grcT("grc.incidents.detail.durationDays").replace("{value}", Math.round(hours / 24));
}

async function exportGrcIncidentsAsJson() {
  const data = await vaultMaybeEncryptForExport(getGrcIncidents());
  exportJsonFile(data, "grc-incidents.json");
}

async function importGrcIncidentsFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  // Tableau : comportement historique -- remplace le registre.
  if (Array.isArray(decoded)) {
    saveGrcIncidents(decoded);
    return;
  }

  // Objet unique (D2) : un export IR = 1 incident. Garde de forme
  // (id + title), puis fusion par id -- remplace si présent, sinon
  // ajoute. Ne touche pas au reste du registre.
  const isIncidentShape =
    decoded && typeof decoded === "object" &&
    typeof decoded.id === "string" && typeof decoded.title === "string";
  if (!isIncidentShape) throw new Error(grcT("grc.incidents.invalidImport"));

  const incidents = getGrcIncidents();
  const idx = incidents.findIndex((i) => i.id === decoded.id);
  if (idx === -1) incidents.push(decoded);
  else incidents[idx] = decoded;
  saveGrcIncidents(incidents);
}

function resetGrcIncidents() {
  vaultRemoveItem(GRC_INCIDENTS_KEY);
}

/* ================================================================== *
 *  Modèle « Incident Response » -- helpers purs (aucun DOM).
 *  Toutes les écritures passent par getGrcIncidents()/updateGrcIncident()
 *  -> héritent du coffre. Voir spec/incident-response-mode/plan.md §3.
 * ================================================================== */

// Utilitaires factorisés dans grc-registry-kit.js (chargé avant ce
// fichier). Aliases rétro-compat -- les appelants gardent les noms
// historiques. Voir spec/grc-registry-upgrades/ (SK6).
const grcIrId = grkId;
const grcSlug = (s) => grkSlug(s, "incident");   // fallback "incident" (vs "item")
const grcIrToIso = grkToIso;
const grcIrAuthorName = grkAuthorName;
const grcIrSpanLabel = grkSpanLabel;

// Renvoie une COPIE de l'incident avec un sous-objet `ir` bien formé
// (schema 1). Ne sauve pas. Idempotent : préserve les données IR
// existantes, ne fait que garantir la forme (arrays, classification,
// enums). Un incident legacy repasse ici sans perte de champ visible.
function grcIncidentEnsureIr(incident) {
  const copy = Object.assign({}, incident);
  const src = copy.ir && typeof copy.ir === "object" ? copy.ir : null;
  const inv = src && src.investigation && typeof src.investigation === "object" ? src.investigation : {};
  const cls = src && src.classification && typeof src.classification === "object" ? src.classification : {};
  copy.ir = {
    mode: src && src.mode === "active" ? "active" : "journal",
    schema: 1,
    openedAt: src && src.openedAt ? src.openedAt : null,
    closedAt: src && src.closedAt ? src.closedAt : null,
    leadResponder: src && typeof src.leadResponder === "string" ? src.leadResponder : "",
    classification: {
      nistPhase: GRC_IR_NIST_PHASES.indexOf(cls.nistPhase) !== -1 ? cls.nistPhase : "detection",
      playbook: typeof cls.playbook === "string" ? cls.playbook : "",
      tlp: GRC_IR_TLP.indexOf(cls.tlp) !== -1 ? cls.tlp : "AMBER",
    },
    timeline: Array.isArray(src && src.timeline) ? src.timeline : [],
    investigation: {
      hypotheses: Array.isArray(inv.hypotheses) ? inv.hypotheses : [],
      iocs: Array.isArray(inv.iocs) ? inv.iocs : [],
      affected: Array.isArray(inv.affected) ? inv.affected : [],
      notes: typeof inv.notes === "string" ? inv.notes : "",
    },
    tasks: Array.isArray(src && src.tasks) ? src.tasks : [],
  };
  return copy;
}

// Mutation atomique d'un sous-objet ir : charge le registre, applique fn
// sur ir (forme garantie), sauve. Renvoie ce que fn renvoie (ou null si
// l'incident n'existe pas).
function grcIrMutate(id, fn) {
  const incidents = getGrcIncidents();
  const idx = incidents.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const ensured = grcIncidentEnsureIr(incidents[idx]);
  const out = fn(ensured.ir, ensured);
  updateGrcIncident(id, { ir: ensured.ir });
  return out === undefined ? null : out;
}

function grcIrSortTimeline(ir) {
  ir.timeline.sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

// Passe l'incident en Mode IR actif. Premier passage (pas de `ir`) :
// seed -- openedAt, leadResponder, et un événement timeline par date
// déjà saisie (detectedAt/respondedAt/resolvedAt). Ré-entrée (ir déjà
// là, ex. après exit) : bascule juste mode="active", AUCUN re-seed
// (garde anti-doublon, cf. critère d'acceptation).
function grcIncidentEnterIrMode(id) {
  const incidents = getGrcIncidents();
  const incident = incidents.find((i) => i.id === id);
  if (!incident) return null;

  const firstTime = !incident.ir || typeof incident.ir !== "object";
  const ensured = grcIncidentEnsureIr(incident);
  const ir = ensured.ir;

  if (firstTime) {
    ir.openedAt = new Date().toISOString();
    ir.closedAt = null;
    ir.leadResponder = incident.owner || grcIrAuthorName();
    ir.timeline = [
      { kind: "detection", ts: incident.detectedAt },
      { kind: "containment", ts: incident.respondedAt },
      { kind: "recovery", ts: incident.resolvedAt },
    ]
      .filter((s) => s.ts)
      .map((s) => ({
        id: grcIrId("ev"),
        ts: grcIrToIso(s.ts) || new Date().toISOString(),
        kind: s.kind,
        title: "",          // vide : le rendu (T4) affiche le libellé du `kind`
        detail: "",
        actor: "",
        source: "seed",
        pinned: false,
      }));
    grcIrSortTimeline(ir);
  }

  ir.mode = "active";
  updateGrcIncident(id, { ir });
  return ir;
}

// Revient au journal : mode="journal", données IR CONSERVÉES (masquées).
function grcIncidentExitIrMode(id) {
  const incidents = getGrcIncidents();
  const incident = incidents.find((i) => i.id === id);
  if (!incident || !incident.ir || typeof incident.ir !== "object") return null;
  const ir = Object.assign({}, incident.ir, { mode: "journal" });
  updateGrcIncident(id, { ir });
  return ir;
}

// --- Timeline -----------------------------------------------------------
function grcIrAddEvent(id, ev) {
  return grcIrMutate(id, (ir) => {
    const e = {
      id: grcIrId("ev"),
      ts: grcIrToIso(ev && ev.ts) || new Date().toISOString(),
      kind: ev && GRC_IR_EVENT_KINDS.indexOf(ev.kind) !== -1 ? ev.kind : "note",
      title: ev && typeof ev.title === "string" ? ev.title : "",
      detail: ev && typeof ev.detail === "string" ? ev.detail : "",
      actor: ev && typeof ev.actor === "string" ? ev.actor : "",
      source: ev && typeof ev.source === "string" ? ev.source : "",
      pinned: !!(ev && ev.pinned),
    };
    ir.timeline.push(e);
    grcIrSortTimeline(ir);
    return e.id;
  });
}

function grcIrUpdateEvent(id, evId, changes) {
  return grcIrMutate(id, (ir) => {
    const e = ir.timeline.find((x) => x.id === evId);
    if (!e) return false;
    const next = Object.assign({}, changes);
    if ("ts" in next) next.ts = grcIrToIso(next.ts) || e.ts;
    if ("kind" in next && GRC_IR_EVENT_KINDS.indexOf(next.kind) === -1) delete next.kind;
    Object.assign(e, next);
    grcIrSortTimeline(ir);
    return true;
  });
}

function grcIrRemoveEvent(id, evId) {
  return grcIrMutate(id, (ir) => {
    const before = ir.timeline.length;
    ir.timeline = ir.timeline.filter((x) => x.id !== evId);
    return ir.timeline.length < before;
  });
}

// --- IOC --------------------------------------------------------------
function grcIrAddIoc(id, ioc) {
  return grcIrMutate(id, (ir) => {
    const o = {
      id: grcIrId("ioc"),
      ts: new Date().toISOString(),
      type: ioc && GRC_IR_IOC_TYPES.indexOf(ioc.type) !== -1 ? ioc.type : "other",
      value: ioc && typeof ioc.value === "string" ? ioc.value : "",
      note: ioc && typeof ioc.note === "string" ? ioc.note : "",
    };
    ir.investigation.iocs.push(o);
    return o.id;
  });
}

function grcIrUpdateIoc(id, iocId, changes) {
  return grcIrMutate(id, (ir) => {
    const o = ir.investigation.iocs.find((x) => x.id === iocId);
    if (!o) return false;
    const next = Object.assign({}, changes);
    if ("type" in next && GRC_IR_IOC_TYPES.indexOf(next.type) === -1) delete next.type;
    Object.assign(o, next);
    return true;
  });
}

function grcIrRemoveIoc(id, iocId) {
  return grcIrMutate(id, (ir) => {
    const before = ir.investigation.iocs.length;
    ir.investigation.iocs = ir.investigation.iocs.filter((x) => x.id !== iocId);
    return ir.investigation.iocs.length < before;
  });
}

// Un IOC -> événement timeline kind:"evidence" (titre neutre, non
// traduit : type + valeur).
function grcIrIocToEvent(id, iocId) {
  return grcIrMutate(id, (ir) => {
    const o = ir.investigation.iocs.find((x) => x.id === iocId);
    if (!o) return null;
    const e = {
      id: grcIrId("ev"),
      ts: new Date().toISOString(),
      kind: "evidence",
      title: (o.type + " : " + o.value).trim(),
      detail: o.note || "",
      actor: "",
      source: "ioc",
      pinned: false,
    };
    ir.timeline.push(e);
    grcIrSortTimeline(ir);
    return e.id;
  });
}

// --- Hypothèses -----------------------------------------------------
function grcIrAddHypothesis(id, text) {
  return grcIrMutate(id, (ir) => {
    const h = {
      id: grcIrId("hyp"),
      ts: new Date().toISOString(),
      text: typeof text === "string" ? text : "",
      status: "open",
    };
    ir.investigation.hypotheses.push(h);
    return h.id;
  });
}

function grcIrUpdateHypothesis(id, hypId, changes) {
  return grcIrMutate(id, (ir) => {
    const h = ir.investigation.hypotheses.find((x) => x.id === hypId);
    if (!h) return false;
    const next = Object.assign({}, changes);
    if ("status" in next && GRC_IR_HYP_STATUSES.indexOf(next.status) === -1) delete next.status;
    Object.assign(h, next);
    return true;
  });
}

function grcIrRemoveHypothesis(id, hypId) {
  return grcIrMutate(id, (ir) => {
    const before = ir.investigation.hypotheses.length;
    ir.investigation.hypotheses = ir.investigation.hypotheses.filter((x) => x.id !== hypId);
    return ir.investigation.hypotheses.length < before;
  });
}

// --- Actifs touchés (pas dans la liste T1 explicite mais même patron ;
//     l'onglet Investigation T5 en a besoin) ------------------------
function grcIrAddAffected(id, aff) {
  return grcIrMutate(id, (ir) => {
    const a = {
      id: grcIrId("aff"),
      type: aff && GRC_IR_AFFECTED_TYPES.indexOf(aff.type) !== -1 ? aff.type : "host",
      ref: aff && typeof aff.ref === "string" ? aff.ref : "",
      note: aff && typeof aff.note === "string" ? aff.note : "",
    };
    ir.investigation.affected.push(a);
    return a.id;
  });
}

function grcIrUpdateAffected(id, affId, changes) {
  return grcIrMutate(id, (ir) => {
    const a = ir.investigation.affected.find((x) => x.id === affId);
    if (!a) return false;
    const next = Object.assign({}, changes);
    if ("type" in next && GRC_IR_AFFECTED_TYPES.indexOf(next.type) === -1) delete next.type;
    Object.assign(a, next);
    return true;
  });
}

function grcIrRemoveAffected(id, affId) {
  return grcIrMutate(id, (ir) => {
    const before = ir.investigation.affected.length;
    ir.investigation.affected = ir.investigation.affected.filter((x) => x.id !== affId);
    return ir.investigation.affected.length < before;
  });
}

// --- Notes d'investigation (autosave en T5) -----------------------
function grcIrSetNotes(id, text) {
  return grcIrMutate(id, (ir) => {
    ir.investigation.notes = typeof text === "string" ? text : "";
    return true;
  });
}

// --- Tâches IR (kanban) -----------------------------------------------
function grcIrAddTask(id, task) {
  return grcIrMutate(id, (ir) => {
    const t = {
      id: grcIrId("task"),
      ts: new Date().toISOString(),
      text: task && typeof task.text === "string" ? task.text : "",
      owner: task && typeof task.owner === "string" ? task.owner : "",
      status: "todo",
      doneTs: null,
    };
    ir.tasks.push(t);
    return t.id;
  });
}

function grcIrUpdateTask(id, taskId, changes) {
  return grcIrMutate(id, (ir) => {
    const t = ir.tasks.find((x) => x.id === taskId);
    if (!t) return false;
    const next = Object.assign({}, changes);
    if ("status" in next && GRC_IR_TASK_STATUSES.indexOf(next.status) === -1) delete next.status;
    Object.assign(t, next);
    if ("status" in next) t.doneTs = next.status === "done" ? new Date().toISOString() : null;
    return true;
  });
}

function grcIrRemoveTask(id, taskId) {
  return grcIrMutate(id, (ir) => {
    const before = ir.tasks.length;
    ir.tasks = ir.tasks.filter((x) => x.id !== taskId);
    return ir.tasks.length < before;
  });
}

// Durées clés d'un incident IR : s'appuie sur les événements timeline
// (première occurrence d'un `kind`), repli sur les dates de l'incident.
function grcIrDurations(incident) {
  const ir = incident && incident.ir && typeof incident.ir === "object" ? incident.ir : null;
  const tl = ir && Array.isArray(ir.timeline) ? ir.timeline : [];
  const firstOf = (kind) => {
    const hit = tl
      .filter((e) => e && e.kind === kind && e.ts)
      .sort((a, b) => new Date(a.ts) - new Date(b.ts))[0];
    return hit ? hit.ts : null;
  };
  const detection = firstOf("detection") || grcIrToIso(incident && incident.detectedAt);
  const containment = firstOf("containment") || grcIrToIso(incident && incident.respondedAt);
  const recovery = firstOf("recovery") || grcIrToIso(incident && incident.resolvedAt);
  return {
    detectionToContainment: grcIrSpanLabel(detection, containment),
    detectionToRecovery: grcIrSpanLabel(detection, recovery),
    containmentToRecovery: grcIrSpanLabel(containment, recovery),
  };
}

// --- Synthèse : classification + méta (édités dans l'onglet Synthèse, T3) --
function grcIrSetClassification(id, changes) {
  return grcIrMutate(id, (ir) => {
    const c = ir.classification;
    if ("nistPhase" in changes && GRC_IR_NIST_PHASES.indexOf(changes.nistPhase) !== -1) c.nistPhase = changes.nistPhase;
    if ("playbook" in changes && typeof changes.playbook === "string") c.playbook = changes.playbook;
    if ("tlp" in changes && GRC_IR_TLP.indexOf(changes.tlp) !== -1) c.tlp = changes.tlp;
    return true;
  });
}

function grcIrSetMeta(id, changes) {
  return grcIrMutate(id, (ir) => {
    if ("leadResponder" in changes && typeof changes.leadResponder === "string") ir.leadResponder = changes.leadResponder;
    if ("openedAt" in changes) ir.openedAt = grcIrToIso(changes.openedAt);
    if ("closedAt" in changes) ir.closedAt = grcIrToIso(changes.closedAt);
    return true;
  });
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
      <button type="button" class="grc-registry-add-btn" id="incidentAddBtn">${grcT("grc.incidents.form.addBtn")}</button>
      <button type="button" class="grc-registry-io-btn" id="incidentExportBtn">${grcT("grc.common.btnExport")}</button>
      <button type="button" class="grc-registry-io-btn" id="incidentImportBtn">${grcT("grc.common.btnImport")}</button>
      <input type="file" accept="application/json" id="incidentImportFile" style="display:none">
    </div>
    <form class="grc-registry-form" id="incidentForm" style="display:none">
      <h3 id="incidentFormTitle">${grcT("grc.incidents.form.title")}</h3>
      <label>${grcT("grc.incidents.form.title2")} <input type="text" id="incidentTitle" required></label>
      <label>${grcT("grc.incidents.form.description")} <textarea id="incidentDescription" rows="2"></textarea></label>
      <div class="grc-registry-form-row">
        <label>${grcT("grc.incidents.form.severity")}
          <select id="incidentSeverity">
            ${GRC_INCIDENT_SEVERITIES.map((s) => `<option value="${s}">${grcT("grc.incidents.severity." + s)}</option>`).join("")}
          </select>
        </label>
        <label>${grcT("grc.incidents.form.status")}
          <select id="incidentStatus">
            ${GRC_INCIDENT_STATUSES.map((s) => `<option value="${s.value}">${grcT("grc.incidents.status." + s.i18nKey)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="grc-registry-form-row">
        <label>${grcT("grc.incidents.form.detectedAt")} <input type="datetime-local" id="incidentDetectedAt"></label>
        <label>${grcT("grc.incidents.form.respondedAt")} <input type="datetime-local" id="incidentRespondedAt"></label>
        <label>${grcT("grc.incidents.form.resolvedAt")} <input type="datetime-local" id="incidentResolvedAt"></label>
      </div>
      <label>${grcT("grc.incidents.form.owner")} <input type="text" id="incidentOwner"></label>
      <label>${grcT("grc.incidents.form.postmortem")} <textarea id="incidentPostmortem" rows="3"></textarea></label>
      <div class="grc-registry-form-actions">
        <button type="submit" class="grc-registry-add-btn">${grcT("grc.common.btnSave")}</button>
        <button type="button" class="grc-registry-io-btn" id="incidentCancelBtn">${grcT("grc.common.btnCancel")}</button>
      </div>
    </form>
    <ul class="grc-registry-list" id="incidentList"></ul>
  `;

  function showForm(incident) {
    editingId = incident ? incident.id : null;
    container.querySelector("#incidentFormTitle").textContent = incident ? grcT("grc.incidents.form.titleEdit") : grcT("grc.incidents.form.title");
    container.querySelector("#incidentTitle").value = incident ? incident.title : "";
    container.querySelector("#incidentDescription").value = incident ? (incident.description || "") : "";
    container.querySelector("#incidentSeverity").value = incident ? incident.severity : GRC_INCIDENT_SEVERITIES[0];
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
      .catch((err) => alert(err.message || grcT("grc.common.invalidJsonFile")))
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

    const irActive = incident.ir && incident.ir.mode === "active";

    const header = document.createElement("div");
    header.className = "grc-registry-header";
    header.innerHTML =
      `<span>${grkEscapeHtml(incident.title)} — ${grcIncidentStatusLabel(incident.status)}</span>` +
      (irActive ? `<span class="grc-ir-badge">${grcT("grc.incidents.ir.badge")}</span>` : "") +
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

      // Mode IR actif : le panneau IR remplace le corps legacy (D1 :
      // toggle "Revenir au journal" dans le corps, badge dans l'en-tête).
      if (irActive && typeof renderIrPanel === "function") {
        renderIrPanel(body, incident);

        // Le panneau IR ne duplique pas le formulaire d'édition -- il y
        // renvoie (spec §4.2). "Modifier" ouvre le form existant ;
        // "Revenir au journal" ressort du Mode IR (données conservées).
        const irActions = document.createElement("div");
        irActions.className = "grc-ir-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "grc-registry-add-btn grc-ir-toggle";
        editBtn.textContent = grcT("grc.common.btnEdit");
        editBtn.onclick = () => showForm(incident);
        irActions.appendChild(editBtn);

        const exitBtn = document.createElement("button");
        exitBtn.type = "button";
        exitBtn.className = "grc-registry-io-btn grc-ir-toggle";
        exitBtn.textContent = grcT("grc.incidents.ir.exitMode");
        exitBtn.onclick = () => {
          grcIncidentExitIrMode(incident.id);
          renderGrcIncidentList();
        };
        irActions.appendChild(exitBtn);

        body.appendChild(irActions);
        li.appendChild(body);
        return li;
      }

      const duration = grcIncidentResolutionDuration(incident);

      body.innerHTML =
        (incident.description ? `<p>${grkEscapeHtml(incident.description)}</p>` : "") +
        (incident.detectedAt ? `<p>${grcT("grc.incidents.detail.detectedAt").replace("{value}", grkEscapeHtml(incident.detectedAt.replace("T", " ")))}</p>` : "") +
        (incident.respondedAt ? `<p>${grcT("grc.incidents.detail.respondedAt").replace("{value}", grkEscapeHtml(incident.respondedAt.replace("T", " ")))}</p>` : "") +
        (incident.resolvedAt ? `<p>${grcT("grc.incidents.detail.resolvedAt").replace("{value}", grkEscapeHtml(incident.resolvedAt.replace("T", " ")))}</p>` : "") +
        (duration ? `<p>${grcT("grc.incidents.detail.duration").replace("{value}", duration)}</p>` : "") +
        (incident.owner ? `<p>${grcT("grc.incidents.detail.owner").replace("{value}", grkEscapeHtml(incident.owner))}</p>` : "") +
        (incident.postmortem ? `<p>${grcT("grc.incidents.detail.postmortem").replace("{value}", grkEscapeHtml(incident.postmortem))}</p>` : "");

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "grc-registry-add-btn";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => showForm(incident);
      body.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "grc-registry-io-btn";
      deleteBtn.textContent = grcT("grc.common.btnDelete");
      deleteBtn.onclick = () => {
        if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", incident.title))) return;
        removeGrcIncident(incident.id);
        if (expandedId === incident.id) expandedId = null;
        renderGrcIncidentList();
      };
      body.appendChild(deleteBtn);

      // Bascule vers le Mode IR (D1 : dans le corps déplié).
      const irBtn = document.createElement("button");
      irBtn.type = "button";
      irBtn.className = "grc-registry-add-btn grc-ir-toggle";
      irBtn.textContent = grcT("grc.incidents.ir.enterMode");
      irBtn.onclick = () => {
        grcIncidentEnterIrMode(incident.id);
        renderGrcIncidentList();
      };
      body.appendChild(irBtn);

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
