/* Documents exigés — bilan de préparation à l'audit (grc-debutant B4,
   grc-normes NH). Une ligne par information documentée exigée par ISO/IEC
   27001:2022 (clauses + Annexe A) et ISO 22301:2019, avec l'endroit où
   elle se trouve dans l'application et un état calculé :
     manquant  rien de saisi ;
     commencé  des entrées existent mais la règle n'est pas remplie, ou une
               rupture de chaîne bloquante subsiste ;
     prêt      règle remplie et aucune rupture bloquante (spec §2.4).
   Lecture directe des stockages (grcLinksCtx) : fonctionne sur le hub,
   Démarrer ici et le tableau de bord sans charger les registres.
   Limites (chaine.md I4) : bilan indicatif, approbations déclaratives. */

const _EX_L = (fr, en) => ({ fr: fr, en: en });

function _exFiche(ctx, page, el) {
  const key = "/grc/fiches/" + page + "/" + el;
  if (!ctx._fiche) ctx._fiche = {};
  if (!ctx._fiche[key]) ctx._fiche[key] = typeof _grcLinksReadKey === "function" ? _grcLinksReadKey(key) : [];
  return ctx._fiche[key];
}

const _EX_YEAR = 365 * 864e5;
const _exRecent = (iso) => !!iso && Date.now() - Date.parse(iso) < _EX_YEAR;
// n = nombre d'éléments trouvés, ok = règle remplie.
const _exRule = (n, ok) => (n === 0 ? "manquant" : (ok ? "pret" : "commence"));

