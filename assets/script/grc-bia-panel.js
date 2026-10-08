/* Panneau d'un processus du registre BIA (spec/grc-bia-register/ BP3) --
   barre d'onglets rendue dans le corps de l'accordéon par grc-bia.js
   (renderBiaPanel). Calqué sur grc-continuity-panel.js.

   AUCUNE logique de store ici : lectures/écritures via les helpers grcBia*
   de grc-bia.js (héritent du coffre). Chargé APRÈS grc-continuity.js,
   grc-continuity-panel.js et grc-bia.js, AVANT initGrcBiaRegistry().

   Onglets : Synthèse (criticité, DMIA/MAO/RTO/RPO, MBCO, cohérence) ·
   Impacts dans le temps (horizons + DMIA suggérée + ressources) ·
   Dépendances (avec marquage SPOF). Réutilise les classes CSS du panneau
   de continuité (.grc-ir-panel .grc-cont-panel). */

const GRC_BIA_TABS = [
  { key: "synthese", i18n: "grc.bia.tab.synthese" },
  { key: "impacts", i18n: "grc.bia.tab.impacts" },
  { key: "dependances", i18n: "grc.continuite.pca.tab.dependances" },
];

const _biaActiveTab = Object.create(null); // biaId -> key (module, non persistant)

/* ---------- montage du panneau ------------------------------------- */

function renderBiaPanel(container, proc) {
  container.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "grc-ir-panel grc-cont-panel grc-bia-panel";
  panel.dataset.biaId = proc.id;

  const tabbar = document.createElement("div");
  tabbar.className = "grc-ir-tabbar";
  tabbar.setAttribute("role", "tablist");
  const select = (key) => {
    _biaActiveTab[proc.id] = key;
    _biaSyncTabs(panel, proc.id);
    const on = panel.querySelector('.grc-ir-tab[aria-selected="true"]');
    if (on) on.focus();
  };
  GRC_BIA_TABS.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grc-ir-tab";
    btn.dataset.tab = t.key;
    btn.textContent = grcT(t.i18n);
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.tabIndex = -1;
    btn.addEventListener("click", () => select(t.key));
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      select(GRC_BIA_TABS[(i + dir + GRC_BIA_TABS.length) % GRC_BIA_TABS.length].key);
    });
    tabbar.appendChild(btn);
  });
  panel.appendChild(tabbar);

  const content = document.createElement("div");
  content.className = "grc-ir-tabpanel";
  content.setAttribute("role", "tabpanel");
  panel.appendChild(content);

  container.appendChild(panel);
  _biaSyncTabs(panel, proc.id);
}

// Applique l'onglet actif ; re-lit le processus depuis le store à chaque appel.
function _biaSyncTabs(panel, biaId) {
  const active = _biaActiveTab[biaId] || "synthese";

  panel.querySelectorAll(".grc-ir-tab").forEach((b) => {
    const on = b.dataset.tab === active;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  });

  const content = panel.querySelector(".grc-ir-tabpanel");
  content.innerHTML = "";

  const raw = getGrcBia().find((p) => p.id === biaId);
  if (!raw) return;
  const proc = grcBiaEnsureShape(raw);
  proc.id = biaId;

  if (active === "synthese") _biaRenderSynthese(content, proc);
  else if (active === "impacts") _biaRenderImpacts(content, proc);
  else if (active === "dependances") _biaRenderDependencies(content, proc);
}

// Re-rend l'onglet courant + l'en-tête de l'accordéon (badges RTO/SPOF) et
// la synthèse du registre, qui dépendent des valeurs éditées ici.
function _biaRefresh(node) {
  if (typeof renderGrcBiaList === "function") { renderGrcBiaList(); return; }
  const panel = node.closest(".grc-bia-panel");
  if (panel) _biaSyncTabs(panel, panel.dataset.biaId);
}

function _biaChain(id) {
  if (typeof grcChainChanged !== "function") return;
  const saved = getGrcBia().find((p) => p.id === id);
  if (saved) grcChainChanged(GRC_BIA_KEY, saved);
}

