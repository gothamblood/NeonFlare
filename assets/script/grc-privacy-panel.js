/* Panneaux vie privée -- Traitement (ROPA) et Demande (DSR), rendus
   dans le corps de l'accordéon du registre (grc/vie-privee.html) par
   grc-privacy.js via grkPanel du kit. Voir spec/grc-registry-upgrades/
   50-privacy-loi25.md.

   AUCUNE logique de store ici : lectures/écritures via les helpers
   grcPriv* de grc-privacy.js. Chargé APRÈS grc-privacy.js et AVANT
   initGrcPrivacyRegistry().

   État (50-privacy-loi25.md §6) :
   - T3 : Traitement Fiche + Transferts & conservation.   <-- ICI
   - T4 : Traitement DPIA + Sécurité & revue.
   - T5 : Panneau DSR.  T6 : Export. */

/* ---------- petits helpers d'affichage ---------------------- */

function _privField(labelKey, control) {
  return grkField(grcT(labelKey), control);
}

function _privInput(value, onCommit, type) {
  const inp = document.createElement("input");
  inp.type = type || "text";
  inp.value = value == null ? "" : value;
  inp.addEventListener("change", () => onCommit(inp.value));
  return inp;
}

function _privDate(value, onCommit) {
  const inp = document.createElement("input");
  inp.type = "date";
  inp.value = value ? String(value).slice(0, 10) : "";
  inp.addEventListener("change", () => onCommit(inp.value || null));
  return inp;
}

function _privTextArea(labelKey, value, onCommit) {
  const ta = document.createElement("textarea");
  ta.rows = 2;
  ta.value = value || "";
  ta.addEventListener("change", () => onCommit(ta.value));
  return grkField(grcT(labelKey), ta);
}

function _privCheckbox(labelKey, checked, onToggle) {
  const wrap = document.createElement("label");
  wrap.className = "grc-sup-check";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!checked;
  cb.addEventListener("change", () => onToggle(cb.checked));
  wrap.appendChild(cb);
  wrap.appendChild(document.createTextNode(" " + grcT(labelKey)));
  return wrap;
}

function _privAddBtn(form, i18nKey) {
  const b = document.createElement("button");
  b.type = "submit";
  b.className = "grc-registry-add-btn";
  b.textContent = grcT(i18nKey);
  form.appendChild(b);
}

/* ================================================================== *
 *  Panneau TRAITEMENT
 * ================================================================== */

function _procRenderFiche(root, e) {
  const id = e.id;
  const hint = document.createElement("p");
  hint.className = "grk-hint";
  hint.textContent = grcT("grc.vie-privee.fiche.editHint");
  root.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  const lb = grkSelect(GRC_PRIV_LEGAL_BASIS, e.legalBasis, (v) => grcT("grc.vie-privee.lb." + v));
  lb.addEventListener("change", () => grcPrivSetProcessingCore(id, { legalBasis: lb.value }));
  grid.appendChild(_privField("grc.vie-privee.proc.legalBasis", lb));
  root.appendChild(grid);

  root.appendChild(_privTextArea("grc.vie-privee.proc.dataCategories", e.dataCategories,
    (v) => grcPrivSetProcessingCore(id, { dataCategories: v })));
  root.appendChild(_privTextArea("grc.vie-privee.proc.dataSubjects", e.dataSubjects,
    (v) => grcPrivSetProcessingCore(id, { dataSubjects: v })));
  root.appendChild(_privTextArea("grc.vie-privee.proc.recipients", e.recipients,
    (v) => grcPrivSetProcessingCore(id, { recipients: v })));
}