const GRC_REQUIRED_DOCS = [
  // --- ISO 27001 : clauses
  { id: "27001-4.3", std: "27001", ref: "4.3", label: _EX_L("Domaine d’application (portée) du SGSI", "ISMS scope"),
    where: ["contexte-organisationnel", "portee-sgsi"], block: ["T11"],
    test: (c) => { const l = _exFiche(c, "contexte-organisationnel", "portee-sgsi"); return _exRule(l.length, l.some((e) => e.statut === "approuve")); } },
  { id: "27001-5.2", std: "27001", ref: "5.2", label: _EX_L("Politique de sécurité de l’information", "Information security policy"),
    where: ["directives", "politique-securite"],
    test: (c) => { const l = _exFiche(c, "directives", "politique-securite"); const docs = c.list("document").filter((d) => d.docType === "policy"); return _exRule(l.length + docs.length, l.length > 0 && docs.some((d) => d.status === "approved" || d.status === "published")); } },
  { id: "27001-6.1.2", std: "27001", ref: "6.1.2", label: _EX_L("Processus d’appréciation des risques", "Risk assessment process"),
    where: ["analyse-risques", "methodologie"],
    test: (c) => { const a = _exFiche(c, "analyse-risques", "methodologie").length; const b = _exFiche(c, "analyse-risques", "contexte").length; return _exRule(a + b, a > 0 && b > 0); } },
  { id: "27001-6.1.3", std: "27001", ref: "6.1.3", label: _EX_L("Processus de traitement des risques", "Risk treatment process"),
    where: ["traitement-risques", "plans"], block: ["T3", "T4"],
    test: (c) => _exRule(c.list("plan").length, c.list("plan").length > 0) },
  { id: "27001-6.1.3d", std: "27001", ref: "6.1.3 d)", label: _EX_L("Déclaration d’applicabilité (DDA) complète", "Complete Statement of Applicability (SoA)"),
    where: ["controles", "soa"], block: ["T5", "T8", "T13", "T14"],
    test: (c) => { const s = c.list("soa"); const bad = s.some((d) => d.applicable === "non" && !(d.justification || "").trim()); return _exRule(s.length, !bad && s.filter((d) => d.applicable).length >= (typeof GRC_ANNEX_A !== "undefined" ? GRC_ANNEX_A.length : 93)); } },
  { id: "27001-8.3", std: "27001", ref: "6.1.3 e) · 8.3", label: _EX_L("Plan et résultats du traitement des risques", "Risk treatment plan and results"),
    where: ["traitement-risques", "suivi"], block: ["T3"],
    test: (c) => { const r = c.list("risk"); return _exRule(r.length, r.length > 0); } },
  { id: "27001-6.2", std: "27001", ref: "6.2", label: _EX_L("Objectifs de sécurité de l’information", "Information security objectives"),
    where: ["gouvernance", "sgsi"], block: ["T10"],
    test: (c) => { const o = c.list("objectif").filter((e) => e.aspect === "objectif"); return _exRule(o.length, o.some((e) => (e.mesure || "").trim() && e.echeance)); } },
  { id: "27001-6.3", std: "27001", ref: "6.3", label: _EX_L("Modifications planifiées du SGSI", "Planned ISMS changes"),
    where: ["gouvernance", "modifications"], block: ["T15"], optional: true,
    test: (c) => _exRule(c.list("modification").length, true) },
  { id: "27001-7.2", std: "27001", ref: "7.2 d)", label: _EX_L("Preuves de compétence", "Evidence of competence"),
    where: ["ressources-humaines", "competences"],
    test: (c) => { const l = _exFiche(c, "ressources-humaines", "competences"); return _exRule(l.length, l.some((e) => (e.preuve || "").trim())); } },
  { id: "27001-7.5", std: "27001", ref: "7.5.1 b)", label: _EX_L("Documentation jugée nécessaire", "Documentation deemed necessary"),
    where: ["documentation", "registre"],
    test: (c) => { const d = c.list("document"); return _exRule(d.length, d.some((x) => x.status === "published" || x.status === "approved")); } },
  { id: "27001-8.1", std: "27001", ref: "8.1", label: _EX_L("Informations de maîtrise opérationnelle", "Operational control information"),
    where: ["procedures", "acces"],
    test: (c) => { const n = ["acces", "changements", "sauvegarde", "restauration", "incidents", "actifs", "escalade", "mco"].filter((e) => _exFiche(c, "procedures", e).length).length; return _exRule(n, n >= 1); } },
  { id: "27001-8.2", std: "27001", ref: "8.2", label: _EX_L("Résultats de l’appréciation des risques", "Risk assessment results"),
    where: ["analyse-risques", "registre"], block: ["T1", "T2"],
    test: (c) => { const r = c.list("risk"); return _exRule(r.length, r.some((x) => x.probability && x.impact)); } },
  { id: "27001-9.1", std: "27001", ref: "9.1", label: _EX_L("Résultats de surveillance et de mesure", "Monitoring and measurement results"),
    where: ["indicateurs", "registre"], block: ["T10"],
    test: (c) => { const m = c.list("metric"); return _exRule(m.length, m.some((x) => Array.isArray(x.series) && x.series.length)); } },
  { id: "27001-9.2.2", std: "27001", ref: "9.2.2", label: _EX_L("Programme et résultats d’audit interne", "Internal audit programme and results"),
    where: ["conformite", "programme-audit"], block: ["T17"],
    test: (c) => { const p = c.list("programmeAudit").length; const a = c.list("audit").filter((x) => x.type === "internal").length; return _exRule(p + a, p > 0 && a > 0); } },
  { id: "27001-9.3.3", std: "27001", ref: "9.3.3", label: _EX_L("Résultats des revues de direction", "Management review results"),
    where: ["gouvernance", "revues-direction"], block: ["T21"],
    test: (c) => { const r = c.list("revue"); return _exRule(r.length, r.some((x) => _exRecent(x.date))); } },
  { id: "27001-10.2", std: "27001", ref: "10.2", label: _EX_L("Non-conformités et actions correctives (toutes sources)", "Nonconformities and corrective actions (all sources)"),
    where: ["gouvernance", "amelioration"], block: ["T16"],
    test: (c) => { const a = c.list("amelioration"); return _exRule(a.length, a.length > 0); } },
  // --- ISO 27001 : Annexe A (documents attendus en pratique)
  { id: "27001-A.5.9", std: "27001", ref: "A.5.9", label: _EX_L("Inventaire des actifs", "Asset inventory"),
    where: ["actifs", "registre"],
    test: (c) => { const a = c.list("asset"); return _exRule(a.length, a.length > 0 && a.every((x) => (x.owner || "").trim())); } },
  { id: "27001-A.5.10", std: "27001", ref: "A.5.10", label: _EX_L("Règles d’utilisation acceptable", "Acceptable use rules"),
    where: ["directives", "utilisation-acceptable"],
    test: (c) => _exRule(_exFiche(c, "directives", "utilisation-acceptable").length, true) },
  { id: "27001-A.5.15", std: "27001", ref: "A.5.15", label: _EX_L("Règles de contrôle d’accès", "Access control rules"),
    where: ["directives", "acces"],
    test: (c) => _exRule(_exFiche(c, "directives", "acces").length, true) },
  { id: "27001-A.5.19", std: "27001", ref: "A.5.19 – A.5.21", label: _EX_L("Relations avec les fournisseurs", "Supplier relationships"),
    where: ["fournisseurs", "registre"], block: ["T12"],
    test: (c) => _exRule(c.list("supplier").length, true) },
  { id: "27001-A.5.24", std: "27001", ref: "A.5.24", label: _EX_L("Planification de la gestion des incidents", "Incident management planning"),
    where: ["incidents", "classification"],
    test: (c) => { const n = ["classification", "reponse", "escalade"].filter((e) => _exFiche(c, "incidents", e).length).length; return _exRule(n, n === 3); } },
  { id: "27001-A.5.29", std: "27001", ref: "A.5.29 – A.5.30", label: _EX_L("Continuité et préparation des TIC", "Continuity and ICT readiness"),
    where: ["continuite", "registre"], block: ["T9"],
    test: (c) => { const p = c.list("continuity"); return _exRule(p.length, p.some((x) => x.bia && (x.bia.mtdMin != null || x.bia.rtoMin != null))); } },
  { id: "27001-A.5.31", std: "27001", ref: "A.5.31", label: _EX_L("Exigences légales, réglementaires et contractuelles", "Legal, regulatory and contractual requirements"),
    where: ["conformite", "registre-conformite"], block: ["T7"],
    test: (c) => _exRule(c.list("obligation").length, true) },
  { id: "27001-A.5.37", std: "27001", ref: "A.5.37", label: _EX_L("Procédures d’exploitation documentées", "Documented operating procedures"),
    where: ["procedures", "acces"],
    test: (c) => { const n = ["acces", "changements", "sauvegarde", "restauration", "incidents", "actifs", "escalade", "mco"].filter((e) => _exFiche(c, "procedures", e).length).length; return _exRule(n, n >= 3); } },
  { id: "27001-A.6", std: "27001", ref: "A.6.1 – A.6.8", label: _EX_L("Sécurité liée aux ressources humaines", "People controls"),
    where: ["ressources-humaines", "selection"],
    test: (c) => { const n = ["selection", "conditions", "sensibilisation", "depart"].filter((e) => _exFiche(c, "ressources-humaines", e).length).length; return _exRule(n, n === 4); } },
  { id: "27001-A.7", std: "27001", ref: "A.7.1 – A.7.14", label: _EX_L("Sécurité physique", "Physical security"),
    where: ["securite-physique", "zones"],
    test: (c) => _exRule(_exFiche(c, "securite-physique", "zones").length, true) },
  // --- ISO 22301
  { id: "22301-4.3", std: "22301", ref: "4.3", label: _EX_L("Domaine d’application du SMCA", "BCMS scope"),
    where: ["contexte-organisationnel", "portee-pca"],
    test: (c) => _exRule(_exFiche(c, "contexte-organisationnel", "portee-pca").length, true) },
  { id: "22301-5.2", std: "22301", ref: "5.2", label: _EX_L("Politique de continuité", "Business continuity policy"),
    where: ["continuite-pca", "politique"],
    test: (c) => _exRule(_exFiche(c, "continuite-pca", "politique").length, true) },
  { id: "22301-6.2", std: "22301", ref: "6.2", label: _EX_L("Objectifs de continuité", "Business continuity objectives"),
    where: ["continuite-pca", "objectifs"],
    test: (c) => _exRule(_exFiche(c, "continuite-pca", "objectifs").length, true) },
  { id: "22301-7.2", std: "22301", ref: "7.2", label: _EX_L("Preuves de compétence (continuité)", "Evidence of competence (continuity)"),
    where: ["continuite", "formation"],
    test: (c) => _exRule(_exFiche(c, "continuite", "formation").length + _exFiche(c, "ressources-humaines", "competences").length, true) },
  { id: "22301-8.2", std: "22301", ref: "8.2.1 – 8.2.3", label: _EX_L("BIA avec impacts et ressources dans le temps, appréciation des risques", "BIA with impacts and resources over time, risk assessment"),
    where: ["continuite", "registre"], block: ["T9", "T18", "T22", "T23"],
    // BIA = registre par processus (spec/grc-bia-register/) ou, à défaut, BIA d'un plan.
    test: (c) => { const p = c.list("continuity").concat(c.list("bia")); const sc = _exFiche(c, "continuite", "analyse-risques-pca").length; return _exRule(p.length + sc, p.some((x) => x.bia && Array.isArray(x.bia.timeline) && x.bia.timeline.some((t) => t.level)) && sc > 0); } },
  { id: "22301-8.3", std: "22301", ref: "8.3", label: _EX_L("Stratégies et solutions", "Strategies and solutions"),
    where: ["continuite", "strategies"],
    test: (c) => _exRule(_exFiche(c, "continuite", "strategies").length, true) },
  { id: "22301-8.4", std: "22301", ref: "8.4", label: _EX_L("Plans et procédures de continuité", "Business continuity plans and procedures"),
    where: ["continuite", "registre"],
    test: (c) => { const p = c.list("continuity"); return _exRule(p.length, p.some((x) => Array.isArray(x.drp) && x.drp.length)); } },
  { id: "22301-8.4.3", std: "22301", ref: "8.4.3", label: _EX_L("Procédures d’alerte et de communication", "Warning and communication procedures"),
    where: ["continuite-pgc", "arbre-appel"], block: ["T19"],
    test: (c) => { const a = _exFiche(c, "continuite-pgc", "arbre-appel").length; const m = _exFiche(c, "continuite-pcm", "messages").length; return _exRule(a + m, a > 0 && m > 0); } },
  { id: "22301-8.5", std: "22301", ref: "8.5", label: _EX_L("Programme et rapports d’exercice", "Exercise programme and reports"),
    where: ["continuite-tests-exercices", "rapports"],
    test: (c) => { const r = _exFiche(c, "continuite-tests-exercices", "rapports"); const p = _exFiche(c, "continuite-tests-exercices", "programme"); return _exRule(r.length + p.length, r.some((x) => _exRecent(x.date))); } },
  { id: "22301-8.6", std: "22301", ref: "8.6", label: _EX_L("Évaluation des capacités (fournisseurs critiques)", "Capability evaluation (critical suppliers)"),
    where: ["fournisseurs", "capacites-continuite"],
    test: (c) => { const l = _exFiche(c, "fournisseurs", "capacites-continuite"); return _exRule(l.length, l.length > 0); } },
  { id: "22301-9.1", std: "22301", ref: "9.1", label: _EX_L("Résultats de surveillance (continuité)", "Monitoring results (continuity)"),
    where: ["indicateurs", "registre"],
    test: (c) => { const m = c.list("metric").filter((x) => x.domaine === "pca"); return _exRule(m.length, m.length > 0); } },
  { id: "22301-9.2", std: "22301", ref: "9.2", label: _EX_L("Programme et résultats d’audit interne (continuité)", "Internal audit programme and results (continuity)"),
    where: ["conformite", "programme-audit"],
    test: (c) => _exRule(c.list("audit").length, c.list("audit").length > 0) },
  { id: "22301-9.3", std: "22301", ref: "9.3", label: _EX_L("Résultats des revues de direction", "Management review results"),
    where: ["gouvernance", "revues-direction"],
    test: (c) => { const r = c.list("revue"); return _exRule(r.length, r.some((x) => _exRecent(x.date))); } },
];

