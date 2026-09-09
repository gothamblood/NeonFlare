/* Conformité -- registre d'obligations + audits (avec constats /
   non-conformités). Bâti sur grc-registry-kit.js (grk*). Voir
   spec/grc-registry-upgrades/30-conformite.md.

   UN SEUL store /grc/compliance/registry, discriminé par `kind` :
   "obligation" ou "audit". Aligné ISO/IEC 27001 A.5.31 / A.5.35 /
   A.5.36, NIST CSF GV.OC / GV.OV. Tout le texte affiché passe par
   grcT() ; les enums GRC_CMP_* restent des clés internes.

   État (30-conformite.md §6) :
   - T1 : store bi-kind + modèles + dérivés + import.  <-- ICI
   - T2 : registre filtrable + encart + montage.
   - T3..T6 : panneaux Obligation / Audit + exports.
   - T7 : Settings.  T8 : CSS.  T9 : tests. */

const GRC_COMPLIANCE_KEY = "/grc/compliance/registry";

const GRC_CMP_SOURCE_TYPES = ["law", "standard", "contract", "policy"];
const GRC_CMP_APPLICABILITY = ["applicable", "not-applicable"];
const GRC_CMP_STATUSES = ["compliant", "partial", "gap", "unknown"];
const GRC_CMP_AUDIT_TYPES = ["internal", "external", "certification"];
const GRC_CMP_AUDIT_STATUSES = ["planned", "in-progress", "closed"];
const GRC_CMP_FINDING_SEVERITIES = ["major", "minor", "observation"];
const GRC_CMP_FINDING_VERIF = ["open", "in-progress", "verified", "accepted-risk"];
const GRC_CMP_FINDING_OPEN_VERIF = ["open", "in-progress"];
const GRC_CMP_DEFAULT_CADENCE = 12;

// Gravité de constat -> échelle .grc-crit-badge.
function grcCmpSeverityBadge(sev) {
  const s = GRC_CMP_FINDING_SEVERITIES.indexOf(sev) !== -1 ? sev : "observation";
  const cls = s === "major" ? "high" : (s === "minor" ? "medium" : "low");
  return { sev: s, cls: cls, text: grcT("grc.conformite.sev." + s) };
}

// Statut de conformité -> badge.
function grcCmpStatusBadge(status) {
  const s = GRC_CMP_STATUSES.indexOf(status) !== -1 ? status : "unknown";
  const cls = s === "compliant" ? "low" : (s === "partial" ? "medium" : (s === "gap" ? "high" : "info"));
  return { status: s, cls: cls, text: grcT("grc.conformite.st." + s) };
}

/* ---------- descripteurs grkEnsure (schema 1) ---------------- */

const GRC_CMP_FINDING_SCHEMA = {
  id: { type: "string" },
  ts: { type: "iso" },
  severity: { type: "string", enum: GRC_CMP_FINDING_SEVERITIES, default: "minor" },
  text: { type: "string" },
  clause: { type: "string" },
  correctiveAction: { type: "string" },
  owner: { type: "string" },
  dueAt: { type: "iso" },
  verification: { type: "string", enum: GRC_CMP_FINDING_VERIF, default: "open" },
  linkedIncident: { type: "string" },
  linkedRisk: { type: "string" },
};

const GRC_OBLIGATION_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  kind: { type: "string", default: "obligation" },
  ref: { type: "string" },
  title: { type: "string" },
  sourceType: { type: "string", enum: GRC_CMP_SOURCE_TYPES, default: "standard" },
  sourceRef: { type: "string" },
  applicability: { type: "string", enum: GRC_CMP_APPLICABILITY, default: "applicable" },
  status: { type: "string", enum: GRC_CMP_STATUSES, default: "unknown" },
  owner: { type: "string" },
  evidence: { type: "string" },
  notes: { type: "string" },
  controls: { type: "array" },
  assessment: {
    type: "object", of: {
      lastAt: { type: "iso" },
      nextDueAt: { type: "iso" },
      cadenceMonths: { type: "number", default: GRC_CMP_DEFAULT_CADENCE },
    },
  },
};

