/* Registre PCA/PRA (continuité d'activité) -- store + helpers de modèle
   + registre liste/formulaire + exports. Voir spec/business-continuity/.

   Nouveau store /grc/continuity/registry (rien à étendre côté
   grc/continuite.html, contrairement au Mode IR). Même patron de
   registre que grc-risks.js / grc-assets.js / grc-incidents.js.

   Tout le texte affiché passe par grcT() (assets/script/grc-i18n.js) --
   les enums GRC_CONT_* restent des clés internes stables, traduites
   à l'affichage via grc.continuite.pca.*.

   État d'avancement (spec/business-continuity/tasks.md) :
   - T1 : util + store + modèle.            <-- ICI
   - T2 : registre liste + formulaire + encart de synthèse.
   - T3 : panneau à onglets + Synthèse/BIA (grc-continuity-panel.js).
   - T4..T7 : dépendances / redondance / PRA / tests / exports.
   - T8 : plomberie settings.  T9 : CSS.  T10 : lien IR.  T11 : tests.

   Note d'impl (plan §3) : les 4 utilitaires grcSlug / grcIrToIso /
   grcIrSpanLabel / irEscapeHtml de grc-incidents*.js sont ici DUPLIQUÉS
   en cont* (repli assumé), pour ne pas toucher aux fichiers du Mode IR. */

const GRC_CONTINUITY_KEY = "/grc/continuity/registry";

const GRC_CONT_CRITICALITY = ["vital", "critique", "important", "differable"];
const GRC_CONT_DEP_TYPES = ["asset", "service", "supplier", "site", "people"];
const GRC_CONT_REDUNDANCY_KINDS = ["backup", "ha", "failover-site", "cold-spare", "manual-workaround"];
const GRC_CONT_TEST_KINDS = ["tabletop", "walkthrough", "failover", "full"];
const GRC_CONT_TEST_RESULTS = ["pass", "partial", "fail"];
const GRC_CONT_DURATION_UNITS = ["min", "h", "j"];
const GRC_CONT_DEFAULT_CADENCE = 12;
// BIA dans le temps (grc-normes N2, décision E2) : horizons par défaut, en
// minutes ; niveaux d'impact 1 (négligeable) à 5 (catastrophique).
const GRC_CONT_BIA_HORIZONS = [240, 1440, 4320, 10080, 43200];
const GRC_CONT_IMPACT_KINDS = ["financier", "operationnel", "reputation", "legal"];
const GRC_CONT_RES_KINDS = ["role", "asset", "supplier", "other"];
// Niveau à partir duquel l'impact est jugé inacceptable (DMIA suggérée).
const GRC_CONT_UNACCEPTABLE = 4;

const _GRC_CONT_UNIT_MIN = { min: 1, h: 60, j: 1440 };

/* ---------- utilitaires (dupliqués de grc-incidents*.js) ------------- */

// Utils factorisés dans grc-registry-kit.js (chargé avant ce fichier,
// cf. grc/continuite.html + project/settings.html). Aliases rétro-compat
// -- les appelants gardent les noms historiques. spec/grc-registry-upgrades/ (SK7).
const contId = grkId;
const contSlug = (s) => grkSlug(s, "plan");   // fallback "plan" (vs "item")
const contToIso = grkToIso;
const contSpanLabel = grkSpanLabel;
const contEscapeHtml = grkEscapeHtml;
const contAddMonths = grkAddMonths;
const _contNumOrNull = grkNumOrNull;
const contPartsToMinutes = grkPartsToMinutes;
const contMinutesToParts = grkMinutesToParts;
const contFmtDuration = grkFmtDuration;   // + i18n EN (j -> d) au passage

/* ---------- store ------------------------------------------------------ */

