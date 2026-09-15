/* Registre des plans de traitement -- grc/traitement-risques.html.
   Bâti sur grc-registry-kit.js (grk*), même schéma que grc-suppliers.js.

   Un plan de traitement n'est plus embarqué 1:1 dans un risque (ancien
   modèle -- voir spec/grc-registry-upgrades/70-risk-treatment.md) : il
   vit ici comme entité autonome, et un OU PLUSIEURS risques de
   grc-risks.js peuvent s'y lier via `risk.treatmentPlan.planIds[]`
   (many-to-many : une même mesure de mitigation réduit souvent plusieurs
   risques à la fois, ET un risque peut cumuler plusieurs plans, ex. MFA
   + segmentation réseau sur le même risque). Le résiduel et
   l'acceptation restent PROPRES à chaque risque, UN SEUL couple même
   avec plusieurs plans liés (pas ici) -- voir
   grcRiskSetResidual/SetAcceptance dans grc-risks.js et
   grcRiskTreatmentPlans() qui résout les plans à la lecture.

   Pas de contrainte d'intégrité forte quand un plan lié est supprimé :
   grcRiskTreatmentPlans() filtre silencieusement les plans manquants,
   l'UI du risque retombe sur l'état "créer/lier un plan" s'il n'en reste
   aucun -- même philosophie que risk.assetIds (grc-risks.js) et
   linkedIncidents (grc-suppliers.js).

   Nécessite grc-registry-kit.js (grk*) chargé avant ce fichier, et doit
   lui-même être chargé AVANT grc-risks.js (qui référence GRC_RT_*). */

const GRC_TREATMENT_PLANS_KEY = "/grc/traitement-risques/registry";

const GRC_RT_STRATEGIES = ["avoid", "mitigate", "transfer", "accept"];
const GRC_RT_ACTION_STATUSES = ["todo", "doing", "done"];

// Map depuis l'ancienne stratégie texte (grc-risks form) si présente --
// utilisée uniquement en seed lors de la création d'un plan depuis un
// risque legacy (grcRiskCreateAndLinkPlan / migration).
const _GRC_RT_LEGACY_STRATEGY = {
  evitement: "avoid", mitigation: "mitigate", transfert: "transfer", acceptation: "accept",
};

const GRC_RT_ACTION_SCHEMA = {
  id: { type: "string" },
  order: { type: "number", default: 0 },
  text: { type: "string" },
  owner: { type: "string" },
  dueAt: { type: "iso" },
  status: { type: "string", enum: GRC_RT_ACTION_STATUSES, default: "todo" },
  doneAt: { type: "iso" },
};

const GRC_TP_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  name: { type: "string" },
  strategy: { type: "string", enum: GRC_RT_STRATEGIES, default: "mitigate" },
  rationale: { type: "string" },
  transferTo: { type: "string" },
  actions: { type: "array", sortBy: "order", of: GRC_RT_ACTION_SCHEMA },
  linkedControls: { type: "array" },
};

function grcTpEnsureShape(plan) {
  const p = grkEnsure(plan, GRC_TP_SCHEMA);
  p.id = plan && typeof plan.id === "string" ? plan.id : (p.id || "");
  p.actions.forEach((a, i) => { a.order = i + 1; });
  return p;
}

const _grcTpStore = grkStore(GRC_TREATMENT_PLANS_KEY);

function getGrcTreatmentPlans() {
  return _grcTpStore.get();
}

function saveGrcTreatmentPlans(list) {
  _grcTpStore.save(list);
}

function resetGrcTreatmentPlans() {
  _grcTpStore.remove();
}

function addGrcTreatmentPlan(plan) {
  const list = getGrcTreatmentPlans();
  const shaped = grcTpEnsureShape(plan || {});
  shaped.id = grkId("tp");
  list.push(shaped);
  saveGrcTreatmentPlans(list);
  return shaped.id;
}

