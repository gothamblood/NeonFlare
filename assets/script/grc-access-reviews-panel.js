/* Panneaux IAM -- Campagne de recertification et Mouvement (JML),
   rendus dans le corps de l'accordéon du registre (grc/iam.html) par
   grc-access-reviews.js via grkPanel du kit. Voir
   spec/grc-registry-upgrades/40-iam-access-reviews.md.

   AUCUNE logique de store ici : lectures/écritures via les helpers
   grcAr* de grc-access-reviews.js. Chargé APRÈS grc-access-reviews.js
   et AVANT initGrcIamRegistry().

   État (40-iam-access-reviews.md §6) :
   - T3 : panneau Campagne (Fiche / Lignes + coller-parser + progression).
   - T4 : Sign-off (garde 0 pending, verrou, ré-ouverture).
   - T5 : panneau JML.  T6 : Export. */

/* ---------- helpers d'affichage --------------------------- */

function _arTextArea(labelKey, value, onCommit, rows) {
  const ta = document.createElement("textarea");
  ta.rows = rows || 2;
  ta.value = value || "";
  ta.addEventListener("change", () => onCommit(ta.value));
  return grkField(grcT(labelKey), ta);
}

function _arDate(value, onCommit) {
  const inp = document.createElement("input");
  inp.type = "date";
  inp.value = value ? String(value).slice(0, 10) : "";
  inp.addEventListener("change", () => onCommit(inp.value || null));
  return inp;
}

function _arAddBtn(form, i18nKey) {
  const b = document.createElement("button");
  b.type = "submit";
  b.className = "grc-registry-add-btn";
  b.textContent = grcT(i18nKey);
  form.appendChild(b);
}

/* ================================================================== *
 *  Panneau CAMPAGNE
 * ================================================================== */