function _procRenderTransferts(root, e) {
  const id = e.id;

  /* -- transferts -- */
  const list = grkList(root, "grc.vie-privee.xfer.title");
  e.transfers.forEach((t) => {
    const row = grkRow();
    const dest = document.createElement("input");
    dest.type = "text";
    dest.className = "grk-inv-grow";
    dest.placeholder = grcT("grc.vie-privee.xfer.destination");
    dest.value = t.destination || "";
    dest.addEventListener("change", () => grcPrivUpdateTransfer(id, t.id, { destination: dest.value }));
    row.appendChild(dest);
    const sg = grkSelect(GRC_PRIV_TRANSFER_SAFEGUARDS, t.safeguard, (s) => grcT("grc.vie-privee.sg." + s));
    sg.addEventListener("change", () => { grcPrivUpdateTransfer(id, t.id, { safeguard: sg.value }); grkRefresh(row); });
    row.appendChild(sg);
    const note = document.createElement("input");
    note.type = "text";
    note.className = "grk-inv-grow";
    note.placeholder = grcT("grc.vie-privee.xfer.note");
    note.value = t.note || "";
    note.addEventListener("change", () => grcPrivUpdateTransfer(id, t.id, { note: note.value }));
    row.appendChild(note);
    row.appendChild(grkDelBtn(() => { grcPrivRemoveTransfer(id, t.id); grkRefresh(row); }));
    list.appendChild(row);
  });
  if (!e.transfers.length) list.appendChild(grkEmptyLine("grc.vie-privee.empty"));

  const nDest = document.createElement("input");
  nDest.type = "text";
  nDest.className = "grk-inv-grow";
  nDest.placeholder = grcT("grc.vie-privee.xfer.destination");
  const nSg = grkSelect(GRC_PRIV_TRANSFER_SAFEGUARDS, "contract", (s) => grcT("grc.vie-privee.sg." + s));
  const addForm = grkAddForm([nDest, nSg], (form) => {
    if (!nDest.value.trim()) return;
    grcPrivAddTransfer(id, { destination: nDest.value.trim(), safeguard: nSg.value });
    grkRefresh(form);
  });
  _privAddBtn(addForm, "grc.vie-privee.xfer.add");
  root.appendChild(addForm);

  if (grcPrivHasUnsafeTransfer(e)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.vie-privee.xfer.unsafeAlert");
    root.appendChild(warn);
  }

  /* -- conservation -- */
  const sec = document.createElement("section");
  sec.className = "grk-sec";
  const h4 = document.createElement("h4");
  h4.textContent = grcT("grc.vie-privee.ret.title");
  sec.appendChild(h4);
  const rGrid = document.createElement("div");
  rGrid.className = "grk-formgrid";
  rGrid.appendChild(_privField("grc.vie-privee.ret.months",
    _privInput(e.retention.months, (v) => grcPrivSetRetention(id, { months: v }), "number")));
  rGrid.appendChild(_privField("grc.vie-privee.ret.anchor",
    _privDate(e.retention.anchor, (v) => { grcPrivSetRetention(id, { anchor: v }); grkRefresh(rGrid); })));
  sec.appendChild(rGrid);
  sec.appendChild(_privTextArea("grc.vie-privee.ret.policy", e.retention.policy,
    (v) => grcPrivSetRetention(id, { policy: v })));
  sec.appendChild(_privTextArea("grc.vie-privee.ret.basis", e.retention.basis,
    (v) => grcPrivSetRetention(id, { basis: v })));
  if (grcPrivRetentionExpired(e)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.vie-privee.ret.expiredAlert");
    sec.appendChild(warn);
  }
  root.appendChild(sec);
}

function _procRenderDpia(root, e) {
  const id = e.id;
  const scale = ["", "1", "2", "3", "4", "5"];

  root.appendChild(_privCheckbox("grc.vie-privee.dpia.required", e.dpia.required, (on) => {
    grcPrivSetDpia(id, { required: on });
    grkRefresh(root);
  }));

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  [["sensitivity", "grc.vie-privee.dpia.sensitivity"],
   ["volume", "grc.vie-privee.dpia.volume"],
   ["exposure", "grc.vie-privee.dpia.exposure"]].forEach(([k, lk]) => {
    const cur = e.dpia[k] == null ? "" : String(e.dpia[k]);
    const sel = grkSelect(scale, cur, (v) => v || "—");
    sel.addEventListener("change", () => {
      const patch = {}; patch[k] = sel.value;
      grcPrivSetDpia(id, patch); grkRefresh(grid);
    });
    grid.appendChild(_privField(lk, sel));
  });
  root.appendChild(grid);

  const band = grcPrivDpiaScoreBand(e);
  const line = document.createElement("p");
  line.className = "grc-sup-score-line";
  const b = document.createElement("span");
  b.className = "grc-crit-badge " + band.cls;
  b.textContent = grcT("grc.vie-privee.dpia.score").replace("{value}", band.score == null ? band.text : (band.score + " · " + band.text));
  line.appendChild(b);
  root.appendChild(line);

  if (grcPrivDpiaRequiredNotDone(e)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.vie-privee.dpia.notDoneAlert");
    root.appendChild(warn);
  }

  root.appendChild(_privField("grc.vie-privee.dpia.doneAt",
    _privDate(e.dpia.doneAt, (v) => { grcPrivSetDpia(id, { doneAt: v }); grkRefresh(root); })));
  root.appendChild(_privTextArea("grc.vie-privee.dpia.conclusion", e.dpia.conclusion,
    (v) => grcPrivSetDpia(id, { conclusion: v })));
}

