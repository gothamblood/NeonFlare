/* Vie privée -- registre des traitements (ROPA) + journal des demandes
   des personnes (DSR) + registre des bris de confidentialité. Bâti sur
   grc-registry-kit.js (grk*). Voir spec/grc-registry-upgrades/
   50-privacy-loi25.md et 90-privacy-loi25-plus.md.

   UN SEUL store /grc/privacy/registry, discriminé par `kind` :
   "processing" (ROPA), "dsr" ou "breach" (bris de confidentialité,
   90-privacy-loi25-plus.md). Aligné Loi 25 (Québec) / LPRPDE,
   ISO/IEC 27001 A.5.34, NIST CSF GV.PO / PR.DS. Tout le texte affiché
   passe par grcT() ; les enums GRC_PRIV_* restent des clés internes.

   État (50-privacy-loi25.md §6, 90-privacy-loi25-plus.md §6) :
   - T1..T10 (50-privacy-loi25.md) : livrés.
   - 90-privacy-loi25-plus T1/T2 : catégories structurées, consentements,
     lien fournisseurs, destruction/date prévue, statut DPIA +
     approbation, 3e kind "breach".  <-- ICI */

const GRC_PRIVACY_KEY = "/grc/privacy/registry";

const GRC_PRIV_LEGAL_BASIS = ["consent", "contract", "legal-obligation",
  "legitimate-interest", "vital-interest"];
const GRC_PRIV_TRANSFER_SAFEGUARDS = ["adequacy", "contract", "consent", "none"];
const GRC_PRIV_DSR_TYPES = ["access", "rectification", "deletion", "portability",
  "consent-withdrawal", "objection"];
const GRC_PRIV_DSR_STATUSES = ["received", "in-progress", "fulfilled", "refused", "closed"];
const GRC_PRIV_DSR_OPEN_STATUSES = ["received", "in-progress"];
const GRC_PRIV_DSR_DELAY_DAYS = 30;
const GRC_PRIV_DEFAULT_CADENCE = 12;

// EFVP -- workflow d'approbation formel (90-privacy-loi25-plus.md §2.1).
const GRC_PRIV_DPIA_STATUSES = ["draft", "in-progress", "approved"];

// Consentements (90-privacy-loi25-plus.md §2.1) -- registre par traitement.
const GRC_PRIV_CONSENT_TYPES = ["explicit", "implicit", "opt-in", "opt-out"];

// Bris de confidentialité (90-privacy-loi25-plus.md §2.2). Sévérité alignée
// sur les classes CSS déjà stylées (.grc-crit-badge low/medium/high).
const GRC_PRIV_BREACH_SEVERITIES = ["low", "medium", "high"];
const GRC_PRIV_BREACH_STATUSES = ["open", "contained", "closed"];
// Délai indicatif d'alerte UI seulement -- PAS une valeur légale figée
// (90-privacy-loi25-plus.md §4 Q4, à confirmer avec un conseiller juridique).
const GRC_PRIV_BREACH_NOTIF_ALERT_DAYS = 60;

/* ---------- descripteurs grkEnsure (schema 1) ------------------ */

const GRC_PRIV_TRANSFER_SCHEMA = {
  id: { type: "string" },
  destination: { type: "string" },
  safeguard: { type: "string", enum: GRC_PRIV_TRANSFER_SAFEGUARDS, default: "contract" },
  note: { type: "string" },
};

// Catégorie de données structurée (90-privacy-loi25-plus.md §2.1) --
// `dataCategories` (string, legacy) reste le résumé libre / repli si
// cette liste est vide ; aucune migration forcée.
const GRC_PRIV_DATACAT_SCHEMA = {
  id: { type: "string" },
  label: { type: "string" },
  sensitivity: { type: "number", default: null },
  volumeApprox: { type: "string" },
  source: { type: "string" },
};

const GRC_PRIV_CONSENT_SCHEMA = {
  id: { type: "string" },
  type: { type: "string", enum: GRC_PRIV_CONSENT_TYPES, default: "explicit" },
  obtainedAt: { type: "iso" },
  expiresAt: { type: "iso" },
  withdrawnAt: { type: "iso" },
  proof: { type: "string" },
};

const GRC_PROCESSING_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  kind: { type: "string", default: "processing" },
  name: { type: "string" },
  purpose: { type: "string" },
  owner: { type: "string" },
  legalBasis: { type: "string", enum: GRC_PRIV_LEGAL_BASIS, default: "consent" },
  dataCategories: { type: "string" },
  dataCategoryList: { type: "array", of: GRC_PRIV_DATACAT_SCHEMA },
  dataSubjects: { type: "string" },
  recipients: { type: "string" },
  recipientSupplierIds: { type: "array" },
  transfers: { type: "array", of: GRC_PRIV_TRANSFER_SCHEMA },
  consents: { type: "array", of: GRC_PRIV_CONSENT_SCHEMA },
  retention: {
    type: "object", of: {
      policy: { type: "string" },
      months: { type: "number", default: null },
      basis: { type: "string" },
      anchor: { type: "iso" },   // date de dernière collecte (P4) -- optionnel
      destructionMethod: { type: "string" },
      plannedDeletionAt: { type: "iso" },
    },
  },
  security: { type: "string" },
  dpia: {
    type: "object", of: {
      required: { type: "bool", default: false },
      sensitivity: { type: "number", default: null },
      volume: { type: "number", default: null },
      exposure: { type: "number", default: null },
      doneAt: { type: "iso" },
      conclusion: { type: "string" },
      status: { type: "string", enum: GRC_PRIV_DPIA_STATUSES, default: "draft" },
      approvedAt: { type: "iso" },
      approvedBy: { type: "string" },
    },
  },
  review: {
    type: "object", of: {
      lastReviewedAt: { type: "iso" },
      nextDueAt: { type: "iso" },
      cadenceMonths: { type: "number", default: GRC_PRIV_DEFAULT_CADENCE },
    },
  },
};

const GRC_DSR_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  kind: { type: "string", default: "dsr" },
  type: { type: "string", enum: GRC_PRIV_DSR_TYPES, default: "access" },
  requester: { type: "string" },
  receivedAt: { type: "iso" },
  dueAt: { type: "iso" },
  status: { type: "string", enum: GRC_PRIV_DSR_STATUSES, default: "received" },
  processingIds: { type: "array" },
  response: { type: "string" },
  refusalReason: { type: "string" },
};

// Bris de confidentialité -- 90-privacy-loi25-plus.md §2.2.
const GRC_BREACH_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  kind: { type: "string", default: "breach" },
  description: { type: "string" },
  occurredAt: { type: "iso" },
  discoveredAt: { type: "iso" },
  affectedCount: { type: "number", default: null },
  severity: { type: "string", enum: GRC_PRIV_BREACH_SEVERITIES, default: "low" },
  caiNotified: { type: "bool", default: false },
  caiNotifiedAt: { type: "iso" },
  individualsNotified: { type: "bool", default: false },
  individualsNotifiedAt: { type: "iso" },
  correctiveMeasures: { type: "string" },
  status: { type: "string", enum: GRC_PRIV_BREACH_STATUSES, default: "open" },
  linkedProcessingIds: { type: "array" },
  linkedIncidentId: { type: "string" },
};