function _biaSec(root, titleKey, extraCls) {
  const sec = document.createElement("section");
  sec.className = "grc-ir-sec" + (extraCls ? " " + extraCls : "");
  if (titleKey) {
    const h = document.createElement("h4");
    h.textContent = grcT(titleKey);
    sec.appendChild(h);
  }
  root.appendChild(sec);
  return sec;
}

function _biaHint(sec, text) {
  const p = document.createElement("p");
  p.className = "grc-ir-hint";
  p.textContent = text;
  sec.appendChild(p);
  return p;
}

/* ---------- onglet Synthèse ---------------------------------------- */

function _biaRenderSynthese(root, proc) {
  const id = proc.id;

  // 1. Identification : processus lié (Contexte), responsable, criticité.
  const idSec = _biaSec(root, null);
  const critSel = grkSelect(GRC_CONT_CRITICALITY, proc.criticality,
    (c) => grcT("grc.continuite.pca.crit." + c));
  critSel.addEventListener("change", () => {
    grcBiaSetCore(id, { criticality: critSel.value });
    _biaChain(id);
    _biaRefresh(critSel);
  });
  idSec.appendChild(grkField(grcT("grc.continuite.pca.form.criticality"), critSel));
  if (proc.processId && typeof grcLinksLabel === "function") {
    _biaHint(idSec, grcT("grc.links.f.continuity.processId") + " : " + grcLinksLabel("processus", proc.processId));
  }
  if (proc.owner) _biaHint(idSec, grcT("grc.continuite.pca.form.owner") + " : " + proc.owner);
  _biaHint(idSec, grcT("grc.bia.synthese.editHint"));

  // 2. Objectifs de reprise : DMIA / MAO / RTO / RPO + MBCO.
  const biaSec = _biaSec(root, "grc.bia.synthese.objectives");
  const grid = document.createElement("div");
  grid.className = "grc-ir-formgrid";
  const setBia = (patch) => { grcBiaSetBia(id, patch); _biaChain(id); _biaRefresh(root); };
  [
    ["mtdMin", "mtd"], ["maoMin", "mao"], ["rtoMin", "rto"], ["rpoMin", "rpo"],
  ].forEach(([k, label]) => {
    const f = grkDurField(grcT("grc.continuite.pca.form." + label), proc.bia[k], (m) => { const p = {}; p[k] = m; setBia(p); });
    f.title = grcT("grc.continuite.pca.form." + label + "Hint");
    f.dataset.field = k;
    if (k === "maoMin") f.classList.add("grc-cont-mao");
    grid.appendChild(f);
  });
  biaSec.appendChild(grid);

  const mbcoGrid = document.createElement("div");
  mbcoGrid.className = "grc-ir-formgrid";
  const mbco = document.createElement("input");
  mbco.type = "text";
  mbco.className = "grc-cont-mbco";
  mbco.value = proc.bia.mbco || "";
  mbco.addEventListener("change", () => grcBiaSetBia(id, { mbco: mbco.value.trim() }));
  mbcoGrid.appendChild(grkField(grcT("grc.continuite.pca.form.mbco"), mbco));
  const mbcoPct = document.createElement("input");
  mbcoPct.type = "text";
  mbcoPct.className = "grc-cont-mbco-pct";
  mbcoPct.value = proc.bia.mbcoPct == null ? "" : String(proc.bia.mbcoPct);
  mbcoPct.addEventListener("change", () => setBia({ mbcoPct: mbcoPct.value }));
  mbcoGrid.appendChild(grkField(grcT("grc.continuite.pca.form.mbcoPct"), mbcoPct));
  biaSec.appendChild(mbcoGrid);

  // Cohérence RTO ≤ MAO ≤ DMIA, RPO ≤ RTO (avertissement, jamais bloquant).
  grcContCoherence(proc).forEach((c) => {
    const warn = document.createElement("p");
    warn.className = "grc-cont-warn grc-cont-coherence";
    warn.dataset.rule = c;
    warn.textContent = grcT(grcContCoherenceKey(c));
    biaSec.appendChild(warn);
  });

  // 3. Impacts qualitatifs + périodes critiques.
  const qSec = _biaSec(root, null);
  const impacts = document.createElement("textarea");
  impacts.rows = 2;
  impacts.value = proc.bia.impacts || "";
  impacts.addEventListener("change", () => grcBiaSetBia(id, { impacts: impacts.value.trim() }));
  qSec.appendChild(grkField(grcT("grc.continuite.pca.bia.impacts"), impacts));
  const peak = document.createElement("input");
  peak.type = "text";
  peak.value = proc.bia.peakPeriods || "";
  peak.addEventListener("change", () => grcBiaSetBia(id, { peakPeriods: peak.value.trim() }));
  qSec.appendChild(grkField(grcT("grc.continuite.pca.bia.peakPeriods"), peak));
  // Justification des chiffres : d'où viennent DMIA / RTO / RPO / MBCO
  // (entretien, contrat, SLA, contrainte métier) -- trace pour l'audit.
  const why = document.createElement("textarea");
  why.rows = 3;
  why.className = "grc-bia-rationale";
  why.placeholder = grcT("grc.bia.rationale.hint");
  why.value = proc.bia.rationale || "";
  why.addEventListener("change", () => grcBiaSetBia(id, { rationale: why.value.trim() }));
  qSec.appendChild(grkField(grcT("grc.bia.rationale"), why));

  // 4. Compteurs.
  const cSec = _biaSec(root, "grc.continuite.pca.counters.title");
  const chips = document.createElement("div");
  chips.className = "grc-ir-chips";
  const rated = proc.bia.timeline.filter((t) => t.level > 0).length;
  [
    grcT("grc.bia.counters.horizons").replace("{n}", rated),
    grcT("grc.bia.counters.resources").replace("{n}", proc.bia.resources.length),
    grcT("grc.continuite.pca.counters.deps").replace("{n}", proc.dependencies.length),
    grcT("grc.continuite.pca.summary.spof").replace("{n}", grcBiaSpofCount(proc)),
  ].forEach((t) => {
    const c = document.createElement("span");
    c.className = "grc-ir-chip";
    c.textContent = t;
    chips.appendChild(c);
  });
  cSec.appendChild(chips);
}