const GRC_AUDIT_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  kind: { type: "string", default: "audit" },
  title: { type: "string" },
  type: { type: "string", enum: GRC_CMP_AUDIT_TYPES, default: "internal" },
  scope: { type: "string" },
  auditor: { type: "string" },
  status: { type: "string", enum: GRC_CMP_AUDIT_STATUSES, default: "planned" },
  plannedFor: { type: "iso" },
  startedAt: { type: "iso" },
  closedAt: { type: "iso" },
  findings: { type: "array", of: GRC_CMP_FINDING_SCHEMA },
};

function grcCmpIsAudit(entry) {
  return entry && entry.kind === "audit";
}

function grcComplianceEnsureShape(entry) {
  const isAudit = entry && entry.kind === "audit";
  const e = grkEnsure(entry, isAudit ? GRC_AUDIT_SCHEMA : GRC_OBLIGATION_SCHEMA);
  e.id = entry && typeof entry.id === "string" ? entry.id : (e.id || "");
  e.kind = isAudit ? "audit" : "obligation";
  if (isAudit) {
    e.findings.sort((a, b) => Date.parse(a.ts || 0) - Date.parse(b.ts || 0));
  } else {
    const a = e.assessment;
    if (a.lastAt && !a.nextDueAt) {
      a.nextDueAt = grkAddMonths(a.lastAt, a.cadenceMonths || GRC_CMP_DEFAULT_CADENCE);
    }
  }
  return e;
}

/* ---------- store ------------------------------------------- */

const _grcComplianceStore = grkStore(GRC_COMPLIANCE_KEY);

function getGrcCompliance() { return _grcComplianceStore.get(); }
function saveGrcCompliance(list) { _grcComplianceStore.save(list); }
function resetGrcCompliance() { _grcComplianceStore.remove(); }

function getGrcObligations() { return getGrcCompliance().filter((e) => e && e.kind !== "audit"); }
function getGrcAudits() { return getGrcCompliance().filter(grcCmpIsAudit); }

function _addGrcComplianceEntry(entry, kind) {
  const list = getGrcCompliance();
  const shaped = grcComplianceEnsureShape(Object.assign({ kind: kind }, entry || {}));
  shaped.id = grkId(kind === "audit" ? "audit" : "obl");
  list.push(shaped);
  saveGrcCompliance(list);
  return shaped.id;
}

function addGrcObligation(entry) { return _addGrcComplianceEntry(entry, "obligation"); }
function addGrcAudit(entry) { return _addGrcComplianceEntry(entry, "audit"); }

