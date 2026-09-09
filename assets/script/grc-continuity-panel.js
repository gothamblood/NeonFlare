/* Panneau d'un plan de continuité (PCA/PRA) -- barre d'onglets rendue
   dans le corps de l'accordéon du registre (grc/continuite.html) par
   grc-continuity.js. Voir spec/business-continuity/.

   AUCUNE logique de store ici : lectures/écritures via les helpers
   grcCont* de grc-continuity.js (héritent du coffre). Chargé APRÈS
   grc-continuity.js et AVANT initGrcContinuityRegistry().

   Réutilise les classes CSS génériques du Mode IR (.grc-ir-tabbar,
   .grc-ir-tab, .grc-ir-tabpanel, .grc-ir-sec, .grc-ir-formgrid,
   .grc-ir-field, .grc-ir-chips, .grc-ir-hint, .grc-ir-stub) + le fix
   <select> opaque (.grc-ir-panel select). Le panneau porte donc
   `class="grc-ir-panel grc-cont-panel"`.

   État (spec/business-continuity/tasks.md) :
   - T2 : squelette.                                       [fait]
   - T3 : barre d'onglets + onglet Synthèse/BIA.           <-- ICI
   - T4 : Dépendances + Redondance.  T5 : Procédure PRA.
   - T6 : Tests.  T7 : Export. */

const GRC_CONT_TABS = [
  { key: "synthese", i18n: "grc.continuite.pca.tab.synthese" },
  { key: "dependances", i18n: "grc.continuite.pca.tab.dependances" },
  { key: "redondance", i18n: "grc.continuite.pca.tab.redondance" },
  { key: "pra", i18n: "grc.continuite.pca.tab.pra" },
  { key: "tests", i18n: "grc.continuite.pca.tab.tests" },
  { key: "export", i18n: "grc.continuite.pca.tab.export" },
];

const _contActiveTab = Object.create(null); // planId -> key (module, non persistant)

/* ---------- petits utilitaires d'affichage (pas de store) ---------- */

const _contFmtDateTime = grkFmtDateTime;

const _contIsoToLocalInput = grkIsoToLocalInput;

const _contField = grkField;

const _contSelect = grkSelect;

// champ "valeur + unité" -> minutes. onCommit(minutesOrNull) au change.
const _contDurField = grkDurField;   // valeur+unité -> minutes (kit)

/* ---------- montage du panneau ------------------------------------- */

function renderContinuityPanel(container, plan) {
  container.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "grc-ir-panel grc-cont-panel";
  panel.dataset.planId = plan.id;

  const tabbar = document.createElement("div");
  tabbar.className = "grc-ir-tabbar";
  tabbar.setAttribute("role", "tablist");
  GRC_CONT_TABS.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grc-ir-tab";
    btn.dataset.tab = t.key;
    btn.textContent = grcT(t.i18n);
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.tabIndex = -1;
    btn.addEventListener("click", () => {
      _contActiveTab[plan.id] = t.key;
      _contSyncTabs(panel, plan.id);
      const on = panel.querySelector('.grc-ir-tab[aria-selected="true"]');
      if (on) on.focus();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (i + dir + GRC_CONT_TABS.length) % GRC_CONT_TABS.length;
      _contActiveTab[plan.id] = GRC_CONT_TABS[next].key;
      _contSyncTabs(panel, plan.id);
      const on = panel.querySelector('.grc-ir-tab[aria-selected="true"]');
      if (on) on.focus();
    });
    tabbar.appendChild(btn);
  });
  panel.appendChild(tabbar);

  const content = document.createElement("div");
  content.className = "grc-ir-tabpanel";
  content.setAttribute("role", "tabpanel");
  panel.appendChild(content);

  container.appendChild(panel);
  _contSyncTabs(panel, plan.id);
}

// Applique l'onglet actif ; re-lit le plan depuis le store à chaque appel.
function _contSyncTabs(panel, planId) {
  const active = _contActiveTab[planId] || "synthese";

  panel.querySelectorAll(".grc-ir-tab").forEach((b) => {
    const on = b.dataset.tab === active;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  });

  const content = panel.querySelector(".grc-ir-tabpanel");
  content.innerHTML = "";

  const plan = getGrcContinuity().find((p) => p.id === planId);
  if (!plan) return;
  const ensured = grcContinuityEnsureShape(plan);
  ensured.id = planId;

  if (active === "synthese") _contRenderSynthese(content, ensured);
  else if (active === "dependances") _contRenderDependencies(content, ensured);
  else if (active === "redondance") _contRenderRedundancy(content, ensured);
  else if (active === "pra") _contRenderDrp(content, ensured);
  else if (active === "tests") _contRenderTests(content, ensured);
  else if (active === "export") _contRenderExport(content, ensured);
}

function _contRefresh(node) {
  const panel = node.closest(".grc-cont-panel");
  if (panel) _contSyncTabs(panel, panel.dataset.planId);
}