/* ---------- onglet Impacts dans le temps --------------------------
   Impacts par horizon (1 à 5 par nature) ; DMIA suggérée = premier
   horizon où un impact atteint GRC_CONT_UNACCEPTABLE (jamais appliquée
   sans clic) ; ressources nécessaires dans le temps. */

function _biaRenderImpacts(root, proc) {
  const id = proc.id;
  const sec = _biaSec(root, "grc.continuite.pca.biat.title", "grc-cont-bia-time");
  _biaHint(sec, grcT("grc.continuite.pca.biat.hint"));

  const rows = proc.bia.timeline.length ? proc.bia.timeline
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
      const s = grkSelect(levels, r[k] || 0, (n) => (n ? String(n) + " — " + grcT("grc.continuite.pca.biat.l" + n) : "—"));
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
      v.level = Math.max.apply(null, GRC_CONT_IMPACT_KINDS.map((k) => v[k]));
      return v;
    });
    grcBiaSetTimeline(id, out);
    _biaRefresh(save);
  });
  sec.appendChild(save);

  // DMIA suggérée
  const sug = grcBiaSuggestedMtd(proc);
  const sp = document.createElement("p");
  sp.className = "grc-cont-bia-suggest";
  if (sug != null) {
    sp.textContent = grcT("grc.continuite.pca.biat.suggest").replace("{d}", contFmtDuration(sug)) +
      (proc.bia.mtdMin != null ? " " + grcT("grc.continuite.pca.biat.current").replace("{d}", contFmtDuration(proc.bia.mtdMin)) : "");
    if (proc.bia.mtdMin !== sug) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "grc-registry-io-btn grc-cont-bia-apply";
      b.textContent = grcT("grc.continuite.pca.biat.apply");
      b.addEventListener("click", () => { grcBiaSetBia(id, { mtdMin: sug }); _biaChain(id); _biaRefresh(b); });
      sp.appendChild(document.createTextNode(" "));
      sp.appendChild(b);
    }
  } else {
    sp.textContent = grcT("grc.continuite.pca.biat.noSuggest");
  }
  sec.appendChild(sp);

  _biaRenderResources(root, proc);
}

