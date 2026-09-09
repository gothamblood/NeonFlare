/* Registre des fournisseurs (tiers) -- store + modèle + dérivés.
   Bâti sur grc-registry-kit.js (grk*). Voir spec/grc-registry-upgrades/
   10-fournisseurs.md.

   Store /grc/fournisseurs/registry. Aligné ISO/IEC 27001 A.5.19-A.5.23,
   NIST CSF GV.SC, CIS 15. Tout le texte affiché passe par grcT() ; les
   enums GRC_SUP_* restent des clés internes stables (grc.fournisseurs.*).

   Boucle fermée avec la continuité : grc-continuity.js référence déjà
   `supplier` comme type de dépendance -> si les deux registres sont
   chargés, un plan de continuité peut lier un fournisseur.

   État (10-fournisseurs.md §6) :
   - T1 : store + descripteur + dérivés + import.        <-- ICI
   - T2 : grkRegistry (liste + formulaire + encart).
   - T3..T7 : panneau (Fiche/Risque/Contrat/Certifs/Cycle de vie/
     Incidents) + exports.  T8 : Settings.  T9 : CSS.  T10 : tests. */

const GRC_SUPPLIERS_KEY = "/grc/fournisseurs/registry";

const GRC_SUP_CRITICALITY = ["vital", "critique", "important", "mineur"];
const GRC_SUP_DATA_SHARED = ["none", "internal", "confidential", "personal", "regulated"];
const GRC_SUP_STATUS = ["prospect", "active", "suspended", "offboarded"];
const GRC_SUP_RENEWAL = ["auto", "manual", "none"];
const GRC_SUP_CERT_KINDS = ["iso27001", "soc2t2", "soc2t1", "pcidss", "hds", "other"];
const GRC_SUP_DEFAULT_CADENCE = 12;
const GRC_SUP_SOON_DAYS = 90;

/* ---------- descripteur grkEnsure (schema 1) ----------------------- */

const GRC_SUP_STEP_SCHEMA = {
  id: { type: "string" },
  order: { type: "number", default: 0 },
  text: { type: "string" },
  owner: { type: "string" },
  done: { type: "bool", default: false },
};

const GRC_SUP_CERT_SCHEMA = {
  id: { type: "string" },
  kind: { type: "string", enum: GRC_SUP_CERT_KINDS, default: "iso27001" },
  scope: { type: "string" },
  obtainedAt: { type: "iso" },
  expiresAt: { type: "iso" },
  evidence: { type: "string" },
};

const GRC_SUPPLIER_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  name: { type: "string" },
  service: { type: "string" },
  owner: { type: "string" },
  criticality: { type: "string", enum: GRC_SUP_CRITICALITY, default: "important" },
  dataShared: { type: "string", enum: GRC_SUP_DATA_SHARED, default: "none" },
  sites: { type: "string" },
  status: { type: "string", enum: GRC_SUP_STATUS, default: "active" },
  risk: {
    type: "object", of: {
      likelihood: { type: "number", default: 1 },
      impact: { type: "number", default: 1 },
      inherentNotes: { type: "string" },
      controls: { type: "string" },
      residual: { type: "number", default: null },
    },
  },
  contract: {
    type: "object", of: {
      ref: { type: "string" },
      startDate: { type: "iso" },
      endDate: { type: "iso" },
      renewal: { type: "string", enum: GRC_SUP_RENEWAL, default: "manual" },
      securityClauses: { type: "bool", default: false },
      breachNotifDelayH: { type: "number", default: null },
      rightToAudit: { type: "bool", default: false },
      exitPlan: { type: "bool", default: false },
      dpaSigned: { type: "bool", default: false },
    },
  },
  certifications: { type: "array", of: GRC_SUP_CERT_SCHEMA },   // tri par échéance fait dans grcSupplierEnsureShape
  lifecycle: {
    type: "object", of: {
      onboardedAt: { type: "iso" },
      offboardedAt: { type: "iso" },
      review: {
        type: "object", of: {
          lastReviewedAt: { type: "iso" },
          nextDueAt: { type: "iso" },
          cadenceMonths: { type: "number", default: GRC_SUP_DEFAULT_CADENCE },
        },
      },
      steps: { type: "array", sortBy: "order", of: GRC_SUP_STEP_SCHEMA },
    },
  },
  linkedIncidents: { type: "array" },
  notes: { type: "string" },
};

