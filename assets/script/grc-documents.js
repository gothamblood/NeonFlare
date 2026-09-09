/* Registre documentaire partagé (politiques / directives / procédures /
   standards / formulaires / registre d'autorité).
   Bâti sur grc-registry-kit.js (grk*). Voir spec/grc-registry-upgrades/
   80-document-register.md.

   UN SEUL store /grc/documents/registry, monté sur les 4 pages
   grc/procedures.html, grc/directives.html, grc/documentation.html,
   grc/gouvernance.html -- chaque page filtre par `docType`.
   grc/gouvernance.html affiche en plus une vue « registre d'autorité »
   (document -> approbateur, dérivée, lecture seule).

   Aligné ISO/IEC 27001 clause 7.5 (informations documentées) + A.5.1 /
   A.5.37, NIST CSF GV.PO. Tout le texte affiché passe par grcT() ; les
   enums GRC_DOC_* restent des clés internes stables (grc.documents.*).

   État (80-document-register.md §6) :
   - T1 : store + modèle + dérivés (authorityTable / staleDrafts /
     reviewOverdue / nextToReview) + import.            <-- ICI
   - T2 : grkRegistry paramétré par docType + encart + montage 4 pages.
   - T3..T4 : panneau (Fiche / Cycle de vie / Couverture & liens /
     Historique).  T5 : vue authorityTable (gouvernance).
   - T6 : exports (sommaire + autorité + JSON).  T7 : Settings.
   - T8 : i18n + CSS.  T9 : tests. */

const GRC_DOCUMENTS_KEY = "/grc/documents/registry";

const GRC_DOC_TYPES = [
  "policy", "directive", "procedure", "standard", "form",
  "authority-register", "other",
];
const GRC_DOC_STATUSES = [
  "draft", "in-review", "approved", "published", "under-revision", "retired",
];
const GRC_DOC_RELATION_TYPES = [
  "supersedes", "superseded-by", "references", "implements",
];
const GRC_DOC_DEFAULT_CADENCE = 12;
const GRC_DOC_STALE_DRAFT_DAYS = 90;

/* ---------- descripteur grkEnsure (schema 1) ---------------- */

const GRC_DOC_RELATION_SCHEMA = {
  id: { type: "string" },
  type: { type: "string", enum: GRC_DOC_RELATION_TYPES, default: "references" },
  ref: { type: "string" },
};

const GRC_DOC_HISTORY_SCHEMA = {
  id: { type: "string" },
  ts: { type: "iso" },
  version: { type: "string" },
  change: { type: "string" },
  by: { type: "string" },
};

const GRC_DOC_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  title: { type: "string" },
  docType: { type: "string", enum: GRC_DOC_TYPES, default: "procedure" },
  owner: { type: "string" },
  approver: { type: "string" },
  status: { type: "string", enum: GRC_DOC_STATUSES, default: "draft" },
  version: { type: "string", default: "1.0" },
  effectiveDate: { type: "iso" },
  approvedAt: { type: "iso" },
  approvedBy: { type: "string" },
  review: {
    type: "object", of: {
      lastReviewedAt: { type: "iso" },
      nextDueAt: { type: "iso" },
      cadenceMonths: { type: "number", default: GRC_DOC_DEFAULT_CADENCE },
    },
  },
  location: { type: "string" },
  scope: { type: "string" },
  controls: { type: "array" },
  relations: { type: "array", of: GRC_DOC_RELATION_SCHEMA },
  history: { type: "array", sortBy: "ts", of: GRC_DOC_HISTORY_SCHEMA },
  notes: { type: "string" },
  createdAt: { type: "iso" },
};

function grcDocEnsureShape(doc) {
  const d = grkEnsure(doc, GRC_DOC_SCHEMA);
  d.id = doc && typeof doc.id === "string" ? doc.id : (d.id || "");
  // historique : plus récent en premier pour l'affichage
  d.history.sort((a, b) => Date.parse(b.ts || 0) - Date.parse(a.ts || 0));
  return d;
}

/* ---------- store ----------------------------------------- */

const _grcDocumentsStore = grkStore(GRC_DOCUMENTS_KEY);