function _procRenderSecurite(root, e) {
  const id = e.id;
  root.appendChild(_privTextArea("grc.vie-privee.proc.security", e.security,
    (v) => grcPrivSetProcessingCore(id, { security: v })));

  const sec = document.createElement("section");
  sec.className = "grk-sec";
  const h4 = document.createElement("h4");
  h4.textContent = grcT("grc.vie-privee.rev.title");
  if (grcPrivacyEnsureShape(e).review.lastReviewedAt &&
      Date.parse(grcPrivacyEnsureShape(e).review.nextDueAt) < Date.now()) {
    const badge = document.createElement("span");
    badge.className = "grc-sup-mini-badge grc-sup-badge-review";
    badge.textContent = " " + grcT("grc.vie-privee.rev.overdue");
    h4.appendChild(badge);
  } else if (!grcPrivacyEnsureShape(e).review.lastReviewedAt) {
    const badge = document.createElement("span");
    badge.className = "grc-sup-mini-badge grc-sup-badge-review";
    badge.textContent = " " + grcT("grc.vie-privee.rev.overdue");
    h4.appendChild(badge);
  }
  sec.appendChild(h4);
  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  grid.appendChild(_privField("grc.vie-privee.rev.lastReviewedAt",
    _privDate(e.review.lastReviewedAt, (v) => { grcPrivSetReview(id, { lastReviewedAt: v }); grkRefresh(grid); })));
  const cad = document.createElement("input");
  cad.type = "number";
  cad.min = "1";
  cad.value = e.review.cadenceMonths || 12;
  cad.addEventListener("change", () => { grcPrivSetReview(id, { cadenceMonths: cad.value }); grkRefresh(grid); });
  grid.appendChild(_privField("grc.vie-privee.rev.cadenceMonths", cad));
  sec.appendChild(grid);
  const due = document.createElement("p");
  due.className = "grk-hint";
  due.textContent = grcT("grc.vie-privee.rev.nextDueAt").replace("{value}", grkFmtDateTime(e.review.nextDueAt));
  sec.appendChild(due);
  root.appendChild(sec);
}

/* ================================================================== *
 *  Panneau DSR
 * ================================================================== */

function _dsrRenderFiche(root, e) {
  const id = e.id;
  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const type = grkSelect(GRC_PRIV_DSR_TYPES, e.type, (t) => grcT("grc.vie-privee.dsrType." + t));
  type.addEventListener("change", () => grcPrivSetDsrCore(id, { type: type.value }));
  grid.appendChild(_privField("grc.vie-privee.dsr.type", type));

  const status = grkSelect(GRC_PRIV_DSR_STATUSES, e.status, (s) => grcT("grc.vie-privee.dsrSt." + s));
  status.addEventListener("change", () => { grcPrivSetDsrCore(id, { status: status.value }); grkRefresh(grid); });
  grid.appendChild(_privField("grc.vie-privee.dsr.status", status));

  grid.appendChild(_privField("grc.vie-privee.dsr.receivedAt",
    _privDate(e.receivedAt, (v) => { grcPrivSetDsrCore(id, { receivedAt: v }); grkRefresh(grid); })));
  grid.appendChild(_privField("grc.vie-privee.dsr.dueAt",
    _privDate(e.dueAt, (v) => { grcPrivSetDsrCore(id, { dueAt: v }); grkRefresh(grid); })));
  root.appendChild(grid);

  const hint = document.createElement("p");
  hint.className = "grk-hint";
  hint.textContent = grcT("grc.vie-privee.dsr.requesterHint");
  root.appendChild(hint);

  if (grcPrivDsrOverdue(e)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.vie-privee.dsr.overdueAlert");
    root.appendChild(warn);
  }
}

