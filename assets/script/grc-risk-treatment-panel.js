/* Panneau de plan(s) de traitement d'un risque -- rendu dans le corps de
   l'accordéon du registre des risques (grc/analyse-risques.html) par
   grc-risks.js quand grcRiskTreatmentPlans(risk).length > 0. Voir
   spec/grc-registry-upgrades/70-risk-treatment.md et la note d'en-tête
   de grc-risks.js sur le passage à un registre PARTAGÉ, many-to-many :
   un risque peut cumuler PLUSIEURS plans (ex. MFA + segmentation réseau
   sur le même risque), un plan peut aussi être lié à plusieurs risques.

   Onglet "Plans" : une carte par plan lié (nom, "partagé avec N autre(s)
   risque(s)", stratégie/rationale/transferTo -- mutent le PLAN PARTAGÉ
   via grcTp*(planId, ...), donc modifier depuis un risque modifie bien
   le même plan pour tout autre risque qui y est lié -- actions
   ordonnées, contrôles liés, bouton délier CE plan) + le formulaire
   créer/lier un plan DE PLUS en bas (réutilise _grcRiskRenderTreatmentLinkUi
   de grc-risks.js, même UI que l'état "aucun plan").
   Résiduel et Acceptation restent UN SEUL couple propre à CE risque
   (grcRisk*, comme avant), pas par plan. AUCUNE logique de store ici.
   Chargé APRÈS grc-risks.js ET grc-treatment-plans.js. Utilise grkPanel /
   grk* du kit (grc-registry-kit.js). */

/* ---------- helpers d'affichage --------------------------- */

function _rtStore() {
  return { get: () => (typeof getGrcRisks === "function" ? getGrcRisks() : []) };
}

// Vue pour les onglets : risque + treatmentPlans (tableau de plans
// résolus, [] si aucun ou tous supprimés -- filet de sécurité, ne
// devrait pas arriver ici puisque grc-risks.js ne monte ce panneau que
// si grcRiskTreatmentPlans(risk).length > 0).
function _rtEnsure(risk) {
  return Object.assign({}, risk, { treatmentPlans: grcRiskTreatmentPlans(risk) });
}

function _rtTextArea(labelKey, value, onCommit) {
  const ta = document.createElement("textarea");
  ta.rows = 2;
  ta.value = value || "";
  ta.addEventListener("change", () => onCommit(ta.value));
  return grkField(grcT(labelKey), ta);
}

function _rtDate(value, onCommit) {
  const inp = document.createElement("input");
  inp.type = "date";
  inp.value = value ? String(value).slice(0, 10) : "";
  inp.addEventListener("change", () => onCommit(inp.value || null));
  return inp;
}

/* ---------- onglet Plans (un ou plusieurs) -------------- */

function _rtRenderPlanActions(root, planId, actions) {
  const byStatus = { todo: 0, doing: 0, done: 0 };
  actions.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  const prog = document.createElement("p");
  prog.className = "grk-hint";
  prog.textContent = grcT("grc.risques.rt.actionProgress")
    .replace("{todo}", byStatus.todo).replace("{doing}", byStatus.doing).replace("{done}", byStatus.done);
  root.appendChild(prog);

  const overdue = actions.filter(grcRiskActionOverdue).length;
  if (overdue) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.risques.rt.actionsOverdueAlert").replace("{n}", overdue);
    root.appendChild(warn);
  }

  const list = grkList(root, "grc.risques.rt.actionsTitle");
  grkOrderedList(list, actions, {
    emptyKey: "grc.risques.rt.noAction",
    onMove: (aid, dir) => grcTpMoveAction(planId, aid, dir),
    onRemove: (aid) => grcTpRemoveAction(planId, aid),
    render: (a) => {
      const row = grkRow();
      row.classList.add("grc-rt-action");
      const txt = document.createElement("input");
      txt.type = "text";
      txt.className = "grk-inv-grow";
      txt.placeholder = grcT("grc.risques.rt.actionText");
      txt.value = a.text || "";
      txt.addEventListener("change", () => grcTpUpdateAction(planId, a.id, { text: txt.value }));
      row.appendChild(txt);
      const owner = document.createElement("input");
      owner.type = "text";
      owner.placeholder = grcT("grc.risques.rt.actionOwner");
      owner.value = a.owner || "";
      owner.addEventListener("change", () => grcTpUpdateAction(planId, a.id, { owner: owner.value }));
      row.appendChild(owner);
      const due = document.createElement("input");
      due.type = "date";
      due.value = a.dueAt ? a.dueAt.slice(0, 10) : "";
      due.addEventListener("change", () => { grcTpUpdateAction(planId, a.id, { dueAt: due.value || null }); grkRefresh(row); });
      row.appendChild(due);
      const st = grkSelect(GRC_RT_ACTION_STATUSES, a.status, (s) => grcT("grc.risques.rt.as." + s));
      st.addEventListener("change", () => { grcTpUpdateAction(planId, a.id, { status: st.value }); grkRefresh(row); });
      row.appendChild(st);
      return row;
    },
  });

  const nTxt = document.createElement("input");
  nTxt.type = "text";
  nTxt.className = "grk-inv-grow";
  nTxt.placeholder = grcT("grc.risques.rt.actionText");
  const nOwn = document.createElement("input");
  nOwn.type = "text";
  nOwn.placeholder = grcT("grc.risques.rt.actionOwner");
  const addForm = grkAddForm([nTxt, nOwn], (form) => {
    if (!nTxt.value.trim()) return;
    grcTpAddAction(planId, { text: nTxt.value.trim(), owner: nOwn.value.trim() });
    grkRefresh(form);
  });
  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "grc-registry-add-btn";
  addBtn.textContent = grcT("grc.risques.rt.addAction");
  addForm.appendChild(addBtn);
  root.appendChild(addForm);
}