/* ---------- onglet Synthèse / BIA -------------------------------- */

function _contRenderSynthese(root, plan) {
  const id = plan.id;

  // 1. Criticité (éditable ici ; service/description via « Modifier »).
  const critSec = document.createElement("section");
  critSec.className = "grc-ir-sec";
  const critSel = _contSelect(GRC_CONT_CRITICALITY, plan.criticality,
    (c) => grcT("grc.continuite.pca.crit." + c));
  critSel.addEventListener("change", () => {
    grcContSetCore(id, { criticality: critSel.value });
    _contRefresh(critSel);
  });
  critSec.appendChild(_contField(grcT("grc.continuite.pca.form.criticality"), critSel));
  const hint = document.createElement("p");
  hint.className = "grc-ir-hint";
  hint.textContent = grcT("grc.continuite.pca.synthese.editHint");
  critSec.appendChild(hint);
  root.appendChild(critSec);

  // 2. BIA : DMIA / RTO / RPO (valeur + unité) + impacts + périodes.
  const biaSec = document.createElement("section");
  biaSec.className = "grc-ir-sec";
  const biaH = document.createElement("h4");
  biaH.textContent = grcT("grc.continuite.pca.bia.title");
  biaSec.appendChild(biaH);

  const biaGrid = document.createElement("div");
  biaGrid.className = "grc-ir-formgrid";
  const setBia = (patch) => { grcContSetBia(id, patch); _contRefresh(root); };
  biaGrid.appendChild(_contDurField(grcT("grc.continuite.pca.form.mtd"), plan.bia.mtdMin, (m) => setBia({ mtdMin: m })));
  biaGrid.appendChild(_contDurField(grcT("grc.continuite.pca.form.rto"), plan.bia.rtoMin, (m) => setBia({ rtoMin: m })));
  biaGrid.appendChild(_contDurField(grcT("grc.continuite.pca.form.rpo"), plan.bia.rpoMin, (m) => setBia({ rpoMin: m })));
  biaSec.appendChild(biaGrid);

  if (grcContRtoGap(plan) != null) {
    const warn = document.createElement("p");
    warn.className = "grc-cont-warn";
    warn.textContent = grcT("grc.continuite.pca.warn.rtoGtMtd");
    biaSec.appendChild(warn);
  }

  const impacts = document.createElement("textarea");
  impacts.rows = 2;
  impacts.value = plan.bia.impacts || "";
  impacts.addEventListener("change", () => grcContSetBia(id, { impacts: impacts.value.trim() }));
  biaSec.appendChild(_contField(grcT("grc.continuite.pca.bia.impacts"), impacts));

  const peak = document.createElement("input");
  peak.type = "text";
  peak.value = plan.bia.peakPeriods || "";
  peak.addEventListener("change", () => grcContSetBia(id, { peakPeriods: peak.value.trim() }));
  biaSec.appendChild(_contField(grcT("grc.continuite.pca.bia.peakPeriods"), peak));

  root.appendChild(biaSec);

  // 3. Revue.
  const revSec = document.createElement("section");
  revSec.className = "grc-ir-sec";
  const revH = document.createElement("h4");
  revH.textContent = grcT("grc.continuite.pca.review.title");
  if (grcContIsReviewOverdue(plan)) {
    const badge = document.createElement("span");
    badge.className = "grc-cont-badge-overdue";
    badge.textContent = grcT("grc.continuite.pca.badge.overdue");
    revH.appendChild(document.createTextNode(" "));
    revH.appendChild(badge);
  }
  revSec.appendChild(revH);

  const revGrid = document.createElement("div");
  revGrid.className = "grc-ir-formgrid";

  const last = document.createElement("input");
  last.type = "datetime-local";
  last.value = _contIsoToLocalInput(plan.review.lastReviewedAt);
  last.addEventListener("change", () => {
    grcContSetReview(id, { lastReviewedAt: last.value });
    _contRefresh(last);
  });
  revGrid.appendChild(_contField(grcT("grc.continuite.pca.review.lastReviewedAt"), last));

  const cad = document.createElement("input");
  cad.type = "number";
  cad.min = "1";
  cad.step = "1";
  cad.value = plan.review.cadenceMonths;
  cad.addEventListener("change", () => {
    grcContSetReview(id, { cadenceMonths: cad.value });
    _contRefresh(cad);
  });
  revGrid.appendChild(_contField(grcT("grc.continuite.pca.review.cadence"), cad));
  revSec.appendChild(revGrid);

  const next = document.createElement("p");
  next.className = "grc-ir-hint";
  next.textContent = grcT("grc.continuite.pca.review.nextDue").replace(
    "{value}", plan.review.lastReviewedAt ? _contFmtDateTime(plan.review.nextDueAt)
      : grcT("grc.continuite.pca.review.never"));
  revSec.appendChild(next);
  root.appendChild(revSec);

  // 4. Compteurs.
  const testedRed = plan.redundancy.filter((r) => r.tested).length;
  const passTests = plan.tests.filter((t) => t.result === "pass").length;
  const counters = [
    grcT("grc.continuite.pca.counters.deps").replace("{n}", plan.dependencies.length),
    grcT("grc.continuite.pca.counters.redundancy").replace("{n}", plan.redundancy.length).replace("{t}", testedRed),
    grcT("grc.continuite.pca.counters.steps").replace("{n}", plan.drp.length),
    grcT("grc.continuite.pca.counters.tests").replace("{n}", plan.tests.length).replace("{p}", passTests),
  ];
  const cSec = document.createElement("section");
  cSec.className = "grc-ir-sec";
  const cH = document.createElement("h4");
  cH.textContent = grcT("grc.continuite.pca.counters.title");
  cSec.appendChild(cH);
  const chips = document.createElement("div");
  chips.className = "grc-ir-chips";
  counters.forEach((t) => {
    const c = document.createElement("span");
    c.className = "grc-ir-chip";
    c.textContent = t;
    chips.appendChild(c);
  });
  cSec.appendChild(chips);
  root.appendChild(cSec);
}