function _biaRenderResources(root, proc) {
  const id = proc.id;
  const rs = _biaSec(root, "grc.continuite.pca.biat.resTitle", "grc-cont-bia-res");
  const list = document.createElement("div");
  rs.appendChild(list);
  const resRows = proc.bia.resources;
  const linkType = (kind) => (kind === "role" || kind === "asset" || kind === "supplier" ? kind : null);
  const labelOf = (r) => {
    const type = linkType(r.kind);
    const rid = r.roleId || r.assetId || r.supplierId;
    if (type && rid && typeof grcLinksLabel === "function") return grcLinksLabel(type, rid) + (r.label ? " — " + r.label : "");
    return r.label || "";
  };
  resRows.forEach((r) => {
    const row = document.createElement("div");
    row.className = "grc-ir-inv-row";
    row.appendChild(document.createTextNode(grcT("grc.continuite.pca.biat.kind." + r.kind) + " — " + labelOf(r) +
      (r.quantity ? " × " + r.quantity : "") + (r.horizonMin != null ? " (" + contFmtDuration(r.horizonMin) + ")" : "")));
    row.appendChild(grkDelBtn(() => { grcBiaSetResources(id, resRows.filter((x) => x.id !== r.id)); _biaRefresh(row); }));
    list.appendChild(row);
  });
  if (!resRows.length) list.appendChild(grkEmptyLine("grc.continuite.pca.inv.empty"));

  const kind = grkSelect(GRC_CONT_RES_KINDS, "role", (k) => grcT("grc.continuite.pca.biat.kind." + k));
  const tgt = document.createElement("select");
  const fillTgt = () => {
    tgt.innerHTML = "";
    const type = linkType(kind.value);
    tgt.hidden = !type;
    (type && typeof grcLinksKitOptions === "function" ? grcLinksKitOptions(type, true) : []).forEach((o) => {
      const op = document.createElement("option");
      op.value = o.value;
      op.textContent = o.label;
      tgt.appendChild(op);
    });
  };
  kind.addEventListener("change", fillTgt);
  fillTgt();
  // « + Ajouter » : crée le rôle / l'actif / le fournisseur choisi dans un
  // nouvel onglet ; la liste est rechargée au retour (grcLinksAddButton).
  const tgtType = () => linkType(kind.value);
  const tgtAdd = typeof grcLinksAddButton === "function"
    ? grcLinksAddButton(tgtType, tgt, (v) => { fillTgt(); tgt.value = v; }) : null;
  if (tgtAdd) {
    const syncAdd = () => { tgtAdd.hidden = !tgtType(); };
    kind.addEventListener("change", syncAdd);
    syncAdd();
  }
  const lbl = document.createElement("input");
  lbl.type = "text";
  lbl.placeholder = grcT("grc.continuite.pca.biat.label");
  const qty = document.createElement("input");
  qty.type = "text";
  qty.placeholder = grcT("grc.continuite.pca.biat.qty");
  const hz = grkSelect([""].concat(GRC_CONT_BIA_HORIZONS.map(String)), "",
    (m) => (m ? contFmtDuration(Number(m)) : grcT("grc.continuite.pca.biat.horizon")));
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.continuite.pca.inv.add");
  const form = grkAddForm([kind, tgt].concat(tgtAdd ? [tgtAdd] : []).concat([lbl, qty, hz, btn]), () => {
    const r = { kind: kind.value, label: lbl.value.trim(), quantity: qty.value.trim(), horizonMin: hz.value ? Number(hz.value) : null };
    if (kind.value === "role") r.roleId = tgt.value;
    if (kind.value === "asset") r.assetId = tgt.value;
    if (kind.value === "supplier") r.supplierId = tgt.value;
    if (!r.label && !(linkType(kind.value) && tgt.value)) return;
    grcBiaSetResources(id, resRows.concat([r]));
    _biaRefresh(form);
  });
  rs.appendChild(form);
}

