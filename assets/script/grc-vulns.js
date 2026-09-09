/* Suivi des vulnérabilités / remédiations -- store + modèle + dérivés.
   Bâti sur grc-registry-kit.js (grk*). Voir spec/grc-registry-upgrades/
   20-vulnerabilites.md.

   Store /grc/vulns/registry. Aligné ISO/IEC 27001 A.8.8, NIST CSF
   ID.RA / PR.PS, CIS 7. Cycle de vie de bout en bout, SLA déduit de la
   sévérité CVSS, timeline des changements d'état. Tout le texte affiché
   passe par grcT() ; les enums GRC_VULN_* restent des clés internes.

   État (20-vulnerabilites.md §6) :
   - T1 : store + modèle + SLA + dérivés + import.       <-- ICI
   - T2 : grkRegistry (liste + encart barres par sévérité).
   - T3..T6 : panneau (Fiche/Traitement/Actifs/Timeline/Liens) + exports.
   - T7 : Settings.  T8 : CSS.  T9 : tests. */

const GRC_VULNS_KEY = "/grc/vulns/registry";

const GRC_VULN_SOURCES = ["scan", "pentest", "vendor", "report", "bugbounty"];
const GRC_VULN_SEVERITIES = ["critique", "elevee", "moyenne", "basse", "info"];
const GRC_VULN_STATUSES = ["new", "triaged", "remediating", "verifying",
  "closed", "accepted", "false-positive", "wontfix"];
const GRC_VULN_EVENT_KINDS = ["created", "status", "note", "evidence", "retest"];
const GRC_VULN_OPEN_STATUSES = ["new", "triaged", "remediating", "verifying"];

// SLA en jours par sévérité (info : pas de SLA).
const GRC_VULN_SLA_DAYS = { critique: 7, elevee: 30, moyenne: 90, basse: 180, info: null };

/* ---------- sévérité <- CVSS ------------------------------------- */

function grcVulnSeverityFromCvss(score) {
  const n = Number(score);
  if (!Number.isFinite(n) || n <= 0) return "info";
  if (n >= 9.0) return "critique";
  if (n >= 7.0) return "elevee";
  if (n >= 4.0) return "moyenne";
  return "basse";
}

// Badge : classe sur l'échelle .grc-crit-badge (+ .info) ; libellé i18n.
function grcVulnSeverityBadge(sev) {
  const s = GRC_VULN_SEVERITIES.indexOf(sev) !== -1 ? sev : "info";
  const clsMap = { critique: "high", elevee: "high", moyenne: "medium", basse: "low", info: "info" };
  return { sev: s, cls: clsMap[s], text: grcT("grc.vulnerabilites.sev." + s) };
}

/* ---------- descripteur grkEnsure (schema 1) -------------------- */

const GRC_VULN_ASSET_SCHEMA = {
  id: { type: "string" },
  ref: { type: "string" },
  note: { type: "string" },
};

const GRC_VULN_EVENT_SCHEMA = {
  id: { type: "string" },
  ts: { type: "iso" },
  kind: { type: "string", enum: GRC_VULN_EVENT_KINDS, default: "note" },
  from: { type: "string" },
  to: { type: "string" },
  text: { type: "string" },
  actor: { type: "string" },
};

const GRC_VULN_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  title: { type: "string" },
  source: { type: "string", enum: GRC_VULN_SOURCES, default: "scan" },
  cve: { type: "string" },
  cvssScore: { type: "number", default: null },
  cvssVector: { type: "string" },
  severity: { type: "string", enum: GRC_VULN_SEVERITIES, default: "info" },
  severityOverridden: { type: "bool", default: false },
  status: { type: "string", enum: GRC_VULN_STATUSES, default: "new" },
  discoveredAt: { type: "iso" },
  dueAt: { type: "iso" },
  owner: { type: "string" },
  remediation: { type: "string" },
  workaround: { type: "string" },
  affectedAssets: { type: "array", of: GRC_VULN_ASSET_SCHEMA },
  linkedIncident: { type: "string" },
  linkedRisk: { type: "string" },
  timeline: { type: "array", of: GRC_VULN_EVENT_SCHEMA },
  acceptance: {
    type: "object", of: {
      by: { type: "string" },
      at: { type: "iso" },
      reason: { type: "string" },
      expiresAt: { type: "iso" },
    },
  },
};