function getGrcDocuments() { return _grcDocumentsStore.get(); }
function saveGrcDocuments(list) { _grcDocumentsStore.save(list); }
function resetGrcDocuments() { _grcDocumentsStore.remove(); }

function addGrcDocument(doc) {
  const list = getGrcDocuments();
  const shaped = grcDocEnsureShape(doc || {});
  shaped.id = grkId("doc");
  if (!shaped.createdAt) shaped.createdAt = new Date().toISOString();
  list.push(shaped);
  saveGrcDocuments(list);
  return shaped.id;
}

function updateGrcDocument(id, changes) {
  const list = getGrcDocuments();
  const idx = list.findIndex((d) => d && d.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveGrcDocuments(list);
}

function removeGrcDocument(id) {
  saveGrcDocuments(getGrcDocuments().filter((d) => d && d.id !== id));
}

function grcDocMutate(id, fn) {
  return grkMutate(_grcDocumentsStore, id, grcDocEnsureShape, fn);
}

/* ---------- fiche ---------------------------------------- */

function grcDocSetFields(id, changes) {
  return grcDocMutate(id, (d) => {
    ["title", "owner", "approver", "scope", "location", "notes", "approvedBy"].forEach((k) => {
      if (k in changes && typeof changes[k] === "string") d[k] = changes[k].trim();
    });
    if ("docType" in changes && GRC_DOC_TYPES.indexOf(changes.docType) !== -1) d.docType = changes.docType;
    if ("status" in changes && GRC_DOC_STATUSES.indexOf(changes.status) !== -1) {
      d.status = changes.status;
      if ((d.status === "approved" || d.status === "published") && !d.approvedAt) {
        d.approvedAt = new Date().toISOString();
      }
    }
    if ("version" in changes && typeof changes.version === "string" && changes.version.trim()) {
      d.version = changes.version.trim();
    }
    if ("effectiveDate" in changes) d.effectiveDate = grkToIso(changes.effectiveDate);
    if ("approvedAt" in changes) d.approvedAt = grkToIso(changes.approvedAt);
    return true;
  });
}

/* ---------- cycle de vie : revue + nouvelle version ------ */

function grcDocSetReview(id, changes) {
  return grcDocMutate(id, (d) => {
    const r = d.review;
    if ("lastReviewedAt" in changes) r.lastReviewedAt = grkToIso(changes.lastReviewedAt);
    if ("nextDueAt" in changes) r.nextDueAt = grkToIso(changes.nextDueAt);
    if ("cadenceMonths" in changes) {
      const n = Math.round(Number(changes.cadenceMonths));
      if (Number.isFinite(n) && n > 0) r.cadenceMonths = n;
    }
    // si on enregistre une revue sans échéance explicite, la dériver de la cadence
    if ("lastReviewedAt" in changes && !("nextDueAt" in changes) && r.lastReviewedAt) {
      r.nextDueAt = grkAddMonths(r.lastReviewedAt, r.cadenceMonths || GRC_DOC_DEFAULT_CADENCE);
    }
    return true;
  });
}

// Incrémente `version` (bump "major" | "minor") + ajoute une entrée history.
function grcDocNewVersion(id, opts) {
  const o = opts || {};
  return grcDocMutate(id, (d) => {
    d.version = _grcDocBumpVersion(d.version, o.bump === "major" ? "major" : "minor");
    d.history.push({
      id: grkId("dh"),
      ts: new Date().toISOString(),
      version: d.version,
      change: typeof o.change === "string" ? o.change.trim() : "",
      by: typeof o.by === "string" ? o.by.trim() : "",
    });
    d.history.sort((a, b) => Date.parse(b.ts || 0) - Date.parse(a.ts || 0));
    if (d.status === "published" || d.status === "approved") d.status = "under-revision";
    return d.version;
  });
}

function _grcDocBumpVersion(cur, bump) {
  const m = String(cur || "1.0").match(/^(\d+)(?:\.(\d+))?/);
  let major = m ? parseInt(m[1], 10) : 1;
  let minor = m && m[2] != null ? parseInt(m[2], 10) : 0;
  if (bump === "major") { major += 1; minor = 0; } else { minor += 1; }
  return major + "." + minor;
}

/* ---------- couverture (contrôles) + relations ---------- */

function grcDocAddControl(id, ref) {
  return grcDocMutate(id, (d) => {
    const v = String(ref || "").trim();
    if (!v || d.controls.indexOf(v) !== -1) return false;
    d.controls.push(v);
    return true;
  });
}

function grcDocRemoveControl(id, ref) {
  return grcDocMutate(id, (d) => {
    const before = d.controls.length;
    d.controls = d.controls.filter((x) => x !== ref);
    return d.controls.length < before;
  });
}

function grcDocAddRelation(id, rel) {
  return grcDocMutate(id, (d) => {
    const r = rel || {};
    const ref = String(r.ref || "").trim();
    if (!ref) return false;
    const type = GRC_DOC_RELATION_TYPES.indexOf(r.type) !== -1 ? r.type : "references";
    d.relations.push({ id: grkId("dr"), type: type, ref: ref });
    return true;
  });
}

function grcDocUpdateRelation(id, relId, changes) {
  return grcDocMutate(id, (d) => {
    const rel = d.relations.find((x) => x.id === relId);
    if (!rel) return false;
    if ("type" in changes && GRC_DOC_RELATION_TYPES.indexOf(changes.type) !== -1) rel.type = changes.type;
    if ("ref" in changes && typeof changes.ref === "string") rel.ref = changes.ref.trim();
    return true;
  });
}

function grcDocRemoveRelation(id, relId) {
  return grcDocMutate(id, (d) => {
    const before = d.relations.length;
    d.relations = d.relations.filter((x) => x.id !== relId);
    return d.relations.length < before;
  });
}

/* ---------- dérivés ------------------------------------- */

// Revue en retard : une échéance existe et elle est passée.
function grcDocReviewOverdue(doc) {
  const next = doc && doc.review && doc.review.nextDueAt;
  if (!next) return false;
  const t = Date.parse(next);
  return !isNaN(t) && t < Date.now();
}

// Brouillon ancien : status draft/in-review, jamais approuvé, créé il y a
// plus de `days` jours (défaut 90).
function grcDocIsStaleDraft(doc, days) {
  if (!doc) return false;
  if (doc.status !== "draft" && doc.status !== "in-review") return false;
  if (doc.approvedAt) return false;
  const anchor = doc.createdAt || (doc.history && doc.history.length
    ? doc.history[doc.history.length - 1].ts : null);
  if (!anchor) return false;
  const t = Date.parse(anchor);
  if (isNaN(t)) return false;
  const limit = (Number.isFinite(days) ? days : GRC_DOC_STALE_DRAFT_DAYS) * 864e5;
  return Date.now() - t > limit;
}

function grcDocStaleDrafts(list, days) {
  return (Array.isArray(list) ? list : [])
    .map(grcDocEnsureShape)
    .filter((d) => grcDocIsStaleDraft(d, days));
}

// Prochain document à revoir : plus petite échéance future (ou la plus en
// retard si tout est passé). Renvoie { doc, nextDueAt } ou null.
function grcDocNextToReview(list) {
  const arr = (Array.isArray(list) ? list : [])
    .map(grcDocEnsureShape)
    .filter((d) => d.status !== "retired" && d.review && d.review.nextDueAt)
    .map((d) => ({ doc: d, t: Date.parse(d.review.nextDueAt) }))
    .filter((x) => !isNaN(x.t))
    .sort((a, b) => a.t - b.t);
  if (!arr.length) return null;
  const future = arr.filter((x) => x.t >= Date.now());
  const pick = future.length ? future[0] : arr[0];
  return { doc: pick.doc, nextDueAt: pick.doc.review.nextDueAt };
}

// Registre d'autorité : document -> approbateur (pour gouvernance.html).
function grcDocAuthorityTable(list) {
  return (Array.isArray(list) ? list : [])
    .map(grcDocEnsureShape)
    .filter((d) => d.title || d.approver)
    .map((d) => ({
      id: d.id,
      title: d.title,
      docType: d.docType,
      approver: d.approver || d.approvedBy || "",
      version: d.version,
      status: d.status,
      approvedAt: d.approvedAt || "",
    }))
    .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
}

// Encart d'une page (déjà filtrée par docType) : compteurs.
function grcDocumentsSummary(list) {
  const arr = (Array.isArray(list) ? list : []).map(grcDocEnsureShape);
  const overdue = arr.filter(grcDocReviewOverdue);
  const stale = arr.filter((d) => grcDocIsStaleDraft(d));
  const next = grcDocNextToReview(arr);
  const byStatus = {};
  GRC_DOC_STATUSES.forEach((s) => { byStatus[s] = 0; });
  arr.forEach((d) => { byStatus[d.status] = (byStatus[d.status] || 0) + 1; });
  return {
    total: arr.length,
    byStatus: byStatus,
    reviewOverdue: overdue.length,
    staleDrafts: stale.length,
    nextToReview: next ? (next.doc.title || next.doc.id) : null,
    nextToReviewAt: next ? next.nextDueAt : null,
  };
}

/* ---------- import ------------------------------------- */

async function importGrcDocumentsFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  if (Array.isArray(decoded)) {
    saveGrcDocuments(decoded);
    return;
  }
  const isShape = decoded && typeof decoded === "object" &&
    typeof decoded.id === "string" && typeof decoded.title === "string";
  if (!isShape) throw new Error(grcT("grc.documents.invalidImport"));

  const list = getGrcDocuments();
  const idx = list.findIndex((d) => d && d.id === decoded.id);
  if (idx === -1) list.push(decoded);
  else list[idx] = decoded;
  saveGrcDocuments(list);
}