function updateGrcComplianceEntry(id, changes) {
  const list = getGrcCompliance();
  const idx = list.findIndex((e) => e && e.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveGrcCompliance(list);
}

function removeGrcComplianceEntry(id) {
  saveGrcCompliance(getGrcCompliance().filter((e) => e && e.id !== id));
}

function cmpMutate(id, fn) {
  return grkMutate(_grcComplianceStore, id, grcComplianceEnsureShape, fn);
}

/* ---------- obligation : sous-objets ------------------------ */

function grcCmpSetObligationCore(id, changes) {
  return cmpMutate(id, (e) => {
    ["ref", "title", "sourceRef", "owner", "evidence", "notes"]
      .forEach((k) => { if (k in changes && typeof changes[k] === "string") e[k] = changes[k].trim(); });
    if ("sourceType" in changes && GRC_CMP_SOURCE_TYPES.indexOf(changes.sourceType) !== -1) e.sourceType = changes.sourceType;
    if ("applicability" in changes && GRC_CMP_APPLICABILITY.indexOf(changes.applicability) !== -1) e.applicability = changes.applicability;
    if ("status" in changes && GRC_CMP_STATUSES.indexOf(changes.status) !== -1) e.status = changes.status;
    return true;
  });
}

function grcCmpSetAssessment(id, patch) {
  return cmpMutate(id, (e) => {
    const a = e.assessment;
    const p = patch || {};
    if ("lastAt" in p) a.lastAt = grkToIso(p.lastAt);
    if ("cadenceMonths" in p) {
      const n = Math.round(Number(p.cadenceMonths));
      if (Number.isFinite(n) && n > 0) a.cadenceMonths = n;
    }
    a.nextDueAt = a.lastAt ? grkAddMonths(a.lastAt, a.cadenceMonths) : null;
    return true;
  });
}

function grcCmpAddObligationControl(id, controlRef) {
  return cmpMutate(id, (e) => {
    const v = String(controlRef || "").trim();
    if (!v || e.controls.indexOf(v) !== -1) return false;
    e.controls.push(v);
    return true;
  });
}

function grcCmpRemoveObligationControl(id, controlRef) {
  return cmpMutate(id, (e) => {
    const before = e.controls.length;
    e.controls = e.controls.filter((x) => x !== controlRef);
    return e.controls.length < before;
  });
}

/* ---------- audit : sous-objets --------------------------- */

function grcCmpSetAuditCore(id, changes) {
  return cmpMutate(id, (e) => {
    ["title", "scope", "auditor"].forEach((k) => {
      if (k in changes && typeof changes[k] === "string") e[k] = changes[k].trim();
    });
    if ("type" in changes && GRC_CMP_AUDIT_TYPES.indexOf(changes.type) !== -1) e.type = changes.type;
    if ("status" in changes && GRC_CMP_AUDIT_STATUSES.indexOf(changes.status) !== -1) e.status = changes.status;
    ["plannedFor", "startedAt", "closedAt"].forEach((k) => {
      if (k in changes) e[k] = grkToIso(changes[k]);
    });
    return true;
  });
}

function grcCmpAddFinding(id, finding) {
  return cmpMutate(id, (e) => {
    const f = grkEnsure(finding || {}, GRC_CMP_FINDING_SCHEMA);
    f.id = grkId("nc");
    if (!f.ts) f.ts = new Date().toISOString();
    e.findings.push(f);
    e.findings.sort((a, b) => Date.parse(a.ts || 0) - Date.parse(b.ts || 0));
    return f.id;
  });
}

function grcCmpUpdateFinding(id, findingId, changes) {
  return cmpMutate(id, (e) => {
    const f = e.findings.find((x) => x.id === findingId);
    if (!f) return false;
    const n = Object.assign({}, changes);
    if ("severity" in n && GRC_CMP_FINDING_SEVERITIES.indexOf(n.severity) === -1) delete n.severity;
    if ("verification" in n && GRC_CMP_FINDING_VERIF.indexOf(n.verification) === -1) delete n.verification;
    if ("dueAt" in n) n.dueAt = grkToIso(n.dueAt);
    if ("ts" in n) n.ts = grkToIso(n.ts) || f.ts;
    Object.assign(f, n);
    return true;
  });
}

function grcCmpRemoveFinding(id, findingId) {
  return cmpMutate(id, (e) => {
    const before = e.findings.length;
    e.findings = e.findings.filter((x) => x.id !== findingId);
    return e.findings.length < before;
  });
}

/* ---------- dérivés -------------------------------------- */

// Constat encore ouvert (non vérifié / non accepté).
function grcCmpFindingIsOpen(f) {
  return GRC_CMP_FINDING_OPEN_VERIF.indexOf(f && f.verification) !== -1;
}

// Action corrective en retard : constat ouvert + dueAt passé.
function grcCmpFindingOverdue(f) {
  if (!f || !grcCmpFindingIsOpen(f) || !f.dueAt) return false;
  const t = Date.parse(f.dueAt);
  return !isNaN(t) && t < Date.now();
}

function grcCmpObligationOverdueAssessment(o) {
  const a = o && o.assessment;
  if (!a) return false;
  if (o.applicability === "not-applicable") return false;
  if (!a.lastAt) return true;
  const due = a.nextDueAt || grkAddMonths(a.lastAt, a.cadenceMonths || GRC_CMP_DEFAULT_CADENCE);
  const t = due ? Date.parse(due) : NaN;
  return isNaN(t) ? true : t < Date.now();
}

// Taux de conformité : compliant / (obligations applicables).
function grcComplianceRate(list) {
  const obl = (Array.isArray(list) ? list : []).map(grcComplianceEnsureShape)
    .filter((e) => e.kind !== "audit" && e.applicability === "applicable");
  if (!obl.length) return { rate: null, compliant: 0, total: 0 };
  const compliant = obl.filter((o) => o.status === "compliant").length;
  return { rate: Math.round(compliant / obl.length * 100), compliant: compliant, total: obl.length };
}

// Écarts ouverts : constats d'audit non vérifiés + obligations en gap.
function grcComplianceOpenGaps(list) {
  const arr = (Array.isArray(list) ? list : []).map(grcComplianceEnsureShape);
  const out = { major: 0, minor: 0, observation: 0, gap: 0, total: 0 };
  arr.forEach((e) => {
    if (e.kind === "audit") {
      e.findings.filter(grcCmpFindingIsOpen).forEach((f) => {
        out[f.severity] = (out[f.severity] || 0) + 1;
        out.total += 1;
      });
    } else if (e.status === "gap" && e.applicability === "applicable") {
      out.gap += 1;
      out.total += 1;
    }
  });
  return out;
}

function grcComplianceNextAudit(list) {
  const dates = (Array.isArray(list) ? list : []).map(grcComplianceEnsureShape)
    .filter((e) => e.kind === "audit" && e.status !== "closed" && e.plannedFor)
    .map((e) => Date.parse(e.plannedFor))
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);
  return dates.length ? new Date(dates[0]).toISOString() : null;
}