// dueAt = discoveredAt + SLA(severity). null si pas de date ou sévérité info.
function grcVulnComputeDueAt(discoveredAt, severity) {
  const days = GRC_VULN_SLA_DAYS[severity];
  if (!discoveredAt || days == null) return null;
  const t = Date.parse(discoveredAt);
  if (isNaN(t)) return null;
  return new Date(t + days * 86400000).toISOString();
}

function grcVulnEnsureShape(vuln) {
  const v = grkEnsure(vuln, GRC_VULN_SCHEMA);
  v.id = vuln && typeof vuln.id === "string" ? vuln.id : (v.id || "");
  // sévérité : dérivée du CVSS sauf si override explicite
  if (!v.severityOverridden) {
    v.severity = grcVulnSeverityFromCvss(v.cvssScore);
  }
  // dueAt : recalculé si absent
  if (v.discoveredAt && !v.dueAt) {
    v.dueAt = grcVulnComputeDueAt(v.discoveredAt, v.severity);
  }
  v.timeline.sort((a, b) => Date.parse(a.ts || 0) - Date.parse(b.ts || 0));
  return v;
}

/* ---------- store --------------------------------------------- */

const _grcVulnStore = grkStore(GRC_VULNS_KEY);

function getGrcVulns() { return _grcVulnStore.get(); }
function saveGrcVulns(list) { _grcVulnStore.save(list); }
function resetGrcVulns() { _grcVulnStore.remove(); }

function addGrcVuln(vuln) {
  const list = getGrcVulns();
  const shaped = grcVulnEnsureShape(vuln || {});
  shaped.id = grkId("vuln");
  if (!shaped.discoveredAt) shaped.discoveredAt = new Date().toISOString();
  shaped.dueAt = grcVulnComputeDueAt(shaped.discoveredAt, shaped.severity);
  shaped.timeline.push({
    id: grkId("ev"), ts: shaped.discoveredAt, kind: "created",
    from: "", to: shaped.status, text: "", actor: grkAuthorName(),
  });
  list.push(shaped);
  saveGrcVulns(list);
  return shaped.id;
}

