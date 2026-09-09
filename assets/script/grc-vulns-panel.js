/* Panneau d'une vulnérabilité -- barre d'onglets (grkPanel du kit)
   rendue dans le corps de l'accordéon du registre (grc/vulnerabilites.html)
   par grc-vulns.js. Voir spec/grc-registry-upgrades/20-vulnerabilites.md.

   AUCUNE logique de store ici : lectures/écritures via les helpers
   grcVuln* de grc-vulns.js. Chargé APRÈS grc-vulns.js et AVANT
   initGrcVulnsRegistry().

   État (20-vulnerabilites.md §6) :
   - T3 : Fiche + Traitement (status -> timeline, alerte SLA).   <-- ICI
   - T4 : Actifs touchés + Timeline.
   - T5 : Liens & acceptation.  T6 : Export. */

/* ---------- utilitaires d'affichage ---------------------------- */

function _vulnField(labelKey, control) {
  return grkField(grcT(labelKey), control);
}

function _vulnInput(value, onCommit, type) {
  const inp = document.createElement("input");
  inp.type = type || "text";
  inp.value = value == null ? "" : value;
  inp.addEventListener("change", () => onCommit(inp.value));
  return inp;
}

function _vulnTextArea(labelKey, value, onCommit) {
  const ta = document.createElement("textarea");
  ta.rows = 2;
  ta.value = value || "";
  ta.addEventListener("change", () => onCommit(ta.value));
  return grkField(grcT(labelKey), ta);
}

function _vulnDate(value, onCommit) {
  const inp = document.createElement("input");
  inp.type = "date";
  inp.value = value ? String(value).slice(0, 10) : "";
  inp.addEventListener("change", () => onCommit(inp.value || null));
  return inp;
}

/* ---------- onglet Fiche -------------------------------------- */

function _vulnRenderFiche(root, v) {
  const id = v.id;

  const hint = document.createElement("p");
  hint.className = "grk-hint";
  hint.textContent = grcT("grc.vulnerabilites.fiche.editHint");
  root.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const src = grkSelect(GRC_VULN_SOURCES, v.source, (s) => grcT("grc.vulnerabilites.src." + s));
  src.addEventListener("change", () => grcVulnSetCore(id, { source: src.value }));
  grid.appendChild(_vulnField("grc.vulnerabilites.form.source", src));

  grid.appendChild(_vulnField("grc.vulnerabilites.form.cvssScore",
    _vulnInput(v.cvssScore, (val) => { grcVulnSetCore(id, { cvssScore: val }); grkRefresh(grid); }, "number")));

  grid.appendChild(_vulnField("grc.vulnerabilites.fiche.cvssVector",
    _vulnInput(v.cvssVector, (val) => grcVulnSetCore(id, { cvssVector: val }))));

  const sevSel = grkSelect(GRC_VULN_SEVERITIES, v.severity, (s) => grcT("grc.vulnerabilites.sev." + s));
  sevSel.addEventListener("change", () => { grcVulnSetCore(id, { severity: sevSel.value }); grkRefresh(grid); });
  grid.appendChild(_vulnField("grc.vulnerabilites.fiche.severity", sevSel));

  root.appendChild(grid);

  const sevLine = document.createElement("p");
  sevLine.className = "grc-sup-score-line";
  const b = grcVulnSeverityBadge(v.severity);
  const badge = document.createElement("span");
  badge.className = "grc-crit-badge " + b.cls;
  badge.textContent = b.text;
  sevLine.appendChild(badge);
  if (!v.severityOverridden) {
    const auto = document.createElement("span");
    auto.className = "grk-hint";
    auto.textContent = grcT("grc.vulnerabilites.fiche.severityAuto");
    sevLine.appendChild(auto);
  } else {
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "grc-registry-io-btn";
    reset.textContent = grcT("grc.vulnerabilites.fiche.severityAuto");
    reset.addEventListener("click", () => { grcVulnSetCore(id, { severityOverridden: false }); grkRefresh(reset); });
    sevLine.appendChild(reset);
  }
  root.appendChild(sevLine);
}