function grcPrivIsDsr(entry) {
  return entry && entry.kind === "dsr";
}

function grcPrivIsBreach(entry) {
  return entry && entry.kind === "breach";
}

function grcPrivacyEnsureShape(entry) {
  const kind = entry && entry.kind === "dsr" ? "dsr" : (entry && entry.kind === "breach" ? "breach" : "processing");
  const schema = kind === "dsr" ? GRC_DSR_SCHEMA : (kind === "breach" ? GRC_BREACH_SCHEMA : GRC_PROCESSING_SCHEMA);
  const e = grkEnsure(entry, schema);
  e.id = entry && typeof entry.id === "string" ? entry.id : (e.id || "");
  e.kind = kind;
  if (kind === "dsr") {
    if (e.receivedAt && !e.dueAt) e.dueAt = grkAddDays(e.receivedAt, GRC_PRIV_DSR_DELAY_DAYS);
  } else if (kind === "processing") {
    const r = e.review;
    if (r.lastReviewedAt && !r.nextDueAt) {
      r.nextDueAt = grkAddMonths(r.lastReviewedAt, r.cadenceMonths || GRC_PRIV_DEFAULT_CADENCE);
    }
  }
  return e;
}

// grkAddDays : petit complément local (le kit a grkAddMonths mais pas -Days).
function grkAddDays(iso, n) {
  const t = Date.parse(iso);
  if (isNaN(t)) return null;
  return new Date(t + (Number(n) || 0) * 86400000).toISOString();
}

/* ---------- store -------------------------------------------- */

const _grcPrivacyStore = grkStore(GRC_PRIVACY_KEY);

function getGrcPrivacy() { return _grcPrivacyStore.get(); }
function saveGrcPrivacy(list) { _grcPrivacyStore.save(list); }
function resetGrcPrivacy() { _grcPrivacyStore.remove(); }

function getGrcProcessings() { return getGrcPrivacy().filter((e) => e && e.kind !== "dsr" && e.kind !== "breach"); }
function getGrcDsrs() { return getGrcPrivacy().filter(grcPrivIsDsr); }
function getGrcBreaches() { return getGrcPrivacy().filter(grcPrivIsBreach); }

function _addGrcPrivacyEntry(entry, kind) {
  const list = getGrcPrivacy();
  const shaped = grcPrivacyEnsureShape(Object.assign({ kind: kind }, entry || {}));
  shaped.id = grkId(kind === "dsr" ? "dsr" : (kind === "breach" ? "breach" : "proc"));
  if (kind === "dsr" && !shaped.receivedAt) {
    shaped.receivedAt = new Date().toISOString();
    shaped.dueAt = grkAddDays(shaped.receivedAt, GRC_PRIV_DSR_DELAY_DAYS);
  }
  list.push(shaped);
  saveGrcPrivacy(list);
  return shaped.id;
}

function addGrcProcessing(entry) { return _addGrcPrivacyEntry(entry, "processing"); }
function addGrcDsr(entry) { return _addGrcPrivacyEntry(entry, "dsr"); }
function addGrcBreach(entry) { return _addGrcPrivacyEntry(entry, "breach"); }

