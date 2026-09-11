/* Journal d'incidents -- migré sur grc-registry-kit.js (grk*) pour le
   CRUD/registre/liste, PlanDurcissement-Securite.txt P2 (module 3/5).
   Le Mode « Incident Response » (incident.ir, grc-incidents-ir.js) est
   INCHANGÉ par cette migration -- il utilisait déjà les helpers grk*
   partagés (irFmtDateTime = grkFmtDateTime, irEscapeHtml = grkEscapeHtml,
   etc., voir son en-tête) et gère son propre panneau à onglets, comme
   grc-continuity-panel.js avant lui (même style : pas grkPanel, une
   barre d'onglets maison -- un incident IR porte trop de facettes
   interdépendantes -- timeline SVG, kanban, notes autosave -- pour le
   patron liste/formulaire de grkList).

   PAS de `schema:` grkEnsure pour l'incident lui-même (même choix que
   grc-risks.js pour treatmentPlan) : `incident.ir` est un sous-objet
   OPTIONNEL dont la forme/présence est gérée par grcIncidentEnsureIr()
   (déjà idempotent, déjà appelé à chaque lecture côté Mode IR) -- un
   schéma grkEnsure matérialiserait un `ir` pour CHAQUE incident, cassant
   la distinction "jamais passé en Mode IR" vs "actif avec ses valeurs
   par défaut". Les incidents passent donc tels quels dans la liste ;
   seuls les champs SOUMIS par le formulaire d'ajout/édition sont
   normalisés (enums sévérité/statut, dates -> ISO) via un schéma dédié
   plus restreint (GRC_INCIDENT_FORM_SCHEMA).

   Badge de sévérité en <span class="grc-crit-badge ...">, PAS via le
   cell-shape {badge:...} du kit (qui pose "grc-cont-crit", une classe
   propre à grc-continuity-panel.js sans style pour high/medium/low) --
   nœud DOM direct, même raison que grc-risks.js pour son badge "traité".

   detectedAt/respondedAt/resolvedAt : <input type="text"> au formulaire
   (le kit ne connaît que text/textarea/select/dur, cf grc-pentest.js
   pour startDate/endDate) plutôt que le natif type="datetime-local"
   d'avant cette migration -- normalisées en ISO complet au submit
   (grkToIso, schéma ci-dessous) puis affichées via grkFmtDateTime.
   Plus permissif à la saisie que le picker natif, mais désormais
   VALIDÉES (une saisie non parsable devient null, gérée comme "date
   absente" partout en aval) là où le picker natif garantissait juste un
   format, sans empêcher un import/programmatique de stocker n'importe
   quoi avant cette migration.

   Compat externe -- NE PAS renommer sans mettre à jour ces appelants :
     - assets/script/inline/incidents.js : initGrcIncidentRegistry().
     - assets/script/inline/settings.js (Sauvegarde complète / Reset) :
       getGrcIncidents, saveGrcIncidents, resetGrcIncidents.
     - assets/script/grc-continuity.js (datalist « Incident IR lié ») et
       assets/script/grc-suppliers-panel.js (onglet Incidents & suivi) :
       getGrcIncidents() -> [{ title, ... }].
     - assets/script/grc-registry-kit.js (_GRK_REGISTRIES.incidents).
     - assets/script/grc-incidents-ir.js (même domaine, chargé après) :
       getGrcIncidents/updateGrcIncident + tous les grcIncidentEnsureIr /
       grcIr... / GRC_IR_... ci-dessous, inchangés. */

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

/* ---------- store (kit) ---------------------------------------------- */

const _incidentStore = grkStore(GRC_INCIDENTS_KEY);

function getGrcIncidents() {
  return _incidentStore.get();
}

function saveGrcIncidents(incidents) {
  _incidentStore.save(incidents);
}

function resetGrcIncidents() {
  _incidentStore.remove();
}

