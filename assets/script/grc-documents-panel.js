/* Panneau d'un document -- rendu dans le corps de l'accordéon du registre
   documentaire (grc/procedures.html, directives.html, documentation.html,
   gouvernance.html) par grc-documents.js. Voir spec/grc-registry-upgrades/
   80-document-register.md.

   AUCUNE logique de store ici : lectures/écritures via les helpers
   grcDoc* de grc-documents.js. Chargé APRÈS grc-documents.js.
   Utilise grkPanel / grk* du kit (grc-registry-kit.js).

   T3-T4 : onglets Fiche / Cycle de vie / Couverture & liens / Historique.
   T5    : renderGrcAuthorityTable (vue gouvernance).
   T6    : exports (sommaire Word/CSV + registre d'autorité CSV + JSON). */

/* périmètre docType de la page courante (posé par initGrcDocumentsRegistry) ;
   sert aux exports « sommaire de cette page ». Défaut = tous. */
let _grcDocPageScope = null;
function grcDocSetPageScope(docTypes) {
  _grcDocPageScope = Array.isArray(docTypes) && docTypes.length ? docTypes.slice() : null;
}
function _grcDocScopedList() {
  const all = getGrcDocuments().map(grcDocEnsureShape);
  return _grcDocPageScope
    ? all.filter((d) => _grcDocPageScope.indexOf(d.docType) !== -1)
    : all;
}

/* ---------- helpers d'affichage ------------------------- */

function _docStore() {
  return { get: () => (typeof getGrcDocuments === "function" ? getGrcDocuments() : []) };
}

function _docInput(type, value, onCommit) {
  const inp = document.createElement("input");
  inp.type = type;
  inp.value = type === "date" && value ? String(value).slice(0, 10) : (value || "");
  inp.addEventListener("change", () => onCommit(type === "date" ? (inp.value || null) : inp.value));
  return inp;
}

function _docTextArea(value, onCommit) {
  const ta = document.createElement("textarea");
  ta.rows = 2;
  ta.value = value || "";
  ta.addEventListener("change", () => onCommit(ta.value));
  return ta;
}

/* ---------- onglet Fiche ------------------------------- */

