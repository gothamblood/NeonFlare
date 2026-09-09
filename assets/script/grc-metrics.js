/* Registre d'indicateurs (KPI / KRI) + séries de mesures.
   Bâti sur grc-registry-kit.js (grk*). Voir spec/grc-registry-upgrades/
   60-indicateurs.md.

   Store /grc/metrics/registry. Aligné ISO/IEC 27001 clause 9.1
   (mesurage), NIST CSF GV.OV / GV.RM. Une métrique = définition (type,
   unité, cadence, cible + seuils, direction) + une série temporelle de
   mesures. Statut RAG (vert / ambre / rouge / inconnu) calculé par
   rapport aux seuils. Tout le texte affiché passe par grcT().

   État (60-indicateurs.md §6) :
   - T1 : store + modèle + dérivés RAG/tendance/overdue + dashboard.  <-- ICI
   - T2 : registre (en-tête RAG) + encart tableau de bord + montage.
   - T3..T6 : panneau (Définition / Mesures sparkline / Analyse) + exports.
   - T7 : Settings.  T8 : CSS.  T9 : tests. */

const GRC_METRICS_KEY = "/grc/metrics/registry";

const GRC_METRIC_TYPES = ["kpi", "kri"];
const GRC_METRIC_DIRECTIONS = ["higher-better", "lower-better"];
const GRC_METRIC_DEFAULT_CADENCE = 1;

/* ---------- descripteur grkEnsure (schema 1) ---------------- */

const GRC_METRIC_MEASURE_SCHEMA = {
  id: { type: "string" },
  date: { type: "iso" },
  value: { type: "number", default: null },
  note: { type: "string" },
};

const GRC_METRIC_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  name: { type: "string" },
  type: { type: "string", enum: GRC_METRIC_TYPES, default: "kpi" },
  unit: { type: "string" },
  owner: { type: "string" },
  source: { type: "string" },
  cadenceMonths: { type: "number", default: GRC_METRIC_DEFAULT_CADENCE },
  direction: { type: "string", enum: GRC_METRIC_DIRECTIONS, default: "higher-better" },
  target: { type: "number", default: null },
  thresholds: {
    type: "object", of: {
      amber: { type: "number", default: null },
      red: { type: "number", default: null },
    },
  },
  linkedRisk: { type: "string" },
  formulaNote: { type: "string" },
  series: { type: "array", of: GRC_METRIC_MEASURE_SCHEMA },
};

function grcMetricEnsureShape(metric) {
  const m = grkEnsure(metric, GRC_METRIC_SCHEMA);
  m.id = metric && typeof metric.id === "string" ? metric.id : (m.id || "");
  m.series.sort((a, b) => Date.parse(a.date || 0) - Date.parse(b.date || 0));
  return m;
}

/* ---------- store ----------------------------------------- */

const _grcMetricsStore = grkStore(GRC_METRICS_KEY);

function getGrcMetrics() { return _grcMetricsStore.get(); }
function saveGrcMetrics(list) { _grcMetricsStore.save(list); }
function resetGrcMetrics() { _grcMetricsStore.remove(); }

function addGrcMetric(metric) {
  const list = getGrcMetrics();
  const shaped = grcMetricEnsureShape(metric || {});
  shaped.id = grkId("metric");
  list.push(shaped);
  saveGrcMetrics(list);
  return shaped.id;
}

