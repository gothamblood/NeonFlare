/* IAM -- campagnes de recertification d'accès + événements JML
   (Joiner/Mover/Leaver). Bâti sur grc-registry-kit.js (grk*). Voir
   spec/grc-registry-upgrades/40-iam-access-reviews.md.

   UN SEUL store /grc/access-reviews/registry, discriminé par `kind` :
   "campaign" ou "jml". Aligné ISO/IEC 27001 A.5.15-A.5.18, NIST CSF
   PR.AA, CIS 5-6. Tout le texte affiché passe par grcT() ; les enums
   GRC_AR_* restent des clés internes.

   État (40-iam-access-reviews.md §6) :
   - T1 : store bi-kind + modèles + dérivés + import.  <-- ICI
   - T2 : registre filtrable + encart + montage.
   - T3..T6 : panneaux Campagne / JML + exports.
   - T7 : Settings.  T8 : CSS.  T9 : tests. */

const GRC_ACCESS_REVIEWS_KEY = "/grc/access-reviews/registry";

const GRC_AR_CAMPAIGN_STATUSES = ["draft", "in-progress", "signed-off", "cancelled"];
const GRC_AR_LINE_DECISIONS = ["keep", "revoke", "reduce", "pending"];
const GRC_AR_JML_TYPES = ["joiner", "mover", "leaver"];
const GRC_AR_JML_STATUSES = ["todo", "done"];
const GRC_AR_DEFAULT_CADENCE = 6;
const GRC_AR_STALE_LEAVER_DAYS = 7;

/* ---------- descripteurs grkEnsure (schema 1) ---------------- */

const GRC_AR_LINE_SCHEMA = {
  id: { type: "string" },
  subject: { type: "string" },
  access: { type: "string" },
  lastUsed: { type: "iso" },
  decision: { type: "string", enum: GRC_AR_LINE_DECISIONS, default: "pending" },
  justification: { type: "string" },
  done: { type: "bool", default: false },
};

const GRC_AR_CAMPAIGN_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  kind: { type: "string", default: "campaign" },
  title: { type: "string" },
  scope: { type: "string" },
  system: { type: "string" },
  reviewers: { type: "string" },
  status: { type: "string", enum: GRC_AR_CAMPAIGN_STATUSES, default: "draft" },
  openedAt: { type: "iso" },
  dueAt: { type: "iso" },
  signedOffAt: { type: "iso" },
  signedOffBy: { type: "string" },
  lines: { type: "array", of: GRC_AR_LINE_SCHEMA },
  cadenceMonths: { type: "number", default: GRC_AR_DEFAULT_CADENCE },
  reopenNote: { type: "string" },
};

const GRC_AR_JML_SCHEMA = {
  id: { type: "string" },
  schema: { type: "number", default: 1 },
  kind: { type: "string", default: "jml" },
  person: { type: "string" },
  type: { type: "string", enum: GRC_AR_JML_TYPES, default: "joiner" },
  at: { type: "iso" },
  systems: { type: "string" },
  status: { type: "string", enum: GRC_AR_JML_STATUSES, default: "todo" },
  note: { type: "string" },
  campaignId: { type: "string" },
};

function grcArIsJml(entry) {
  return entry && entry.kind === "jml";
}

function grcAccessReviewEnsureShape(entry) {
  const isJml = entry && entry.kind === "jml";
  const e = grkEnsure(entry, isJml ? GRC_AR_JML_SCHEMA : GRC_AR_CAMPAIGN_SCHEMA);
  e.id = entry && typeof entry.id === "string" ? entry.id : (e.id || "");
  e.kind = isJml ? "jml" : "campaign";
  return e;
}

/* ---------- store ------------------------------------------- */

const _grcAccessReviewsStore = grkStore(GRC_ACCESS_REVIEWS_KEY);

function getGrcAccessReviews() { return _grcAccessReviewsStore.get(); }
function saveGrcAccessReviews(list) { _grcAccessReviewsStore.save(list); }
function resetGrcAccessReviews() { _grcAccessReviewsStore.remove(); }

function getGrcCampaigns() { return getGrcAccessReviews().filter((e) => e && e.kind !== "jml"); }
function getGrcJmlEvents() { return getGrcAccessReviews().filter(grcArIsJml); }

