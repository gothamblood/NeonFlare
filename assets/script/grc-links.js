/* Chaîne de dépendances GRC (spec/grc-fiches/chaine.md).

   Catalogue central :
   - GRC_LINK_TYPES : types d'entités (registres, entrées de fiches,
     catalogue Annexe A, décisions DDA) — clé de stockage, libellé, page.
   - GRC_LINKS      : liens (type source, chemin du champ, type cible,
     cardinalité) — une seule source de vérité pour M2 (dépend de / utilisé
     par), M4 (ruptures), I1 (suppression protégée), I2 (import) et le
     rapprochement des anciens textes (§5).

   Lit directement les stockages (vaultGetItem) : fonctionne sur toute
   page, y compris le hub et le tableau de bord, sans charger les scripts
   des registres. Coffre verrouillé : les lectures renvoient [] (les
   appelants affichent déjà l'écran de déverrouillage).

   Règle I3 : chaque calcul lit chaque stockage une seule fois (contexte
   de lecture), l'index des liens entrants est construit une fois. */

const GRC_FICHE_KEY = (page, el) => "/grc/fiches/" + page + "/" + el;
const GRC_SOA_KEY = "/grc/soa/registry";

const _L = (fr, en) => ({ fr: fr, en: en });

function grcLinksT(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  const en = typeof getSavedLang === "function" && getSavedLang() === "en";
  return (en ? v.en : v.fr) || v.fr || "";
}

/* ---------- types d'entités ---------------------------------------- */

// Page de fiche -> fichier sous grc/ (sous-pages de Continuité, hubs
// techniques « tech-<section>--<page> », grc-normes N11).
// Pages de fiche situées hors de grc/ racine.
const GRC_FICHE_PAGE_FILES = {
  "ressources-humaines": "securite/operationnelle/ressources-humaines.html",
  "securite-physique": "securite/operationnelle/securite-physique.html",
};

function grcFichePageFile(page) {
  if (GRC_FICHE_PAGE_FILES[page]) return GRC_FICHE_PAGE_FILES[page];
  if (page.indexOf("continuite-") === 0) return "continuite/" + page.slice(11) + ".html";
  if (page.indexOf("tech-") === 0) return "securite/" + page.slice(5).replace("--", "/") + ".html";
  return page + ".html";
}

function _ficheType(page, el, labelField, name, extra) {
  return Object.assign({
    key: GRC_FICHE_KEY(page, el), fiche: true, page: page, el: el,
    pageFile: grcFichePageFile(page),
    tab: el, label: (e) => e[labelField] || "", name: name,
  }, extra || {});
}

const GRC_LINK_TYPES = {
  // Registres existants
  asset: { key: "/grc/actifs/registry", pageFile: "actifs.html", tab: "registre", label: (e) => e.name, name: _L("Actif", "Asset") },
  risk: { key: "/grc/analyse-risques/registry", pageFile: "analyse-risques.html", tab: "registre", label: (e) => e.name, name: _L("Risque", "Risk") },
  plan: { key: "/grc/traitement-risques/registry", pageFile: "traitement-risques.html", tab: "plans", label: (e) => e.name, name: _L("Plan de traitement", "Treatment plan") },
  control: { key: "/grc/controles/registry", pageFile: "controles.html", tab: "registre", label: (e) => e.name, name: _L("Contrôle", "Control") },
  incident: { key: "/grc/incidents/registry", pageFile: "incidents.html", tab: "suivi", label: (e) => e.title, name: _L("Incident", "Incident") },
  continuity: { key: "/grc/continuity/registry", pageFile: "continuite.html", tab: "registre", label: (e) => e.service, name: _L("Plan de continuité", "Continuity plan") },
  supplier: { key: "/grc/fournisseurs/registry", pageFile: "fournisseurs.html", tab: "registre", label: (e) => e.name, name: _L("Fournisseur", "Supplier") },
  obligation: { key: "/grc/compliance/registry", filter: (e) => e.kind !== "audit", pageFile: "conformite.html", tab: "registre-conformite", label: (e) => (e.ref ? e.ref + " — " : "") + (e.title || ""), name: _L("Obligation", "Obligation") },
  audit: { key: "/grc/compliance/registry", filter: (e) => e.kind === "audit", pageFile: "conformite.html", tab: "registre-conformite", label: (e) => e.title, name: _L("Audit", "Audit") },
  processing: { key: "/grc/privacy/registry", filter: (e) => e.kind !== "dsr" && e.kind !== "breach", pageFile: "vie-privee.html", tab: "registre-vie-privee", label: (e) => e.name, name: _L("Traitement", "Processing") },
  metric: { key: "/grc/metrics/registry", pageFile: "indicateurs.html", tab: "registre", label: (e) => e.name, name: _L("Indicateur", "Indicator") },
  document: { key: "/grc/documents/registry", pageFile: "documentation.html", tab: "registre", label: (e) => e.title, name: _L("Document", "Document") },
  // Constat d'audit (entité virtuelle : audits[].findings[], id "auditId:findingId")
  finding: { virtual: "finding", pageFile: "conformite.html", tab: "ecarts", label: (e) => e.text || e.id, name: _L("Constat d'audit", "Audit finding") },
  // Catalogue Annexe A (statique) et décisions DDA
  annex: { virtual: "annex", pageFile: "controles.html", tab: "soa", label: (e) => (typeof grcAnnexLabel === "function" ? grcAnnexLabel(e.id) : e.id), name: _L("Contrôle Annexe A", "Annex A control") },
  soa: { key: GRC_SOA_KEY, pageFile: "controles.html", tab: "soa", label: (e) => (typeof grcAnnexLabel === "function" ? grcAnnexLabel(e.id) : e.id), name: _L("Décision DDA", "SoA decision") },

  // Entrées de fiches (documentation par élément)
  pp: _ficheType("contexte-organisationnel", "parties-prenantes", "partie", _L("Partie prenante", "Interested party")),
  exigence: _ficheType("contexte-organisationnel", "exigences-pp", "exigence", _L("Exigence", "Requirement")),
  facteurExt: _ficheType("contexte-organisationnel", "contexte-externe", "constat", _L("Facteur externe", "External factor")),
  facteurInt: _ficheType("contexte-organisationnel", "contexte-interne", "constat", _L("Facteur interne", "Internal factor")),
  portee: _ficheType("contexte-organisationnel", "portee-sgsi", "description", _L("Élément de portée", "Scope item")),
  enjeu: _ficheType("contexte-organisationnel", "enjeux-affaires", "enjeu", _L("Enjeu", "Stake")),
  processus: _ficheType("contexte-organisationnel", "cartographie-processus", "nom", _L("Processus", "Process")),
  objectif: _ficheType("gouvernance", "sgsi", "enonce", _L("Objectif / SGSI", "Objective / ISMS")),
  role: _ficheType("gouvernance", "roles", "role", _L("Rôle", "Role")),
  critere: _ficheType("gouvernance", "criteres-acceptation", "critere", _L("Critère d'acceptation", "Acceptance criterion")),
  revue: _ficheType("gouvernance", "revues-direction", "date", _L("Revue de direction", "Management review")),
  modification: _ficheType("gouvernance", "modifications", "modification", _L("Modification du système", "System change")),
  ressource: _ficheType("gouvernance", "ressources-sgsi", "description", _L("Ressource du SGSI", "ISMS resource")),
  amelioration: _ficheType("gouvernance", "amelioration", "description", _L("Action (amélioration / corrective)", "Action (improvement / corrective)")),
  communication: _ficheType("gouvernance", "communication", "sujet", _L("Communication", "Communication")),
  sourceRisque: _ficheType("analyse-risques", "sources-risque", "source", _L("Source de risque", "Risk source")),
  scenario: _ficheType("analyse-risques", "scenarios", "objectif", _L("Scénario de risque", "Risk scenario")),
  opportunite: _ficheType("analyse-risques", "opportunites", "opportunite", _L("Opportunité", "Opportunity")),
  lecon: _ficheType("incidents", "lecons", "lecon", _L("Leçon apprise", "Lesson learned")),
  preuve: _ficheType("documentation", "preuves-audit", "preuve", _L("Preuve d'audit", "Audit evidence")),
  sla: _ficheType("fournisseurs", "sla", "indicateur", _L("SLA", "SLA")),
  exigSecFour: _ficheType("fournisseurs", "exigences-securite", "exigence", _L("Exigence de sécurité fournisseur", "Supplier security requirement")),
  programmeAudit: _ficheType("conformite", "programme-audit", "cycle", _L("Programme d'audit", "Audit programme")),
  arbreAppel: _ficheType("continuite-pgc", "arbre-appel", "titulaire", _L("Arbre d'appel", "Call tree")),
  zone: _ficheType("securite-physique", "zones", "zone", _L("Zone physique", "Physical zone")),
};

