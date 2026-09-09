/* Panneaux conformité -- Obligation et Audit, rendus dans le corps de
   l'accordéon du registre (grc/conformite.html) par grc-compliance.js
   via grkPanel du kit. Voir spec/grc-registry-upgrades/30-conformite.md.

   AUCUNE logique de store ici : lectures/écritures via les helpers
   grcCmp* de grc-compliance.js. Chargé APRÈS grc-compliance.js et AVANT
   initGrcComplianceRegistry().

   État (30-conformite.md §6) :
   - T3 : panneau Obligation (Fiche / Preuves & contrôles / Évaluation).
   - T4 : panneau Audit + onglet Constats.
   - T5 : cross-links (contrôles / incident / risque).  T6 : Export. */

/* ---------- helpers d'affichage --------------------------- */

function _cmpTextArea(labelKey, value, onCommit) {
  const ta = document.createElement("textarea");
  ta.rows = 2;
  ta.value = value || "";
  ta.addEventListener("change", () => onCommit(ta.value));
  return grkField(grcT(labelKey), ta);
}

function _cmpInput(value, onCommit, type) {
  const inp = document.createElement("input");
  inp.type = type || "text";
  inp.value = value == null ? "" : value;
  inp.addEventListener("change", () => onCommit(inp.value));
  return inp;
}

function _cmpDate(value, onCommit) {
  const inp = document.createElement("input");
  inp.type = "date";
  inp.value = value ? String(value).slice(0, 10) : "";
  inp.addEventListener("change", () => onCommit(inp.value || null));
  return inp;
}

function _cmpAddBtn(form, i18nKey) {
  const b = document.createElement("button");
  b.type = "submit";
  b.className = "grc-registry-add-btn";
  b.textContent = grcT(i18nKey);
  form.appendChild(b);
}

// datalist des contrôles GRC si grc-controls.js est chargé (dégradé sinon).
function _cmpControlNames() {
  return grkLinkNames({ controls: true });
}

/* ================================================================== *
 *  Panneau OBLIGATION
 * ================================================================== */

