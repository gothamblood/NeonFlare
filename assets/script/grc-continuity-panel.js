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
  { key: "bia", i18n: "grc.continuite.pca.tab.bia" },
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
  else if (active === "bia") _contRenderBiaTime(content, ensured);
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
  const mtdF = _contDurField(grcT("grc.continuite.pca.form.mtd"), plan.bia.mtdMin, (m) => setBia({ mtdMin: m }));
  const rtoF = _contDurField(grcT("grc.continuite.pca.form.rto"), plan.bia.rtoMin, (m) => setBia({ rtoMin: m }));
  const rpoF = _contDurField(grcT("grc.continuite.pca.form.rpo"), plan.bia.rpoMin, (m) => setBia({ rpoMin: m }));
  const maoF = _contDurField(grcT("grc.continuite.pca.form.mao"), plan.bia.maoMin, (m) => setBia({ maoMin: m }));
  mtdF.title = grcT("grc.continuite.pca.form.mtdHint");
  rtoF.title = grcT("grc.continuite.pca.form.rtoHint");
  rpoF.title = grcT("grc.continuite.pca.form.rpoHint");
  maoF.title = grcT("grc.continuite.pca.form.maoHint");
  maoF.classList.add("grc-cont-mao");
  biaGrid.appendChild(mtdF);
  biaGrid.appendChild(maoF);
  biaGrid.appendChild(rtoF);
  biaGrid.appendChild(rpoF);
  biaSec.appendChild(biaGrid);

  // MBCO : niveau de service plancher (texte + % facultatif).
  const mbcoGrid = document.createElement("div");
  mbcoGrid.className = "grc-ir-formgrid";
  const mbco = document.createElement("input");
  mbco.type = "text";
  mbco.className = "grc-cont-mbco";
  mbco.value = plan.bia.mbco || "";
  mbco.addEventListener("change", () => grcContSetBia(id, { mbco: mbco.value.trim() }));
  mbcoGrid.appendChild(_contField(grcT("grc.continuite.pca.form.mbco"), mbco));
  const mbcoPct = document.createElement("input");
  mbcoPct.type = "text";
  mbcoPct.className = "grc-cont-mbco-pct";
  mbcoPct.value = plan.bia.mbcoPct == null ? "" : String(plan.bia.mbcoPct);
  mbcoPct.addEventListener("change", () => { grcContSetBia(id, { mbcoPct: mbcoPct.value }); _contRefresh(mbcoPct); });
  mbcoGrid.appendChild(_contField(grcT("grc.continuite.pca.form.mbcoPct"), mbcoPct));
  biaSec.appendChild(mbcoGrid);

  const biaHint = document.createElement("p");
  biaHint.className = "grc-ir-hint";
  biaHint.textContent =
    grcT("grc.continuite.pca.form.mtdHint") + " " +
    grcT("grc.continuite.pca.form.rtoHint") + " " +
    grcT("grc.continuite.pca.form.rpoHint");
  biaSec.appendChild(biaHint);

  if (grcContRtoGap(plan) != null) {
    const warn = document.createElement("p");
    warn.className = "grc-cont-warn";
    warn.textContent = grcT("grc.continuite.pca.warn.rtoGtMtd");
    biaSec.appendChild(warn);
  }
  // Autres règles de cohérence RTO ≤ MAO ≤ DMIA, RPO ≤ RTO (rto>dmia
  // déjà couverte par l'alerte historique juste au-dessus).
  grcContCoherence(plan).filter((c) => c !== "rto>dmia").forEach((c) => {
    const warn = document.createElement("p");
    warn.className = "grc-cont-warn grc-cont-coherence";
    warn.dataset.rule = c;
    warn.textContent = grcT("grc.continuite.pca.warn." + c.replace(">", "Gt"));
    biaSec.appendChild(warn);
  });

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

  // 2 bis. Gestion de crise : SPOC + cellule de crise décisionnelle (CCD).
  _contRenderCrisis(root, plan);

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
    grcT("grc.continuite.pca.summary.spof").replace("{n}", grcContSpofCount(plan)),
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

/* Gestion de crise (spec/grc-restructure/ Q4) : SPOC du plan + membres
   de la CCD (rôle, nom, contact). Contacts = données personnelles, mais
   le registre entier est déjà chiffré par le coffre. */