const _GRC_EX_I18N = {
  "grc.ex.title": { fr: "Documents exigés", en: "Required documents" },
  "grc.ex.limits": {
    fr: "Bilan indicatif calculé à partir de ta saisie locale. Les approbations sont déclaratives (aucune signature vérifiée). Ne remplace pas un audit.",
    en: "Indicative report computed from your local entries. Approvals are declarative (no verified signature). Does not replace an audit."
  },
  "grc.ex.col.std": { fr: "Norme", en: "Standard" },
  "grc.ex.col.ref": { fr: "Réf.", en: "Ref." },
  "grc.ex.col.doc": { fr: "Information documentée", en: "Documented information" },
  "grc.ex.col.state": { fr: "État", en: "Status" },
  "grc.ex.col.where": { fr: "Où", en: "Where" },
  "grc.ex.col.breaks": { fr: "Ruptures bloquantes", en: "Blocking breaks" },
  "grc.ex.st.manquant": { fr: "manquant", en: "missing" },
  "grc.ex.st.commence": { fr: "commencé", en: "started" },
  "grc.ex.st.pret": { fr: "prêt", en: "ready" },
  "grc.ex.filter.all": { fr: "Tout", en: "All" },
  "grc.ex.show22301": { fr: "Afficher ISO 22301", en: "Show ISO 22301" },
  "grc.ex.hidden22301": { fr: "ISO 22301 masquée : aucun PCA visé pour l’instant (aucune portée PCA ni plan de continuité).", en: "ISO 22301 hidden: no BCP targeted yet (no BCP scope or continuity plan)." },
  "grc.ex.summary": { fr: "Documents exigés : {r} / {t} prêts · {b} rupture(s)", en: "Required documents: {r} / {t} ready · {b} break(s)" },
  "grc.ex.open": { fr: "Ouvrir", en: "Open" },
  "grc.ex.exportWord": { fr: "Bilan Word", en: "Report Word" },
  "grc.ex.exportPdf": { fr: "Bilan PDF", en: "Report PDF" },
  "grc.ex.exportCsv": { fr: "Bilan CSV", en: "Report CSV" },
  "grc.ex.docTitle": { fr: "Bilan de préparation à l’audit — documents exigés", en: "Audit readiness report — required documents" },
};
if (typeof I18N_DICT !== "undefined") Object.assign(I18N_DICT, _GRC_EX_I18N);