function grcComplianceSummary(list) {
  const arr = Array.isArray(list) ? list.map(grcComplianceEnsureShape) : [];
  const obl = arr.filter((e) => e.kind !== "audit");
  const audits = arr.filter(grcCmpIsAudit);
  return {
    obligations: obl.length,
    audits: audits.length,
    rate: grcComplianceRate(arr),
    openGaps: grcComplianceOpenGaps(arr),
    overdueAssessments: obl.filter(grcCmpObligationOverdueAssessment).length,
    correctiveOverdue: audits.reduce((acc, a) =>
      acc + a.findings.filter(grcCmpFindingOverdue).length, 0),
    nextAudit: grcComplianceNextAudit(arr),
  };
}

/* ---------- import (tableau OU entité unique) ------------ */

async function importGrcComplianceFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  if (Array.isArray(decoded)) {
    saveGrcCompliance(decoded);
    return;
  }
  const isShape = decoded && typeof decoded === "object" && typeof decoded.id === "string" &&
    (decoded.kind === "audit" || typeof decoded.title === "string" || typeof decoded.ref === "string");
  if (!isShape) throw new Error(grcT("grc.conformite.invalidImport"));

  const list = getGrcCompliance();
  const idx = list.findIndex((e) => e && e.id === decoded.id);
  if (idx === -1) list.push(decoded);
  else list[idx] = decoded;
  saveGrcCompliance(list);
}

/* ================================================================== *
 *  Registre -- toggle Obligations / Audits + 2 grkRegistry
 *  (filtrés par kind, même store) + encart commun (T2).
 *  Monté par grc/conformite.html (#grcComplianceRegistry / #grcComplianceSummary).
 *  Réutilise le toggle CSS .grc-priv-kindbar/.grc-priv-kindbtn.
 * ================================================================== */

function _cmpEnumOptions(values, prefix) {
  return values.map((v) => ({ value: v, label: prefix + v }));
}

function _cmpMiniBadge(cls, i18nKey) {
  const el = document.createElement("span");
  el.className = "grc-sup-mini-badge " + cls;
  el.textContent = grcT(i18nKey);
  return el;
}

function _cmpSummarise() {
  // Lit le store BRUT : les 2 registres (obl/audit) passent chacun la
  // liste pré-`ensure`d avec LEUR schema, ce qui mange les champs de
  // l'autre kind. On re-part du store non façonné.
  const sm = grcComplianceSummary(getGrcCompliance());
  if (!sm.obligations && !sm.audits) return { chips: [grcT("grc.conformite.summary.none")] };
  const g = sm.openGaps;
  const gapsStr = "Maj " + g.major + " · Min " + g.minor + " · Obs " + g.observation + " · Gap " + g.gap;
  const chips = [];
  if (sm.rate.rate != null) {
    chips.push(grcT("grc.conformite.summary.rate")
      .replace("{v}", sm.rate.rate).replace("{c}", sm.rate.compliant).replace("{t}", sm.rate.total));
  }
  chips.push(grcT("grc.conformite.summary.obligations").replace("{n}", sm.obligations));
  chips.push(grcT("grc.conformite.summary.audits").replace("{n}", sm.audits));
  chips.push(grcT("grc.conformite.summary.openGaps").replace("{value}", gapsStr));
  chips.push(grcT("grc.conformite.summary.overdueAssess").replace("{n}", sm.overdueAssessments));
  const gaps = sm.nextAudit
    ? grcT("grc.conformite.summary.nextAudit").replace("{value}", grkFmtDateTime(sm.nextAudit))
    : null;
  return { chips: chips, gaps: gaps };
}