function _rtRenderPlanLinkedControls(root, planId, linkedControls) {
  const list = grkList(root, "grc.risques.rt.linkedControls");
  const names = grkLinkNames({ controls: true });
  let dlId = null;
  if (names.length) {
    const dl = document.createElement("datalist");
    dlId = "grc-rt-ctrl-" + planId;
    dl.id = dlId;
    names.forEach((nm) => {
      const o = document.createElement("option");
      o.value = nm;
      o.textContent = grcTpControlDisplayLabel(nm);
      dl.appendChild(o);
    });
    root.appendChild(dl);
  }
  linkedControls.forEach((c) => {
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow grc-sup-linked-id";
    span.textContent = grcTpControlDisplayLabel(c);
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcTpRemoveLinkedControl(planId, c); grkRefresh(row); }));
    list.appendChild(row);
  });
  if (!linkedControls.length) list.appendChild(grkEmptyLine("grc.risques.rt.noControl"));
  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "grk-inv-grow";
  inp.setAttribute("autocomplete", "off");
  if (dlId) inp.setAttribute("list", dlId);
  const addForm = grkAddForm([inp], (form) => {
    if (!inp.value.trim()) return;
    grcTpAddLinkedControl(planId, inp.value.trim());
    grkRefresh(form);
  });
  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "grc-registry-add-btn";
  addBtn.textContent = grcT("grc.risques.rt.addControl");
  addForm.appendChild(addBtn);
  root.appendChild(addForm);
}