/* ---------- helpers de liste (patron _irInv* du Mode IR) ---------- */

const _contDelBtn = grkDelBtn;

const _contEmptyLine = () => grkEmptyLine("grc.continuite.pca.inv.empty");

function _contInvSec(root, titleKey) {
  const h4 = document.createElement("h4");
  h4.textContent = grcT(titleKey);
  root.appendChild(h4);
  const list = document.createElement("div");
  list.className = "grc-ir-inv-list";
  root.appendChild(list);
  return list;
}

const _contAddForm = grkAddForm;   // onSubmit(form) ; l'arg extra est ignoré

// Noms d'actifs / fournisseurs pour l'autocomplétion (D3, dégradé).
function _contAssetNames() {
  const names = [];
  try {
    if (typeof getGrcAssets === "function") {
      getGrcAssets().forEach((a) => { if (a && a.name) names.push(a.name); });
    }
  } catch (e) {}
  try {
    if (typeof getGrcSuppliers === "function") {
      getGrcSuppliers().forEach((s) => { if (s && s.name) names.push(s.name); });
    }
  } catch (e) {}
  return names;
}

/* ---------- onglet Dépendances (T4) ----------------------------- */

function _contRenderDependencies(root, plan) {
  const id = plan.id;

  let listId = null;
  const names = _contAssetNames();
  if (names.length) {
    listId = "grc-cont-assets-" + id;
    const dl = document.createElement("datalist");
    dl.id = listId;
    names.forEach((n) => { const o = document.createElement("option"); o.value = n; dl.appendChild(o); });
    root.appendChild(dl);
  }

  const list = _contInvSec(root, "grc.continuite.pca.tab.dependances");
  const rows = plan.dependencies;

  rows.forEach((d) => {
    const row = document.createElement("div");
    row.className = "grc-ir-inv-row";

    const type = _contSelect(GRC_CONT_DEP_TYPES, d.type, (t) => grcT("grc.continuite.pca.depType." + t));
    type.addEventListener("change", () => grcContUpdateDependency(id, d.id, { type: type.value }));
    row.appendChild(type);

    const ref = document.createElement("input");
    ref.type = "text";
    ref.className = "grc-ir-inv-grow";
    ref.value = d.ref || "";
    if (listId) ref.setAttribute("list", listId);
    ref.addEventListener("change", () => grcContUpdateDependency(id, d.id, { ref: ref.value.trim() }));
    row.appendChild(ref);

    const note = document.createElement("input");
    note.type = "text";
    note.placeholder = grcT("grc.continuite.pca.inv.note");
    note.value = d.note || "";
    note.addEventListener("change", () => grcContUpdateDependency(id, d.id, { note: note.value.trim() }));
    row.appendChild(note);

    row.appendChild(_contDelBtn(() => { grcContRemoveDependency(id, d.id); _contRefresh(row); }));
    list.appendChild(row);
  });
  if (!rows.length) list.appendChild(_contEmptyLine());

  const type = _contSelect(GRC_CONT_DEP_TYPES, "asset", (t) => grcT("grc.continuite.pca.depType." + t));
  const ref = document.createElement("input");
  ref.type = "text";
  ref.className = "grc-ir-inv-grow";
  ref.placeholder = grcT("grc.continuite.pca.inv.depRef");
  ref.required = true;
  if (listId) ref.setAttribute("list", listId);
  const note = document.createElement("input");
  note.type = "text";
  note.placeholder = grcT("grc.continuite.pca.inv.note");
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.continuite.pca.inv.add");
  const form = _contAddForm([type, ref, note, btn], () => {
    const v = ref.value.trim();
    if (!v) return;
    grcContAddDependency(id, { type: type.value, ref: v, note: note.value.trim() });
    _contRefresh(form);
  });
  root.appendChild(form);
}