function getGrcContinuity() {
  try {
    const raw = vaultGetItem(GRC_CONTINUITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveGrcContinuity(plans) {
  vaultSetItem(GRC_CONTINUITY_KEY, JSON.stringify(plans));
}

function addGrcContinuityPlan(plan) {
  const plans = getGrcContinuity();
  const id = "plan-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const shaped = grcContinuityEnsureShape(plan || {});
  shaped.id = id;
  plans.push(shaped);
  saveGrcContinuity(plans);
  return id;
}

function updateGrcContinuityPlan(id, changes) {
  const plans = getGrcContinuity();
  const idx = plans.findIndex((p) => p.id === id);
  if (idx === -1) return;
  plans[idx] = Object.assign({}, plans[idx], changes);
  saveGrcContinuity(plans);
}

function removeGrcContinuityPlan(id) {
  saveGrcContinuity(getGrcContinuity().filter((p) => p.id !== id));
}

function resetGrcContinuity() {
  vaultRemoveItem(GRC_CONTINUITY_KEY);
}

/* ---------- modèle : forme garantie ---------------------------------- */

// Renvoie une COPIE bien formée (schema 2 -- spec/grc-restructure/ Q4 :
// + bia.maoMin/mbco/mbcoPct, spoc, ccd[], dependencies[].spof ; un plan
// schema 1 est complété sans perte). Ne sauve pas. Idempotent :
// préserve les données existantes, garantit arrays / bia / review / enums.
function grcContinuityEnsureShape(plan) {
  const src = plan && typeof plan === "object" ? plan : {};
  const bia = src.bia && typeof src.bia === "object" ? src.bia : {};
  const rev = src.review && typeof src.review === "object" ? src.review : {};
  const cadence = Number.isFinite(rev.cadenceMonths) && rev.cadenceMonths > 0
    ? Math.round(rev.cadenceMonths) : GRC_CONT_DEFAULT_CADENCE;
  return {
    id: typeof src.id === "string" ? src.id : "",
    schema: 2,
    service: typeof src.service === "string" ? src.service : "",
    description: typeof src.description === "string" ? src.description : "",
    owner: typeof src.owner === "string" ? src.owner : "",
    criticality: GRC_CONT_CRITICALITY.indexOf(src.criticality) !== -1 ? src.criticality : "important",
    bia: {
      mtdMin: _contNumOrNull(bia.mtdMin),
      rtoMin: _contNumOrNull(bia.rtoMin),
      rpoMin: _contNumOrNull(bia.rpoMin),
      maoMin: _contNumOrNull(bia.maoMin),
      mbco: typeof bia.mbco === "string" ? bia.mbco : "",
      mbcoPct: grkDecimalOrNull(bia.mbcoPct, 0, 100),
      impacts: typeof bia.impacts === "string" ? bia.impacts : "",
      peakPeriods: typeof bia.peakPeriods === "string" ? bia.peakPeriods : "",
      // N2 : impacts par horizon et ressources nécessaires dans le temps.
      timeline: Array.isArray(bia.timeline) ? bia.timeline.filter((t) => t && typeof t === "object").map((t) => ({
        id: typeof t.id === "string" ? t.id : contId("hz"),
        horizonMin: _contNumOrNull(t.horizonMin),
        financier: _contLevel(t.financier), operationnel: _contLevel(t.operationnel),
        reputation: _contLevel(t.reputation), legal: _contLevel(t.legal),
        level: _contLevel(t.level) || Math.max(_contLevel(t.financier), _contLevel(t.operationnel), _contLevel(t.reputation), _contLevel(t.legal)),
        note: typeof t.note === "string" ? t.note : "",
      })).sort((a, b) => (a.horizonMin || 0) - (b.horizonMin || 0)) : [],
      resources: Array.isArray(bia.resources) ? bia.resources.filter((r) => r && typeof r === "object").map((r) => ({
        id: typeof r.id === "string" ? r.id : contId("res"),
        kind: GRC_CONT_RES_KINDS.indexOf(r.kind) !== -1 ? r.kind : "other",
        roleId: typeof r.roleId === "string" ? r.roleId : "",
        assetId: typeof r.assetId === "string" ? r.assetId : "",
        supplierId: typeof r.supplierId === "string" ? r.supplierId : "",
        label: typeof r.label === "string" ? r.label : "",
        quantity: typeof r.quantity === "string" ? r.quantity : "",
        horizonMin: _contNumOrNull(r.horizonMin),
      })) : [],
    },
    // Chaîne GRC (chaine.md CH2) : processus de la cartographie couvert.
    processId: typeof src.processId === "string" ? src.processId : "",
    dependencies: Array.isArray(src.dependencies)
      ? src.dependencies.map((d) => Object.assign({}, d, { spof: !!(d && d.spof) }))
      : [],
    spoc: typeof src.spoc === "string" ? src.spoc : "",
    ccd: Array.isArray(src.ccd)
      ? src.ccd.filter((m) => m && typeof m === "object").map((m) => ({
        id: typeof m.id === "string" ? m.id : contId("ccd"),
        role: typeof m.role === "string" ? m.role : "",
        name: typeof m.name === "string" ? m.name : "",
        contact: typeof m.contact === "string" ? m.contact : "",
      }))
      : [],
    redundancy: Array.isArray(src.redundancy) ? src.redundancy : [],
    drp: Array.isArray(src.drp)
      ? src.drp.slice().sort((a, b) => (a.order || 0) - (b.order || 0))
      : [],
    tests: Array.isArray(src.tests) ? src.tests : [],
    review: {
      lastReviewedAt: rev.lastReviewedAt || null,
      nextDueAt: rev.nextDueAt || (rev.lastReviewedAt ? contAddMonths(rev.lastReviewedAt, cadence) : null),
      cadenceMonths: cadence,
    },
    linkedIncident: typeof src.linkedIncident === "string" ? src.linkedIncident : "",
  };
}

// Mutation atomique : charge, applique fn sur une copie bien formée
// (id préservé), sauve. Renvoie ce que fn renvoie (null si absent).
function _contLevel(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 0;
}

// DMIA suggérée (N2) : premier horizon où un impact devient inacceptable.
function grcContSuggestedMtd(plan) {
  const tl = plan && plan.bia && Array.isArray(plan.bia.timeline) ? plan.bia.timeline : [];
  const hit = tl.filter((t) => t.horizonMin != null && t.level >= GRC_CONT_UNACCEPTABLE)
    .sort((a, b) => a.horizonMin - b.horizonMin)[0];
  return hit ? hit.horizonMin : null;
}

function grcContSetTimeline(id, rows) {
  return contMutate(id, (p) => {
    p.bia.timeline = (Array.isArray(rows) ? rows : []).map((t) => Object.assign({ id: t.id || contId("hz") }, t));
    return true;
  });
}

function grcContSetResources(id, rows) {
  return contMutate(id, (p) => {
    p.bia.resources = (Array.isArray(rows) ? rows : []).map((r) => Object.assign({ id: r.id || contId("res") }, r));
    return true;
  });
}

function contMutate(id, fn) {
  const plans = getGrcContinuity();
  const idx = plans.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const ensured = grcContinuityEnsureShape(plans[idx]);
  ensured.id = plans[idx].id;
  const out = fn(ensured);
  plans[idx] = ensured;
  saveGrcContinuity(plans);
  return out === undefined ? null : out;
}

/* ---------- sous-listes : dépendances ------------------------------- */

function grcContAddDependency(id, dep) {
  return contMutate(id, (p) => {
    const d = {
      id: contId("dep"),
      type: dep && GRC_CONT_DEP_TYPES.indexOf(dep.type) !== -1 ? dep.type : "asset",
      ref: dep && typeof dep.ref === "string" ? dep.ref : "",
      // Lien réel vers l'actif / le fournisseur (chaine.md CH2).
      targetId: dep && typeof dep.targetId === "string" ? dep.targetId : "",
      note: dep && typeof dep.note === "string" ? dep.note : "",
      spof: !!(dep && dep.spof),
    };
    p.dependencies.push(d);
    return d.id;
  });
}

function grcContUpdateDependency(id, depId, changes) {
  return contMutate(id, (p) => {
    const d = p.dependencies.find((x) => x.id === depId);
    if (!d) return false;
    const n = Object.assign({}, changes);
    if ("type" in n && GRC_CONT_DEP_TYPES.indexOf(n.type) === -1) delete n.type;
    if ("spof" in n) n.spof = !!n.spof;
    Object.assign(d, n);
    return true;
  });
}

function grcContRemoveDependency(id, depId) {
  return contMutate(id, (p) => {
    const before = p.dependencies.length;
    p.dependencies = p.dependencies.filter((x) => x.id !== depId);
    return p.dependencies.length < before;
  });
}

/* ---------- sous-liste : cellule de crise décisionnelle (CCD) ------- */

function grcContAddCcd(id, member) {
  return contMutate(id, (p) => {
    const m = {
      id: contId("ccd"),
      role: member && typeof member.role === "string" ? member.role.trim() : "",
      name: member && typeof member.name === "string" ? member.name.trim() : "",
      contact: member && typeof member.contact === "string" ? member.contact.trim() : "",
    };
    p.ccd.push(m);
    return m.id;
  });
}

function grcContUpdateCcd(id, memberId, changes) {
  return contMutate(id, (p) => {
    const m = p.ccd.find((x) => x.id === memberId);
    if (!m) return false;
    ["role", "name", "contact"].forEach((k) => {
      if (changes && typeof changes[k] === "string") m[k] = changes[k].trim();
    });
    return true;
  });
}

function grcContRemoveCcd(id, memberId) {
  return contMutate(id, (p) => {
    const before = p.ccd.length;
    p.ccd = p.ccd.filter((x) => x.id !== memberId);
    return p.ccd.length < before;
  });
}

/* ---------- sous-listes : redondance -------------------------------- */

function grcContAddRedundancy(id, red) {
  return contMutate(id, (p) => {
    const r = {
      id: contId("red"),
      kind: red && GRC_CONT_REDUNDANCY_KINDS.indexOf(red.kind) !== -1 ? red.kind : "backup",
      ref: red && typeof red.ref === "string" ? red.ref : "",
      note: red && typeof red.note === "string" ? red.note : "",
      tested: !!(red && red.tested),
    };
    p.redundancy.push(r);
    return r.id;
  });
}

function grcContUpdateRedundancy(id, redId, changes) {
  return contMutate(id, (p) => {
    const r = p.redundancy.find((x) => x.id === redId);
    if (!r) return false;
    const n = Object.assign({}, changes);
    if ("kind" in n && GRC_CONT_REDUNDANCY_KINDS.indexOf(n.kind) === -1) delete n.kind;
    if ("tested" in n) n.tested = !!n.tested;
    Object.assign(r, n);
    return true;
  });
}

function grcContRemoveRedundancy(id, redId) {
  return contMutate(id, (p) => {
    const before = p.redundancy.length;
    p.redundancy = p.redundancy.filter((x) => x.id !== redId);
    return p.redundancy.length < before;
  });
}

/* ---------- sous-listes : procédure PRA (ordonnée) ----------------- */

// order = position dans le tableau (le tableau fait foi après add/remove/move).
function _contDrpReindex(p) {
  p.drp.forEach((s, i) => { s.order = i + 1; });
}

function grcContAddStep(id, step) {
  return contMutate(id, (p) => {
    const s = {
      id: contId("step"),
      order: p.drp.length + 1,
      text: step && typeof step.text === "string" ? step.text : "",
      owner: step && typeof step.owner === "string" ? step.owner : "",
      doneCriteria: step && typeof step.doneCriteria === "string" ? step.doneCriteria : "",
    };
    p.drp.push(s);
    _contDrpReindex(p);
    return s.id;
  });
}

function grcContUpdateStep(id, stepId, changes) {
  return contMutate(id, (p) => {
    const s = p.drp.find((x) => x.id === stepId);
    if (!s) return false;
    const n = Object.assign({}, changes);
    delete n.order; // l'ordre se gère par grcContMoveStep
    Object.assign(s, n);
    return true;
  });
}

function grcContRemoveStep(id, stepId) {
  return contMutate(id, (p) => {
    const before = p.drp.length;
    p.drp = p.drp.filter((x) => x.id !== stepId);
    _contDrpReindex(p);
    return p.drp.length < before;
  });
}

// dir < 0 = monter, dir > 0 = descendre. Le tableau (déjà trié par
// grcContinuityEnsureShape) fait foi : on échange deux positions puis on
// renumérote `order` d'après la position -- pas de re-tri par `order`
// (qui annulerait l'échange).
function grcContMoveStep(id, stepId, dir) {
  return contMutate(id, (p) => {
    const i = p.drp.findIndex((x) => x.id === stepId);
    if (i === -1) return false;
    const j = dir < 0 ? i - 1 : i + 1;
    if (j < 0 || j >= p.drp.length) return false;
    const tmp = p.drp[i];
    p.drp[i] = p.drp[j];
    p.drp[j] = tmp;
    _contDrpReindex(p);
    return true;
  });
}

/* ---------- sous-listes : journal de tests ------------------------- */

function grcContAddTest(id, t) {
  return contMutate(id, (p) => {
    const x = {
      id: contId("test"),
      ts: contToIso(t && t.ts) || new Date().toISOString(),
      kind: t && GRC_CONT_TEST_KINDS.indexOf(t.kind) !== -1 ? t.kind : "tabletop",
      result: t && GRC_CONT_TEST_RESULTS.indexOf(t.result) !== -1 ? t.result : "partial",
      notes: t && typeof t.notes === "string" ? t.notes : "",
      gaps: t && typeof t.gaps === "string" ? t.gaps : "",
      actions: t && typeof t.actions === "string" ? t.actions : "",
    };
    p.tests.push(x);
    p.tests.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    return x.id;
  });
}

function grcContUpdateTest(id, testId, changes) {
  return contMutate(id, (p) => {
    const x = p.tests.find((y) => y.id === testId);
    if (!x) return false;
    const n = Object.assign({}, changes);
    if ("ts" in n) n.ts = contToIso(n.ts) || x.ts;
    if ("kind" in n && GRC_CONT_TEST_KINDS.indexOf(n.kind) === -1) delete n.kind;
    if ("result" in n && GRC_CONT_TEST_RESULTS.indexOf(n.result) === -1) delete n.result;
    Object.assign(x, n);
    p.tests.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    return true;
  });
}

function grcContRemoveTest(id, testId) {
  return contMutate(id, (p) => {
    const before = p.tests.length;
    p.tests = p.tests.filter((y) => y.id !== testId);
    return p.tests.length < before;
  });
}

/* ---------- BIA / revue / cœur ------------------------------------- */

function grcContSetBia(id, changes) {
  return contMutate(id, (p) => {
    const b = p.bia;
    ["mtdMin", "rtoMin", "rpoMin", "maoMin"].forEach((k) => {
      if (k in changes) b[k] = _contNumOrNull(changes[k]);
    });
    if ("mbco" in changes && typeof changes.mbco === "string") b.mbco = changes.mbco;
    if ("mbcoPct" in changes) b.mbcoPct = grkDecimalOrNull(changes.mbcoPct, 0, 100);
    if ("impacts" in changes && typeof changes.impacts === "string") b.impacts = changes.impacts;
    if ("peakPeriods" in changes && typeof changes.peakPeriods === "string") b.peakPeriods = changes.peakPeriods;
    return true;
  });
}

function grcContSetReview(id, changes) {
  return contMutate(id, (p) => {
    const r = p.review;
    if ("lastReviewedAt" in changes) r.lastReviewedAt = contToIso(changes.lastReviewedAt);
    if ("cadenceMonths" in changes) {
      const n = Number(changes.cadenceMonths);
      if (Number.isFinite(n) && n > 0) r.cadenceMonths = Math.round(n);
    }
    r.nextDueAt = r.lastReviewedAt ? contAddMonths(r.lastReviewedAt, r.cadenceMonths) : null;
    return true;
  });
}

function grcContSetCore(id, changes) {
  return contMutate(id, (p) => {
    if ("service" in changes && typeof changes.service === "string") p.service = changes.service.trim();
    if ("description" in changes && typeof changes.description === "string") p.description = changes.description;
    if ("owner" in changes && typeof changes.owner === "string") p.owner = changes.owner.trim();
    if ("criticality" in changes && GRC_CONT_CRITICALITY.indexOf(changes.criticality) !== -1) p.criticality = changes.criticality;
    if ("linkedIncident" in changes && typeof changes.linkedIncident === "string") p.linkedIncident = changes.linkedIncident.trim();
    if ("spoc" in changes && typeof changes.spoc === "string") p.spoc = changes.spoc.trim();
    if ("processId" in changes && typeof changes.processId === "string") p.processId = changes.processId;
    return true;
  });
}

/* ---------- dérivés ---------------------------------------------------- */

// Revue en retard : jamais revue, ou dernière revue + cadence dépassée.
function grcContIsReviewOverdue(plan) {
  const r = plan && plan.review ? plan.review : null;
  if (!r || !r.lastReviewedAt) return true;
  const due = r.nextDueAt || contAddMonths(r.lastReviewedAt, r.cadenceMonths || GRC_CONT_DEFAULT_CADENCE);
  const t = due ? new Date(due).getTime() : NaN;
  return isNaN(t) ? true : t < Date.now();
}

// Écart RTO - DMIA en minutes s'il est positif, sinon null.
function grcContRtoGap(plan) {
  const b = plan && plan.bia ? plan.bia : null;
  if (!b || b.rtoMin == null || b.mtdMin == null) return null;
  const g = b.rtoMin - b.mtdMin;
  return g > 0 ? g : null;
}

/* Cohérence des objectifs du BIA (spec/grc-restructure/ Q4) :
   RTO ≤ MAO ≤ DMIA, et RPO ≤ RTO (information). Renvoie les codes des
   règles violées -- avertissement seulement, jamais bloquant.
   "rto>dmia" = même règle que grcContRtoGap() (alerte historique). */
function grcContCoherence(plan) {
  const b = plan && plan.bia ? plan.bia : {};
  const out = [];
  const gt = (x, y) => x != null && y != null && x > y;
  if (gt(b.rtoMin, b.maoMin)) out.push("rto>mao");
  if (gt(b.maoMin, b.mtdMin)) out.push("mao>dmia");
  if (gt(b.rtoMin, b.mtdMin)) out.push("rto>dmia");
  if (gt(b.rpoMin, b.rtoMin)) out.push("rpo>rto");
  return out;
}

function grcContSpofCount(plan) {
  return (plan && Array.isArray(plan.dependencies) ? plan.dependencies : []).filter((d) => d && d.spof).length;
}

function grcContSummary(plans) {
  const list = Array.isArray(plans) ? plans : [];
  return {
    spof: list.reduce((acc, p) => acc + grcContSpofCount(p), 0),
    incoherent: list.filter((p) => grcContCoherence(p).length > 0).length,
    count: list.length,
    overdue: list.filter(grcContIsReviewOverdue).length,
    worstGaps: list
      .map((p) => ({ service: p.service || "", gap: grcContRtoGap(p) }))
      .filter((x) => x.gap != null)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3),
    tested: list.filter((p) => Array.isArray(p.tests) && p.tests.length > 0).length,
    total: list.length,
  };
}

/* ---------- import (D2 : tableau OU objet plan unique) ------------- */

async function importGrcContinuityFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  if (Array.isArray(decoded)) {
    saveGrcContinuity(decoded);
    return;
  }

  const isPlanShape =
    decoded && typeof decoded === "object" &&
    typeof decoded.id === "string" && typeof decoded.service === "string";
  if (!isPlanShape) throw new Error(grcT("grc.continuite.pca.invalidImport"));

  const plans = getGrcContinuity();
  const idx = plans.findIndex((p) => p.id === decoded.id);
  if (idx === -1) plans.push(decoded);
  else plans[idx] = decoded;
  saveGrcContinuity(plans);
}

/* ================================================================== *
 *  Registre PCA/PRA -- liste + formulaire + encart de synthèse (T2).
 *  Monté dans grc/continuite.html (#grcContinuityRegistry /
 *  #grcContinuitySummary). Même mécanique que initGrcIncidentRegistry().
 * ================================================================== */

function grcContCriticalityBadge(criticality) {
  const c = GRC_CONT_CRITICALITY.indexOf(criticality) !== -1 ? criticality : "important";
  return { cls: c, text: grcT("grc.continuite.pca.crit." + c) };
}

// Export minimal du registre (le détail par plan + Word/PDF/fiche = T7).
async function exportContinuityRegistryJson() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    alert(grcT("grc.common.vaultLockedExport"));
    return;
  }
  const data = await vaultMaybeEncryptForExport(getGrcContinuity());
  exportJsonFile(data, "pca-continuite-" + new Date().toISOString().slice(0, 10) + ".json");
}

