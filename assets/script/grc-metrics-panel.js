/* Panneau d'un indicateur (KPI / KRI) -- barre d'onglets (grkPanel du
   kit) rendue dans le corps de l'accordéon du registre
   (grc/indicateurs.html) par grc-metrics.js. Voir
   spec/grc-registry-upgrades/60-indicateurs.md.

   AUCUNE logique de store ici : lectures/écritures via les helpers
   grcMetric* de grc-metrics.js. Chargé APRÈS grc-metrics.js et AVANT
   initGrcMetricsRegistry().

   État (60-indicateurs.md §6) :
   - T3 : onglet Définition (cible / seuils / direction).
   - T4 : onglet Mesures -- sparkline SVG vanilla + CRUD + repli liste.
   - T5 : onglet Analyse.  T6 : Export. */

/* ---------- helpers d'affichage --------------------------- */

function _metInput(value, onCommit, type) {
  const inp = document.createElement("input");
  inp.type = type || "text";
  inp.value = value == null ? "" : value;
  inp.addEventListener("change", () => onCommit(inp.value));
  return inp;
}

function _metTextArea(labelKey, value, onCommit) {
  const ta = document.createElement("textarea");
  ta.rows = 2;
  ta.value = value || "";
  ta.addEventListener("change", () => onCommit(ta.value));
  return grkField(grcT(labelKey), ta);
}

function _svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
  return el;
}

/* ---------- onglet Définition -------------------------- */

function _metRenderDefinition(root, m) {
  const id = m.id;
  const hint = document.createElement("p");
  hint.className = "grk-hint";
  hint.textContent = grcT("grc.indicateurs.def.editHint");
  root.appendChild(hint);

  const grid = document.createElement("div");
  grid.className = "grk-formgrid";

  const dir = grkSelect(GRC_METRIC_DIRECTIONS, m.direction, (d) => grcT("grc.indicateurs.dir." + d));
  dir.addEventListener("change", () => grcMetricSetDefinition(id, { direction: dir.value }));
  grid.appendChild(grkField(grcT("grc.indicateurs.def.direction"), dir));

  grid.appendChild(grkField(grcT("grc.indicateurs.def.target"),
    _metInput(m.target, (v) => grcMetricSetDefinition(id, { target: v }), "number")));
  grid.appendChild(grkField(grcT("grc.indicateurs.def.amber"),
    _metInput(m.thresholds.amber, (v) => grcMetricSetDefinition(id, { amber: v }), "number")));
  grid.appendChild(grkField(grcT("grc.indicateurs.def.red"),
    _metInput(m.thresholds.red, (v) => grcMetricSetDefinition(id, { red: v }), "number")));
  const cad = document.createElement("input");
  cad.type = "number";
  cad.min = "1";
  cad.value = m.cadenceMonths || 1;
  cad.addEventListener("change", () => grcMetricSetDefinition(id, { cadenceMonths: cad.value }));
  grid.appendChild(grkField(grcT("grc.indicateurs.def.cadenceMonths"), cad));
  root.appendChild(grid);

  root.appendChild(grkField(grcT("grc.indicateurs.def.source"),
    _metInput(m.source, (v) => grcMetricSetDefinition(id, { source: v }))));
  root.appendChild(_metTextArea("grc.indicateurs.def.formulaNote", m.formulaNote,
    (v) => grcMetricSetDefinition(id, { formulaNote: v })));

  // linkedRisk : datalist getGrcRisks si présent (dégradé sinon)
  const rk = _metInput(m.linkedRisk, (v) => grcMetricSetDefinition(id, { linkedRisk: v }));
  rk.setAttribute("autocomplete", "off");
  const riskNames = grkLinkNames({ risks: true });
  if (riskNames.length) {
    const dl = document.createElement("datalist");
    dl.id = "grc-metric-risk-" + id;
    riskNames.forEach((nm) => { const o = document.createElement("option"); o.value = nm; dl.appendChild(o); });
    root.appendChild(dl);
    rk.setAttribute("list", dl.id);
  }
  root.appendChild(grkField(grcT("grc.indicateurs.def.linkedRisk"), rk));
}

/* ---------- onglet Mesures : sparkline + CRUD ---------- */

