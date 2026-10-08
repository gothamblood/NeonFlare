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
const GRC_CONT_DEP_TYPES = ["asset", "application", "data", "service", "supplier", "site", "people"];
const GRC_CONT_REDUNDANCY_KINDS = ["backup", "ha", "failover-site", "cold-spare", "manual-workaround"];
// Types d'exercice (note de cours / ISO 22398) : TTX, revue guidée,
// simulation de crise, test de restauration, bascule, évacuation, grandeur nature.
const GRC_CONT_TEST_KINDS = ["tabletop", "walkthrough", "simulation", "restore", "failover", "evacuation", "full"];
const GRC_CONT_TEST_RESULTS = ["pass", "partial", "fail"];
const GRC_CONT_DURATION_UNITS = ["min", "h", "j"];
const GRC_CONT_DEFAULT_CADENCE = 12;
// BIA dans le temps (grc-normes N2, décision E2) : horizons par défaut, en
// minutes ; niveaux d'impact 1 (négligeable) à 5 (catastrophique).
const GRC_CONT_BIA_HORIZONS = [240, 1440, 4320, 10080, 43200];
// Natures d'impact du BIA (note de cours : financier, opérationnel,
// réputationnel, réglementaire, humain). `legal` = réglementaire / légal.
const GRC_CONT_IMPACT_KINDS = ["financier", "operationnel", "reputation", "legal", "humain"];
const GRC_CONT_RES_KINDS = ["role", "asset", "supplier", "other"];
// Niveau à partir duquel l'impact est jugé inacceptable (DMIA suggérée).
const GRC_CONT_UNACCEPTABLE = 4;

// Taxonomie des plans de continuité (spec/grc-continuity-plans-register/,
// décision B 2026-10-07). Un plan stocke `type` ; `niveau` (1–6) et
// `categorie` en DÉRIVENT via cette table (pas de saisie redondante).
// `fiche` = page de fiche de référence PARTAGÉE par ce type (décision A1 :
// contenu par type, pas par instance). DRP partage la fiche du PRI (sous-cas).
// Niveau → pastille couleur du registre (1🔴 2🟠 3🟡 4🔴 5🟢 6🟢).
const GRC_CONT_PLAN_TYPES = [
  { code: "PUI",  niveau: 1, categorie: "urgence",           fiche: "continuite-pui" },
  { code: "PCA",  niveau: 2, categorie: "pilotage",          fiche: "continuite-pca" },
  { code: "PGC",  niveau: 2, categorie: "pilotage",          fiche: "continuite-pgc" },
  { code: "PCO",  niveau: 3, categorie: "continuite-metier", fiche: "continuite-pco" },
  { code: "PSI",  niveau: 3, categorie: "continuite-ti",     fiche: "continuite-psi" },
  { code: "PCC",  niveau: 3, categorie: "transversal",       fiche: "continuite-pcm" },
  { code: "PRH",  niveau: 3, categorie: "transversal",       fiche: "continuite-prh" },
  { code: "PRL",  niveau: 3, categorie: "transversal",       fiche: "continuite-prl" },
  { code: "PLOG", niveau: 3, categorie: "transversal",       fiche: "continuite-plog" },
  { code: "PDEP", niveau: 3, categorie: "transversal",       fiche: "continuite-pdep" },
  { code: "PRII", niveau: 4, categorie: "reponse-ti",        fiche: "continuite-prii" },
  { code: "PRI",  niveau: 5, categorie: "reprise-ti",        fiche: "continuite-pri" },
  { code: "DRP",  niveau: 5, categorie: "reprise-ti",        fiche: "continuite-pri" },
  { code: "PRA",  niveau: 6, categorie: "reprise-metier",    fiche: "continuite-pra" },
];
const GRC_CONT_PLAN_TYPE_BY_CODE = GRC_CONT_PLAN_TYPES.reduce(
  (m, t) => { m[t.code] = t; return m; }, Object.create(null));
// Catégories dans l'ordre de niveau (pour grouper/trier le registre).
const GRC_CONT_PLAN_CATEGORIES = ["urgence", "pilotage", "continuite-metier",
  "continuite-ti", "transversal", "reponse-ti", "reprise-ti", "reprise-metier"];
const GRC_CONT_CAT_LEVEL = GRC_CONT_PLAN_TYPES.reduce(
  (m, t) => { if (m[t.categorie] == null) m[t.categorie] = t.niveau; return m; }, Object.create(null));

