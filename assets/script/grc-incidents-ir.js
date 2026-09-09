/* Mode « Incident Response » -- panneau à onglets monté dans le corps de
   l'accordéon du journal d'incidents (grc/incidents.html) quand
   incident.ir.mode === "active". Voir spec/incident-response-mode/.

   AUCUNE logique de store ici : toutes les lectures/écritures passent par
   les helpers grcIr* de assets/script/grc-incidents.js, qui héritent du
   coffre. Chargé APRÈS grc-incidents.js et AVANT initGrcIncidentRegistry()
   (grc-incidents.js teste `typeof renderIrPanel === "function"`).

   Tout le texte affiché passe par grcT() ; les données incident sont
   posées via textContent / value / createElement, jamais par innerHTML.

   État d'avancement (spec/incident-response-mode/tasks.md) :
   - T2  : squelette.                                          [fait]
   - T3  : barre d'onglets + onglet Synthèse.                  <-- ICI
   - T4  : timeline interactive.
   - T5  : mode investigation.
   - T6  : onglet Tâches (kanban).
   - T7  : onglet Export (JSON / Word / PDF / IOC). */

const GRC_IR_TABS = [
  { key: "synthese", i18n: "grc.incidents.ir.tab.synthese" },
  { key: "timeline", i18n: "grc.incidents.ir.tab.timeline" },
  { key: "investigation", i18n: "grc.incidents.ir.tab.investigation" },
  { key: "taches", i18n: "grc.incidents.ir.tab.taches" },
  { key: "export", i18n: "grc.incidents.ir.tab.export" },
];

// Onglet actif, par incident id -- variable de module, non persistant.
const _irActiveTab = Object.create(null);

/* --- petits utilitaires d'affichage (pas de store) ------------------ */

// Format date/heure + conversion datetime-local : factorisés dans
// grc-registry-kit.js (chargé avant grc-incidents.js). Aliases
// rétro-compat -- cf. spec/grc-registry-upgrades/ (SK6).
const irFmtDateTime = grkFmtDateTime;
const irIsoToLocalInput = grkIsoToLocalInput;

// libellé <label> + contrôle, renvoyés dans un <label> bloc.
function irField(labelText, control) {
  const l = document.createElement("label");
  l.className = "grc-ir-field";
  l.appendChild(document.createTextNode(labelText));
  l.appendChild(control);
  return l;
}

function irSelect(options, current, toLabel) {
  const s = document.createElement("select");
  options.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = toLabel(opt);
    if (opt === current) o.selected = true;
    s.appendChild(o);
  });
  return s;
}

/* --- montage du panneau ------------------------------------------------ */

/* Monte le panneau IR dans `container` (le div.grc-registry-body fourni
   par grc-incidents.js). Le corps legacy n'est pas rendu quand on arrive
   ici. La bascule d'onglet et les re-rendus après édition passent par
   _irSyncTabs (ne reconstruit que la barre d'état + le contenu). */
function renderIrPanel(container, incident) {
  container.innerHTML = "";

  const panel = document.createElement("div");
  panel.className = "grc-ir-panel";
  panel.dataset.incidentId = incident.id;

  const tabbar = document.createElement("div");
  tabbar.className = "grc-ir-tabbar";
  tabbar.setAttribute("role", "tablist");
  GRC_IR_TABS.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grc-ir-tab";
    btn.dataset.tab = t.key;
    btn.textContent = grcT(t.i18n);
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.tabIndex = -1;
    btn.addEventListener("click", () => {
      _irActiveTab[incident.id] = t.key;
      _irSyncTabs(panel, incident.id);
      panel.querySelector('.grc-ir-tab[aria-selected="true"]').focus();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (i + dir + GRC_IR_TABS.length) % GRC_IR_TABS.length;
      _irActiveTab[incident.id] = GRC_IR_TABS[next].key;
      _irSyncTabs(panel, incident.id);
      panel.querySelector('.grc-ir-tab[aria-selected="true"]').focus();
    });
    tabbar.appendChild(btn);
  });
  panel.appendChild(tabbar);

  const content = document.createElement("div");
  content.className = "grc-ir-tabpanel";
  content.setAttribute("role", "tabpanel");
  panel.appendChild(content);

  container.appendChild(panel);
  _irSyncTabs(panel, incident.id);
}

// Applique l'onglet actif : état des boutons + rendu du contenu. Re-lit
// l'incident depuis le store à chaque appel (données fraîches après édition).
function _irSyncTabs(panel, incidentId) {
  // Toute reconstruction du contenu vide d'abord les notes en attente
  // (autosave debouncé de l'onglet Investigation) pour ne rien perdre.
  _irFlushNotes(incidentId);

  const active = _irActiveTab[incidentId] || "synthese";

  panel.querySelectorAll(".grc-ir-tab").forEach((b) => {
    const on = b.dataset.tab === active;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  });

  const content = panel.querySelector(".grc-ir-tabpanel");
  content.innerHTML = "";

  const incident = getGrcIncidents().find((i) => i.id === incidentId);
  if (!incident) return;
  const ensured = grcIncidentEnsureIr(incident);

  panel.classList.toggle("grc-ir-focus", _irFocusOn.has(incidentId));

  if (active === "synthese") _irRenderSynthese(content, ensured);
  else if (active === "timeline") _irRenderTimeline(content, ensured);
  else if (active === "investigation") _irRenderInvestigation(content, ensured);
  else if (active === "taches") _irRenderTasks(content, ensured);
  else if (active === "export") _irRenderExport(content, ensured);
}

// Re-rendu depuis un contrôle interne au panneau (après une écriture).
function _irRefresh(node) {
  const panel = node.closest(".grc-ir-panel");
  if (panel) _irSyncTabs(panel, panel.dataset.incidentId);
}

/* --- onglet Synthèse ------------------------------------------------- */