// grkEnsure ne trie pas les certifs par ISO-string proprement (sortBy
// numérique) -> on re-trie ici par date d'échéance, nulls en dernier.
function grcSupplierEnsureShape(supplier) {
  const s = grkEnsure(supplier, GRC_SUPPLIER_SCHEMA);
  s.id = supplier && typeof supplier.id === "string" ? supplier.id : (s.id || "");
  s.certifications.sort((a, b) => {
    const ta = a.expiresAt ? Date.parse(a.expiresAt) : Infinity;
    const tb = b.expiresAt ? Date.parse(b.expiresAt) : Infinity;
    return ta - tb;
  });
  const r = s.lifecycle.review;
  if (r.lastReviewedAt && !r.nextDueAt) {
    r.nextDueAt = grkAddMonths(r.lastReviewedAt, r.cadenceMonths || GRC_SUP_DEFAULT_CADENCE);
  }
  s.lifecycle.steps.forEach((st, i) => { st.order = i + 1; });
  return s;
}

/* ---------- store -------------------------------------------------- */

const _grcSupStore = grkStore(GRC_SUPPLIERS_KEY);

function getGrcSuppliers() {
  return _grcSupStore.get();
}

function saveGrcSuppliers(list) {
  _grcSupStore.save(list);
}

function resetGrcSuppliers() {
  _grcSupStore.remove();
}

function addGrcSupplier(supplier) {
  const list = getGrcSuppliers();
  const shaped = grcSupplierEnsureShape(supplier || {});
  shaped.id = grkId("sup");
  list.push(shaped);
  saveGrcSuppliers(list);
  return shaped.id;
}