function updateGrcPrivacyEntry(id, changes) {
  const list = getGrcPrivacy();
  const idx = list.findIndex((e) => e && e.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveGrcPrivacy(list);
}

function removeGrcPrivacyEntry(id) {
  saveGrcPrivacy(getGrcPrivacy().filter((e) => e && e.id !== id));
}

function privMutate(id, fn) {
  return grkMutate(_grcPrivacyStore, id, grcPrivacyEnsureShape, fn);
}

/* ---------- traitement : sous-objets ------------------------- */

function grcPrivSetProcessingCore(id, changes) {
  return privMutate(id, (e) => {
    ["name", "purpose", "owner", "dataCategories", "dataSubjects", "recipients", "security"]
      .forEach((k) => { if (k in changes && typeof changes[k] === "string") e[k] = changes[k].trim(); });
    if ("legalBasis" in changes && GRC_PRIV_LEGAL_BASIS.indexOf(changes.legalBasis) !== -1) e.legalBasis = changes.legalBasis;
    return true;
  });
}

function grcPrivSetRetention(id, patch) {
  return privMutate(id, (e) => {
    const r = e.retention;
    const p = patch || {};
    if ("policy" in p && typeof p.policy === "string") r.policy = p.policy;
    if ("basis" in p && typeof p.basis === "string") r.basis = p.basis;
    if ("months" in p) r.months = grkNumOrNull(p.months);
    if ("anchor" in p) r.anchor = grkToIso(p.anchor);
    if ("destructionMethod" in p && typeof p.destructionMethod === "string") r.destructionMethod = p.destructionMethod;
    if ("plannedDeletionAt" in p) r.plannedDeletionAt = grkToIso(p.plannedDeletionAt);
    return true;
  });
}

function grcPrivSetDpia(id, patch) {
  return privMutate(id, (e) => {
    const d = e.dpia;
    const p = patch || {};
    if ("required" in p) d.required = !!p.required;
    ["sensitivity", "volume", "exposure"].forEach((k) => {
      if (k in p) {
        const n = Math.round(Number(p[k]));
        d[k] = Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
      }
    });
    if ("doneAt" in p) d.doneAt = grkToIso(p.doneAt);
    if ("conclusion" in p && typeof p.conclusion === "string") d.conclusion = p.conclusion;
    if ("status" in p && GRC_PRIV_DPIA_STATUSES.indexOf(p.status) !== -1) {
      d.status = p.status;
      // Rétrograder hors "approved" invalide l'approbation précédente --
      // évite une fiche qui affiche "Approuvée" avec une date obsolète.
      if (p.status !== "approved") { d.approvedAt = null; d.approvedBy = null; }
    }
    if ("approvedAt" in p) d.approvedAt = grkToIso(p.approvedAt);
    if ("approvedBy" in p && typeof p.approvedBy === "string") d.approvedBy = p.approvedBy;
    return true;
  });
}

function grcPrivAddTransfer(id, transfer) {
  return privMutate(id, (e) => {
    const t = grkEnsure(transfer || {}, GRC_PRIV_TRANSFER_SCHEMA);
    t.id = grkId("xfer");
    e.transfers.push(t);
    return t.id;
  });
}

function grcPrivUpdateTransfer(id, xferId, changes) {
  return privMutate(id, (e) => {
    const t = e.transfers.find((x) => x.id === xferId);
    if (!t) return false;
    const n = Object.assign({}, changes);
    if ("safeguard" in n && GRC_PRIV_TRANSFER_SAFEGUARDS.indexOf(n.safeguard) === -1) delete n.safeguard;
    Object.assign(t, n);
    return true;
  });
}

function grcPrivRemoveTransfer(id, xferId) {
  return privMutate(id, (e) => {
    const before = e.transfers.length;
    e.transfers = e.transfers.filter((x) => x.id !== xferId);
    return e.transfers.length < before;
  });
}

/* ---------- traitement : catégories de données structurées --- */

function grcPrivAddDataCategory(id, cat) {
  return privMutate(id, (e) => {
    const c = grkEnsure(cat || {}, GRC_PRIV_DATACAT_SCHEMA);
    c.id = grkId("cat");
    e.dataCategoryList.push(c);
    return c.id;
  });
}

function grcPrivUpdateDataCategory(id, catId, changes) {
  return privMutate(id, (e) => {
    const c = e.dataCategoryList.find((x) => x.id === catId);
    if (!c) return false;
    const n = Object.assign({}, changes);
    if ("sensitivity" in n) {
      const v = Math.round(Number(n.sensitivity));
      n.sensitivity = Number.isFinite(v) && v >= 1 && v <= 5 ? v : null;
    }
    Object.assign(c, n);
    return true;
  });
}

function grcPrivRemoveDataCategory(id, catId) {
  return privMutate(id, (e) => {
    const before = e.dataCategoryList.length;
    e.dataCategoryList = e.dataCategoryList.filter((x) => x.id !== catId);
    return e.dataCategoryList.length < before;
  });
}

function grcPrivMoveDataCategory(id, catId, dir) {
  return privMutate(id, (e) => {
    const arr = e.dataCategoryList;
    const i = arr.findIndex((x) => x.id === catId);
    const j = i + (dir < 0 ? -1 : 1);
    if (i === -1 || j < 0 || j >= arr.length) return false;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    return true;
  });
}

/* ---------- traitement : consentements ------------------------ */

function grcPrivAddConsent(id, consent) {
  return privMutate(id, (e) => {
    const c = grkEnsure(consent || {}, GRC_PRIV_CONSENT_SCHEMA);
    c.id = grkId("consent");
    e.consents.push(c);
    return c.id;
  });
}

function grcPrivUpdateConsent(id, consentId, changes) {
  return privMutate(id, (e) => {
    const c = e.consents.find((x) => x.id === consentId);
    if (!c) return false;
    const n = Object.assign({}, changes);
    if ("type" in n && GRC_PRIV_CONSENT_TYPES.indexOf(n.type) === -1) delete n.type;
    ["obtainedAt", "expiresAt", "withdrawnAt"].forEach((k) => { if (k in n) n[k] = grkToIso(n[k]); });
    Object.assign(c, n);
    return true;
  });
}

function grcPrivRemoveConsent(id, consentId) {
  return privMutate(id, (e) => {
    const before = e.consents.length;
    e.consents = e.consents.filter((x) => x.id !== consentId);
    return e.consents.length < before;
  });
}

function grcPrivMoveConsent(id, consentId, dir) {
  return privMutate(id, (e) => {
    const arr = e.consents;
    const i = arr.findIndex((x) => x.id === consentId);
    const j = i + (dir < 0 ? -1 : 1);
    if (i === -1 || j < 0 || j >= arr.length) return false;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    return true;
  });
}

/* ---------- traitement : destinataires <-> fournisseurs ------- */

function grcPrivAddRecipientSupplier(id, supplierId) {
  return privMutate(id, (e) => {
    const v = String(supplierId || "").trim();
    if (!v || e.recipientSupplierIds.indexOf(v) !== -1) return false;
    e.recipientSupplierIds.push(v);
    return true;
  });
}

function grcPrivRemoveRecipientSupplier(id, supplierId) {
  return privMutate(id, (e) => {
    const before = e.recipientSupplierIds.length;
    e.recipientSupplierIds = e.recipientSupplierIds.filter((x) => x !== supplierId);
    return e.recipientSupplierIds.length < before;
  });
}

/* ---------- DSR : sous-objets ------------------------------- */

function grcPrivSetDsrCore(id, changes) {
  return privMutate(id, (e) => {
    if ("type" in changes && GRC_PRIV_DSR_TYPES.indexOf(changes.type) !== -1) e.type = changes.type;
    if ("status" in changes && GRC_PRIV_DSR_STATUSES.indexOf(changes.status) !== -1) e.status = changes.status;
    if ("requester" in changes && typeof changes.requester === "string") e.requester = changes.requester.trim();
    if ("receivedAt" in changes) {
      e.receivedAt = grkToIso(changes.receivedAt);
      if (e.receivedAt && !("dueAt" in changes)) e.dueAt = grkAddDays(e.receivedAt, GRC_PRIV_DSR_DELAY_DAYS);
    }
    if ("dueAt" in changes) e.dueAt = grkToIso(changes.dueAt);
    return true;
  });
}

function grcPrivSetDsrResponse(id, changes) {
  return privMutate(id, (e) => {
    if ("response" in changes && typeof changes.response === "string") e.response = changes.response;
    if ("refusalReason" in changes && typeof changes.refusalReason === "string") e.refusalReason = changes.refusalReason;
    return true;
  });
}

function grcPrivAddDsrProcessing(id, processingId) {
  return privMutate(id, (e) => {
    const v = String(processingId || "").trim();
    if (!v || e.processingIds.indexOf(v) !== -1) return false;
    e.processingIds.push(v);
    return true;
  });
}

function grcPrivRemoveDsrProcessing(id, processingId) {
  return privMutate(id, (e) => {
    const before = e.processingIds.length;
    e.processingIds = e.processingIds.filter((x) => x !== processingId);
    return e.processingIds.length < before;
  });
}

/* ---------- Bris de confidentialité : sous-objets ------------- */

function grcPrivSetBreachCore(id, changes) {
  return privMutate(id, (e) => {
    if ("description" in changes && typeof changes.description === "string") e.description = changes.description.trim();
    if ("occurredAt" in changes) e.occurredAt = grkToIso(changes.occurredAt);
    if ("discoveredAt" in changes) e.discoveredAt = grkToIso(changes.discoveredAt);
    if ("affectedCount" in changes) e.affectedCount = grkNumOrNull(changes.affectedCount);
    if ("severity" in changes && GRC_PRIV_BREACH_SEVERITIES.indexOf(changes.severity) !== -1) e.severity = changes.severity;
    if ("status" in changes && GRC_PRIV_BREACH_STATUSES.indexOf(changes.status) !== -1) e.status = changes.status;
    return true;
  });
}

function grcPrivSetBreachNotifications(id, changes) {
  return privMutate(id, (e) => {
    if ("caiNotified" in changes) {
      e.caiNotified = !!changes.caiNotified;
      if (!e.caiNotified) e.caiNotifiedAt = null;
    }
    if ("caiNotifiedAt" in changes) e.caiNotifiedAt = grkToIso(changes.caiNotifiedAt);
    if ("individualsNotified" in changes) {
      e.individualsNotified = !!changes.individualsNotified;
      if (!e.individualsNotified) e.individualsNotifiedAt = null;
    }
    if ("individualsNotifiedAt" in changes) e.individualsNotifiedAt = grkToIso(changes.individualsNotifiedAt);
    return true;
  });
}

function grcPrivSetBreachFollowup(id, changes) {
  return privMutate(id, (e) => {
    if ("correctiveMeasures" in changes && typeof changes.correctiveMeasures === "string") e.correctiveMeasures = changes.correctiveMeasures;
    if ("linkedIncidentId" in changes && typeof changes.linkedIncidentId === "string") e.linkedIncidentId = changes.linkedIncidentId.trim();
    return true;
  });
}

function grcPrivAddBreachProcessing(id, processingId) {
  return privMutate(id, (e) => {
    const v = String(processingId || "").trim();
    if (!v || e.linkedProcessingIds.indexOf(v) !== -1) return false;
    e.linkedProcessingIds.push(v);
    return true;
  });
}

function grcPrivRemoveBreachProcessing(id, processingId) {
  return privMutate(id, (e) => {
    const before = e.linkedProcessingIds.length;
    e.linkedProcessingIds = e.linkedProcessingIds.filter((x) => x !== processingId);
    return e.linkedProcessingIds.length < before;
  });
}

/* ---------- dérivés --------------------------------------- */

// Score DPIA = sensibilité × volume × exposition (1-5 chacun) ; bande.
function grcPrivDpiaScoreBand(entry) {
  const d = entry && entry.dpia ? entry.dpia : {};
  if (d.sensitivity == null || d.volume == null || d.exposure == null) {
    return { score: null, cls: "info", text: grcT("grc.vie-privee.dpia.band.na") };
  }
  const score = d.sensitivity * d.volume * d.exposure;
  let cls = "low";
  if (score >= 45) cls = "high";
  else if (score >= 20) cls = "medium";
  return { score: score, cls: cls, text: grcT("grc.vie-privee.dpia.band." + cls) };
}

// DPIA requise mais pas faite (pas de doneAt).
function grcPrivDpiaRequiredNotDone(entry) {
  const d = entry && entry.dpia;
  return !!(d && d.required && !d.doneAt);
}

// DPIA réalisée (doneAt) mais pas encore approuvée formellement --
// 90-privacy-loi25-plus.md §2.1/§3.1.
function grcPrivDpiaApprovalPending(entry) {
  const d = entry && entry.dpia;
  return !!(d && d.required && d.doneAt && d.status !== "approved");
}

// Conservation échue : anchor + months < maintenant (dégradé si pas d'anchor).
function grcPrivRetentionExpired(entry) {
  const r = entry && entry.retention;
  if (!r || r.months == null || !r.anchor) return false;
  const t = Date.parse(r.anchor);
  if (isNaN(t)) return false;
  return t + r.months * 30 * 86400000 < Date.now();
}

// DSR en retard : dueAt passé + statut encore ouvert.
function grcPrivDsrOverdue(entry) {
  if (!grcPrivIsDsr(entry) || !entry.dueAt) return false;
  if (GRC_PRIV_DSR_OPEN_STATUSES.indexOf(entry.status) === -1) return false;
  const t = Date.parse(entry.dueAt);
  return !isNaN(t) && t < Date.now();
}

// Transfert sans garantie adéquate.
function grcPrivHasUnsafeTransfer(entry) {
  return !!(entry && Array.isArray(entry.transfers) &&
    entry.transfers.some((t) => t && t.safeguard === "none"));
}

// Bris à gravité élevée pas encore notifié à la CAI.
function grcPrivBreachCaiRequired(entry) {
  return !!(entry && grcPrivIsBreach(entry) && entry.severity === "high" && !entry.caiNotified);
}

// Alerte indicative (délai non légal, cf. GRC_PRIV_BREACH_NOTIF_ALERT_DAYS).
function grcPrivBreachNotificationOverdue(entry) {
  if (!grcPrivIsBreach(entry) || entry.severity !== "high" || entry.caiNotified) return false;
  const t = Date.parse(entry.discoveredAt || entry.occurredAt);
  return !isNaN(t) && (Date.now() - t) > GRC_PRIV_BREACH_NOTIF_ALERT_DAYS * 86400000;
}

function grcPrivacySummary(list) {
  const arr = Array.isArray(list) ? list.map(grcPrivacyEnsureShape) : [];
  const procs = arr.filter((e) => e.kind !== "dsr" && e.kind !== "breach");
  const dsrs = arr.filter(grcPrivIsDsr);
  const breaches = arr.filter(grcPrivIsBreach);
  const openDue = dsrs
    .filter((e) => GRC_PRIV_DSR_OPEN_STATUSES.indexOf(e.status) !== -1 && e.dueAt)
    .map((e) => Date.parse(e.dueAt))
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);
  return {
    processings: procs.length,
    dsrs: dsrs.length,
    dpiaRequiredNotDone: procs.filter(grcPrivDpiaRequiredNotDone).length,
    dpiaPendingApproval: procs.filter(grcPrivDpiaApprovalPending).length,
    retentionExpired: procs.filter(grcPrivRetentionExpired).length,
    unsafeTransfers: procs.filter(grcPrivHasUnsafeTransfer).length,
    dsrOverdue: dsrs.filter(grcPrivDsrOverdue).length,
    nextDsrDue: openDue.length ? new Date(openDue[0]).toISOString() : null,
    breaches: breaches.length,
    breachesOpen: breaches.filter((e) => e.status !== "closed").length,
    breachesCaiPending: breaches.filter(grcPrivBreachCaiRequired).length,
  };
}