function _contRenderCrisis(root, plan) {
  const id = plan.id;
  const sec = document.createElement("section");
  sec.className = "grc-ir-sec grc-cont-crisis";
  const h = document.createElement("h4");
  h.textContent = grcT("grc.continuite.pca.crisis.title");
  sec.appendChild(h);

  const spoc = document.createElement("input");
  spoc.type = "text";
  spoc.className = "grc-cont-spoc";
  spoc.value = plan.spoc || "";
  spoc.addEventListener("change", () => grcContSetCore(id, { spoc: spoc.value }));
  sec.appendChild(_contField(grcT("grc.continuite.pca.crisis.spoc"), spoc));

  const list = document.createElement("div");
  list.className = "grc-ir-inv-list grc-cont-ccd-list";
  const lh = document.createElement("p");
  lh.className = "grc-ir-hint";
  lh.textContent = grcT("grc.continuite.pca.crisis.ccd");
  sec.appendChild(lh);
  sec.appendChild(list);
  plan.ccd.forEach((m) => {
    const row = document.createElement("div");
    row.className = "grc-ir-inv-row";
    ["role", "name", "contact"].forEach((k) => {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = grcT("grc.continuite.pca.crisis." + k);
      inp.value = m[k] || "";
      if (k !== "contact") inp.className = "grc-ir-inv-grow";
      inp.addEventListener("change", () => { const c = {}; c[k] = inp.value; grcContUpdateCcd(id, m.id, c); });
      row.appendChild(inp);
    });
    row.appendChild(_contDelBtn(() => { grcContRemoveCcd(id, m.id); _contRefresh(row); }));
    list.appendChild(row);
  });
  if (!plan.ccd.length) list.appendChild(_contEmptyLine());

  const inputs = ["role", "name", "contact"].map((k) => {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = grcT("grc.continuite.pca.crisis." + k);
    if (k === "name") inp.required = true;
    return inp;
  });
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.continuite.pca.inv.add");
  const form = _contAddForm(inputs.concat([btn]), () => {
    if (!inputs[1].value.trim()) return;
    grcContAddCcd(id, { role: inputs[0].value, name: inputs[1].value, contact: inputs[2].value });
    _contRefresh(form);
  });
  form.classList.add("grc-cont-ccd-add");
  sec.appendChild(form);
  root.appendChild(sec);
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
    // Lien réel (chaine.md CH2) pour un actif ou un fournisseur.
    if (d.type === "asset" || d.type === "supplier") {
      const tgt = _contTargetSelect(d.type, d.targetId);
      tgt.addEventListener("change", () => {
        const o = tgt.selectedOptions[0];
        const patch = { targetId: tgt.value };
        if (tgt.value && o) patch.ref = o.textContent;
        grcContUpdateDependency(id, d.id, patch);
        _contRefresh(row);
      });
      row.appendChild(tgt);
    }

    const note = document.createElement("input");
    note.type = "text";
    note.placeholder = grcT("grc.continuite.pca.inv.note");
    note.value = d.note || "";
    note.addEventListener("change", () => grcContUpdateDependency(id, d.id, { note: note.value.trim() }));
    row.appendChild(note);

    const spofLbl = document.createElement("label");
    spofLbl.className = "grc-sup-check grc-cont-spof";
    spofLbl.title = grcT("grc.continuite.pca.spofHint");
    const spof = document.createElement("input");
    spof.type = "checkbox";
    spof.checked = !!d.spof;
    spof.addEventListener("change", () => { grcContUpdateDependency(id, d.id, { spof: spof.checked }); _contRefresh(row); });
    spofLbl.appendChild(spof);
    spofLbl.appendChild(document.createTextNode(" SPOF"));
    row.appendChild(spofLbl);

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
  const spofLbl = document.createElement("label");
  spofLbl.className = "grc-sup-check";
  spofLbl.title = grcT("grc.continuite.pca.spofHint");
  const spof = document.createElement("input");
  spof.type = "checkbox";
  spof.className = "grc-cont-spof-new";
  spofLbl.appendChild(spof);
  spofLbl.appendChild(document.createTextNode(" SPOF"));
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.continuite.pca.inv.add");
  const form = _contAddForm([type, ref, note, spofLbl, btn], () => {
    const v = ref.value.trim();
    if (!v) return;
    grcContAddDependency(id, { type: type.value, ref: v, note: note.value.trim(), spof: spof.checked });
    _contRefresh(form);
  });
  root.appendChild(form);
}