function updateGrcSupplier(id, changes) {
  const list = getGrcSuppliers();
  const idx = list.findIndex((s) => s && s.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveGrcSuppliers(list);
}

function removeGrcSupplier(id) {
  saveGrcSuppliers(getGrcSuppliers().filter((s) => s && s.id !== id));
}

// Mutation atomique bien formée (id préservé).
function supMutate(id, fn) {
  return grkMutate(_grcSupStore, id, grcSupplierEnsureShape, fn);
}

/* ---------- sous-objets : cœur / risque / contrat / revue / cycle -- */

function grcSupSetCore(id, changes) {
  return supMutate(id, (s) => {
    ["name", "service", "owner", "sites", "notes"].forEach((k) => {
      if (k in changes && typeof changes[k] === "string") s[k] = changes[k].trim();
    });
    if ("criticality" in changes && GRC_SUP_CRITICALITY.indexOf(changes.criticality) !== -1) s.criticality = changes.criticality;
    if ("dataShared" in changes && GRC_SUP_DATA_SHARED.indexOf(changes.dataShared) !== -1) s.dataShared = changes.dataShared;
    if ("status" in changes && GRC_SUP_STATUS.indexOf(changes.status) !== -1) s.status = changes.status;
    return true;
  });
}

function grcSupSetRisk(id, patch) {
  return supMutate(id, (s) => {
    const p = patch || {};
    ["likelihood", "impact"].forEach((k) => {
      if (k in p) {
        const n = Math.round(Number(p[k]));
        s.risk[k] = Number.isFinite(n) && n >= 1 && n <= 5 ? n : s.risk[k];
      }
    });
    if ("residual" in p) s.risk.residual = grkNumOrNull(p.residual);
    if ("inherentNotes" in p && typeof p.inherentNotes === "string") s.risk.inherentNotes = p.inherentNotes;
    if ("controls" in p && typeof p.controls === "string") s.risk.controls = p.controls;
    return true;
  });
}

function grcSupSetContract(id, patch) {
  return supMutate(id, (s) => {
    const p = patch || {};
    if ("ref" in p && typeof p.ref === "string") s.contract.ref = p.ref.trim();
    if ("startDate" in p) s.contract.startDate = grkToIso(p.startDate);
    if ("endDate" in p) s.contract.endDate = grkToIso(p.endDate);
    if ("renewal" in p && GRC_SUP_RENEWAL.indexOf(p.renewal) !== -1) s.contract.renewal = p.renewal;
    ["securityClauses", "rightToAudit", "exitPlan", "dpaSigned"].forEach((k) => {
      if (k in p) s.contract[k] = !!p[k];
    });
    if ("breachNotifDelayH" in p) s.contract.breachNotifDelayH = grkNumOrNull(p.breachNotifDelayH);
    return true;
  });
}

function grcSupSetReview(id, patch) {
  return supMutate(id, (s) => {
    const r = s.lifecycle.review;
    const p = patch || {};
    if ("lastReviewedAt" in p) r.lastReviewedAt = grkToIso(p.lastReviewedAt);
    if ("cadenceMonths" in p) {
      const n = Math.round(Number(p.cadenceMonths));
      if (Number.isFinite(n) && n > 0) r.cadenceMonths = n;
    }
    r.nextDueAt = r.lastReviewedAt ? grkAddMonths(r.lastReviewedAt, r.cadenceMonths) : null;
    return true;
  });
}

function grcSupSetLifecycle(id, patch) {
  return supMutate(id, (s) => {
    const p = patch || {};
    if ("onboardedAt" in p) s.lifecycle.onboardedAt = grkToIso(p.onboardedAt);
    if ("offboardedAt" in p) s.lifecycle.offboardedAt = grkToIso(p.offboardedAt);
    return true;
  });
}

/* ---------- sous-listes : certifications ------------------------- */

function grcSupAddCert(id, cert) {
  return supMutate(id, (s) => {
    const c = grkEnsure(cert || {}, GRC_SUP_CERT_SCHEMA);
    c.id = grkId("cert");
    s.certifications.push(c);
    return c.id;
  });
}

function grcSupUpdateCert(id, certId, changes) {
  return supMutate(id, (s) => {
    const c = s.certifications.find((x) => x.id === certId);
    if (!c) return false;
    const n = Object.assign({}, changes);
    if ("kind" in n && GRC_SUP_CERT_KINDS.indexOf(n.kind) === -1) delete n.kind;
    if ("obtainedAt" in n) n.obtainedAt = grkToIso(n.obtainedAt);
    if ("expiresAt" in n) n.expiresAt = grkToIso(n.expiresAt);
    Object.assign(c, n);
    return true;
  });
}

function grcSupRemoveCert(id, certId) {
  return supMutate(id, (s) => {
    const before = s.certifications.length;
    s.certifications = s.certifications.filter((x) => x.id !== certId);
    return s.certifications.length < before;
  });
}

/* ---------- sous-listes : checklist de cycle de vie (ordonnée) --- */

function _supStepReindex(s) {
  s.lifecycle.steps.forEach((st, i) => { st.order = i + 1; });
}

function grcSupAddStep(id, step) {
  return supMutate(id, (s) => {
    const st = grkEnsure(step || {}, GRC_SUP_STEP_SCHEMA);
    st.id = grkId("step");
    st.order = s.lifecycle.steps.length + 1;
    s.lifecycle.steps.push(st);
    _supStepReindex(s);
    return st.id;
  });
}

function grcSupUpdateStep(id, stepId, changes) {
  return supMutate(id, (s) => {
    const st = s.lifecycle.steps.find((x) => x.id === stepId);
    if (!st) return false;
    const n = Object.assign({}, changes);
    delete n.order;
    if ("done" in n) n.done = !!n.done;
    Object.assign(st, n);
    return true;
  });
}

function grcSupRemoveStep(id, stepId) {
  return supMutate(id, (s) => {
    const before = s.lifecycle.steps.length;
    s.lifecycle.steps = s.lifecycle.steps.filter((x) => x.id !== stepId);
    _supStepReindex(s);
    return s.lifecycle.steps.length < before;
  });
}

function grcSupMoveStep(id, stepId, dir) {
  return supMutate(id, (s) => {
    const arr = s.lifecycle.steps;
    const i = arr.findIndex((x) => x.id === stepId);
    if (i === -1) return false;
    const j = dir < 0 ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return false;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    _supStepReindex(s);
    return true;
  });
}

/* ---------- cross-link : incidents liés ------------------------- */

function grcSupAddLinkedIncident(id, incidentId) {
  return supMutate(id, (s) => {
    const v = String(incidentId || "").trim();
    if (!v || s.linkedIncidents.indexOf(v) !== -1) return false;
    s.linkedIncidents.push(v);
    return true;
  });
}

function grcSupRemoveLinkedIncident(id, incidentId) {
  return supMutate(id, (s) => {
    const before = s.linkedIncidents.length;
    s.linkedIncidents = s.linkedIncidents.filter((x) => x !== incidentId);
    return s.linkedIncidents.length < before;
  });
}

/* ---------- dérivés --------------------------------------------- */

// Score de risque tiers l*i + bande couleur (échelle grc-risks.js).
function grcSupRiskScore(supplier) {
  const r = supplier && supplier.risk ? supplier.risk : {};
  const score = (Number(r.likelihood) || 1) * (Number(r.impact) || 1);
  let cls = "low";
  if (score >= 6) cls = "high";
  else if (score >= 3) cls = "medium";
  return { score: score, cls: cls, text: grcT("grc.fournisseurs.riskBand." + cls) };
}

// Alerte : fournisseur critique/vital ET risque résiduel (ou score) élevé.
function grcSupRiskAlert(supplier) {
  if (!supplier) return false;
  const crit = supplier.criticality === "vital" || supplier.criticality === "critique";
  const res = supplier.risk && supplier.risk.residual != null
    ? supplier.risk.residual
    : Math.ceil(grcSupRiskScore(supplier).score / 5);
  return crit && res >= 4;
}

function _supDaysUntil(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (isNaN(t)) return null;
  return Math.floor((t - Date.now()) / 86400000);
}

function grcSupCertExpired(supplier) {
  const list = (supplier && supplier.certifications) || [];
  return list.filter((c) => {
    const d = _supDaysUntil(c.expiresAt);
    return d != null && d < 0;
  });
}

function grcSupCertExpiringSoon(supplier, days) {
  const win = days == null ? GRC_SUP_SOON_DAYS : days;
  const list = (supplier && supplier.certifications) || [];
  return list.filter((c) => {
    const d = _supDaysUntil(c.expiresAt);
    return d != null && d >= 0 && d <= win;
  });
}

function grcSupIsReviewOverdue(supplier) {
  const r = supplier && supplier.lifecycle && supplier.lifecycle.review;
  if (!r || !r.lastReviewedAt) return true;
  const due = r.nextDueAt || grkAddMonths(r.lastReviewedAt, r.cadenceMonths || GRC_SUP_DEFAULT_CADENCE);
  const t = due ? Date.parse(due) : NaN;
  return isNaN(t) ? true : t < Date.now();
}

function grcSupCriticalWithoutAudit(supplier) {
  if (!supplier) return false;
  const crit = supplier.criticality === "vital" || supplier.criticality === "critique";
  return crit && !(supplier.contract && supplier.contract.rightToAudit);
}

// Contrat qui se termine bientôt SANS renouvellement automatique.
function grcSupContractEndingSoon(supplier, days) {
  const win = days == null ? GRC_SUP_SOON_DAYS : days;
  const c = supplier && supplier.contract;
  if (!c || !c.endDate || c.renewal === "auto") return false;
  const d = _supDaysUntil(c.endDate);
  return d != null && d <= win;
}

function grcSuppliersSummary(list) {
  const arr = Array.isArray(list) ? list.map(grcSupplierEnsureShape) : [];
  return {
    count: arr.length,
    certExpired: arr.filter((s) => grcSupCertExpired(s).length > 0).length,
    certSoon: arr.filter((s) => grcSupCertExpiringSoon(s).length > 0).length,
    reviewsOverdue: arr.filter(grcSupIsReviewOverdue).length,
    criticalNoAudit: arr
      .filter(grcSupCriticalWithoutAudit)
      .map((s) => s.name || s.id),
  };
}

/* ---------- import (tableau OU objet fournisseur unique) --------- */

async function importGrcSuppliersFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  if (Array.isArray(decoded)) {
    saveGrcSuppliers(decoded);
    return;
  }
  const isShape = decoded && typeof decoded === "object" &&
    typeof decoded.id === "string" && typeof decoded.name === "string";
  if (!isShape) throw new Error(grcT("grc.fournisseurs.invalidImport"));

  const list = getGrcSuppliers();
  const idx = list.findIndex((s) => s && s.id === decoded.id);
  if (idx === -1) list.push(decoded);
  else list[idx] = decoded;
  saveGrcSuppliers(list);
}