/* ---------- import (tableau OU entité unique) -------------- */

async function importGrcPrivacyFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  if (Array.isArray(decoded)) {
    saveGrcPrivacy(decoded);
    return;
  }
  const isShape = decoded && typeof decoded === "object" && typeof decoded.id === "string" &&
    (decoded.kind === "dsr" || decoded.kind === "breach" || typeof decoded.name === "string" ||
      typeof decoded.purpose === "string" || typeof decoded.description === "string");
  if (!isShape) throw new Error(grcT("grc.vie-privee.invalidImport"));

  const list = getGrcPrivacy();
  const idx = list.findIndex((e) => e && e.id === decoded.id);
  if (idx === -1) list.push(decoded);
  else list[idx] = decoded;
  saveGrcPrivacy(list);
}

/* ================================================================== *
 *  Registre -- toggle Traitements / Demandes / Bris + 3 grkRegistry
 *  (filtrés par kind, même store) + encart commun (T2).
 *  Monté par grc/vie-privee.html (#grcPrivacyRegistry / #grcPrivacySummary).
 * ================================================================== */

function _privEnumOptions(values, prefix) {
  return values.map((v) => ({ value: v, label: prefix + v }));
}

function _privMiniBadge(cls, i18nKey) {
  const el = document.createElement("span");
  el.className = "grc-sup-mini-badge " + cls;
  el.textContent = grcT(i18nKey);
  return el;
}