function _irRenderSynthese(root, incident) {
  const id = incident.id;
  const ir = incident.ir;

  // 1. Sévérité / statut -- lecture seule (édition via "Modifier").
  const idBlock = document.createElement("section");
  idBlock.className = "grc-ir-sec";
  const sev = grcIncidentSeverityBadge(incident.severity);
  const sevRow = document.createElement("p");
  sevRow.className = "grc-ir-readonly";
  sevRow.appendChild(_irLabelled(grcT("grc.incidents.ir.synthese.severity"), sev.text));
  sevRow.appendChild(_irLabelled(grcT("grc.incidents.ir.synthese.status"), grcIncidentStatusLabel(incident.status)));
  idBlock.appendChild(sevRow);
  const hint = document.createElement("p");
  hint.className = "grc-ir-hint";
  hint.textContent = grcT("grc.incidents.ir.synthese.editHint");
  idBlock.appendChild(hint);
  root.appendChild(idBlock);

  // 2. Classification éditable : phase NIST, playbook, TLP.
  const clsBlock = document.createElement("section");
  clsBlock.className = "grc-ir-sec";
  const clsH = document.createElement("h4");
  clsH.textContent = grcT("grc.incidents.ir.synthese.classification");
  clsBlock.appendChild(clsH);

  const clsGrid = document.createElement("div");
  clsGrid.className = "grc-ir-formgrid";

  const phaseSel = irSelect(GRC_IR_NIST_PHASES, ir.classification.nistPhase,
    (p) => grcT("grc.incidents.ir.nistPhase." + p));
  phaseSel.addEventListener("change", () => {
    grcIrSetClassification(id, { nistPhase: phaseSel.value });
    _irRefresh(phaseSel);
  });
  clsGrid.appendChild(irField(grcT("grc.incidents.ir.synthese.nistPhase"), phaseSel));

  const tlpSel = irSelect(GRC_IR_TLP, ir.classification.tlp,
    (t) => grcT("grc.incidents.ir.tlp." + t));
  tlpSel.addEventListener("change", () => {
    grcIrSetClassification(id, { tlp: tlpSel.value });
    _irRefresh(tlpSel);
  });
  clsGrid.appendChild(irField(grcT("grc.incidents.ir.synthese.tlp"), tlpSel));

  const playbookInput = document.createElement("input");
  playbookInput.type = "text";
  playbookInput.value = ir.classification.playbook || "";
  playbookInput.addEventListener("change", () => {
    grcIrSetClassification(id, { playbook: playbookInput.value.trim() });
  });
  clsGrid.appendChild(irField(grcT("grc.incidents.ir.synthese.playbook"), playbookInput));

  clsBlock.appendChild(clsGrid);
  root.appendChild(clsBlock);

  // 3. Pilotage : responsable IR, ouvert/clos le.
  const metaBlock = document.createElement("section");
  metaBlock.className = "grc-ir-sec";
  const metaGrid = document.createElement("div");
  metaGrid.className = "grc-ir-formgrid";

  const leadInput = document.createElement("input");
  leadInput.type = "text";
  leadInput.value = ir.leadResponder || "";
  leadInput.addEventListener("change", () => {
    grcIrSetMeta(id, { leadResponder: leadInput.value.trim() });
  });
  metaGrid.appendChild(irField(grcT("grc.incidents.ir.synthese.leadResponder"), leadInput));

  const openedInput = document.createElement("input");
  openedInput.type = "datetime-local";
  openedInput.value = irIsoToLocalInput(ir.openedAt);
  openedInput.addEventListener("change", () => {
    grcIrSetMeta(id, { openedAt: openedInput.value });
    _irRefresh(openedInput);
  });
  metaGrid.appendChild(irField(grcT("grc.incidents.ir.synthese.openedAt"), openedInput));

  const closedInput = document.createElement("input");
  closedInput.type = "datetime-local";
  closedInput.value = irIsoToLocalInput(ir.closedAt);
  closedInput.addEventListener("change", () => {
    grcIrSetMeta(id, { closedAt: closedInput.value });
    _irRefresh(closedInput);
  });
  metaGrid.appendChild(irField(grcT("grc.incidents.ir.synthese.closedAt"), closedInput));

  metaBlock.appendChild(metaGrid);
  root.appendChild(metaBlock);

  // 4. Compteurs.
  const openTasks = ir.tasks.filter((t) => t.status !== "done").length;
  const counters = [
    ["cEvents", ir.timeline.length],
    ["cIocs", ir.investigation.iocs.length],
    ["cHypotheses", ir.investigation.hypotheses.length],
    ["cAffected", ir.investigation.affected.length],
    ["cOpenTasks", openTasks],
  ];
  const countBlock = document.createElement("section");
  countBlock.className = "grc-ir-sec";
  const countH = document.createElement("h4");
  countH.textContent = grcT("grc.incidents.ir.synthese.counters");
  countBlock.appendChild(countH);
  const chips = document.createElement("div");
  chips.className = "grc-ir-chips";
  counters.forEach(([key, n]) => {
    const chip = document.createElement("span");
    chip.className = "grc-ir-chip";
    chip.textContent = grcT("grc.incidents.ir.synthese." + key).replace("{n}", n);
    chips.appendChild(chip);
  });
  countBlock.appendChild(chips);
  root.appendChild(countBlock);

  // 5. Durées clés (celles calculables seulement).
  const d = grcIrDurations(incident);
  const durRows = [
    ["dDetectionContainment", d.detectionToContainment],
    ["dDetectionRecovery", d.detectionToRecovery],
    ["dContainmentRecovery", d.containmentToRecovery],
  ].filter(([, v]) => v);
  if (durRows.length) {
    const durBlock = document.createElement("section");
    durBlock.className = "grc-ir-sec";
    const durH = document.createElement("h4");
    durH.textContent = grcT("grc.incidents.ir.synthese.durations");
    durBlock.appendChild(durH);
    const dl = document.createElement("dl");
    dl.className = "grc-ir-durations";
    durRows.forEach(([key, val]) => {
      const dt = document.createElement("dt");
      dt.textContent = grcT("grc.incidents.ir.synthese." + key);
      const dd = document.createElement("dd");
      dd.textContent = val;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    durBlock.appendChild(dl);
    root.appendChild(durBlock);
  }

  // 6. Lien vers le registre PCA/PRA -- seulement si grc-continuity.js est
  //    chargé sur la page (D4 : aucune dépendance de chargement, dégradé
  //    silencieux sinon).
  if (typeof getGrcContinuity === "function") {
    try {
      const plans = getGrcContinuity();
      const linked = plans.filter(Boolean).find((p) => p.linkedIncident === incident.id);
      const sec = document.createElement("section");
      sec.className = "grc-ir-sec";
      const a = document.createElement("a");
      a.className = "grc-ir-cont-link";
      if (linked) {
        a.href = "continuite.html#" + encodeURIComponent(linked.id);
        a.textContent = grcT("grc.incidents.ir.synthese.contLinked").replace("{value}", linked.service || linked.id);
      } else {
        a.href = "continuite.html";
        a.textContent = grcT("grc.incidents.ir.synthese.contOpen");
      }
      sec.appendChild(a);
      root.appendChild(sec);
    } catch (e) {}
  }
}

// "label : value" inline, value en <strong>.
function _irLabelled(label, value) {
  const span = document.createElement("span");
  span.className = "grc-ir-kv";
  span.appendChild(document.createTextNode(label + " "));
  const b = document.createElement("strong");
  b.textContent = value;
  span.appendChild(b);
  return span;
}

/* --- onglet Timeline (T4) ----------------------------------------------
   SVG + CSS vanilla (CSP projet : pas de lib). Piste horizontale
   scrollable, échelle temporelle auto, marqueur « maintenant », pastilles
   colorées par `kind` (tokens --ir-kind-*, thème complet en T8). Filtre
   par kind, zoom (facteur sur la largeur), popover détail (Éditer /
   Épingler / Supprimer), formulaire d'ajout/édition, nav clavier. */

const SVG_NS = "http://www.w3.org/2000/svg";

// état UI de la timeline, par incident id -- non persistant.
const _irTlState = Object.create(null);
function _irTlGetState(id) {
  if (!_irTlState[id]) _irTlState[id] = { zoom: 1, hidden: new Set(), selected: null, editingEv: null };
  return _irTlState[id];
}

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function _irKindLabel(kind) {
  return grcT("grc.incidents.ir.kind." + kind);
}

function _irTrunc(s, n) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// format d'étiquette d'axe adapté à l'amplitude (ms) affichée.
function _irAxisFmt(spanMs) {
  const p = (n) => String(n).padStart(2, "0");
  if (spanMs <= 18 * 3600e3) {
    return (t) => { const d = new Date(t); return p(d.getHours()) + ":" + p(d.getMinutes()); };
  }
  if (spanMs <= 21 * 86400e3) {
    return (t) => { const d = new Date(t); return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + "h"; };
  }
  return (t) => { const d = new Date(t); return p(d.getDate()) + "/" + p(d.getMonth() + 1); };
}

function _irRenderTimeline(root, incident) {
  const id = incident.id;
  const ir = incident.ir;
  const st = _irTlGetState(id);
  const all = ir.timeline.slice();

  // ---- toolbar : zoom + filtres ----
  const toolbar = document.createElement("div");
  toolbar.className = "grc-ir-tl-toolbar";

  const zoom = document.createElement("div");
  zoom.className = "grc-ir-tl-zoom";
  const mkZoom = (txt, aria, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-ir-tl-zbtn";
    b.textContent = txt;
    b.setAttribute("aria-label", aria);
    b.addEventListener("click", () => { fn(); _irRefresh(b); });
    return b;
  };
  zoom.appendChild(mkZoom("−", grcT("grc.incidents.ir.tl.zoomOut"), () => { st.zoom = Math.max(0.5, +(st.zoom / 1.5).toFixed(3)); }));
  zoom.appendChild(mkZoom(grcT("grc.incidents.ir.tl.zoomFit"), grcT("grc.incidents.ir.tl.zoomFit"), () => { st.zoom = 1; }));
  zoom.appendChild(mkZoom("+", grcT("grc.incidents.ir.tl.zoomIn"), () => { st.zoom = Math.min(8, +(st.zoom * 1.5).toFixed(3)); }));
  toolbar.appendChild(zoom);

  const present = [];
  all.forEach((e) => { if (present.indexOf(e.kind) === -1) present.push(e.kind); });
  if (present.length) {
    const filters = document.createElement("div");
    filters.className = "grc-ir-tl-filters";
    present.forEach((k) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "grc-ir-tl-fchip" + (st.hidden.has(k) ? " is-off" : "");
      chip.style.setProperty("--chip", "var(--ir-kind-" + k + ")");
      chip.setAttribute("aria-pressed", st.hidden.has(k) ? "false" : "true");
      const dot = document.createElement("span");
      dot.className = "grc-ir-kdot";
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(_irKindLabel(k)));
      chip.addEventListener("click", () => {
        if (st.hidden.has(k)) st.hidden.delete(k); else st.hidden.add(k);
        _irRefresh(chip);
      });
      filters.appendChild(chip);
    });
    toolbar.appendChild(filters);
  }
  root.appendChild(toolbar);

  const events = all.filter((e) => !st.hidden.has(e.kind));

  // ---- piste ou état vide ----
  if (all.length === 0) {
    const empty = document.createElement("p");
    empty.className = "grc-ir-empty";
    empty.textContent = grcT("grc.incidents.ir.tl.empty");
    root.appendChild(empty);
  } else {
    root.appendChild(_irBuildTimelineSvg(root, id, events, st));
    root.appendChild(_irBuildTimelineVList(root, id, events, st)); // repli < 640 px (D4)
    const d = grcIrDurations(incident);
    const spans = [
      [d.detectionToContainment, "grc.incidents.ir.synthese.dDetectionContainment"],
      [d.containmentToRecovery, "grc.incidents.ir.synthese.dContainmentRecovery"],
    ].filter(([v]) => v);
    if (spans.length) {
      const sp = document.createElement("p");
      sp.className = "grc-ir-tl-spans";
      sp.textContent = spans.map(([v, k]) => grcT(k) + " : " + v).join("  ·  ");
      root.appendChild(sp);
    }
  }

  // ---- slot popover ----
  const slot = document.createElement("div");
  slot.className = "grc-ir-pop-slot";
  root.appendChild(slot);
  if (st.selected && events.some((e) => e.id === st.selected)) {
    _irRenderEventDetail(slot, incident, st.selected);
  } else {
    st.selected = st.selected && all.some((e) => e.id === st.selected) ? st.selected : null;
  }

  // ---- formulaire ajout / édition ----
  root.appendChild(_irBuildEventForm(id, incident));
}