// Métadonnées d'un type (ou null si inconnu / non classé).
function grcContTypeMeta(code) {
  return GRC_CONT_PLAN_TYPE_BY_CODE[code] || null;
}

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
    // Type de plan + dérivés (spec/grc-continuity-plans-register/). Plan sans
    // type reconnu => « Non classé » (type "", niveau 0, categorie ""), rien perdu.
    type: GRC_CONT_PLAN_TYPE_BY_CODE[src.type] ? src.type : "",
    niveau: GRC_CONT_PLAN_TYPE_BY_CODE[src.type] ? GRC_CONT_PLAN_TYPE_BY_CODE[src.type].niveau : 0,
    categorie: GRC_CONT_PLAN_TYPE_BY_CODE[src.type] ? GRC_CONT_PLAN_TYPE_BY_CODE[src.type].categorie : "",
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
        reputation: _contLevel(t.reputation), legal: _contLevel(t.legal), humain: _contLevel(t.humain),
        level: _contLevel(t.level) || Math.max.apply(null, GRC_CONT_IMPACT_KINDS.map((k) => _contLevel(t[k]))),
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
    // BIA lié (registre BIA par processus, spec/grc-bia-register/ C2).
    biaId: typeof src.biaId === "string" ? src.biaId : "",
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

/* ---------- exercices : source unique = Rapports d'exercice -----------
   Les rapports de la fiche « continuite-tests-exercices » (onglet Tests &
   exercices de la page) sont LA source des exercices réalisés. L'ancien
   journal par plan (plan.tests) n'est plus saisi : chaque test qui n'y a
   pas encore été recopié l'est une fois en rapport (id « pt-<id> », sauf
   rapport du même plan à la même date), puis marqué `reported` -- un rapport
   supprimé ensuite ne revient pas. plan.tests est conservé intact. */
const GRC_CONT_REPORTS_KEY = "/grc/fiches/continuite-tests-exercices/rapports";
const _CONT_TEST_TYPE = { tabletop: "ttx", walkthrough: "ttx", simulation: "simulation", restore: "restauration", failover: "bascule", evacuation: "evacuation", full: "complet" };
const _CONT_TEST_RES = { pass: "reussi", partial: "partiel", fail: "echec" };

function grcContAllReports() {
  const list = grkStore(GRC_CONT_REPORTS_KEY).get();
  return Array.isArray(list) ? list.filter((x) => x && typeof x === "object") : [];
}

// Rapports d'un plan, du plus ancien au plus récent.
function grcContReports(planId) {
  return grcContAllReports().filter((r) => r.plan === planId)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
}

function grcContSyncTestsToReports() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) return false;
  const plans = getGrcContinuity();
  const reports = grcContAllReports();
  let changedPlans = false;
  let changedReports = false;
  plans.forEach((p) => (Array.isArray(p.tests) ? p.tests : []).forEach((t) => {
    if (!t || t.reported) return;
    const date = String(t.ts || t.date || "").slice(0, 10);
    const dup = reports.some((r) => r.id === "pt-" + t.id || (r.plan === p.id && r.date === date));
    if (!dup) {
      const obs = [t.notes, t.gaps ? grcT("grc.continuite.pca.test.gaps") + " : " + t.gaps : "",
        t.actions ? grcT("grc.continuite.pca.test.actions") + " : " + t.actions : ""].filter(Boolean).join("\n");
      reports.push({ id: "pt-" + t.id, plan: p.id, date: date, type: _CONT_TEST_TYPE[t.kind] || "ttx",
        resultat: _CONT_TEST_RES[t.result] || "partiel", observations: obs, actions: [],
        scenario: "", participants: "", rtoObserve: "" });
      changedReports = true;
    }
    t.reported = true;
    changedPlans = true;
  }));
  if (changedReports) grkStore(GRC_CONT_REPORTS_KEY).save(reports);
  if (changedPlans) saveGrcContinuity(plans);
  return changedReports;
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
    if ("type" in changes) {
      const m = GRC_CONT_PLAN_TYPE_BY_CODE[changes.type];
      p.type = m ? changes.type : "";
      p.niveau = m ? m.niveau : 0;
      p.categorie = m ? m.categorie : "";
    }
    if ("linkedIncident" in changes && typeof changes.linkedIncident === "string") p.linkedIncident = changes.linkedIncident.trim();
    if ("spoc" in changes && typeof changes.spoc === "string") p.spoc = changes.spoc.trim();
    if ("processId" in changes && typeof changes.processId === "string") p.processId = changes.processId;
    if ("biaId" in changes && typeof changes.biaId === "string") p.biaId = changes.biaId;
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