function initGrcComplianceRegistry() {
  const host = document.querySelector("#grcComplianceRegistry");
  if (!host) return;
  host.innerHTML = "";

  const bar = document.createElement("div");
  bar.className = "grc-priv-kindbar";
  const oblBtn = document.createElement("button");
  oblBtn.type = "button";
  oblBtn.className = "grc-priv-kindbtn is-active";
  oblBtn.textContent = grcT("grc.conformite.filter.obligation");
  const audBtn = document.createElement("button");
  audBtn.type = "button";
  audBtn.className = "grc-priv-kindbtn";
  audBtn.textContent = grcT("grc.conformite.filter.audit");
  bar.appendChild(oblBtn);
  bar.appendChild(audBtn);
  host.appendChild(bar);

  const oblMount = document.createElement("div");
  oblMount.id = "grcComplianceOblList";
  const audMount = document.createElement("div");
  audMount.id = "grcComplianceAudList";
  audMount.hidden = true;
  host.appendChild(oblMount);
  host.appendChild(audMount);

  const showKind = (kind) => {
    const isObl = kind !== "audit";
    oblMount.hidden = !isObl;
    audMount.hidden = isObl;
    oblBtn.classList.toggle("is-active", isObl);
    audBtn.classList.toggle("is-active", !isObl);
    if (isObl && window.renderGrcObligationsList) window.renderGrcObligationsList();
    else if (!isObl && window.renderGrcAuditsList) window.renderGrcAuditsList();
  };
  oblBtn.addEventListener("click", () => showKind("obligation"));
  audBtn.addEventListener("click", () => showKind("audit"));

  /* --- registre Obligations --- */
  grkRegistry({
    mount: "#grcComplianceOblList",
    summary: "#grcComplianceSummary",
    store: _grcComplianceStore,
    schema: GRC_OBLIGATION_SCHEMA,
    idAttr: "data-cmp-id",
    listGlobal: "renderGrcObligationsList",
    deepLink: true,
    filter: (e) => e.kind !== "audit",
    i18n: {
      add: "grc.conformite.obl.addBtn",
      titleAdd: "grc.conformite.obl.title",
      titleEdit: "grc.conformite.obl.titleEdit",
    },
    form: [
      { id: "ref", label: "grc.conformite.obl.ref", type: "text" },
      { id: "title", label: "grc.conformite.obl.name", type: "text", required: true },
      { id: "sourceType", label: "grc.conformite.obl.sourceType", type: "select",
        options: _cmpEnumOptions(GRC_CMP_SOURCE_TYPES, "grc.conformite.src.") },
      { id: "sourceRef", label: "grc.conformite.obl.sourceRef", type: "text" },
      { id: "owner", label: "grc.conformite.obl.owner", type: "text" },
    ],
    readForm: (e) => ({ ref: e.ref, title: e.title, sourceType: e.sourceType,
      sourceRef: e.sourceRef, owner: e.owner }),
    submit: (v, editingId) => {
      const fields = {
        ref: (v.ref || "").trim(), title: (v.title || "").trim(),
        sourceType: v.sourceType, sourceRef: (v.sourceRef || "").trim(),
        owner: (v.owner || "").trim(),
      };
      if (editingId) updateGrcComplianceEntry(editingId, fields);
      else addGrcObligation(fields);
    },
    header: (e) => {
      const sb = grcCmpStatusBadge(e.status);
      const badge = document.createElement("span");
      badge.className = "grc-crit-badge " + sb.cls;
      badge.textContent = sb.text;
      const cells = [
        { text: (e.ref ? e.ref + " · " : "") + (e.title || "") },
        badge,
      ];
      if (e.applicability === "not-applicable") {
        cells.push({ text: grcT("grc.conformite.appl.not-applicable") });
      }
      if (grcCmpObligationOverdueAssessment(e)) {
        cells.push(_cmpMiniBadge("grc-sup-badge-review", "grc.conformite.as.overdue"));
      }
      return cells;
    },
    panel: typeof renderObligationPanel === "function" ? renderObligationPanel : null,
    summarise: _cmpSummarise,
    importFn: importGrcComplianceFromJson,
    confirmName: (e) => e.title || e.ref || "",
  })();

  /* --- registre Audits --- */
  grkRegistry({
    mount: "#grcComplianceAudList",
    summary: "#grcComplianceSummary",
    store: _grcComplianceStore,
    schema: GRC_AUDIT_SCHEMA,
    idAttr: "data-cmp-id",
    listGlobal: "renderGrcAuditsList",
    deepLink: true,
    filter: grcCmpIsAudit,
    i18n: {
      add: "grc.conformite.audit.addBtn",
      titleAdd: "grc.conformite.audit.title",
      titleEdit: "grc.conformite.audit.titleEdit",
    },
    form: [
      { id: "title", label: "grc.conformite.audit.name", type: "text", required: true },
      { id: "type", label: "grc.conformite.audit.type", type: "select",
        options: _cmpEnumOptions(GRC_CMP_AUDIT_TYPES, "grc.conformite.at.") },
      { id: "scope", label: "grc.conformite.audit.scope", type: "text" },
      { id: "auditor", label: "grc.conformite.audit.auditor", type: "text" },
    ],
    readForm: (e) => ({ title: e.title, type: e.type, scope: e.scope, auditor: e.auditor }),
    submit: (v, editingId) => {
      const fields = {
        title: (v.title || "").trim(), type: v.type,
        scope: (v.scope || "").trim(), auditor: (v.auditor || "").trim(),
      };
      if (editingId) grcCmpSetAuditCore(editingId, fields);
      else addGrcAudit(fields);
    },
    header: (e) => {
      const openCount = e.findings.filter(grcCmpFindingIsOpen).length;
      const cells = [
        { text: e.title || "" },
        { text: grcT("grc.conformite.at." + e.type) },
        { text: grcT("grc.conformite.as." + e.status) },
      ];
      if (openCount) {
        const b = document.createElement("span");
        b.className = "grc-crit-badge medium";
        b.textContent = openCount + " " + grcT("grc.conformite.tab.constats");
        cells.push(b);
      }
      if (e.findings.some(grcCmpFindingOverdue)) {
        cells.push(_cmpMiniBadge("grc-sup-badge-expired", "grc.conformite.fnd.overdueAlert"));
      }
      return cells;
    },
    panel: typeof renderAuditPanel === "function" ? renderAuditPanel : null,
    summarise: _cmpSummarise,
    importFn: importGrcComplianceFromJson,
    confirmName: (e) => e.title || "",
  })();

  showKind("obligation");
}