function _irBuildTimelineSvg(contentRoot, id, events, st) {
  const scroll = document.createElement("div");
  scroll.className = "grc-ir-tl-scroll";
  scroll.tabIndex = 0;
  scroll.setAttribute("role", "group");
  scroll.setAttribute("aria-label", grcT("grc.incidents.ir.tab.timeline"));

  const H = 152, ML = 18, MR = 18, TOP = 24, BOT = 30;
  const W = Math.max(320, Math.round(660 * st.zoom));
  const x0 = ML, x1 = W - MR, baseY = H - BOT;

  const times = events.map((e) => new Date(e.ts).getTime()).filter((t) => !isNaN(t));
  let tMin, tMax;
  if (times.length === 0) {
    const now = Date.now();
    tMin = now - 3600e3; tMax = now + 3600e3;
  } else {
    tMin = Math.min.apply(null, times);
    tMax = Math.max.apply(null, times);
    if (tMin === tMax) { tMin -= 1800e3; tMax += 1800e3; }
  }
  const pad = Math.max((tMax - tMin) * 0.08, 15 * 60e3);
  const dMin = tMin - pad, dMax = tMax + pad;
  const xOf = (t) => x0 + (t - dMin) / (dMax - dMin) * (x1 - x0);

  const svg = svgEl("svg", {
    class: "grc-ir-tl-svg", width: W, height: H,
    viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "xMinYMin meet",
  });

  svg.appendChild(svgEl("line", { class: "grc-ir-tl-axis", x1: x0, y1: baseY, x2: x1, y2: baseY }));

  const N = Math.max(2, Math.min(8, Math.round((x1 - x0) / 120)));
  const span = dMax - dMin;
  const fmt = _irAxisFmt(span);
  for (let i = 0; i <= N; i++) {
    const t = dMin + span * (i / N);
    const x = xOf(t);
    svg.appendChild(svgEl("line", { class: "grc-ir-tl-tick", x1: x, y1: baseY, x2: x, y2: baseY + 5 }));
    const lbl = svgEl("text", { class: "grc-ir-tl-tlabel", x: x, y: baseY + 17, "text-anchor": "middle" });
    lbl.textContent = fmt(t);
    svg.appendChild(lbl);
  }

  const now = Date.now();
  if (now >= dMin && now <= dMax) {
    const xn = xOf(now);
    svg.appendChild(svgEl("line", { class: "grc-ir-tl-now", x1: xn, y1: TOP - 4, x2: xn, y2: baseY }));
    const nl = svgEl("text", { class: "grc-ir-tl-nowlabel", x: xn, y: TOP - 8, "text-anchor": "middle" });
    nl.textContent = grcT("grc.incidents.ir.tl.now");
    svg.appendChild(nl);
  }

  events.forEach((e) => {
    const t = new Date(e.ts).getTime();
    if (isNaN(t)) return;
    const cx = xOf(t);
    const g = svgEl("g", {
      class: "grc-ir-tl-ev" + (e.id === st.selected ? " is-selected" : "") + (e.pinned ? " is-pinned" : ""),
      "data-ev": e.id, role: "button", tabindex: "-1",
    });
    g.setAttribute("aria-label", _irKindLabel(e.kind) + (e.title ? " — " + e.title : "") + " — " + irFmtDateTime(e.ts));
    if (e.pinned) {
      g.appendChild(svgEl("line", { class: "grc-ir-tl-stem", x1: cx, y1: baseY, x2: cx, y2: baseY - 22 }));
      const el = svgEl("text", { class: "grc-ir-tl-elabel", x: cx, y: baseY - 26, "text-anchor": "middle" });
      el.textContent = _irTrunc(e.title || _irKindLabel(e.kind), 22);
      g.appendChild(el);
    }
    g.appendChild(svgEl("circle", {
      class: "grc-ir-tl-dot", cx: cx, cy: baseY, r: e.pinned ? 7 : 5,
      fill: "var(--ir-kind-" + e.kind + ")",
    }));
    g.addEventListener("click", () => _irTlSelect(contentRoot, id, e.id));
    svg.appendChild(g);
  });

  scroll.appendChild(svg);

  scroll.addEventListener("keydown", (ev) => {
    if (["ArrowRight", "ArrowLeft", "Enter", "Escape"].indexOf(ev.key) === -1) return;
    ev.preventDefault();
    const ids = events.map((e) => e.id);
    if (ev.key === "Escape") { _irTlSelect(contentRoot, id, null); return; }
    if (!ids.length) return;
    if (ev.key === "Enter") {
      if (!st.selected) { _irTlSelect(contentRoot, id, ids[0]); return; }
      const pop = contentRoot.querySelector(".grc-ir-popover button");
      if (pop) pop.focus();
      return;
    }
    let idx = ids.indexOf(st.selected);
    if (idx === -1) idx = ev.key === "ArrowRight" ? -1 : 0;
    idx = ev.key === "ArrowRight" ? Math.min(ids.length - 1, idx + 1) : Math.max(0, idx - 1);
    _irTlSelect(contentRoot, id, ids[idx]);
  });

  return scroll;
}