function _addGrcAccessReviewEntry(entry, kind) {
  const list = getGrcAccessReviews();
  const shaped = grcAccessReviewEnsureShape(Object.assign({ kind: kind }, entry || {}));
  shaped.id = grkId(kind === "jml" ? "jml" : "camp");
  if (kind === "campaign" && !shaped.openedAt) shaped.openedAt = new Date().toISOString();
  if (kind === "jml" && !shaped.at) shaped.at = new Date().toISOString();
  list.push(shaped);
  saveGrcAccessReviews(list);
  return shaped.id;
}

function addGrcCampaign(entry) { return _addGrcAccessReviewEntry(entry, "campaign"); }
function addGrcJmlEvent(entry) { return _addGrcAccessReviewEntry(entry, "jml"); }

function updateGrcAccessReviewEntry(id, changes) {
  const list = getGrcAccessReviews();
  const idx = list.findIndex((e) => e && e.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveGrcAccessReviews(list);
}

function removeGrcAccessReviewEntry(id) {
  saveGrcAccessReviews(getGrcAccessReviews().filter((e) => e && e.id !== id));
}

function arMutate(id, fn) {
  return grkMutate(_grcAccessReviewsStore, id, grcAccessReviewEnsureShape, fn);
}

/* ---------- campagne : cœur / lignes / sign-off ------------- */

function grcArSetCampaignCore(id, changes) {
  return arMutate(id, (e) => {
    ["title", "scope", "system", "reviewers"].forEach((k) => {
      if (k in changes && typeof changes[k] === "string") e[k] = changes[k].trim();
    });
    if ("status" in changes && GRC_AR_CAMPAIGN_STATUSES.indexOf(changes.status) !== -1) e.status = changes.status;
    ["openedAt", "dueAt"].forEach((k) => { if (k in changes) e[k] = grkToIso(changes[k]); });
    if ("cadenceMonths" in changes) {
      const n = Math.round(Number(changes.cadenceMonths));
      if (Number.isFinite(n) && n > 0) e.cadenceMonths = n;
    }
    return true;
  });
}

function grcArAddLine(id, line) {
  return arMutate(id, (e) => {
    if (e.status === "signed-off") return false;   // verrouillé
    const l = grkEnsure(line || {}, GRC_AR_LINE_SCHEMA);
    l.id = grkId("arl");
    e.lines.push(l);
    return l.id;
  });
}

// Ajout en masse : "subject;access" par ligne (I1). Renvoie le nb ajouté.
function grcArAddLinesBulk(id, text) {
  return arMutate(id, (e) => {
    if (e.status === "signed-off") return 0;
    let n = 0;
    String(text || "").split(/\r?\n/).forEach((raw) => {
      const t = raw.trim();
      if (!t) return;
      const parts = t.split(";");
      const subject = (parts[0] || "").trim();
      if (!subject) return;
      const l = grkEnsure({ subject: subject, access: (parts[1] || "").trim() }, GRC_AR_LINE_SCHEMA);
      l.id = grkId("arl");
      e.lines.push(l);
      n += 1;
    });
    return n;
  });
}

function grcArUpdateLine(id, lineId, changes) {
  return arMutate(id, (e) => {
    if (e.status === "signed-off") return false;
    const l = e.lines.find((x) => x.id === lineId);
    if (!l) return false;
    const n = Object.assign({}, changes);
    if ("decision" in n && GRC_AR_LINE_DECISIONS.indexOf(n.decision) === -1) delete n.decision;
    if ("done" in n) n.done = !!n.done;
    if ("lastUsed" in n) n.lastUsed = grkToIso(n.lastUsed);
    Object.assign(l, n);
    return true;
  });
}

function grcArRemoveLine(id, lineId) {
  return arMutate(id, (e) => {
    if (e.status === "signed-off") return false;
    const before = e.lines.length;
    e.lines = e.lines.filter((x) => x.id !== lineId);
    return e.lines.length < before;
  });
}

// Clôture : exige 0 ligne `pending`. -> signed-off + signedOffAt/By.
function grcArSignOffCampaign(id, by) {
  return arMutate(id, (e) => {
    if (e.status === "signed-off") return false;
    if (!e.lines.length || e.lines.some((l) => l.decision === "pending")) return false;
    e.status = "signed-off";
    e.signedOffAt = new Date().toISOString();
    e.signedOffBy = String(by || grkAuthorName() || "").trim();
    return true;
  });
}

function grcArReopenCampaign(id, note) {
  return arMutate(id, (e) => {
    if (e.status !== "signed-off") return false;
    e.status = "in-progress";
    e.reopenNote = ((e.reopenNote ? e.reopenNote + "\n" : "") +
      grkFmtDateTime(new Date().toISOString()) + " — " + String(note || "").trim()).trim();
    return true;
  });
}

/* ---------- JML : cœur ------------------------------------ */

function grcArSetJmlCore(id, changes) {
  return arMutate(id, (e) => {
    if ("person" in changes && typeof changes.person === "string") e.person = changes.person.trim();
    if ("systems" in changes && typeof changes.systems === "string") e.systems = changes.systems.trim();
    if ("note" in changes && typeof changes.note === "string") e.note = changes.note;
    if ("campaignId" in changes && typeof changes.campaignId === "string") e.campaignId = changes.campaignId.trim();
    if ("type" in changes && GRC_AR_JML_TYPES.indexOf(changes.type) !== -1) e.type = changes.type;
    if ("status" in changes && GRC_AR_JML_STATUSES.indexOf(changes.status) !== -1) e.status = changes.status;
    if ("at" in changes) e.at = grkToIso(changes.at);
    return true;
  });
}

/* ---------- dérivés ------------------------------------- */

function grcArCampaignProgress(campaign) {
  const lines = (campaign && campaign.lines) || [];
  const total = lines.length;
  const done = lines.filter((l) => l.done).length;
  const reviewed = lines.filter((l) => l.decision !== "pending").length;
  return { done: done, reviewed: reviewed, total: total,
    pct: total ? Math.round(reviewed / total * 100) : 0 };
}

function grcArCampaignOverdue(campaign) {
  if (!campaign || campaign.kind === "jml") return false;
  if (campaign.status === "signed-off" || campaign.status === "cancelled") return false;
  if (!campaign.dueAt) return false;
  const t = Date.parse(campaign.dueAt);
  return !isNaN(t) && t < Date.now();
}

function grcArNextCampaignDue(campaign) {
  if (!campaign || !campaign.signedOffAt) return null;
  return grkAddMonths(campaign.signedOffAt, campaign.cadenceMonths || GRC_AR_DEFAULT_CADENCE);
}

function grcArPendingRevocations(list) {
  return (Array.isArray(list) ? list : []).map(grcAccessReviewEnsureShape)
    .filter((e) => e.kind !== "jml")
    .reduce((acc, c) => acc + c.lines.filter((l) => l.decision === "revoke" && !l.done).length, 0);
}

function grcArIsStaleLeaver(jml, days) {
  const win = days == null ? GRC_AR_STALE_LEAVER_DAYS : days;
  if (!grcArIsJml(jml) || jml.type !== "leaver" || jml.status !== "todo" || !jml.at) return false;
  const t = Date.parse(jml.at);
  return !isNaN(t) && (Date.now() - t) > win * 86400000;
}

function grcArStaleLeavers(list, days) {
  return (Array.isArray(list) ? list : []).map(grcAccessReviewEnsureShape)
    .filter((e) => grcArIsStaleLeaver(e, days)).length;
}

function grcAccessReviewsSummary(list) {
  const arr = Array.isArray(list) ? list.map(grcAccessReviewEnsureShape) : [];
  const camps = arr.filter((e) => e.kind !== "jml");
  const jml = arr.filter(grcArIsJml);
  const active = camps.filter((c) => c.status === "in-progress")
    .sort((a, b) => Date.parse(b.openedAt || 0) - Date.parse(a.openedAt || 0))[0];
  return {
    campaigns: camps.length,
    jml: jml.length,
    overdueCampaigns: camps.filter(grcArCampaignOverdue).length,
    activeProgressPct: active ? grcArCampaignProgress(active).pct : null,
    pendingRevocations: grcArPendingRevocations(arr),
    staleLeavers: grcArStaleLeavers(arr),
  };
}

/* ---------- import (tableau OU entité unique) ----------- */

async function importGrcAccessReviewsFromJson(file) {
  const raw = await readJsonFile(file);
  const decoded = await vaultMaybeDecryptImport(raw);

  if (Array.isArray(decoded)) {
    saveGrcAccessReviews(decoded);
    return;
  }
  const isShape = decoded && typeof decoded === "object" && typeof decoded.id === "string" &&
    (decoded.kind === "jml" || typeof decoded.title === "string" || typeof decoded.person === "string");
  if (!isShape) throw new Error(grcT("grc.iam.invalidImport"));

  const list = getGrcAccessReviews();
  const idx = list.findIndex((e) => e && e.id === decoded.id);
  if (idx === -1) list.push(decoded);
  else list[idx] = decoded;
  saveGrcAccessReviews(list);
}

/* ================================================================== *
 *  Registre -- toggle Campagnes / Mouvements + 2 grkRegistry
 *  (filtrés par kind, même store) + encart commun (T2).
 *  Monté par grc/iam.html (#grcIamRegistry / #grcIamSummary).
 *  Réutilise le toggle CSS .grc-priv-kindbar/.grc-priv-kindbtn.
 * ================================================================== */

function _arEnumOptions(values, prefix) {
  return values.map((v) => ({ value: v, label: prefix + v }));
}

function _arMiniBadge(cls, i18nKey) {
  const el = document.createElement("span");
  el.className = "grc-sup-mini-badge " + cls;
  el.textContent = grcT(i18nKey);
  return el;
}

function _arSummarise() {
  const sm = grcAccessReviewsSummary(getGrcAccessReviews());   // store BRUT (bi-kind)
  if (!sm.campaigns && !sm.jml) return { chips: [grcT("grc.iam.summary.none")] };
  const chips = [
    grcT("grc.iam.summary.campaigns").replace("{n}", sm.campaigns),
    grcT("grc.iam.summary.jml").replace("{n}", sm.jml),
    grcT("grc.iam.summary.overdue").replace("{n}", sm.overdueCampaigns),
    grcT("grc.iam.summary.pendingRevocations").replace("{n}", sm.pendingRevocations),
    grcT("grc.iam.summary.staleLeavers").replace("{n}", sm.staleLeavers),
  ];
  if (sm.activeProgressPct != null) {
    chips.splice(2, 0, grcT("grc.iam.summary.activeProgress").replace("{pct}", sm.activeProgressPct));
  }
  return { chips: chips };
}

function initGrcIamRegistry() {
  const host = document.querySelector("#grcIamRegistry");
  if (!host) return;
  host.innerHTML = "";

  const bar = document.createElement("div");
  bar.className = "grc-priv-kindbar";
  const campBtn = document.createElement("button");
  campBtn.type = "button";
  campBtn.className = "grc-priv-kindbtn is-active";
  campBtn.textContent = grcT("grc.iam.filter.campaign");
  const jmlBtn = document.createElement("button");
  jmlBtn.type = "button";
  jmlBtn.className = "grc-priv-kindbtn";
  jmlBtn.textContent = grcT("grc.iam.filter.jml");
  bar.appendChild(campBtn);
  bar.appendChild(jmlBtn);
  host.appendChild(bar);

  const campMount = document.createElement("div");
  campMount.id = "grcIamCampList";
  const jmlMount = document.createElement("div");
  jmlMount.id = "grcIamJmlList";
  jmlMount.hidden = true;
  host.appendChild(campMount);
  host.appendChild(jmlMount);

  const showKind = (kind) => {
    const isCamp = kind !== "jml";
    campMount.hidden = !isCamp;
    jmlMount.hidden = isCamp;
    campBtn.classList.toggle("is-active", isCamp);
    jmlBtn.classList.toggle("is-active", !isCamp);
    if (isCamp && window.renderGrcCampaignsList) window.renderGrcCampaignsList();
    else if (!isCamp && window.renderGrcJmlList) window.renderGrcJmlList();
  };
  campBtn.addEventListener("click", () => showKind("campaign"));
  jmlBtn.addEventListener("click", () => showKind("jml"));

  /* --- registre Campagnes --- */
  grkRegistry({
    mount: "#grcIamCampList",
    summary: "#grcIamSummary",
    store: _grcAccessReviewsStore,
    schema: GRC_AR_CAMPAIGN_SCHEMA,
    idAttr: "data-iam-id",
    listGlobal: "renderGrcCampaignsList",
    deepLink: true,
    filter: (e) => e.kind !== "jml",
    i18n: {
      add: "grc.iam.camp.addBtn",
      titleAdd: "grc.iam.camp.title",
      titleEdit: "grc.iam.camp.titleEdit",
    },
    form: [
      { id: "title", label: "grc.iam.camp.name", type: "text", required: true },
      { id: "scope", label: "grc.iam.camp.scope", type: "text" },
      { id: "system", label: "grc.iam.camp.system", type: "text" },
      { id: "reviewers", label: "grc.iam.camp.reviewers", type: "text" },
    ],
    readForm: (e) => ({ title: e.title, scope: e.scope, system: e.system, reviewers: e.reviewers }),
    submit: (v, editingId) => {
      const fields = {
        title: (v.title || "").trim(), scope: (v.scope || "").trim(),
        system: (v.system || "").trim(), reviewers: (v.reviewers || "").trim(),
      };
      if (editingId) grcArSetCampaignCore(editingId, fields);
      else addGrcCampaign(fields);
    },
    header: (e) => {
      const p = grcArCampaignProgress(e);
      const cells = [
        { text: e.title || "" },
        { text: grcT("grc.iam.cs." + e.status) },
      ];
      const prog = document.createElement("span");
      prog.className = "grc-crit-badge " + (p.pct === 100 ? "low" : (p.pct > 0 ? "medium" : "info"));
      prog.textContent = p.reviewed + "/" + p.total + " · " + p.pct + " %";
      cells.push(prog);
      if (grcArCampaignOverdue(e)) cells.push(_arMiniBadge("grc-sup-badge-expired", "grc.iam.camp.overdueAlert"));
      return cells;
    },
    panel: typeof renderCampaignPanel === "function" ? renderCampaignPanel : null,
    summarise: _arSummarise,
    importFn: importGrcAccessReviewsFromJson,
    confirmName: (e) => e.title || "",
  })();

  /* --- registre Mouvements (JML) --- */
  grkRegistry({
    mount: "#grcIamJmlList",
    summary: "#grcIamSummary",
    store: _grcAccessReviewsStore,
    schema: GRC_AR_JML_SCHEMA,
    idAttr: "data-iam-id",
    listGlobal: "renderGrcJmlList",
    deepLink: true,
    filter: grcArIsJml,
    i18n: {
      add: "grc.iam.jml.addBtn",
      titleAdd: "grc.iam.jml.title",
      titleEdit: "grc.iam.jml.titleEdit",
    },
    form: [
      { id: "person", label: "grc.iam.jml.person", type: "text", required: true },
      { id: "type", label: "grc.iam.jml.type", type: "select",
        options: _arEnumOptions(GRC_AR_JML_TYPES, "grc.iam.jt.") },
      { id: "systems", label: "grc.iam.jml.systems", type: "text" },
    ],
    readForm: (e) => ({ person: e.person, type: e.type, systems: e.systems }),
    submit: (v, editingId) => {
      const fields = {
        person: (v.person || "").trim(), type: v.type, systems: (v.systems || "").trim(),
      };
      if (editingId) grcArSetJmlCore(editingId, fields);
      else addGrcJmlEvent(fields);
    },
    header: (e) => {
      const cells = [
        { text: e.person || "" },
        { text: grcT("grc.iam.jt." + e.type) },
        { text: grcT("grc.iam.js." + e.status) },
      ];
      if (grcArIsStaleLeaver(e)) cells.push(_arMiniBadge("grc-sup-badge-expired", "grc.iam.jml.staleAlert"));
      return cells;
    },
    panel: typeof renderJmlPanel === "function" ? renderJmlPanel : null,
    summarise: _arSummarise,
    importFn: importGrcAccessReviewsFromJson,
    confirmName: (e) => e.person || "",
  })();

  showKind("campaign");
}

/* ================================================================== *
 *  Exports (T6) -- via le kit (grkExport*). Rapport de campagne
 *  (Word), lignes (CSV), JSON. Aucune requête réseau.
 * ================================================================== */

function _arKV(rows) {
  return "<table><tbody>" + rows.map((r) =>
    "<tr><th>" + grkEscapeHtml(r[0]) + "</th><td>" + grkEscapeHtml(r[1]) + "</td></tr>"
  ).join("") + "</tbody></table>";
}

function campaignReportBody(campaign) {
  const c = grcAccessReviewEnsureShape(campaign);
  const L = (k) => grcT(k);
  const lang = (typeof getSavedLang === "function" && getSavedLang() === "en") ? "en-CA" : "fr-CA";
  const author = grkAuthorName();
  const p = grcArCampaignProgress(c);

  let h = "<h1>" + L("grc.iam.report.campTitle") + "</h1>";
  h += "<p><strong>" + L("grc.iam.report.generatedOn") + " :</strong> " +
    grkEscapeHtml(new Date().toLocaleString(lang));
  if (author) h += " — <strong>" + L("grc.iam.report.by") + " :</strong> " + grkEscapeHtml(author);
  h += "</p>";
  h += "<h2>" + grkEscapeHtml(c.title || "—") + "</h2>";
  h += _arKV([
    [L("grc.iam.camp.scope"), c.scope],
    [L("grc.iam.camp.system"), c.system],
    [L("grc.iam.camp.reviewers"), c.reviewers],
    [L("grc.iam.camp.status"), L("grc.iam.cs." + c.status)],
    [L("grc.iam.camp.openedAt"), c.openedAt ? c.openedAt.slice(0, 10) : "—"],
    [L("grc.iam.camp.dueAt"), (c.dueAt ? c.dueAt.slice(0, 10) : "—") + (grcArCampaignOverdue(c) ? " ⚠" : "")],
    [L("grc.iam.lines.progress").replace("{reviewed}", p.reviewed).replace("{total}", p.total)
      .replace("{pct}", p.pct).replace("{done}", p.done), ""],
  ]);
  if (c.status === "signed-off") {
    h += "<p><strong>" + grkEscapeHtml(L("grc.iam.signoff.done")
      .replace("{date}", c.signedOffAt ? c.signedOffAt.slice(0, 10) : "—")
      .replace("{by}", c.signedOffBy || "—")) + "</strong></p>";
  }
  if (c.reopenNote) {
    h += "<h3>" + L("grc.iam.signoff.reopenLog") + "</h3><p>" +
      grkEscapeHtml(c.reopenNote).replace(/\n/g, "<br>") + "</p>";
  }

  h += "<h3>" + L("grc.iam.lines.title") + "</h3>";
  if (!c.lines.length) { h += "<p><em>" + L("grc.iam.report.none") + "</em></p>"; return h; }
  h += "<table><thead><tr><th>" + L("grc.iam.lines.subject") + "</th><th>" +
    L("grc.iam.lines.access") + "</th><th>" + L("grc.iam.lines.lastUsed") + "</th><th>" +
    L("grc.iam.lines.decision") + "</th><th>" + L("grc.iam.lines.justification") + "</th><th>" +
    L("grc.iam.lines.done") + "</th></tr></thead><tbody>";
  c.lines.forEach((ln) => {
    h += "<tr><td>" + grkEscapeHtml(ln.subject) +
      "</td><td>" + grkEscapeHtml(ln.access) +
      "</td><td>" + grkEscapeHtml(ln.lastUsed ? ln.lastUsed.slice(0, 10) : "—") +
      "</td><td>" + grkEscapeHtml(L("grc.iam.dec." + ln.decision)) +
      "</td><td>" + grkEscapeHtml(ln.justification) +
      "</td><td>" + grkEscapeHtml(ln.done ? "✓" : "") + "</td></tr>";
  });
  h += "</tbody></table>";
  return h;
}

function _arSlug(e) {
  return grkSlug(e && (e.title || e.person), e && e.kind === "jml" ? "jml" : "campagne");
}

function exportAccessReviewAsJson(scope) {
  const name = Array.isArray(scope)
    ? "iam-recertification-" + grkDateStamp() + ".json"
    : (scope && scope.kind === "jml" ? "jml-" : "campagne-") + _arSlug(scope) + "-" + grkDateStamp() + ".json";
  return grkExportJson(scope, name);
}

function exportCampaignReportAsWord(campaign) {
  grkExportWord(campaignReportBody(campaign), "campagne-" + _arSlug(campaign) + "-" + grkDateStamp() + ".doc",
    grcT("grc.iam.report.campTitle"));
}

function exportCampaignLinesCsv(campaign) {
  const c = grcAccessReviewEnsureShape(campaign);
  const rows = [["subject", "access", "lastUsed", "decision", "justification", "done"]];
  c.lines.forEach((ln) => {
    rows.push([ln.subject, ln.access, ln.lastUsed ? ln.lastUsed.slice(0, 10) : "",
      ln.decision, ln.justification, ln.done ? "1" : "0"]);
  });
  grkExportCsv(rows, "campagne-" + _arSlug(c) + "-lignes-" + grkDateStamp() + ".csv");
}