function _campRenderFiche(root, e) {
  const id = e.id;
  const hint = document.createElement("p");
  hint.className = "grk-hint";
  hint.textContent = grcT("grc.iam.fiche.editHint");
  root.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const st = grkSelect(GRC_AR_CAMPAIGN_STATUSES, e.status, (s) => grcT("grc.iam.cs." + s));
  st.addEventListener("change", () => { grcArSetCampaignCore(id, { status: st.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.iam.camp.status"), st));

  grid.appendChild(grkField(grcT("grc.iam.camp.openedAt"),
    _arDate(e.openedAt, (v) => grcArSetCampaignCore(id, { openedAt: v }))));
  grid.appendChild(grkField(grcT("grc.iam.camp.dueAt"),
    _arDate(e.dueAt, (v) => { grcArSetCampaignCore(id, { dueAt: v }); grkRefresh(grid); })));
  const cad = document.createElement("input");
  cad.type = "number";
  cad.min = "1";
  cad.value = e.cadenceMonths || 6;
  cad.addEventListener("change", () => grcArSetCampaignCore(id, { cadenceMonths: cad.value }));
  grid.appendChild(grkField(grcT("grc.iam.camp.cadenceMonths"), cad));
  root.appendChild(grid);

  if (grcArCampaignOverdue(e)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.iam.camp.overdueAlert");
    root.appendChild(warn);
  }
  const next = grcArNextCampaignDue(e);
  if (next) {
    const p = document.createElement("p");
    p.className = "grk-hint";
    p.textContent = grcT("grc.iam.camp.nextDue").replace("{value}", grkFmtDateTime(next));
    root.appendChild(p);
  }
}

function _campRenderLignes(root, e) {
  const id = e.id;
  const locked = e.status === "signed-off";
  const p = grcArCampaignProgress(e);

  const prog = document.createElement("p");
  prog.className = "grk-hint";
  prog.textContent = grcT("grc.iam.lines.progress")
    .replace("{reviewed}", p.reviewed).replace("{total}", p.total)
    .replace("{pct}", p.pct).replace("{done}", p.done);
  root.appendChild(prog);

  if (locked) {
    const l = document.createElement("p");
    l.className = "grc-sup-warn";
    l.textContent = grcT("grc.iam.lines.locked");
    root.appendChild(l);
  }

  const list = grkList(root, "grc.iam.lines.title");
  e.lines.forEach((ln) => {
    const row = grkRow();
    row.classList.add("grc-ar-line");

    const subj = document.createElement("input");
    subj.type = "text";
    subj.className = "grk-inv-grow";
    subj.placeholder = grcT("grc.iam.lines.subject");
    subj.value = ln.subject || "";
    subj.disabled = locked;
    subj.addEventListener("change", () => grcArUpdateLine(id, ln.id, { subject: subj.value }));
    row.appendChild(subj);

    const acc = document.createElement("input");
    acc.type = "text";
    acc.className = "grk-inv-grow";
    acc.placeholder = grcT("grc.iam.lines.access");
    acc.value = ln.access || "";
    acc.disabled = locked;
    acc.addEventListener("change", () => grcArUpdateLine(id, ln.id, { access: acc.value }));
    row.appendChild(acc);

    const lu = document.createElement("input");
    lu.type = "date";
    lu.title = grcT("grc.iam.lines.lastUsed");
    lu.value = ln.lastUsed ? ln.lastUsed.slice(0, 10) : "";
    lu.disabled = locked;
    lu.addEventListener("change", () => grcArUpdateLine(id, ln.id, { lastUsed: lu.value || null }));
    row.appendChild(lu);

    const dec = grkSelect(GRC_AR_LINE_DECISIONS, ln.decision, (d) => grcT("grc.iam.dec." + d));
    dec.disabled = locked;
    dec.addEventListener("change", () => { grcArUpdateLine(id, ln.id, { decision: dec.value }); grkRefresh(row); });
    row.appendChild(dec);

    const doneWrap = document.createElement("label");
    doneWrap.className = "grc-sup-check";
    const doneCb = document.createElement("input");
    doneCb.type = "checkbox";
    doneCb.checked = !!ln.done;
    doneCb.disabled = locked;
    doneCb.addEventListener("change", () => grcArUpdateLine(id, ln.id, { done: doneCb.checked }));
    doneWrap.appendChild(doneCb);
    doneWrap.appendChild(document.createTextNode(" " + grcT("grc.iam.lines.done")));
    row.appendChild(doneWrap);

    if (!locked) row.appendChild(grkDelBtn(() => { grcArRemoveLine(id, ln.id); grkRefresh(row); }));

    // 2e ligne : justification
    const row2 = grkRow();
    row2.classList.add("grc-ar-line-2");
    const just = document.createElement("input");
    just.type = "text";
    just.className = "grk-inv-grow";
    just.placeholder = grcT("grc.iam.lines.justification");
    just.value = ln.justification || "";
    just.disabled = locked;
    just.addEventListener("change", () => grcArUpdateLine(id, ln.id, { justification: just.value }));
    row2.appendChild(just);

    list.appendChild(row);
    list.appendChild(row2);
  });
  if (!e.lines.length) list.appendChild(grkEmptyLine("grc.iam.empty"));

  if (!locked) {
    const nSubj = document.createElement("input");
    nSubj.type = "text";
    nSubj.className = "grk-inv-grow";
    nSubj.placeholder = grcT("grc.iam.lines.subject");
    const nAcc = document.createElement("input");
    nAcc.type = "text";
    nAcc.className = "grk-inv-grow";
    nAcc.placeholder = grcT("grc.iam.lines.access");
    const addForm = grkAddForm([nSubj, nAcc], (form) => {
      if (!nSubj.value.trim()) return;
      grcArAddLine(id, { subject: nSubj.value.trim(), access: nAcc.value.trim() });
      grkRefresh(form);
    });
    _arAddBtn(addForm, "grc.iam.lines.add");
    root.appendChild(addForm);

    // coller-parser (I1)
    const sec = document.createElement("section");
    sec.className = "grk-sec";
    const bulk = document.createElement("textarea");
    bulk.rows = 3;
    bulk.className = "grc-ar-bulk";
    bulk.placeholder = "jdoe;Domain Admins";
    sec.appendChild(grkField(grcT("grc.iam.lines.bulkLabel"), bulk));
    const bulkBtn = document.createElement("button");
    bulkBtn.type = "button";
    bulkBtn.className = "grc-registry-add-btn";
    bulkBtn.textContent = grcT("grc.iam.lines.bulkAdd");
    bulkBtn.addEventListener("click", () => {
      const n = grcArAddLinesBulk(id, bulk.value);
      if (n) { bulk.value = ""; grkRefresh(bulkBtn); }
    });
    sec.appendChild(bulkBtn);
    root.appendChild(sec);
  }
}

function _campRenderSignoff(root, e) {
  const id = e.id;
  const pending = (e.lines || []).filter((l) => l.decision === "pending").length;

  const hint = document.createElement("p");
  hint.className = "grk-hint";
  hint.textContent = grcT("grc.iam.signoff.hint");
  root.appendChild(hint);

  if (e.status === "signed-off") {
    const done = document.createElement("p");
    done.textContent = grcT("grc.iam.signoff.done")
      .replace("{date}", grkFmtDateTime(e.signedOffAt)).replace("{by}", e.signedOffBy || "—");
    root.appendChild(done);

    const reBtn = document.createElement("button");
    reBtn.type = "button";
    reBtn.className = "grc-registry-io-btn";
    reBtn.textContent = grcT("grc.iam.signoff.reopen");
    reBtn.addEventListener("click", () => {
      const note = window.prompt(grcT("grc.iam.signoff.reopenPrompt"), "");
      if (note == null) return;
      grcArReopenCampaign(id, note);
      grkRefresh(reBtn);
    });
    root.appendChild(reBtn);
  } else {
    if (pending) {
      const blocked = document.createElement("p");
      blocked.className = "grc-sup-warn";
      blocked.textContent = grcT("grc.iam.signoff.blocked").replace("{n}", pending);
      root.appendChild(blocked);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grc-registry-add-btn";
    btn.textContent = grcT("grc.iam.signoff.btn");
    btn.disabled = pending > 0 || !e.lines.length;
    btn.addEventListener("click", () => { grcArSignOffCampaign(id); grkRefresh(btn); });
    root.appendChild(btn);
  }

  if (e.reopenNote) {
    const sec = document.createElement("section");
    sec.className = "grk-sec";
    const h4 = document.createElement("h4");
    h4.textContent = grcT("grc.iam.signoff.reopenLog");
    sec.appendChild(h4);
    const pre = document.createElement("p");
    pre.style.whiteSpace = "pre-wrap";
    pre.className = "grk-hint";
    pre.textContent = e.reopenNote;
    sec.appendChild(pre);
    root.appendChild(sec);
  }
}

/* ================================================================== *
 *  Panneau JML
 * ================================================================== */

function _jmlRenderFiche(root, e) {
  const id = e.id;
  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const type = grkSelect(GRC_AR_JML_TYPES, e.type, (t) => grcT("grc.iam.jt." + t));
  type.addEventListener("change", () => { grcArSetJmlCore(id, { type: type.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.iam.jml.type"), type));

  const status = grkSelect(GRC_AR_JML_STATUSES, e.status, (s) => grcT("grc.iam.js." + s));
  status.addEventListener("change", () => { grcArSetJmlCore(id, { status: status.value }); grkRefresh(grid); });
  grid.appendChild(grkField(grcT("grc.iam.jml.status"), status));

  grid.appendChild(grkField(grcT("grc.iam.jml.at"),
    _arDate(e.at, (v) => { grcArSetJmlCore(id, { at: v }); grkRefresh(grid); })));

  const camp = document.createElement("input");
  camp.type = "text";
  camp.setAttribute("autocomplete", "off");
  camp.value = e.campaignId || "";
  if (typeof getGrcCampaigns === "function") {
    try {
      const dl = document.createElement("datalist");
      dl.id = "grc-jml-camp-" + id;
      getGrcCampaigns().forEach((c) => {
        const o = document.createElement("option");
        o.value = c.id;
        o.textContent = c.title || c.id;
        dl.appendChild(o);
      });
      root.appendChild(dl);
      camp.setAttribute("list", dl.id);
    } catch (err) { /* dégradé */ }
  }
  camp.addEventListener("change", () => grcArSetJmlCore(id, { campaignId: camp.value }));
  grid.appendChild(grkField(grcT("grc.iam.jml.campaignId"), camp));
  root.appendChild(grid);

  if (grcArIsStaleLeaver(e)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.iam.jml.staleAlert");
    root.appendChild(warn);
  }

  root.appendChild(_arTextArea("grc.iam.jml.systems", e.systems,
    (v) => grcArSetJmlCore(id, { systems: v })));
  root.appendChild(_arTextArea("grc.iam.jml.note", e.note,
    (v) => grcArSetJmlCore(id, { note: v })));
}

/* ---------- onglet Export -------------------------------- */

function _campRenderExport(root, e) {
  grkExportButtons(root, "grc.iam.export.hint", [
    { i18n: "grc.iam.export.json", fn: () => exportAccessReviewAsJson(e) },
    { i18n: "grc.iam.export.reportWord", fn: () => exportCampaignReportAsWord(e) },
    { i18n: "grc.iam.export.linesCsv", fn: () => exportCampaignLinesCsv(e) },
  ]);
}

function _jmlRenderExport(root, e) {
  grkExportButtons(root, "grc.iam.export.hint", [
    { i18n: "grc.iam.export.json", fn: () => exportAccessReviewAsJson(e) },
  ]);
}

/* ---------- montage ----------------------------------- */

const GRC_CAMP_TABS = [
  { key: "fiche", i18n: "grc.iam.tab.fiche", render: _campRenderFiche },
  { key: "lignes", i18n: "grc.iam.tab.lignes", render: _campRenderLignes },
  { key: "signoff", i18n: "grc.iam.tab.signoff", render: _campRenderSignoff },
  { key: "export", i18n: "grc.iam.tab.export", render: _campRenderExport },
];

const GRC_JML_TABS = [
  { key: "fiche", i18n: "grc.iam.tab.fiche", render: _jmlRenderFiche },
  { key: "export", i18n: "grc.iam.tab.export", render: _jmlRenderExport },
];

function renderCampaignPanel(container, entry) {
  grkPanel(container, entry, {
    idAttr: "data-iam-id", tabs: GRC_CAMP_TABS,
    ensure: grcAccessReviewEnsureShape, store: _grcAccessReviewsStore,
  });
}

function renderJmlPanel(container, entry) {
  grkPanel(container, entry, {
    idAttr: "data-iam-id", tabs: GRC_JML_TABS,
    ensure: grcAccessReviewEnsureShape, store: _grcAccessReviewsStore,
  });
}