/* ================================================================== *
 *  Registre -- liste + formulaire + encart (grkRegistry, T2).
 *  Monté par les 4 pages via initGrcDocumentsRegistry(opts) :
 *    opts.docTypes  : string[]  types affichés par cette page (filtre)
 *    opts.primaryType : string  type pré-sélectionné à l'ajout
 *    opts.mount / opts.summary : sélecteurs (défauts ci-dessous)
 *  Panneau : renderDocumentPanel (grc-documents-panel.js, T3+).
 * ================================================================== */

function _docEnumOptions(values, prefix) {
  return values.map((v) => ({ value: v, label: prefix + v }));
}

function _docDate(iso) { return iso ? String(iso).slice(0, 10) : "—"; }

function _docTypeLabel(t) { return grcT("grc.documents.dt." + t); }
function _docStatusLabel(s) { return grcT("grc.documents.st." + s); }

// Badge de statut réutilisant la palette .grc-crit-badge.
function grcDocStatusBadge(status) {
  const map = {
    draft: "info", "in-review": "medium", approved: "low",
    published: "low", "under-revision": "medium", retired: "info",
  };
  return { cls: map[status] || "info", text: _docStatusLabel(status) };
}

function _docMiniBadge(cls, key) {
  const s = document.createElement("span");
  s.className = "grc-sup-mini-badge " + cls;
  s.textContent = grcT(key);
  return s;
}