function _exT(v) {
  return typeof grcLinksT === "function" ? grcLinksT(v) : (v && v.fr) || "";
}

// La norme ISO 22301 est-elle visée ? (D5 : masquée sinon)
function grcExigencesPcaTargeted(ctx) {
  return _exFiche(ctx, "contexte-organisationnel", "portee-pca").length > 0 || ctx.list("continuity").length > 0;
}

// [{ doc, state, breaks: [{ code, n }], href }]
function grcExigencesCompute(opts) {
  const o = opts || {};
  const ctx = grcLinksCtx();
  const rupt = typeof grcLinksRuptures === "function" ? grcLinksRuptures() : [];
  const byCode = {};
  rupt.forEach((r) => { byCode[r.code] = r.items.length; });
  const with22301 = o.all22301 || grcExigencesPcaTargeted(ctx);
  return GRC_REQUIRED_DOCS.filter((d) => (d.std !== "22301" || with22301) && (!o.std || d.std === o.std)).map((d) => {
    let state;
    try { state = d.test(ctx); } catch (e) { state = "manquant"; }
    const breaks = (d.block || []).filter((c) => byCode[c]).map((c) => ({ code: c, n: byCode[c] }));
    if (state === "pret" && breaks.length) state = "commence";
    const order = typeof GRC_PAGE_ORDER !== "undefined" ? GRC_PAGE_ORDER.find((x) => x.page === d.where[0]) : null;
    // Hors démarche : sous-pages de Continuité, pages de Sécurité opérationnelle (RH, physique).
    const file = order ? order.file : (typeof grcFichePageFile === "function" ? grcFichePageFile(d.where[0]) : d.where[0] + ".html");
    return { doc: d, state: state, breaks: breaks, href: (typeof grcLinksBase === "function" ? grcLinksBase() : "") + file + "#fiche-" + d.where[1] };
  });
}