// Clé i18n de l'avertissement d'une règle de cohérence (code -> clé camelCase).
const GRC_CONT_COHERENCE_KEYS = {
  "rto>mao": "grc.continuite.pca.warn.rtoGtMao",
  "mao>dmia": "grc.continuite.pca.warn.maoGtDmia",
  "rto>dmia": "grc.continuite.pca.warn.rtoGtMtd",
  "rpo>rto": "grc.continuite.pca.warn.rpoGtRto",
};

function grcContCoherenceKey(code) {
  return GRC_CONT_COHERENCE_KEYS[code] || "grc.continuite.pca.warn." + code;
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
    tested: list.filter((p) => grcContReports(p.id).length > 0).length,
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

// Libellé affiché d'un type : « PCA — Plan de continuité des activités ».
function grcContTypeLabel(code) {
  if (!GRC_CONT_PLAN_TYPE_BY_CODE[code]) return grcT("grc.continuite.type.none");
  return code + " — " + grcT("grc.continuite.type." + code);
}

// <option>/<optgroup> du champ Type, groupés par Niveau + Catégorie.
function grcContTypeOptionsHtml(selected) {
  const byCat = Object.create(null);
  GRC_CONT_PLAN_TYPES.forEach((t) => { (byCat[t.categorie] = byCat[t.categorie] || []).push(t); });
  let html = `<option value="">${contEscapeHtml(grcT("grc.continuite.type.none"))}</option>`;
  GRC_CONT_PLAN_CATEGORIES.filter((c) => byCat[c]).forEach((c) => {
    const groupLabel = grcT("grc.continuite.plevel." + GRC_CONT_CAT_LEVEL[c]) +
      " · " + grcT("grc.continuite.pcat." + c);
    html += `<optgroup label="${contEscapeHtml(groupLabel)}">`;
    byCat[c].forEach((t) => {
      html += `<option value="${t.code}"${t.code === selected ? " selected" : ""}>` +
        contEscapeHtml(grcContTypeLabel(t.code)) + `</option>`;
    });
    html += `</optgroup>`;
  });
  return html;
}

// Texte « lecture seule » dérivé du type (niveau + catégorie), ou vide.
function grcContTypeDerivedText(code) {
  const m = grcContTypeMeta(code);
  if (!m) return "";
  return grcT("grc.continuite.plevel." + m.niveau) + " · " + grcT("grc.continuite.pcat." + m.categorie);
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
// Entrée du registre BIA liée au plan (champ biaId), ou null.
function grcContLinkedBia(plan) {
  if (!plan || !plan.biaId || typeof getGrcBia !== "function") return null;
  return getGrcBia().find((b) => b.id === plan.biaId) || null;
}

function _contFillProcesses(sel, current, type) {
  sel.innerHTML = "";
  const opts = [{ value: "", label: "—" }].concat(typeof grcLinksKitOptions === "function" ? grcLinksKitOptions(type || "processus") : []);
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
  grcContSyncTestsToReports();

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
      <label>${grcT("grc.continuite.form.type")}
        <select id="contType" required>${grcContTypeOptionsHtml("")}</select>
      </label>
      <p class="grc-cont-type-derived" id="contTypeDerived"></p>
      <label>${grcT("grc.continuite.pca.form.service")} <input type="text" id="contService" required></label>
      <label>${grcT("grc.continuite.pca.form.description")} <textarea id="contDescription" rows="2"></textarea></label>
      <label>${grcT("grc.links.f.continuity.processId")} <select id="contProcessId"></select></label>
      <label>${grcT("grc.links.f.continuity.biaId")} <select id="contBiaId"></select></label>
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

  // « + Ajouter » sous les selects processus (Contexte) et BIA (onglet BIA,
  // nouvel onglet) ; options rechargées au retour sur cet onglet.
  if (typeof grcLinksAddButton === "function") {
    [["#contProcessId", "processus"], ["#contBiaId", "bia"]].forEach(([id, type]) => {
      const sel = $(id);
      const add = grcLinksAddButton(type, sel, (v) => _contFillProcesses(sel, v, type));
      if (add) sel.parentNode.appendChild(add);
    });
  }

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
  function syncTypeDerived() {
    const txt = grcContTypeDerivedText($("#contType").value);
    const el = $("#contTypeDerived");
    el.textContent = txt;
    el.style.display = txt ? "" : "none";
  }

  function showForm(plan) {
    editingId = plan ? plan.id : null;
    $("#contFormTitle").textContent = plan
      ? grcT("grc.continuite.pca.form.titleEdit") : grcT("grc.continuite.pca.form.title");
    $("#contType").value = plan ? (plan.type || "") : (pending.type || "");
    syncTypeDerived();
    $("#contService").value = plan ? (plan.service || "") : "";
    $("#contDescription").value = plan ? (plan.description || "") : "";
    $("#contOwner").value = plan ? (plan.owner || "")
      : (typeof grcAuthorName === "function" ? grcAuthorName() : "");
    $("#contCriticality").value = plan ? plan.criticality : "important";
    $("#contLinkedIncident").value = plan ? (plan.linkedIncident || "") : "";
    _contFillProcesses($("#contProcessId"), plan ? plan.processId : (pending.processId || ""));
    _contFillProcesses($("#contBiaId"), plan ? plan.biaId : (pending.biaId || ""), "bia");
    if (!plan && !pending.biaId) syncBiaFromProcess();
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

  // BIA lié vide : proposer le BIA du processus choisi (s'il y en a un).
  function syncBiaFromProcess() {
    const sel = $("#contBiaId");
    const pid = $("#contProcessId").value;
    if (sel.value || !pid || typeof getGrcBia !== "function") return;
    const hit = getGrcBia().find((b) => b.processId === pid);
    if (hit) sel.value = hit.id;
  }

  $("#contAddBtn").addEventListener("click", () => showForm(null));
  $("#contProcessId").addEventListener("change", syncBiaFromProcess);
  $("#contType").addEventListener("change", syncTypeDerived);
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
    const biaId = $("#contBiaId").value;
    const type = $("#contType").value;
    const typeMeta = grcContTypeMeta(type);
    if (editingId) {
      const existing = getGrcContinuity().find((p) => p.id === editingId);
      const merged = Object.assign({}, existing && existing.bia, bia);
      updateGrcContinuityPlan(editingId, {
        service,
        type,
        niveau: typeMeta ? typeMeta.niveau : 0,
        categorie: typeMeta ? typeMeta.categorie : "",
        description: $("#contDescription").value.trim(),
        owner: $("#contOwner").value.trim(),
        criticality: $("#contCriticality").value,
        linkedIncident,
        processId,
        biaId,
        bia: merged,
      });
      if (typeof grcChainChanged === "function") {
        const saved = getGrcContinuity().find((p) => p.id === editingId);
        if (saved) grcChainChanged(GRC_CONTINUITY_KEY, saved);
      }
    } else {
      addGrcContinuityPlan({
        service,
        type,
        niveau: typeMeta ? typeMeta.niveau : 0,
        categorie: typeMeta ? typeMeta.categorie : "",
        description: $("#contDescription").value.trim(),
        owner: $("#contOwner").value.trim(),
        criticality: $("#contCriticality").value,
        linkedIncident,
        processId,
        biaId,
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
    const typeChip = plan.type
      ? `<span class="grc-cont-type-chip" title="${contEscapeHtml(grcContTypeLabel(plan.type))}">${contEscapeHtml(plan.type)}</span>`
      : `<span class="grc-cont-type-chip grc-cont-type-none">${contEscapeHtml(grcT("grc.continuite.type.none"))}</span>`;
    header.innerHTML =
      typeChip +
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
  window.grcContinuityOpenWith = { openWith: (values) => {
    if (typeof grcContinuiteShowTab === "function") grcContinuiteShowTab("faire-plan");
    pending = values || {};
    showForm(null);
  } };

  // Registre regroupé par catégorie (ordre de niveau), « Non classé » en fin.
  function appendGroupHead(list, niveau, labelKey, label) {
    const head = document.createElement("li");
    head.className = "grc-cont-group-head grc-cont-niv-" + niveau;
    const dot = document.createElement("span");
    dot.className = "grc-cont-niv-dot";
    head.appendChild(dot);
    const span = document.createElement("span");
    span.textContent = label || grcT(labelKey);
    head.appendChild(span);
    if (niveau) {
      const lvl = document.createElement("span");
      lvl.className = "grc-cont-group-level";
      lvl.textContent = grcT("grc.continuite.plevel." + niveau);
      head.appendChild(lvl);
    }
    list.appendChild(head);
  }

  window.renderGrcContinuityList = function () {
    const list = $("#contList");
    list.innerHTML = "";
    const plans = getGrcContinuity();
    const byCat = Object.create(null);
    plans.forEach((p) => { (byCat[p.categorie || ""] = byCat[p.categorie || ""] || []).push(p); });
    GRC_CONT_PLAN_CATEGORIES.filter((c) => byCat[c] && byCat[c].length).forEach((c) => {
      appendGroupHead(list, GRC_CONT_CAT_LEVEL[c], "grc.continuite.pcat." + c);
      byCat[c].forEach((plan) => list.appendChild(buildPlanItem(plan)));
    });
    if (byCat[""] && byCat[""].length) {
      appendGroupHead(list, 0, "grc.continuite.cat.none", grcT("grc.continuite.type.none"));
      byCat[""].forEach((plan) => list.appendChild(buildPlanItem(plan)));
    }
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

/* ---------- « Choisir le bon plan en quatre questions » ---------------
   Aide de la note de cours, posée dans cet ordre : (1) des personnes
   sont-elles menacées ? -> PUI d'abord ; (2) service dégradé ou arrêté ?
   -> continuité (PCA, PCO, PSI) ou reprise (PRA, PRI, DRP) ; (3) l'origine
   est-elle une compromission ? -> PRII d'abord (confiner, copie saine) ;
   (4) qui décide ? -> niveau I SPOC, II directeurs + RPCA, III cellule de
   crise. Chaque type proposé ouvre le formulaire « Ajouter un plan » prérempli. */
function renderGrcContPlanChooser() {
  const root = document.getElementById("grcContPlanChooser");
  if (!root) return;
  root.innerHTML = "";
  const det = document.createElement("details");
  det.className = "grc-cont-chooser";
  const sum = document.createElement("summary");
  sum.textContent = grcT("grc.cont.choose.title");
  det.appendChild(sum);
  const lead = document.createElement("p");
  lead.className = "grk-hint";
  lead.textContent = grcT("grc.cont.choose.lead");
  det.appendChild(lead);

  const Q = [
    { id: "people", opts: ["yes", "no"] },
    { id: "service", opts: ["degraded", "stopped"] },
    { id: "compromise", opts: ["yes", "no"] },
    { id: "who", opts: ["n1", "n2", "n3"] },
  ];
  const state = {};
  const out = document.createElement("div");
  out.className = "grc-cont-chooser-out";
  const grid = document.createElement("ol");
  grid.className = "grc-cont-chooser-q";
  Q.forEach((q) => {
    const li = document.createElement("li");
    const p = document.createElement("p");
    p.textContent = grcT("grc.cont.choose.q." + q.id);
    li.appendChild(p);
    q.opts.forEach((o) => {
      const lab = document.createElement("label");
      lab.className = "grc-cont-chooser-opt";
      const r = document.createElement("input");
      r.type = "radio";
      r.name = "grcContChoose-" + q.id;
      r.value = o;
      r.addEventListener("change", () => { state[q.id] = o; draw(); });
      lab.appendChild(r);
      lab.appendChild(document.createTextNode(" " + grcT("grc.cont.choose.a." + q.id + "." + o)));
      li.appendChild(lab);
    });
    grid.appendChild(li);
  });
  det.appendChild(grid);
  det.appendChild(out);

  function draw() {
    out.innerHTML = "";
    const steps = [];
    if (state.people === "yes") steps.push({ key: "people", types: ["PUI"] });
    if (state.compromise === "yes") steps.push({ key: "compromise", types: ["PRII"] });
    if (state.service === "degraded") steps.push({ key: "degraded", types: ["PCA", "PCO", "PSI"] });
    if (state.service === "stopped") steps.push({ key: "stopped", types: ["PRA", "PRI", "DRP"] });
    if (state.who) steps.push({ key: "who." + state.who, types: state.who === "n3" ? ["PGC", "PCC"] : [] });
    if (!steps.length) return;
    const ul = document.createElement("ul");
    steps.forEach((s) => {
      const li = document.createElement("li");
      li.appendChild(document.createTextNode(grcT("grc.cont.choose.r." + s.key) + " "));
      s.types.forEach((t) => {
        if (!GRC_CONT_PLAN_TYPES.some((x) => x.code === t)) return;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "grk-link-add grc-cont-chooser-add";
        b.dataset.type = t;
        b.textContent = "+ " + t;
        b.title = grcT("grc.continuite.type." + t);
        b.addEventListener("click", () => { if (window.grcContinuityOpenWith) window.grcContinuityOpenWith.openWith({ type: t }); });
        li.appendChild(b);
        li.appendChild(document.createTextNode(" "));
      });
      ul.appendChild(li);
    });
    out.appendChild(ul);
  }
  root.appendChild(det);
}