// Repli vertical de la timeline pour les écrans étroits (D4) : liste
// scrollable verticalement, affichée à la place du SVG par media query
// (< 640 px). Même sélection / popover que le SVG.
function _irBuildTimelineVList(contentRoot, id, events, st) {
  const ul = document.createElement("ul");
  ul.className = "grc-ir-tl-vlist";
  events.forEach((e) => {
    const li = document.createElement("li");
    li.className = "grc-ir-tl-vrow" +
      (e.id === st.selected ? " is-selected" : "") + (e.pinned ? " is-pinned" : "");
    li.dataset.ev = e.id;
    li.tabIndex = 0;
    li.setAttribute("role", "button");

    const dot = document.createElement("span");
    dot.className = "grc-ir-kdot";
    dot.style.setProperty("--chip", "var(--ir-kind-" + e.kind + ")");
    li.appendChild(dot);

    const when = document.createElement("span");
    when.className = "grc-ir-tl-vwhen";
    when.textContent = irFmtDateTime(e.ts);
    li.appendChild(when);

    const txt = document.createElement("span");
    txt.className = "grc-ir-tl-vtxt";
    txt.textContent = _irKindLabel(e.kind) + (e.title ? " — " + e.title : "");
    li.appendChild(txt);

    const act = () => _irTlSelect(contentRoot, id, e.id);
    li.addEventListener("click", act);
    li.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); act(); }
    });
    ul.appendChild(li);
  });
  return ul;
}

// Sélection d'un événement -- mise à jour en place (garde le focus clavier
// et la position de scroll), pas de re-rendu complet. Couvre le SVG et le
// repli vertical (D4).
function _irTlSelect(contentRoot, incidentId, evId) {
  const st = _irTlGetState(incidentId);
  st.selected = evId;
  contentRoot.querySelectorAll(".grc-ir-tl-ev, .grc-ir-tl-vrow").forEach((g) => {
    g.classList.toggle("is-selected", g.dataset.ev === evId);
  });
  const slot = contentRoot.querySelector(".grc-ir-pop-slot");
  if (slot) {
    slot.innerHTML = "";
    if (evId) {
      const inc = grcIncidentEnsureIr(getGrcIncidents().find((i) => i.id === incidentId));
      if (inc) _irRenderEventDetail(slot, inc, evId);
    }
  }
  if (evId) {
    const dot = contentRoot.querySelector('.grc-ir-tl-ev[data-ev="' + evId + '"]');
    if (dot && dot.scrollIntoView) dot.scrollIntoView({ block: "nearest", inline: "center" });
    const vrow = contentRoot.querySelector('.grc-ir-tl-vrow[data-ev="' + evId + '"]');
    if (vrow && vrow.scrollIntoView) vrow.scrollIntoView({ block: "nearest" });
  }
}

function _irRenderEventDetail(slot, incident, evId) {
  const id = incident.id;
  const e = incident.ir.timeline.find((x) => x.id === evId);
  if (!e) return;

  const card = document.createElement("div");
  card.className = "grc-ir-popover";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", grcT("grc.incidents.ir.tl.detailTitle"));

  const head = document.createElement("div");
  head.className = "grc-ir-pop-head";
  const kdot = document.createElement("span");
  kdot.className = "grc-ir-kdot";
  kdot.style.setProperty("--chip", "var(--ir-kind-" + e.kind + ")");
  head.appendChild(kdot);
  const klab = document.createElement("strong");
  klab.textContent = _irKindLabel(e.kind);
  head.appendChild(klab);
  const when = document.createElement("span");
  when.className = "grc-ir-pop-when";
  when.textContent = irFmtDateTime(e.ts);
  head.appendChild(when);
  const closeB = document.createElement("button");
  closeB.type = "button";
  closeB.className = "grc-ir-pop-close";
  closeB.setAttribute("aria-label", grcT("grc.incidents.ir.tl.close"));
  closeB.textContent = "×";
  closeB.addEventListener("click", () => { _irTlGetState(id).selected = null; _irRefresh(closeB); });
  head.appendChild(closeB);
  card.appendChild(head);

  if (e.title) {
    const t = document.createElement("p");
    t.className = "grc-ir-pop-title";
    t.textContent = e.title;
    card.appendChild(t);
  }
  const meta = [];
  if (e.actor) meta.push(grcT("grc.incidents.ir.tl.actor") + " " + e.actor);
  if (e.source) meta.push(grcT("grc.incidents.ir.tl.source") + " " + e.source);
  if (meta.length) {
    const m = document.createElement("p");
    m.className = "grc-ir-pop-meta";
    m.textContent = meta.join("  ·  ");
    card.appendChild(m);
  }
  if (e.detail) {
    const dt = document.createElement("p");
    dt.className = "grc-ir-pop-detail";
    dt.textContent = e.detail;
    card.appendChild(dt);
  }

  const acts = document.createElement("div");
  acts.className = "grc-ir-pop-acts";

  const editB = document.createElement("button");
  editB.type = "button";
  editB.className = "grc-registry-io-btn";
  editB.textContent = grcT("grc.common.btnEdit");
  editB.addEventListener("click", () => { _irTlGetState(id).editingEv = e.id; _irRefresh(editB); });
  acts.appendChild(editB);

  const pinB = document.createElement("button");
  pinB.type = "button";
  pinB.className = "grc-registry-io-btn";
  pinB.textContent = grcT(e.pinned ? "grc.incidents.ir.tl.unpin" : "grc.incidents.ir.tl.pin");
  pinB.addEventListener("click", () => { grcIrUpdateEvent(id, e.id, { pinned: !e.pinned }); _irRefresh(pinB); });
  acts.appendChild(pinB);

  const delB = document.createElement("button");
  delB.type = "button";
  delB.className = "grc-registry-io-btn";
  delB.textContent = grcT("grc.common.btnDelete");
  delB.addEventListener("click", () => {
    if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", e.title || _irKindLabel(e.kind)))) return;
    const st = _irTlGetState(id);
    if (st.selected === e.id) st.selected = null;
    if (st.editingEv === e.id) st.editingEv = null;
    grcIrRemoveEvent(id, e.id);
    _irRefresh(delB);
  });
  acts.appendChild(delB);

  card.appendChild(acts);
  slot.appendChild(card);
}

function _irBuildEventForm(id, incident) {
  const st = _irTlGetState(id);
  const editing = st.editingEv ? incident.ir.timeline.find((x) => x.id === st.editingEv) : null;

  const form = document.createElement("form");
  form.className = "grc-ir-tl-form";

  const h = document.createElement("h4");
  h.textContent = grcT(editing ? "grc.incidents.ir.tl.editTitle" : "grc.incidents.ir.tl.addTitle");
  form.appendChild(h);

  const grid = document.createElement("div");
  grid.className = "grc-ir-formgrid";

  const kindSel = irSelect(GRC_IR_EVENT_KINDS, editing ? editing.kind : "note", _irKindLabel);
  grid.appendChild(irField(grcT("grc.incidents.ir.tl.fKind"), kindSel));

  const whenInput = document.createElement("input");
  whenInput.type = "datetime-local";
  whenInput.value = irIsoToLocalInput(editing ? editing.ts : new Date().toISOString());
  grid.appendChild(irField(grcT("grc.incidents.ir.tl.fWhen"), whenInput));

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = editing ? (editing.title || "") : "";
  grid.appendChild(irField(grcT("grc.incidents.ir.tl.fEvTitle"), titleInput));

  const actorInput = document.createElement("input");
  actorInput.type = "text";
  actorInput.value = editing ? (editing.actor || "") : (grcIrAuthorName() || "");
  grid.appendChild(irField(grcT("grc.incidents.ir.tl.fActor"), actorInput));

  const sourceInput = document.createElement("input");
  sourceInput.type = "text";
  sourceInput.value = editing ? (editing.source || "") : "";
  grid.appendChild(irField(grcT("grc.incidents.ir.tl.fSource"), sourceInput));

  form.appendChild(grid);

  const detailInput = document.createElement("textarea");
  detailInput.rows = 2;
  detailInput.value = editing ? (editing.detail || "") : "";
  form.appendChild(irField(grcT("grc.incidents.ir.tl.fDetail"), detailInput));

  const actions = document.createElement("div");
  actions.className = "grc-ir-actions";
  const submitB = document.createElement("button");
  submitB.type = "submit";
  submitB.className = "grc-registry-add-btn";
  submitB.textContent = grcT(editing ? "grc.common.btnSave" : "grc.incidents.ir.tl.add");
  actions.appendChild(submitB);
  if (editing) {
    const cancelB = document.createElement("button");
    cancelB.type = "button";
    cancelB.className = "grc-registry-io-btn";
    cancelB.textContent = grcT("grc.common.btnCancel");
    cancelB.addEventListener("click", () => { st.editingEv = null; _irRefresh(cancelB); });
    actions.appendChild(cancelB);
  }
  form.appendChild(actions);

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const payload = {
      kind: kindSel.value,
      ts: whenInput.value,
      title: titleInput.value.trim(),
      detail: detailInput.value.trim(),
      actor: actorInput.value.trim(),
      source: sourceInput.value.trim(),
    };
    if (editing) {
      grcIrUpdateEvent(id, editing.id, payload);
      st.editingEv = null;
    } else {
      st.selected = grcIrAddEvent(id, payload);
    }
    _irRefresh(form);
  });

  if (editing) requestAnimationFrame(() => { try { h.scrollIntoView({ block: "nearest" }); } catch (err) {} });

  return form;
}