function updateGrcVuln(id, changes) {
  const list = getGrcVulns();
  const idx = list.findIndex((v) => v && v.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveGrcVulns(list);
}

function removeGrcVuln(id) {
  saveGrcVulns(getGrcVulns().filter((v) => v && v.id !== id));
}

function vulnMutate(id, fn) {
  return grkMutate(_grcVulnStore, id, grcVulnEnsureShape, fn);
}

/* ---------- sous-objets : cœur / traitement / acceptation ----- */

function grcVulnSetCore(id, changes) {
  return vulnMutate(id, (v) => {
    ["title", "cve", "cvssVector", "owner"].forEach((k) => {
      if (k in changes && typeof changes[k] === "string") v[k] = changes[k].trim();
    });
    if ("source" in changes && GRC_VULN_SOURCES.indexOf(changes.source) !== -1) v.source = changes.source;
    if ("cvssScore" in changes) {
      const n = Number(changes.cvssScore);
      v.cvssScore = changes.cvssScore === "" || changes.cvssScore == null || isNaN(n)
        ? null : Math.max(0, Math.min(10, n));
      if (!v.severityOverridden) {
        v.severity = grcVulnSeverityFromCvss(v.cvssScore);
        v.dueAt = grcVulnComputeDueAt(v.discoveredAt, v.severity);
      }
    }
    if ("severity" in changes && GRC_VULN_SEVERITIES.indexOf(changes.severity) !== -1) {
      v.severity = changes.severity;
      v.severityOverridden = true;
      v.dueAt = grcVulnComputeDueAt(v.discoveredAt, v.severity);
    }
    if ("severityOverridden" in changes && !changes.severityOverridden) {
      v.severityOverridden = false;
      v.severity = grcVulnSeverityFromCvss(v.cvssScore);
      v.dueAt = grcVulnComputeDueAt(v.discoveredAt, v.severity);
    }
    if ("discoveredAt" in changes) {
      v.discoveredAt = grkToIso(changes.discoveredAt);
      v.dueAt = grcVulnComputeDueAt(v.discoveredAt, v.severity);
    }
    return true;
  });
}

// Changement de statut -> pousse un événement `status` daté dans la timeline.
function grcVulnSetStatus(id, status, actor) {
  if (GRC_VULN_STATUSES.indexOf(status) === -1) return null;
  return vulnMutate(id, (v) => {
    if (v.status === status) return false;
    const from = v.status;
    v.status = status;
    v.timeline.push({
      id: grkId("ev"), ts: new Date().toISOString(), kind: "status",
      from: from, to: status, text: "", actor: actor || grkAuthorName(),
    });
    return true;
  });
}

function grcVulnSetTreatment(id, changes) {
  return vulnMutate(id, (v) => {
    ["remediation", "workaround"].forEach((k) => {
      if (k in changes && typeof changes[k] === "string") v[k] = changes[k];
    });
    if ("dueAt" in changes) v.dueAt = grkToIso(changes.dueAt);
    return true;
  });
}

function grcVulnSetLinks(id, changes) {
  return vulnMutate(id, (v) => {
    if ("linkedIncident" in changes && typeof changes.linkedIncident === "string") v.linkedIncident = changes.linkedIncident.trim();
    if ("linkedRisk" in changes && typeof changes.linkedRisk === "string") v.linkedRisk = changes.linkedRisk.trim();
    return true;
  });
}

function grcVulnSetAcceptance(id, changes) {
  return vulnMutate(id, (v) => {
    const a = v.acceptance;
    if ("by" in changes && typeof changes.by === "string") a.by = changes.by.trim();
    if ("reason" in changes && typeof changes.reason === "string") a.reason = changes.reason;
    if ("at" in changes) a.at = grkToIso(changes.at);
    if ("expiresAt" in changes) a.expiresAt = grkToIso(changes.expiresAt);
    return true;
  });
}

/* ---------- sous-listes : actifs touchés + timeline ----------- */

function grcVulnAddAsset(id, asset) {
  return vulnMutate(id, (v) => {
    const a = grkEnsure(asset || {}, GRC_VULN_ASSET_SCHEMA);
    a.id = grkId("va");
    v.affectedAssets.push(a);
    return a.id;
  });
}

function grcVulnUpdateAsset(id, assetId, changes) {
  return vulnMutate(id, (v) => {
    const a = v.affectedAssets.find((x) => x.id === assetId);
    if (!a) return false;
    Object.assign(a, changes);
    return true;
  });
}

function grcVulnRemoveAsset(id, assetId) {
  return vulnMutate(id, (v) => {
    const before = v.affectedAssets.length;
    v.affectedAssets = v.affectedAssets.filter((x) => x.id !== assetId);
    return v.affectedAssets.length < before;
  });
}

function grcVulnAddEvent(id, ev) {
  return vulnMutate(id, (v) => {
    const e = grkEnsure(ev || {}, GRC_VULN_EVENT_SCHEMA);
    e.id = grkId("ev");
    if (!e.ts) e.ts = new Date().toISOString();
    if (!e.actor) e.actor = grkAuthorName();
    v.timeline.push(e);
    v.timeline.sort((a, b) => Date.parse(a.ts || 0) - Date.parse(b.ts || 0));
    return e.id;
  });
}

function grcVulnUpdateEvent(id, evId, changes) {
  return vulnMutate(id, (v) => {
    const e = v.timeline.find((x) => x.id === evId);
    if (!e) return false;
    const n = Object.assign({}, changes);
    if ("kind" in n && GRC_VULN_EVENT_KINDS.indexOf(n.kind) === -1) delete n.kind;
    if ("ts" in n) n.ts = grkToIso(n.ts) || e.ts;
    Object.assign(e, n);
    v.timeline.sort((a, b) => Date.parse(a.ts || 0) - Date.parse(b.ts || 0));
    return true;
  });
}

function grcVulnRemoveEvent(id, evId) {
  return vulnMutate(id, (v) => {
    const before = v.timeline.length;
    v.timeline = v.timeline.filter((x) => x.id !== evId);
    return v.timeline.length < before;
  });
}

/* ---------- dérivés ------------------------------------------- */

function grcVulnIsOpen(vuln) {
  return GRC_VULN_OPEN_STATUSES.indexOf(vuln && vuln.status) !== -1;
}

// SLA dépassé : vuln ouverte + dueAt passé.
function grcVulnSlaBreached(vuln) {
  if (!vuln || !grcVulnIsOpen(vuln) || !vuln.dueAt) return false;
  const t = Date.parse(vuln.dueAt);
  return !isNaN(t) && t < Date.now();
}

function grcVulnAcceptanceExpired(vuln) {
  if (!vuln || vuln.status !== "accepted") return false;
  const e = vuln.acceptance && vuln.acceptance.expiresAt;
  if (!e) return false;
  const t = Date.parse(e);
  return !isNaN(t) && t < Date.now();
}

function grcVulnsOpenBySeverity(list) {
  const out = { critique: 0, elevee: 0, moyenne: 0, basse: 0, info: 0 };
  (Array.isArray(list) ? list : []).map(grcVulnEnsureShape).forEach((v) => {
    if (grcVulnIsOpen(v)) out[v.severity] = (out[v.severity] || 0) + 1;
  });
  return out;
}

// MTTR : délai moyen (jours) discoveredAt -> dernier passage à un statut
// terminal, pour les vulns closes dans les `sinceDays` derniers jours.
function grcVulnsMttr(list, sinceDays) {
  const win = sinceDays == null ? 90 : sinceDays;
  const cutoff = Date.now() - win * 86400000;
  const durations = [];
  (Array.isArray(list) ? list : []).map(grcVulnEnsureShape).forEach((v) => {
    if (v.status !== "closed") return;
    const closedEv = v.timeline.slice().reverse()
      .find((e) => e.kind === "status" && e.to === "closed");
    const closedTs = closedEv ? Date.parse(closedEv.ts) : NaN;
    const startTs = Date.parse(v.discoveredAt);
    if (isNaN(closedTs) || isNaN(startTs) || closedTs < cutoff) return;
    durations.push((closedTs - startTs) / 86400000);
  });
  if (!durations.length) return null;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 10) / 10;
}