function _contTargetSelect(type, current) {
  const s = document.createElement("select");
  s.className = "grc-cont-target";
  s.title = grcT("grc.continuite.pca.inv.target");
  const opts = [{ value: "", label: grcT("grc.continuite.pca.inv.target") + " —" }]
    .concat(typeof grcLinksKitOptions === "function" ? grcLinksKitOptions(type === "asset" ? "asset" : "supplier") : []);
  opts.forEach((o) => {
    const op = document.createElement("option");
    op.value = o.value;
    op.textContent = o.label;
    s.appendChild(op);
  });
  s.value = current || "";
  return s;
}

/* ---------- onglet BIA dans le temps (grc-normes N2) --------------
   Impacts par horizon (1 à 5 par nature) et ressources nécessaires ;
   la DMIA suggérée = premier horizon où un impact atteint
   GRC_CONT_UNACCEPTABLE. Rien n'est remplacé sans action explicite. */
function _contRenderBiaTime(root, plan) {
  const id = plan.id;
  const sec = document.createElement("section");
  sec.className = "grc-ir-sec grc-cont-bia-time";
  const h = document.createElement("h4");
  h.textContent = grcT("grc.continuite.pca.biat.title");
  sec.appendChild(h);
  const hint = document.createElement("p");
  hint.className = "grc-ir-hint";
  hint.textContent = grcT("grc.continuite.pca.biat.hint");
  sec.appendChild(hint);

  const rows = plan.bia.timeline.length ? plan.bia.timeline
    : GRC_CONT_BIA_HORIZONS.map((m) => ({ id: "", horizonMin: m, financier: 0, operationnel: 0, reputation: 0, legal: 0, note: "" }));
  const table = document.createElement("table");
  table.className = "grc-fiche-table grc-cont-bia-table";
  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  ["horizon"].concat(GRC_CONT_IMPACT_KINDS).concat(["note"]).forEach((k) => {
    const th = document.createElement("th");
    th.textContent = grcT("grc.continuite.pca.biat." + k);
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const levels = [0, 1, 2, 3, 4, 5];
  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.dataset.row = String(i);
    const td0 = document.createElement("td");
    td0.textContent = contFmtDuration(r.horizonMin);
    tr.appendChild(td0);
    GRC_CONT_IMPACT_KINDS.forEach((k) => {
      const td = document.createElement("td");
      const s = _contSelect(levels, r[k] || 0, (n) => (n ? String(n) + " — " + grcT("grc.continuite.pca.biat.l" + n) : "—"));
      s.dataset.kind = k;
      td.appendChild(s);
      tr.appendChild(td);
    });
    const tdn = document.createElement("td");
    const note = document.createElement("input");
    note.type = "text";
    note.dataset.kind = "note";
    note.value = r.note || "";
    tdn.appendChild(note);
    tr.appendChild(tdn);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  const wrap = document.createElement("div");
  wrap.className = "grc-fiche-table-wrap";
  wrap.appendChild(table);
  sec.appendChild(wrap);

  const save = document.createElement("button");
  save.type = "button";
  save.className = "grc-registry-add-btn grc-cont-bia-save";
  save.textContent = grcT("grc.continuite.pca.biat.save");
  save.addEventListener("click", () => {
    const out = rows.map((r, i) => {
      const tr = tbody.querySelector('tr[data-row="' + i + '"]');
      const v = { id: r.id || "", horizonMin: r.horizonMin, note: tr.querySelector('[data-kind="note"]').value.trim() };
      GRC_CONT_IMPACT_KINDS.forEach((k) => { v[k] = Number(tr.querySelector('[data-kind="' + k + '"]').value) || 0; });
      v.level = Math.max(v.financier, v.operationnel, v.reputation, v.legal);
      return v;
    });
    grcContSetTimeline(id, out);
    _contRefresh(save);
  });
  sec.appendChild(save);

  // DMIA suggérée
  const sug = grcContSuggestedMtd(plan);
  const sp = document.createElement("p");
  sp.className = "grc-cont-bia-suggest";
  if (sug != null) {
    sp.textContent = grcT("grc.continuite.pca.biat.suggest").replace("{d}", contFmtDuration(sug)) +
      (plan.bia.mtdMin != null ? " " + grcT("grc.continuite.pca.biat.current").replace("{d}", contFmtDuration(plan.bia.mtdMin)) : "");
    if (plan.bia.mtdMin !== sug) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "grc-registry-io-btn grc-cont-bia-apply";
      b.textContent = grcT("grc.continuite.pca.biat.apply");
      b.addEventListener("click", () => { grcContSetBia(id, { mtdMin: sug }); _contRefresh(b); });
      sp.appendChild(document.createTextNode(" "));
      sp.appendChild(b);
    }
  } else {
    sp.textContent = grcT("grc.continuite.pca.biat.noSuggest");
  }
  sec.appendChild(sp);
  root.appendChild(sec);

  // Ressources nécessaires dans le temps
  const rs = document.createElement("section");
  rs.className = "grc-ir-sec grc-cont-bia-res";
  const rh = document.createElement("h4");
  rh.textContent = grcT("grc.continuite.pca.biat.resTitle");
  rs.appendChild(rh);
  const list = document.createElement("div");
  rs.appendChild(list);
  const resRows = plan.bia.resources;
  const labelOf = (r) => {
    const type = r.kind === "role" ? "role" : r.kind === "asset" ? "asset" : r.kind === "supplier" ? "supplier" : null;
    const rid = r.roleId || r.assetId || r.supplierId;
    if (type && rid && typeof grcLinksLabel === "function") return grcLinksLabel(type, rid);
    return r.label || "";
  };
  resRows.forEach((r) => {
    const row = document.createElement("div");
    row.className = "grc-ir-inv-row";
    row.appendChild(document.createTextNode(grcT("grc.continuite.pca.biat.kind." + r.kind) + " — " + labelOf(r) +
      (r.quantity ? " × " + r.quantity : "") + (r.horizonMin != null ? " (" + contFmtDuration(r.horizonMin) + ")" : "")));
    row.appendChild(_contDelBtn(() => { grcContSetResources(id, resRows.filter((x) => x.id !== r.id)); _contRefresh(row); }));
    list.appendChild(row);
  });
  if (!resRows.length) list.appendChild(_contEmptyLine());
  const kind = _contSelect(GRC_CONT_RES_KINDS, "role", (k) => grcT("grc.continuite.pca.biat.kind." + k));
  const tgt = document.createElement("select");
  const fillTgt = () => {
    tgt.innerHTML = "";
    const type = kind.value === "role" ? "role" : kind.value === "asset" ? "asset" : kind.value === "supplier" ? "supplier" : null;
    tgt.hidden = !type;
    (type && typeof grcLinksKitOptions === "function" ? grcLinksKitOptions(type) : []).forEach((o) => {
      const op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.label;
      tgt.appendChild(op);
    });
  };
  kind.addEventListener("change", fillTgt);
  fillTgt();
  const lbl = document.createElement("input");
  lbl.type = "text";
  lbl.placeholder = grcT("grc.continuite.pca.biat.label");
  const qty = document.createElement("input");
  qty.type = "text";
  qty.placeholder = grcT("grc.continuite.pca.biat.qty");
  const hz = _contSelect([""].concat(GRC_CONT_BIA_HORIZONS.map(String)), "", (m) => (m ? contFmtDuration(Number(m)) : grcT("grc.continuite.pca.biat.horizon")));
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.continuite.pca.inv.add");
  const form = _contAddForm([kind, tgt, lbl, qty, hz, btn], () => {
    const r = { kind: kind.value, label: lbl.value.trim(), quantity: qty.value.trim(), horizonMin: hz.value ? Number(hz.value) : null };
    if (kind.value === "role") r.roleId = tgt.value;
    if (kind.value === "asset") r.assetId = tgt.value;
    if (kind.value === "supplier") r.supplierId = tgt.value;
    if (!r.label && !tgt.value) return;
    grcContSetResources(id, resRows.concat([r]));
    _contRefresh(form);
  });
  rs.appendChild(form);
  root.appendChild(rs);
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
    h += "<tr><th>" + L("grc.continuite.pca.form.mao") + "</th><td>" + esc(contFmtDuration(p.bia.maoMin)) + "</td></tr>";
    h += "<tr><th>" + L("grc.continuite.pca.form.mbco") + "</th><td>" + esc(p.bia.mbco || "") +
      (p.bia.mbcoPct != null ? " (" + esc(p.bia.mbcoPct) + " %)" : "") + "</td></tr>";
    h += "</tbody></table>";
    if (grcContRtoGap(p) != null) h += "<p><em>" + L("grc.continuite.pca.warn.rtoGtMtd") + "</em></p>";
    grcContCoherence(p).filter((c) => c !== "rto>dmia").forEach((c) => {
      h += "<p><em>" + L("grc.continuite.pca.warn." + c.replace(">", "Gt")) + "</em></p>";
    });
    if (p.spoc || p.ccd.length) {
      h += "<h3>" + L("grc.continuite.pca.crisis.title") + "</h3>";
      if (p.spoc) h += "<p><strong>" + L("grc.continuite.pca.crisis.spoc") + " :</strong> " + esc(p.spoc) + "</p>";
      if (p.ccd.length) {
        h += "<table border='1' cellspacing='0' cellpadding='4'><thead><tr><th>" + L("grc.continuite.pca.crisis.role") +
          "</th><th>" + L("grc.continuite.pca.crisis.name") + "</th><th>" + L("grc.continuite.pca.crisis.contact") + "</th></tr></thead><tbody>";
        p.ccd.forEach((m) => { h += "<tr><td>" + esc(m.role) + "</td><td>" + esc(m.name) + "</td><td>" + esc(m.contact) + "</td></tr>"; });
        h += "</tbody></table>";
      }
    }
    if (p.bia.impacts) h += "<p><strong>" + L("grc.continuite.pca.bia.impacts") + " :</strong><br>" + nl2br(p.bia.impacts) + "</p>";
    if (p.bia.peakPeriods) h += "<p><strong>" + L("grc.continuite.pca.bia.peakPeriods") + " :</strong> " + esc(p.bia.peakPeriods) + "</p>";

    // Dépendances
    h += "<h3>" + L("grc.continuite.pca.tab.dependances") + " (" + p.dependencies.length + ")</h3>";
    if (p.dependencies.length) {
      h += "<table border='1' cellspacing='0' cellpadding='4'><thead><tr><th>" + L("grc.continuite.pca.report.type") +
        "</th><th>" + L("grc.continuite.pca.report.ref") + "</th><th>" + L("grc.continuite.pca.inv.note") + "</th><th>SPOF</th></tr></thead><tbody>";
      p.dependencies.forEach((d) => {
        h += "<tr><td>" + L("grc.continuite.pca.depType." + d.type) + "</td><td>" + esc(d.ref || "") + "</td><td>" + esc(d.note || "") +
          "</td><td>" + yn(!!d.spof) + "</td></tr>";
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
  h += "<p><strong>" + L("grc.continuite.pca.short.mtd") + "</strong> " + esc(contFmtDuration(p.bia.mtdMin)) +
    " &nbsp;·&nbsp; <strong>MAO</strong> " + esc(contFmtDuration(p.bia.maoMin)) +
    " &nbsp;·&nbsp; <strong>RTO</strong> " + esc(contFmtDuration(p.bia.rtoMin)) +
    " &nbsp;·&nbsp; <strong>RPO</strong> " + esc(contFmtDuration(p.bia.rpoMin)) + "</p>";
  if (p.bia.mbco) h += "<p><strong>MBCO</strong> " + esc(p.bia.mbco) + (p.bia.mbcoPct != null ? " (" + esc(p.bia.mbcoPct) + " %)" : "") + "</p>";
  if (p.spoc) h += "<p><strong>SPOC</strong> " + esc(p.spoc) + "</p>";

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
  p.ccd.forEach((m) => {
    const c = [m.role, m.name, m.contact].filter(Boolean).join(" — ");
    if (c && contacts.indexOf(c) === -1) contacts.push(c);
  });
  if (contacts.length) {
    h += "<h2>" + L("grc.continuite.pca.card.contacts") + "</h2><p>" + contacts.map(esc).join(" &nbsp;·&nbsp; ") + "</p>";
  }
  if (p.dependencies.length) {
    h += "<h2>" + L("grc.continuite.pca.card.vitalDeps") + "</h2><ul>";
    p.dependencies.forEach((d) => {
      h += "<li>" + L("grc.continuite.pca.depType." + d.type) + " — " + esc(d.ref || "") + (d.spof ? " <strong>(SPOF)</strong>" : "") + "</li>";
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
  const rows = [["service", "criticite", "DMIA_min", "RTO_min", "RPO_min", "revue_ok",
    "MAO_min", "MBCO", "MBCO_pct", "SPOF", "SPOC", "coherence"]];
  list.forEach((p) => {
    rows.push([
      p.service, p.criticality,
      p.bia.mtdMin == null ? "" : p.bia.mtdMin,
      p.bia.rtoMin == null ? "" : p.bia.rtoMin,
      p.bia.rpoMin == null ? "" : p.bia.rpoMin,
      grcContIsReviewOverdue(p) ? "0" : "1",
      p.bia.maoMin == null ? "" : p.bia.maoMin,
      p.bia.mbco || "",
      p.bia.mbcoPct == null ? "" : p.bia.mbcoPct,
      grcContSpofCount(p),
      p.spoc || "",
      grcContCoherence(p).join(" "),
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