/* ---------- onglet Traitement -------------------------------- */

function _vulnRenderTraitement(root, v) {
  const id = v.id;

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const st = grkSelect(GRC_VULN_STATUSES, v.status, (s) => grcT("grc.vulnerabilites.st." + s));
  st.addEventListener("change", () => { grcVulnSetStatus(id, st.value); grkRefresh(grid); });
  grid.appendChild(_vulnField("grc.vulnerabilites.tr.status", st));

  grid.appendChild(_vulnField("grc.vulnerabilites.tr.discoveredAt",
    _vulnDate(v.discoveredAt, (val) => { grcVulnSetCore(id, { discoveredAt: val }); grkRefresh(grid); })));

  grid.appendChild(_vulnField("grc.vulnerabilites.tr.dueAt",
    _vulnDate(v.dueAt, (val) => { grcVulnSetTreatment(id, { dueAt: val }); grkRefresh(grid); })));

  root.appendChild(grid);

  if (grcVulnSlaBreached(v)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.vulnerabilites.tr.slaAlert");
    root.appendChild(warn);
  }

  root.appendChild(_vulnTextArea("grc.vulnerabilites.tr.remediation", v.remediation,
    (val) => grcVulnSetTreatment(id, { remediation: val })));
  root.appendChild(_vulnTextArea("grc.vulnerabilites.tr.workaround", v.workaround,
    (val) => grcVulnSetTreatment(id, { workaround: val })));
}

/* ---------- onglet Actifs touchés --------------------------- */

function _vulnAssetNames() {
  return grkLinkNames({ assets: true });
}

function _vulnRenderActifs(root, v) {
  const id = v.id;
  const list = grkList(root, "grc.vulnerabilites.tab.actifs");
  const names = _vulnAssetNames();

  let dlId = null;
  if (names.length) {
    const dl = document.createElement("datalist");
    dlId = "grc-vuln-assets-" + id;
    dl.id = dlId;
    names.forEach((nm) => {
      const o = document.createElement("option");
      o.value = nm;
      dl.appendChild(o);
    });
    root.appendChild(dl);
  }

  v.affectedAssets.forEach((a) => {
    const row = grkRow();
    const ref = document.createElement("input");
    ref.type = "text";
    ref.className = "grk-inv-grow";
    ref.placeholder = grcT("grc.vulnerabilites.assets.ref");
    ref.value = a.ref || "";
    if (dlId) ref.setAttribute("list", dlId);
    ref.addEventListener("change", () => grcVulnUpdateAsset(id, a.id, { ref: ref.value }));
    row.appendChild(ref);
    const note = document.createElement("input");
    note.type = "text";
    note.className = "grk-inv-grow";
    note.placeholder = grcT("grc.vulnerabilites.assets.note");
    note.value = a.note || "";
    note.addEventListener("change", () => grcVulnUpdateAsset(id, a.id, { note: note.value }));
    row.appendChild(note);
    row.appendChild(grkDelBtn(() => { grcVulnRemoveAsset(id, a.id); grkRefresh(row); }));
    list.appendChild(row);
  });
  if (!v.affectedAssets.length) list.appendChild(grkEmptyLine("grc.vulnerabilites.empty"));

  const nRef = document.createElement("input");
  nRef.type = "text";
  nRef.className = "grk-inv-grow";
  nRef.placeholder = grcT("grc.vulnerabilites.assets.ref");
  if (dlId) nRef.setAttribute("list", dlId);
  const addForm = grkAddForm([nRef], (form) => {
    if (!nRef.value.trim()) return;
    grcVulnAddAsset(id, { ref: nRef.value.trim() });
    grkRefresh(form);
  });
  _vulnAppendAddBtn(addForm, "grc.vulnerabilites.assets.add");
  root.appendChild(addForm);
}

/* ---------- onglet Timeline (liste chronologique) ----------- */
/* Repli assumé vs spec §3 : liste chronologique (kind + date + détail +
   acteur) plutôt qu'un SVG horizontal -- le composant SVG du Mode IR
   n'a pas été extrait dans le kit (cf. spec/grc-registry-upgrades/
   00-shared-kit.md, migration IR partielle). La liste couvre le besoin
   (journal des changements d'état) et se lit dans les 4 thèmes + < 640 px. */