function _oblRenderFiche(root, e) {
  const id = e.id;
  const hint = document.createElement("p");
  hint.className = "grk-hint";
  hint.textContent = grcT("grc.conformite.fiche.editHint");
  root.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const stSel = grkSelect(GRC_CMP_STATUSES, e.status, (s) => grcT("grc.conformite.st." + s));
  stSel.addEventListener("change", () => { grcCmpSetObligationCore(id, { status: stSel.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.conformite.obl.status"), stSel));

  const appSel = grkSelect(GRC_CMP_APPLICABILITY, e.applicability, (a) => grcT("grc.conformite.appl." + a));
  appSel.addEventListener("change", () => { grcCmpSetObligationCore(id, { applicability: appSel.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.conformite.obl.applicability"), appSel));

  root.appendChild(grid);

  const sb = grcCmpStatusBadge(e.status);
  const line = document.createElement("p");
  line.className = "grc-sup-score-line";
  const badge = document.createElement("span");
  badge.className = "grc-crit-badge " + sb.cls;
  badge.textContent = sb.text;
  line.appendChild(badge);
  root.appendChild(line);

  root.appendChild(_cmpTextArea("grc.conformite.ev.notes", e.notes,
    (v) => grcCmpSetObligationCore(id, { notes: v })));
}

function _oblRenderPreuves(root, e) {
  const id = e.id;
  root.appendChild(_cmpTextArea("grc.conformite.ev.evidence", e.evidence,
    (v) => grcCmpSetObligationCore(id, { evidence: v })));

  const list = grkList(root, "grc.conformite.ev.controls");
  const names = _cmpControlNames();
  let dlId = null;
  if (names.length) {
    const dl = document.createElement("datalist");
    dlId = "grc-obl-ctrl-" + id;
    dl.id = dlId;
    names.forEach((nm) => {
      const o = document.createElement("option");
      o.value = nm;
      dl.appendChild(o);
    });
    root.appendChild(dl);
  }
  e.controls.forEach((c) => {
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow grc-sup-linked-id";
    span.textContent = c;
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcCmpRemoveObligationControl(id, c); grkRefresh(row); }));
    list.appendChild(row);
  });
  if (!e.controls.length) list.appendChild(grkEmptyLine("grc.conformite.empty"));

  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "grk-inv-grow";
  inp.setAttribute("autocomplete", "off");
  if (dlId) inp.setAttribute("list", dlId);
  const addForm = grkAddForm([inp], (form) => {
    if (!inp.value.trim()) return;
    grcCmpAddObligationControl(id, inp.value.trim());
    grkRefresh(form);
  });
  _cmpAddBtn(addForm, "grc.conformite.ev.addControl");
  root.appendChild(addForm);
}

function _oblRenderEvaluation(root, e) {
  const id = e.id;
  const sec = document.createElement("section");
  sec.className = "grk-sec";
  const h4 = document.createElement("h4");
  h4.textContent = grcT("grc.conformite.as.title");
  if (grcCmpObligationOverdueAssessment(e)) {
    const b = document.createElement("span");
    b.className = "grc-sup-mini-badge grc-sup-badge-review";
    b.textContent = " " + grcT("grc.conformite.as.overdue");
    h4.appendChild(b);
  }
  sec.appendChild(h4);

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  grid.appendChild(grkField(grcT("grc.conformite.as.lastAt"),
    _cmpDate(e.assessment.lastAt, (v) => { grcCmpSetAssessment(id, { lastAt: v }); grkRefresh(grid); })));
  const cad = document.createElement("input");
  cad.type = "number";
  cad.min = "1";
  cad.value = e.assessment.cadenceMonths || 12;
  cad.addEventListener("change", () => { grcCmpSetAssessment(id, { cadenceMonths: cad.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.conformite.as.cadenceMonths"), cad));
  sec.appendChild(grid);

  const due = document.createElement("p");
  due.className = "grk-hint";
  due.textContent = grcT("grc.conformite.as.nextDueAt").replace("{value}", grkFmtDateTime(e.assessment.nextDueAt));
  sec.appendChild(due);
  root.appendChild(sec);
}

/* ================================================================== *
 *  Panneau AUDIT
 * ================================================================== */

function _audRenderFiche(root, e) {
  const id = e.id;
  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const stSel = grkSelect(GRC_CMP_AUDIT_STATUSES, e.status, (s) => grcT("grc.conformite.as." + s));
  stSel.addEventListener("change", () => grcCmpSetAuditCore(id, { status: stSel.value }));
  grid.appendChild(grkField(grcT("grc.conformite.audit.status"), stSel));

  grid.appendChild(grkField(grcT("grc.conformite.audit.plannedFor"),
    _cmpDate(e.plannedFor, (v) => grcCmpSetAuditCore(id, { plannedFor: v }))));
  grid.appendChild(grkField(grcT("grc.conformite.audit.startedAt"),
    _cmpDate(e.startedAt, (v) => grcCmpSetAuditCore(id, { startedAt: v }))));
  grid.appendChild(grkField(grcT("grc.conformite.audit.closedAt"),
    _cmpDate(e.closedAt, (v) => grcCmpSetAuditCore(id, { closedAt: v }))));
  root.appendChild(grid);

  root.appendChild(_cmpTextArea("grc.conformite.audit.scope", e.scope,
    (v) => grcCmpSetAuditCore(id, { scope: v })));
}

function _audRenderConstats(root, e) {
  const id = e.id;
  const list = grkList(root, "grc.conformite.fnd.title");

  const incNames = grkLinkNames({ incidents: true });
  const riskNames = grkLinkNames({ risks: true });
  const mkDatalist = (idBase, names) => {
    if (!names.length) return null;
    const dl = document.createElement("datalist");
    dl.id = idBase + "-" + id;
    names.forEach((nm) => { const o = document.createElement("option"); o.value = nm; dl.appendChild(o); });
    root.appendChild(dl);
    return dl.id;
  };
  const incDl = mkDatalist("grc-fnd-inc", incNames);
  const riskDl = mkDatalist("grc-fnd-risk", riskNames);

  e.findings.forEach((f) => {
    const row = grkRow();
    row.classList.add("grc-cmp-finding");

    const sev = grkSelect(GRC_CMP_FINDING_SEVERITIES, f.severity, (s) => grcT("grc.conformite.sev." + s));
    sev.addEventListener("change", () => grcCmpUpdateFinding(id, f.id, { severity: sev.value }));
    row.appendChild(sev);

    const txt = document.createElement("input");
    txt.type = "text";
    txt.className = "grk-inv-grow";
    txt.placeholder = grcT("grc.conformite.fnd.text");
    txt.value = f.text || "";
    txt.addEventListener("change", () => grcCmpUpdateFinding(id, f.id, { text: txt.value }));
    row.appendChild(txt);

    const clause = document.createElement("input");
    clause.type = "text";
    clause.placeholder = grcT("grc.conformite.fnd.clause");
    clause.value = f.clause || "";
    clause.addEventListener("change", () => grcCmpUpdateFinding(id, f.id, { clause: clause.value }));
    row.appendChild(clause);

    const verif = grkSelect(GRC_CMP_FINDING_VERIF, f.verification, (v) => grcT("grc.conformite.verif." + v));
    verif.addEventListener("change", () => { grcCmpUpdateFinding(id, f.id, { verification: verif.value }); grkRefresh(row); });
    row.appendChild(verif);

    const due = document.createElement("input");
    due.type = "date";
    due.title = grcT("grc.conformite.fnd.dueAt");
    due.value = f.dueAt ? f.dueAt.slice(0, 10) : "";
    due.addEventListener("change", () => { grcCmpUpdateFinding(id, f.id, { dueAt: due.value || null }); grkRefresh(row); });
    row.appendChild(due);

    if (grcCmpFindingOverdue(f)) {
      const b = document.createElement("span");
      b.className = "grc-sup-mini-badge grc-sup-badge-expired";
      b.textContent = grcT("grc.conformite.fnd.overdueAlert");
      row.appendChild(b);
    }

    row.appendChild(grkDelBtn(() => { grcCmpRemoveFinding(id, f.id); grkRefresh(row); }));

    // 2e ligne : action corrective + responsable + cross-links
    const row2 = grkRow();
    row2.classList.add("grc-cmp-finding-2");
    const ca = document.createElement("input");
    ca.type = "text";
    ca.className = "grk-inv-grow";
    ca.placeholder = grcT("grc.conformite.fnd.correctiveAction");
    ca.value = f.correctiveAction || "";
    ca.addEventListener("change", () => grcCmpUpdateFinding(id, f.id, { correctiveAction: ca.value }));
    row2.appendChild(ca);
    const own = document.createElement("input");
    own.type = "text";
    own.placeholder = grcT("grc.conformite.fnd.owner");
    own.value = f.owner || "";
    own.addEventListener("change", () => grcCmpUpdateFinding(id, f.id, { owner: own.value }));
    row2.appendChild(own);
    const inc = document.createElement("input");
    inc.type = "text";
    inc.placeholder = grcT("grc.conformite.fnd.linkedIncident");
    inc.value = f.linkedIncident || "";
    if (incDl) inc.setAttribute("list", incDl);
    inc.addEventListener("change", () => grcCmpUpdateFinding(id, f.id, { linkedIncident: inc.value }));
    row2.appendChild(inc);
    const rsk = document.createElement("input");
    rsk.type = "text";
    rsk.placeholder = grcT("grc.conformite.fnd.linkedRisk");
    rsk.value = f.linkedRisk || "";
    if (riskDl) rsk.setAttribute("list", riskDl);
    rsk.addEventListener("change", () => grcCmpUpdateFinding(id, f.id, { linkedRisk: rsk.value }));
    row2.appendChild(rsk);

    list.appendChild(row);
    list.appendChild(row2);
  });
  if (!e.findings.length) list.appendChild(grkEmptyLine("grc.conformite.empty"));

  const nSev = grkSelect(GRC_CMP_FINDING_SEVERITIES, "minor", (s) => grcT("grc.conformite.sev." + s));
  const nTxt = document.createElement("input");
  nTxt.type = "text";
  nTxt.className = "grk-inv-grow";
  nTxt.placeholder = grcT("grc.conformite.fnd.text");
  const addForm = grkAddForm([nSev, nTxt], (form) => {
    if (!nTxt.value.trim()) return;
    grcCmpAddFinding(id, { severity: nSev.value, text: nTxt.value.trim() });
    grkRefresh(form);
  });
  _cmpAddBtn(addForm, "grc.conformite.fnd.add");
  root.appendChild(addForm);
}

/* ---------- onglet Export -------------------------------- */

function _oblRenderExport(root, e) {
  grkExportButtons(root, "grc.conformite.export.hint", [
    { i18n: "grc.conformite.export.json", fn: () => exportComplianceAsJson(e) },
    { i18n: "grc.conformite.export.ddaWord", fn: () => exportDdaAsWord(getGrcObligations()) },
    { i18n: "grc.conformite.export.ddaCsv", fn: () => exportDdaCsv(getGrcObligations()) },
    { i18n: "grc.conformite.export.reportWord", fn: () => exportComplianceReportAsWord(getGrcCompliance()) },
  ]);
}

function _audRenderExport(root, e) {
  grkExportButtons(root, "grc.conformite.export.hint", [
    { i18n: "grc.conformite.export.json", fn: () => exportComplianceAsJson(e) },
    { i18n: "grc.conformite.export.auditWord", fn: () => exportAuditReportAsWord(e) },
  ]);
}

/* ---------- montage ------------------------------------- */

const GRC_OBL_TABS = [
  { key: "fiche", i18n: "grc.conformite.tab.fiche", render: _oblRenderFiche },
  { key: "preuves", i18n: "grc.conformite.tab.preuves", render: _oblRenderPreuves },
  { key: "evaluation", i18n: "grc.conformite.tab.evaluation", render: _oblRenderEvaluation },
  { key: "export", i18n: "grc.conformite.tab.export", render: _oblRenderExport },
];

const GRC_AUD_TABS = [
  { key: "fiche", i18n: "grc.conformite.tab.fiche", render: _audRenderFiche },
  { key: "constats", i18n: "grc.conformite.tab.constats", render: _audRenderConstats },
  { key: "export", i18n: "grc.conformite.tab.export", render: _audRenderExport },
];

function renderObligationPanel(container, entry) {
  grkPanel(container, entry, {
    idAttr: "data-cmp-id", tabs: GRC_OBL_TABS,
    ensure: grcComplianceEnsureShape, store: _grcComplianceStore,
  });
}

function renderAuditPanel(container, entry) {
  grkPanel(container, entry, {
    idAttr: "data-cmp-id", tabs: GRC_AUD_TABS,
    ensure: grcComplianceEnsureShape, store: _grcComplianceStore,
  });
}