function _metBuildSparkline(m, width, height) {
  const pts = (m.series || []).filter((s) => s.value != null && s.date);
  const svg = _svgEl("svg", {
    class: "grc-met-spark", viewBox: "0 0 " + width + " " + height,
    width: "100%", preserveAspectRatio: "none",
  });
  if (pts.length < 1) return svg;

  const pad = 6;
  const xs = pts.map((s) => Date.parse(s.date));
  const ys = pts.map((s) => s.value);
  const extra = [m.target, m.thresholds.amber, m.thresholds.red].filter((v) => v != null);
  const yAll = ys.concat(extra);
  let yMin = Math.min.apply(null, yAll);
  let yMax = Math.max.apply(null, yAll);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const xMin = Math.min.apply(null, xs);
  const xMax = Math.max.apply(null, xs);
  const xOf = (t) => xMax === xMin ? width / 2 : pad + (t - xMin) / (xMax - xMin) * (width - 2 * pad);
  const yOf = (v) => height - pad - (v - yMin) / (yMax - yMin) * (height - 2 * pad);

  // bandes seuils (rouge en bas / haut selon direction, ambre entre)
  const band = (from, to, cls) => {
    if (from == null || to == null) return;
    const y1 = yOf(Math.max(from, to));
    const y2 = yOf(Math.min(from, to));
    svg.appendChild(_svgEl("rect", { x: 0, y: y1, width: width, height: Math.max(0, y2 - y1),
      class: "grc-met-band " + cls }));
  };
  if (m.direction === "lower-better") {
    band(m.thresholds.red, yMax, "is-red");
    band(m.thresholds.amber, m.thresholds.red, "is-amber");
  } else {
    band(yMin, m.thresholds.red, "is-red");
    band(m.thresholds.red, m.thresholds.amber, "is-amber");
  }

  // ligne cible
  if (m.target != null) {
    svg.appendChild(_svgEl("line", { x1: 0, x2: width, y1: yOf(m.target), y2: yOf(m.target),
      class: "grc-met-target" }));
  }

  // polyline des mesures
  const poly = pts.map((s) => xOf(Date.parse(s.date)).toFixed(1) + "," + yOf(s.value).toFixed(1)).join(" ");
  svg.appendChild(_svgEl("polyline", { points: poly, class: "grc-met-line" }));

  // point final
  const last = pts[pts.length - 1];
  svg.appendChild(_svgEl("circle", { cx: xOf(Date.parse(last.date)), cy: yOf(last.value), r: 3.5,
    class: "grc-met-dot" }));
  return svg;
}

function _metRenderMesures(root, m) {
  const id = m.id;

  if (m.series.length) {
    const scroll = document.createElement("div");
    scroll.className = "grc-met-spark-wrap";
    scroll.appendChild(_metBuildSparkline(m, 480, 90));
    root.appendChild(scroll);
  } else {
    const empty = document.createElement("p");
    empty.className = "grc-sup-warn";
    empty.textContent = grcT("grc.indicateurs.meas.empty");
    root.appendChild(empty);
  }

  const list = grkList(root, "grc.indicateurs.meas.title");
  m.series.slice().reverse().forEach((s) => {
    const row = grkRow();
    row.classList.add("grc-met-meas");
    const dt = document.createElement("input");
    dt.type = "date";
    dt.value = s.date ? s.date.slice(0, 10) : "";
    dt.addEventListener("change", () => { grcMetricUpdateMeasure(id, s.id, { date: dt.value }); grkRefresh(row); });
    row.appendChild(dt);
    const val = document.createElement("input");
    val.type = "number";
    val.step = "any";
    val.value = s.value == null ? "" : s.value;
    val.addEventListener("change", () => { grcMetricUpdateMeasure(id, s.id, { value: val.value }); grkRefresh(row); });
    row.appendChild(val);
    const note = document.createElement("input");
    note.type = "text";
    note.className = "grk-inv-grow";
    note.placeholder = grcT("grc.indicateurs.meas.note");
    note.value = s.note || "";
    note.addEventListener("change", () => grcMetricUpdateMeasure(id, s.id, { note: note.value }));
    row.appendChild(note);
    row.appendChild(grkDelBtn(() => { grcMetricRemoveMeasure(id, s.id); grkRefresh(row); }));
    list.appendChild(row);
  });
  if (!m.series.length) list.appendChild(grkEmptyLine("grc.indicateurs.meas.empty"));

  const nDate = document.createElement("input");
  nDate.type = "date";
  nDate.value = new Date().toISOString().slice(0, 10);
  const nVal = document.createElement("input");
  nVal.type = "number";
  nVal.step = "any";
  nVal.placeholder = grcT("grc.indicateurs.meas.value");
  const nNote = document.createElement("input");
  nNote.type = "text";
  nNote.className = "grk-inv-grow";
  nNote.placeholder = grcT("grc.indicateurs.meas.note");
  const addForm = grkAddForm([nDate, nVal, nNote], (form) => {
    if (nVal.value === "") return;
    grcMetricAddMeasure(id, { date: nDate.value, value: nVal.value, note: nNote.value.trim() });
    grkRefresh(form);
  });
  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "grc-registry-add-btn";
  addBtn.textContent = grcT("grc.indicateurs.meas.add");
  addForm.appendChild(addBtn);
  root.appendChild(addForm);
}