function _rtRenderPlanCard(root, risk, t) {
  const card = document.createElement("section");
  card.className = "grk-sec grc-rt-plan-card";

  const head = document.createElement("h4");
  head.textContent = t.name || t.id;
  card.appendChild(head);

  const shared = grcTpLinkedRiskCount(t.id);
  if (shared > 1) {
    const note = document.createElement("p");
    note.className = "grk-hint";
    note.textContent = grcT("grc.risques.rt.sharedWith").replace("{n}", shared - 1);
    card.appendChild(note);
  }

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  const sel = grkSelect(GRC_RT_STRATEGIES, t.strategy, (s) => grcT("grc.risques.rt.strat." + s));
  sel.addEventListener("change", () => { grcTpSetStrategy(t.id, { strategy: sel.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.risques.rt.strategy"), sel));
  card.appendChild(grid);

  card.appendChild(_rtTextArea("grc.risques.rt.rationale", t.rationale,
    (v) => grcTpSetStrategy(t.id, { rationale: v })));

  if (t.strategy === "transfer") {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.value = t.transferTo || "";
    inp.addEventListener("change", () => grcTpSetStrategy(t.id, { transferTo: inp.value }));
    card.appendChild(grkField(grcT("grc.risques.rt.transferTo"), inp));
  }

  _rtRenderPlanActions(card, t.id, t.actions);
  _rtRenderPlanLinkedControls(card, t.id, t.linkedControls);

  const unlinkBtn = document.createElement("button");
  unlinkBtn.type = "button";
  unlinkBtn.className = "grc-registry-io-btn grc-rt-drop";
  unlinkBtn.textContent = grcT("grc.risques.rt.unlinkPlan");
  unlinkBtn.onclick = () => { grcRiskUnlinkTreatmentPlan(risk.id, t.id); renderGrcRiskRegistry(); };
  card.appendChild(unlinkBtn);

  root.appendChild(card);
}

function _rtRenderPlans(root, risk) {
  const plans = risk.treatmentPlans;

  if (!plans.length) {
    const hint = document.createElement("p");
    hint.className = "grk-hint";
    hint.textContent = grcT("grc.risques.rt.planMissing");
    root.appendChild(hint);
  } else {
    plans.forEach((t) => _rtRenderPlanCard(root, risk, t));
  }

  const inh = document.createElement("p");
  inh.className = "grk-hint";
  inh.textContent = grcT("grc.risques.rt.inherentReminder")
    .replace("{p}", risk.probability).replace("{i}", risk.impact)
    .replace("{score}", grcRiskInherentScore(risk));
  root.appendChild(inh);

  const addTitle = document.createElement("h4");
  addTitle.textContent = grcT("grc.risques.rt.addAnotherPlan");
  root.appendChild(addTitle);
  _grcRiskRenderTreatmentLinkUi(root, risk);
}

/* ---------- onglet Résiduel (propre au risque) --------- */

function _rtRenderResiduel(root, risk) {
  const id = risk.id;
  const t = grcRiskEnsureTreatment(risk);
  const scale = ["", "1", "2", "3", "4", "5"];

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  ["likelihood", "impact"].forEach((k) => {
    const cur = t.residual[k] == null ? "" : String(t.residual[k]);
    const sel = grkSelect(scale, cur, (v) => v || "—");
    sel.addEventListener("change", () => {
      const patch = {}; patch[k] = sel.value;
      grcRiskSetResidual(id, patch); grkRefresh(grid);
    });
    grid.appendChild(grkField(grcT("grc.risques.rt.residual." + k), sel));
  });
  root.appendChild(grid);

  const rs = grcRiskResidualScore(risk);
  const line = document.createElement("p");
  line.className = "grc-sup-score-line";
  if (rs != null) {
    const band = grcRiskCriticalityLabel(rs);
    const b = document.createElement("span");
    b.className = "grc-crit-badge " + band.cls;
    b.textContent = grcT("grc.risques.rt.residualScore").replace("{value}", rs) + " · " + band.text;
    line.appendChild(b);
  }
  const red = grcRiskReduction(risk);
  if (red) {
    const gain = document.createElement("span");
    gain.className = "grc-rt-gain";
    gain.textContent = grcT("grc.risques.rt.gain")
      .replace("{from}", red.from).replace("{to}", red.to).replace("{pct}", red.pct);
    line.appendChild(gain);
  }
  root.appendChild(line);
}

/* ---------- onglet Acceptation (propre au risque) ------ */

function _rtRenderAcceptation(root, risk) {
  const id = risk.id;
  const t = grcRiskEnsureTreatment(risk);

  if (!grcRiskAcceptanceRequired(risk)) {
    const hint = document.createElement("p");
    hint.className = "grk-hint";
    hint.textContent = grcT("grc.risques.rt.acceptanceNotRequired");
    root.appendChild(hint);
    return;
  }

  if (grcRiskAcceptanceDueForReview(risk)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.risques.rt.acceptanceReviewAlert");
    root.appendChild(warn);
  }

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  const by = document.createElement("input");
  by.type = "text";
  by.value = t.acceptance.by || "";
  by.addEventListener("change", () => grcRiskSetAcceptance(id, { by: by.value }));
  grid.appendChild(grkField(grcT("grc.risques.rt.acceptBy"), by));
  grid.appendChild(grkField(grcT("grc.risques.rt.acceptAt"),
    _rtDate(t.acceptance.at, (v) => grcRiskSetAcceptance(id, { at: v }))));
  grid.appendChild(grkField(grcT("grc.risques.rt.reviewAt"),
    _rtDate(t.acceptance.reviewAt, (v) => { grcRiskSetAcceptance(id, { reviewAt: v }); grkRefresh(grid); })));
  root.appendChild(grid);

  root.appendChild(_rtTextArea("grc.risques.rt.acceptReason", t.acceptance.reason,
    (v) => grcRiskSetAcceptance(id, { reason: v })));
}

/* ---------- onglet Export ---------------------------- */

function _rtRenderExport(root) {
  grkExportButtons(root, "grc.risques.rt.exportHint", [
    { i18n: "grc.risques.rt.exportJson", fn: () => exportGrcRisksAsJson() },
    { i18n: "grc.risques.rt.exportCsv", fn: () => exportRiskTreatmentCsv(getGrcRisks()) },
  ]);
}

/* ---------- montage --------------------------------- */

const GRC_RT_TABS = [
  { key: "plans", i18n: "grc.risques.rt.tab.plans", render: _rtRenderPlans },
  { key: "residuel", i18n: "grc.risques.rt.tab.residuel", render: _rtRenderResiduel },
  { key: "acceptation", i18n: "grc.risques.rt.tab.acceptation", render: _rtRenderAcceptation },
  { key: "export", i18n: "grc.risques.rt.tab.export", render: _rtRenderExport },
];

function renderRiskTreatmentPanel(container, risk) {
  const wrap = document.createElement("div");
  wrap.className = "grc-rt-panel-wrap";
  container.appendChild(wrap);
  grkPanel(wrap, _rtEnsure(risk), {
    idAttr: "data-rt-risk-id",
    tabs: GRC_RT_TABS,
    ensure: _rtEnsure,
    store: _rtStore(),
  });
}