/* ---------- onglet Redondance (T4) ----------------------------- */

function _contRenderRedundancy(root, plan) {
  const id = plan.id;
  const list = _contInvSec(root, "grc.continuite.pca.tab.redondance");
  const rows = plan.redundancy;

  rows.forEach((r) => {
    const row = document.createElement("div");
    row.className = "grc-ir-inv-row";

    const kind = _contSelect(GRC_CONT_REDUNDANCY_KINDS, r.kind, (k) => grcT("grc.continuite.pca.redKind." + k));
    kind.addEventListener("change", () => grcContUpdateRedundancy(id, r.id, { kind: kind.value }));
    row.appendChild(kind);

    const ref = document.createElement("input");
    ref.type = "text";
    ref.className = "grc-ir-inv-grow";
    ref.value = r.ref || "";
    ref.addEventListener("change", () => grcContUpdateRedundancy(id, r.id, { ref: ref.value.trim() }));
    row.appendChild(ref);

    const note = document.createElement("input");
    note.type = "text";
    note.placeholder = grcT("grc.continuite.pca.inv.note");
    note.value = r.note || "";
    note.addEventListener("change", () => grcContUpdateRedundancy(id, r.id, { note: note.value.trim() }));
    row.appendChild(note);

    const tested = document.createElement("label");
    tested.className = "grc-cont-tested";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!r.tested;
    cb.addEventListener("change", () => grcContUpdateRedundancy(id, r.id, { tested: cb.checked }));
    tested.appendChild(cb);
    tested.appendChild(document.createTextNode(grcT("grc.continuite.pca.inv.tested")));
    row.appendChild(tested);

    row.appendChild(_contDelBtn(() => { grcContRemoveRedundancy(id, r.id); _contRefresh(row); }));
    list.appendChild(row);
  });
  if (!rows.length) list.appendChild(_contEmptyLine());

  const kind = _contSelect(GRC_CONT_REDUNDANCY_KINDS, "backup", (k) => grcT("grc.continuite.pca.redKind." + k));
  const ref = document.createElement("input");
  ref.type = "text";
  ref.className = "grc-ir-inv-grow";
  ref.placeholder = grcT("grc.continuite.pca.inv.redRef");
  ref.required = true;
  const note = document.createElement("input");
  note.type = "text";
  note.placeholder = grcT("grc.continuite.pca.inv.note");
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.continuite.pca.inv.add");
  const form = _contAddForm([kind, ref, note, btn], () => {
    const v = ref.value.trim();
    if (!v) return;
    grcContAddRedundancy(id, { kind: kind.value, ref: v, note: note.value.trim() });
    _contRefresh(form);
  });
  root.appendChild(form);
}

/* ---------- onglet Procédure PRA (T5) -------------------------------
   Étapes ordonnées : `order` = position (renuméroté par les helpers T1
   grcContAddStep / grcContRemoveStep / grcContMoveStep). ↑/↓ désactivés
   aux extrémités. */

function _contRenderDrp(root, plan) {
  const id = plan.id;
  const list = _contInvSec(root, "grc.continuite.pca.tab.pra");
  const steps = plan.drp;

  steps.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "grc-cont-step";

    const num = document.createElement("span");
    num.className = "grc-cont-step-num";
    num.textContent = s.order;
    row.appendChild(num);

    const fields = document.createElement("div");
    fields.className = "grc-cont-step-fields";

    const text = document.createElement("input");
    text.type = "text";
    text.value = s.text || "";
    text.addEventListener("change", () => grcContUpdateStep(id, s.id, { text: text.value.trim() }));
    fields.appendChild(text);

    const meta = document.createElement("div");
    meta.className = "grc-cont-step-meta";
    const owner = document.createElement("input");
    owner.type = "text";
    owner.placeholder = grcT("grc.continuite.pca.pra.owner");
    owner.value = s.owner || "";
    owner.addEventListener("change", () => grcContUpdateStep(id, s.id, { owner: owner.value.trim() }));
    const done = document.createElement("input");
    done.type = "text";
    done.placeholder = grcT("grc.continuite.pca.pra.doneCriteria");
    done.value = s.doneCriteria || "";
    done.addEventListener("change", () => grcContUpdateStep(id, s.id, { doneCriteria: done.value.trim() }));
    meta.appendChild(owner);
    meta.appendChild(done);
    fields.appendChild(meta);
    row.appendChild(fields);

    const acts = document.createElement("div");
    acts.className = "grc-cont-step-acts";

    const up = document.createElement("button");
    up.type = "button";
    up.className = "grc-ir-kmove";
    up.textContent = "↑";
    up.setAttribute("aria-label", grcT("grc.continuite.pca.pra.up"));
    up.disabled = i === 0;
    up.addEventListener("click", () => { grcContMoveStep(id, s.id, -1); _contRefresh(up); });
    acts.appendChild(up);

    const down = document.createElement("button");
    down.type = "button";
    down.className = "grc-ir-kmove";
    down.textContent = "↓";
    down.setAttribute("aria-label", grcT("grc.continuite.pca.pra.down"));
    down.disabled = i === steps.length - 1;
    down.addEventListener("click", () => { grcContMoveStep(id, s.id, 1); _contRefresh(down); });
    acts.appendChild(down);

    acts.appendChild(_contDelBtn(() => { grcContRemoveStep(id, s.id); _contRefresh(acts); }));
    row.appendChild(acts);

    list.appendChild(row);
  });
  if (!steps.length) list.appendChild(_contEmptyLine());

  const text = document.createElement("input");
  text.type = "text";
  text.className = "grc-ir-inv-grow";
  text.placeholder = grcT("grc.continuite.pca.pra.stepText");
  text.required = true;
  const owner = document.createElement("input");
  owner.type = "text";
  owner.placeholder = grcT("grc.continuite.pca.pra.owner");
  const done = document.createElement("input");
  done.type = "text";
  done.placeholder = grcT("grc.continuite.pca.pra.doneCriteria");
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.continuite.pca.inv.add");
  const form = _contAddForm([text, owner, done, btn], () => {
    const v = text.value.trim();
    if (!v) return;
    grcContAddStep(id, { text: v, owner: owner.value.trim(), doneCriteria: done.value.trim() });
    _contRefresh(form);
  });
  root.appendChild(form);
}