/* --- onglet Investigation (T5) ----------------------------------------
   Hypothèses, IOC (copie + « → preuve timeline »), actifs touchés
   (datalist depuis getGrcAssets si présent, D3), notes en autosave
   debouncé (800 ms). Toggle « Mode investigation » = classe
   `.grc-ir-focus` sur le panneau (session, non persistant). */

const _irFocusOn = new Set();                 // ids en mode focus (session)
const _irNotesPending = Object.create(null);  // id -> {timer, value, statusEl}

function _irScheduleNotes(id, value, statusEl) {
  const prev = _irNotesPending[id];
  if (prev && prev.timer) clearTimeout(prev.timer);
  const timer = setTimeout(() => {
    grcIrSetNotes(id, value);
    delete _irNotesPending[id];
    if (statusEl && statusEl.isConnected) statusEl.textContent = grcT("grc.incidents.ir.inv.notesSaved");
  }, 800);
  _irNotesPending[id] = { timer: timer, value: value, statusEl: statusEl };
}

function _irFlushNotes(id) {
  const p = _irNotesPending[id];
  if (!p) return;
  if (p.timer) clearTimeout(p.timer);
  grcIrSetNotes(id, p.value);
  delete _irNotesPending[id];
  if (p.statusEl && p.statusEl.isConnected) p.statusEl.textContent = grcT("grc.incidents.ir.inv.notesSaved");
}

function _irCopyFallback(text, done) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    done();
  } catch (e) {}
}

function _irCopyText(text, btn, doneLabel, origLabel) {
  const flash = () => {
    btn.textContent = doneLabel;
    setTimeout(() => { if (btn.isConnected) btn.textContent = origLabel; }, 1300);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(flash, () => _irCopyFallback(text, flash));
  } else {
    _irCopyFallback(text, flash);
  }
}

function _irDelBtn(onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "grc-ir-inv-del";
  b.setAttribute("aria-label", grcT("grc.common.btnDelete"));
  b.textContent = "✕";
  b.addEventListener("click", onClick);
  return b;
}

function _irEmptyLine() {
  const p = document.createElement("p");
  p.className = "grc-ir-inv-empty";
  p.textContent = grcT("grc.incidents.ir.inv.empty");
  return p;
}

function _irRenderInvestigation(root, incident) {
  const id = incident.id;

  const bar = document.createElement("div");
  bar.className = "grc-ir-inv-bar";
  const focusOn = _irFocusOn.has(id);
  const tgl = document.createElement("button");
  tgl.type = "button";
  tgl.className = "grc-ir-inv-toggle" + (focusOn ? " is-on" : "");
  tgl.setAttribute("aria-pressed", focusOn ? "true" : "false");
  tgl.textContent = grcT(focusOn ? "grc.incidents.ir.inv.focusOff" : "grc.incidents.ir.inv.focusOn");
  tgl.addEventListener("click", () => {
    if (_irFocusOn.has(id)) _irFocusOn.delete(id); else _irFocusOn.add(id);
    _irRefresh(tgl);
  });
  bar.appendChild(tgl);
  root.appendChild(bar);

  [
    ["is-hyp", _irInvHypotheses],
    ["is-ioc", _irInvIocs],
    ["is-aff", _irInvAffected],
    ["is-notes", _irInvNotes],
  ].forEach(([cls, fn]) => {
    const sec = document.createElement("section");
    sec.className = "grc-ir-inv-sec " + cls;
    fn(sec, incident);
    root.appendChild(sec);
  });
}

function _irInvAddForm(controls, onSubmit) {
  const form = document.createElement("form");
  form.className = "grc-ir-inv-add";
  controls.forEach((c) => form.appendChild(c));
  form.addEventListener("submit", (e) => { e.preventDefault(); onSubmit(); });
  return form;
}

function _irInvSecHeader(sec, titleKey) {
  const h4 = document.createElement("h4");
  h4.textContent = grcT(titleKey);
  sec.appendChild(h4);
  const list = document.createElement("div");
  list.className = "grc-ir-inv-list";
  sec.appendChild(list);
  return list;
}

function _irInvHypotheses(sec, incident) {
  const id = incident.id;
  const list = _irInvSecHeader(sec, "grc.incidents.ir.inv.hypTitle");
  const rows = incident.ir.investigation.hypotheses;

  rows.forEach((h) => {
    const row = document.createElement("div");
    row.className = "grc-ir-inv-row";

    const text = document.createElement("input");
    text.type = "text";
    text.className = "grc-ir-inv-grow";
    text.value = h.text || "";
    text.addEventListener("change", () => grcIrUpdateHypothesis(id, h.id, { text: text.value.trim() }));
    row.appendChild(text);

    const status = irSelect(GRC_IR_HYP_STATUSES, h.status, (s) => grcT("grc.incidents.ir.hyp." + s));
    status.className = "grc-ir-inv-status is-" + h.status;
    status.addEventListener("change", () => { grcIrUpdateHypothesis(id, h.id, { status: status.value }); _irRefresh(status); });
    row.appendChild(status);

    row.appendChild(_irDelBtn(() => { grcIrRemoveHypothesis(id, h.id); _irRefresh(row); }));
    list.appendChild(row);
  });
  if (!rows.length) list.appendChild(_irEmptyLine());

  const inp = document.createElement("input");
  inp.type = "text";
  inp.className = "grc-ir-inv-grow";
  inp.placeholder = grcT("grc.incidents.ir.inv.hypPlaceholder");
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.incidents.ir.inv.hypAdd");
  const form = _irInvAddForm([inp, btn], () => {
    const v = inp.value.trim();
    if (!v) return;
    grcIrAddHypothesis(id, v);
    _irRefresh(form);
  });
  sec.appendChild(form);
}