function grcVulnsAcceptedCount(list) {
  return (Array.isArray(list) ? list : []).filter((v) => v && v.status === "accepted").length;
}

function grcVulnsSummary(list) {
  const arr = Array.isArray(list) ? list.map(grcVulnEnsureShape) : [];
  return {
    total: arr.length,
    openBySeverity: grcVulnsOpenBySeverity(arr),
    slaBreached: arr.filter(grcVulnSlaBreached).length,
    mttr: grcVulnsMttr(arr, 90),
    accepted: grcVulnsAcceptedCount(arr),
    acceptedExpired: arr.filter(grcVulnAcceptanceExpired).length,
  };
}

/* ---------- import (tableau OU objet vuln unique) ------------- */

async function importGrcVulnsFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  if (Array.isArray(decoded)) {
    saveGrcVulns(decoded);
    return;
  }
  const isShape = decoded && typeof decoded === "object" &&
    typeof decoded.id === "string" && typeof decoded.title === "string";
  if (!isShape) throw new Error(grcT("grc.vulnerabilites.invalidImport"));

  const list = getGrcVulns();
  const idx = list.findIndex((v) => v && v.id === decoded.id);
  if (idx === -1) list.push(decoded);
  else list[idx] = decoded;
  saveGrcVulns(list);
}

/* ================================================================== *
 *  Registre -- liste + formulaire + encart (grkRegistry, T2).
 *  Monté par grc/vulnerabilites.html (#grcVulnsRegistry /
 *  #grcVulnsSummary). Panneau : renderVulnPanel (grc-vulns-panel.js).
 * ================================================================== */

function _vulnEnumOptions(values, i18nPrefix) {
  return values.map((v) => ({ value: v, label: i18nPrefix + v }));
}

function _vulnMiniBadge(cls, i18nKey) {
  const el = document.createElement("span");
  el.className = "grc-sup-mini-badge " + cls;
  el.textContent = grcT(i18nKey);
  return el;
}