function updateGrcTreatmentPlan(id, changes) {
  const list = getGrcTreatmentPlans();
  const idx = list.findIndex((p) => p && p.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveGrcTreatmentPlans(list);
}

function removeGrcTreatmentPlan(id) {
  saveGrcTreatmentPlans(getGrcTreatmentPlans().filter((p) => p && p.id !== id));
}

// Mutation atomique bien formée (id préservé) -- même schéma que
// supMutate (grc-suppliers.js) / grcRiskTreatmentMutate (ancien modèle).
function grcTpMutate(id, fn) {
  return grkMutate(_grcTpStore, id, grcTpEnsureShape, fn);
}

function grcTpSetStrategy(id, changes) {
  return grcTpMutate(id, (p) => {
    if ("name" in changes && typeof changes.name === "string") p.name = changes.name.trim();
    if ("strategy" in changes && GRC_RT_STRATEGIES.indexOf(changes.strategy) !== -1) p.strategy = changes.strategy;
    if ("rationale" in changes && typeof changes.rationale === "string") p.rationale = changes.rationale;
    if ("transferTo" in changes && typeof changes.transferTo === "string") p.transferTo = changes.transferTo.trim();
    return true;
  });
}

/* ---------- plan d'action (liste ordonnée) --------------- */

function _grcTpReindex(p) { p.actions.forEach((a, i) => { a.order = i + 1; }); }

function grcTpAddAction(id, action) {
  return grcTpMutate(id, (p) => {
    const a = grkEnsure(action || {}, GRC_RT_ACTION_SCHEMA);
    a.id = grkId("rta");
    a.order = p.actions.length + 1;
    p.actions.push(a);
    _grcTpReindex(p);
    return a.id;
  });
}

function grcTpUpdateAction(id, actionId, changes) {
  return grcTpMutate(id, (p) => {
    const a = p.actions.find((x) => x.id === actionId);
    if (!a) return false;
    const n = Object.assign({}, changes);
    delete n.order;
    if ("status" in n) {
      if (GRC_RT_ACTION_STATUSES.indexOf(n.status) === -1) delete n.status;
      else if (n.status === "done" && !a.doneAt) a.doneAt = new Date().toISOString();
      else if (n.status !== "done") a.doneAt = null;
    }
    if ("dueAt" in n) n.dueAt = grkToIso(n.dueAt);
    Object.assign(a, n);
    return true;
  });
}

function grcTpRemoveAction(id, actionId) {
  return grcTpMutate(id, (p) => {
    const before = p.actions.length;
    p.actions = p.actions.filter((x) => x.id !== actionId);
    _grcTpReindex(p);
    return p.actions.length < before;
  });
}

function grcTpMoveAction(id, actionId, dir) {
  return grcTpMutate(id, (p) => {
    const i = p.actions.findIndex((x) => x.id === actionId);
    if (i === -1) return false;
    const j = dir < 0 ? i - 1 : i + 1;
    if (j < 0 || j >= p.actions.length) return false;
    const tmp = p.actions[i]; p.actions[i] = p.actions[j]; p.actions[j] = tmp;
    _grcTpReindex(p);
    return true;
  });
}

function grcTpAddLinkedControl(id, ref) {
  return grcTpMutate(id, (p) => {
    const v = String(ref || "").trim();
    if (!v || p.linkedControls.indexOf(v) !== -1) return false;
    p.linkedControls.push(v);
    return true;
  });
}

function grcTpRemoveLinkedControl(id, ref) {
  return grcTpMutate(id, (p) => {
    const before = p.linkedControls.length;
    p.linkedControls = p.linkedControls.filter((x) => x !== ref);
    return p.linkedControls.length < before;
  });
}

// "Contrôles liés" (linkedControls) stocke du texte libre pigé dans le
// nom d'un contrôle (datalist de grkLinkNames({controls:true}), pas une
// vraie FK -- même philosophie que le reste du kit). Pour l'affichage
// SEULEMENT (jamais stocké), on résout ce nom contre le registre de
// contrôles pour retrouver sa référence ISO 27001 Annexe A et l'ajouter
// à côté ("Courriel - A.5.2"), même convention que le libellé de ligne
// du registre des contrôles lui-même (grc-controls.js, header:).
// Dégradé silencieux : nom introuvable (renommé/supprimé, ou texte tapé
// à la main sans correspondance) ou grc-controls.js pas chargé sur cette
// page -> le nom brut tel quel.
function grcTpControlDisplayLabel(name) {
  if (typeof getGrcControls !== "function") return name;
  try {
    const c = getGrcControls().find((x) => x && x.name === name);
    return c && c.isoRef ? name + " - " + c.isoRef : name;
  } catch (e) {
    return name;
  }
}

function grcTpActionOverdue(action) {
  if (!action || action.status === "done" || !action.dueAt) return false;
  const t = Date.parse(action.dueAt);
  return !isNaN(t) && t < Date.now();
}

// Nombre de risques liés à ce plan -- défensif (grc-risks.js pas
// forcément chargé sur toutes les pages qui chargent ce module, même
// pattern que grkLinkNames pour un registre sibling absent).
function grcTpLinkedRiskCount(planId) {
  if (typeof getGrcRisks !== "function") return 0;
  try {
    return getGrcRisks().filter((r) => {
      if (!r || !r.treatmentPlan) return false;
      const t = r.treatmentPlan;
      if (Array.isArray(t.planIds)) return t.planIds.indexOf(planId) !== -1;
      return t.planId === planId; // forme legacy à un seul plan, tolérée en lecture
    }).length;
  } catch (e) {
    return 0;
  }
}

async function importGrcTreatmentPlansFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  if (Array.isArray(decoded)) {
    saveGrcTreatmentPlans(decoded);
    return;
  }
  const isShape = decoded && typeof decoded === "object" &&
    typeof decoded.id === "string" && typeof decoded.name === "string";
  if (!isShape) throw new Error(grcT("grc.traitement-risques.invalidImport"));

  const list = getGrcTreatmentPlans();
  const idx = list.findIndex((p) => p.id === decoded.id);
  if (idx === -1) list.push(decoded);
  else list[idx] = decoded;
  saveGrcTreatmentPlans(list);
}