function grcExigencesSummary() {
  const rows = grcExigencesCompute();
  const breaks = typeof grcLinksRuptures === "function" ? grcLinksRuptures().reduce((n, r) => n + r.items.length, 0) : 0;
  return { ready: rows.filter((r) => r.state === "pret").length, total: rows.length, breaks: breaks };
}

function _exTable(rows) {
  return {
    columns: ["grc.ex.col.std", "grc.ex.col.ref", "grc.ex.col.doc", "grc.ex.col.state", "grc.ex.col.breaks"].map(grcT),
    rows: rows.map((r) => ["ISO " + r.doc.std, r.doc.ref, _exT(r.doc.label), grcT("grc.ex.st." + r.state), r.breaks.map((b) => b.code + " (" + b.n + ")").join(", ")]),
  };
}

function _exDocHtml(rows) {
  const esc = grkEscapeHtml;
  const t = _exTable(rows);
  return "<h1>" + esc(grcT("grc.ex.docTitle")) + "</h1><p><em>" + esc(new Date().toISOString().slice(0, 10)) + "</em></p>" +
    "<p><strong>" + esc(grcT("grc.ex.limits")) + "</strong></p>" +
    "<table border='1' cellspacing='0' cellpadding='4'><thead><tr>" + t.columns.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr></thead><tbody>" +
    t.rows.map((r) => "<tr>" + r.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
}

function _exGated() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    alert(grcT("grc.common.vaultLockedExport"));
    return true;
  }
  return false;
}

function grcExigencesExport(kind, opts) {
  if (_exGated()) return;
  const rows = grcExigencesCompute(opts);
  if (kind === "pdf") { grkPrintWindow(_exDocHtml(rows), grcT("grc.ex.docTitle")); return; }
  if (kind === "word") {
    const html = "<html><head><meta charset='utf-8'></head><body style='font-family:Calibri,Arial,sans-serif;'>" + _exDocHtml(rows) + "</body></html>";
    triggerDownload(new Blob(["﻿", html], { type: "application/msword" }), "documents-exiges-" + grkDateStamp() + ".doc");
    return;
  }
  const t = _exTable(rows);
  const cell = (v) => { let s = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const csv = [[grcT("grc.ex.limits")]].concat([t.columns]).concat(t.rows).map((r) => r.map(cell).join(";")).join("\r\n");
  triggerDownload(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }), "documents-exiges-" + grkDateStamp() + ".csv");
}