function addGrcIncident(incident) {
  const incidents = getGrcIncidents();
  const id = grkId("incident");
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

// Temps de résolution lisible (détection -> résolution) -- délègue à
// grkSpanLabel (même formule 48h qu'avant cette migration, factorisée
// dans le kit) ; null si l'une des deux dates manque, invalide, ou si
// resolvedAt < detectedAt -- pas de contrainte, un incident encore
// ouvert n'a simplement pas cette info.
function grcIncidentResolutionDuration(incident) {
  return grkSpanLabel(incident.detectedAt, incident.resolvedAt);
}

function exportGrcIncidentsAsJson() {
  return grkExportJson(getGrcIncidents(), "grc-incidents-" + grkDateStamp() + ".json");
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

/* ================================================================== *
 *  Registre -- liste + formulaire (grkRegistry). Panneau : détail
 *  legacy OU Mode IR (grc-incidents-ir.js, renderIrPanel), selon
 *  incident.ir.mode. Monté par grc/incidents.html (#grcIncidentRegistry).
 * ================================================================== */

// Champs SOUMIS par le formulaire seulement (jamais l'incident stocké en
// entier -- voir la note d'en-tête sur `ir`). "iso" normalise les 3
// champs date (text libre -> ISO complet, ou null si non parsable).
const GRC_INCIDENT_FORM_SCHEMA = {
  title: { type: "string" },
  description: { type: "string" },
  severity: { type: "string", enum: GRC_INCIDENT_SEVERITIES, default: GRC_INCIDENT_SEVERITIES[0] },
  status: { type: "string", enum: GRC_INCIDENT_STATUSES.map((s) => s.value), default: GRC_INCIDENT_STATUSES[0].value },
  detectedAt: { type: "iso" },
  respondedAt: { type: "iso" },
  resolvedAt: { type: "iso" },
  owner: { type: "string" },
  postmortem: { type: "string" },
};

// Panneau déplié : Mode IR actif (renderIrPanel, grc-incidents-ir.js) OU
// détail legacy (description + dates + durée + propriétaire + post-mortem
// + bouton "Passer en Mode IR"). Edit/Delete viennent de grkRegistry lui-
// même (ajoutés après cfg.panel, cf grc-registry-kit.js buildItem) --
// donc jamais dupliqués ici, contrairement à l'implémentation avant
// cette migration.
function renderIncidentDetailPanel(body, incident) {
  const irActive = incident.ir && incident.ir.mode === "active";

  if (irActive && typeof renderIrPanel === "function") {
    renderIrPanel(body, incident);

    // Le panneau IR ne duplique pas le formulaire d'édition -- l'onglet
    // Synthèse y renvoie déjà ; seul "Revenir au journal" est propre à
    // cet emplacement (ressort du Mode IR, données conservées).
    const irActions = document.createElement("div");
    irActions.className = "grc-ir-actions";
    const exitBtn = document.createElement("button");
    exitBtn.type = "button";
    exitBtn.className = "grc-registry-io-btn grc-ir-toggle";
    exitBtn.textContent = grcT("grc.incidents.ir.exitMode");
    exitBtn.addEventListener("click", () => {
      grcIncidentExitIrMode(incident.id);
      renderGrcIncidentList();
    });
    irActions.appendChild(exitBtn);
    body.appendChild(irActions);
    return;
  }

  const duration = grcIncidentResolutionDuration(incident);
  const info = document.createElement("div");
  info.innerHTML =
    (incident.description ? `<p>${grkEscapeHtml(incident.description)}</p>` : "") +
    (incident.detectedAt ? `<p>${grcT("grc.incidents.detail.detectedAt").replace("{value}", grkEscapeHtml(grkFmtDateTime(incident.detectedAt)))}</p>` : "") +
    (incident.respondedAt ? `<p>${grcT("grc.incidents.detail.respondedAt").replace("{value}", grkEscapeHtml(grkFmtDateTime(incident.respondedAt)))}</p>` : "") +
    (incident.resolvedAt ? `<p>${grcT("grc.incidents.detail.resolvedAt").replace("{value}", grkEscapeHtml(grkFmtDateTime(incident.resolvedAt)))}</p>` : "") +
    (duration ? `<p>${grcT("grc.incidents.detail.duration").replace("{value}", duration)}</p>` : "") +
    (incident.owner ? `<p>${grcT("grc.incidents.detail.owner").replace("{value}", grkEscapeHtml(incident.owner))}</p>` : "") +
    (incident.postmortem ? `<p>${grcT("grc.incidents.detail.postmortem").replace("{value}", grkEscapeHtml(incident.postmortem))}</p>` : "");
  body.appendChild(info);

  const irBtn = document.createElement("button");
  irBtn.type = "button";
  irBtn.className = "grc-registry-add-btn grc-ir-toggle";
  irBtn.textContent = grcT("grc.incidents.ir.enterMode");
  irBtn.addEventListener("click", () => {
    grcIncidentEnterIrMode(incident.id);
    renderGrcIncidentList();
  });
  body.appendChild(irBtn);
}

function _incidentEnumOptions(values, i18nPrefix) {
  return values.map((v) => ({ value: v, label: i18nPrefix + v }));
}

function initGrcIncidentRegistry() {
  const init = grkRegistry({
    mount: "#grcIncidentRegistry",
    store: _incidentStore,
    idAttr: "data-incident-id",
    listGlobal: "renderGrcIncidentList",
    deepLink: true,
    i18n: {
      add: "grc.incidents.form.addBtn",
      titleAdd: "grc.incidents.form.title",
      titleEdit: "grc.incidents.form.titleEdit",
    },
    form: [
      { id: "title", label: "grc.incidents.form.title2", type: "text", required: true },
      { id: "description", label: "grc.incidents.form.description", type: "textarea" },
      { id: "severity", label: "grc.incidents.form.severity", type: "select",
        options: _incidentEnumOptions(GRC_INCIDENT_SEVERITIES, "grc.incidents.severity.") },
      { id: "status", label: "grc.incidents.form.status", type: "select",
        options: GRC_INCIDENT_STATUSES.map((s) => ({ value: s.value, label: "grc.incidents.status." + s.i18nKey })) },
      { id: "detectedAt", label: "grc.incidents.form.detectedAt", type: "text" },
      { id: "respondedAt", label: "grc.incidents.form.respondedAt", type: "text" },
      { id: "resolvedAt", label: "grc.incidents.form.resolvedAt", type: "text" },
      { id: "owner", label: "grc.incidents.form.owner", type: "text" },
      { id: "postmortem", label: "grc.incidents.form.postmortem", type: "textarea" },
    ],
    readForm: (i) => ({
      title: i.title, description: i.description,
      severity: i.severity, status: i.status,
      detectedAt: grkIsoToLocalInput(i.detectedAt),
      respondedAt: grkIsoToLocalInput(i.respondedAt),
      resolvedAt: grkIsoToLocalInput(i.resolvedAt),
      owner: i.owner, postmortem: i.postmortem,
    }),
    submit: (v, editingId) => {
      const fields = grkEnsure(v, GRC_INCIDENT_FORM_SCHEMA);
      fields.title = fields.title.trim();
      fields.description = fields.description.trim();
      fields.owner = fields.owner.trim();
      fields.postmortem = fields.postmortem.trim();
      if (editingId) updateGrcIncident(editingId, fields);
      else addGrcIncident(fields);
    },
    header: (i) => {
      const cells = [
        { text: (i.title || "") + " — " + grcIncidentStatusLabel(i.status) },
      ];
      if (i.ir && i.ir.mode === "active") {
        const b = document.createElement("span");
        b.className = "grc-ir-badge";
        b.textContent = grcT("grc.incidents.ir.badge");
        cells.push(b);
      }
      const sev = grcIncidentSeverityBadge(i.severity);
      const sevBadge = document.createElement("span");
      sevBadge.className = "grc-crit-badge " + sev.cls;
      sevBadge.textContent = sev.text;
      cells.push(sevBadge);
      return cells;
    },
    panel: renderIncidentDetailPanel,
    exportFn: exportGrcIncidentsAsJson,
    importFn: importGrcIncidentsFromJson,
    confirmName: (i) => i.title || "",
  });
  init();

  // id conservé pour compat -- ProjetTest/tests/test_ir_mode.py cible
  // #incidentList directement (IR.f, gate coffre).
  const list = document.querySelector("#grcIncidentRegistry .grc-registry-list");
  if (list) list.id = "incidentList";
}