/* ================================================================== *
 *  Exports (T6) -- via le kit (grkExport*). DDA (Word+CSV), rapport
 *  de conformité, rapport d'audit, JSON. Aucune requête réseau.
 * ================================================================== */

function _cmpKV(rows) {
  return "<table><tbody>" + rows.map((r) =>
    "<tr><th>" + grkEscapeHtml(r[0]) + "</th><td>" + grkEscapeHtml(r[1]) + "</td></tr>"
  ).join("") + "</tbody></table>";
}

function _cmpReportHead(titleKey) {
  const L = (k) => grcT(k);
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = grkAuthorName();
  let h = "<h1>" + L(titleKey) + "</h1>";
  h += "<p><strong>" + L("grc.conformite.report.generatedOn") + " :</strong> " +
    grkEscapeHtml(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.conformite.report.by") + " :</strong> " + grkEscapeHtml(author);
  h += "</p>";
  return h;
}

// DDA : obligations de type `standard`.
function ddaReportBody(list) {
  const obl = (Array.isArray(list) ? list : [list]).map(grcComplianceEnsureShape)
    .filter((e) => e.kind !== "audit" && e.sourceType === "standard");
  const L = (k) => grcT(k);
  let h = _cmpReportHead("grc.conformite.report.ddaTitle");
  if (!obl.length) { h += "<p><em>" + L("grc.conformite.report.none") + "</em></p>"; return h; }
  h += "<table><thead><tr><th>" + L("grc.conformite.obl.ref") + "</th><th>" +
    L("grc.conformite.obl.sourceRef") + "</th><th>" + L("grc.conformite.obl.applicability") +
    "</th><th>" + L("grc.conformite.obl.status") + "</th><th>" + L("grc.conformite.ev.evidence") +
    "</th></tr></thead><tbody>";
  obl.forEach((o) => {
    h += "<tr><td>" + grkEscapeHtml(o.ref || o.title) +
      "</td><td>" + grkEscapeHtml(o.sourceRef) +
      "</td><td>" + grkEscapeHtml(L("grc.conformite.appl." + o.applicability)) +
      "</td><td>" + grkEscapeHtml(L("grc.conformite.st." + o.status)) +
      "</td><td>" + grkEscapeHtml(o.evidence) + "</td></tr>";
  });
  h += "</tbody></table>";
  return h;
}

function complianceReportBody(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcComplianceEnsureShape);
  const L = (k) => grcT(k);
  const rate = grcComplianceRate(arr);
  let h = _cmpReportHead("grc.conformite.report.cmpTitle");
  h += _cmpKV([
    [L("grc.conformite.summary.rate").replace("{v}", rate.rate == null ? "—" : rate.rate)
      .replace("{c}", rate.compliant).replace("{t}", rate.total), ""],
  ]);

  // taux par type de source
  const bySource = {};
  arr.filter((e) => e.kind !== "audit" && e.applicability === "applicable").forEach((o) => {
    bySource[o.sourceType] = bySource[o.sourceType] || { total: 0, compliant: 0 };
    bySource[o.sourceType].total += 1;
    if (o.status === "compliant") bySource[o.sourceType].compliant += 1;
  });
  const srcRows = Object.keys(bySource).map((k) => [
    L("grc.conformite.src." + k),
    bySource[k].compliant + " / " + bySource[k].total,
  ]);
  if (srcRows.length) h += "<h3>" + L("grc.conformite.obl.sourceType") + "</h3>" + _cmpKV(srcRows);

  // écarts ouverts (obligations gap + constats)
  const gaps = arr.filter((e) => e.kind !== "audit" && e.status === "gap" && e.applicability === "applicable");
  if (gaps.length) {
    h += "<h3>" + L("grc.conformite.st.gap") + "</h3><ul>" +
      gaps.map((o) => "<li>" + grkEscapeHtml((o.ref ? o.ref + " — " : "") + o.title) + "</li>").join("") + "</ul>";
  }

  // plan d'action = constats ouverts
  const findings = [];
  arr.filter((e) => e.kind === "audit").forEach((a) => {
    a.findings.filter(grcCmpFindingIsOpen).forEach((f) => findings.push({ audit: a.title, f: f }));
  });
  if (findings.length) {
    h += "<h3>" + L("grc.conformite.tab.constats") + "</h3><table><thead><tr><th>" +
      L("grc.conformite.fnd.severity") + "</th><th>" + L("grc.conformite.fnd.text") + "</th><th>" +
      L("grc.conformite.fnd.correctiveAction") + "</th><th>" + L("grc.conformite.fnd.dueAt") +
      "</th></tr></thead><tbody>";
    findings.forEach((x) => {
      h += "<tr><td>" + grkEscapeHtml(L("grc.conformite.sev." + x.f.severity)) +
        "</td><td>" + grkEscapeHtml(x.f.text) +
        "</td><td>" + grkEscapeHtml(x.f.correctiveAction) +
        "</td><td>" + grkEscapeHtml(x.f.dueAt ? x.f.dueAt.slice(0, 10) : "—") +
        (grcCmpFindingOverdue(x.f) ? " ⚠" : "") + "</td></tr>";
    });
    h += "</tbody></table>";
  }
  return h;
}

