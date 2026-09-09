/* Panneau d'un fournisseur -- barre d'onglets (grkPanel du kit) rendue
   dans le corps de l'accordéon du registre (grc/fournisseurs.html) par
   grc-suppliers.js. Voir spec/grc-registry-upgrades/10-fournisseurs.md.

   AUCUNE logique de store ici : lectures/écritures via les helpers
   grcSup* de grc-suppliers.js. Chargé APRÈS grc-suppliers.js et AVANT
   initGrcSuppliersRegistry().

   État (10-fournisseurs.md §6) :
   - T3 : Fiche + Risque tiers.        <-- ICI
   - T4 : Contrat + Certifications.
   - T5 : Cycle de vie.  T6 : Incidents & suivi.  T7 : Export. */

/* ---------- petits utilitaires d'affichage ----------------------- */

function _supSelectField(labelKey, values, current, i18nPrefix, onChange) {
  const sel = grkSelect(values, current, (v) => grcT(i18nPrefix + v));
  sel.addEventListener("change", () => onChange(sel.value, sel));
  return grkField(grcT(labelKey), sel);
}

function _supNumField(labelKey, value, onChange, attrs) {
  const inp = document.createElement("input");
  inp.type = "number";
  const a = attrs || {};
  if (a.min != null) inp.min = String(a.min);
  if (a.max != null) inp.max = String(a.max);
  inp.step = "1";
  inp.value = value == null ? "" : value;
  inp.addEventListener("change", () => onChange(inp.value, inp));
  return grkField(grcT(labelKey), inp);
}

function _supTextArea(labelKey, value, onCommit) {
  const ta = document.createElement("textarea");
  ta.rows = 2;
  ta.value = value || "";
  ta.addEventListener("change", () => onCommit(ta.value));
  return grkField(grcT(labelKey), ta);
}

function _supDateField(labelKey, iso, onCommit) {
  const inp = document.createElement("input");
  inp.type = "date";
  inp.value = iso ? String(iso).slice(0, 10) : "";
  inp.addEventListener("change", () => onCommit(inp.value || null));
  return grkField(grcT(labelKey), inp);
}