function _irInvIocs(sec, incident) {
  const id = incident.id;
  const list = _irInvSecHeader(sec, "grc.incidents.ir.inv.iocTitle");
  const rows = incident.ir.investigation.iocs;

  rows.forEach((o) => {
    const row = document.createElement("div");
    row.className = "grc-ir-inv-row";

    const type = irSelect(GRC_IR_IOC_TYPES, o.type, (t) => grcT("grc.incidents.ir.iocType." + t));
    type.addEventListener("change", () => grcIrUpdateIoc(id, o.id, { type: type.value }));
    row.appendChild(type);

    const val = document.createElement("input");
    val.type = "text";
    val.className = "grc-ir-inv-grow grc-ir-mono";
    val.value = o.value || "";
    val.addEventListener("change", () => grcIrUpdateIoc(id, o.id, { value: val.value.trim() }));
    row.appendChild(val);

    const note = document.createElement("input");
    note.type = "text";
    note.placeholder = grcT("grc.incidents.ir.inv.iocNote");
    note.value = o.note || "";
    note.addEventListener("change", () => grcIrUpdateIoc(id, o.id, { note: note.value.trim() }));
    row.appendChild(note);

    const copyLabel = grcT("grc.incidents.ir.inv.iocCopy");
    const copyB = document.createElement("button");
    copyB.type = "button";
    copyB.className = "grc-registry-io-btn";
    copyB.textContent = copyLabel;
    copyB.addEventListener("click", () => _irCopyText(o.value || "", copyB, grcT("grc.incidents.ir.inv.iocCopied"), copyLabel));
    row.appendChild(copyB);

    const evB = document.createElement("button");
    evB.type = "button";
    evB.className = "grc-registry-io-btn";
    evB.textContent = grcT("grc.incidents.ir.inv.iocToEv");
    evB.addEventListener("click", () => {
      grcIrIocToEvent(id, o.id);
      evB.textContent = grcT("grc.incidents.ir.inv.iocToEvDone");
      evB.disabled = true;
      setTimeout(() => _irRefresh(sec), 900);
    });
    row.appendChild(evB);

    row.appendChild(_irDelBtn(() => { grcIrRemoveIoc(id, o.id); _irRefresh(row); }));
    list.appendChild(row);
  });
  if (!rows.length) list.appendChild(_irEmptyLine());

  const type = irSelect(GRC_IR_IOC_TYPES, "ip", (t) => grcT("grc.incidents.ir.iocType." + t));
  const val = document.createElement("input");
  val.type = "text";
  val.className = "grc-ir-inv-grow grc-ir-mono";
  val.placeholder = grcT("grc.incidents.ir.inv.iocValue");
  val.required = true;
  const note = document.createElement("input");
  note.type = "text";
  note.placeholder = grcT("grc.incidents.ir.inv.iocNote");
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.incidents.ir.inv.iocAdd");
  const form = _irInvAddForm([type, val, note, btn], () => {
    const v = val.value.trim();
    if (!v) return;
    grcIrAddIoc(id, { type: type.value, value: v, note: note.value.trim() });
    _irRefresh(form);
  });
  sec.appendChild(form);
}

function _irInvAffected(sec, incident) {
  const id = incident.id;

  // D3 : datalist des noms d'actifs si le registre GRC des actifs est
  // chargé sur la page ; sinon champ libre (dégradé gracieux).
  let listId = null;
  if (typeof getGrcAssets === "function") {
    try {
      const names = getGrcAssets().map((a) => a && a.name).filter(Boolean);
      if (names.length) {
        listId = "grc-ir-assets-" + id;
        const dl = document.createElement("datalist");
        dl.id = listId;
        names.forEach((n) => { const o = document.createElement("option"); o.value = n; dl.appendChild(o); });
        sec.appendChild(dl);
      }
    } catch (e) { listId = null; }
  }

  const list = _irInvSecHeader(sec, "grc.incidents.ir.inv.affTitle");
  const rows = incident.ir.investigation.affected;

  rows.forEach((a) => {
    const row = document.createElement("div");
    row.className = "grc-ir-inv-row";

    const type = irSelect(GRC_IR_AFFECTED_TYPES, a.type, (t) => grcT("grc.incidents.ir.affType." + t));
    type.addEventListener("change", () => grcIrUpdateAffected(id, a.id, { type: type.value }));
    row.appendChild(type);

    const ref = document.createElement("input");
    ref.type = "text";
    ref.className = "grc-ir-inv-grow";
    ref.value = a.ref || "";
    if (listId) ref.setAttribute("list", listId);
    ref.addEventListener("change", () => grcIrUpdateAffected(id, a.id, { ref: ref.value.trim() }));
    row.appendChild(ref);

    const note = document.createElement("input");
    note.type = "text";
    note.placeholder = grcT("grc.incidents.ir.inv.affNote");
    note.value = a.note || "";
    note.addEventListener("change", () => grcIrUpdateAffected(id, a.id, { note: note.value.trim() }));
    row.appendChild(note);

    row.appendChild(_irDelBtn(() => { grcIrRemoveAffected(id, a.id); _irRefresh(row); }));
    list.appendChild(row);
  });
  if (!rows.length) list.appendChild(_irEmptyLine());

  const type = irSelect(GRC_IR_AFFECTED_TYPES, "host", (t) => grcT("grc.incidents.ir.affType." + t));
  const ref = document.createElement("input");
  ref.type = "text";
  ref.className = "grc-ir-inv-grow";
  ref.placeholder = grcT("grc.incidents.ir.inv.affRef");
  ref.required = true;
  if (listId) ref.setAttribute("list", listId);
  const note = document.createElement("input");
  note.type = "text";
  note.placeholder = grcT("grc.incidents.ir.inv.affNote");
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.incidents.ir.inv.affAdd");
  const form = _irInvAddForm([type, ref, note, btn], () => {
    const v = ref.value.trim();
    if (!v) return;
    grcIrAddAffected(id, { type: type.value, ref: v, note: note.value.trim() });
    _irRefresh(form);
  });
  sec.appendChild(form);
}

function _irInvNotes(sec, incident) {
  const id = incident.id;
  const h4 = document.createElement("h4");
  h4.textContent = grcT("grc.incidents.ir.inv.notesTitle");
  sec.appendChild(h4);

  const wrap = document.createElement("div");
  wrap.className = "grc-ir-notes-wrap";

  const ta = document.createElement("textarea");
  ta.className = "grc-ir-notes";
  ta.rows = 6;
  ta.value = incident.ir.investigation.notes || "";

  const status = document.createElement("span");
  status.className = "grc-ir-notes-status";

  ta.addEventListener("input", () => {
    status.textContent = grcT("grc.incidents.ir.inv.notesSaving");
    _irScheduleNotes(id, ta.value, status);
  });
  ta.addEventListener("blur", () => _irFlushNotes(id));

  wrap.appendChild(ta);
  wrap.appendChild(status);
  sec.appendChild(wrap);
}

/* --- onglet Tâches / kanban (T6) -------------------------------------
   3 colonnes todo / doing / done. Ajout (texte + responsable), déplacement
   par ← / →, `doneTs` posé/retiré au passage en `done` (helper T1
   grcIrUpdateTask). Édition texte/responsable au blur. */