function initGrcVulnsRegistry() {
  const init = grkRegistry({
    mount: "#grcVulnsRegistry",
    summary: "#grcVulnsSummary",
    store: _grcVulnStore,
    schema: GRC_VULN_SCHEMA,
    idAttr: "data-vuln-id",
    listGlobal: "renderGrcVulnsList",
    deepLink: true,
    i18n: {
      add: "grc.vulnerabilites.form.addBtn",
      titleAdd: "grc.vulnerabilites.form.title",
      titleEdit: "grc.vulnerabilites.form.titleEdit",
    },
    form: [
      { id: "title", label: "grc.vulnerabilites.form.name", type: "text", required: true },
      { id: "source", label: "grc.vulnerabilites.form.source", type: "select",
        options: _vulnEnumOptions(GRC_VULN_SOURCES, "grc.vulnerabilites.src.") },
      { id: "cve", label: "grc.vulnerabilites.form.cve", type: "text" },
      { id: "cvssScore", label: "grc.vulnerabilites.form.cvssScore", type: "text" },
      { id: "owner", label: "grc.vulnerabilites.form.owner", type: "text" },
    ],
    readForm: (v) => ({
      title: v.title, source: v.source, cve: v.cve,
      cvssScore: v.cvssScore == null ? "" : v.cvssScore, owner: v.owner,
    }),
    submit: (vals, editingId) => {
      const fields = {
        title: (vals.title || "").trim(), source: vals.source,
        cve: (vals.cve || "").trim(), owner: (vals.owner || "").trim(),
      };
      if (editingId) {
        updateGrcVuln(editingId, fields);
        grcVulnSetCore(editingId, { cvssScore: vals.cvssScore });
      } else {
        const n = Number(vals.cvssScore);
        addGrcVuln(Object.assign(fields, {
          cvssScore: vals.cvssScore === "" || isNaN(n) ? null : n,
        }));
      }
    },
    header: (v) => {
      const sev = grcVulnSeverityBadge(v.severity);
      const sevBadge = document.createElement("span");
      sevBadge.className = "grc-crit-badge " + sev.cls;
      sevBadge.textContent = sev.text;
      const cells = [
        { text: v.title || "" },
        sevBadge,
        { text: grcT("grc.vulnerabilites.st." + v.status) },
      ];
      if (grcVulnSlaBreached(v)) cells.push(_vulnMiniBadge("grc-sup-badge-expired", "grc.vulnerabilites.badge.sla"));
      if (grcVulnAcceptanceExpired(v)) cells.push(_vulnMiniBadge("grc-sup-badge-review", "grc.vulnerabilites.badge.acceptExpired"));
      return cells;
    },
    panel: typeof renderVulnPanel === "function" ? renderVulnPanel : null,
    summarise: (list) => {
      const sm = grcVulnsSummary(list);
      if (!sm.total) return { chips: [grcT("grc.vulnerabilites.summary.none")] };
      const o = sm.openBySeverity;
      const openStr = "C " + o.critique + " · É " + o.elevee + " · M " + o.moyenne +
        " · B " + o.basse + " · I " + o.info;
      const chips = [
        grcT("grc.vulnerabilites.summary.open").replace("{value}", openStr),
        grcT("grc.vulnerabilites.summary.sla").replace("{n}", sm.slaBreached),
        grcT("grc.vulnerabilites.summary.accepted").replace("{n}", sm.accepted),
      ];
      if (sm.mttr != null) chips.push(grcT("grc.vulnerabilites.summary.mttr").replace("{v}", sm.mttr));
      return { chips: chips };
    },
    importFn: importGrcVulnsFromJson,
    confirmName: (v) => v.title || "",
  });
  init();
}

/* ================================================================== *
 *  Exports (T6) -- via le kit (grkExport*). Rapport trié par sévérité
 *  décroissante. Aucune annexe JSON brute, aucune requête réseau.
 * ================================================================== */

const _GRC_VULN_SEV_RANK = { critique: 0, elevee: 1, moyenne: 2, basse: 3, info: 4 };

function _vulnRow(rows) {
  return "<table><tbody>" + rows.map((r) =>
    "<tr><th>" + grkEscapeHtml(r[0]) + "</th><td>" + grkEscapeHtml(r[1]) + "</td></tr>"
  ).join("") + "</tbody></table>";
}