/* ---------- onglet Analyse --------------------------- */

function _metRenderAnalyse(root, m) {
  const rag = grcMetricRagBadge(m);
  const latest = grcMetricLatest(m);
  const trend = grcMetricTrend(m);

  const line = document.createElement("p");
  line.className = "grc-sup-score-line";
  const b = document.createElement("span");
  b.className = "grc-crit-badge " + rag.cls;
  b.textContent = grcT("grc.indicateurs.ana.rag").replace("{value}", rag.text);
  line.appendChild(b);
  root.appendChild(line);

  const dirTxt = grcT("grc.indicateurs.dir." + m.direction);
  const explain = document.createElement("p");
  explain.className = "grk-hint";
  const v = latest && latest.value != null ? latest.value + (m.unit ? " " + m.unit : "") : "";
  const key = {
    green: "grc.indicateurs.ana.explainGreen", amber: "grc.indicateurs.ana.explainAmber",
    red: "grc.indicateurs.ana.explainRed", unknown: "grc.indicateurs.ana.explainUnknown",
  }[rag.rag];
  explain.textContent = grcT(key).replace("{value}", v).replace("{dir}", dirTxt);
  root.appendChild(explain);

  const tr = document.createElement("p");
  tr.textContent = grcT("grc.indicateurs.ana.trend")
    .replace("{arrow}", grcT("grc.indicateurs.trend." + trend.dir))
    .replace("{pct}", trend.pct == null ? "—" : (trend.pct > 0 ? "+" : "") + trend.pct + " %");
  root.appendChild(tr);

  const cnt = document.createElement("p");
  cnt.className = "grk-hint";
  cnt.textContent = grcT("grc.indicateurs.ana.count").replace("{n}", m.series.length);
  root.appendChild(cnt);

  if (m.series.length) {
    const per = document.createElement("p");
    per.className = "grk-hint";
    per.textContent = grcT("grc.indicateurs.ana.period")
      .replace("{from}", (m.series[0].date || "").slice(0, 10))
      .replace("{to}", (m.series[m.series.length - 1].date || "").slice(0, 10));
    root.appendChild(per);
  }

  if (grcMetricMeasurementOverdue(m)) {
    const warn = document.createElement("p");
    warn.className = "grc-sup-warn";
    warn.textContent = grcT("grc.indicateurs.ana.overdueAlert");
    root.appendChild(warn);
  }
}

/* ---------- onglet Export -------------------------- */

function _metRenderExport(root, m) {
  grkExportButtons(root, "grc.indicateurs.export.hint", [
    { i18n: "grc.indicateurs.export.json", fn: () => exportMetricAsJson(m) },
    { i18n: "grc.indicateurs.export.reportWord", fn: () => exportMetricsReportAsWord(getGrcMetrics()) },
    { i18n: "grc.indicateurs.export.defsCsv", fn: () => exportMetricsDefsCsv(getGrcMetrics()) },
    { i18n: "grc.indicateurs.export.seriesCsv", fn: () => exportMetricsSeriesCsv(getGrcMetrics()) },
  ]);
}

/* ---------- montage ------------------------------- */

const GRC_METRIC_TABS = [
  { key: "definition", i18n: "grc.indicateurs.tab.definition", render: _metRenderDefinition },
  { key: "mesures", i18n: "grc.indicateurs.tab.mesures", render: _metRenderMesures },
  { key: "analyse", i18n: "grc.indicateurs.tab.analyse", render: _metRenderAnalyse },
  { key: "export", i18n: "grc.indicateurs.tab.export", render: _metRenderExport },
];

function renderMetricPanel(container, metric) {
  grkPanel(container, metric, {
    idAttr: "data-metric-id", tabs: GRC_METRIC_TABS,
    ensure: grcMetricEnsureShape, store: _grcMetricsStore,
  });
}