function _supCheckbox(labelKey, checked, onToggle) {
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

// Badge d'échéance d'une certification : expirée / < 90 j / (rien).
function _supCertBadge(cert) {
  if (!cert.expiresAt) return null;
  const t = Date.parse(cert.expiresAt);
  if (isNaN(t)) return null;
  const days = Math.floor((t - Date.now()) / 86400000);
  let cls = null;
  let key = null;
  if (days < 0) { cls = "grc-sup-badge-expired"; key = "grc.fournisseurs.badge.certExpired"; }
  else if (days <= GRC_SUP_SOON_DAYS) { cls = "grc-sup-badge-soon"; key = "grc.fournisseurs.badge.certSoon"; }
  if (!cls) return null;
  const b = document.createElement("span");
  b.className = "grc-sup-mini-badge " + cls;
  b.textContent = grcT(key);
  return b;
}

function _supRiskBadge(supplier) {
  const rs = grcSupRiskScore(supplier);
  const b = document.createElement("span");
  b.className = "grc-crit-badge " + rs.cls;
  b.textContent = grcT("grc.fournisseurs.risk.score").replace("{value}", rs.score);
  return b;
}

/* ---------- onglet Fiche ---------------------------------------- */

function _supRenderFiche(root, s) {
  const id = s.id;

  const hint = document.createElement("p");
  hint.className = "grk-hint";
  hint.textContent = grcT("grc.fournisseurs.fiche.editHint");
  root.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  grid.appendChild(_supSelectField(
    "grc.fournisseurs.form.criticality", GRC_SUP_CRITICALITY, s.criticality,
    "grc.fournisseurs.crit.", (v, el) => { grcSupSetCore(id, { criticality: v }); grkRefresh(el); }));
  grid.appendChild(_supSelectField(
    "grc.fournisseurs.form.dataShared", GRC_SUP_DATA_SHARED, s.dataShared,
    "grc.fournisseurs.data.", (v) => grcSupSetCore(id, { dataShared: v })));
  grid.appendChild(_supSelectField(
    "grc.fournisseurs.form.status", GRC_SUP_STATUS, s.status,
    "grc.fournisseurs.status.", (v) => grcSupSetCore(id, { status: v })));

  const sites = document.createElement("input");
  sites.type = "text";
  sites.value = s.sites || "";
  sites.addEventListener("change", () => grcSupSetCore(id, { sites: sites.value }));
  grid.appendChild(grkField(grcT("grc.fournisseurs.form.sites"), sites));

  root.appendChild(grid);
}

/* ---------- onglet Risque tiers ------------------------------- */

function _supRenderRisque(root, s) {
  const id = s.id;
  const scale = ["1", "2", "3", "4", "5"];
  const refreshPanel = (el) => grkRefresh(el);

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const li = grkSelect(scale, String(s.risk.likelihood || 1), (v) => v);
  li.addEventListener("change", () => { grcSupSetRisk(id, { likelihood: li.value }); refreshPanel(li); });
  grid.appendChild(grkField(grcT("grc.fournisseurs.risk.likelihood"), li));

  const im = grkSelect(scale, String(s.risk.impact || 1), (v) => v);
  im.addEventListener("change", () => { grcSupSetRisk(id, { impact: im.value }); refreshPanel(im); });
  grid.appendChild(grkField(grcT("grc.fournisseurs.risk.impact"), im));

  const resVal = s.risk.residual == null ? "" : String(s.risk.residual);
  const res = grkSelect([""].concat(scale), resVal, (v) => v || "—");
  res.addEventListener("change", () => { grcSupSetRisk(id, { residual: res.value }); refreshPanel(res); });
  grid.appendChild(grkField(grcT("grc.fournisseurs.risk.residual"), res));

  root.appendChild(grid);

  const scoreLine = document.createElement("p");
  scoreLine.className = "grc-sup-score-line";
  scoreLine.appendChild(_supRiskBadge(s));
  root.appendChild(scoreLine);

  if (grcSupRiskAlert(s)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.fournisseurs.risk.alert");
    root.appendChild(warn);
  }

  root.appendChild(_supTextArea("grc.fournisseurs.risk.inherentNotes", s.risk.inherentNotes,
    (v) => grcSupSetRisk(id, { inherentNotes: v })));
  root.appendChild(_supTextArea("grc.fournisseurs.risk.controls", s.risk.controls,
    (v) => grcSupSetRisk(id, { controls: v })));
}

/* ---------- onglet Contrat ------------------------------------ */

function _supRenderContrat(root, s) {
  const id = s.id;
  const c = s.contract;

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const ref = document.createElement("input");
  ref.type = "text";
  ref.value = c.ref || "";
  ref.addEventListener("change", () => grcSupSetContract(id, { ref: ref.value }));
  grid.appendChild(grkField(grcT("grc.fournisseurs.contract.ref"), ref));

  grid.appendChild(_supDateField("grc.fournisseurs.contract.startDate", c.startDate,
    (v) => grcSupSetContract(id, { startDate: v })));
  grid.appendChild(_supDateField("grc.fournisseurs.contract.endDate", c.endDate,
    (v) => { grcSupSetContract(id, { endDate: v }); grkRefresh(grid); }));

  grid.appendChild(_supSelectField(
    "grc.fournisseurs.contract.renewal", GRC_SUP_RENEWAL, c.renewal,
    "grc.fournisseurs.contract.renewal.", (v) => { grcSupSetContract(id, { renewal: v }); grkRefresh(grid); }));

  const delay = document.createElement("input");
  delay.type = "number";
  delay.min = "0";
  delay.value = c.breachNotifDelayH == null ? "" : c.breachNotifDelayH;
  delay.addEventListener("change", () => grcSupSetContract(id, { breachNotifDelayH: delay.value }));
  grid.appendChild(grkField(grcT("grc.fournisseurs.contract.breachNotifDelayH"), delay));

  root.appendChild(grid);

  const checks = document.createElement("div");
  checks.className = "grc-sup-checks";
  [
    ["grc.fournisseurs.contract.securityClauses", "securityClauses"],
    ["grc.fournisseurs.contract.rightToAudit", "rightToAudit"],
    ["grc.fournisseurs.contract.exitPlan", "exitPlan"],
    ["grc.fournisseurs.contract.dpaSigned", "dpaSigned"],
  ].forEach(([k, field]) => {
    checks.appendChild(_supCheckbox(k, c[field], (on) => {
      const patch = {}; patch[field] = on;
      grcSupSetContract(id, patch);
    }));
  });
  root.appendChild(checks);

  if (grcSupContractEndingSoon(s)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.fournisseurs.contract.endingSoon");
    root.appendChild(warn);
  }
}

/* ---------- onglet Certifications --------------------------- */

function _supRenderCertifs(root, s) {
  const id = s.id;
  const list = grkList(root, "grc.fournisseurs.tab.certifs");

  s.certifications.forEach((cert) => {
    const row = grkRow();

    const kind = grkSelect(GRC_SUP_CERT_KINDS, cert.kind, (k) => grcT("grc.fournisseurs.certKind." + k));
    kind.addEventListener("change", () => grcSupUpdateCert(id, cert.id, { kind: kind.value }));
    row.appendChild(kind);

    const scope = document.createElement("input");
    scope.type = "text";
    scope.className = "grk-inv-grow";
    scope.placeholder = grcT("grc.fournisseurs.cert.scope");
    scope.value = cert.scope || "";
    scope.addEventListener("change", () => grcSupUpdateCert(id, cert.id, { scope: scope.value }));
    row.appendChild(scope);

    const obtained = document.createElement("input");
    obtained.type = "date";
    obtained.title = grcT("grc.fournisseurs.cert.obtainedAt");
    obtained.value = cert.obtainedAt ? cert.obtainedAt.slice(0, 10) : "";
    obtained.addEventListener("change", () => grcSupUpdateCert(id, cert.id, { obtainedAt: obtained.value || null }));
    row.appendChild(obtained);

    const expires = document.createElement("input");
    expires.type = "date";
    expires.title = grcT("grc.fournisseurs.cert.expiresAt");
    expires.value = cert.expiresAt ? cert.expiresAt.slice(0, 10) : "";
    expires.addEventListener("change", () => { grcSupUpdateCert(id, cert.id, { expiresAt: expires.value || null }); grkRefresh(row); });
    row.appendChild(expires);

    const badge = _supCertBadge(cert);
    if (badge) row.appendChild(badge);

    const ev = document.createElement("input");
    ev.type = "text";
    ev.className = "grk-inv-grow";
    ev.placeholder = grcT("grc.fournisseurs.cert.evidence");
    ev.value = cert.evidence || "";
    ev.addEventListener("change", () => grcSupUpdateCert(id, cert.id, { evidence: ev.value }));
    row.appendChild(ev);

    row.appendChild(grkDelBtn(() => { grcSupRemoveCert(id, cert.id); grkRefresh(row); }));
    list.appendChild(row);
  });

  if (!s.certifications.length) list.appendChild(grkEmptyLine("grc.fournisseurs.inc.empty"));

  const nk = grkSelect(GRC_SUP_CERT_KINDS, "iso27001", (k) => grcT("grc.fournisseurs.certKind." + k));
  const nExp = document.createElement("input");
  nExp.type = "date";
  nExp.title = grcT("grc.fournisseurs.cert.expiresAt");
  const addForm = grkAddForm([nk, nExp], (form) => {
    grcSupAddCert(id, { kind: nk.value, expiresAt: nExp.value || null });
    grkRefresh(form);
  });
  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "grc-registry-add-btn";
  addBtn.textContent = grcT("grc.fournisseurs.cert.add");
  addForm.appendChild(addBtn);
  list.parentNode.appendChild(addForm);
}

/* ---------- onglet Cycle de vie ----------------------------- */

function _supRenderCycle(root, s) {
  const id = s.id;

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";
  grid.appendChild(_supDateField("grc.fournisseurs.cycle.onboardedAt", s.lifecycle.onboardedAt,
    (v) => grcSupSetLifecycle(id, { onboardedAt: v })));
  grid.appendChild(_supDateField("grc.fournisseurs.cycle.offboardedAt", s.lifecycle.offboardedAt,
    (v) => grcSupSetLifecycle(id, { offboardedAt: v })));
  root.appendChild(grid);

  /* -- revue périodique -- */
  const rev = document.createElement("section");
  rev.className = "grk-sec";
  const h4 = document.createElement("h4");
  h4.textContent = grcT("grc.fournisseurs.cycle.reviewTitle");
  if (grcSupIsReviewOverdue(s)) {
    const b = document.createElement("span");
    b.className = "grc-sup-mini-badge grc-sup-badge-review";
    b.textContent = " " + grcT("grc.fournisseurs.badge.reviewOverdue");
    h4.appendChild(b);
  }
  rev.appendChild(h4);

  const rGrid = document.createElement("div");
  rGrid.className = "grk-formgrid";
  rGrid.appendChild(_supDateField("grc.fournisseurs.cycle.lastReviewedAt", s.lifecycle.review.lastReviewedAt,
    (v) => { grcSupSetReview(id, { lastReviewedAt: v }); grkRefresh(rGrid); }));
  const cad = document.createElement("input");
  cad.type = "number";
  cad.min = "1";
  cad.value = s.lifecycle.review.cadenceMonths || 12;
  cad.addEventListener("change", () => { grcSupSetReview(id, { cadenceMonths: cad.value }); grkRefresh(rGrid); });
  rGrid.appendChild(grkField(grcT("grc.fournisseurs.cycle.cadenceMonths"), cad));
  rev.appendChild(rGrid);

  const due = document.createElement("p");
  due.className = "grk-hint";
  due.textContent = grcT("grc.fournisseurs.cycle.nextDueAt")
    .replace("{value}", grkFmtDateTime(s.lifecycle.review.nextDueAt));
  rev.appendChild(due);
  root.appendChild(rev);

  /* -- checklist ordonnée -- */
  const list = grkList(root, "grc.fournisseurs.cycle.stepsTitle");
  grkOrderedList(list, s.lifecycle.steps, {
    emptyKey: "grc.fournisseurs.inc.empty",
    onMove: (sid, dir) => grcSupMoveStep(id, sid, dir),
    onRemove: (sid) => grcSupRemoveStep(id, sid),
    render: (st) => {
      const row = grkRow();
      const done = document.createElement("input");
      done.type = "checkbox";
      done.checked = !!st.done;
      done.addEventListener("change", () => grcSupUpdateStep(id, st.id, { done: done.checked }));
      row.appendChild(done);
      const txt = document.createElement("input");
      txt.type = "text";
      txt.className = "grk-inv-grow";
      txt.placeholder = grcT("grc.fournisseurs.cycle.stepText");
      txt.value = st.text || "";
      txt.addEventListener("change", () => grcSupUpdateStep(id, st.id, { text: txt.value }));
      row.appendChild(txt);
      const owner = document.createElement("input");
      owner.type = "text";
      owner.placeholder = grcT("grc.fournisseurs.cycle.stepOwner");
      owner.value = st.owner || "";
      owner.addEventListener("change", () => grcSupUpdateStep(id, st.id, { owner: owner.value }));
      row.appendChild(owner);
      return row;
    },
  });

  const nTxt = document.createElement("input");
  nTxt.type = "text";
  nTxt.className = "grk-inv-grow";
  nTxt.placeholder = grcT("grc.fournisseurs.cycle.stepText");
  const nOwn = document.createElement("input");
  nOwn.type = "text";
  nOwn.placeholder = grcT("grc.fournisseurs.cycle.stepOwner");
  const addForm = grkAddForm([nTxt, nOwn], (form) => {
    if (!nTxt.value.trim()) return;
    grcSupAddStep(id, { text: nTxt.value.trim(), owner: nOwn.value.trim() });
    grkRefresh(form);
  });
  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "grc-registry-add-btn";
  addBtn.textContent = grcT("grc.fournisseurs.cycle.addStep");
  addForm.appendChild(addBtn);
  root.appendChild(addForm);
}

/* ---------- onglet Incidents & suivi ------------------------ */

// Plans de continuité qui dépendent de ce fournisseur (dep.type ===
// "supplier" et dep.ref == nom OU id). Dégradé silencieux si la
// continuité n'est pas chargée sur la page.
function _supDependentContinuityPlans(supplier) {
  if (typeof getGrcContinuity !== "function") return null;
  try {
    const needle = [supplier.name, supplier.id].filter(Boolean);
    return getGrcContinuity().filter((p) =>
      Array.isArray(p.dependencies) && p.dependencies.some((d) =>
        d && d.type === "supplier" && needle.indexOf(d.ref) !== -1));
  } catch (e) {
    return null;
  }
}

function _supRenderIncidents(root, s) {
  const id = s.id;
  const list = grkList(root, "grc.fournisseurs.inc.linkedTitle");

  s.linkedIncidents.forEach((incId) => {
    const row = grkRow();
    const span = document.createElement("span");
    span.className = "grk-inv-grow grc-sup-linked-id";
    span.textContent = incId;
    row.appendChild(span);
    row.appendChild(grkDelBtn(() => { grcSupRemoveLinkedIncident(id, incId); grkRefresh(row); }));
    list.appendChild(row);
  });
  if (!s.linkedIncidents.length) list.appendChild(grkEmptyLine("grc.fournisseurs.inc.empty"));

  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "grk-inv-grow";
  inp.setAttribute("autocomplete", "off");
  const names = grkLinkNames({ incidents: true });
  if (typeof getGrcIncidents === "function") {
    try {
      const dl = document.createElement("datalist");
      dl.id = "grc-sup-inc-" + id;
      getGrcIncidents().forEach((i) => {
        if (!i || !i.id) return;
        const o = document.createElement("option");
        o.value = i.id;
        o.textContent = i.title || i.id;
        dl.appendChild(o);
      });
      root.appendChild(dl);
      inp.setAttribute("list", dl.id);
    } catch (e) { /* dégradé */ }
  }
  const addForm = grkAddForm([inp], (form) => {
    if (!inp.value.trim()) return;
    grcSupAddLinkedIncident(id, inp.value.trim());
    grkRefresh(form);
  });
  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "grc-registry-add-btn";
  addBtn.textContent = grcT("grc.fournisseurs.inc.addLinked");
  addForm.appendChild(addBtn);
  root.appendChild(addForm);

  const deps = _supDependentContinuityPlans(s);
  if (deps) {
    const sec = document.createElement("section");
    sec.className = "grk-sec";
    const h4 = document.createElement("h4");
    h4.textContent = grcT("grc.fournisseurs.inc.depPlans");
    sec.appendChild(h4);
    if (deps.length) {
      const ul = document.createElement("ul");
      ul.className = "grc-sup-dep-plans";
      deps.forEach((p) => {
        const liEl = document.createElement("li");
        liEl.textContent = p.service || p.id;
        ul.appendChild(liEl);
      });
      sec.appendChild(ul);
    } else {
      sec.appendChild(grkEmptyLine("grc.fournisseurs.inc.empty"));
    }
    root.appendChild(sec);
  }
  void names;
}

/* ---------- onglet Export ----------------------------------- */

function _supRenderExport(root, s) {
  grkExportButtons(root, "grc.fournisseurs.export.hint", [
    { i18n: "grc.fournisseurs.export.json", fn: () => exportSupplierAsJson(s) },
    { i18n: "grc.fournisseurs.export.word", fn: () => exportSupplierReportAsWord(s) },
    { i18n: "grc.fournisseurs.export.pdf", fn: () => exportSupplierReportAsPdf(s) },
    { i18n: "grc.fournisseurs.export.card", fn: () => exportSupplierCard(s) },
    { i18n: "grc.fournisseurs.export.csv", fn: () => exportSuppliersCsv(getGrcSuppliers()) },
  ]);
}

/* ---------- montage -------------------------------------------- */

const GRC_SUP_TABS = [
  { key: "fiche", i18n: "grc.fournisseurs.tab.fiche", render: _supRenderFiche },
  { key: "risque", i18n: "grc.fournisseurs.tab.risque", render: _supRenderRisque },
  { key: "contrat", i18n: "grc.fournisseurs.tab.contrat", render: _supRenderContrat },
  { key: "certifs", i18n: "grc.fournisseurs.tab.certifs", render: _supRenderCertifs },
  { key: "cycle", i18n: "grc.fournisseurs.tab.cycle", render: _supRenderCycle },
  { key: "incidents", i18n: "grc.fournisseurs.tab.incidents", render: _supRenderIncidents },
  { key: "export", i18n: "grc.fournisseurs.tab.export", render: _supRenderExport },
];

function renderSupplierPanel(container, supplier) {
  grkPanel(container, supplier, {
    idAttr: "data-supplier-id",
    tabs: GRC_SUP_TABS,
    ensure: grcSupplierEnsureShape,
    store: _grcSupStore,
  });
}