/* ================================================================== *
 *  Registre -- liste + formulaire + encart (grkRegistry, T2).
 *  Monté par grc/fournisseurs.html (#grcSuppliersRegistry /
 *  #grcSuppliersSummary). Panneau : renderSupplierPanel
 *  (grc-suppliers-panel.js, T3+).
 * ================================================================== */

// Criticité -> badge sur l'échelle partagée .grc-crit-badge (low/medium/
// high) : vital|critique -> high, important -> medium, mineur -> low.
function grcSupCritBadge(crit) {
  const c = GRC_SUP_CRITICALITY.indexOf(crit) !== -1 ? crit : "important";
  const cls = (c === "vital" || c === "critique") ? "high" : (c === "mineur" ? "low" : "medium");
  return { cls: cls, text: grcT("grc.fournisseurs.crit." + c) };
}

function _supEnumOptions(values, i18nPrefix) {
  return values.map((v) => ({ value: v, label: i18nPrefix + v }));
}

function initGrcSuppliersRegistry() {
  const init = grkRegistry({
    mount: "#grcSuppliersRegistry",
    summary: "#grcSuppliersSummary",
    store: _grcSupStore,
    schema: GRC_SUPPLIER_SCHEMA,
    idAttr: "data-supplier-id",
    listGlobal: "renderGrcSuppliersList",
    deepLink: true,
    i18n: {
      add: "grc.fournisseurs.form.addBtn",
      titleAdd: "grc.fournisseurs.form.title",
      titleEdit: "grc.fournisseurs.form.titleEdit",
    },
    form: [
      { id: "name", label: "grc.fournisseurs.form.name", type: "text", required: true },
      { id: "service", label: "grc.fournisseurs.form.service", type: "text" },
      { id: "owner", label: "grc.fournisseurs.form.owner", type: "text" },
      { id: "criticality", label: "grc.fournisseurs.form.criticality", type: "select",
        options: _supEnumOptions(GRC_SUP_CRITICALITY, "grc.fournisseurs.crit.") },
      { id: "dataShared", label: "grc.fournisseurs.form.dataShared", type: "select",
        options: _supEnumOptions(GRC_SUP_DATA_SHARED, "grc.fournisseurs.data.") },
      { id: "sites", label: "grc.fournisseurs.form.sites", type: "text" },
      { id: "status", label: "grc.fournisseurs.form.status", type: "select",
        options: _supEnumOptions(GRC_SUP_STATUS, "grc.fournisseurs.status.") },
    ],
    readForm: (s) => ({
      name: s.name, service: s.service, owner: s.owner,
      criticality: s.criticality, dataShared: s.dataShared,
      sites: s.sites, status: s.status,
    }),
    submit: (v, editingId) => {
      const fields = {
        name: (v.name || "").trim(), service: (v.service || "").trim(),
        owner: (v.owner || "").trim(), criticality: v.criticality,
        dataShared: v.dataShared, sites: (v.sites || "").trim(), status: v.status,
      };
      if (editingId) updateGrcSupplier(editingId, fields);
      else addGrcSupplier(fields);
    },
    header: (s) => {
      const crit = grcSupCritBadge(s.criticality);
      const rs = grcSupRiskScore(s);
      const cells = [
        { text: s.name || "" },
        { badge: { cls: crit.cls, text: crit.text } },
      ];
      const risk = document.createElement("span");
      risk.className = "grc-crit-badge " + rs.cls;
      risk.textContent = grcT("grc.fournisseurs.detail.risk").replace("{value}", rs.score);
      cells.push(risk);
      if (grcSupCertExpired(s).length) cells.push(_supMiniBadge("grc-sup-badge-expired", "grc.fournisseurs.badge.certExpired"));
      else if (grcSupCertExpiringSoon(s).length) cells.push(_supMiniBadge("grc-sup-badge-soon", "grc.fournisseurs.badge.certSoon"));
      if (grcSupIsReviewOverdue(s)) cells.push(_supMiniBadge("grc-sup-badge-review", "grc.fournisseurs.badge.reviewOverdue"));
      return cells;
    },
    panel: typeof renderSupplierPanel === "function" ? renderSupplierPanel : null,
    summarise: (list) => {
      const sm = grcSuppliersSummary(list);
      if (!sm.count) return { chips: [grcT("grc.fournisseurs.summary.none")] };
      const chips = [
        grcT("grc.fournisseurs.summary.count").replace("{n}", sm.count),
        grcT("grc.fournisseurs.summary.certExpired").replace("{n}", sm.certExpired),
        grcT("grc.fournisseurs.summary.certSoon").replace("{n}", sm.certSoon),
        grcT("grc.fournisseurs.summary.reviewsOverdue").replace("{n}", sm.reviewsOverdue),
      ];
      const gaps = sm.criticalNoAudit.length
        ? grcT("grc.fournisseurs.summary.criticalNoAudit") + " " + sm.criticalNoAudit.slice(0, 5).join(" · ")
        : null;
      return { chips: chips, gaps: gaps };
    },
    importFn: importGrcSuppliersFromJson,
    confirmName: (s) => s.name || "",
  });
  init();
}