/* ---------- onglet Tests (T6) -------------------------------------
   Journal d'exercices : ts (défaut = maintenant), type, résultat (badge
   coloré), notes / écarts / actions correctives. Édition inline, tri par
   ts (helper T1). « Prochain test conseillé » = dernier ts + cadence de
   revue. */

function _contRenderTests(root, plan) {
  const id = plan.id;
  const tests = plan.tests; // trié par ts croissant (grcContAddTest)

  if (plan.linkedIncident) {
    const li = document.createElement("p");
    li.className = "grc-ir-hint grc-cont-linked";
    li.textContent = grcT("grc.continuite.pca.test.linkedIncident").replace("{value}", plan.linkedIncident);
    root.appendChild(li);
  }

  const hint = document.createElement("p");
  hint.className = "grc-ir-hint";
  const last = tests.length ? tests[tests.length - 1] : null;
  const nextTest = last
    ? contAddMonths(last.ts, plan.review.cadenceMonths || GRC_CONT_DEFAULT_CADENCE) : null;
  hint.textContent = grcT("grc.continuite.pca.test.nextDue").replace(
    "{value}", nextTest ? _contFmtDateTime(nextTest) : grcT("grc.continuite.pca.test.never"));
  root.appendChild(hint);

  const list = document.createElement("div");
  list.className = "grc-ir-inv-list";
  root.appendChild(list);

  tests.slice().reverse().forEach((t) => { // plus récent en haut
    const card = document.createElement("div");
    card.className = "grc-cont-test";

    const head = document.createElement("div");
    head.className = "grc-cont-test-head";

    const when = document.createElement("input");
    when.type = "datetime-local";
    when.value = _contIsoToLocalInput(t.ts);
    when.addEventListener("change", () => { grcContUpdateTest(id, t.id, { ts: when.value }); _contRefresh(when); });
    head.appendChild(when);

    const kind = _contSelect(GRC_CONT_TEST_KINDS, t.kind, (k) => grcT("grc.continuite.pca.testKind." + k));
    kind.addEventListener("change", () => grcContUpdateTest(id, t.id, { kind: kind.value }));
    head.appendChild(kind);

    const result = _contSelect(GRC_CONT_TEST_RESULTS, t.result, (r) => grcT("grc.continuite.pca.testResult." + r));
    result.className = "grc-cont-test-result is-" + t.result;
    result.addEventListener("change", () => { grcContUpdateTest(id, t.id, { result: result.value }); _contRefresh(result); });
    head.appendChild(result);

    head.appendChild(_contDelBtn(() => { grcContRemoveTest(id, t.id); _contRefresh(head); }));
    card.appendChild(head);

    [["notes", "grc.continuite.pca.test.notes"],
     ["gaps", "grc.continuite.pca.test.gaps"],
     ["actions", "grc.continuite.pca.test.actions"]].forEach((pair) => {
      const field = pair[0];
      const inp = document.createElement("input");
      inp.type = "text";
      inp.value = t[field] || "";
      inp.addEventListener("change", () => {
        const patch = {};
        patch[field] = inp.value.trim();
        grcContUpdateTest(id, t.id, patch);
      });
      card.appendChild(_contField(grcT(pair[1]), inp));
    });

    list.appendChild(card);
  });
  if (!tests.length) list.appendChild(_contEmptyLine());

  const kind = _contSelect(GRC_CONT_TEST_KINDS, "tabletop", (k) => grcT("grc.continuite.pca.testKind." + k));
  const when = document.createElement("input");
  when.type = "datetime-local";
  when.value = _contIsoToLocalInput(new Date().toISOString());
  const result = _contSelect(GRC_CONT_TEST_RESULTS, "partial", (r) => grcT("grc.continuite.pca.testResult." + r));
  const notes = document.createElement("input");
  notes.type = "text";
  notes.placeholder = grcT("grc.continuite.pca.test.notes");
  const gaps = document.createElement("input");
  gaps.type = "text";
  gaps.placeholder = grcT("grc.continuite.pca.test.gaps");
  const actions = document.createElement("input");
  actions.type = "text";
  actions.placeholder = grcT("grc.continuite.pca.test.actions");
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.continuite.pca.inv.add");
  const form = _contAddForm([kind, when, result, notes, gaps, actions, btn], () => {
    grcContAddTest(id, {
      kind: kind.value, ts: when.value, result: result.value,
      notes: notes.value.trim(), gaps: gaps.value.trim(), actions: actions.value.trim(),
    });
    _contRefresh(form);
  });
  root.appendChild(form);
}