function _dsrRenderReponse(root, e) {
  const id = e.id;
  const list = grkList(root, "grc.vie-privee.dsr.processingIds");

  const names = {};
  if (typeof getGrcProcessings === "function") {
    try { getGrcProcessings().forEach((p) => { names[p.id] = p.name || p.id; }); } catch (err) { /* dégradé */ }
  }
  e.processingIds.forEach((pid) => {
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow";
    span.textContent = names[pid] || pid;
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcPrivRemoveDsrProcessing(id, pid); grkRefresh(row); }));
    list.appendChild(row);
  });
  if (!e.processingIds.length) list.appendChild(grkEmptyLine("grc.vie-privee.empty"));

  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "grk-inv-grow";
  inp.setAttribute("autocomplete", "off");
  const procList = (typeof getGrcProcessings === "function") ? getGrcProcessings() : [];
  if (procList.length) {
    const dl = document.createElement("datalist");
    dl.id = "grc-dsr-proc-" + id;
    procList.forEach((p) => {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name || p.id;
      dl.appendChild(o);
    });
    root.appendChild(dl);
    inp.setAttribute("list", dl.id);
  }
  const addForm = grkAddForm([inp], (form) => {
    if (!inp.value.trim()) return;
    grcPrivAddDsrProcessing(id, inp.value.trim());
    grkRefresh(form);
  });
  _privAddBtn(addForm, "grc.vie-privee.dsr.addProcessing");
  root.appendChild(addForm);

  root.appendChild(_privTextArea("grc.vie-privee.dsr.response", e.response,
    (v) => grcPrivSetDsrResponse(id, { response: v })));
  root.appendChild(_privTextArea("grc.vie-privee.dsr.refusalReason", e.refusalReason,
    (v) => grcPrivSetDsrResponse(id, { refusalReason: v })));
}

/* ---------- onglet Export --------------------------------- */

function _procRenderExport(root, e) {
  grkExportButtons(root, "grc.vie-privee.export.hint", [
    { i18n: "grc.vie-privee.export.json", fn: () => exportPrivacyAsJson(e) },
    { i18n: "grc.vie-privee.export.ropaWord", fn: () => exportRopaAsWord(e) },
    { i18n: "grc.vie-privee.export.ropaCsv", fn: () => exportRopaCsv(getGrcProcessings()) },
  ]);
}

function _dsrRenderExport(root, e) {
  grkExportButtons(root, "grc.vie-privee.export.hint", [
    { i18n: "grc.vie-privee.export.json", fn: () => exportPrivacyAsJson(e) },
    { i18n: "grc.vie-privee.export.dsrPdf", fn: () => exportDsrAckAsPdf(e) },
    { i18n: "grc.vie-privee.export.dsrCsv", fn: () => exportDsrCsv(getGrcDsrs()) },
  ]);
}

/* ---------- montage --------------------------------------- */

const GRC_PROC_TABS = [
  { key: "fiche", i18n: "grc.vie-privee.tab.fiche", render: _procRenderFiche },
  { key: "transferts", i18n: "grc.vie-privee.tab.transferts", render: _procRenderTransferts },
  { key: "dpia", i18n: "grc.vie-privee.tab.dpia", render: _procRenderDpia },
  { key: "securite", i18n: "grc.vie-privee.tab.securite", render: _procRenderSecurite },
  { key: "export", i18n: "grc.vie-privee.tab.export", render: _procRenderExport },
];

const GRC_DSR_TABS = [
  { key: "fiche", i18n: "grc.vie-privee.tab.fiche", render: _dsrRenderFiche },
  { key: "reponse", i18n: "grc.vie-privee.tab.reponse", render: _dsrRenderReponse },
  { key: "export", i18n: "grc.vie-privee.tab.export", render: _dsrRenderExport },
];

function renderProcessingPanel(container, entry) {
  grkPanel(container, entry, {
    idAttr: "data-priv-id", tabs: GRC_PROC_TABS,
    ensure: grcPrivacyEnsureShape, store: _grcPrivacyStore,
  });
}

function renderDsrPanel(container, entry) {
  grkPanel(container, entry, {
    idAttr: "data-priv-id", tabs: GRC_DSR_TABS,
    ensure: grcPrivacyEnsureShape, store: _grcPrivacyStore,
  });
}