/* ---------- ordre de la démarche (UX U3) ------------------------------
   page (data-fiche-page), fichier sous grc/, titre, prérequis amont
   (types d'entités qui doivent exister pour que la page soit proposée). */
const GRC_PAGE_ORDER = [
  { page: "contexte-organisationnel", file: "contexte-organisationnel.html", title: _L("Contexte organisationnel", "Organizational context"), pre: [] },
  { page: "gouvernance", file: "gouvernance.html", title: _L("Gouvernance", "Governance"), pre: ["portee"] },
  { page: "actifs", file: "actifs.html", title: _L("Gestion des actifs", "Asset management"), pre: ["portee"] },
  { page: "analyse-risques", file: "analyse-risques.html", title: _L("Analyse des risques", "Risk assessment"), pre: ["asset"] },
  { page: "traitement-risques", file: "traitement-risques.html", title: _L("Traitement des risques", "Risk treatment"), pre: ["risk"] },
  { page: "controles", file: "controles.html", title: _L("Contrôles de sécurité", "Security controls"), pre: ["risk"] },
  { page: "directives", file: "directives.html", title: _L("Politiques et directives", "Policies and directives"), pre: ["control"] },
  { page: "procedures", file: "procedures.html", title: _L("Procédures opérationnelles", "Operating procedures"), pre: ["control"] },
  { page: "incidents", file: "incidents.html", title: _L("Gestion des incidents", "Incident management"), pre: ["asset"] },
  { page: "continuite", file: "continuite.html", title: _L("Continuité des activités", "Business continuity"), pre: ["processus"] },
  { page: "documentation", file: "documentation.html", title: _L("Gestion documentaire", "Document management"), pre: [] },
  { page: "conformite", file: "conformite.html", title: _L("Gestion de la conformité", "Compliance management"), pre: ["exigence"] },
  { page: "fournisseurs", file: "fournisseurs.html", title: _L("Gestion des fournisseurs", "Supplier management"), pre: ["asset"] },
  { page: "vie-privee", file: "vie-privee.html", title: _L("Protection des renseignements personnels", "Personal information protection"), pre: ["exigence"] },
  { page: "indicateurs", file: "indicateurs.html", title: _L("Performance et indicateurs GRC", "GRC performance and indicators"), pre: ["objectif"] },
];

// Prérequis non remplis d'une page : [nom du type] (vide = page accessible).
function grcPageMissingPre(page, ctx) {
  const o = GRC_PAGE_ORDER.find((x) => x.page === page);
  if (!o) return [];
  ctx = ctx || grcLinksCtx();
  return o.pre.filter((t) => !ctx.list(t).length).map((t) => grcLinksT((_grcLinksResolveType(t) || {}).name) || t);
}

/* ---------- liens ---------------------------------------------------- */

// Types d'entrées de fiche référencés par un lien sans nom dédié
// ("f:<page>/<élément>") -> [page, élément] ; résolus à la demande.
const GRC_LINK_TYPES_PENDING = {};

// { from, path, to, multi, required? } — path : "champ", "a.b",
// "tableau[].champ" ou "tableau[type=x].champ".
const GRC_LINKS = [
  // Registres
  { from: "asset", path: "dependsOn", to: "asset", multi: true },
  { from: "asset", path: "processIds", to: "processus", multi: true },
  { from: "asset", path: "supplierIds", to: "supplier", multi: true },
  { from: "asset", path: "porteeIds", to: "portee", multi: true },
  { from: "risk", path: "assetIds", to: "asset", multi: true, required: true },
  { from: "risk", path: "enjeuIds", to: "enjeu", multi: true },
  { from: "risk", path: "menaceIds", to: "facteurExt", multi: true },
  { from: "risk", path: "sourceIds", to: "sourceRisque", multi: true },
  { from: "risk", path: "scenarioId", to: "scenario" },
  { from: "risk", path: "treatmentPlan.planIds", to: "plan", multi: true },
  { from: "plan", path: "controlIds", to: "control", multi: true },
  { from: "control", path: "riskIds", to: "risk", multi: true },
  { from: "control", path: "obligationIds", to: "obligation", multi: true },
  { from: "control", path: "catalogueIds", to: "annex", multi: true },
  { from: "soa", path: "implementedBy", to: "control", multi: true },
  { from: "soa", path: "obligationIds", to: "obligation", multi: true },
  { from: "soa", path: "riskIds", to: "risk", multi: true },
  { from: "incident", path: "assetIds", to: "asset", multi: true },
  { from: "incident", path: "riskIds", to: "risk", multi: true },
  { from: "incident", path: "controlIds", to: "control", multi: true },
  { from: "continuity", path: "processId", to: "processus", required: true },
  { from: "continuity", path: "dependencies[type=asset].targetId", to: "asset", multi: true },
  { from: "continuity", path: "dependencies[type=supplier].targetId", to: "supplier", multi: true },
  { from: "continuity", path: "bia.resources[].roleId", to: "role", multi: true },
  { from: "continuity", path: "bia.resources[].assetId", to: "asset", multi: true },
  { from: "continuity", path: "bia.resources[].supplierId", to: "supplier", multi: true },
  { from: "obligation", path: "controlIds", to: "control", multi: true },
  { from: "obligation", path: "sourceExigenceId", to: "exigence" },
  { from: "obligation", path: "sourceFacteurId", to: "facteurExt" },
  { from: "audit", path: "findings[].linkedRisk", to: "risk", multi: true },
  { from: "audit", path: "findings[].linkedIncident", to: "incident", multi: true },
  { from: "document", path: "controlIds", to: "control", multi: true },
  { from: "metric", path: "riskId", to: "risk" },
  { from: "metric", path: "objectifId", to: "objectif" },
  { from: "metric", path: "controlId", to: "control" },
  { from: "processing", path: "recipientSupplierIds", to: "supplier", multi: true },

  // Fiches — Contexte
  { from: "exigence", path: "partieId", to: "pp" },
  { from: "enjeu", path: "processus", to: "processus", multi: true },
  { from: "processus", path: "actifs", to: "asset", multi: true },
  { from: "processus", path: "fournisseurs", to: "supplier", multi: true },
  { from: "portee", path: "actifs", to: "asset", multi: true },
  // Gouvernance
  { from: "objectif", path: "enjeux", to: "enjeu", multi: true },
  { from: "objectif", path: "ressources", to: "ressource", multi: true },
  { from: _ficheTypeName("gouvernance", "comite-securite"), path: "roleId", to: "role" },
  { from: _ficheTypeName("gouvernance", "comite-grc"), path: "roleId", to: "role" },
  { from: _ficheTypeName("gouvernance", "comite-crise"), path: "roleId", to: "role" },
  { from: "communication", path: "public", to: "pp", multi: true },
  { from: "modification", path: "risques", to: "risk", multi: true },
  { from: "modification", path: "controles", to: "control", multi: true },
  { from: "modification", path: "processus", to: "processus", multi: true },
  { from: "modification", path: "documents", to: "document", multi: true },
  { from: "ressource", path: "objectifs", to: "objectif", multi: true },
  { from: "amelioration", path: "sourceConstat", to: "finding" },
  { from: "amelioration", path: "sourceIncident", to: "incident" },
  { from: "amelioration", path: "sourceLecon", to: "lecon" },
  { from: "amelioration", path: "sourceRevue", to: "revue" },
  { from: "amelioration", path: "sourceIndicateur", to: "metric" },
  { from: "revue", path: "decisionIds", to: "amelioration", multi: true },
  { from: "revue", path: "modificationIds", to: "modification", multi: true },
  // Analyse des risques
  { from: "scenario", path: "source", to: "sourceRisque" },
  { from: "scenario", path: "actifs", to: "asset", multi: true },
  { from: "opportunite", path: "source", to: "facteurExt" },
  { from: "opportunite", path: "sourceInterne", to: "facteurInt" },
  { from: "opportunite", path: "objectif", to: "objectif" },
  { from: _ficheTypeName("analyse-risques", "concertation"), path: "partie", to: "pp" },
  { from: _ficheTypeName("analyse-risques", "concertation"), path: "risques", to: "risk", multi: true },
  { from: _ficheTypeName("analyse-risques", "veille"), path: "risques", to: "risk", multi: true },
  { from: _ficheTypeName("analyse-risques", "veille"), path: "controles", to: "control", multi: true },
  // Traitement
  { from: _ficheTypeName("traitement-risques", "transfert"), path: "plan", to: "plan" },
  // Directives / Procédures (articles et étapes -> contrôles)
  ...["politique-securite", "acces", "mots-de-passe", "sauvegarde", "classification", "utilisation-acceptable", "teletravail", "transfert-information", "propriete-intellectuelle"]
    .map((el) => ({ from: _ficheTypeName("directives", el), path: "controles", to: "control", multi: true })),
  ...["acces", "changements", "sauvegarde", "restauration", "incidents", "actifs", "escalade", "mco"]
    .map((el) => ({ from: _ficheTypeName("procedures", el), path: "controles", to: "control", multi: true })),
  { from: _ficheTypeName("procedures", "projets"), path: "risques", to: "risk", multi: true },
  // Incidents
  { from: "lecon", path: "incident", to: "incident" },
  { from: "lecon", path: "actionId", to: "amelioration" },
  // Continuité
  { from: _ficheTypeName("continuite", "ressources-critiques"), path: "processus", to: "processus" },
  { from: "arbreAppel", path: "roleId", to: "role" },
  { from: "arbreAppel", path: "plans", to: "continuity", multi: true },
  { from: _ficheTypeName("continuite-pcm", "journal"), path: "destinataire", to: "pp" },
  { from: _ficheTypeName("continuite-pcm", "porte-parole"), path: "roleId", to: "role" },
  { from: _ficheTypeName("continuite-pca", "objectifs"), path: "objectifs", to: "objectif", multi: true },
  { from: _ficheTypeName("continuite-psi", "moyens"), path: "actifs", to: "asset", multi: true },
  { from: _ficheTypeName("continuite-psi", "moyens"), path: "fournisseurs", to: "supplier", multi: true },
  { from: _ficheTypeName("continuite-pri", "ordre"), path: "actifs", to: "asset", multi: true },
  { from: _ficheTypeName("continuite-tests-exercices", "rapports"), path: "plan", to: "continuity" },
  { from: _ficheTypeName("continuite-tests-exercices", "rapports"), path: "actions", to: "amelioration", multi: true },
  { from: _ficheTypeName("continuite-tests-exercices", "programme"), path: "plan", to: "continuity" },
  // Documentation
  { from: "preuve", path: "controle", to: "control" },
  // Conformité
  { from: "programmeAudit", path: "processus", to: "processus", multi: true },
  { from: "programmeAudit", path: "catalogue", to: "annex", multi: true },
  { from: "programmeAudit", path: "audit", to: "audit" },
  // Fournisseurs
  ...["due-diligence", "sla", "exigences-continuite", "exigences-securite", "capacites-continuite"]
    .map((el) => ({ from: el === "sla" ? "sla" : (el === "exigences-securite" ? "exigSecFour" : _ficheTypeName("fournisseurs", el)), path: "fournisseur", to: "supplier" })),
  { from: _ficheTypeName("fournisseurs", "capacites-continuite"), path: "actions", to: "amelioration", multi: true },
  // Indicateurs
  { from: _ficheTypeName("indicateurs", "objectifs"), path: "objectif", to: "objectif" },
  // Ressources humaines / Sécurité physique
  { from: _ficheTypeName("ressources-humaines", "selection"), path: "roleId", to: "role" },
  { from: _ficheTypeName("ressources-humaines", "competences"), path: "roleId", to: "role", required: true },
  { from: _ficheTypeName("ressources-humaines", "sensibilisation"), path: "risques", to: "risk", multi: true },
  { from: _ficheTypeName("ressources-humaines", "sensibilisation"), path: "lecons", to: "lecon", multi: true },
  { from: _ficheTypeName("ressources-humaines", "depart"), path: "controles", to: "control", multi: true },
  { from: "zone", path: "site", to: "portee" },
  { from: "zone", path: "actifs", to: "asset", multi: true },
  { from: _ficheTypeName("securite-physique", "environnement"), path: "zone", to: "zone" },
  { from: _ficheTypeName("securite-physique", "environnement"), path: "controle", to: "control" },
  { from: _ficheTypeName("securite-physique", "rebut"), path: "fournisseur", to: "supplier" },
];