function _vulnRenderTimeline(root, v) {
  const id = v.id;
  const list = grkList(root, "grc.vulnerabilites.tab.timeline");

  v.timeline.forEach((e) => {
    const row = grkRow();
    const kind = grkSelect(GRC_VULN_EVENT_KINDS, e.kind, (k) => grcT("grc.vulnerabilites.evk." + k));
    kind.disabled = e.kind === "created";
    kind.addEventListener("change", () => grcVulnUpdateEvent(id, e.id, { kind: kind.value }));
    row.appendChild(kind);

    const ts = document.createElement("input");
    ts.type = "date";
    ts.value = e.ts ? e.ts.slice(0, 10) : "";
    ts.addEventListener("change", () => { grcVulnUpdateEvent(id, e.id, { ts: ts.value }); grkRefresh(row); });
    row.appendChild(ts);

    const txt = document.createElement("input");
    txt.type = "text";
    txt.className = "grk-inv-grow";
    txt.placeholder = grcT("grc.vulnerabilites.tl.text");
    if (e.kind === "status" && e.from && e.to) {
      txt.value = e.text || grcT("grc.vulnerabilites.tl.transition")
        .replace("{from}", grcT("grc.vulnerabilites.st." + e.from))
        .replace("{to}", grcT("grc.vulnerabilites.st." + e.to));
    } else {
      txt.value = e.text || "";
    }
    txt.addEventListener("change", () => grcVulnUpdateEvent(id, e.id, { text: txt.value }));
    row.appendChild(txt);

    const actor = document.createElement("input");
    actor.type = "text";
    actor.placeholder = grcT("grc.vulnerabilites.tl.actor");
    actor.value = e.actor || "";
    actor.addEventListener("change", () => grcVulnUpdateEvent(id, e.id, { actor: actor.value }));
    row.appendChild(actor);

    if (e.kind !== "created") {
      row.appendChild(grkDelBtn(() => { grcVulnRemoveEvent(id, e.id); grkRefresh(row); }));
    }
    list.appendChild(row);
  });
  if (!v.timeline.length) list.appendChild(grkEmptyLine("grc.vulnerabilites.empty"));

  const nKind = grkSelect(["note", "evidence", "retest"], "note", (k) => grcT("grc.vulnerabilites.evk." + k));
  const nTxt = document.createElement("input");
  nTxt.type = "text";
  nTxt.className = "grk-inv-grow";
  nTxt.placeholder = grcT("grc.vulnerabilites.tl.text");
  const addForm = grkAddForm([nKind, nTxt], (form) => {
    grcVulnAddEvent(id, { kind: nKind.value, text: nTxt.value.trim() });
    grkRefresh(form);
  });
  _vulnAppendAddBtn(addForm, "grc.vulnerabilites.tl.add");
  root.appendChild(addForm);
}

/* ---------- onglet Liens & acceptation ---------------------- */

function _vulnDatalistInput(id, value, onCommit, which) {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.setAttribute("autocomplete", "off");
  inp.value = value || "";
  const names = grkLinkNames(which);
  if (names.length) {
    const dl = document.createElement("datalist");
    dl.id = "grc-vuln-dl-" + id + "-" + Object.keys(which).join("");
    names.forEach((nm) => {
      const o = document.createElement("option");
      o.value = nm;
      dl.appendChild(o);
    });
    inp._datalist = dl;
    inp.setAttribute("list", dl.id);
  }
  inp.addEventListener("change", () => onCommit(inp.value));
  return inp;
}

