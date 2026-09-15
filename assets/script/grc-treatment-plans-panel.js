/* Panneau déplié d'un plan de traitement (grc/traitement-risques.html) --
   PAS d'onglets grkPanel : stratégie/rationale/transferTo sont déjà dans
   le formulaire déclaratif (grc-treatment-plans.js), il ne reste ici que
   les listes (actions ordonnées, contrôles liés) + le compteur de
   risques couverts. AUCUNE logique de store ici : lectures/écritures via
   les helpers grcTp* de grc-treatment-plans.js. Chargé APRÈS
   grc-treatment-plans.js. */

function renderTreatmentPlanPanel(body, plan) {
  const id = plan.id;

  const coverage = document.createElement("p");
  coverage.className = "grk-hint";
  coverage.textContent = grcT("grc.traitement-risques.linkedRisks")
    .replace("{n}", grcTpLinkedRiskCount(id));
  body.appendChild(coverage);

  /* ---------- plan d'action (liste ordonnée) --------------- */

  const byStatus = { todo: 0, doing: 0, done: 0 };
  plan.actions.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
  const prog = document.createElement("p");
  prog.className = "grk-hint";
  prog.textContent = grcT("grc.risques.rt.actionProgress")
    .replace("{todo}", byStatus.todo).replace("{doing}", byStatus.doing).replace("{done}", byStatus.done);
  body.appendChild(prog);

  const overdue = plan.actions.filter(grcTpActionOverdue).length;
  if (overdue) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.risques.rt.actionsOverdueAlert").replace("{n}", overdue);
    body.appendChild(warn);
  }

  const list = grkList(body, "grc.risques.rt.actionsTitle");
  grkOrderedList(list, plan.actions, {
    emptyKey: "grc.risques.rt.noAction",
    onMove: (aid, dir) => grcTpMoveAction(id, aid, dir),
    onRemove: (aid) => grcTpRemoveAction(id, aid),
    render: (a) => {
      const row = grkRow();
      row.classList.add("grc-rt-action");
      const txt = document.createElement("input");
      txt.type = "text";
      txt.className = "grk-inv-grow";
      txt.placeholder = grcT("grc.risques.rt.actionText");
      txt.value = a.text || "";
      txt.addEventListener("change", () => grcTpUpdateAction(id, a.id, { text: txt.value }));
      row.appendChild(txt);
      const owner = document.createElement("input");
      owner.type = "text";
      owner.placeholder = grcT("grc.risques.rt.actionOwner");
      owner.value = a.owner || "";
      owner.addEventListener("change", () => grcTpUpdateAction(id, a.id, { owner: owner.value }));
      row.appendChild(owner);
      const due = document.createElement("input");
      due.type = "date";
      due.value = a.dueAt ? a.dueAt.slice(0, 10) : "";
      due.addEventListener("change", () => { grcTpUpdateAction(id, a.id, { dueAt: due.value || null }); renderGrcTreatmentPlansList(); });
      row.appendChild(due);
      const st = grkSelect(GRC_RT_ACTION_STATUSES, a.status, (s) => grcT("grc.risques.rt.as." + s));
      st.addEventListener("change", () => { grcTpUpdateAction(id, a.id, { status: st.value }); renderGrcTreatmentPlansList(); });
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
  const addActionForm = grkAddForm([nTxt, nOwn], (form) => {
    if (!nTxt.value.trim()) return;
    grcTpAddAction(id, { text: nTxt.value.trim(), owner: nOwn.value.trim() });
    renderGrcTreatmentPlansList();
  });
  const addActionBtn = document.createElement("button");
  addActionBtn.type = "submit";
  addActionBtn.className = "grc-registry-add-btn";
  addActionBtn.textContent = grcT("grc.risques.rt.addAction");
  addActionForm.appendChild(addActionBtn);
  body.appendChild(addActionForm);

  /* ---------- contrôles liés (free-text + datalist) --------- */

  const ctrlList = grkList(body, "grc.risques.rt.linkedControls");
  const names = grkLinkNames({ controls: true });
  let dlId = null;
  if (names.length) {
    const dl = document.createElement("datalist");
    dlId = "grc-tp-ctrl-" + id;
    dl.id = dlId;
    names.forEach((nm) => {
      const o = document.createElement("option");
      o.value = nm;
      o.textContent = grcTpControlDisplayLabel(nm);
      dl.appendChild(o);
    });
    body.appendChild(dl);
  }
  plan.linkedControls.forEach((c) => {
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow grc-sup-linked-id";
    span.textContent = grcTpControlDisplayLabel(c);
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcTpRemoveLinkedControl(id, c); renderGrcTreatmentPlansList(); }));
    ctrlList.appendChild(row);
  });
  if (!plan.linkedControls.length) ctrlList.appendChild(grkEmptyLine("grc.risques.rt.noControl"));
  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "grk-inv-grow";
  inp.setAttribute("autocomplete", "off");
  if (dlId) inp.setAttribute("list", dlId);
  const addCtrlForm = grkAddForm([inp], (form) => {
    if (!inp.value.trim()) return;
    grcTpAddLinkedControl(id, inp.value.trim());
    renderGrcTreatmentPlansList();
  });
  const addCtrlBtn = document.createElement("button");
  addCtrlBtn.type = "submit";
  addCtrlBtn.className = "grc-registry-add-btn";
  addCtrlBtn.textContent = grcT("grc.risques.rt.addControl");
  addCtrlForm.appendChild(addCtrlBtn);
  body.appendChild(addCtrlForm);
}