function _irRenderTasks(root, incident) {
  const id = incident.id;
  const tasks = incident.ir.tasks;

  const text = document.createElement("input");
  text.type = "text";
  text.className = "grc-ir-inv-grow";
  text.placeholder = grcT("grc.incidents.ir.task.addText");
  text.required = true;
  const owner = document.createElement("input");
  owner.type = "text";
  owner.placeholder = grcT("grc.incidents.ir.task.addOwner");
  const btn = document.createElement("button");
  btn.type = "submit";
  btn.className = "grc-registry-add-btn";
  btn.textContent = grcT("grc.incidents.ir.task.add");
  const form = _irInvAddForm([text, owner, btn], () => {
    const v = text.value.trim();
    if (!v) return;
    grcIrAddTask(id, { text: v, owner: owner.value.trim() });
    _irRefresh(form);
  });
  root.appendChild(form);

  const board = document.createElement("div");
  board.className = "grc-ir-kanban";

  GRC_IR_TASK_STATUSES.forEach((status, ci) => {
    const col = document.createElement("div");
    col.className = "grc-ir-kcol is-" + status;

    const colTasks = tasks.filter((t) => t.status === status);
    const h5 = document.createElement("h5");
    h5.textContent = grcT("grc.incidents.ir.task." + status) + " · " + colTasks.length;
    col.appendChild(h5);

    if (!colTasks.length) {
      const e = document.createElement("p");
      e.className = "grc-ir-inv-empty";
      e.textContent = grcT("grc.incidents.ir.task.empty");
      col.appendChild(e);
    }

    colTasks.forEach((t) => {
      const card = document.createElement("div");
      card.className = "grc-ir-kcard";

      const tinp = document.createElement("input");
      tinp.type = "text";
      tinp.value = t.text || "";
      tinp.addEventListener("change", () => grcIrUpdateTask(id, t.id, { text: tinp.value.trim() }));
      card.appendChild(tinp);

      const oinp = document.createElement("input");
      oinp.type = "text";
      oinp.className = "grc-ir-kowner";
      oinp.placeholder = grcT("grc.incidents.ir.task.addOwner");
      oinp.value = t.owner || "";
      oinp.addEventListener("change", () => grcIrUpdateTask(id, t.id, { owner: oinp.value.trim() }));
      card.appendChild(oinp);

      if (t.status === "done" && t.doneTs) {
        const dts = document.createElement("p");
        dts.className = "grc-ir-kdone-ts";
        dts.textContent = grcT("grc.incidents.ir.task.doneAt").replace("{date}", irFmtDateTime(t.doneTs));
        card.appendChild(dts);
      }

      const acts = document.createElement("div");
      acts.className = "grc-ir-kcard-acts";

      const prev = document.createElement("button");
      prev.type = "button";
      prev.className = "grc-ir-kmove";
      prev.textContent = "←";
      prev.setAttribute("aria-label", grcT("grc.incidents.ir.task.prev"));
      prev.disabled = ci === 0;
      prev.addEventListener("click", () => { grcIrUpdateTask(id, t.id, { status: GRC_IR_TASK_STATUSES[ci - 1] }); _irRefresh(prev); });
      acts.appendChild(prev);

      const next = document.createElement("button");
      next.type = "button";
      next.className = "grc-ir-kmove";
      next.textContent = "→";
      next.setAttribute("aria-label", grcT("grc.incidents.ir.task.next"));
      next.disabled = ci === GRC_IR_TASK_STATUSES.length - 1;
      next.addEventListener("click", () => { grcIrUpdateTask(id, t.id, { status: GRC_IR_TASK_STATUSES[ci + 1] }); _irRefresh(next); });
      acts.appendChild(next);

      acts.appendChild(_irDelBtn(() => { grcIrRemoveTask(id, t.id); _irRefresh(acts); }));
      card.appendChild(acts);

      col.appendChild(card);
    });

    board.appendChild(col);
  });

  root.appendChild(board);
}

/* --- onglet Export (T7) ---------------------------------------------
   4 boutons (D5) : JSON ré-importable, rapport Word, rapport PDF, IOC .txt.
   Aucune requête réseau -- Blob + triggerDownload, ou window.open +
   document.write pour le PDF (patron grc-pentest.js / grc-checklist.js).
   Coffre verrouillé -> alerte + abort (le panneau lui-même est déjà
   derrière la gate via initGrcIncidentRegistry ; garde défensive). */

const IR_REPORT_EVENT_CAP = 500;

const irEscapeHtml = grkEscapeHtml;   // alias -> grc-registry-kit.js (SK6)

function irReportFilename(incident, ext) {
  return "ir-" + grcSlug(incident.title) + "-" + new Date().toISOString().slice(0, 10) + "." + ext;
}

function _irExportGated() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    alert(grcT("grc.common.vaultLockedExport"));
    return true;
  }
  return false;
}

