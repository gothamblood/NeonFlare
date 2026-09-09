/* Panneau de plan de traitement d'un risque -- rendu dans le corps de
   l'accordéon du registre des risques (grc/analyse-risques.html) par
   grc-risks.js quand `risk.treatmentPlan` existe. Voir
   spec/grc-registry-upgrades/70-risk-treatment.md.

   AUCUNE logique de store ici : lectures/écritures via les helpers
   grcRisk*Treatment* de grc-risks.js. Chargé APRÈS grc-risks.js.
   Utilise grkPanel / grk* du kit (grc-registry-kit.js). */

/* ---------- helpers d'affichage --------------------------- */

function _rtStore() {
  return { get: () => (typeof getGrcRisks === "function" ? getGrcRisks() : []) };
}

function _rtEnsure(risk) {
  return Object.assign({}, risk, { treatmentPlan: grcRiskEnsureTreatment(risk) });
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

/* ---------- onglet Stratégie ---------------------------- */

function _rtRenderStrategie(root, risk) {
  const id = risk.id;
  const t = risk.treatmentPlan;

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  const sel = grkSelect(GRC_RT_STRATEGIES, t.strategy, (s) => grcT("grc.risques.rt.strat." + s));
  sel.addEventListener("change", () => { grcRiskSetStrategy(id, { strategy: sel.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.risques.rt.strategy"), sel));
  root.appendChild(grid);

  root.appendChild(_rtTextArea("grc.risques.rt.rationale", t.rationale,
    (v) => grcRiskSetStrategy(id, { rationale: v })));

  if (t.strategy === "transfer") {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.value = t.transferTo || "";
    inp.addEventListener("change", () => grcRiskSetStrategy(id, { transferTo: inp.value }));
    root.appendChild(grkField(grcT("grc.risques.rt.transferTo"), inp));
  }

  const inh = document.createElement("p");
  inh.className = "grk-hint";
  inh.textContent = grcT("grc.risques.rt.inherentReminder")
    .replace("{p}", risk.probability).replace("{i}", risk.impact)
    .replace("{score}", grcRiskInherentScore(risk));
  root.appendChild(inh);
}

/* ---------- onglet Plan d'action ----------------------- */

function _rtRenderActions(root, risk) {
  const id = risk.id;
  const t = risk.treatmentPlan;

  const byStatus = { todo: 0, doing: 0, done: 0 };
  t.actions.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  const prog = document.createElement("p");
  prog.className = "grk-hint";
  prog.textContent = grcT("grc.risques.rt.actionProgress")
    .replace("{todo}", byStatus.todo).replace("{doing}", byStatus.doing).replace("{done}", byStatus.done);
  root.appendChild(prog);

  const overdue = t.actions.filter(grcRiskActionOverdue).length;
  if (overdue) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.risques.rt.actionsOverdueAlert").replace("{n}", overdue);
    root.appendChild(warn);
  }

  const list = grkList(root, "grc.risques.rt.actionsTitle");
  grkOrderedList(list, t.actions, {
    emptyKey: "grc.risques.rt.noAction",
    onMove: (aid, dir) => grcRiskMoveAction(id, aid, dir),
    onRemove: (aid) => grcRiskRemoveAction(id, aid),
    render: (a) => {
      const row = grkRow();
      row.classList.add("grc-rt-action");
      const txt = document.createElement("input");
      txt.type = "text";
      txt.className = "grk-inv-grow";
      txt.placeholder = grcT("grc.risques.rt.actionText");
      txt.value = a.text || "";
      txt.addEventListener("change", () => grcRiskUpdateAction(id, a.id, { text: txt.value }));
      row.appendChild(txt);
      const owner = document.createElement("input");
      owner.type = "text";
      owner.placeholder = grcT("grc.risques.rt.actionOwner");
      owner.value = a.owner || "";
      owner.addEventListener("change", () => grcRiskUpdateAction(id, a.id, { owner: owner.value }));
      row.appendChild(owner);
      const due = document.createElement("input");
      due.type = "date";
      due.value = a.dueAt ? a.dueAt.slice(0, 10) : "";
      due.addEventListener("change", () => { grcRiskUpdateAction(id, a.id, { dueAt: due.value || null }); grkRefresh(row); });
      row.appendChild(due);
      const st = grkSelect(GRC_RT_ACTION_STATUSES, a.status, (s) => grcT("grc.risques.rt.as." + s));
      st.addEventListener("change", () => { grcRiskUpdateAction(id, a.id, { status: st.value }); grkRefresh(row); });
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
    grcRiskAddAction(id, { text: nTxt.value.trim(), owner: nOwn.value.trim() });
    grkRefresh(form);
  });
  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "grc-registry-add-btn";
  addBtn.textContent = grcT("grc.risques.rt.addAction");
  addForm.appendChild(addBtn);
  root.appendChild(addForm);
}

/* ---------- onglet Résiduel --------------------------- */

function _rtRenderResiduel(root, risk) {
  const id = risk.id;
  const t = risk.treatmentPlan;
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

  // contrôles liés (datalist getGrcControls dégradé)
  const list = grkList(root, "grc.risques.rt.linkedControls");
  const names = grkLinkNames({ controls: true });
  let dlId = null;
  if (names.length) {
    const dl = document.createElement("datalist");
    dlId = "grc-rt-ctrl-" + id;
    dl.id = dlId;
    names.forEach((nm) => { const o = document.createElement("option"); o.value = nm; dl.appendChild(o); });
    root.appendChild(dl);
  }
  t.linkedControls.forEach((c) => {
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow grc-sup-linked-id";
    span.textContent = c;
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcRiskRemoveTreatmentControl(id, c); grkRefresh(row); }));
    list.appendChild(row);
  });
  if (!t.linkedControls.length) list.appendChild(grkEmptyLine("grc.risques.rt.noControl"));
  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "grk-inv-grow";
  inp.setAttribute("autocomplete", "off");
  if (dlId) inp.setAttribute("list", dlId);
  const addForm = grkAddForm([inp], (form) => {
    if (!inp.value.trim()) return;
    grcRiskAddTreatmentControl(id, inp.value.trim());
    grkRefresh(form);
  });
  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "grc-registry-add-btn";
  addBtn.textContent = grcT("grc.risques.rt.addControl");
  addForm.appendChild(addBtn);
  root.appendChild(addForm);
}

/* ---------- onglet Acceptation ------------------------ */

function _rtRenderAcceptation(root, risk) {
  const id = risk.id;
  const t = risk.treatmentPlan;

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
  { key: "strategie", i18n: "grc.risques.rt.tab.strategie", render: _rtRenderStrategie },
  { key: "actions", i18n: "grc.risques.rt.tab.actions", render: _rtRenderActions },
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