function _docRenderSheet(root, doc) {
  const id = doc.id;
  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  grid.appendChild(grkField(grcT("grc.documents.form.name"),
    _docInput("text", doc.title, (v) => grcDocSetFields(id, { title: v }))));

  const typeSel = grkSelect(GRC_DOC_TYPES, doc.docType, (t) => grcT("grc.documents.dt." + t));
  typeSel.addEventListener("change", () => { grcDocSetFields(id, { docType: typeSel.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.documents.form.docType"), typeSel));

  grid.appendChild(grkField(grcT("grc.documents.sheet.owner"),
    _docInput("text", doc.owner, (v) => grcDocSetFields(id, { owner: v }))));
  grid.appendChild(grkField(grcT("grc.documents.sheet.approver"),
    _docInput("text", doc.approver, (v) => grcDocSetFields(id, { approver: v }))));

  const statusSel = grkSelect(GRC_DOC_STATUSES, doc.status, (s) => grcT("grc.documents.st." + s));
  statusSel.addEventListener("change", () => { grcDocSetFields(id, { status: statusSel.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.documents.sheet.status"), statusSel));

  grid.appendChild(grkField(grcT("grc.documents.sheet.version"),
    _docInput("text", doc.version, (v) => grcDocSetFields(id, { version: v }))));
  grid.appendChild(grkField(grcT("grc.documents.sheet.effectiveDate"),
    _docInput("date", doc.effectiveDate, (v) => grcDocSetFields(id, { effectiveDate: v }))));
  grid.appendChild(grkField(grcT("grc.documents.sheet.scope"),
    _docInput("text", doc.scope, (v) => grcDocSetFields(id, { scope: v }))));
  grid.appendChild(grkField(grcT("grc.documents.sheet.location"),
    _docInput("text", doc.location, (v) => grcDocSetFields(id, { location: v }))));
  root.appendChild(grid);

  root.appendChild(grkField(grcT("grc.documents.sheet.notes"),
    _docTextArea(doc.notes, (v) => grcDocSetFields(id, { notes: v }))));
}

/* ---------- onglet Cycle de vie ----------------------- */

function _docRenderLifecycle(root, doc) {
  const id = doc.id;
  const r = doc.review;

  if (grcDocReviewOverdue(doc)) {
    const w = document.createElement("p");
    w.className = "grc-sup-warn";
    w.textContent = grcT("grc.documents.life.reviewOverdue");
    root.appendChild(w);
  }
  if (grcDocIsStaleDraft(doc)) {
    const w = document.createElement("p");
    w.className = "grc-sup-warn";
    w.textContent = grcT("grc.documents.life.staleDraft");
    root.appendChild(w);
  }

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  const cad = document.createElement("input");
  cad.type = "number";
  cad.min = "1";
  cad.value = r.cadenceMonths || GRC_DOC_DEFAULT_CADENCE;
  cad.addEventListener("change", () => { grcDocSetReview(id, { cadenceMonths: cad.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.documents.life.cadence"), cad));

  grid.appendChild(grkField(grcT("grc.documents.life.lastReviewed"),
    _docInput("date", r.lastReviewedAt, (v) => { grcDocSetReview(id, { lastReviewedAt: v }); grkRefresh(grid); })));
  grid.appendChild(grkField(grcT("grc.documents.life.nextDue"),
    _docInput("date", r.nextDueAt, (v) => { grcDocSetReview(id, { nextDueAt: v }); grkRefresh(grid); })));
  grid.appendChild(grkField(grcT("grc.documents.life.approvedAt"),
    _docInput("date", doc.approvedAt, (v) => grcDocSetFields(id, { approvedAt: v }))));
  grid.appendChild(grkField(grcT("grc.documents.life.approvedBy"),
    _docInput("text", doc.approvedBy, (v) => grcDocSetFields(id, { approvedBy: v }))));
  root.appendChild(grid);

  /* nouvelle version */
  const changeInp = document.createElement("input");
  changeInp.type = "text";
  changeInp.className = "grk-inv-grow";
  changeInp.placeholder = grcT("grc.documents.life.versionChange");
  root.appendChild(grkField(grcT("grc.documents.life.versionChange"), changeInp));

  const bar = document.createElement("div");
  bar.className = "grc-cont-actions";
  const mkBump = (bump, key) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-registry-add-btn grc-doc-newver";
    b.textContent = grcT(key);
    b.addEventListener("click", () => {
      grcDocNewVersion(id, { bump: bump, change: changeInp.value, by: (typeof grkAuthorName === "function" ? grkAuthorName() : "") });
      grkRefresh(bar);
    });
    return b;
  };
  bar.appendChild(mkBump("minor", "grc.documents.life.newVersionMinor"));
  bar.appendChild(mkBump("major", "grc.documents.life.newVersionMajor"));
  root.appendChild(bar);
}

/* ---------- onglet Couverture & liens ----------------- */

function _docRenderCoverage(root, doc) {
  const id = doc.id;

  /* contrôles couverts */
  const cList = grkList(root, "grc.documents.cov.controls");
  const ctrlNames = (typeof grkLinkNames === "function") ? grkLinkNames({ controls: true }) : [];
  let ctrlDlId = null;
  if (ctrlNames.length) {
    const dl = document.createElement("datalist");
    ctrlDlId = "grc-doc-ctrl-" + id;
    dl.id = ctrlDlId;
    ctrlNames.forEach((nm) => { const o = document.createElement("option"); o.value = nm; dl.appendChild(o); });
    root.appendChild(dl);
  }
  doc.controls.forEach((c) => {
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow grc-sup-linked-id";
    span.textContent = c;
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcDocRemoveControl(id, c); grkRefresh(row); }));
    cList.appendChild(row);
  });
  if (!doc.controls.length) cList.appendChild(grkEmptyLine("grc.documents.cov.noControl"));
  const ctrlInp = document.createElement("input");
  ctrlInp.type = "text";
  ctrlInp.className = "grk-inv-grow";
  ctrlInp.setAttribute("autocomplete", "off");
  if (ctrlDlId) ctrlInp.setAttribute("list", ctrlDlId);
  const ctrlForm = grkAddForm([ctrlInp], (form) => {
    if (!ctrlInp.value.trim()) return;
    grcDocAddControl(id, ctrlInp.value.trim());
    grkRefresh(form);
  });
  const ctrlBtn = document.createElement("button");
  ctrlBtn.type = "submit";
  ctrlBtn.className = "grc-registry-add-btn";
  ctrlBtn.textContent = grcT("grc.documents.cov.addControl");
  ctrlForm.appendChild(ctrlBtn);
  root.appendChild(ctrlForm);

  /* relations vers d'autres documents */
  const rList = grkList(root, "grc.documents.cov.relations");
  const titles = getGrcDocuments()
    .map(grcDocEnsureShape)
    .filter((d) => d.id !== id && d.title)
    .map((d) => d.title);
  let relDlId = null;
  if (titles.length) {
    const dl = document.createElement("datalist");
    relDlId = "grc-doc-rel-" + id;
    dl.id = relDlId;
    titles.forEach((t) => { const o = document.createElement("option"); o.value = t; dl.appendChild(o); });
    root.appendChild(dl);
  }
  doc.relations.forEach((rel) => {
    const row = grkRow();
    const typeSel = grkSelect(GRC_DOC_RELATION_TYPES, rel.type, (t) => grcT("grc.documents.rel." + t));
    typeSel.addEventListener("change", () => grcDocUpdateRelation(id, rel.id, { type: typeSel.value }));
    row.appendChild(typeSel);
    const refInp = document.createElement("input");
    refInp.type = "text";
    refInp.className = "grk-inv-grow";
    refInp.value = rel.ref || "";
    if (relDlId) refInp.setAttribute("list", relDlId);
    refInp.addEventListener("change", () => grcDocUpdateRelation(id, rel.id, { ref: refInp.value }));
    row.appendChild(refInp);
    row.appendChild(grkDelBtn(() => { grcDocRemoveRelation(id, rel.id); grkRefresh(row); }));
    rList.appendChild(row);
  });
  if (!doc.relations.length) rList.appendChild(grkEmptyLine("grc.documents.cov.noRelation"));
  const relType = grkSelect(GRC_DOC_RELATION_TYPES, "references", (t) => grcT("grc.documents.rel." + t));
  const relRef = document.createElement("input");
  relRef.type = "text";
  relRef.className = "grk-inv-grow";
  relRef.placeholder = grcT("grc.documents.cov.relationRef");
  if (relDlId) relRef.setAttribute("list", relDlId);
  const relForm = grkAddForm([relType, relRef], (form) => {
    if (!relRef.value.trim()) return;
    grcDocAddRelation(id, { type: relType.value, ref: relRef.value.trim() });
    grkRefresh(form);
  });
  const relBtn = document.createElement("button");
  relBtn.type = "submit";
  relBtn.className = "grc-registry-add-btn";
  relBtn.textContent = grcT("grc.documents.cov.addRelation");
  relForm.appendChild(relBtn);
  root.appendChild(relForm);
}

/* ---------- onglet Historique ------------------------- */

function _docRenderHistory(root, doc) {
  const list = grkList(root, "grc.documents.hist.title");
  const entries = (doc.history || []).slice()
    .sort((a, b) => Date.parse(b.ts || 0) - Date.parse(a.ts || 0));
  if (!entries.length) {
    list.appendChild(grkEmptyLine("grc.documents.hist.empty"));
    return;
  }
  entries.forEach((h) => {
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow";
    const when = h.ts ? String(h.ts).slice(0, 10) : "—";
    span.textContent = "v" + (h.version || "?") + " · " + when +
      (h.by ? " · " + h.by : "") + (h.change ? " — " + h.change : "");
    row.appendChild(span);
    list.appendChild(row);
  });
}

/* ---------- onglet Export ----------------------------- */

function _docRenderExport(root) {
  grkExportButtons(root, "grc.documents.exportHint", [
    { i18n: "grc.documents.exportJson", fn: () => exportGrcDocumentsJson() },
    { i18n: "grc.documents.exportSummary", fn: () => exportGrcDocumentsSummaryWord(_grcDocScopedList()) },
    { i18n: "grc.documents.exportSummaryCsv", fn: () => exportGrcDocumentsSummaryCsv(_grcDocScopedList()) },
    { i18n: "grc.documents.exportAuthorityCsv", fn: () => exportGrcDocumentsAuthorityCsv(getGrcDocuments()) },
  ]);
}

/* ---------- montage ---------------------------------- */

const GRC_DOC_TABS = [
  { key: "sheet", i18n: "grc.documents.tab.sheet", render: _docRenderSheet },
  { key: "lifecycle", i18n: "grc.documents.tab.lifecycle", render: _docRenderLifecycle },
  { key: "coverage", i18n: "grc.documents.tab.coverage", render: _docRenderCoverage },
  { key: "history", i18n: "grc.documents.tab.history", render: _docRenderHistory },
  { key: "export", i18n: "grc.documents.tab.export", render: _docRenderExport },
];

function renderDocumentPanel(container, doc) {
  const wrap = document.createElement("div");
  wrap.className = "grc-doc-panel-wrap";
  container.appendChild(wrap);
  grkPanel(wrap, grcDocEnsureShape(doc), {
    idAttr: "data-doc-panel-id",
    tabs: GRC_DOC_TABS,
    ensure: grcDocEnsureShape,
    store: _docStore(),
  });
}

/* ================================================================== *
 *  T5 -- vue « registre d'autorité » (gouvernance.html).
 *  Rendu lecture seule, dérivé de grcDocAuthorityTable (tous les docs).
 * ================================================================== */

function renderGrcAuthorityTable(sel) {
  const el = document.querySelector(sel || "#grcDocumentsAuthority");
  if (!el) return;
  el.innerHTML = "";
  const rows = grcDocAuthorityTable(getGrcDocuments());
  const h3 = document.createElement("h3");
  h3.textContent = grcT("grc.documents.authority.title");
  el.appendChild(h3);
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "grk-hint";
    p.textContent = grcT("grc.documents.authority.empty");
    el.appendChild(p);
    return;
  }
  const table = document.createElement("table");
  table.className = "grc-doc-authority";
  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  [
    "grc.documents.authority.colDoc", "grc.documents.authority.colApprover",
    "grc.documents.authority.colVersion", "grc.documents.authority.colApprovedAt",
  ].forEach((k) => {
    const th = document.createElement("th");
    th.textContent = grcT(k);
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    [
      (r.title || "") + " (" + grcT("grc.documents.dt." + r.docType) + ")",
      r.approver || "—",
      r.version || "—",
      r.approvedAt ? String(r.approvedAt).slice(0, 10) : "—",
    ].forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  el.appendChild(table);
}

/* ================================================================== *
 *  T6 -- exports (aucune dépendance tierce, aucune requête réseau ;
 *  `location` n'est jamais suivi). Gate coffre via grk*.
 * ================================================================== */

function _docReportRows(list) {
  return (Array.isArray(list) ? list : []).map(grcDocEnsureShape).map((d) => [
    grcT("grc.documents.dt." + d.docType),
    d.title || "",
    d.version || "",
    grcT("grc.documents.st." + d.status),
    d.effectiveDate ? String(d.effectiveDate).slice(0, 10) : "",
    d.review && d.review.nextDueAt ? String(d.review.nextDueAt).slice(0, 10) : "",
    d.approver || d.approvedBy || "",
  ]);
}

function grcDocumentsSummaryReportBody(list) {
  const esc = (typeof grkEscapeHtml === "function") ? grkEscapeHtml : (s) => String(s == null ? "" : s);
  const rows = _docReportRows(list);
  let h = "<h1>" + esc(grcT("grc.documents.report.title")) + "</h1>";
  if (typeof grkDateStamp === "function") {
    h += "<p>" + esc(grkDateStamp()) + "</p>";
  }
  if (!rows.length) return h + "<p>" + esc(grcT("grc.documents.report.empty")) + "</p>";
  const cols = [
    "grc.documents.report.colType", "grc.documents.report.colTitle",
    "grc.documents.report.colVersion", "grc.documents.report.colStatus",
    "grc.documents.report.colEffective", "grc.documents.report.colNextReview",
    "grc.documents.report.colApprover",
  ];
  h += "<table><thead><tr>" + cols.map((k) => "<th>" + esc(grcT(k)) + "</th>").join("") + "</tr></thead><tbody>";
  h += rows.map((r) => "<tr>" + r.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>").join("");
  h += "</tbody></table>";
  return h;
}

function exportGrcDocumentsSummaryWord(list) {
  const stamp = (typeof grkDateStamp === "function") ? grkDateStamp() : "";
  grkExportWord(grcDocumentsSummaryReportBody(list),
    "documents-sommaire-" + stamp + ".doc", grcT("grc.documents.report.title"));
}

function exportGrcDocumentsSummaryCsv(list) {
  if (typeof grkExportGated === "function" && grkExportGated()) return;
  const cols = [
    "grc.documents.report.colType", "grc.documents.report.colTitle",
    "grc.documents.report.colVersion", "grc.documents.report.colStatus",
    "grc.documents.report.colEffective", "grc.documents.report.colNextReview",
    "grc.documents.report.colApprover",
  ];
  const rows = [cols.map((k) => grcT(k))].concat(_docReportRows(list));
  const stamp = (typeof grkDateStamp === "function") ? grkDateStamp() : "";
  grkExportCsv(rows, "documents-sommaire-" + stamp + ".csv");
}

function exportGrcDocumentsAuthorityCsv(list) {
  if (typeof grkExportGated === "function" && grkExportGated()) return;
  const rows = [["document", "approver", "version", "approvedAt"]];
  grcDocAuthorityTable(list).forEach((r) => {
    rows.push([r.title, r.approver, r.version, r.approvedAt ? String(r.approvedAt).slice(0, 10) : ""]);
  });
  const stamp = (typeof grkDateStamp === "function") ? grkDateStamp() : "";
  grkExportCsv(rows, "documents-registre-autorite-" + stamp + ".csv");
}

async function exportGrcDocumentsJson() {
  const stamp = (typeof grkDateStamp === "function") ? grkDateStamp() : "";
  await grkExportJson(getGrcDocuments(), "documents-" + stamp + ".json");
}