// Hubs techniques (grc-normes N11) : même documentation légère sur chaque
// page (grc-fiches-technique.js) ; liens vers contrôles, actifs, risques.
const GRC_TECH_PAGES = [
  "api/architecture-api",
  "api/authentification-autorisation",
  "api/controles-api",
  "api/gestion-cycle-vie",
  "api/journalisation-monitoring",
  "api/protection-attaques-api",
  "api/tests-audits-api",
  "database/architecture-bd",
  "database/chiffrement-bd",
  "database/controles-acces-bd",
  "database/hardening-bd",
  "database/journalisation-monitoring-bd",
  "database/protection-attaques-bd",
  "database/sauvegarde-restauration",
  "database/securite-requetes",
  "operationnelle/architecture",
  "operationnelle/cloud",
  "operationnelle/devsecops",
  "operationnelle/iam",
  "operationnelle/vulnerabilites",
  "reseau/architecture-reseau",
  "reseau/controles-reseau",
  "reseau/gestion-acces",
  "reseau/gestion-equipements",
  "reseau/monitoring",
  "reseau/protection-attaques",
  "reseau/securite-communications",
  "reseau/securite-wifi",
  "reseau/segmentation",
  "reseau/tests-audits",
  "webapp/architecture-applicative",
  "webapp/controles-webapp",
  "webapp/gestion-sessions",
  "webapp/journalisation-monitoring",
  "webapp/protection-attaques-webapp",
  "webapp/securite-fichiers",
  "webapp/tests-audits-webapp",
  "webapp/validation-entrees",
];
GRC_TECH_PAGES.forEach((p) => {
  const page = "tech-" + p.replace("/", "--");
  GRC_LINKS.push({ from: _ficheTypeName(page, "mesures"), path: "controles", to: "control", multi: true });
  GRC_LINKS.push({ from: _ficheTypeName(page, "mesures"), path: "actifs", to: "asset", multi: true });
  GRC_LINKS.push({ from: _ficheTypeName(page, "risques"), path: "risques", to: "risk", multi: true });
  GRC_LINKS.push({ from: _ficheTypeName(page, "ecarts"), path: "actionId", to: "amelioration" });
});

// Type implicite pour une entrée de fiche sans nom dédié : "f:<page>/<el>".
function _ficheTypeName(page, el) {
  const t = "f:" + page + "/" + el;
  if (!GRC_LINK_TYPES_PENDING[t]) GRC_LINK_TYPES_PENDING[t] = [page, el];
  return t;
}

function _grcLinksResolveType(t) {
  if (GRC_LINK_TYPES[t]) return GRC_LINK_TYPES[t];
  const p = GRC_LINK_TYPES_PENDING[t];
  if (!p) return null;
  // Page non chargée : nom = « page › élément », libellé = premier champ
  // texte significatif de l'entrée.
  const TECH_EL = { exigences: _L("Exigence", "Requirement"), mesures: _L("Mesure", "Measure"), risques: _L("Risques liés", "Related risks"), ecarts: _L("Écart", "Gap") };
  const name = p[0].indexOf("tech-") === 0
    ? _L(p[0].slice(5).replace("--", " › ") + " › " + (TECH_EL[p[1]] || _L(p[1], p[1])).fr, p[0].slice(5).replace("--", " › ") + " › " + (TECH_EL[p[1]] || _L(p[1], p[1])).en)
    : _L(p[0] + " › " + p[1], p[0] + " › " + p[1]);
  GRC_LINK_TYPES[t] = _ficheType(p[0], p[1], "__first", name, { label: _grcLinksFirstText });
  return GRC_LINK_TYPES[t];
}

function _grcLinksFirstText(e) {
  const skip = { id: 1, updatedAt: 1, updatedBy: 1, demo: 1, diag: 1, tpl: 1, tplAt: 1 };
  const k = Object.keys(e || {}).find((x) => !skip[x] && typeof e[x] === "string" && e[x].trim().length > 2 && !/^\d{4}-\d{2}-\d{2}/.test(e[x]) && !/^(fiche|demo|risk|asset|control)-/.test(e[x]));
  return k ? e[k].trim().slice(0, 90) : (e && e.id) || "";
}

/* ---------- lecture ------------------------------------------------- */