function _privSummarise() {
  // Lit le store BRUT (cf. grc-compliance.js _cmpSummarise) : chaque
  // registre pré-`ensure`d avec son schema mange les champs des autres kind.
  const sm = grcPrivacySummary(getGrcPrivacy());
  if (!sm.processings && !sm.dsrs && !sm.breaches) return { chips: [grcT("grc.vie-privee.summary.none")] };
  const chips = [
    grcT("grc.vie-privee.summary.processings").replace("{n}", sm.processings),
    grcT("grc.vie-privee.summary.dsrs").replace("{n}", sm.dsrs),
    grcT("grc.vie-privee.summary.dpiaNotDone").replace("{n}", sm.dpiaRequiredNotDone),
    grcT("grc.vie-privee.summary.dpiaPendingApproval").replace("{n}", sm.dpiaPendingApproval),
    grcT("grc.vie-privee.summary.retentionExpired").replace("{n}", sm.retentionExpired),
    grcT("grc.vie-privee.summary.dsrOverdue").replace("{n}", sm.dsrOverdue),
    grcT("grc.vie-privee.summary.breachesOpen").replace("{n}", sm.breachesOpen),
  ];
  const gapsList = [];
  if (sm.nextDsrDue) gapsList.push(grcT("grc.vie-privee.summary.nextDsr").replace("{value}", grkFmtDateTime(sm.nextDsrDue)));
  if (sm.breachesCaiPending) gapsList.push(grcT("grc.vie-privee.summary.breachCaiPending").replace("{n}", sm.breachesCaiPending));
  return { chips: chips, gaps: gapsList.length ? gapsList.join(" · ") : null };
}

function initGrcPrivacyRegistry() {
  const host = document.querySelector("#grcPrivacyRegistry");
  if (!host) return;
  host.innerHTML = "";

  // Toggle segmenté Traitements / Demandes / Bris.
  const bar = document.createElement("div");
  bar.className = "grc-priv-kindbar";
  const procBtn = document.createElement("button");
  procBtn.type = "button";
  procBtn.className = "grc-priv-kindbtn is-active";
  procBtn.textContent = grcT("grc.vie-privee.filter.processing");
  const dsrBtn = document.createElement("button");
  dsrBtn.type = "button";
  dsrBtn.className = "grc-priv-kindbtn";
  dsrBtn.textContent = grcT("grc.vie-privee.filter.dsr");
  const breachBtn = document.createElement("button");
  breachBtn.type = "button";
  breachBtn.className = "grc-priv-kindbtn";
  breachBtn.textContent = grcT("grc.vie-privee.filter.breach");
  bar.appendChild(procBtn);
  bar.appendChild(dsrBtn);
  bar.appendChild(breachBtn);
  host.appendChild(bar);

  const procMount = document.createElement("div");
  procMount.id = "grcPrivacyProcList";
  const dsrMount = document.createElement("div");
  dsrMount.id = "grcPrivacyDsrList";
  dsrMount.hidden = true;
  const breachMount = document.createElement("div");
  breachMount.id = "grcPrivacyBreachList";
  breachMount.hidden = true;
  host.appendChild(procMount);
  host.appendChild(dsrMount);
  host.appendChild(breachMount);

  const showKind = (kind) => {
    procMount.hidden = kind !== "processing";
    dsrMount.hidden = kind !== "dsr";
    breachMount.hidden = kind !== "breach";
    procBtn.classList.toggle("is-active", kind === "processing");
    dsrBtn.classList.toggle("is-active", kind === "dsr");
    breachBtn.classList.toggle("is-active", kind === "breach");
    if (kind === "processing" && window.renderGrcProcessingsList) window.renderGrcProcessingsList();
    else if (kind === "dsr" && window.renderGrcDsrsList) window.renderGrcDsrsList();
    else if (kind === "breach" && window.renderGrcBreachesList) window.renderGrcBreachesList();
  };
  procBtn.addEventListener("click", () => showKind("processing"));
  dsrBtn.addEventListener("click", () => showKind("dsr"));
  breachBtn.addEventListener("click", () => showKind("breach"));

  /* --- registre Traitements --- */
  grkRegistry({
    mount: "#grcPrivacyProcList",
    summary: "#grcPrivacySummary",
    store: _grcPrivacyStore,
    schema: GRC_PROCESSING_SCHEMA,
    idAttr: "data-priv-id",
    listGlobal: "renderGrcProcessingsList",
    deepLink: true,
    filter: (e) => e.kind !== "dsr" && e.kind !== "breach",
    i18n: {
      add: "grc.vie-privee.proc.addBtn",
      titleAdd: "grc.vie-privee.proc.title",
      titleEdit: "grc.vie-privee.proc.titleEdit",
    },
    form: [
      { id: "name", label: "grc.vie-privee.proc.name", type: "text", required: true },
      { id: "purpose", label: "grc.vie-privee.proc.purpose", type: "text" },
      { id: "owner", label: "grc.vie-privee.proc.owner", type: "text" },
      { id: "legalBasis", label: "grc.vie-privee.proc.legalBasis", type: "select",
        options: _privEnumOptions(GRC_PRIV_LEGAL_BASIS, "grc.vie-privee.lb.") },
    ],
    readForm: (e) => ({ name: e.name, purpose: e.purpose, owner: e.owner, legalBasis: e.legalBasis }),
    submit: (v, editingId) => {
      const fields = {
        name: (v.name || "").trim(), purpose: (v.purpose || "").trim(),
        owner: (v.owner || "").trim(), legalBasis: v.legalBasis,
      };
      if (editingId) updateGrcPrivacyEntry(editingId, fields);
      else addGrcProcessing(fields);
    },
    header: (e) => {
      const band = grcPrivDpiaScoreBand(e);
      const cells = [{ text: e.name || "" }];
      const b = document.createElement("span");
      b.className = "grc-crit-badge " + band.cls;
      b.textContent = grcT("grc.vie-privee.detail.dpia").replace("{value}", band.text);
      cells.push(b);
      if (grcPrivDpiaRequiredNotDone(e)) cells.push(_privMiniBadge("grc-sup-badge-expired", "grc.vie-privee.dpia.notDoneAlert"));
      if (grcPrivDpiaApprovalPending(e)) cells.push(_privMiniBadge("grc-sup-badge-review", "grc.vie-privee.dpia.pendingApprovalAlert"));
      if (grcPrivRetentionExpired(e)) cells.push(_privMiniBadge("grc-sup-badge-review", "grc.vie-privee.ret.expiredAlert"));
      if (grcPrivHasUnsafeTransfer(e)) cells.push(_privMiniBadge("grc-sup-badge-expired", "grc.vie-privee.xfer.unsafeAlert"));
      return cells;
    },
    panel: typeof renderProcessingPanel === "function" ? renderProcessingPanel : null,
    summarise: _privSummarise,
    importFn: importGrcPrivacyFromJson,
    confirmName: (e) => e.name || "",
  })();

  /* --- registre Demandes (DSR) --- */
  grkRegistry({
    mount: "#grcPrivacyDsrList",
    summary: "#grcPrivacySummary",
    store: _grcPrivacyStore,
    schema: GRC_DSR_SCHEMA,
    idAttr: "data-priv-id",
    listGlobal: "renderGrcDsrsList",
    deepLink: true,
    filter: grcPrivIsDsr,
    i18n: {
      add: "grc.vie-privee.dsr.addBtn",
      titleAdd: "grc.vie-privee.dsr.title",
      titleEdit: "grc.vie-privee.dsr.titleEdit",
    },
    form: [
      { id: "type", label: "grc.vie-privee.dsr.type", type: "select",
        options: _privEnumOptions(GRC_PRIV_DSR_TYPES, "grc.vie-privee.dsrType.") },
      { id: "requester", label: "grc.vie-privee.dsr.requester", type: "text", required: true },
      { id: "status", label: "grc.vie-privee.dsr.status", type: "select",
        options: _privEnumOptions(GRC_PRIV_DSR_STATUSES, "grc.vie-privee.dsrSt.") },
    ],
    readForm: (e) => ({ type: e.type, requester: e.requester, status: e.status }),
    submit: (v, editingId) => {
      if (editingId) {
        grcPrivSetDsrCore(editingId, { type: v.type, status: v.status });
        updateGrcPrivacyEntry(editingId, { requester: (v.requester || "").trim() });
      } else {
        addGrcDsr({ type: v.type, requester: (v.requester || "").trim(), status: v.status });
      }
    },
    header: (e) => {
      const cells = [
        { text: grcT("grc.vie-privee.dsrType." + e.type) },
        { text: e.requester || "" },
        { text: grcT("grc.vie-privee.dsrSt." + e.status) },
      ];
      if (grcPrivDsrOverdue(e)) cells.push(_privMiniBadge("grc-sup-badge-expired", "grc.vie-privee.dsr.overdueAlert"));
      return cells;
    },
    panel: typeof renderDsrPanel === "function" ? renderDsrPanel : null,
    summarise: _privSummarise,
    importFn: importGrcPrivacyFromJson,
    confirmName: (e) => e.requester || grcT("grc.vie-privee.dsrType." + e.type),
  })();

  /* --- registre Bris de confidentialité --- */
  grkRegistry({
    mount: "#grcPrivacyBreachList",
    summary: "#grcPrivacySummary",
    store: _grcPrivacyStore,
    schema: GRC_BREACH_SCHEMA,
    idAttr: "data-priv-id",
    listGlobal: "renderGrcBreachesList",
    deepLink: true,
    filter: grcPrivIsBreach,
    i18n: {
      add: "grc.vie-privee.breach.addBtn",
      titleAdd: "grc.vie-privee.breach.title",
      titleEdit: "grc.vie-privee.breach.titleEdit",
    },
    form: [
      { id: "description", label: "grc.vie-privee.breach.description", type: "text", required: true },
      { id: "severity", label: "grc.vie-privee.breach.severity", type: "select",
        options: _privEnumOptions(GRC_PRIV_BREACH_SEVERITIES, "grc.vie-privee.breachSev.") },
      { id: "status", label: "grc.vie-privee.breach.status", type: "select",
        options: _privEnumOptions(GRC_PRIV_BREACH_STATUSES, "grc.vie-privee.breachSt.") },
    ],
    readForm: (e) => ({ description: e.description, severity: e.severity, status: e.status }),
    submit: (v, editingId) => {
      const fields = { description: (v.description || "").trim(), severity: v.severity, status: v.status };
      if (editingId) updateGrcPrivacyEntry(editingId, fields);
      else addGrcBreach(fields);
    },
    header: (e) => {
      const cells = [{ text: e.description || "" }];
      const b = document.createElement("span");
      b.className = "grc-crit-badge " + e.severity;
      b.textContent = grcT("grc.vie-privee.breachSev." + e.severity);
      cells.push(b);
      if (grcPrivBreachCaiRequired(e)) cells.push(_privMiniBadge("grc-sup-badge-expired", "grc.vie-privee.breach.caiPendingAlert"));
      return cells;
    },
    panel: typeof renderBreachPanel === "function" ? renderBreachPanel : null,
    summarise: _privSummarise,
    importFn: importGrcPrivacyFromJson,
    confirmName: (e) => e.description || "",
  })();

  showKind("processing");
}