// Rapport HTML autonome (échappé) -- partagé Word + PDF.
function irReportBody(incident) {
  const esc = irEscapeHtml;
  const L = (k) => grcT(k);
  const nl2br = (s) => esc(s).replace(/\n/g, "<br>");
  const ir = grcIncidentEnsureIr(incident).ir;
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = grcIrAuthorName();

  let h = "<h1>" + L("grc.incidents.ir.report.title") + " — " + esc(incident.title || "") + "</h1>";

  h += "<p><strong>" + L("grc.incidents.ir.report.generatedOn") + " :</strong> " + esc(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.incidents.ir.report.by") + " :</strong> " + esc(author);
  h += "</p>";

  const cls = [L("grc.incidents.ir.nistPhase." + ir.classification.nistPhase)];
  if (ir.classification.playbook) cls.push(L("grc.incidents.ir.synthese.playbook") + " : " + esc(ir.classification.playbook));
  cls.push(L("grc.incidents.ir.tlp." + ir.classification.tlp));
  h += "<p><strong>" + L("grc.incidents.ir.synthese.classification") + " :</strong> " + cls.join(" · ") + "</p>";
  h += "<p><strong>" + L("grc.incidents.ir.synthese.severity") + "</strong> " + esc(grcIncidentSeverityBadge(incident.severity).text) +
    " — <strong>" + L("grc.incidents.ir.synthese.status") + "</strong> " + esc(grcIncidentStatusLabel(incident.status)) + "</p>";
  if (ir.leadResponder) h += "<p><strong>" + L("grc.incidents.ir.synthese.leadResponder") + " :</strong> " + esc(ir.leadResponder) + "</p>";

  const period = [];
  if (ir.openedAt) period.push(irFmtDateTime(ir.openedAt));
  if (ir.closedAt) period.push(irFmtDateTime(ir.closedAt));
  if (period.length) h += "<p><strong>" + L("grc.incidents.ir.report.period") + " :</strong> " + esc(period.join(" → ")) + "</p>";

  const d = grcIrDurations(incident);
  const dur = [
    [d.detectionToContainment, "dDetectionContainment"],
    [d.detectionToRecovery, "dDetectionRecovery"],
    [d.containmentToRecovery, "dContainmentRecovery"],
  ].filter((r) => r[0]).map((r) => L("grc.incidents.ir.synthese." + r[1]) + " : " + esc(r[0]));
  if (dur.length) h += "<p><strong>" + L("grc.incidents.ir.synthese.durations") + " :</strong> " + dur.join(" · ") + "</p>";

  // synthèse exécutive
  h += "<h2>" + L("grc.incidents.ir.report.summary") + "</h2>";
  if (incident.description) h += "<p>" + nl2br(incident.description) + "</p>";
  if (incident.postmortem) h += "<p><strong>" + L("grc.incidents.form.postmortem") + " :</strong><br>" + nl2br(incident.postmortem) + "</p>";
  if (!incident.description && !incident.postmortem) h += "<p><em>" + L("grc.incidents.ir.report.none") + "</em></p>";

  // chronologie
  const tl = ir.timeline.slice();
  const shown = tl.length > IR_REPORT_EVENT_CAP ? tl.slice(0, IR_REPORT_EVENT_CAP) : tl;
  h += "<h2>" + L("grc.incidents.ir.report.timeline") + " (" + tl.length + ")</h2>";
  if (!tl.length) {
    h += "<p><em>" + L("grc.incidents.ir.report.none") + "</em></p>";
  } else {
    h += "<table border='1' cellspacing='0' cellpadding='4'><thead><tr><th>" +
      L("grc.incidents.ir.tl.fWhen") + "</th><th>" + L("grc.incidents.ir.tl.fKind") + "</th><th>" +
      L("grc.incidents.ir.tl.fActor") + "</th><th>" + L("grc.incidents.ir.tl.fEvTitle") + "</th><th>" +
      L("grc.incidents.ir.tl.fDetail") + "</th></tr></thead><tbody>";
    shown.forEach((e) => {
      const o = e.pinned ? "<strong>" : "", c = e.pinned ? "</strong>" : "";
      h += "<tr><td>" + esc(irFmtDateTime(e.ts)) + "</td><td>" + L("grc.incidents.ir.kind." + e.kind) +
        "</td><td>" + esc(e.actor || "") + "</td><td>" + o + esc(e.title || "") + c +
        "</td><td>" + nl2br(e.detail || "") + "</td></tr>";
    });
    h += "</tbody></table>";
    if (tl.length > IR_REPORT_EVENT_CAP) {
      h += "<p><em>" + L("grc.incidents.ir.report.capNote")
        .replace("{cap}", IR_REPORT_EVENT_CAP).replace("{total}", tl.length) + "</em></p>";
    }
  }

  // investigation
  const inv = ir.investigation;
  h += "<h2>" + L("grc.incidents.ir.tab.investigation") + "</h2>";

  h += "<h3>" + L("grc.incidents.ir.inv.hypTitle") + " (" + inv.hypotheses.length + ")</h3>";
  if (inv.hypotheses.length) {
    h += "<ul>";
    inv.hypotheses.forEach((x) => {
      h += "<li>" + esc(x.text || "") + " — <em>" + L("grc.incidents.ir.hyp." + x.status) + "</em></li>";
    });
    h += "</ul>";
  } else h += "<p><em>" + L("grc.incidents.ir.report.none") + "</em></p>";

  h += "<h3>" + L("grc.incidents.ir.inv.iocTitle") + " (" + inv.iocs.length + ")</h3>";
  if (inv.iocs.length) {
    h += "<table border='1' cellspacing='0' cellpadding='4'><thead><tr><th>" +
      L("grc.incidents.ir.tl.fKind") + "</th><th>" + L("grc.incidents.ir.inv.iocValue") + "</th><th>" +
      L("grc.incidents.ir.inv.iocNote") + "</th></tr></thead><tbody>";
    inv.iocs.forEach((o) => {
      h += "<tr><td>" + L("grc.incidents.ir.iocType." + o.type) + "</td><td>" + esc(o.value || "") +
        "</td><td>" + esc(o.note || "") + "</td></tr>";
    });
    h += "</tbody></table>";
  } else h += "<p><em>" + L("grc.incidents.ir.report.none") + "</em></p>";

  h += "<h3>" + L("grc.incidents.ir.inv.affTitle") + " (" + inv.affected.length + ")</h3>";
  if (inv.affected.length) {
    h += "<ul>";
    inv.affected.forEach((a) => {
      h += "<li>" + L("grc.incidents.ir.affType." + a.type) + " — " + esc(a.ref || "") +
        (a.note ? " (" + esc(a.note) + ")" : "") + "</li>";
    });
    h += "</ul>";
  } else h += "<p><em>" + L("grc.incidents.ir.report.none") + "</em></p>";

  if (inv.notes) {
    h += "<h3>" + L("grc.incidents.ir.inv.notesTitle") + "</h3><p>" + nl2br(inv.notes) + "</p>";
  }

  // actions
  h += "<h2>" + L("grc.incidents.ir.tab.taches") + " (" + ir.tasks.length + ")</h2>";
  if (ir.tasks.length) {
    h += "<table border='1' cellspacing='0' cellpadding='4'><thead><tr><th>" +
      L("grc.incidents.ir.tl.fEvTitle") + "</th><th>" + L("grc.incidents.ir.synthese.status") + "</th><th>" +
      L("grc.incidents.ir.task.addOwner") + "</th></tr></thead><tbody>";
    ir.tasks.forEach((t) => {
      h += "<tr><td>" + esc(t.text || "") + "</td><td>" + L("grc.incidents.ir.task." + t.status) +
        (t.doneTs ? " (" + esc(irFmtDateTime(t.doneTs)) + ")" : "") + "</td><td>" + esc(t.owner || "") + "</td></tr>";
    });
    h += "</tbody></table>";
  } else h += "<p><em>" + L("grc.incidents.ir.report.none") + "</em></p>";

  // annexe : chronologie détaillée -- une entrée analytique par événement
  // (heure, phase, acteur/source, écart depuis le précédent, détail,
  // identifiant technique), pas un dump JSON.
  h += "<h2>" + L("grc.incidents.ir.report.appendix") + "</h2>";
  if (!tl.length) {
    h += "<p><em>" + L("grc.incidents.ir.report.none") + "</em></p>";
  } else {
    h += "<ol>";
    shown.forEach((e, i) => {
      const elapsed = i > 0 ? grcIrSpanLabel(shown[i - 1].ts, e.ts) : null;
      h += "<li style='margin-bottom:0.55em;'>";
      h += "<strong>" + esc(irFmtDateTime(e.ts)) + "</strong> · " + L("grc.incidents.ir.kind." + e.kind);
      if (e.title) h += " · " + (e.pinned ? "<strong>" + esc(e.title) + "</strong>" : esc(e.title));
      if (e.pinned) h += " <em>" + L("grc.incidents.ir.report.pinnedMark") + "</em>";
      const meta = [];
      if (e.actor) meta.push(L("grc.incidents.ir.tl.actor") + " " + esc(e.actor));
      if (e.source) meta.push(L("grc.incidents.ir.tl.source") + " " + esc(e.source));
      if (elapsed) meta.push(L("grc.incidents.ir.report.elapsed").replace("{d}", esc(elapsed)));
      if (meta.length) h += "<br><span style='font-size:0.85em;'>" + meta.join(" · ") + "</span>";
      if (e.detail) h += "<br>" + nl2br(e.detail);
      h += "<br><span style='font-size:0.72em;color:#888;'>" + esc(e.id) + "</span>";
      h += "</li>";
    });
    h += "</ol>";
    if (tl.length > IR_REPORT_EVENT_CAP) {
      h += "<p><em>" + L("grc.incidents.ir.report.capNote")
        .replace("{cap}", IR_REPORT_EVENT_CAP).replace("{total}", tl.length) + "</em></p>";
    }
  }

  return h;
}

async function exportIrAsJson(incident) {
  if (_irExportGated()) return;
  const data = await vaultMaybeEncryptForExport(incident);
  exportJsonFile(data, irReportFilename(incident, "json"));
}

function exportIrReportAsWord(incident) {
  if (_irExportGated()) return;
  const html =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>" + irEscapeHtml(grcT("grc.incidents.ir.report.title")) + "</title></head>" +
    "<body style='font-family:Calibri,Arial,sans-serif;'>" + irReportBody(incident) + "</body></html>";
  triggerDownload(new Blob(["\ufeff", html], { type: "application/msword" }), irReportFilename(incident, "doc"));
}

function exportIrReportAsPdf(incident) {
  if (_irExportGated()) return;
  const win = window.open("", "_blank");
  if (!win) { alert(grcT("grc.common.popupBlocked")); return; }
  const html =
    "<!doctype html><html><head><meta charset='utf-8'><title>" + irEscapeHtml(grcT("grc.incidents.ir.report.title")) + "</title><style>" +
    "body{font-family:system-ui,Arial,sans-serif;color:#111;max-width:820px;margin:2rem auto;line-height:1.5;}" +
    "h1{margin-bottom:0;}h2{border-bottom:2px solid #333;margin-top:2rem;}h3{margin-bottom:0.2rem;}" +
    "table{border-collapse:collapse;width:100%;font-size:0.85em;}th{background:#eee;text-align:left;}td,th{border:1px solid #999;padding:4px;}" +
    "@media print{body{margin:0;}}" +
    "</style></head><body>" + irReportBody(incident) +
    "<script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script>" +
    "</body></html>";
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function exportIrIocs(incident) {
  if (_irExportGated()) return;
  const ir = grcIncidentEnsureIr(incident).ir;
  const lines = [
    "# " + grcT("grc.incidents.ir.tlp." + ir.classification.tlp),
    "# " + (incident.title || "") + " — " + new Date().toISOString().slice(0, 10),
  ];
  ir.investigation.iocs.forEach((o) => lines.push(o.type + "\t" + (o.value || "")));
  triggerDownload(new Blob([lines.join("\n") + "\n"], { type: "text/plain" }),
    "ir-" + grcSlug(incident.title) + "-iocs.txt");
}

function _irRenderExport(root, incident) {
  const hint = document.createElement("p");
  hint.className = "grc-ir-hint";
  hint.textContent = grcT("grc.incidents.ir.export.hint");
  root.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "grc-ir-export-grid";
  const mk = (labelKey, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-registry-add-btn";
    b.textContent = grcT(labelKey);
    b.addEventListener("click", () => fn(getGrcIncidents().find((i) => i.id === incident.id) || incident));
    return b;
  };
  grid.appendChild(mk("grc.incidents.ir.export.json", exportIrAsJson));
  grid.appendChild(mk("grc.incidents.ir.export.word", exportIrReportAsWord));
  grid.appendChild(mk("grc.incidents.ir.export.pdf", exportIrReportAsPdf));
  grid.appendChild(mk("grc.incidents.ir.export.iocs", exportIrIocs));
  root.appendChild(grid);
}
