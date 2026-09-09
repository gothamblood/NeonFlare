/* Vie privée -- registre des traitements (ROPA) + journal des demandes
   des personnes (DSR). Bâti sur grc-registry-kit.js (grk*). Voir
   spec/grc-registry-upgrades/50-privacy-loi25.md.

   UN SEUL store /grc/privacy/registry, discriminé par `kind` :
   "processing" (ROPA) ou "dsr". Aligné Loi 25 (Québec) / LPRPDE,
   ISO/IEC 27001 A.5.34, NIST CSF GV.PO / PR.DS. Tout le texte affiché
   passe par grcT() ; les enums GRC_PRIV_* restent des clés internes.

   État (50-privacy-loi25.md §6) :
   - T1 : store bi-kind + modèles + DPIA/DSR dérivés + import.  <-- ICI
   - T2 : registre filtrable + encart + montage.
   - T3..T6 : panneaux Traitement / DSR + exports.
   - T7 : Settings.  T8 : CSS.  T9 : tests. */

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

/* ---------- descripteurs grkEnsure (schema 1) ------------------ */

const GRC_PRIV_TRANSFER_SCHEMA = {
  id: { type: "string" },
  destination: { type: "string" },
  safeguard: { type: "string", enum: GRC_PRIV_TRANSFER_SAFEGUARDS, default: "contract" },
  note: { type: "string" },
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
  dataSubjects: { type: "string" },
  recipients: { type: "string" },
  transfers: { type: "array", of: GRC_PRIV_TRANSFER_SCHEMA },
  retention: {
    type: "object", of: {
      policy: { type: "string" },
      months: { type: "number", default: null },
      basis: { type: "string" },
      anchor: { type: "iso" },   // date de dernière collecte (P4) -- optionnel
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

function grcPrivIsDsr(entry) {
  return entry && entry.kind === "dsr";
}

function grcPrivacyEnsureShape(entry) {
  const isDsr = entry && entry.kind === "dsr";
  const e = grkEnsure(entry, isDsr ? GRC_DSR_SCHEMA : GRC_PROCESSING_SCHEMA);
  e.id = entry && typeof entry.id === "string" ? entry.id : (e.id || "");
  e.kind = isDsr ? "dsr" : "processing";
  if (isDsr) {
    if (e.receivedAt && !e.dueAt) e.dueAt = grkAddDays(e.receivedAt, GRC_PRIV_DSR_DELAY_DAYS);
  } else {
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

function getGrcProcessings() { return getGrcPrivacy().filter((e) => e && e.kind !== "dsr"); }
function getGrcDsrs() { return getGrcPrivacy().filter(grcPrivIsDsr); }

function _addGrcPrivacyEntry(entry, kind) {
  const list = getGrcPrivacy();
  const shaped = grcPrivacyEnsureShape(Object.assign({ kind: kind }, entry || {}));
  shaped.id = grkId(kind === "dsr" ? "dsr" : "proc");
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
    return true;
  });
}

function grcPrivSetReview(id, patch) {
  return privMutate(id, (e) => {
    const r = e.review;
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

function grcPrivacySummary(list) {
  const arr = Array.isArray(list) ? list.map(grcPrivacyEnsureShape) : [];
  const procs = arr.filter((e) => e.kind !== "dsr");
  const dsrs = arr.filter(grcPrivIsDsr);
  const openDue = dsrs
    .filter((e) => GRC_PRIV_DSR_OPEN_STATUSES.indexOf(e.status) !== -1 && e.dueAt)
    .map((e) => Date.parse(e.dueAt))
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);
  return {
    processings: procs.length,
    dsrs: dsrs.length,
    dpiaRequiredNotDone: procs.filter(grcPrivDpiaRequiredNotDone).length,
    retentionExpired: procs.filter(grcPrivRetentionExpired).length,
    unsafeTransfers: procs.filter(grcPrivHasUnsafeTransfer).length,
    dsrOverdue: dsrs.filter(grcPrivDsrOverdue).length,
    nextDsrDue: openDue.length ? new Date(openDue[0]).toISOString() : null,
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
    (decoded.kind === "dsr" || typeof decoded.name === "string" || typeof decoded.purpose === "string");
  if (!isShape) throw new Error(grcT("grc.vie-privee.invalidImport"));

  const list = getGrcPrivacy();
  const idx = list.findIndex((e) => e && e.id === decoded.id);
  if (idx === -1) list.push(decoded);
  else list[idx] = decoded;
  saveGrcPrivacy(list);
}

/* ================================================================== *
 *  Registre -- toggle Traitements / Demandes + 2 grkRegistry
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
  // registre pré-`ensure`d avec son schema mange les champs de l'autre kind.
  const sm = grcPrivacySummary(getGrcPrivacy());
  if (!sm.processings && !sm.dsrs) return { chips: [grcT("grc.vie-privee.summary.none")] };
  const chips = [
    grcT("grc.vie-privee.summary.processings").replace("{n}", sm.processings),
    grcT("grc.vie-privee.summary.dsrs").replace("{n}", sm.dsrs),
    grcT("grc.vie-privee.summary.dpiaNotDone").replace("{n}", sm.dpiaRequiredNotDone),
    grcT("grc.vie-privee.summary.retentionExpired").replace("{n}", sm.retentionExpired),
    grcT("grc.vie-privee.summary.dsrOverdue").replace("{n}", sm.dsrOverdue),
  ];
  const gaps = sm.nextDsrDue
    ? grcT("grc.vie-privee.summary.nextDsr").replace("{value}", grkFmtDateTime(sm.nextDsrDue))
    : null;
  return { chips: chips, gaps: gaps };
}

function initGrcPrivacyRegistry() {
  const host = document.querySelector("#grcPrivacyRegistry");
  if (!host) return;
  host.innerHTML = "";

  // Toggle segmenté Traitements / Demandes.
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
  bar.appendChild(procBtn);
  bar.appendChild(dsrBtn);
  host.appendChild(bar);

  const procMount = document.createElement("div");
  procMount.id = "grcPrivacyProcList";
  const dsrMount = document.createElement("div");
  dsrMount.id = "grcPrivacyDsrList";
  dsrMount.hidden = true;
  host.appendChild(procMount);
  host.appendChild(dsrMount);

  const showKind = (kind) => {
    const isProc = kind !== "dsr";
    procMount.hidden = !isProc;
    dsrMount.hidden = isProc;
    procBtn.classList.toggle("is-active", isProc);
    dsrBtn.classList.toggle("is-active", !isProc);
    if (isProc && window.renderGrcProcessingsList) window.renderGrcProcessingsList();
    else if (!isProc && window.renderGrcDsrsList) window.renderGrcDsrsList();
  };
  procBtn.addEventListener("click", () => showKind("processing"));
  dsrBtn.addEventListener("click", () => showKind("dsr"));

  /* --- registre Traitements --- */
  grkRegistry({
    mount: "#grcPrivacyProcList",
    summary: "#grcPrivacySummary",
    store: _grcPrivacyStore,
    schema: GRC_PROCESSING_SCHEMA,
    idAttr: "data-priv-id",
    listGlobal: "renderGrcProcessingsList",
    deepLink: true,
    filter: (e) => e.kind !== "dsr",
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

  showKind("processing");
}

/* ================================================================== *
 *  Exports (T6) -- via le kit (grkExport*). ROPA (Word+CSV), journal
 *  DSR (CSV), accusé DSR (PDF 1 page), JSON. Aucune requête réseau.
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
    .map(grcPrivacyEnsureShape).filter((e) => e.kind !== "dsr");
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
    ]);
    if (grcPrivRetentionExpired(e)) h += "<p><strong>⚠ " + L("grc.vie-privee.ret.expiredAlert") + "</strong></p>";

    h += "<h3>DPIA</h3>";
    h += _privKV([
      [L("grc.vie-privee.dpia.required"), _privYesNo(e.dpia.required)],
      [L("grc.vie-privee.dpia.score"), band.score == null ? band.text : (band.score + " · " + band.text)],
      [L("grc.vie-privee.dpia.doneAt"), e.dpia.doneAt ? e.dpia.doneAt.slice(0, 10) : "—"],
      [L("grc.vie-privee.dpia.conclusion"), e.dpia.conclusion],
    ]);
    if (grcPrivDpiaRequiredNotDone(e)) h += "<p><strong>⚠ " + L("grc.vie-privee.dpia.notDoneAlert") + "</strong></p>";

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

function _privSlug(e) {
  return grkSlug(e && (e.name || e.requester), e && e.kind === "dsr" ? "dsr" : "traitement");
}

function exportPrivacyAsJson(scope) {
  const name = Array.isArray(scope)
    ? "vie-privee-" + grkDateStamp() + ".json"
    : (scope && scope.kind === "dsr" ? "dsr-" : "traitement-") + _privSlug(scope) + "-" + grkDateStamp() + ".json";
  return grkExportJson(scope, name);
}

function exportRopaAsWord(scope) {
  const base = Array.isArray(scope) ? "ropa" : "traitement-" + _privSlug(scope);
  grkExportWord(ropaReportBody(scope), base + "-" + grkDateStamp() + ".doc",
    grcT("grc.vie-privee.report.ropaTitle"));
}

function exportRopaCsv(list) {
  const arr = (Array.isArray(list) ? list : [list]).map(grcPrivacyEnsureShape).filter((e) => e.kind !== "dsr");
  const rows = [["name", "purpose", "legalBasis", "dataCategories",
    "retention_months", "transfers_out", "dpia_required", "dpia_done"]];
  arr.forEach((e) => {
    rows.push([
      e.name, e.purpose, e.legalBasis, e.dataCategories,
      e.retention.months == null ? "" : e.retention.months,
      e.transfers.length,
      e.dpia.required ? "1" : "0",
      e.dpia.doneAt ? "1" : "0",
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