/* ---------- onglet Dépendances (+ SPOF) ---------------------------- */

function _biaRenderDependencies(root, proc) {
  const id = proc.id;
  const sec = _biaSec(root, "grc.continuite.pca.tab.dependances", "grc-bia-deps");
  _biaHint(sec, grcT("grc.continuite.pca.spofHint"));

  let listId = null;
  const names = typeof _contAssetNames === "function" ? _contAssetNames() : [];
  if (names.length) {
    listId = "grc-bia-assets-" + id;
    const dl = document.createElement("datalist");
    dl.id = listId;
    names.forEach((n) => { const o = document.createElement("option"); o.value = n; dl.appendChild(o); });
    sec.appendChild(dl);
  }

  const list = document.createElement("div");
  list.className = "grc-ir-inv-list";
  sec.appendChild(list);
  const spofBox = (checked, onChange) => {
    const lbl = document.createElement("label");
    lbl.className = "grc-sup-check grc-cont-spof";
    lbl.title = grcT("grc.continuite.pca.spofHint");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!checked;
    if (onChange) cb.addEventListener("change", () => onChange(cb.checked));
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(" SPOF"));
    return { lbl, cb };
  };

  proc.dependencies.forEach((d) => {
    const row = document.createElement("div");
    row.className = "grc-ir-inv-row" + (d.spof ? " grc-bia-dep-spof" : "");
    row.dataset.depId = d.id;

    const type = grkSelect(GRC_CONT_DEP_TYPES, d.type, (t) => grcT("grc.continuite.pca.depType." + t));
    type.addEventListener("change", () => { grcBiaUpdateDependency(id, d.id, { type: type.value }); _biaRefresh(row); });
    row.appendChild(type);

    const ref = document.createElement("input");
    ref.type = "text";
    ref.className = "grc-ir-inv-grow";
    ref.value = d.ref || "";
    if (listId) ref.setAttribute("list", listId);
    ref.addEventListener("change", () => grcBiaUpdateDependency(id, d.id, { ref: ref.value.trim() }));
    row.appendChild(ref);
    // Lien réel vers un actif / fournisseur (chaîne GRC).
    if ((d.type === "asset" || d.type === "supplier") && typeof _contTargetSelect === "function") {
      const tgt = _contTargetSelect(d.type, d.targetId);
      tgt.addEventListener("change", () => {
        const o = tgt.selectedOptions[0];
        const patch = { targetId: tgt.value };
        if (tgt.value && o) patch.ref = o.textContent;
        grcBiaUpdateDependency(id, d.id, patch);
        _biaChain(id);
        _biaRefresh(row);
      });
      row.appendChild(tgt);
    }

    const note = document.createElement("input");
    note.type = "text";
    note.placeholder = grcT("grc.continuite.pca.inv.reason");
    note.title = grcT("grc.continuite.pca.inv.reason");
    note.value = d.note || "";
    note.addEventListener("change", () => grcBiaUpdateDependency(id, d.id, { note: note.value.trim() }));
    row.appendChild(note);

    row.appendChild(spofBox(d.spof, (v) => { grcBiaUpdateDependency(id, d.id, { spof: v }); _biaRefresh(row); }).lbl);
    row.appendChild(grkDelBtn(() => { grcBiaRemoveDependency(id, d.id); _biaRefresh(row); }));
    list.appendChild(row);
  });
  if (!proc.dependencies.length) list.appendChild(grkEmptyLine("grc.continuite.pca.inv.empty"));

  const type = grkSelect(GRC_CONT_DEP_TYPES, "asset", (t) => grcT("grc.continuite.pca.depType." + t));
  const ref = document.createElement("input");
  ref.type = "text";
  ref.className = "grc-ir-inv-grow";
  ref.placeholder = grcT("grc.continuite.pca.inv.depRef");
  ref.required = true;
  if (listId) ref.setAttribute("list", listId);
  const note = document.createElement("input");
  note.type = "text";
  note.placeholder = grcT("grc.continuite.pca.inv.reason");
  const spof = spofBox(false);
  spof.lbl.classList.remove("grc-cont-spof");
  spof.cb.className = "grc-cont-spof-new";
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.continuite.pca.inv.add");
  const form = grkAddForm([type, ref, note, spof.lbl, btn], () => {
    const v = ref.value.trim();
    if (!v) return;
    grcBiaAddDependency(id, { type: type.value, ref: v, note: note.value.trim(), spof: spof.cb.checked });
    _biaRefresh(form);
  });
  sec.appendChild(form);
}