// Encart (filtré par les docTypes de la page). Lit le store brut.
function _docSummariseChips(docTypes) {
  const set = Array.isArray(docTypes) && docTypes.length ? docTypes : null;
  const list = getGrcDocuments()
    .map(grcDocEnsureShape)
    .filter((d) => !set || set.indexOf(d.docType) !== -1);
  const s = grcDocumentsSummary(list);
  const chips = [
    grcT("grc.documents.summary.total").replace("{n}", s.total),
    grcT("grc.documents.summary.reviewOverdue").replace("{n}", s.reviewOverdue),
    grcT("grc.documents.summary.staleDrafts").replace("{n}", s.staleDrafts),
    s.nextToReview
      ? grcT("grc.documents.summary.nextToReview").replace("{name}", s.nextToReview)
      : grcT("grc.documents.summary.nextNone"),
  ];
  return { chips: chips };
}

function initGrcDocumentsRegistry(opts) {
  const o = opts || {};
  const mount = o.mount || "#grcDocumentsRegistry";
  const summarySel = o.summary || "#grcDocumentsSummary";
  const docTypes = Array.isArray(o.docTypes) && o.docTypes.length ? o.docTypes : GRC_DOC_TYPES.slice();
  const primaryType = o.primaryType && docTypes.indexOf(o.primaryType) !== -1
    ? o.primaryType : docTypes[0];
  if (!document.querySelector(mount)) return null;

  // périmètre de la page -> exports « sommaire de cette page » (panel).
  if (typeof grcDocSetPageScope === "function") grcDocSetPageScope(docTypes);

  // Ordre du select : type primaire d'abord (=> défaut à l'ajout).
  const typeOptions = _docEnumOptions(
    [primaryType].concat(docTypes.filter((t) => t !== primaryType)),
    "grc.documents.dt.");

  const init = grkRegistry({
    mount: mount,
    summary: summarySel,
    store: _grcDocumentsStore,
    schema: GRC_DOC_SCHEMA,
    idAttr: "data-doc-id",
    listGlobal: "renderGrcDocumentsList",
    deepLink: true,
    filter: (d) => docTypes.indexOf(d.docType) !== -1,
    i18n: {
      add: "grc.documents.form.addBtn",
      titleAdd: "grc.documents.form.title",
      titleEdit: "grc.documents.form.titleEdit",
    },
    form: [
      { id: "title", label: "grc.documents.form.name", type: "text", required: true },
      { id: "docType", label: "grc.documents.form.docType", type: "select", options: typeOptions },
      { id: "owner", label: "grc.documents.form.owner", type: "text" },
      { id: "approver", label: "grc.documents.form.approver", type: "text" },
      { id: "version", label: "grc.documents.form.version", type: "text" },
    ],
    readForm: (d) => ({
      title: d.title, docType: d.docType, owner: d.owner,
      approver: d.approver, version: d.version,
    }),
    submit: (v, editingId) => {
      const fields = {
        title: (v.title || "").trim(),
        docType: GRC_DOC_TYPES.indexOf(v.docType) !== -1 ? v.docType : primaryType,
        owner: (v.owner || "").trim(),
        approver: (v.approver || "").trim(),
        version: (v.version || "").trim() || "1.0",
      };
      if (editingId) updateGrcDocument(editingId, fields);
      else addGrcDocument(fields);
    },
    header: (d) => {
      const badge = grcDocStatusBadge(d.status);
      const b = document.createElement("span");
      b.className = "grc-crit-badge " + badge.cls;
      b.textContent = badge.text;
      const cells = [
        { text: (d.title || "") + "  ·  v" + (d.version || "1.0") },
        b,
        { text: _docTypeLabel(d.docType) },
      ];
      if (grcDocReviewOverdue(d)) {
        cells.push(_docMiniBadge("grc-sup-badge-expired", "grc.documents.badge.reviewOverdue"));
      }
      if (grcDocIsStaleDraft(d)) {
        cells.push(_docMiniBadge("grc-sup-badge-review", "grc.documents.badge.staleDraft"));
      }
      return cells;
    },
    panel: typeof renderDocumentPanel === "function" ? renderDocumentPanel : null,
    summarise: () => _docSummariseChips(docTypes),
    importFn: importGrcDocumentsFromJson,
    confirmName: (d) => d.title || d.id || "",
  })();

  // grkRegistry vide chaque champ à l'ouverture du formulaire d'ajout ;
  // re-pré-sélectionner le docType de la page (le <select> n'a pas
  // d'option vide). Notre écouteur passe après celui du kit.
  const addBtn = document.querySelector(mount + " .grc-registry-add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const sel = document.querySelector(mount + " form.grc-registry-form select");
      if (sel && !sel.value) sel.value = primaryType;
    });
  }

  // gouvernance.html : garder la vue « registre d'autorité » synchronisée
  // avec toute modification du registre.
  const authSel = o.authorityMount || "#grcDocumentsAuthority";
  if (document.querySelector(authSel) && typeof renderGrcAuthorityTable === "function") {
    const baseRender = window.renderGrcDocumentsList;
    window.renderGrcDocumentsList = function () {
      if (typeof baseRender === "function") baseRender();
      renderGrcAuthorityTable(authSel);
    };
    renderGrcAuthorityTable(authSel);
  }

  return init;
}