function _grcLinksReadKey(key) {
  try {
    const raw = typeof vaultGetItem === "function" ? vaultGetItem(key) : localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : [];
  } catch (e) {
    return [];
  }
}

// Contexte de lecture : chaque stockage lu une fois par calcul (I3).
function grcLinksCtx() {
  const byKey = {};
  const byType = {};
  const ctx = {
    list(type) {
      if (byType[type]) return byType[type];
      const def = _grcLinksResolveType(type);
      if (!def) return (byType[type] = []);
      let list;
      if (def.virtual === "annex") list = typeof GRC_ANNEX_A !== "undefined" ? GRC_ANNEX_A : [];
      else if (def.virtual === "finding") {
        list = [];
        ctx.list("audit").forEach((a) => (a.findings || []).forEach((f) => {
          if (f && f.id) list.push(Object.assign({}, f, { id: a.id + ":" + f.id, auditId: a.id }));
        }));
      } else {
        if (!byKey[def.key]) byKey[def.key] = _grcLinksReadKey(def.key);
        list = def.filter ? byKey[def.key].filter(def.filter) : byKey[def.key];
      }
      return (byType[type] = list);
    },
    get(type, id) {
      return ctx.list(type).find((e) => e.id === id) || null;
    },
  };
  return ctx;
}

function grcLinksLabel(type, id, ctx) {
  const def = _grcLinksResolveType(type);
  const e = (ctx || grcLinksCtx()).get(type, id);
  if (!e) return grcLinksT(_L("(élément supprimé)", "(deleted item)"));
  return String((def && def.label(e)) || id);
}

// Valeurs d'un chemin -> liste d'identifiants (chaînes non vides).
function grcLinksValues(entity, path) {
  let cur = [entity];
  path.split(".").forEach((seg) => {
    const m = seg.match(/^(\w+)\[(?:(\w+)=(\w+))?\]$/);
    const next = [];
    cur.forEach((obj) => {
      if (!obj || typeof obj !== "object") return;
      if (m) {
        const arr = Array.isArray(obj[m[1]]) ? obj[m[1]] : [];
        arr.forEach((x) => { if (x && (!m[2] || x[m[2]] === m[3])) next.push(x); });
      } else {
        const v = obj[seg];
        if (Array.isArray(v)) v.forEach((x) => next.push(x));
        else if (v != null) next.push(v);
      }
    });
    cur = next;
  });
  return cur.filter((v) => typeof v === "string" && v).filter((v, i, a) => a.indexOf(v) === i);
}

/* ---------- options pour les formulaires ---------------------------- */

// [{ v, label }] — champs `ref` / `refs` des fiches.
function grcLinksOptions(type) {
  const ctx = grcLinksCtx();
  const def = _grcLinksResolveType(type);
  return ctx.list(type).filter((e) => e.id).map((e) => ({ v: e.id, label: String((def && def.label(e)) || e.id) }));
}

// [{ value, label }] — champs `multi` / `select` du kit (registres).
function grcLinksKitOptions(type, withBlank) {
  const out = grcLinksOptions(type).map((o) => ({ value: o.v, label: o.label }));
  return withBlank ? [{ value: "", label: "—" }].concat(out) : out;
}

/* ---------- CH2 : champs de lien des registres du kit ----------------
   Ajoutés au formulaire de chaque registre existant (sélecteurs au lieu
   du texte libre). Seuls les chemins simples ("champ") sont éditables ici ;
   les chemins imbriqués restent gérés par leur registre. */
const GRC_LINK_FIELD_LABELS = {
  "asset.processIds": _L("Processus soutenus", "Supported processes"),
  "asset.supplierIds": _L("Fournisseurs", "Suppliers"),
  "asset.porteeIds": _L("Éléments de portée", "Scope items"),
  "risk.assetIds": _L("Actifs concernés", "Affected assets"),
  "risk.enjeuIds": _L("Enjeux d'affaires", "Business stakes"),
  "risk.menaceIds": _L("Menaces (contexte externe)", "Threats (external context)"),
  "risk.sourceIds": _L("Sources de risque", "Risk sources"),
  "risk.scenarioId": _L("Scénario", "Scenario"),
  "plan.controlIds": _L("Contrôles mis en œuvre", "Implemented controls"),
  "control.riskIds": _L("Risques traités", "Treated risks"),
  "control.obligationIds": _L("Obligations couvertes", "Covered obligations"),
  "control.catalogueIds": _L("Contrôles Annexe A", "Annex A controls"),
  "incident.assetIds": _L("Actifs touchés", "Affected assets"),
  "incident.riskIds": _L("Risques concrétisés", "Materialized risks"),
  "incident.controlIds": _L("Contrôles en défaut", "Failed controls"),
  "obligation.controlIds": _L("Contrôles qui la couvrent", "Covering controls"),
  "obligation.sourceExigenceId": _L("Exigence de partie prenante (source)", "Interested-party requirement (source)"),
  "obligation.sourceFacteurId": _L("Facteur externe (source)", "External factor (source)"),
  "document.controlIds": _L("Contrôles documentés", "Documented controls"),
  "metric.riskId": _L("Risque suivi", "Monitored risk"),
  "metric.objectifId": _L("Objectif mesuré", "Measured objective"),
  "metric.controlId": _L("Contrôle mesuré", "Measured control"),
  "processing.recipientSupplierIds": _L("Fournisseurs destinataires", "Recipient suppliers"),
  "continuity.processId": _L("Processus couvert (cartographie)", "Covered process (process map)"),
};

if (typeof I18N_DICT !== "undefined") {
  Object.keys(GRC_LINK_FIELD_LABELS).forEach((k) => { I18N_DICT["grc.links.f." + k] = GRC_LINK_FIELD_LABELS[k]; });
  I18N_DICT["grc.links.f.plan.riskIds"] = _L("Risques traités", "Treated risks");
  // Actions croisées des registres (UX U5).
  I18N_DICT["grc.links.act.createPlan"] = _L("Créer le plan de traitement", "Create the treatment plan");
  I18N_DICT["grc.links.act.addEvidence"] = _L("Ajouter la preuve", "Add evidence");
  I18N_DICT["grc.links.act.lesson"] = _L("Tirer une leçon", "Draw a lesson");
  I18N_DICT["grc.links.act.createControl"] = _L("Créer un contrôle lié", "Create a linked control");
  I18N_DICT["grc.links.act.createAction"] = _L("Créer une action d’amélioration", "Create an improvement action");
}

function _grcLinksSimple(from) {
  return GRC_LINKS.filter((l) => l.from === from && /^\w+$/.test(l.path) && GRC_LINK_FIELD_LABELS[from + "." + l.path]);
}

// Champs `multi` / `select` pour cfg.form d'un grkRegistry.
function grcLinksFormFields(from, skip) {
  return _grcLinksSimple(from).filter((l) => !skip || skip.indexOf(l.path) === -1).map((l) => {
    const key = "grc.links.f." + from + "." + l.path;
    if (typeof I18N_DICT !== "undefined") I18N_DICT[key] = GRC_LINK_FIELD_LABELS[from + "." + l.path];
    return { id: l.path, label: key, type: l.multi ? "multi" : "select", options: () => grcLinksKitOptions(l.to, !l.multi) };
  });
}

// Valeurs courantes pour readForm.
function grcLinksFormRead(from, ent) {
  const out = {};
  _grcLinksSimple(from).forEach((l) => {
    const v = ent ? ent[l.path] : null;
    out[l.path] = l.multi ? (Array.isArray(v) ? v.slice() : []) : (typeof v === "string" ? v : "");
  });
  return out;
}

// Valeurs soumises, nettoyées (identifiants uniques, chaînes non vides).
function grcLinksFormPick(from, v) {
  const out = {};
  _grcLinksSimple(from).forEach((l) => {
    if (!(l.path in (v || {}))) return;
    const raw = v[l.path];
    if (l.multi) out[l.path] = (Array.isArray(raw) ? raw : (raw ? [raw] : [])).filter((x) => typeof x === "string" && x).filter((x, i, a) => a.indexOf(x) === i);
    else out[l.path] = typeof raw === "string" ? raw : "";
  });
  return out;
}

// Descripteurs grkEnsure des champs de lien (schémas qui filtrent).
function grcLinksSchema(from) {
  const out = {};
  _grcLinksSimple(from).forEach((l) => { out[l.path] = l.multi ? { type: "array" } : { type: "string" }; });
  return out;
}

/* ---------- liens sortants / entrants ------------------------------- */