/* ---------- rapport Word / PDF (spec/grc-bia-register/ BP4) -----------
   Rapport HTML autonome (tout échappé) : synthèse + couverture, puis par
   processus objectifs, cohérence, impacts dans le temps, ressources,
   dépendances (SPOF) et plans liés. Aucune requête réseau. */

function grcBiaReportBody(scope) {
  const procs = (Array.isArray(scope) ? scope : [scope]).map((p) => {
    const e = grcBiaEnsureShape(p);
    e.id = p && p.id;
    return e;
  });
  const esc = grkEscapeHtml;
  const L = (k) => grcT(k);
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = (typeof grcAuthorName === "function" ? grcAuthorName() : "") || "";
  const none = "<p><em>" + L("grc.continuite.pca.report.none") + "</em></p>";
  const tbl = "<table border='1' cellspacing='0' cellpadding='4'>";

  let h = "<h1>" + L("grc.bia.report.title") + "</h1>";
  h += "<p><strong>" + L("grc.continuite.pca.report.generatedOn") + " :</strong> " + esc(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.continuite.pca.report.by") + " :</strong> " + esc(author);
  h += "</p>";
  const s = grcBiaSummary(procs);
  const cov = grcBiaCoverage(procs);
  h += "<p>" + esc([
    L("grc.bia.summary.count").replace("{n}", s.count),
    L("grc.bia.summary.spof").replace("{n}", s.spof),
    L("grc.bia.summary.incoherent").replace("{n}", s.incoherent),
  ].join(" · ")) + "</p>";
  if (cov.total) {
    h += "<p>" + esc(L("grc.bia.summary.coverage").replace("{c}", cov.covered).replace("{t}", cov.total) +
      (cov.missing.length ? " " + L("grc.bia.summary.missing") + " " + cov.missing.join(", ") : "")) + "</p>";
  }
  if (!procs.length) return h + none;

  procs.forEach((p) => {
    h += "<h2>" + esc(p.label || "") + " — " + esc(L("grc.continuite.pca.crit." + p.criticality)) + "</h2>";
    if (p.processId && typeof grcLinksLabel === "function") {
      h += "<p><strong>" + esc(L("grc.links.f.bia.processId")) + " :</strong> " + esc(grcLinksLabel("processus", p.processId)) + "</p>";
    }
    if (p.owner) h += "<p><strong>" + esc(L("grc.continuite.pca.form.owner")) + " :</strong> " + esc(p.owner) + "</p>";

    h += "<h3>" + esc(L("grc.bia.synthese.objectives")) + "</h3>" + tbl + "<tbody>";
    [["mtdMin", "mtd"], ["maoMin", "mao"], ["rtoMin", "rto"], ["rpoMin", "rpo"]].forEach(([k, l]) => {
      h += "<tr><th>" + esc(L("grc.continuite.pca.form." + l)) + "</th><td>" + esc(contFmtDuration(p.bia[k])) + "</td></tr>";
    });
    h += "<tr><th>" + esc(L("grc.continuite.pca.form.mbco")) + "</th><td>" + esc(p.bia.mbco || "") +
      (p.bia.mbcoPct != null ? " (" + esc(p.bia.mbcoPct) + " %)" : "") + "</td></tr>";
    h += "</tbody></table>";
    grcContCoherence(p).forEach((c) => { h += "<p><em>" + esc(L(grcContCoherenceKey(c))) + "</em></p>"; });
    if (p.bia.impacts) h += "<p><strong>" + esc(L("grc.continuite.pca.bia.impacts")) + " :</strong> " + esc(p.bia.impacts) + "</p>";
    if (p.bia.peakPeriods) h += "<p><strong>" + esc(L("grc.continuite.pca.bia.peakPeriods")) + " :</strong> " + esc(p.bia.peakPeriods) + "</p>";
    if (p.bia.rationale) h += "<p><strong>" + esc(L("grc.bia.rationale")) + " :</strong> " + esc(p.bia.rationale) + "</p>";

    h += "<h3>" + esc(L("grc.continuite.pca.biat.title")) + "</h3>";
    const rated = p.bia.timeline.filter((t) => t.level > 0);
    if (rated.length) {
      h += tbl + "<thead><tr><th>" + esc(L("grc.continuite.pca.biat.horizon")) + "</th>" +
        GRC_CONT_IMPACT_KINDS.map((k) => "<th>" + esc(L("grc.continuite.pca.biat." + k)) + "</th>").join("") +
        "<th>" + esc(L("grc.continuite.pca.biat.note")) + "</th></tr></thead><tbody>";
      rated.forEach((t) => {
        h += "<tr><td>" + esc(contFmtDuration(t.horizonMin)) + "</td>" +
          GRC_CONT_IMPACT_KINDS.map((k) => "<td>" + (t[k] ? esc(t[k] + " — " + L("grc.continuite.pca.biat.l" + t[k])) : "—") + "</td>").join("") +
          "<td>" + esc(t.note || "") + "</td></tr>";
      });
      h += "</tbody></table>";
      const sug = grcBiaSuggestedMtd(p);
      if (sug != null) h += "<p>" + esc(L("grc.continuite.pca.biat.suggest").replace("{d}", contFmtDuration(sug))) + "</p>";
    } else {
      h += none;
    }

    h += "<h3>" + esc(L("grc.continuite.pca.biat.resTitle")) + "</h3>";
    if (p.bia.resources.length) {
      h += "<ul>" + p.bia.resources.map((r) => {
        const rid = r.roleId || r.assetId || r.supplierId;
        const lbl = (rid && typeof grcLinksLabel === "function" && r.kind !== "other" ? grcLinksLabel(r.kind, rid) + (r.label ? " — " + r.label : "") : r.label) || "";
        return "<li>" + esc(L("grc.continuite.pca.biat.kind." + r.kind) + " — " + lbl +
          (r.quantity ? " × " + r.quantity : "") + (r.horizonMin != null ? " (" + contFmtDuration(r.horizonMin) + ")" : "")) + "</li>";
      }).join("") + "</ul>";
    } else {
      h += none;
    }

    h += "<h3>" + esc(L("grc.continuite.pca.tab.dependances")) + "</h3>";
    if (p.dependencies.length) {
      h += tbl + "<tbody>" + p.dependencies.map((d) => "<tr><td>" + esc(L("grc.continuite.pca.depType." + d.type)) + "</td><td>" +
        esc(d.ref || "") + "</td><td>" + esc(d.note || "") + "</td><td>" + (d.spof ? "<strong>SPOF</strong>" : "") + "</td></tr>").join("") + "</tbody></table>";
    } else {
      h += none;
    }

    const plans = grcBiaLinkedPlans(p.id);
    h += "<h3>" + esc(L("grc.bia.report.linkedPlans")) + "</h3>";
    h += plans.length ? "<ul>" + plans.map((x) => "<li>" + esc((x.type ? x.type + " — " : "") + (x.service || "")) + "</li>").join("") + "</ul>" : none;
  });
  return h;
}

function exportGrcBiaReportAsWord(scope) {
  grkExportWord(grcBiaReportBody(scope), "bia-processus-" + grkDateStamp() + ".doc", grcT("grc.bia.report.title"));
}

function exportGrcBiaReportAsPdf(scope) {
  grkPrintWindow(grcBiaReportBody(scope), grcT("grc.bia.report.title"));
}