function updateGrcMetric(id, changes) {
  const list = getGrcMetrics();
  const idx = list.findIndex((m) => m && m.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveGrcMetrics(list);
}

function removeGrcMetric(id) {
  saveGrcMetrics(getGrcMetrics().filter((m) => m && m.id !== id));
}

function metricMutate(id, fn) {
  return grkMutate(_grcMetricsStore, id, grcMetricEnsureShape, fn);
}

/* ---------- définition ----------------------------------- */

function grcMetricSetDefinition(id, changes) {
  return metricMutate(id, (m) => {
    ["name", "unit", "owner", "source", "linkedRisk", "formulaNote"].forEach((k) => {
      if (k in changes && typeof changes[k] === "string") m[k] = changes[k].trim();
    });
    if ("type" in changes && GRC_METRIC_TYPES.indexOf(changes.type) !== -1) m.type = changes.type;
    if ("direction" in changes && GRC_METRIC_DIRECTIONS.indexOf(changes.direction) !== -1) m.direction = changes.direction;
    if ("target" in changes) m.target = _grcMetricNum(changes.target);
    if ("amber" in changes) m.thresholds.amber = _grcMetricNum(changes.amber);
    if ("red" in changes) m.thresholds.red = _grcMetricNum(changes.red);
    if ("cadenceMonths" in changes) {
      const n = Math.round(Number(changes.cadenceMonths));
      if (Number.isFinite(n) && n > 0) m.cadenceMonths = n;
    }
    return true;
  });
}

function _grcMetricNum(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ---------- mesures ------------------------------------- */

function grcMetricAddMeasure(id, measure) {
  return metricMutate(id, (m) => {
    const s = grkEnsure(measure || {}, GRC_METRIC_MEASURE_SCHEMA);
    s.id = grkId("mm");
    if (!s.date) s.date = new Date().toISOString();
    s.value = _grcMetricNum(measure && measure.value);
    m.series.push(s);
    m.series.sort((a, b) => Date.parse(a.date || 0) - Date.parse(b.date || 0));
    return s.id;
  });
}

function grcMetricUpdateMeasure(id, measureId, changes) {
  return metricMutate(id, (m) => {
    const s = m.series.find((x) => x.id === measureId);
    if (!s) return false;
    if ("value" in changes) s.value = _grcMetricNum(changes.value);
    if ("note" in changes && typeof changes.note === "string") s.note = changes.note;
    if ("date" in changes) s.date = grkToIso(changes.date) || s.date;
    m.series.sort((a, b) => Date.parse(a.date || 0) - Date.parse(b.date || 0));
    return true;
  });
}

function grcMetricRemoveMeasure(id, measureId) {
  return metricMutate(id, (m) => {
    const before = m.series.length;
    m.series = m.series.filter((x) => x.id !== measureId);
    return m.series.length < before;
  });
}

/* ---------- dérivés ----------------------------------- */

function grcMetricLatest(metric) {
  const s = (metric && metric.series) || [];
  return s.length ? s[s.length - 1] : null;
}

function grcMetricPrevious(metric) {
  const s = (metric && metric.series) || [];
  return s.length >= 2 ? s[s.length - 2] : null;
}

// green | amber | red | unknown -- compare latest.value aux seuils selon direction.
function grcMetricRag(metric) {
  const latest = grcMetricLatest(metric);
  const th = metric && metric.thresholds ? metric.thresholds : {};
  if (!latest || latest.value == null || (th.amber == null && th.red == null)) return "unknown";
  const v = latest.value;
  if (metric.direction === "lower-better") {
    if (th.red != null && v >= th.red) return "red";
    if (th.amber != null && v >= th.amber) return "amber";
    return "green";
  }
  // higher-better
  if (th.red != null && v <= th.red) return "red";
  if (th.amber != null && v <= th.amber) return "amber";
  return "green";
}

function grcMetricRagBadge(metric) {
  const rag = grcMetricRag(metric);
  const cls = rag === "green" ? "low" : (rag === "amber" ? "medium" : (rag === "red" ? "high" : "info"));
  return { rag: rag, cls: cls, text: grcT("grc.indicateurs.rag." + rag) };
}

function grcMetricTrend(metric) {
  const latest = grcMetricLatest(metric);
  const prev = grcMetricPrevious(metric);
  if (!latest || !prev || latest.value == null || prev.value == null) return { dir: "flat", pct: null };
  const diff = latest.value - prev.value;
  const pct = prev.value !== 0 ? Math.round(diff / Math.abs(prev.value) * 1000) / 10 : null;
  if (diff > 0) return { dir: "up", pct: pct };
  if (diff < 0) return { dir: "down", pct: pct };
  return { dir: "flat", pct: 0 };
}

function grcMetricMeasurementOverdue(metric) {
  const latest = grcMetricLatest(metric);
  if (!latest || !latest.date) return true;
  const due = grkAddMonths(latest.date, (metric && metric.cadenceMonths) || GRC_METRIC_DEFAULT_CADENCE);
  const t = due ? Date.parse(due) : NaN;
  return isNaN(t) ? true : t < Date.now();
}

function grcMetricsDashboard(list) {
  const arr = (Array.isArray(list) ? list : []).map(grcMetricEnsureShape);
  const byRag = { green: 0, amber: 0, red: 0, unknown: 0 };
  const overdue = [];
  const topRedKri = [];
  arr.forEach((m) => {
    const rag = grcMetricRag(m);
    byRag[rag] = (byRag[rag] || 0) + 1;
    if (grcMetricMeasurementOverdue(m)) overdue.push(m.name || m.id);
    if (rag === "red" && m.type === "kri") topRedKri.push(m.name || m.id);
  });
  return { byRag: byRag, overdue: overdue, topRedKri: topRedKri.slice(0, 3),
    total: arr.length };
}

/* ---------- import ----------------------------------- */

async function importGrcMetricsFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  if (Array.isArray(decoded)) {
    saveGrcMetrics(decoded);
    return;
  }
  const isShape = decoded && typeof decoded === "object" &&
    typeof decoded.id === "string" && typeof decoded.name === "string";
  if (!isShape) throw new Error(grcT("grc.indicateurs.invalidImport"));

  const list = getGrcMetrics();
  const idx = list.findIndex((m) => m && m.id === decoded.id);
  if (idx === -1) list.push(decoded);
  else list[idx] = decoded;
  saveGrcMetrics(list);
}

/* ================================================================== *
 *  Registre -- liste + formulaire + encart tableau de bord (grkRegistry, T2).
 *  Monté par grc/indicateurs.html (#grcMetricsRegistry / #grcMetricsSummary).
 *  Panneau : renderMetricPanel (grc-metrics-panel.js, T3+).
 * ================================================================== */

function _metEnumOptions(values, prefix) {
  return values.map((v) => ({ value: v, label: prefix + v }));
}

function initGrcMetricsRegistry() {
  const init = grkRegistry({
    mount: "#grcMetricsRegistry",
    summary: "#grcMetricsSummary",
    store: _grcMetricsStore,
    schema: GRC_METRIC_SCHEMA,
    idAttr: "data-metric-id",
    listGlobal: "renderGrcMetricsList",
    deepLink: true,
    i18n: {
      add: "grc.indicateurs.form.addBtn",
      titleAdd: "grc.indicateurs.form.title",
      titleEdit: "grc.indicateurs.form.titleEdit",
    },
    form: [
      { id: "name", label: "grc.indicateurs.form.name", type: "text", required: true },
      { id: "type", label: "grc.indicateurs.form.type", type: "select",
        options: _metEnumOptions(GRC_METRIC_TYPES, "grc.indicateurs.mt.") },
      { id: "unit", label: "grc.indicateurs.form.unit", type: "text" },
      { id: "owner", label: "grc.indicateurs.form.owner", type: "text" },
    ],
    readForm: (m) => ({ name: m.name, type: m.type, unit: m.unit, owner: m.owner }),
    submit: (v, editingId) => {
      const fields = {
        name: (v.name || "").trim(), type: v.type,
        unit: (v.unit || "").trim(), owner: (v.owner || "").trim(),
      };
      if (editingId) grcMetricSetDefinition(editingId, fields);
      else addGrcMetric(fields);
    },
    header: (m) => {
      const rag = grcMetricRagBadge(m);
      const latest = grcMetricLatest(m);
      const trend = grcMetricTrend(m);
      const cells = [{ text: m.name || "" }];
      const b = document.createElement("span");
      b.className = "grc-crit-badge " + rag.cls;
      b.textContent = rag.text;
      cells.push(b);
      if (latest && latest.value != null) {
        cells.push({ text: grcT("grc.indicateurs.detail.latest")
          .replace("{value}", latest.value).replace("{unit}", m.unit || "").trim() +
          " " + grcT("grc.indicateurs.trend." + trend.dir) });
      }
      if (grcMetricMeasurementOverdue(m)) {
        const o = document.createElement("span");
        o.className = "grc-sup-mini-badge grc-sup-badge-review";
        o.textContent = grcT("grc.indicateurs.badge.overdue");
        cells.push(o);
      }
      return cells;
    },
    panel: typeof renderMetricPanel === "function" ? renderMetricPanel : null,
    summarise: (list) => {
      const d = grcMetricsDashboard(list);
      if (!d.total) return { chips: [grcT("grc.indicateurs.summary.none")] };
      const ragStr = "V " + d.byRag.green + " · A " + d.byRag.amber +
        " · R " + d.byRag.red + " · ? " + d.byRag.unknown;
      const chips = [
        grcT("grc.indicateurs.summary.rag").replace("{value}", ragStr),
        grcT("grc.indicateurs.summary.overdue").replace("{n}", d.overdue.length),
      ];
      const gaps = d.topRedKri.length
        ? grcT("grc.indicateurs.summary.redKri").replace("{value}", d.topRedKri.join(" · "))
        : null;
      return { chips: chips, gaps: gaps };
    },
    importFn: importGrcMetricsFromJson,
    confirmName: (m) => m.name || "",
  });
  init();
}

/* ================================================================== *
 *  Exports (T6) -- via le kit (grkExport*). Rapport périodique (Word),
 *  CSV définitions, CSV séries, JSON. Aucune requête réseau.
 * ================================================================== */

const GRC_METRIC_REPORT_LAST_N = 6;

function metricsReportBody(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcMetricEnsureShape);
  const L = (k) => grcT(k);
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = grkAuthorName();

  let h = "<h1>" + L("grc.indicateurs.report.title") + "</h1>";
  h += "<p><strong>" + L("grc.indicateurs.report.generatedOn") + " :</strong> " +
    grkEscapeHtml(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.indicateurs.report.by") + " :</strong> " + grkEscapeHtml(author);
  h += "</p>";
  if (!arr.length) { h += "<p><em>" + L("grc.indicateurs.report.none") + "</em></p>"; return h; }

  arr.forEach((m) => {
    const rag = grcMetricRagBadge(m);
    const latest = grcMetricLatest(m);
    h += "<h2>" + grkEscapeHtml(m.name || "—") + " — " + grkEscapeHtml(rag.text) + "</h2>";
    h += "<table><tbody>" +
      "<tr><th>" + L("grc.indicateurs.form.type") + "</th><td>" + grkEscapeHtml(L("grc.indicateurs.mt." + m.type)) + "</td></tr>" +
      "<tr><th>" + L("grc.indicateurs.form.unit") + "</th><td>" + grkEscapeHtml(m.unit) + "</td></tr>" +
      "<tr><th>" + L("grc.indicateurs.def.direction") + "</th><td>" + grkEscapeHtml(L("grc.indicateurs.dir." + m.direction)) + "</td></tr>" +
      "<tr><th>" + L("grc.indicateurs.def.target") + "</th><td>" + grkEscapeHtml(m.target == null ? "—" : m.target) + "</td></tr>" +
      "<tr><th>" + L("grc.indicateurs.def.amber") + " / " + L("grc.indicateurs.def.red") + "</th><td>" +
        grkEscapeHtml((m.thresholds.amber == null ? "—" : m.thresholds.amber) + " / " + (m.thresholds.red == null ? "—" : m.thresholds.red)) + "</td></tr>" +
      "<tr><th>" + L("grc.indicateurs.meas.value") + " (" + L("grc.indicateurs.meas.date") + ")</th><td>" +
        grkEscapeHtml(latest && latest.value != null ? latest.value + " (" + (latest.date || "").slice(0, 10) + ")" : "—") +
        (grcMetricMeasurementOverdue(m) ? " ⚠" : "") + "</td></tr>" +
      "<tr><th>" + L("grc.indicateurs.def.formulaNote") + "</th><td>" + grkEscapeHtml(m.formulaNote) + "</td></tr>" +
      "</tbody></table>";

    const recent = m.series.slice(-GRC_METRIC_REPORT_LAST_N);
    if (recent.length) {
      h += "<table><thead><tr><th>" + L("grc.indicateurs.meas.date") + "</th><th>" +
        L("grc.indicateurs.meas.value") + "</th><th>" + L("grc.indicateurs.meas.note") + "</th></tr></thead><tbody>";
      recent.forEach((s) => {
        h += "<tr><td>" + grkEscapeHtml((s.date || "").slice(0, 10)) +
          "</td><td>" + grkEscapeHtml(s.value == null ? "—" : s.value) +
          "</td><td>" + grkEscapeHtml(s.note) + "</td></tr>";
      });
      h += "</tbody></table>";
    }
  });
  return h;
}

function exportMetricAsJson(scope) {
  const name = Array.isArray(scope)
    ? "indicateurs-" + grkDateStamp() + ".json"
    : "indicateur-" + grkSlug(scope && scope.name, "indicateur") + "-" + grkDateStamp() + ".json";
  return grkExportJson(scope, name);
}

function exportMetricsReportAsWord(list) {
  grkExportWord(metricsReportBody(list), "indicateurs-rapport-" + grkDateStamp() + ".doc",
    grcT("grc.indicateurs.report.title"));
}

function exportMetricsDefsCsv(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcMetricEnsureShape);
  const rows = [["name", "type", "unit", "target", "latest_value", "latest_date", "rag", "overdue"]];
  arr.forEach((m) => {
    const latest = grcMetricLatest(m);
    rows.push([
      m.name, m.type, m.unit, m.target == null ? "" : m.target,
      latest && latest.value != null ? latest.value : "",
      latest && latest.date ? latest.date.slice(0, 10) : "",
      grcMetricRag(m),
      grcMetricMeasurementOverdue(m) ? "1" : "0",
    ]);
  });
  grkExportCsv(rows, "indicateurs-definitions-" + grkDateStamp() + ".csv");
}

function exportMetricsSeriesCsv(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcMetricEnsureShape);
  const rows = [["metric", "date", "value"]];
  arr.forEach((m) => {
    m.series.forEach((s) => {
      rows.push([m.name, s.date ? s.date.slice(0, 10) : "", s.value == null ? "" : s.value]);
    });
  });
  grkExportCsv(rows, "indicateurs-series-" + grkDateStamp() + ".csv");
}