function grcLinksTypeOfKey(storeKey, entity) {
  return Object.keys(GRC_LINK_TYPES).concat(Object.keys(GRC_LINK_TYPES_PENDING)).find((t) => {
    const def = _grcLinksResolveType(t);
    return def && def.key === storeKey && (!def.filter || !entity || def.filter(entity));
  }) || null;
}

function grcLinksOutgoing(type, entity) {
  return GRC_LINKS.filter((l) => l.from === type).map((l) => ({ link: l, ids: grcLinksValues(entity, l.path) }))
    .filter((x) => x.ids.length);
}

// Index des liens entrants : "type:id" -> [{ fromType, entity, link }].
function grcLinksIncomingIndex(ctx) {
  const idx = {};
  GRC_LINKS.forEach((l) => {
    ctx.list(l.from).forEach((e) => {
      grcLinksValues(e, l.path).forEach((id) => {
        const k = l.to + ":" + id;
        (idx[k] = idx[k] || []).push({ fromType: l.from, entity: e, link: l });
      });
    });
  });
  return idx;
}

/* ---------- navigation ----------------------------------------------- */

// Préfixe relatif vers le dossier grc/ depuis la page courante.
function grcLinksBase() {
  const p = (typeof location !== "undefined" ? location.pathname : "") || "";
  const i = p.lastIndexOf("/grc/");
  if (i === -1) return p.indexOf("/project/") !== -1 ? "../grc/" : "grc/";
  const rest = p.slice(i + 5);
  return "../".repeat(rest.split("/").length - 1);
}

function grcLinksHref(type, id) {
  const def = _grcLinksResolveType(type);
  if (!def) return "#";
  const base = grcLinksBase() + def.pageFile;
  if (def.fiche || def.virtual) return base + "#fiche-" + def.tab;
  if (type === "soa") return base + "#fiche-soa";
  return base + "#" + encodeURIComponent(id);
}

/* ---------- M2 : bloc « Dépend de / Utilisé par » ------------------- */

function _grcLinksList(title, rows) {
  const box = document.createElement("div");
  box.className = "grc-links-list";
  const h = document.createElement("h5");
  h.textContent = title;
  box.appendChild(h);
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "grk-hint";
    p.textContent = "—";
    box.appendChild(p);
    return box;
  }
  const ul = document.createElement("ul");
  rows.forEach((r) => {
    const li = document.createElement("li");
    const tag = document.createElement("span");
    tag.className = "grc-links-type";
    tag.textContent = r.typeName;
    const a = document.createElement("a");
    a.href = r.href;
    a.textContent = r.label;
    if (r.missing) a.className = "grc-links-missing";
    li.appendChild(tag);
    li.appendChild(document.createTextNode(" "));
    li.appendChild(a);
    ul.appendChild(li);
  });
  box.appendChild(ul);
  return box;
}

function grcLinksDepsBlock(storeKey, entity, typeHint) {
  const type = typeHint || grcLinksTypeOfKey(storeKey, entity);
  if (!type || !entity || !entity.id) return null;
  const ctx = grcLinksCtx();
  const out = [];
  grcLinksOutgoing(type, entity).forEach((x) => x.ids.forEach((id) => {
    const ok = !!ctx.get(x.link.to, id);
    out.push({
      typeName: grcLinksT((_grcLinksResolveType(x.link.to) || {}).name) || x.link.to,
      label: ok ? grcLinksLabel(x.link.to, id, ctx) : grcLinksT(_L("à relier (élément supprimé)", "to relink (deleted item)")),
      href: grcLinksHref(x.link.to, id), missing: !ok,
    });
  }));
  const idx = grcLinksIncomingIndex(ctx);
  const inc = (idx[type + ":" + entity.id] || []).map((r) => ({
    typeName: grcLinksT((_grcLinksResolveType(r.fromType) || {}).name) || r.fromType,
    label: String((_grcLinksResolveType(r.fromType) || { label: () => r.entity.id }).label(r.entity) || r.entity.id),
    href: grcLinksHref(r.fromType, r.entity.id),
  }));
  const wrap = document.createElement("div");
  wrap.className = "grc-links-deps";
  const flag = grcChainReviewMap()[type + ":" + entity.id];
  if (flag) {
    const p = document.createElement("p");
    p.className = "grc-chain-review-banner";
    p.textContent = grcLinksT(_L("À revoir : ", "To review: ")) + flag.cause;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-registry-io-btn grc-chain-reviewed";
    b.textContent = grcLinksT(_L("Marquer comme revu", "Mark as reviewed"));
    b.addEventListener("click", () => { grcChainClear(type, entity.id); p.remove(); });
    p.appendChild(b);
    wrap.appendChild(p);
  }
  wrap.appendChild(_grcLinksList(grcLinksT(_L("Dépend de", "Depends on")), out));
  wrap.appendChild(_grcLinksList(grcLinksT(_L("Utilisé par", "Used by")) + " (" + inc.length + ")", inc));
  return wrap;
}

/* ---------- CH6 : propagation « à revoir » ---------------------------
   Une entrée modifiée rend « à revoir » tout ce qui en dépend (liens
   entrants). État : { "type:id": { since, cause, from } } sous
   /grc/chain/review (protégé par le coffre, inclus dans la sauvegarde).
   Un document de fiche approuvé qui contient une entrée « à revoir »
   repasse « en révision » (UX U7). */
const GRC_CHAIN_REVIEW_KEY = "/grc/chain/review";