function _supMiniBadge(cls, i18nKey) {
  const el = document.createElement("span");
  el.className = "grc-sup-mini-badge " + cls;
  el.textContent = grcT(i18nKey);
  return el;
}

/* ================================================================== *
 *  Exports (T7) -- via le kit (grkExport*). Rapport HTML autonome
 *  échappé, aucune annexe JSON brute, aucune requête réseau.
 * ================================================================== */

function _supReportTable(rows) {
  return "<table><tbody>" + rows.map((r) =>
    "<tr><th>" + grkEscapeHtml(r[0]) + "</th><td>" + grkEscapeHtml(r[1]) + "</td></tr>"
  ).join("") + "</tbody></table>";
}

function _supYesNo(b) {
  return grcT(b ? "grc.fournisseurs.report.yes" : "grc.fournisseurs.report.no");
}

// scope = un fournisseur OU un tableau de fournisseurs.
function supplierReportBody(scope) {
  const list = (Array.isArray(scope) ? scope : [scope]).map(grcSupplierEnsureShape);
  const L = (k) => grcT(k);
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = grkAuthorName();

  let h = "<h1>" + L("grc.fournisseurs.report.title") + "</h1>";
  h += "<p><strong>" + L("grc.fournisseurs.report.generatedOn") + " :</strong> " +
    grkEscapeHtml(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.fournisseurs.report.by") + " :</strong> " + grkEscapeHtml(author);
  h += "</p>";

  list.forEach((s) => {
    const rs = grcSupRiskScore(s);
    h += "<h2>" + grkEscapeHtml(s.name || "—") + "</h2>";
    h += _supReportTable([
      [L("grc.fournisseurs.form.service"), s.service],
      [L("grc.fournisseurs.form.owner"), s.owner],
      [L("grc.fournisseurs.form.criticality"), L("grc.fournisseurs.crit." + s.criticality)],
      [L("grc.fournisseurs.form.status"), L("grc.fournisseurs.status." + s.status)],
      [L("grc.fournisseurs.form.dataShared"), L("grc.fournisseurs.data." + s.dataShared)],
      [L("grc.fournisseurs.form.sites"), s.sites],
    ]);

    h += "<h3>" + L("grc.fournisseurs.tab.risque") + "</h3>";
    h += _supReportTable([
      [L("grc.fournisseurs.risk.likelihood"), s.risk.likelihood],
      [L("grc.fournisseurs.risk.impact"), s.risk.impact],
      [L("grc.fournisseurs.risk.score"), rs.score + " (" + rs.text + ")"],
      [L("grc.fournisseurs.risk.residual"), s.risk.residual == null ? "—" : s.risk.residual],
      [L("grc.fournisseurs.risk.inherentNotes"), s.risk.inherentNotes],
      [L("grc.fournisseurs.risk.controls"), s.risk.controls],
    ]);
    if (grcSupRiskAlert(s)) h += "<p><strong>⚠ " + L("grc.fournisseurs.risk.alert") + "</strong></p>";

    const c = s.contract;
    h += "<h3>" + L("grc.fournisseurs.tab.contrat") + "</h3>";
    h += _supReportTable([
      [L("grc.fournisseurs.contract.ref"), c.ref],
      [L("grc.fournisseurs.contract.startDate"), c.startDate ? c.startDate.slice(0, 10) : "—"],
      [L("grc.fournisseurs.contract.endDate"), c.endDate ? c.endDate.slice(0, 10) : "—"],
      [L("grc.fournisseurs.contract.renewal"), L("grc.fournisseurs.contract.renewal." + c.renewal)],
      [L("grc.fournisseurs.contract.securityClauses"), _supYesNo(c.securityClauses)],
      [L("grc.fournisseurs.contract.rightToAudit"), _supYesNo(c.rightToAudit)],
      [L("grc.fournisseurs.contract.exitPlan"), _supYesNo(c.exitPlan)],
      [L("grc.fournisseurs.contract.dpaSigned"), _supYesNo(c.dpaSigned)],
      [L("grc.fournisseurs.contract.breachNotifDelayH"), c.breachNotifDelayH == null ? "—" : c.breachNotifDelayH],
    ]);
    if (grcSupContractEndingSoon(s)) h += "<p><strong>⚠ " + L("grc.fournisseurs.contract.endingSoon") + "</strong></p>";

    h += "<h3>" + L("grc.fournisseurs.tab.certifs") + "</h3>";
    if (s.certifications.length) {
      h += "<table><thead><tr><th>" + L("grc.fournisseurs.cert.kind") + "</th><th>" +
        L("grc.fournisseurs.cert.scope") + "</th><th>" + L("grc.fournisseurs.cert.obtainedAt") +
        "</th><th>" + L("grc.fournisseurs.cert.expiresAt") + "</th></tr></thead><tbody>";
      s.certifications.forEach((ct) => {
        const exp = ct.expiresAt ? ct.expiresAt.slice(0, 10) : "—";
        const soon = grcSupCertExpired({ certifications: [ct] }).length ? " ⚠"
          : (grcSupCertExpiringSoon({ certifications: [ct] }).length ? " ⏳" : "");
        h += "<tr><td>" + grkEscapeHtml(L("grc.fournisseurs.certKind." + ct.kind)) +
          "</td><td>" + grkEscapeHtml(ct.scope) +
          "</td><td>" + grkEscapeHtml(ct.obtainedAt ? ct.obtainedAt.slice(0, 10) : "—") +
          "</td><td>" + grkEscapeHtml(exp) + soon + "</td></tr>";
      });
      h += "</tbody></table>";
    } else {
      h += "<p><em>" + L("grc.fournisseurs.report.none") + "</em></p>";
    }

    h += "<h3>" + L("grc.fournisseurs.tab.cycle") + "</h3>";
    h += _supReportTable([
      [L("grc.fournisseurs.cycle.onboardedAt"), s.lifecycle.onboardedAt ? s.lifecycle.onboardedAt.slice(0, 10) : "—"],
      [L("grc.fournisseurs.cycle.offboardedAt"), s.lifecycle.offboardedAt ? s.lifecycle.offboardedAt.slice(0, 10) : "—"],
      [L("grc.fournisseurs.cycle.lastReviewedAt"), s.lifecycle.review.lastReviewedAt ? s.lifecycle.review.lastReviewedAt.slice(0, 10) : "—"],
      [L("grc.fournisseurs.badge.reviewOverdue"), _supYesNo(grcSupIsReviewOverdue(s))],
    ]);

    if (s.lifecycle.steps.length) {
      h += "<ol>" + s.lifecycle.steps.map((st) =>
        "<li>" + (st.done ? "<s>" : "") + grkEscapeHtml(st.text) + (st.done ? "</s>" : "") +
        (st.owner ? " — " + grkEscapeHtml(st.owner) : "") + "</li>").join("") + "</ol>";
    }

    if (s.linkedIncidents.length) {
      h += "<h3>" + L("grc.fournisseurs.inc.linkedTitle") + "</h3><ul>" +
        s.linkedIncidents.map((i) => "<li>" + grkEscapeHtml(i) + "</li>").join("") + "</ul>";
    }
    if (s.notes) h += "<h3>" + grcT("grc.common.notesTitle") + "</h3><p>" + grkEscapeHtml(s.notes).replace(/\n/g, "<br>") + "</p>";
  });
  return h;
}

function supplierCardBody(supplier) {
  const s = grcSupplierEnsureShape(supplier);
  const L = (k) => grcT(k);
  const rs = grcSupRiskScore(s);
  let h = "<h1>" + grkEscapeHtml(s.name || "—") + "</h1>";
  h += _supReportTable([
    [L("grc.fournisseurs.form.criticality"), L("grc.fournisseurs.crit." + s.criticality)],
    [L("grc.fournisseurs.form.service"), s.service],
    [L("grc.fournisseurs.form.owner"), s.owner],
    [L("grc.fournisseurs.risk.score"), rs.score + " (" + rs.text + ")"],
    [L("grc.fournisseurs.contract.ref"), s.contract.ref],
    [L("grc.fournisseurs.contract.endDate"), s.contract.endDate ? s.contract.endDate.slice(0, 10) : "—"],
    [L("grc.fournisseurs.contract.rightToAudit"), _supYesNo(s.contract.rightToAudit)],
    [L("grc.fournisseurs.badge.reviewOverdue"), _supYesNo(grcSupIsReviewOverdue(s))],
  ]);
  const exp = grcSupCertExpired(s).concat(grcSupCertExpiringSoon(s));
  if (exp.length) {
    h += "<h3>" + L("grc.fournisseurs.tab.certifs") + "</h3><ul>" + exp.map((c) =>
      "<li>" + grkEscapeHtml(L("grc.fournisseurs.certKind." + c.kind)) + " — " +
      grkEscapeHtml(c.expiresAt ? c.expiresAt.slice(0, 10) : "—") + "</li>").join("") + "</ul>";
  }
  return h;
}

function _supSlug(s) {
  return grkSlug(s && s.name, "fournisseur");
}

function exportSupplierAsJson(scope) {
  const name = Array.isArray(scope)
    ? "fournisseurs-" + grkDateStamp() + ".json"
    : "fournisseur-" + _supSlug(scope) + "-" + grkDateStamp() + ".json";
  return grkExportJson(scope, name);
}

function exportSupplierReportAsWord(scope) {
  const base = Array.isArray(scope) ? "fournisseurs" : "fournisseur-" + _supSlug(scope);
  grkExportWord(supplierReportBody(scope), base + "-" + grkDateStamp() + ".doc",
    grcT("grc.fournisseurs.report.title"));
}

function exportSupplierReportAsPdf(scope) {
  grkPrintWindow(supplierReportBody(scope), grcT("grc.fournisseurs.report.title"));
}

function exportSupplierCard(supplier) {
  grkPrintWindow(supplierCardBody(supplier), grcT("grc.fournisseurs.card.title"));
}

function exportSuppliersCsv(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcSupplierEnsureShape);
  const rows = [["name", "service", "criticite", "risk_score",
    "cert_iso27001_expire", "revue_ok", "droit_audit"]];
  arr.forEach((s) => {
    const iso = s.certifications.find((c) => c.kind === "iso27001");
    rows.push([
      s.name, s.service, s.criticality, grcSupRiskScore(s).score,
      iso && iso.expiresAt ? iso.expiresAt.slice(0, 10) : "",
      grcSupIsReviewOverdue(s) ? "0" : "1",
      s.contract.rightToAudit ? "1" : "0",
    ]);
  });
  grkExportCsv(rows, "fournisseurs-" + grkDateStamp() + ".csv");
}