// scope = une vuln OU un tableau de vulns.
function vulnReportBody(scope) {
  const list = (Array.isArray(scope) ? scope : [scope]).map(grcVulnEnsureShape)
    .slice()
    .sort((a, b) => (_GRC_VULN_SEV_RANK[a.severity] - _GRC_VULN_SEV_RANK[b.severity]));
  const L = (k) => grcT(k);
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = grkAuthorName();

  let h = "<h1>" + L("grc.vulnerabilites.report.title") + "</h1>";
  h += "<p><strong>" + L("grc.vulnerabilites.report.generatedOn") + " :</strong> " +
    grkEscapeHtml(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.vulnerabilites.report.by") + " :</strong> " + grkEscapeHtml(author);
  h += "</p>";
  if (!list.length) { h += "<p><em>" + L("grc.vulnerabilites.report.none") + "</em></p>"; return h; }

  list.forEach((v) => {
    const sev = grcVulnSeverityBadge(v.severity);
    h += "<h2>" + grkEscapeHtml(v.title || "—") + " — " + grkEscapeHtml(sev.text) + "</h2>";
    h += _vulnRow([
      [L("grc.vulnerabilites.form.cve"), v.cve],
      ["CVSS", v.cvssScore == null ? "—" : v.cvssScore + (v.cvssVector ? " (" + v.cvssVector + ")" : "")],
      [L("grc.vulnerabilites.tr.status"), L("grc.vulnerabilites.st." + v.status)],
      [L("grc.vulnerabilites.tr.discoveredAt"), v.discoveredAt ? v.discoveredAt.slice(0, 10) : "—"],
      [L("grc.vulnerabilites.tr.dueAt"),
        (v.dueAt ? v.dueAt.slice(0, 10) : "—") + (grcVulnSlaBreached(v) ? "  ⚠ " + L("grc.vulnerabilites.badge.sla") : "")],
      [L("grc.vulnerabilites.form.owner"), v.owner],
      [L("grc.vulnerabilites.tr.remediation"), v.remediation],
      [L("grc.vulnerabilites.tr.workaround"), v.workaround],
    ]);

    if (v.affectedAssets.length) {
      h += "<h3>" + L("grc.vulnerabilites.tab.actifs") + "</h3><ul>" +
        v.affectedAssets.map((a) => "<li>" + grkEscapeHtml(a.ref) +
          (a.note ? " — " + grkEscapeHtml(a.note) : "") + "</li>").join("") + "</ul>";
    }
    if (v.timeline.length) {
      h += "<h3>" + L("grc.vulnerabilites.tab.timeline") + "</h3><ol>" +
        v.timeline.map((e) => {
          const when = e.ts ? e.ts.slice(0, 10) : "—";
          const label = e.kind === "status" && e.from && e.to
            ? L("grc.vulnerabilites.st." + e.from) + " → " + L("grc.vulnerabilites.st." + e.to)
            : L("grc.vulnerabilites.evk." + e.kind);
          return "<li>" + grkEscapeHtml(when + " — " + label) +
            (e.text ? " : " + grkEscapeHtml(e.text) : "") +
            (e.actor ? " (" + grkEscapeHtml(e.actor) + ")" : "") + "</li>";
        }).join("") + "</ol>";
    }
    if (v.status === "accepted") {
      h += "<h3>" + L("grc.vulnerabilites.acc.title") + "</h3>";
      h += _vulnRow([
        [L("grc.vulnerabilites.acc.by"), v.acceptance.by],
        [L("grc.vulnerabilites.acc.at"), v.acceptance.at ? v.acceptance.at.slice(0, 10) : "—"],
        [L("grc.vulnerabilites.acc.expiresAt"),
          (v.acceptance.expiresAt ? v.acceptance.expiresAt.slice(0, 10) : "—") +
          (grcVulnAcceptanceExpired(v) ? "  ⚠" : "")],
        [L("grc.vulnerabilites.acc.reason"), v.acceptance.reason],
      ]);
    }
    if (v.linkedIncident || v.linkedRisk) {
      h += "<p>" +
        (v.linkedIncident ? "<strong>" + L("grc.vulnerabilites.links.linkedIncident") + " :</strong> " + grkEscapeHtml(v.linkedIncident) + " " : "") +
        (v.linkedRisk ? "<strong>" + L("grc.vulnerabilites.links.linkedRisk") + " :</strong> " + grkEscapeHtml(v.linkedRisk) : "") +
        "</p>";
    }
  });
  return h;
}

function _vulnSlug(v) {
  return grkSlug(v && v.title, "vuln");
}

function exportVulnAsJson(scope) {
  const name = Array.isArray(scope)
    ? "vulnerabilites-" + grkDateStamp() + ".json"
    : "vuln-" + _vulnSlug(scope) + "-" + grkDateStamp() + ".json";
  return grkExportJson(scope, name);
}

function exportVulnReportAsWord(scope) {
  const base = Array.isArray(scope) ? "vulnerabilites" : "vuln-" + _vulnSlug(scope);
  grkExportWord(vulnReportBody(scope), base + "-" + grkDateStamp() + ".doc",
    grcT("grc.vulnerabilites.report.title"));
}

function exportVulnReportAsPdf(scope) {
  grkPrintWindow(vulnReportBody(scope), grcT("grc.vulnerabilites.report.title"));
}

function exportVulnsCsv(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcVulnEnsureShape);
  const rows = [["title", "cve", "cvss", "severity", "status",
    "discoveredAt", "dueAt", "sla_breached", "owner"]];
  arr.forEach((v) => {
    rows.push([
      v.title, v.cve, v.cvssScore == null ? "" : v.cvssScore, v.severity, v.status,
      v.discoveredAt ? v.discoveredAt.slice(0, 10) : "",
      v.dueAt ? v.dueAt.slice(0, 10) : "",
      grcVulnSlaBreached(v) ? "1" : "0",
      v.owner,
    ]);
  });
  grkExportCsv(rows, "vulnerabilites-" + grkDateStamp() + ".csv");
}