function grcChainReviewMap() {
  try {
    const raw = typeof vaultGetItem === "function" ? vaultGetItem(GRC_CHAIN_REVIEW_KEY) : null;
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch (e) {
    return {};
  }
}

function _grcChainSave(map) {
  if (typeof vaultSetItem === "function") vaultSetItem(GRC_CHAIN_REVIEW_KEY, JSON.stringify(map));
}

function grcChainChanged(storeKey, entity) {
  const type = grcLinksTypeOfKey(storeKey, entity);
  if (!type || !entity || !entity.id) return 0;
  const ctx = grcLinksCtx();
  const map = grcChainReviewMap();
  delete map[type + ":" + entity.id];
  const def = _grcLinksResolveType(type) || {};
  const cause = grcLinksT(def.name) + " « " + String((def.label && def.label(entity)) || entity.id) + " » " +
    grcLinksT(_L("modifié le ", "changed on ")) + new Date().toISOString().slice(0, 10);
  const deps = grcLinksIncomingIndex(ctx)[type + ":" + entity.id] || [];
  const pages = {};
  deps.forEach((r) => {
    map[r.fromType + ":" + r.entity.id] = { since: new Date().toISOString(), cause: cause, from: type + ":" + entity.id };
    const d = _grcLinksResolveType(r.fromType);
    if (d && d.fiche) pages[d.page] = true;
  });
  _grcChainSave(map);
  Object.keys(pages).forEach((pg) => {
    try {
      const k = "/grc/fiches/" + pg + "/_meta";
      const m = JSON.parse(vaultGetItem(k) || "null");
      if (m && m.status === "approuve") { m.status = "revision"; vaultSetItem(k, JSON.stringify(m)); }
    } catch (e) { /* statut illisible : ignoré */ }
  });
  return deps.length;
}

function grcChainFlag(storeKey, entity) {
  if (!entity || !entity.id) return null;
  const type = grcLinksTypeOfKey(storeKey, entity);
  return type ? grcChainReviewMap()[type + ":" + entity.id] || null : null;
}

function grcChainClear(type, id) {
  const map = grcChainReviewMap();
  if (!map[type + ":" + id]) return;
  delete map[type + ":" + id];
  _grcChainSave(map);
}

// [{ type, id, label, cause, href }] — entrées « à revoir » encore présentes.
function grcChainReviewList(ctx) {
  ctx = ctx || grcLinksCtx();
  const map = grcChainReviewMap();
  return Object.keys(map).map((k) => {
    const i = k.indexOf(":");
    const type = k.slice(0, i);
    const id = k.slice(i + 1);
    const e = ctx.get(type, id);
    if (!e) return null;
    return { type: type, id: id, label: grcLinksLabel(type, id, ctx), cause: map[k].cause, since: map[k].since, href: grcLinksHref(type, id) };
  }).filter(Boolean);
}

/* ---------- I1 : suppression protégée -------------------------------- */

function grcLinksUsedBy(type, id) {
  const ctx = grcLinksCtx();
  return (grcLinksIncomingIndex(ctx)[type + ":" + id] || []).map((r) =>
    grcLinksT((_grcLinksResolveType(r.fromType) || {}).name) + " : " + ((_grcLinksResolveType(r.fromType) || { label: () => "" }).label(r.entity) || r.entity.id));
}

// Texte ajouté au confirm() de suppression (vide si rien n'en dépend).
function grcLinksDeleteWarning(storeKey, entity, typeHint) {
  const type = typeHint || grcLinksTypeOfKey(storeKey, entity);
  if (!type || !entity) return "";
  const used = grcLinksUsedBy(type, entity.id);
  if (!used.length) return "";
  const shown = used.slice(0, 8).map((u) => "• " + u).join("\n") + (used.length > 8 ? "\n…" : "");
  return "\n\n" + grcLinksT(_L("⚠ Utilisé par :", "⚠ Used by:")) + "\n" + shown + "\n\n" +
    grcLinksT(_L("Ces liens deviendront « à relier » (rien d'autre n'est supprimé).", "These links will become \"to relink\" (nothing else is deleted)."));
}

/* ---------- I2 : liens vérifiés à l'import --------------------------- */

function grcLinksOrphans(types) {
  const ctx = grcLinksCtx();
  const out = [];
  GRC_LINKS.filter((l) => !types || types.indexOf(l.from) !== -1).forEach((l) => {
    ctx.list(l.from).forEach((e) => grcLinksValues(e, l.path).forEach((id) => {
      if (!ctx.get(l.to, id)) out.push({ from: l.from, entity: e, link: l, id: id });
    }));
  });
  return out;
}

function grcLinksImportReport(storeKey) {
  const types = Object.keys(GRC_LINK_TYPES).filter((t) => GRC_LINK_TYPES[t].key === storeKey);
  const orphans = grcLinksOrphans(types);
  if (!orphans.length) return 0;
  alert(grcLinksT(_L("Import terminé. ", "Import done. ")) + orphans.length + " " +
    grcLinksT(_L("lien(s) pointent vers des éléments absents : ils sont conservés et marqués « à relier ».",
      "link(s) point to missing items: they are kept and marked \"to relink\".")));
  return orphans.length;
}

/* ---------- Règles de la chaîne (P6) --------------------------------- */

// Seuil P × I au-delà duquel un risque est « à traiter » : le plus bas des
// critères chiffrés de Gouvernance ; à défaut 8 (score ≥ 9 = modéré+).
function grcLinksRiskThreshold(ctx) {
  const vals = ctx.list("critere").map((c) => Number(c.seuilPxI)).filter((n) => Number.isFinite(n) && n > 0);
  return vals.length ? Math.min.apply(null, vals) : 8;
}

function grcLinksAleThreshold(ctx) {
  const vals = ctx.list("critere").map((c) => Number(String(c.seuilAle || "").replace(/[\s ]/g, "").replace(",", "."))).filter((n) => Number.isFinite(n) && n > 0);
  return vals.length ? Math.min.apply(null, vals) : null;
}

function grcLinksRiskToTreat(risk, ctx) {
  if (!risk || risk.status === "accepte") return false;
  const score = (Number(risk.probability) || 1) * (Number(risk.impact) || 1);
  if (score > grcLinksRiskThreshold(ctx)) return true;
  const aleMax = grcLinksAleThreshold(ctx);
  if (aleMax != null && typeof grcRiskQuant === "function") {
    const q = grcRiskQuant(risk);
    if (q.ale != null && q.ale > aleMax) return true;
  }
  return false;
}

/* ---------- M4 : ruptures T1–T21 ------------------------------------- */

const GRC_RUPTURES = [
  { code: "T1", sev: "high", label: _L("Enjeu de priorité haute sans risque", "High-priority stake without risk"), type: "enjeu",
    test: (ctx, idx) => ctx.list("enjeu").filter((e) => e.priorite === "haute" && !(idx["enjeu:" + e.id] || []).some((r) => r.fromType === "risk")) },
  { code: "T2", sev: "high", label: _L("Actif critique sans risque", "Critical asset without risk"), type: "asset",
    test: (ctx, idx) => ctx.list("asset").filter((a) => Math.max(a.c || 1, a.i || 1, a.a || 1) >= 3 && !(idx["asset:" + a.id] || []).some((r) => r.fromType === "risk")) },
  { code: "T3", sev: "high", label: _L("Risque « à traiter » sans plan de traitement", "Risk \"to treat\" without treatment plan"), type: "risk",
    test: (ctx) => ctx.list("risk").filter((r) => grcLinksRiskToTreat(r, ctx) && !grcLinksValues(r, "treatmentPlan.planIds").length) },
  { code: "T4", sev: "medium", label: _L("Plan de réduction sans contrôle", "Mitigation plan without control"), type: "plan",
    test: (ctx) => ctx.list("plan").filter((p) => (p.strategy || "mitigate") === "mitigate" && !grcLinksValues(p, "controlIds").length) },
  { code: "T5", sev: "medium", label: _L("Contrôle applicable sans preuve", "Applicable control without evidence"), type: "control",
    test: (ctx, idx) => ctx.list("control").filter((c) => c.status !== "non-applicable" && !(c.evidence || "").trim() && !(idx["control:" + c.id] || []).some((r) => r.fromType === "preuve")) },
  { code: "T6", sev: "low", label: _L("Contrôle applicable repris dans aucune directive ni procédure", "Applicable control not referenced by any directive or procedure"), type: "control",
    test: (ctx, idx) => ctx.list("control").filter((c) => c.status !== "non-applicable" && !(idx["control:" + c.id] || []).some((r) => /^f:(directives|procedures)\//.test(r.fromType))) },
  { code: "T7", sev: "medium", label: _L("Exigence de partie prenante sans obligation", "Interested-party requirement without obligation"), type: "exigence",
    test: (ctx, idx) => ctx.list("exigence").filter((x) => x.traitee !== "non" && !(idx["exigence:" + x.id] || []).some((r) => r.fromType === "obligation")) },
  { code: "T8", sev: "high", label: _L("Obligation applicable sans contrôle", "Applicable obligation without control"), type: "obligation",
    test: (ctx, idx) => ctx.list("obligation").filter((o) => o.applicability !== "not-applicable" && !grcLinksValues(o, "controlIds").length && !(idx["obligation:" + o.id] || []).some((r) => r.fromType === "control")) },
  { code: "T9", sev: "high", label: _L("Processus vital ou critique sans plan de continuité", "Vital or critical process without continuity plan"), type: "processus",
    test: (ctx, idx) => ctx.list("processus").filter((p) => (p.criticite === "vital" || p.criticite === "critique") && !(idx["processus:" + p.id] || []).some((r) => r.fromType === "continuity")) },
  { code: "T10", sev: "low", label: _L("Objectif de sécurité sans indicateur", "Security objective without indicator"), type: "objectif",
    test: (ctx, idx) => ctx.list("objectif").filter((o) => o.aspect === "objectif" && !(idx["objectif:" + o.id] || []).some((r) => r.fromType === "metric")) },
  { code: "T11", sev: "low", label: _L("Actif hors portée utilisé par un risque", "Out-of-scope asset used by a risk"), type: "asset",
    test: (ctx, idx) => {
      if (!ctx.list("portee").some((p) => p.element === "site" || p.element === "systeme" || p.element === "unite")) return [];
      return ctx.list("asset").filter((a) => !grcLinksValues(a, "porteeIds").length && !(idx["asset:" + a.id] || []).some((r) => r.fromType === "portee")
        && (idx["asset:" + a.id] || []).some((r) => r.fromType === "risk"));
    } },
  { code: "T12", sev: "medium", label: _L("Fournisseur critique sans exigence de sécurité ni SLA", "Critical supplier without security requirement or SLA"), type: "supplier",
    test: (ctx, idx) => ctx.list("supplier").filter((s) => (s.criticality === "vital" || s.criticality === "critique")
      && !(idx["supplier:" + s.id] || []).some((r) => r.fromType === "sla" || r.fromType === "exigSecFour")) },
  { code: "T13", sev: "high", label: _L("Contrôle de l'Annexe A sans décision d'applicabilité", "Annex A control without applicability decision"), type: "annex",
    // Signalé dès que l'analyse des risques a commencé (la DDA la suit).
    test: (ctx) => { if (!ctx.list("risk").length && !ctx.list("soa").length) return []; const done = {}; ctx.list("soa").forEach((d) => { if (d.applicable === "oui" || d.applicable === "non") done[d.id] = 1; });
      return ctx.list("annex").filter((c) => !done[c.id]); } },
  { code: "T14", sev: "high", label: _L("Contrôle de l'Annexe A applicable sans mise en œuvre", "Applicable Annex A control without implementation"), type: "annex",
    test: (ctx, idx) => ctx.list("soa").filter((d) => d.applicable === "oui" && !grcLinksValues(d, "implementedBy").length
      && !(idx["annex:" + d.id] || []).some((r) => r.fromType === "control")).map((d) => ctx.get("annex", d.id) || d) },
  { code: "T15", sev: "medium", label: _L("Modification réalisée dont les éléments touchés ne sont pas revus", "Completed change whose affected items are not reviewed"), type: "modification",
    test: (ctx) => ctx.list("modification").filter((m) => m.statut === "realisee" && m.revus !== "oui") },
  { code: "T16", sev: "medium", label: _L("Non-conformité sans analyse des causes ou sans vérification d'efficacité", "Nonconformity without root-cause analysis or effectiveness check"), type: "amelioration",
    test: (ctx) => ctx.list("amelioration").filter((a) => a.nature === "nc" && (!(a.causes || "").trim() || (a.statut === "close" && !(a.verification || "").trim()))) },
  { code: "T17", sev: "medium", label: _L("Clauses 4 à 10 non toutes couvertes par le programme d'audit", "Clauses 4 to 10 not all covered by the audit programme"), type: "programmeAudit",
    test: (ctx) => {
      const prog = ctx.list("programmeAudit");
      if (!prog.length) return [];
      const covered = {};
      prog.forEach((p) => String(p.clauses || "").split(/[^0-9]+/).forEach((n) => { if (n) covered[n] = 1; }));
      const missing = ["4", "5", "6", "7", "8", "9", "10"].filter((c) => !covered[c]);
      return missing.length ? [{ id: prog[0].id, cycle: grcLinksT(_L("Clauses manquantes : ", "Missing clauses: ")) + missing.join(", ") }] : [];
    } },
  { code: "T18", sev: "high", label: _L("Processus vital ou critique sans impacts dans le temps au BIA", "Vital or critical process without time-based impacts in the BIA"), type: "continuity",
    test: (ctx) => ctx.list("continuity").filter((p) => (p.criticality === "vital" || p.criticality === "critique")
      && !((p.bia && Array.isArray(p.bia.timeline)) ? p.bia.timeline : []).some((x) => x && x.level)) },
  { code: "T19", sev: "high", label: _L("Plan de continuité sans arbre d'appel", "Continuity plan without call tree"), type: "continuity",
    test: (ctx, idx) => ctx.list("continuity").filter((p) => !(idx["continuity:" + p.id] || []).some((r) => r.fromType === "arbreAppel")) },
  { code: "T20", sev: "low", label: _L("Source de risque retenue sans scénario", "Retained risk source without scenario"), type: "sourceRisque",
    test: (ctx, idx) => ctx.list("sourceRisque").filter((s) => s.retenue === "oui" && !(idx["sourceRisque:" + s.id] || []).some((r) => r.fromType === "scenario")) },
  { code: "T21", sev: "medium", label: _L("Revue de direction sans toutes les entrées obligatoires", "Management review missing mandatory inputs"), type: "revue",
    test: (ctx) => ctx.list("revue").filter((r) => GRC_REVIEW_INPUTS.some((k) => !(r[k] || "").trim())) },
];

// Entrées obligatoires d'une revue de direction (27001 9.3.2 / 22301 9.3.2).
const GRC_REVIEW_INPUTS = ["inActions", "inChangements", "inRetours", "inNc", "inSurveillance", "inAudits", "inObjectifs", "inRisques", "inAmelioration"];

// Réparation en un clic (CH5 / UX U5) : formulaire cible pré-rempli avec
// le lien vers l'élément en rupture. { label, page, tab, list, file?, values(e) }.
const GRC_RUPTURE_FIX = {
  T1: { label: _L("Créer un risque", "Create a risk"), page: "analyse-risques", tab: "registre", list: "renderGrcRiskRegistry", values: (e) => ({ name: e.enjeu || "", enjeuIds: [e.id] }) },
  T2: { label: _L("Créer un risque", "Create a risk"), page: "analyse-risques", tab: "registre", list: "renderGrcRiskRegistry", values: (e) => ({ name: e.name || "", assetIds: [e.id] }) },
  T3: { label: _L("Créer le plan de traitement", "Create the treatment plan"), page: "traitement-risques", tab: "plans", list: "renderGrcTreatmentPlansList", values: (e) => ({ name: e.name || "", riskIds: [e.id] }) },
  T4: { label: _L("Créer un contrôle", "Create a control"), page: "controles", tab: "registre", list: "renderGrcControlList", values: (e) => ({ name: e.name || "" }) },
  T5: { label: _L("Ajouter la preuve", "Add evidence"), page: "documentation", tab: "preuves-audit", list: "renderGrcFiche_documentation_preuves_audit", values: (e) => ({ controle: e.id }) },
  T7: { label: _L("Suivre en conformité", "Track in compliance"), page: "conformite", tab: "registre-conformite", list: "renderGrcObligationsList", values: (e) => ({ title: e.exigence || "", sourceExigenceId: e.id }) },
  T8: { label: _L("Créer un contrôle", "Create a control"), page: "controles", tab: "registre", list: "renderGrcControlList", values: (e) => ({ name: e.title || "", obligationIds: [e.id] }) },
  T9: { label: _L("Créer le plan de continuité", "Create the continuity plan"), page: "continuite", tab: "registre", list: "grcContinuityOpenWith", values: (e) => ({ service: e.nom || "", processId: e.id }) },
  T10: { label: _L("Créer l'indicateur", "Create the indicator"), page: "indicateurs", tab: "registre", list: "renderGrcMetricsList", values: (e) => ({ name: e.enonce || "", objectifId: e.id }) },
  T12: { label: _L("Ajouter une exigence de sécurité", "Add a security requirement"), page: "fournisseurs", tab: "exigences-securite", list: "renderGrcFiche_fournisseurs_exigences_securite", values: (e) => ({ fournisseur: e.id }) },
  T13: { label: _L("Décider dans la DDA", "Decide in the SoA"), page: "controles", tab: "soa", list: null, values: () => ({}) },
  T14: { label: _L("Créer le contrôle", "Create the control"), page: "controles", tab: "registre", list: "renderGrcControlList", values: (e) => ({ name: e.label ? grcLinksT(e.label) : "", catalogueIds: [e.id] }) },
  T19: { label: _L("Créer l'arbre d'appel", "Create the call tree"), page: "continuite-pgc", tab: "arbre-appel", file: "continuite/pgc.html", list: "renderGrcFiche_continuite_pgc_arbre_appel", values: (e) => ({ plans: [e.id] }) },
  T20: { label: _L("Créer un scénario", "Create a scenario"), page: "analyse-risques", tab: "scenarios", list: "renderGrcFiche_analyse_risques_scenarios", values: (e) => ({ source: e.id }) },
};

// Page (data-fiche-page) où l'on répare une rupture d'un type donné.
function _grcLinksTypePage(type) {
  const def = _grcLinksResolveType(type);
  if (!def) return null;
  if (def.page) return def.page;
  return def.pageFile ? def.pageFile.replace(/\.html$/, "").replace(/^continuite\//, "continuite-") : null;
}

// Ruptures dont l'élément en cause relève de la page (U3).
function grcLinksPageRuptures(page) {
  return grcLinksRuptures().filter((r) => _grcLinksTypePage(GRC_RUPTURES.find((x) => x.code === r.code).type) === page && r.items.length);
}

function grcLinksRuptures(codes) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ctx = grcLinksCtx();
  const idx = grcLinksIncomingIndex(ctx);
  const res = GRC_RUPTURES.filter((r) => !codes || codes.indexOf(r.code) !== -1).map((r) => {
    let items = [];
    try { items = r.test(ctx, idx) || []; } catch (e) { items = []; }
    const def = _grcLinksResolveType(r.type);
    return {
      code: r.code, sev: r.sev, label: grcLinksT(r.label),
      items: items.map((e) => ({ id: e.id, entity: e, label: String((def && def.label(e)) || e.id), href: grcLinksHref(r.type, e.id) })),
    };
  });
  grcLinksRuptures.lastMs = typeof performance !== "undefined" ? performance.now() - t0 : 0;
  return res;
}

/* ---------- §5 : rapprochement des anciens textes -------------------- */

function _norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

function _match(ctx, type, text) {
  const t = _norm(text);
  if (!t) return null;
  const def = _grcLinksResolveType(type);
  return ctx.list(type).find((e) => _norm(def.label(e)) === t) || ctx.list(type).find((e) => { const l = _norm(def.label(e)); return l && (l.indexOf(t) !== -1 || t.indexOf(l) !== -1); }) || null;
}

// Propositions : [{ key, entityId, field, text, toType, targetId, targetLabel, apply() }].
function grcLinksLegacyProposals() {
  const ctx = grcLinksCtx();
  const out = [];
  const push = (key, e, field, text, toType, target, apply) => {
    if (target) out.push({ key: key, entityId: e.id, field: field, text: text, toType: toType, targetId: target.id,
      targetLabel: grcLinksLabel(toType, target.id, ctx), apply: apply });
  };
  const keyOf = (t) => _grcLinksResolveType(t).key;
  // Plans : linkedControls (texte) -> controlIds
  ctx.list("plan").forEach((p) => (Array.isArray(p.linkedControls) ? p.linkedControls : []).forEach((txt) => {
    const c = _match(ctx, "control", txt);
    if (c && grcLinksValues(p, "controlIds").indexOf(c.id) === -1) push(keyOf("plan"), p, "controlIds", txt, "control", c, (x) => _addId(x, "controlIds", c.id));
  }));
  // Contrôles : isoRef (texte) -> catalogueIds
  ctx.list("control").forEach((c) => (typeof grcAnnexMatch === "function" ? grcAnnexMatch(c.isoRef) : []).forEach((aid) => {
    if (grcLinksValues(c, "catalogueIds").indexOf(aid) === -1) push(keyOf("control"), c, "catalogueIds", c.isoRef, "annex", { id: aid }, (x) => _addId(x, "catalogueIds", aid));
  }));
  // Obligations / documents : controls (texte) -> controlIds
  [["obligation", "controls"], ["document", "controls"]].forEach(([type, f]) => ctx.list(type).forEach((o) => (Array.isArray(o[f]) ? o[f] : []).forEach((txt) => {
    const c = _match(ctx, "control", txt);
    if (c && grcLinksValues(o, "controlIds").indexOf(c.id) === -1) push(keyOf(type), o, "controlIds", txt, "control", c, (x) => _addId(x, "controlIds", c.id));
  })));
  // Indicateurs : linkedRisk (texte) -> riskId
  ctx.list("metric").forEach((m) => {
    if (!m.riskId && m.linkedRisk) { const r = ctx.get("risk", m.linkedRisk) || _match(ctx, "risk", m.linkedRisk); if (r) push(keyOf("metric"), m, "riskId", m.linkedRisk, "risk", r, (x) => { x.riskId = r.id; }); }
  });
  // Continuité : dependencies[].ref (texte) -> targetId
  ctx.list("continuity").forEach((p) => (p.dependencies || []).forEach((d, i) => {
    if (d.targetId || !(d.type === "asset" || d.type === "supplier")) return;
    const t = _match(ctx, d.type, d.ref);
    if (t) push(keyOf("continuity"), p, "dependencies[" + i + "].targetId", d.ref, d.type, t, (x) => { if (x.dependencies && x.dependencies[i]) x.dependencies[i].targetId = t.id; });
  }));
  // Fiches : exigences-pp.partie (texte) -> partieId
  ctx.list("exigence").forEach((x) => {
    if (x.partieId || !x.partie) return;
    const p = _match(ctx, "pp", x.partie);
    if (p) push(keyOf("exigence"), x, "partieId", x.partie, "pp", p, (y) => { y.partieId = p.id; });
  });
  // Fiches : comités.role (texte) -> roleId
  ["comite-securite", "comite-grc", "comite-crise"].forEach((el) => {
    const t = _ficheTypeName("gouvernance", el);
    ctx.list(t).forEach((x) => {
      if (x.roleId || !x.role) return;
      const r = _match(ctx, "role", x.role);
      if (r) push(_grcLinksResolveType(t).key, x, "roleId", x.role, "role", r, (y) => { y.roleId = r.id; });
    });
  });
  return out;
}

function _addId(obj, field, id) {
  const cur = Array.isArray(obj[field]) ? obj[field].slice() : [];
  if (cur.indexOf(id) === -1) cur.push(id);
  obj[field] = cur;
}

// Applique une proposition (confirmée par l'utilisateur) : réécrit l'entité
// dans son stockage ; le texte d'origine reste en place (jamais effacé).
function grcLinksApplyProposal(p) {
  const list = _grcLinksReadKey(p.key);
  const e = list.find((x) => x.id === p.entityId);
  if (!e) return false;
  p.apply(e);
  vaultSetItem(p.key, JSON.stringify(list));
  return true;
}

/* ---------- panneau « Chaîne » (hub, Documents exigés) --------------- */

const GRC_SEV_LABEL = { high: _L("élevée", "high"), medium: _L("moyenne", "medium"), low: _L("faible", "low") };

function grcLinksRenderChain(host, opts) {
  const o = opts || {};
  host.innerHTML = "";
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    if (typeof vaultGateOr === "function") vaultGateOr(host, () => grcLinksRenderChain(host, opts));
    return;
  }
  const res = grcLinksRuptures(o.codes).filter((r) => r.items.length);
  const head = document.createElement("p");
  head.className = "grc-chain-head";
  const total = res.reduce((n, r) => n + r.items.length, 0);
  head.textContent = total
    ? grcLinksT(_L("Ruptures de la chaîne : ", "Chain breaks: ")) + total
    : grcLinksT(_L("Aucune rupture de la chaîne détectée.", "No chain break detected."));
  host.appendChild(head);
  res.sort((a, b) => ["high", "medium", "low"].indexOf(a.sev) - ["high", "medium", "low"].indexOf(b.sev)).forEach((r) => {
    const box = document.createElement("details");
    box.className = "grc-chain-rupture grc-chain-" + r.sev;
    if (r.sev === "high" && !o.collapsed) box.open = true;
    const sum = document.createElement("summary");
    sum.textContent = r.code + " · " + r.label + " (" + r.items.length + ") — " + grcLinksT(GRC_SEV_LABEL[r.sev]);
    box.appendChild(sum);
    const ul = document.createElement("ul");
    r.items.slice(0, o.max || 50).forEach((it) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = it.href;
      a.textContent = it.label;
      li.appendChild(a);
      const fix = GRC_RUPTURE_FIX[r.code];
      if (fix && typeof grcFicheCrossOpen === "function") {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "grc-registry-io-btn grc-chain-fix";
        b.textContent = grcLinksT(fix.label);
        b.addEventListener("click", () => grcFicheCrossOpen(fix, fix.values(it.entity)));
        li.appendChild(document.createTextNode(" "));
        li.appendChild(b);
      }
      ul.appendChild(li);
    });
    box.appendChild(ul);
    host.appendChild(box);
  });
  // Entrées « à revoir » (CH6).
  const rev = grcChainReviewList();
  if (rev.length) {
    const box = document.createElement("details");
    box.className = "grc-chain-rupture grc-chain-medium grc-chain-toreview";
    const sum = document.createElement("summary");
    sum.textContent = grcLinksT(_L("À revoir après un changement en amont", "To review after an upstream change")) + " (" + rev.length + ")";
    box.appendChild(sum);
    const ul = document.createElement("ul");
    rev.slice(0, o.max || 50).forEach((it) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = it.href;
      a.textContent = it.label;
      li.appendChild(a);
      li.appendChild(document.createTextNode(" — " + it.cause));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    host.appendChild(box);
  }
  if (o.legacy !== false) {
    const props = grcLinksLegacyProposals();
    if (props.length) {
      const box = document.createElement("details");
      box.className = "grc-chain-legacy";
      const sum = document.createElement("summary");
      sum.textContent = grcLinksT(_L("Rapprochements proposés (anciens textes → liens) : ", "Suggested matches (old texts → links): ")) + props.length;
      box.appendChild(sum);
      const ul = document.createElement("ul");
      props.forEach((p) => {
        const li = document.createElement("li");
        li.appendChild(document.createTextNode("« " + p.text + " » → " + p.targetLabel + " "));
        const b = document.createElement("button");
        b.type = "button";
        b.className = "grc-registry-io-btn grc-chain-apply";
        b.textContent = grcLinksT(_L("Lier", "Link"));
        b.addEventListener("click", () => { grcLinksApplyProposal(p); grcLinksRenderChain(host, opts); });
        li.appendChild(b);
        ul.appendChild(li);
      });
      box.appendChild(ul);
      host.appendChild(box);
    }
  }
}