function auditReportBody(audit) {
  const a = grcComplianceEnsureShape(audit);
  const L = (k) => grcT(k);
  let h = _cmpReportHead("grc.conformite.report.auditTitle");
  h += "<h2>" + grkEscapeHtml(a.title || "—") + "</h2>";
  h += _cmpKV([
    [L("grc.conformite.audit.type"), L("grc.conformite.at." + a.type)],
    [L("grc.conformite.audit.scope"), a.scope],
    [L("grc.conformite.audit.auditor"), a.auditor],
    [L("grc.conformite.audit.status"), L("grc.conformite.as." + a.status)],
    [L("grc.conformite.audit.plannedFor"), a.plannedFor ? a.plannedFor.slice(0, 10) : "—"],
    [L("grc.conformite.audit.startedAt"), a.startedAt ? a.startedAt.slice(0, 10) : "—"],
    [L("grc.conformite.audit.closedAt"), a.closedAt ? a.closedAt.slice(0, 10) : "—"],
  ]);
  h += "<h3>" + L("grc.conformite.tab.constats") + "</h3>";
  if (!a.findings.length) { h += "<p><em>" + L("grc.conformite.report.none") + "</em></p>"; return h; }
  h += "<table><thead><tr><th>" + L("grc.conformite.fnd.severity") + "</th><th>" +
    L("grc.conformite.fnd.text") + "</th><th>" + L("grc.conformite.fnd.clause") + "</th><th>" +
    L("grc.conformite.fnd.correctiveAction") + "</th><th>" + L("grc.conformite.fnd.owner") + "</th><th>" +
    L("grc.conformite.fnd.dueAt") + "</th><th>" + L("grc.conformite.fnd.verification") +
    "</th></tr></thead><tbody>";
  a.findings.forEach((f) => {
    h += "<tr><td>" + grkEscapeHtml(L("grc.conformite.sev." + f.severity)) +
      "</td><td>" + grkEscapeHtml(f.text) +
      "</td><td>" + grkEscapeHtml(f.clause) +
      "</td><td>" + grkEscapeHtml(f.correctiveAction) +
      "</td><td>" + grkEscapeHtml(f.owner) +
      "</td><td>" + grkEscapeHtml(f.dueAt ? f.dueAt.slice(0, 10) : "—") + (grcCmpFindingOverdue(f) ? " ⚠" : "") +
      "</td><td>" + grkEscapeHtml(L("grc.conformite.verif." + f.verification)) + "</td></tr>";
  });
  h += "</tbody></table>";
  return h;
}