function _vulnRenderLiens(root, v) {
  const id = v.id;

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const inc = _vulnDatalistInput(id, v.linkedIncident,
    (val) => grcVulnSetLinks(id, { linkedIncident: val }), { incidents: true });
  if (inc._datalist) root.appendChild(inc._datalist);
  grid.appendChild(grkField(grcT("grc.vulnerabilites.links.linkedIncident"), inc));

  const risk = _vulnDatalistInput(id, v.linkedRisk,
    (val) => grcVulnSetLinks(id, { linkedRisk: val }), { risks: true });
  if (risk._datalist) root.appendChild(risk._datalist);
  grid.appendChild(grkField(grcT("grc.vulnerabilites.links.linkedRisk"), risk));

  root.appendChild(grid);

  const acc = document.createElement("section");
  acc.className = "grk-sec";
  const h4 = document.createElement("h4");
  h4.textContent = grcT("grc.vulnerabilites.acc.title");
  acc.appendChild(h4);

  if (v.status !== "accepted") {
    const hint = document.createElement("p");
    hint.className = "grk-hint";
    hint.textContent = grcT("grc.vulnerabilites.acc.hint");
    acc.appendChild(hint);
  } else {
    if (grcVulnAcceptanceExpired(v)) {
      const warn = document.createElement("p");
      warn.className = "grc-sup-warn";
      warn.textContent = grcT("grc.vulnerabilites.acc.expiredAlert");
      acc.appendChild(warn);
    }
    const aGrid = document.createElement("div");
    aGrid.className = "grk-formgrid";
    aGrid.appendChild(grkField(grcT("grc.vulnerabilites.acc.by"),
      _vulnInput(v.acceptance.by, (val) => grcVulnSetAcceptance(id, { by: val }))));
    aGrid.appendChild(grkField(grcT("grc.vulnerabilites.acc.at"),
      _vulnDate(v.acceptance.at, (val) => grcVulnSetAcceptance(id, { at: val }))));
    aGrid.appendChild(grkField(grcT("grc.vulnerabilites.acc.expiresAt"),
      _vulnDate(v.acceptance.expiresAt, (val) => { grcVulnSetAcceptance(id, { expiresAt: val }); grkRefresh(aGrid); })));
    acc.appendChild(aGrid);
    acc.appendChild(_vulnTextArea("grc.vulnerabilites.acc.reason", v.acceptance.reason,
      (val) => grcVulnSetAcceptance(id, { reason: val })));
  }
  root.appendChild(acc);
}

/* ---------- stub (onglet Export -- T6) ---------------------- */

function _vulnAppendAddBtn(form, i18nKey) {
  const b = document.createElement("button");
  b.type = "submit";
  b.className = "grc-registry-add-btn";
  b.textContent = grcT(i18nKey);
  form.appendChild(b);
}

/* ---------- onglet Export --------------------------------- */

function _vulnRenderExport(root, v) {
  grkExportButtons(root, "grc.vulnerabilites.export.hint", [
    { i18n: "grc.vulnerabilites.export.json", fn: () => exportVulnAsJson(v) },
    { i18n: "grc.vulnerabilites.export.word", fn: () => exportVulnReportAsWord(v) },
    { i18n: "grc.vulnerabilites.export.pdf", fn: () => exportVulnReportAsPdf(v) },
    { i18n: "grc.vulnerabilites.export.csv", fn: () => exportVulnsCsv(getGrcVulns()) },
  ]);
}

/* ---------- montage ---------------------------------------- */

const GRC_VULN_TABS = [
  { key: "fiche", i18n: "grc.vulnerabilites.tab.fiche", render: _vulnRenderFiche },
  { key: "traitement", i18n: "grc.vulnerabilites.tab.traitement", render: _vulnRenderTraitement },
  { key: "actifs", i18n: "grc.vulnerabilites.tab.actifs", render: _vulnRenderActifs },
  { key: "timeline", i18n: "grc.vulnerabilites.tab.timeline", render: _vulnRenderTimeline },
  { key: "liens", i18n: "grc.vulnerabilites.tab.liens", render: _vulnRenderLiens },
  { key: "export", i18n: "grc.vulnerabilites.tab.export", render: _vulnRenderExport },
];

function renderVulnPanel(container, vuln) {
  grkPanel(container, vuln, {
    idAttr: "data-vuln-id",
    tabs: GRC_VULN_TABS,
    ensure: grcVulnEnsureShape,
    store: _grcVulnStore,
  });
}