/* ================================================================== *
 *  Exports (T6) -- via le kit (grkExport*). ROPA (Word+CSV), journal
 *  DSR (CSV), accusé DSR (PDF 1 page), registre des bris (Word+CSV),
 *  JSON. Aucune requête réseau.
 * ================================================================== */

function _privKV(rows) {
  return "<table><tbody>" + rows.map((r) =>
    "<tr><th>" + grkEscapeHtml(r[0]) + "</th><td>" + grkEscapeHtml(r[1]) + "</td></tr>"
  ).join("") + "</tbody></table>";
}

function _privYesNo(b) {
  return grcT(b ? "grc.vie-privee.report.yes" : "grc.vie-privee.report.no");
}

// scope = un traitement OU un tableau de traitements.
function ropaReportBody(scope) {
  const list = (Array.isArray(scope) ? scope : [scope])
    .map(grcPrivacyEnsureShape).filter((e) => e.kind !== "dsr" && e.kind !== "breach");
  const L = (k) => grcT(k);
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = grkAuthorName();

  let h = "<h1>" + L("grc.vie-privee.report.ropaTitle") + "</h1>";
  h += "<p><strong>" + L("grc.vie-privee.report.generatedOn") + " :</strong> " +
    grkEscapeHtml(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.vie-privee.report.by") + " :</strong> " + grkEscapeHtml(author);
  h += "</p>";
  if (!list.length) { h += "<p><em>" + L("grc.vie-privee.report.none") + "</em></p>"; return h; }

  list.forEach((e) => {
    const band = grcPrivDpiaScoreBand(e);
    h += "<h2>" + grkEscapeHtml(e.name || "—") + "</h2>";
    h += _privKV([
      [L("grc.vie-privee.proc.purpose"), e.purpose],
      [L("grc.vie-privee.proc.owner"), e.owner],
      [L("grc.vie-privee.proc.legalBasis"), L("grc.vie-privee.lb." + e.legalBasis)],
      [L("grc.vie-privee.proc.dataCategories"), e.dataCategories],
      [L("grc.vie-privee.proc.dataSubjects"), e.dataSubjects],
      [L("grc.vie-privee.proc.recipients"), e.recipients],
      [L("grc.vie-privee.proc.security"), e.security],
    ]);

    if (e.dataCategoryList.length) {
      h += "<h3>" + L("grc.vie-privee.cat.title") + "</h3>";
      h += "<table><thead><tr><th>" + L("grc.vie-privee.cat.label") + "</th><th>" +
        L("grc.vie-privee.cat.sensitivity") + "</th><th>" + L("grc.vie-privee.cat.volume") +
        "</th><th>" + L("grc.vie-privee.cat.source") + "</th></tr></thead><tbody>";
      e.dataCategoryList.forEach((c) => {
        h += "<tr><td>" + grkEscapeHtml(c.label) + "</td><td>" + grkEscapeHtml(c.sensitivity == null ? "—" : c.sensitivity) +
          "</td><td>" + grkEscapeHtml(c.volumeApprox) + "</td><td>" + grkEscapeHtml(c.source) + "</td></tr>";
      });
      h += "</tbody></table>";
    }

    h += "<h3>" + L("grc.vie-privee.xfer.title") + "</h3>";
    if (e.transfers.length) {
      h += "<table><thead><tr><th>" + L("grc.vie-privee.xfer.destination") + "</th><th>" +
        L("grc.vie-privee.xfer.safeguard") + "</th><th>" + L("grc.vie-privee.xfer.note") + "</th></tr></thead><tbody>";
      e.transfers.forEach((t) => {
        h += "<tr><td>" + grkEscapeHtml(t.destination) + "</td><td>" +
          grkEscapeHtml(L("grc.vie-privee.sg." + t.safeguard)) + (t.safeguard === "none" ? " ⚠" : "") +
          "</td><td>" + grkEscapeHtml(t.note) + "</td></tr>";
      });
      h += "</tbody></table>";
    } else {
      h += "<p><em>" + L("grc.vie-privee.report.none") + "</em></p>";
    }

    h += "<h3>" + L("grc.vie-privee.ret.title") + "</h3>";
    h += _privKV([
      [L("grc.vie-privee.ret.policy"), e.retention.policy],
      [L("grc.vie-privee.ret.months"), e.retention.months == null ? "—" : e.retention.months],
      [L("grc.vie-privee.ret.basis"), e.retention.basis],
      [L("grc.vie-privee.ret.destructionMethod"), e.retention.destructionMethod],
      [L("grc.vie-privee.ret.plannedDeletionAt"), e.retention.plannedDeletionAt ? e.retention.plannedDeletionAt.slice(0, 10) : "—"],
    ]);
    if (grcPrivRetentionExpired(e)) h += "<p><strong>⚠ " + L("grc.vie-privee.ret.expiredAlert") + "</strong></p>";

    if (e.consents.length) {
      h += "<h3>" + L("grc.vie-privee.consent.title") + "</h3>";
      h += "<table><thead><tr><th>" + L("grc.vie-privee.consent.type") + "</th><th>" +
        L("grc.vie-privee.consent.obtainedAt") + "</th><th>" + L("grc.vie-privee.consent.expiresAt") +
        "</th><th>" + L("grc.vie-privee.consent.withdrawnAt") + "</th><th>" + L("grc.vie-privee.consent.proof") +
        "</th></tr></thead><tbody>";
      e.consents.forEach((c) => {
        h += "<tr><td>" + grkEscapeHtml(L("grc.vie-privee.consentType." + c.type)) + "</td><td>" +
          grkEscapeHtml(c.obtainedAt ? c.obtainedAt.slice(0, 10) : "—") + "</td><td>" +
          grkEscapeHtml(c.expiresAt ? c.expiresAt.slice(0, 10) : "—") + "</td><td>" +
          grkEscapeHtml(c.withdrawnAt ? c.withdrawnAt.slice(0, 10) : "—") + "</td><td>" +
          grkEscapeHtml(c.proof) + "</td></tr>";
      });
      h += "</tbody></table>";
    }

    h += "<h3>DPIA</h3>";
    h += _privKV([
      [L("grc.vie-privee.dpia.required"), _privYesNo(e.dpia.required)],
      [L("grc.vie-privee.dpia.score"), band.score == null ? band.text : (band.score + " · " + band.text)],
      [L("grc.vie-privee.dpia.doneAt"), e.dpia.doneAt ? e.dpia.doneAt.slice(0, 10) : "—"],
      [L("grc.vie-privee.dpia.conclusion"), e.dpia.conclusion],
      [L("grc.vie-privee.dpia.status"), L("grc.vie-privee.dpiaSt." + e.dpia.status)],
      [L("grc.vie-privee.dpia.approvedAt"), e.dpia.approvedAt ? e.dpia.approvedAt.slice(0, 10) : "—"],
      [L("grc.vie-privee.dpia.approvedBy"), e.dpia.approvedBy],
    ]);
    if (grcPrivDpiaRequiredNotDone(e)) h += "<p><strong>⚠ " + L("grc.vie-privee.dpia.notDoneAlert") + "</strong></p>";
    if (grcPrivDpiaApprovalPending(e)) h += "<p><strong>⚠ " + L("grc.vie-privee.dpia.pendingApprovalAlert") + "</strong></p>";

    h += "<h3>" + L("grc.vie-privee.rev.title") + "</h3>";
    h += _privKV([
      [L("grc.vie-privee.rev.lastReviewedAt"), e.review.lastReviewedAt ? e.review.lastReviewedAt.slice(0, 10) : "—"],
      [L("grc.vie-privee.rev.nextDueAt"), e.review.nextDueAt ? e.review.nextDueAt.slice(0, 10) : "—"],
    ]);
  });
  return h;
}

function dsrAckBody(dsr) {
  const e = grcPrivacyEnsureShape(dsr);
  const L = (k) => grcT(k);
  const names = {};
  if (typeof getGrcProcessings === "function") {
    try { getGrcProcessings().forEach((p) => { names[p.id] = p.name || p.id; }); } catch (err) { /* */ }
  }
  let h = "<h1>" + L("grc.vie-privee.report.dsrTitle") + "</h1>";
  h += _privKV([
    [L("grc.vie-privee.dsr.type"), L("grc.vie-privee.dsrType." + e.type)],
    [L("grc.vie-privee.dsr.requester"), e.requester],
    [L("grc.vie-privee.dsr.receivedAt"), e.receivedAt ? e.receivedAt.slice(0, 10) : "—"],
    [L("grc.vie-privee.dsr.dueAt"), (e.dueAt ? e.dueAt.slice(0, 10) : "—") + (grcPrivDsrOverdue(e) ? " ⚠" : "")],
    [L("grc.vie-privee.dsr.status"), L("grc.vie-privee.dsrSt." + e.status)],
  ]);
  if (e.processingIds.length) {
    h += "<h3>" + L("grc.vie-privee.dsr.processingIds") + "</h3><ul>" +
      e.processingIds.map((pid) => "<li>" + grkEscapeHtml(names[pid] || pid) + "</li>").join("") + "</ul>";
  }
  if (e.response) h += "<h3>" + L("grc.vie-privee.dsr.response") + "</h3><p>" + grkEscapeHtml(e.response).replace(/\n/g, "<br>") + "</p>";
  if (e.refusalReason) h += "<h3>" + L("grc.vie-privee.dsr.refusalReason") + "</h3><p>" + grkEscapeHtml(e.refusalReason).replace(/\n/g, "<br>") + "</p>";
  return h;
}

// scope = un bris OU un tableau de bris.
function breachReportBody(scope) {
  const list = (Array.isArray(scope) ? scope : [scope]).map(grcPrivacyEnsureShape).filter(grcPrivIsBreach);
  const L = (k) => grcT(k);
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = grkAuthorName();
  const names = {};
  if (typeof getGrcProcessings === "function") {
    try { getGrcProcessings().forEach((p) => { names[p.id] = p.name || p.id; }); } catch (err) { /* dégradé */ }
  }

  let h = "<h1>" + L("grc.vie-privee.report.breachTitle") + "</h1>";
  h += "<p><strong>" + L("grc.vie-privee.report.generatedOn") + " :</strong> " +
    grkEscapeHtml(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.vie-privee.report.by") + " :</strong> " + grkEscapeHtml(author);
  h += "</p>";
  if (!list.length) { h += "<p><em>" + L("grc.vie-privee.report.none") + "</em></p>"; return h; }

  list.forEach((e) => {
    h += "<h2>" + grkEscapeHtml(e.description || "—") + "</h2>";
    h += _privKV([
      [L("grc.vie-privee.breach.occurredAt"), e.occurredAt ? e.occurredAt.slice(0, 10) : "—"],
      [L("grc.vie-privee.breach.discoveredAt"), e.discoveredAt ? e.discoveredAt.slice(0, 10) : "—"],
      [L("grc.vie-privee.breach.affectedCount"), e.affectedCount == null ? "—" : e.affectedCount],
      [L("grc.vie-privee.breach.severity"), L("grc.vie-privee.breachSev." + e.severity)],
      [L("grc.vie-privee.breach.status"), L("grc.vie-privee.breachSt." + e.status)],
      [L("grc.vie-privee.breach.caiNotified"), _privYesNo(e.caiNotified) + (e.caiNotifiedAt ? " (" + e.caiNotifiedAt.slice(0, 10) + ")" : "")],
      [L("grc.vie-privee.breach.individualsNotified"), _privYesNo(e.individualsNotified) + (e.individualsNotifiedAt ? " (" + e.individualsNotifiedAt.slice(0, 10) + ")" : "")],
      [L("grc.vie-privee.breach.correctiveMeasures"), e.correctiveMeasures],
    ]);
    if (e.linkedProcessingIds.length) {
      h += "<h3>" + L("grc.vie-privee.dsr.processingIds") + "</h3><ul>" +
        e.linkedProcessingIds.map((pid) => "<li>" + grkEscapeHtml(names[pid] || pid) + "</li>").join("") + "</ul>";
    }
    if (grcPrivBreachCaiRequired(e)) h += "<p><strong>⚠ " + L("grc.vie-privee.breach.caiPendingAlert") + "</strong></p>";
  });
  return h;
}

function _privSlug(e) {
  const label = e && (e.name || e.requester || e.description);
  const fallback = e && e.kind === "dsr" ? "dsr" : (e && e.kind === "breach" ? "bris" : "traitement");
  return grkSlug(label, fallback);
}

function exportPrivacyAsJson(scope) {
  const name = Array.isArray(scope)
    ? "vie-privee-" + grkDateStamp() + ".json"
    : (scope && scope.kind === "dsr" ? "dsr-" : (scope && scope.kind === "breach" ? "bris-" : "traitement-")) +
      _privSlug(scope) + "-" + grkDateStamp() + ".json";
  return grkExportJson(scope, name);
}

function exportRopaAsWord(scope) {
  const base = Array.isArray(scope) ? "ropa" : "traitement-" + _privSlug(scope);
  grkExportWord(ropaReportBody(scope), base + "-" + grkDateStamp() + ".doc",
    grcT("grc.vie-privee.report.ropaTitle"));
}

function exportRopaCsv(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcPrivacyEnsureShape).filter((e) => e.kind !== "dsr" && e.kind !== "breach");
  const rows = [["name", "purpose", "legalBasis", "dataCategories",
    "retention_months", "destruction_method", "planned_deletion_at",
    "transfers_out", "dpia_required", "dpia_status", "dpia_done", "consents_count"]];
  arr.forEach((e) => {
    rows.push([
      e.name, e.purpose, e.legalBasis, e.dataCategories,
      e.retention.months == null ? "" : e.retention.months,
      e.retention.destructionMethod,
      e.retention.plannedDeletionAt ? e.retention.plannedDeletionAt.slice(0, 10) : "",
      e.transfers.length,
      e.dpia.required ? "1" : "0",
      e.dpia.status,
      e.dpia.doneAt ? "1" : "0",
      e.consents.length,
    ]);
  });
  grkExportCsv(rows, "ropa-" + grkDateStamp() + ".csv");
}

function exportDsrCsv(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcPrivacyEnsureShape).filter(grcPrivIsDsr);
  const rows = [["type", "requester", "receivedAt", "dueAt", "status", "overdue"]];
  arr.forEach((e) => {
    rows.push([
      e.type, e.requester,
      e.receivedAt ? e.receivedAt.slice(0, 10) : "",
      e.dueAt ? e.dueAt.slice(0, 10) : "",
      e.status,
      grcPrivDsrOverdue(e) ? "1" : "0",
    ]);
  });
  grkExportCsv(rows, "dsr-journal-" + grkDateStamp() + ".csv");
}

function exportDsrAckAsPdf(dsr) {
  grkPrintWindow(dsrAckBody(dsr), grcT("grc.vie-privee.report.dsrTitle"));
}

function exportBreachAsWord(scope) {
  const base = Array.isArray(scope) ? "registre-bris" : "bris-" + _privSlug(scope);
  grkExportWord(breachReportBody(scope), base + "-" + grkDateStamp() + ".doc",
    grcT("grc.vie-privee.report.breachTitle"));
}

function exportBreachCsv(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcPrivacyEnsureShape).filter(grcPrivIsBreach);
  const rows = [["description", "occurredAt", "discoveredAt", "affectedCount", "severity",
    "caiNotified", "individualsNotified", "status"]];
  arr.forEach((e) => {
    rows.push([
      e.description,
      e.occurredAt ? e.occurredAt.slice(0, 10) : "",
      e.discoveredAt ? e.discoveredAt.slice(0, 10) : "",
      e.affectedCount == null ? "" : e.affectedCount,
      e.severity,
      e.caiNotified ? "1" : "0",
      e.individualsNotified ? "1" : "0",
      e.status,
    ]);
  });
  grkExportCsv(rows, "bris-confidentialite-" + grkDateStamp() + ".csv");
}