/* ---------- onglet Export (T7) ----------------------------------------
   5 boutons : JSON (ce plan, objet unique ré-importable), rapport Word,
   rapport PDF, fiche de reprise (PDF 1 page), CSV BIA (tout le registre).
   Aucune requête réseau (Blob / window.open). Coffre verrouillé -> abort
   + alerte (le panneau est déjà derrière vaultGateOr ; garde défensive). */

const _contExportGated = grkExportGated;

const _contDateStamp = grkDateStamp;

const _contPrintWindow = grkPrintWindow;   // (gate coffre incluse ; les appelants gardent leur garde)

// Rapport HTML autonome (échappé). scope = un plan OU un tableau de plans.
function continuityReportBody(scope) {
  const plans = (Array.isArray(scope) ? scope : [scope]).map(grcContinuityEnsureShape);
  const esc = contEscapeHtml;
  const L = (k) => grcT(k);
  const nl2br = (s) => esc(s).replace(/\n/g, "<br>");
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = (typeof grcAuthorName === "function" ? grcAuthorName() : "") || "";
  const yn = (b) => L(b ? "grc.continuite.pca.report.yes" : "grc.continuite.pca.report.no");
  const none = "<p><em>" + L("grc.continuite.pca.report.none") + "</em></p>";

  let h = "<h1>" + L("grc.continuite.pca.report.title") + "</h1>";
  h += "<p><strong>" + L("grc.continuite.pca.report.generatedOn") + " :</strong> " + esc(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.continuite.pca.report.by") + " :</strong> " + esc(author);
  h += "</p>";
  h += "<p><strong>" + L("grc.continuite.pca.report.scope") + " :</strong> " +
    (plans.length === 1 ? esc(plans[0].service || "")
      : L("grc.continuite.pca.report.wholeRegister").replace("{n}", plans.length)) + "</p>";

  plans.forEach((p) => {
    h += "<h2>" + esc(p.service || "") + " — " + L("grc.continuite.pca.crit." + p.criticality) + "</h2>";
    if (p.description) h += "<p>" + nl2br(p.description) + "</p>";
    if (p.owner) h += "<p><strong>" + L("grc.continuite.pca.form.owner") + " :</strong> " + esc(p.owner) + "</p>";

    // BIA
    h += "<h3>" + L("grc.continuite.pca.bia.title") + "</h3><table border='1' cellspacing='0' cellpadding='4'><tbody>";
    h += "<tr><th>" + L("grc.continuite.pca.form.mtd") + "</th><td>" + esc(contFmtDuration(p.bia.mtdMin)) + "</td></tr>";
    h += "<tr><th>" + L("grc.continuite.pca.form.rto") + "</th><td>" + esc(contFmtDuration(p.bia.rtoMin)) + "</td></tr>";
    h += "<tr><th>" + L("grc.continuite.pca.form.rpo") + "</th><td>" + esc(contFmtDuration(p.bia.rpoMin)) + "</td></tr>";
    h += "</tbody></table>";
    if (grcContRtoGap(p) != null) h += "<p><em>" + L("grc.continuite.pca.warn.rtoGtMtd") + "</em></p>";
    if (p.bia.impacts) h += "<p><strong>" + L("grc.continuite.pca.bia.impacts") + " :</strong><br>" + nl2br(p.bia.impacts) + "</p>";
    if (p.bia.peakPeriods) h += "<p><strong>" + L("grc.continuite.pca.bia.peakPeriods") + " :</strong> " + esc(p.bia.peakPeriods) + "</p>";

    // Dépendances
    h += "<h3>" + L("grc.continuite.pca.tab.dependances") + " (" + p.dependencies.length + ")</h3>";
    if (p.dependencies.length) {
      h += "<table border='1' cellspacing='0' cellpadding='4'><thead><tr><th>" + L("grc.continuite.pca.report.type") +
        "</th><th>" + L("grc.continuite.pca.report.ref") + "</th><th>" + L("grc.continuite.pca.inv.note") + "</th></tr></thead><tbody>";
      p.dependencies.forEach((d) => {
        h += "<tr><td>" + L("grc.continuite.pca.depType." + d.type) + "</td><td>" + esc(d.ref || "") + "</td><td>" + esc(d.note || "") + "</td></tr>";
      });
      h += "</tbody></table>";
    } else h += none;

    // Redondance
    h += "<h3>" + L("grc.continuite.pca.tab.redondance") + " (" + p.redundancy.length + ")</h3>";
    if (p.redundancy.length) {
      h += "<table border='1' cellspacing='0' cellpadding='4'><thead><tr><th>" + L("grc.continuite.pca.report.type") +
        "</th><th>" + L("grc.continuite.pca.report.ref") + "</th><th>" + L("grc.continuite.pca.report.tested") +
        "</th><th>" + L("grc.continuite.pca.inv.note") + "</th></tr></thead><tbody>";
      p.redundancy.forEach((r) => {
        h += "<tr><td>" + L("grc.continuite.pca.redKind." + r.kind) + "</td><td>" + esc(r.ref || "") +
          "</td><td>" + yn(!!r.tested) + "</td><td>" + esc(r.note || "") + "</td></tr>";
      });
      h += "</tbody></table>";
    } else h += none;

    // Procédure PRA
    h += "<h3>" + L("grc.continuite.pca.tab.pra") + " (" + p.drp.length + ")</h3>";
    if (p.drp.length) {
      h += "<ol>";
      p.drp.forEach((s) => {
        h += "<li>" + esc(s.text || "") + (s.owner ? " <em>(" + esc(s.owner) + ")</em>" : "") +
          (s.doneCriteria ? "<br><small>" + L("grc.continuite.pca.pra.doneCriteria") + " : " + esc(s.doneCriteria) + "</small>" : "") + "</li>";
      });
      h += "</ol>";
    } else h += none;

    // Tests
    h += "<h3>" + L("grc.continuite.pca.tab.tests") + " (" + p.tests.length + ")</h3>";
    if (p.tests.length) {
      h += "<table border='1' cellspacing='0' cellpadding='4'><thead><tr><th>" + L("grc.continuite.pca.test.when") +
        "</th><th>" + L("grc.continuite.pca.report.type") + "</th><th>" + L("grc.continuite.pca.test.result") +
        "</th><th>" + L("grc.continuite.pca.test.gaps") + "</th><th>" + L("grc.continuite.pca.test.actions") + "</th></tr></thead><tbody>";
      p.tests.forEach((t) => {
        h += "<tr><td>" + esc(_contFmtDateTime(t.ts)) + "</td><td>" + L("grc.continuite.pca.testKind." + t.kind) +
          "</td><td>" + L("grc.continuite.pca.testResult." + t.result) + "</td><td>" + esc(t.gaps || "") +
          "</td><td>" + esc(t.actions || "") + "</td></tr>";
      });
      h += "</tbody></table>";
    } else h += none;

    // Revue
    const overdue = grcContIsReviewOverdue(p);
    h += "<h3>" + L("grc.continuite.pca.review.title") + "</h3><p>" +
      L("grc.continuite.pca.review.lastReviewedAt") + " : " + esc(_contFmtDateTime(p.review.lastReviewedAt)) +
      " — " + L("grc.continuite.pca.review.cadence") + " : " + esc(p.review.cadenceMonths) +
      " — <strong>" + L(overdue ? "grc.continuite.pca.report.reviewOverdue" : "grc.continuite.pca.report.reviewOk") + "</strong></p>";
  });

  return h;
}

function continuityCardBody(plan) {
  const p = grcContinuityEnsureShape(plan);
  const esc = contEscapeHtml;
  const L = (k) => grcT(k);
  let h = "<h1>" + L("grc.continuite.pca.card.title") + " — " + esc(p.service || "") + "</h1>";
  h += "<p><strong>" + L("grc.continuite.pca.form.criticality") + " :</strong> " + L("grc.continuite.pca.crit." + p.criticality) + "</p>";
  h += "<p><strong>DMIA</strong> " + esc(contFmtDuration(p.bia.mtdMin)) +
    " &nbsp;·&nbsp; <strong>RTO</strong> " + esc(contFmtDuration(p.bia.rtoMin)) +
    " &nbsp;·&nbsp; <strong>RPO</strong> " + esc(contFmtDuration(p.bia.rpoMin)) + "</p>";

  h += "<h2>" + L("grc.continuite.pca.tab.pra") + "</h2>";
  if (p.drp.length) {
    h += "<ol>";
    p.drp.forEach((s) => {
      h += "<li>" + esc(s.text || "") + (s.owner ? " <em>(" + esc(s.owner) + ")</em>" : "") +
        (s.doneCriteria ? "<br><small>" + esc(s.doneCriteria) + "</small>" : "") + "</li>";
    });
    h += "</ol>";
  } else h += "<p><em>" + L("grc.continuite.pca.report.none") + "</em></p>";

  const contacts = [];
  if (p.owner) contacts.push(p.owner);
  p.drp.forEach((s) => { if (s.owner && contacts.indexOf(s.owner) === -1) contacts.push(s.owner); });
  if (contacts.length) {
    h += "<h2>" + L("grc.continuite.pca.card.contacts") + "</h2><p>" + contacts.map(esc).join(" &nbsp;·&nbsp; ") + "</p>";
  }
  if (p.dependencies.length) {
    h += "<h2>" + L("grc.continuite.pca.card.vitalDeps") + "</h2><ul>";
    p.dependencies.forEach((d) => {
      h += "<li>" + L("grc.continuite.pca.depType." + d.type) + " — " + esc(d.ref || "") + "</li>";
    });
    h += "</ul>";
  }
  return h;
}

// Neutralise l'injection de formule (Excel/Sheets) et échappe pour le CSV.
const contCsvCell = grkCsvCell;

async function exportContinuityAsJson(scope) {
  if (_contExportGated()) return;
  const data = await vaultMaybeEncryptForExport(scope);
  const name = Array.isArray(scope)
    ? "pca-continuite-" + _contDateStamp() + ".json"
    : "pca-" + contSlug(scope && scope.service) + "-" + _contDateStamp() + ".json";
  exportJsonFile(data, name);
}

function exportContinuityReportAsWord(scope) {
  if (_contExportGated()) return;
  const html =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>" + contEscapeHtml(grcT("grc.continuite.pca.report.title")) + "</title></head>" +
    "<body style='font-family:Calibri,Arial,sans-serif;'>" + continuityReportBody(scope) + "</body></html>";
  const base = Array.isArray(scope) ? "pca-continuite" : "pca-" + contSlug(scope && scope.service);
  triggerDownload(new Blob(["\ufeff", html], { type: "application/msword" }), base + "-" + _contDateStamp() + ".doc");
}

function exportContinuityReportAsPdf(scope) {
  if (_contExportGated()) return;
  _contPrintWindow(continuityReportBody(scope), grcT("grc.continuite.pca.report.title"));
}

function exportContinuityCard(plan) {
  if (_contExportGated()) return;
  _contPrintWindow(continuityCardBody(plan), grcT("grc.continuite.pca.card.title"));
}

function exportContinuityBiaCsv(plans) {
  if (_contExportGated()) return;
  const list = (Array.isArray(plans) ? plans : [plans]).map(grcContinuityEnsureShape);
  const rows = [["service", "criticite", "DMIA_min", "RTO_min", "RPO_min", "revue_ok"]];
  list.forEach((p) => {
    rows.push([
      p.service, p.criticality,
      p.bia.mtdMin == null ? "" : p.bia.mtdMin,
      p.bia.rtoMin == null ? "" : p.bia.rtoMin,
      p.bia.rpoMin == null ? "" : p.bia.rpoMin,
      grcContIsReviewOverdue(p) ? "0" : "1",
    ]);
  });
  const csv = rows.map((r) => r.map(contCsvCell).join(";")).join("\r\n") + "\r\n";
  triggerDownload(new Blob(["\ufeff", csv], { type: "text/csv" }), "pca-bia-" + _contDateStamp() + ".csv");
}

function _contRenderExport(root, plan) {
  const hint = document.createElement("p");
  hint.className = "grc-ir-hint";
  hint.textContent = grcT("grc.continuite.pca.export.hint");
  root.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "grc-ir-export-grid";
  const mk = (labelKey, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-registry-add-btn";
    b.textContent = grcT(labelKey);
    b.addEventListener("click", () => fn(getGrcContinuity().find((p) => p.id === plan.id) || plan));
    return b;
  };
  grid.appendChild(mk("grc.continuite.pca.export.json", exportContinuityAsJson));
  grid.appendChild(mk("grc.continuite.pca.export.word", exportContinuityReportAsWord));
  grid.appendChild(mk("grc.continuite.pca.export.pdf", exportContinuityReportAsPdf));
  grid.appendChild(mk("grc.continuite.pca.export.card", exportContinuityCard));
  grid.appendChild(mk("grc.continuite.pca.export.csv", () => exportContinuityBiaCsv(getGrcContinuity())));
  root.appendChild(grid);
}