function _cmpSlug(e) {
  return grkSlug(e && (e.title || e.ref), e && e.kind === "audit" ? "audit" : "obligation");
}

function exportComplianceAsJson(scope) {
  const name = Array.isArray(scope)
    ? "conformite-" + grkDateStamp() + ".json"
    : (scope && scope.kind === "audit" ? "audit-" : "obligation-") + _cmpSlug(scope) + "-" + grkDateStamp() + ".json";
  return grkExportJson(scope, name);
}

function exportDdaAsWord(list) {
  grkExportWord(ddaReportBody(list), "dda-" + grkDateStamp() + ".doc",
    grcT("grc.conformite.report.ddaTitle"));
}

function exportDdaCsv(list) {
  const obl = (Array.isArray(list) ? list : [list]).map(grcComplianceEnsureShape)
    .filter((e) => e.kind !== "audit" && e.sourceType === "standard");
  const rows = [["ref", "title", "source_ref", "applicable", "status", "owner"]];
  obl.forEach((o) => {
    rows.push([o.ref, o.title, o.sourceRef,
      o.applicability === "applicable" ? "1" : "0", o.status, o.owner]);
  });
  grkExportCsv(rows, "dda-" + grkDateStamp() + ".csv");
}

function exportComplianceReportAsWord(list) {
  grkExportWord(complianceReportBody(list), "rapport-conformite-" + grkDateStamp() + ".doc",
    grcT("grc.conformite.report.cmpTitle"));
}

function exportAuditReportAsWord(audit) {
  grkExportWord(auditReportBody(audit), "audit-" + _cmpSlug(audit) + "-" + grkDateStamp() + ".doc",
    grcT("grc.conformite.report.auditTitle"));
}