const _grcExUi = { std: "", all22301: false };

function grcExigencesRender(host) {
  host.innerHTML = "";
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    if (typeof vaultGateOr === "function") vaultGateOr(host, () => grcExigencesRender(host));
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "grc-ex";
  const lim = document.createElement("p");
  lim.className = "grc-ex-limits";
  lim.textContent = grcT("grc.ex.limits");
  wrap.appendChild(lim);

  const bar = document.createElement("div");
  bar.className = "grc-toolbar grc-ex-bar";
  const sel = document.createElement("select");
  sel.className = "grc-ex-std";
  [["", grcT("grc.ex.filter.all")], ["27001", "ISO 27001"], ["22301", "ISO 22301"]].forEach(([v, l]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = l;
    sel.appendChild(o);
  });
  sel.value = _grcExUi.std;
  sel.addEventListener("change", () => { _grcExUi.std = sel.value; grcExigencesRender(host); });
  bar.appendChild(sel);
  const ctx = grcLinksCtx();
  if (!grcExigencesPcaTargeted(ctx)) {
    const lab = document.createElement("label");
    lab.className = "grc-ex-22301";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = _grcExUi.all22301;
    cb.addEventListener("change", () => { _grcExUi.all22301 = cb.checked; grcExigencesRender(host); });
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(" " + grcT("grc.ex.show22301")));
    bar.appendChild(lab);
  }
  [["word", "grc.ex.exportWord"], ["pdf", "grc.ex.exportPdf"], ["csv", "grc.ex.exportCsv"]].forEach(([k, key]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-toolbar-btn";
    b.textContent = grcT(key);
    b.addEventListener("click", () => grcExigencesExport(k, _grcExUi));
    bar.appendChild(b);
  });
  wrap.appendChild(bar);
  if (!grcExigencesPcaTargeted(ctx) && !_grcExUi.all22301) {
    const p = document.createElement("p");
    p.className = "grc-fiche-hint";
    p.textContent = grcT("grc.ex.hidden22301");
    wrap.appendChild(p);
  }

  const rows = grcExigencesCompute(_grcExUi);
  const s = rows.filter((r) => r.state === "pret").length;
  const sum = document.createElement("p");
  sum.className = "grc-ex-summary";
  sum.textContent = grcT("grc.ex.summary").replace("{r}", s).replace("{t}", rows.length)
    .replace("{b}", rows.reduce((n, r) => n + r.breaks.reduce((m, b) => m + b.n, 0), 0));
  wrap.appendChild(sum);

  const tw = document.createElement("div");
  tw.className = "grc-fiche-table-wrap";
  const table = document.createElement("table");
  table.className = "grc-fiche-table grc-ex-table";
  const thead = document.createElement("thead");
  const tr0 = document.createElement("tr");
  ["std", "ref", "doc", "state", "breaks", "where"].forEach((c) => {
    const th = document.createElement("th");
    th.textContent = grcT("grc.ex.col." + c);
    tr0.appendChild(th);
  });
  thead.appendChild(tr0);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.dataset.doc = r.doc.id;
    tr.className = "grc-ex-row grc-ex-" + r.state;
    const cells = ["ISO " + r.doc.std, r.doc.ref, _exT(r.doc.label)];
    cells.forEach((v) => { const td = document.createElement("td"); td.textContent = v; tr.appendChild(td); });
    const st = document.createElement("td");
    const b = document.createElement("span");
    b.className = "grc-fiche-badge grc-ex-state grc-ex-state-" + r.state;
    b.textContent = grcT("grc.ex.st." + r.state);
    st.appendChild(b);
    tr.appendChild(st);
    const br = document.createElement("td");
    br.textContent = r.breaks.map((x) => x.code + " (" + x.n + ")").join(", ");
    tr.appendChild(br);
    const wh = document.createElement("td");
    const a = document.createElement("a");
    a.href = r.href;
    a.textContent = grcT("grc.ex.open");
    wh.appendChild(a);
    tr.appendChild(wh);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tw.appendChild(table);
  wrap.appendChild(tw);
  host.appendChild(wrap);
}