function exportTreatmentPlansCsv(list) {
  if (typeof grkExportGated === "function" && grkExportGated()) return;
  const arr = (Array.isArray(list) ? list : [list]).map(grcTpEnsureShape);
  const rows = [["name", "strategy", "open_actions", "linked_risks"]];
  arr.forEach((p) => {
    rows.push([
      p.name, p.strategy,
      p.actions.filter((a) => a.status !== "done").length,
      grcTpLinkedRiskCount(p.id),
    ]);
  });
  const stamp = (typeof grkDateStamp === "function") ? grkDateStamp() : new Date().toISOString().slice(0, 10);
  if (typeof grkExportCsv === "function") {
    grkExportCsv(rows, "plans-traitement-" + stamp + ".csv");
  }
}

function _grcTpEnumOptions(values, i18nPrefix) {
  return values.map((v) => ({ value: v, label: i18nPrefix + v }));
}

function initGrcTreatmentPlansRegistry() {
  const init = grkRegistry({
    mount: "#grcTreatmentPlansRegistry",
    summary: "#grcTreatmentPlansSummary",
    store: _grcTpStore,
    schema: GRC_TP_SCHEMA,
    idAttr: "data-tp-id",
    listGlobal: "renderGrcTreatmentPlansList",
    deepLink: true,
    i18n: {
      add: "grc.traitement-risques.form.addBtn",
      titleAdd: "grc.traitement-risques.form.title",
      titleEdit: "grc.traitement-risques.form.titleEdit",
      export: "grc.common.btnExport",
      import: "grc.common.btnImport",
    },
    form: [
      { id: "name", label: "grc.traitement-risques.form.name", type: "text", required: true },
      { id: "strategy", label: "grc.traitement-risques.form.strategy", type: "select",
        options: GRC_RT_STRATEGIES.map((s) => ({ value: s, label: "grc.risques.rt.strat." + s })) },
      { id: "rationale", label: "grc.traitement-risques.form.rationale", type: "textarea" },
      { id: "transferTo", label: "grc.traitement-risques.form.transferTo", type: "text" },
    ],
    readForm: (p) => ({ name: p.name, strategy: p.strategy, rationale: p.rationale, transferTo: p.transferTo }),
    submit: (v, editingId) => {
      const fields = grkEnsure(v, { name: { type: "string" }, strategy: { type: "string", enum: GRC_RT_STRATEGIES, default: "mitigate" },
        rationale: { type: "string" }, transferTo: { type: "string" } });
      fields.name = fields.name.trim();
      fields.transferTo = fields.transferTo.trim();
      if (editingId) updateGrcTreatmentPlan(editingId, fields);
      else addGrcTreatmentPlan(fields);
    },
    header: (p) => {
      const n = grcTpLinkedRiskCount(p.id);
      const cells = [
        { text: p.name || "" },
        { badge: { cls: "medium", text: grcT("grc.risques.rt.strat." + p.strategy) } },
      ];
      if (n > 0) {
        const b = document.createElement("span");
        b.className = "grc-rt-badge";
        b.textContent = grcT("grc.traitement-risques.linkedCount").replace("{n}", n);
        cells.push(b);
      }
      return cells;
    },
    panel: typeof renderTreatmentPlanPanel === "function" ? renderTreatmentPlanPanel : null,
    importFn: importGrcTreatmentPlansFromJson,
    summarise: (list) => {
      if (!list.length) return null;
      return {
        chips: [grcT("grc.traitement-risques.summary.count").replace("{n}", list.length)],
      };
    },
    // Le nom seul suffit la plupart du temps, mais avertir quand d'autres
    // risques dépendent encore de ce plan évite une suppression accidentelle
    // qui casserait leur liaison (pas de blocage dur pour autant -- même
    // philosophie que le reste du kit).
    confirmName: (p) => {
      const n = grcTpLinkedRiskCount(p.id);
      return (p.name || "") + (n > 0 ? " — " + grcT("grc.traitement-risques.linkedCount").replace("{n}", n) : "");
    },
  });

  init();
}