function renderGrcContinuitySummary() {
  const el = document.getElementById("grcContinuitySummary");
  if (!el) return;
  const s = grcContSummary(getGrcContinuity());
  el.innerHTML = "";
  if (!s.count) {
    const p = document.createElement("p");
    p.className = "grc-cont-summary-empty";
    p.textContent = grcT("grc.continuite.pca.summary.none");
    el.appendChild(p);
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "grc-cont-summary";

  const chips = document.createElement("div");
  chips.className = "grc-cont-summary-chips";
  [
    grcT("grc.continuite.pca.summary.plans").replace("{n}", s.count),
    grcT("grc.continuite.pca.summary.overdue").replace("{n}", s.overdue),
    grcT("grc.continuite.pca.summary.tested").replace("{t}", s.tested).replace("{total}", s.total),
    grcT("grc.continuite.pca.summary.spof").replace("{n}", s.spof),
    grcT("grc.continuite.pca.summary.incoherent").replace("{n}", s.incoherent),
  ].forEach((t) => {
    const c = document.createElement("span");
    c.className = "grc-cont-chip";
    c.textContent = t;
    chips.appendChild(c);
  });
  wrap.appendChild(chips);

  if (s.worstGaps.length) {
    const g = document.createElement("p");
    g.className = "grc-cont-summary-gaps";
    g.textContent = grcT("grc.continuite.pca.summary.worstGaps") + " " +
      s.worstGaps.map((x) => x.service + " (+" + contFmtDuration(x.gap) + ")").join(" · ");
    wrap.appendChild(g);
  }
  el.appendChild(wrap);
}

// Liste des processus de la cartographie (Contexte) pour le plan.
function _contFillProcesses(sel, current) {
  sel.innerHTML = "";
  const opts = [{ value: "", label: "—" }].concat(typeof grcLinksKitOptions === "function" ? grcLinksKitOptions("processus") : []);
  if (current && !opts.some((o) => o.value === current)) opts.push({ value: current, label: grcT("grc.fiche.ui.refMissing") });
  opts.forEach((o) => {
    const op = document.createElement("option");
    op.value = o.value;
    op.textContent = o.label;
    sel.appendChild(op);
  });
  sel.value = current || "";
}

function initGrcContinuityRegistry() {
  const container = document.getElementById("grcContinuityRegistry");
  if (!container) return;
  if (typeof vaultGateOr === "function" && vaultGateOr(container, initGrcContinuityRegistry)) return;

  let editingId = null;
  let expandedId = null;
  let pending = {};   // valeurs pré-remplies (actions croisées, UX U5)

  const unitOpts = GRC_CONT_DURATION_UNITS
    .map((u) => `<option value="${u}">${grcT("grc.continuite.pca.unit." + u)}</option>`).join("");
  const durRow = (idBase, labelKey) => `
    <label class="grc-cont-dur">${grcT(labelKey)}
      <span class="grc-cont-dur-input">
        <input type="number" min="0" step="1" id="${idBase}Val">
        <select id="${idBase}Unit">${unitOpts}</select>
      </span>
    </label>`;

  container.innerHTML = `
    <div class="grc-registry-toolbar">
      <button type="button" class="grc-registry-add-btn" id="contAddBtn">${grcT("grc.continuite.pca.form.addBtn")}</button>
      <button type="button" class="grc-registry-io-btn" id="contExportBtn">${grcT("grc.common.btnExport")}</button>
      <button type="button" class="grc-registry-io-btn" id="contImportBtn">${grcT("grc.common.btnImport")}</button>
      <input type="file" accept="application/json" id="contImportFile" style="display:none">
    </div>
    <form class="grc-registry-form" id="contForm" style="display:none">
      <h3 id="contFormTitle">${grcT("grc.continuite.pca.form.title")}</h3>
      <label>${grcT("grc.continuite.pca.form.service")} <input type="text" id="contService" required></label>
      <label>${grcT("grc.continuite.pca.form.description")} <textarea id="contDescription" rows="2"></textarea></label>
      <label>${grcT("grc.links.f.continuity.processId")} <select id="contProcessId"></select></label>
      <div class="grc-registry-form-row">
        <label>${grcT("grc.continuite.pca.form.owner")} <input type="text" id="contOwner"></label>
        <label>${grcT("grc.continuite.pca.form.criticality")}
          <select id="contCriticality">
            ${GRC_CONT_CRITICALITY.map((c) => `<option value="${c}">${grcT("grc.continuite.pca.crit." + c)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="grc-registry-form-row grc-cont-dur-row">
        ${durRow("contMtd", "grc.continuite.pca.form.mtd")}
        ${durRow("contRto", "grc.continuite.pca.form.rto")}
        ${durRow("contRpo", "grc.continuite.pca.form.rpo")}
      </div>
      <p class="grc-cont-warn" id="contFormWarn" style="display:none">${grcT("grc.continuite.pca.warn.rtoGtMtd")}</p>
      <label>${grcT("grc.continuite.pca.form.linkedIncident")}
        <input type="text" id="contLinkedIncident" list="contLinkedIncidentList" autocomplete="off">
      </label>
      <datalist id="contLinkedIncidentList"></datalist>
      <div class="grc-registry-form-actions">
        <button type="submit" class="grc-registry-add-btn">${grcT("grc.common.btnSave")}</button>
        <button type="button" class="grc-registry-io-btn" id="contCancelBtn">${grcT("grc.common.btnCancel")}</button>
      </div>
    </form>
    <ul class="grc-registry-list" id="contList"></ul>
  `;

  const $ = (sel) => container.querySelector(sel);

  function setDur(idBase, minutes) {
    const parts = contMinutesToParts(minutes);
    $("#" + idBase + "Val").value = parts.value === "" ? "" : parts.value;
    $("#" + idBase + "Unit").value = parts.unit;
  }
  function getDur(idBase) {
    const v = $("#" + idBase + "Val").value;
    if (v === "") return null;
    return contPartsToMinutes(v, $("#" + idBase + "Unit").value);
  }
  function syncWarn() {
    const rto = getDur("contRto");
    const mtd = getDur("contMtd");
    $("#contFormWarn").style.display = (rto != null && mtd != null && rto > mtd) ? "" : "none";
  }

  function showForm(plan) {
    editingId = plan ? plan.id : null;
    $("#contFormTitle").textContent = plan
      ? grcT("grc.continuite.pca.form.titleEdit") : grcT("grc.continuite.pca.form.title");
    $("#contService").value = plan ? (plan.service || "") : "";
    $("#contDescription").value = plan ? (plan.description || "") : "";
    $("#contOwner").value = plan ? (plan.owner || "")
      : (typeof grcAuthorName === "function" ? grcAuthorName() : "");
    $("#contCriticality").value = plan ? plan.criticality : "important";
    $("#contLinkedIncident").value = plan ? (plan.linkedIncident || "") : "";
    _contFillProcesses($("#contProcessId"), plan ? plan.processId : (pending.processId || ""));
    if (!plan && pending.service) $("#contService").value = pending.service;
    pending = {};
    const bia = plan && plan.bia ? plan.bia : {};
    setDur("contMtd", bia.mtdMin);
    setDur("contRto", bia.rtoMin);
    setDur("contRpo", bia.rpoMin);
    syncWarn();
    $("#contForm").style.display = "";
    $("#contAddBtn").style.display = "none";
    $("#contFormTitle").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideForm() {
    editingId = null;
    $("#contForm").reset();
    $("#contForm").style.display = "none";
    $("#contFormWarn").style.display = "none";
    $("#contAddBtn").style.display = "";
  }

  $("#contAddBtn").addEventListener("click", () => showForm(null));
  $("#contCancelBtn").addEventListener("click", hideForm);
  $("#contExportBtn").addEventListener("click", exportContinuityRegistryJson);
  $("#contImportBtn").addEventListener("click", () => $("#contImportFile").click());
  $("#contImportFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importGrcContinuityFromJson(file)
      .then(renderGrcContinuityList)
      .catch((err) => alert(err.message || grcT("grc.common.invalidJsonFile")))
      .finally(() => { e.target.value = ""; });
  });
  ["contMtdVal", "contMtdUnit", "contRtoVal", "contRtoUnit"].forEach((id) => {
    $("#" + id).addEventListener("input", syncWarn);
    $("#" + id).addEventListener("change", syncWarn);
  });

  $("#contForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const service = $("#contService").value.trim();
    if (!service) return;
    const bia = {
      mtdMin: getDur("contMtd"),
      rtoMin: getDur("contRto"),
      rpoMin: getDur("contRpo"),
    };
    const linkedIncident = $("#contLinkedIncident").value.trim();
    const processId = $("#contProcessId").value;
    if (editingId) {
      const existing = getGrcContinuity().find((p) => p.id === editingId);
      const merged = Object.assign({}, existing && existing.bia, bia);
      updateGrcContinuityPlan(editingId, {
        service,
        description: $("#contDescription").value.trim(),
        owner: $("#contOwner").value.trim(),
        criticality: $("#contCriticality").value,
        linkedIncident,
        processId,
        bia: merged,
      });
      if (typeof grcChainChanged === "function") {
        const saved = getGrcContinuity().find((p) => p.id === editingId);
        if (saved) grcChainChanged(GRC_CONTINUITY_KEY, saved);
      }
    } else {
      addGrcContinuityPlan({
        service,
        description: $("#contDescription").value.trim(),
        owner: $("#contOwner").value.trim(),
        criticality: $("#contCriticality").value,
        linkedIncident,
        processId,
        bia: bia,
      });
    }
    hideForm();
    renderGrcContinuityList();
  });

  function buildPlanItem(plan) {
    const crit = grcContCriticalityBadge(plan.criticality);
    const overdue = grcContIsReviewOverdue(plan);
    const li = document.createElement("li");
    li.className = "grc-registry-item" + (plan.id === expandedId ? " open" : "");
    li.dataset.planId = plan.id;

    const header = document.createElement("div");
    header.className = "grc-registry-header";
    header.innerHTML =
      `<span>${plan.service || ""}</span>` +
      `<span class="grc-cont-crit ${crit.cls}">${crit.text}</span>` +
      `<span class="grc-cont-rto">${grcT("grc.continuite.pca.detail.rto").replace("{value}", contFmtDuration(plan.bia && plan.bia.rtoMin))}</span>` +
      (overdue ? `<span class="grc-cont-badge-overdue">${grcT("grc.continuite.pca.badge.overdue")}</span>` : "") +
      `<span class="chevron">▸</span>`;
    header.onclick = () => {
      expandedId = expandedId === plan.id ? null : plan.id;
      renderGrcContinuityList();
    };
    li.appendChild(header);

    if (plan.id === expandedId) {
      const body = document.createElement("div");
      body.className = "grc-registry-body";

      if (typeof renderContinuityPanel === "function") {
        renderContinuityPanel(body, plan);
      } else {
        const d = document.createElement("p");
        d.textContent = plan.description || "";
        body.appendChild(d);
      }
      // Chaîne GRC (chaine.md M2) : dépend de / utilisé par.
      if (typeof grcLinksDepsBlock === "function") {
        const deps = grcLinksDepsBlock(GRC_CONTINUITY_KEY, plan);
        if (deps) body.appendChild(deps);
      }

      const actions = document.createElement("div");
      actions.className = "grc-ir-actions grc-cont-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "grc-registry-add-btn grc-ir-toggle";
      editBtn.textContent = grcT("grc.common.btnEdit");
      editBtn.onclick = () => showForm(getGrcContinuity().find((p) => p.id === plan.id) || plan);
      actions.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "grc-registry-io-btn grc-ir-toggle";
      delBtn.textContent = grcT("grc.common.btnDelete");
      delBtn.onclick = () => {
        const guard = typeof grcLinksDeleteWarning === "function" ? grcLinksDeleteWarning(GRC_CONTINUITY_KEY, plan) : "";
        if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", plan.service || "") + guard)) return;
        removeGrcContinuityPlan(plan.id);
        if (expandedId === plan.id) expandedId = null;
        renderGrcContinuityList();
      };
      actions.appendChild(delBtn);

      body.appendChild(actions);
      li.appendChild(body);
    }

    return li;
  }

  // Ouverture pré-remplie depuis une autre page (grcFicheCrossOpen).
  window.grcContinuityOpenWith = { openWith: (values) => { pending = values || {}; showForm(null); } };

  window.renderGrcContinuityList = function () {
    const list = $("#contList");
    list.innerHTML = "";
    getGrcContinuity().forEach((plan) => list.appendChild(buildPlanItem(plan)));
    renderGrcContinuitySummary();
  };

  // Autocomplétion du champ « Incident IR lié » si le journal d'incidents
  // est chargé sur la page (sinon champ libre -- D4).
  if (typeof getGrcIncidents === "function") {
    try {
      const dl = $("#contLinkedIncidentList");
      getGrcIncidents().forEach((inc) => {
        if (!inc || !inc.id) return;
        const o = document.createElement("option");
        o.value = inc.id;
        o.textContent = inc.title || inc.id;
        dl.appendChild(o);
      });
    } catch (e) {}
  }

  // Deep-link : grc/continuite.html#<planId> déplie + scrolle le plan.
  function applyContinuityDeepLink() {
    const raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return;
    let id;
    try { id = decodeURIComponent(raw); } catch (e) { id = raw; }
    if (!getGrcContinuity().some((p) => p.id === id)) return;
    if (expandedId !== id) {
      expandedId = id;
      renderGrcContinuityList();
    }
    const li = $('#contList li[data-plan-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (li && li.scrollIntoView) li.scrollIntoView({ block: "center" });
  }
  window.addEventListener("hashchange", applyContinuityDeepLink);

  renderGrcContinuityList();
  applyContinuityDeepLink();
}
