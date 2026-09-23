/* Organisation exemple FSociety (grc-debutant B7) et modèles de départ
   (UX U8).

   Exemple : données FICTIVES (FSociety, services comptables, Montréal ;
   aucun nom réel d'organisation ou de personne) formant une chaîne
   complète — portée -> actifs -> risques -> plans -> contrôles -> DDA ->
   obligations, processus -> plans de continuité -> arbre d'appel,
   objectifs -> indicateurs, revue -> actions… Critère : 0 rupture T1–T21
   une fois chargé (test DM.a).
   - Chargeable seulement si la documentation et les registres GRC sont
     vides (décision D3).
   - Les identifiants créés sont notés dans /grc/fiches/_demo : « Retirer
     l'exemple » supprime exactement ces entrées (même modifiées, avec
     avertissement), jamais celles créées par l'utilisateur.
   - Les éléments de documentation non couverts par la chaîne reçoivent
     une entrée tirée de leur exemple (`example`, UX U2).

   Modèles (U8) : entrées de départ par profil (PME de services, santé,
   manufacturier, OBNL), marquées `tpl` jusqu'à leur première
   modification ; retirables. */

const GRC_DEMO_KEY = "/grc/fiches/_demo";
const _DEMO_REG = {
  asset: "/grc/actifs/registry", risk: "/grc/analyse-risques/registry", plan: "/grc/traitement-risques/registry",
  control: "/grc/controles/registry", incident: "/grc/incidents/registry", continuity: "/grc/continuity/registry",
  supplier: "/grc/fournisseurs/registry", compliance: "/grc/compliance/registry", privacy: "/grc/privacy/registry",
  metric: "/grc/metrics/registry", document: "/grc/documents/registry", soa: "/grc/soa/registry",
};

const _GRC_DEMO_I18N = {
  "grc.demo.load": { fr: "Charger l’exemple FSociety", en: "Load the FSociety example" },
  "grc.demo.remove": { fr: "Retirer l’exemple", en: "Remove the example" },
  "grc.demo.loaded": { fr: "Exemple FSociety chargé (données fictives).", en: "FSociety example loaded (fictional data)." },
  "grc.demo.notEmpty": {
    fr: "L’exemple ne peut être chargé que si la documentation et les registres GRC sont vides, pour ne jamais mélanger l’exemple et tes données. Exporte puis réinitialise si tu veux l’essayer.",
    en: "The example can only be loaded when GRC documentation and registers are empty, so it never mixes with your data. Export then reset if you want to try it."
  },
  "grc.demo.intro": {
    fr: "FSociety est une organisation fictive (services comptables, Montréal) documentée de bout en bout : chaque section est reliée à la suivante, sans rupture de chaîne. Parcours les pages pour voir à quoi ressemble un SGSI complet, puis retire l’exemple.",
    en: "FSociety is a fictional organization (accounting services, Montreal) documented end to end: every section is linked to the next, with no chain break. Browse the pages to see what a complete ISMS looks like, then remove the example."
  },
  "grc.demo.tryBreak": {
    fr: "Astuce : crée un risque coté 5 × 5 sans plan de traitement pour voir apparaître une rupture T3 dans le panneau Chaîne.",
    en: "Tip: create a 5 × 5 risk without a treatment plan to see a T3 break appear in the Chain panel."
  },
  "grc.demo.confirmRemove": { fr: "Retirer toutes les entrées de l’exemple (y compris celles que tu as modifiées) ? Tes propres entrées sont conservées.", en: "Remove every example entry (including those you edited)? Your own entries are kept." },
  "grc.demo.removed": { fr: "Exemple retiré.", en: "Example removed." },
  "grc.demo.banner": { fr: "Exemple FSociety chargé (fictif).", en: "FSociety example loaded (fictional)." },
  "grc.tpl.intro": { fr: "Choisis le profil le plus proche : quelques entrées courantes sont ajoutées (enjeux, parties prenantes, exigences, actifs types). Elles restent marquées « modèle » jusqu’à ce que tu les modifies.", en: "Pick the closest profile: a few common entries are added (stakes, interested parties, requirements, typical assets). They stay marked \"template\" until you edit them." },
  "grc.tpl.apply": { fr: "Ajouter ce modèle", en: "Add this template" },
  "grc.tpl.remove": { fr: "Retirer les entrées « modèle » non modifiées", en: "Remove unedited \"template\" entries" },
  "grc.tpl.applied": { fr: "{n} entrée(s) ajoutée(s).", en: "{n} entr(y/ies) added." },
  "grc.tpl.removed": { fr: "{n} entrée(s) retirée(s).", en: "{n} entr(y/ies) removed." },
  "grc.tpl.p.services": { fr: "PME de services", en: "Service SME" },
  "grc.tpl.p.sante": { fr: "Santé", en: "Health" },
  "grc.tpl.p.manufacturier": { fr: "Manufacturier", en: "Manufacturing" },
  "grc.tpl.p.obnl": { fr: "OBNL", en: "Non-profit" },
};
if (typeof I18N_DICT !== "undefined") Object.assign(I18N_DICT, _GRC_DEMO_I18N);

function _demoT(fr, en) {
  return typeof getSavedLang === "function" && getSavedLang() === "en" ? en : fr;
}

function grcDemoLoaded() {
  try { return !!JSON.parse(vaultGetItem(GRC_DEMO_KEY) || "null"); } catch (e) { return false; }
}

// Documentation et registres GRC vides (D3) ; checklist, préférences et
// marqueurs internes (_meta, _migrations) ne comptent pas.
function grcDemoIsEmpty() {
  const regs = Object.values(_DEMO_REG);
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    let bad = false;
    if (regs.indexOf(k) !== -1) bad = true;
    if (k.indexOf("/grc/fiches/") === 0) {
      const rest = k.slice(12).split("/");
      bad = rest.length === 2 && rest[0] !== "demarrer" && rest[1].charAt(0) !== "_";
    }
    if (!bad) continue;
    try {
      const v = JSON.parse(vaultGetItem(k) || "[]");
      if (Array.isArray(v) ? v.length : v && Object.keys(v).length) return false;
    } catch (e) {
      return false;
    }
  }
  return true;
}

function _demoIso(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 864e5).toISOString();
}

function _demoDay(daysFromNow) {
  return _demoIso(daysFromNow).slice(0, 10);
}

/* ---------- données de l'exemple ------------------------------------ */

function _demoData() {
  const t = _demoT;
  const now = new Date().toISOString();
  const F = {};   // "page/el" -> [entrées]
  const f = (page, el, entry) => { (F[page + "/" + el] = F[page + "/" + el] || []).push(Object.assign({ demo: true, updatedAt: now, updatedBy: "FSociety" }, entry)); };
  const R = {};   // type -> [entités]
  const r = (type, e) => { (R[type] = R[type] || []).push(e); };

  // --- Contexte
  f("contexte-organisationnel", "mission-vision", { id: "demo-mv1", type: "mission", enonce: t("Offrir aux PME des services comptables fiables et confidentiels", "Provide SMEs with reliable, confidential accounting services"), securite: t("La confidentialité des dossiers clients et la disponibilité de la paie", "Confidentiality of client files and payroll availability"), statut: "approuve", approuvePar: t("Conseil d’administration", "Board of directors"), dateApprobation: _demoDay(-60) });
  f("contexte-organisationnel", "contexte-interne", { id: "demo-fi1", facteur: "competences", nature: "faiblesse", constat: t("Une seule personne administre les serveurs", "A single person administers the servers"), incidence: t("Reprise lente en son absence", "Slow recovery in their absence"), source: t("Entrevue TI", "IT interview") });
  f("contexte-organisationnel", "contexte-externe", { id: "demo-fe1", facteur: "legal", nature: "menace", constat: t("La Loi 25 impose de déclarer les incidents de confidentialité", "Bill 25 requires reporting privacy incidents"), source: t("Veille juridique", "Legal watch") });
  f("contexte-organisationnel", "contexte-externe", { id: "demo-fe2", facteur: "menaces", nature: "menace", constat: t("Les rançongiciels visent les cabinets comptables", "Ransomware targets accounting firms"), source: t("Centre canadien pour la cybersécurité", "Canadian Centre for Cyber Security") });
  f("contexte-organisationnel", "parties-prenantes", { id: "demo-pp1", partie: t("Clients", "Customers"), categorie: "externe", type: "client", attentes: t("Confidentialité des dossiers, paie à temps", "File confidentiality, payroll on time") });
  f("contexte-organisationnel", "parties-prenantes", { id: "demo-pp2", partie: t("Commission d’accès à l’information", "Commission d’accès à l’information"), categorie: "externe", type: "autorite", attentes: t("Respect de la Loi 25", "Compliance with Bill 25") });
  f("contexte-organisationnel", "exigences-pp", { id: "demo-ex1", exigence: t("Protéger les renseignements personnels et déclarer les incidents", "Protect personal information and report incidents"), partie: t("Commission d’accès à l’information", "Commission d’accès à l’information"), partieId: "demo-pp2", source: "legale", reference: t("Loi 25", "Bill 25"), traitee: "oui", moyen: t("Registre de conformité", "Compliance register") });
  f("contexte-organisationnel", "portee-sgsi", { id: "demo-po1", element: "site", description: t("Siège de Montréal et services infonuagiques de production", "Montreal head office and production cloud services"), justification: t("Là où sont traités les dossiers clients", "Where client files are processed"), statut: "approuve", approuvePar: t("Direction", "Management"), dateApprobation: _demoDay(-60), actifs: ["demo-a1", "demo-a2", "demo-a3"] });
  f("contexte-organisationnel", "portee-pca", { id: "demo-pc1", element: "activite", description: t("Service de paie des clients", "Client payroll service"), statut: "approuve" });
  f("contexte-organisationnel", "enjeux-affaires", { id: "demo-en1", enjeu: t("Garder la confiance des clients", "Keep customers’ trust"), categorie: "", consequence: t("Perte de clients après une fuite", "Customer loss after a leak"), priorite: "haute", processus: ["demo-pr1"] });
  f("contexte-organisationnel", "cartographie-processus", { id: "demo-pr1", nom: t("Paie des clients", "Client payroll"), proprietaire: t("Directrice des opérations", "Operations director"), finalite: t("Verser les salaires à temps", "Pay salaries on time"), criticite: "vital", actifs: ["demo-a2"], fournisseurs: ["demo-s1"] });

  // --- Gouvernance
  f("gouvernance", "sgsi", { id: "demo-ob1", aspect: "objectif", enonce: t("100 % des accès distants protégés par MFA", "100% of remote access protected by MFA"), mesure: t("Taux d’accès distants avec MFA", "Share of remote access with MFA"), responsable: t("RSSI", "CISO"), echeance: _demoDay(120), statut: "encours", enjeux: ["demo-en1"], ressources: ["demo-rs1"], evaluation: t("Extraction mensuelle", "Monthly extract") });
  f("gouvernance", "ressources-sgsi", { id: "demo-rs1", type: "humaine", description: t("0,5 ETP analyste sécurité", "0.5 FTE security analyst"), statut: "allouee", objectifs: ["demo-ob1"] });
  f("gouvernance", "roles", { id: "demo-ro1", role: t("Responsable de la sécurité (RSSI)", "Security officer (CISO)"), titulaire: "J. Roy", suppleant: "M. Côté", responsabilites: t("Pilote le SGSI", "Runs the ISMS"), autorite: t("Approuve les exceptions", "Approves exceptions") });
  f("gouvernance", "roles", { id: "demo-ro2", role: t("Directrice des opérations", "Operations director"), titulaire: "L. Tremblay", suppleant: "P. Gagnon", responsabilites: t("Propriétaire du processus de paie", "Owner of the payroll process") });
  f("gouvernance", "communication", { id: "demo-co1", sujet: t("Politique de sécurité", "Security policy"), sens: "interne", public: ["demo-pp1"], quand: t("Chaque année", "Yearly"), qui: t("RSSI", "CISO"), canal: "intranet" });
  f("gouvernance", "comite-securite", { id: "demo-cs1", type: "membre", libelle: "J. Roy", role: t("Président", "Chair"), roleId: "demo-ro1" });
  f("gouvernance", "criteres-acceptation", { id: "demo-cr1", critere: t("Score P × I ≤ 8", "P × I score ≤ 8"), autorite: t("Propriétaire du risque", "Risk owner"), duree: t("12 mois", "12 months"), seuilPxI: "8" });
  f("gouvernance", "revues-direction", { id: "demo-rv1", date: _demoDay(-30), participants: t("Direction, RSSI", "Management, CISO"), decisions: t("Accélérer le déploiement du MFA", "Speed up MFA rollout"), decisionIds: ["demo-am1"], modificationIds: ["demo-mo1"],
    inActions: t("2 actions ouvertes", "2 open actions"), inChangements: t("Nouveau site de Laval", "New Laval site"), inRetours: t("Clients : attentes de confidentialité", "Customers: confidentiality expectations"), inNc: t("1 non-conformité en cours", "1 nonconformity in progress"),
    inSurveillance: t("MFA à 80 %", "MFA at 80%"), inAudits: t("Audit interne sans écart majeur", "Internal audit without major gap"), inObjectifs: t("Objectif MFA en cours", "MFA objective in progress"), inRisques: t("1 risque à traiter, avec plan", "1 risk to treat, with plan"), inAmelioration: t("Automatiser la revue des accès", "Automate access review") });
  f("gouvernance", "amelioration", { id: "demo-am1", nature: "amelioration", origine: "revue", description: t("Accélérer le déploiement du MFA", "Speed up MFA rollout"), sourceRevue: "demo-rv1", action: t("Déployer le MFA sur le VPN", "Roll out MFA on the VPN"), responsable: t("Service TI", "IT"), echeance: _demoDay(60), statut: "encours" });
  f("gouvernance", "amelioration", { id: "demo-am2", nature: "nc", origine: "audit", description: t("Les accès des départs ne sont pas retirés sous 24 h", "Leavers’ access not removed within 24 h"), correction: t("Retrait immédiat des comptes trouvés", "Immediate removal of the accounts found"), causes: t("Aucune alerte RH vers les TI", "No HR alert to IT"), action: t("Formulaire de départ relié aux TI", "Leaver form connected to IT"), responsable: t("RH", "HR"), echeance: _demoDay(45), statut: "encours" });
  f("gouvernance", "modifications", { id: "demo-mo1", modification: t("Ajout du site de Laval à la portée", "Adding the Laval site to the scope"), motif: t("Ouverture d’un bureau", "New office"), statut: "realisee", revus: "oui", risques: ["demo-r1"], processus: ["demo-pr1"] });

  // --- Actifs (registre)
  r("asset", { id: "demo-a1", name: t("Serveur de fichiers", "File server"), type: "physique", c: 3, i: 3, a: 3, role: "support", owner: t("Service TI", "IT"), dependsOn: [], porteeIds: ["demo-po1"], processIds: ["demo-pr1"], notes: "", valueCurrency: "CAD", valueAmount: 40000 });
  r("asset", { id: "demo-a2", name: t("Application de paie", "Payroll application"), type: "logiciel", c: 3, i: 3, a: 3, role: "primaire", owner: t("Directrice des opérations", "Operations director"), dependsOn: ["demo-a1"], porteeIds: ["demo-po1"], processIds: ["demo-pr1"], supplierIds: ["demo-s1"], notes: "", valueCurrency: "CAD", valueAmount: 150000 });
  r("asset", { id: "demo-a3", name: t("Postes de travail", "Workstations"), type: "physique", c: 2, i: 2, a: 2, role: "support", owner: t("Service TI", "IT"), dependsOn: [], porteeIds: ["demo-po1"], notes: "", valueCurrency: "CAD" });

  // --- Risques
  f("analyse-risques", "sources-risque", { id: "demo-sr1", source: t("Groupe de rançongiciel", "Ransomware group"), type: "malveillante", motivation: t("Gain financier", "Financial gain"), moyens: "eleves", retenue: "oui" });
  f("analyse-risques", "scenarios", { id: "demo-sc1", objectif: t("Chiffrement du serveur de fichiers", "File server encryption"), source: "demo-sr1", actifs: ["demo-a1"], chemin: t("Hameçonnage → poste → serveur", "Phishing → workstation → server"), vraisemblance: "4", gravite: "4" });
  r("risk", { id: "demo-r1", name: t("Rançongiciel sur le serveur de fichiers", "Ransomware on the file server"), threat: t("Rançongiciel", "Ransomware"), vulnerability: t("Accès distant sans MFA", "Remote access without MFA"), probability: 4, impact: 4, status: "ouvert", owner: "J. Roy", reviewDate: _demoDay(90),
    assetIds: ["demo-a1", "demo-a2"], enjeuIds: ["demo-en1"], menaceIds: ["demo-fe2"], sourceIds: ["demo-sr1"], scenarioId: "demo-sc1", treatmentPlan: { planIds: ["demo-p1"] } });
  r("risk", { id: "demo-r2", name: t("Fuite de renseignements personnels", "Personal information leak"), threat: t("Erreur d’envoi", "Mis-sent email"), vulnerability: t("Envoi par courriel non chiffré", "Unencrypted email"), probability: 2, impact: 4, status: "ouvert", owner: "J. Roy", reviewDate: _demoDay(90),
    assetIds: ["demo-a2", "demo-a3"], enjeuIds: ["demo-en1"], menaceIds: ["demo-fe1"], treatmentPlan: { planIds: ["demo-p2"] } });

  // --- Traitement
  r("plan", { id: "demo-p1", schema: 1, name: t("Durcir les accès et les sauvegardes", "Harden access and backups"), strategy: "mitigate", rationale: t("Réduire la vraisemblance et l’impact", "Reduce likelihood and impact"), transferTo: "", actions: [], linkedControls: [], controlIds: ["demo-k1", "demo-k2"] });
  r("plan", { id: "demo-p2", schema: 1, name: t("Encadrer l’envoi de renseignements personnels", "Govern personal information transfers"), strategy: "mitigate", rationale: "", transferTo: "", actions: [], linkedControls: [], controlIds: ["demo-k3"] });

  // --- Contrôles (+ DDA)
  const K = [
    ["demo-k1", t("MFA sur tous les accès distants", "MFA on all remote access"), "technique", ["A.5.17", "A.8.5"], ["demo-r1"], ["demo-o2"]],
    ["demo-k2", t("Sauvegardes immuables hors site", "Immutable off-site backups"), "technique", ["A.8.13", "A.8.14"], ["demo-r1"], []],
    ["demo-k3", t("Gestion et revue des accès", "Access management and review"), "organisationnel", ["A.5.15", "A.5.16", "A.5.18", "A.8.2", "A.8.3", "A.5.14"], ["demo-r2"], ["demo-o1"]],
    ["demo-k4", t("Cadre de gouvernance de la sécurité", "Security governance framework"), "organisationnel", ["A.5.1", "A.5.2", "A.5.3", "A.5.4", "A.5.5", "A.5.6", "A.5.7", "A.5.8", "A.5.9", "A.5.10", "A.5.11", "A.5.12", "A.5.13", "A.5.31", "A.5.32", "A.5.33", "A.5.34", "A.5.35", "A.5.36", "A.5.37"], [], ["demo-o1"]],
    ["demo-k5", t("Gestion des incidents et de la continuité", "Incident and continuity management"), "organisationnel", ["A.5.24", "A.5.25", "A.5.26", "A.5.27", "A.5.28", "A.5.29", "A.5.30"], [], []],
    ["demo-k6", t("Sécurité des fournisseurs", "Supplier security"), "organisationnel", ["A.5.19", "A.5.20", "A.5.21", "A.5.22", "A.5.23"], [], []],
    ["demo-k7", t("Sécurité liée aux personnes", "People security"), "humain", ["A.6.1", "A.6.2", "A.6.3", "A.6.4", "A.6.5", "A.6.6", "A.6.7", "A.6.8"], [], []],
    ["demo-k8", t("Sécurité physique des locaux", "Physical security of premises"), "physique", ["A.7.1", "A.7.2", "A.7.3", "A.7.4", "A.7.5", "A.7.6", "A.7.7", "A.7.8", "A.7.9", "A.7.10", "A.7.11", "A.7.12", "A.7.13", "A.7.14"], [], []],
    ["demo-k9", t("Protection des postes, serveurs et réseaux", "Endpoint, server and network protection"), "technique", ["A.8.1", "A.8.4", "A.8.6", "A.8.7", "A.8.8", "A.8.9", "A.8.10", "A.8.11", "A.8.12", "A.8.15", "A.8.16", "A.8.17", "A.8.18", "A.8.19", "A.8.20", "A.8.21", "A.8.22", "A.8.23", "A.8.24", "A.8.32", "A.8.34"], [], []],
  ];
  K.forEach(([id, name, type, cat, risks, obls]) => r("control", { id: id, name: name, isoRef: cat[0], nistRef: "", cisRef: "", type: type, status: "implemente", owner: t("RSSI", "CISO"),
    evidence: t("Voir Documentation › Preuves d’audit", "See Documentation › Audit evidence"), justification: t("Traite les risques du registre", "Treats register risks"), riskIds: risks, obligationIds: obls, catalogueIds: cat }));
  const implBy = {};
  K.forEach(([id, , , cat]) => cat.forEach((a) => { (implBy[a] = implBy[a] || []).push(id); }));
  (typeof GRC_ANNEX_A !== "undefined" ? GRC_ANNEX_A : []).forEach((c) => {
    if (implBy[c.id]) r("soa", { id: c.id, applicable: "oui", raison: "risque", justification: t("Retenu pour traiter les risques de FSociety", "Selected to treat FSociety’s risks"), statut: "implemente", implementedBy: implBy[c.id], obligationIds: [], riskIds: [], updatedAt: now, updatedBy: "FSociety" });
    else r("soa", { id: c.id, applicable: "non", raison: "", justification: c.id >= "A.8.25" && c.id <= "A.8.31"
      ? t("Aucun développement logiciel interne chez FSociety", "No in-house software development at FSociety")
      : t("Non pertinent pour le périmètre de FSociety (à réévaluer à chaque revue)", "Not relevant to FSociety’s scope (re-assessed at each review)"), statut: "", implementedBy: [], obligationIds: [], riskIds: [], updatedAt: now, updatedBy: "FSociety" });
  });

  // Directives / procédures reprenant les contrôles (T6)
  f("directives", "politique-securite", { id: "demo-di1", type: "objectif", texte: t("Protéger la confidentialité, l’intégrité et la disponibilité des informations de FSociety et de ses clients.", "Protect the confidentiality, integrity and availability of FSociety’s and its customers’ information."), controles: ["demo-k4", "demo-k5", "demo-k6", "demo-k7", "demo-k8", "demo-k9"] });
  f("directives", "acces", { id: "demo-di2", type: "regle", texte: t("Tout accès distant exige le MFA ; les accès sont revus chaque trimestre.", "All remote access requires MFA; access is reviewed quarterly."), controles: ["demo-k1", "demo-k3"] });
  f("procedures", "sauvegarde", { id: "demo-pc1", ordre: "1", type: "etape", description: t("Sauvegarde quotidienne vers le stockage immuable hors site", "Daily backup to immutable off-site storage"), responsable: t("Service TI", "IT"), controles: ["demo-k2"] });

  // --- Incidents
  r("incident", { id: "demo-i1", title: t("Hameçonnage signalé par un employé", "Phishing reported by an employee"), description: t("Courriel frauduleux bloqué", "Fraudulent email blocked"), severity: "mineur", status: "clos", detectedAt: _demoIso(-40), respondedAt: _demoIso(-40), resolvedAt: _demoIso(-39), owner: t("Service TI", "IT"), postmortem: "", assetIds: ["demo-a3"], riskIds: ["demo-r1"], controlIds: ["demo-k1"] });
  f("incidents", "lecons", { id: "demo-le1", lecon: t("Le signalement rapide a évité la compromission", "Fast reporting prevented compromise"), incident: "demo-i1", action: t("Rappeler le canal de signalement", "Remind the reporting channel"), actionId: "demo-am1", statut: "close" });

  // --- Continuité
  r("continuity", { id: "demo-c1", schema: 2, service: t("Paie des clients", "Client payroll"), description: t("Calcul et versement de la paie", "Payroll computation and payment"), owner: t("Directrice des opérations", "Operations director"), criticality: "vital", processId: "demo-pr1",
    bia: { mtdMin: 1440, rtoMin: 240, rpoMin: 60, maoMin: 1440, mbco: t("20 plus gros clients", "20 largest clients"), mbcoPct: 60, impacts: "", peakPeriods: t("Fin de mois", "Month end"),
      timeline: [{ id: "demo-hz1", horizonMin: 240, financier: 2, operationnel: 3, reputation: 2, legal: 1, level: 3, note: "" }, { id: "demo-hz2", horizonMin: 1440, financier: 4, operationnel: 4, reputation: 4, legal: 3, level: 4, note: "" }],
      resources: [{ id: "demo-res1", kind: "role", roleId: "demo-ro2", label: "", quantity: "2", horizonMin: 240 }] },
    dependencies: [{ id: "demo-dep1", type: "asset", ref: t("Application de paie", "Payroll application"), targetId: "demo-a2", note: "", spof: false }, { id: "demo-dep2", type: "supplier", ref: "FSociety Cloud", targetId: "demo-s1", note: "", spof: true }],
    spoc: "J. Roy", ccd: [], redundancy: [], drp: [{ id: "demo-drp1", order: 1, text: t("Basculer vers le site de relève", "Fail over to the recovery site"), owner: t("Service TI", "IT") }],
    tests: [{ id: "demo-t1", kind: "tabletop", date: _demoIso(-20), result: "pass", notes: "" }], review: { lastReviewedAt: _demoIso(-20), nextDueAt: _demoIso(345), cadenceMonths: 12 }, linkedIncident: "" });
  f("continuite-pgc", "arbre-appel", { id: "demo-ap1", ordre: "1", titulaire: "J. Roy", roleId: "demo-ro1", contact: "514 555-0100", suppleant: "M. Côté", plans: ["demo-c1"] });
  f("continuite-pca", "politique", { id: "demo-pl1", type: "objectif", texte: t("Maintenir la paie des clients même en cas de sinistre", "Keep client payroll running even after a disaster") });
  f("continuite-pca", "objectifs", { id: "demo-oc1", objectif: t("Reprendre la paie en 4 h", "Resume payroll within 4 h"), mesure: t("Résultat des exercices", "Exercise results"), objectifs: ["demo-ob1"] });
  f("continuite-pcm", "messages", { id: "demo-ms1", scenario: t("Rançongiciel", "Ransomware"), public: t("Clients", "Customers"), message: t("Nous gérons un incident informatique ; nous vous tiendrons informés.", "We are handling an IT incident; we will keep you informed.") });
  f("continuite-tests-exercices", "rapports", { id: "demo-rp1", plan: "demo-c1", date: _demoDay(-20), resultat: "reussi", observations: t("Arbre d’appel complet en 15 min", "Call tree completed in 15 min"), actions: [] });
  f("continuite-tests-exercices", "programme", { id: "demo-pg1", exercice: t("TTX rançongiciel", "Ransomware TTX"), type: "ttx", plan: "demo-c1", date: _demoDay(160) });
  f("continuite", "ressources-critiques", { id: "demo-rc1", categorie: "", ressource: t("2 commis à la paie formés", "2 trained payroll clerks"), processus: "demo-pr1", minimum: t("1 personne", "1 person") });

  // --- Documentation
  r("document", { id: "demo-d1", schema: 1, title: t("Politique de sécurité de l’information", "Information security policy"), docType: "policy", owner: t("RSSI", "CISO"), approver: t("Direction", "Management"), status: "approved", version: "1.0", approvedAt: _demoIso(-60), approvedBy: t("Direction", "Management"), review: { lastReviewedAt: _demoIso(-60), nextDueAt: _demoIso(305), cadenceMonths: 12 }, history: [], relations: [], controlIds: ["demo-k4"] });
  r("document", { id: "demo-d2", schema: 1, title: t("Directive de gestion des accès", "Access management directive"), docType: "directive", owner: t("RSSI", "CISO"), approver: t("Direction", "Management"), status: "published", version: "1.0", review: { lastReviewedAt: _demoIso(-60), nextDueAt: _demoIso(305), cadenceMonths: 12 }, history: [], relations: [], controlIds: ["demo-k3"] });
  r("document", { id: "demo-d3", schema: 1, title: t("Procédure de sauvegarde", "Backup procedure"), docType: "procedure", owner: t("Service TI", "IT"), approver: t("RSSI", "CISO"), status: "published", version: "1.0", review: { lastReviewedAt: _demoIso(-60), nextDueAt: _demoIso(305), cadenceMonths: 12 }, history: [], relations: [], controlIds: ["demo-k2"] });
  r("privacy", { id: "demo-tr1", schema: 1, kind: "processing", name: t("Paie des employés des clients", "Clients’ employee payroll"), purpose: t("Verser les salaires", "Pay salaries"), owner: "J. Roy", legalBasis: "contract", recipientSupplierIds: ["demo-s1"] });
  f("indicateurs", "objectifs", { id: "demo-io1", objectif: "demo-ob1", cible: "100 %", mesure: t("Taux d’accès distants avec MFA", "Share of remote access with MFA"), echeance: _demoDay(120), etat: "" });
  K.forEach(([id, name]) => f("documentation", "preuves-audit", { id: "demo-ev-" + id.slice(5), preuve: t("Preuve : ", "Evidence: ") + name, controle: id, emplacement: t("Gestion documentaire › Preuves", "Document management › Evidence"), responsable: t("RSSI", "CISO"), date: _demoDay(-15) }));

  // --- Conformité
  r("compliance", { id: "demo-o1", schema: 1, kind: "obligation", ref: t("Loi 25", "Bill 25"), title: t("Protection des renseignements personnels", "Personal information protection"), sourceType: "law", sourceRef: t("Loi 25", "Bill 25"), applicability: "applicable", status: "partial", owner: "J. Roy", evidence: "", notes: "", controls: [], controlIds: ["demo-k3", "demo-k4"], sourceExigenceId: "demo-ex1", sourceFacteurId: "demo-fe1", assessment: { cadenceMonths: 12 } });
  r("compliance", { id: "demo-o2", schema: 1, kind: "obligation", ref: t("Contrat clients", "Customer contract"), title: t("Authentification forte exigée par les clients", "Strong authentication required by customers"), sourceType: "contract", sourceRef: "", applicability: "applicable", status: "compliant", owner: "J. Roy", evidence: "", notes: "", controls: [], controlIds: ["demo-k1"], assessment: { cadenceMonths: 12 } });
  r("compliance", { id: "demo-au1", schema: 1, kind: "audit", title: t("Audit interne 2027", "2027 internal audit"), type: "internal", scope: t("SGSI complet", "Full ISMS"), auditor: t("Cabinet fictif FSociety Audit", "Fictional firm FSociety Audit"), status: "closed", plannedFor: _demoIso(-50), startedAt: _demoIso(-50), closedAt: _demoIso(-45),
    findings: [{ id: "demo-fd1", ts: _demoIso(-45), severity: "minor", text: t("Retrait tardif des accès des départs", "Late removal of leavers’ access"), clause: "A.5.18", correctiveAction: t("Voir action demo-am2", "See action demo-am2"), owner: "RH", verification: "in-progress", linkedRisk: "demo-r2", linkedIncident: "" }] });
  f("conformite", "programme-audit", { id: "demo-pa1", cycle: t("Cycle 2027-2029", "2027-2029 cycle"), periode: t("Annuel", "Yearly"), clauses: "4, 5, 6, 7, 8, 9, 10", auditeur: t("Cabinet fictif FSociety Audit", "Fictional firm FSociety Audit"), independance: t("Aucune responsabilité dans le SGSI", "No responsibility in the ISMS"), audit: "demo-au1" });

  // --- Fournisseurs
  r("supplier", { id: "demo-s1", schema: 1, name: t("FSociety Cloud (hébergeur fictif)", "FSociety Cloud (fictional host)"), service: t("Hébergement de l’application de paie", "Payroll application hosting"), owner: "J. Roy", criticality: "critique", dataShared: "personal", sites: "Canada", status: "active" });
  f("fournisseurs", "sla", { id: "demo-sla1", fournisseur: "demo-s1", service: t("Hébergement", "Hosting"), indicateur: t("Disponibilité mensuelle", "Monthly availability"), cible: "99,9 %" });
  f("fournisseurs", "exigences-securite", { id: "demo-es1", fournisseur: "demo-s1", exigence: t("MFA pour tout accès administrateur", "MFA for all administrator access"), clause: t("Annexe sécurité, art. 3", "Security schedule, art. 3") });
  f("fournisseurs", "capacites-continuite", { id: "demo-cc1", fournisseur: "demo-s1", capacite: t("RTO déclaré 4 h", "Declared RTO 4 h"), preuve: t("Rapport SOC 2 fictif", "Fictional SOC 2 report"), besoin: t("RTO 4 h", "RTO 4 h"), ecart: "aucun", dateRevue: _demoDay(300) });

  // --- Indicateurs
  r("metric", { id: "demo-m1", schema: 1, name: t("Taux d’accès distants avec MFA", "Share of remote access with MFA"), type: "kpi", unit: "%", domaine: "sgsi", owner: "J. Roy", source: "", cadenceMonths: 1, direction: "higher-better", target: 100, thresholds: { amber: 90, red: 70 }, linkedRisk: "", formulaNote: "", objectifId: "demo-ob1", riskId: "demo-r1", controlId: "demo-k1", series: [{ id: "demo-ms-1", date: _demoIso(-30), value: 80, note: "" }] });
  r("metric", { id: "demo-m2", schema: 1, name: t("Exercices de continuité réussis", "Successful continuity exercises"), type: "kpi", unit: "%", domaine: "pca", owner: "L. Tremblay", source: "", cadenceMonths: 12, direction: "higher-better", target: 100, thresholds: { amber: 80, red: 50 }, linkedRisk: "", formulaNote: "", series: [{ id: "demo-ms-2", date: _demoIso(-20), value: 100, note: "" }] });

  // --- RH / Sécurité physique (liens vers rôles, zones)
  f("ressources-humaines", "competences", { id: "demo-cp1", roleId: "demo-ro1", competence: t("Gestion des risques ISO 27005", "ISO 27005 risk management"), preuve: t("Certification (fictive)", "Certification (fictional)"), ecart: "aucun" });
  f("ressources-humaines", "sensibilisation", { id: "demo-sn1", activite: t("Simulation d’hameçonnage", "Phishing simulation"), public: t("Tous les employés", "All staff"), frequence: t("Trimestrielle", "Quarterly"), risques: ["demo-r1"], lecons: ["demo-le1"] });
  f("ressources-humaines", "depart", { id: "demo-dp1", etape: t("Retrait de tous les accès", "Removal of all access"), responsable: t("Service TI", "IT"), delai: "24 h", controles: ["demo-k3"] });
  f("securite-physique", "zones", { id: "demo-z1", zone: t("Salle des serveurs", "Server room"), site: "demo-po1", niveau: "sensible", acces: t("Badge limité aux TI", "Badge limited to IT"), actifs: ["demo-a1"] });
  f("securite-physique", "environnement", { id: "demo-ev1", menace: t("Coupure électrique", "Power outage"), zone: "demo-z1", mesure: t("Onduleur et génératrice", "UPS and generator"), controle: "demo-k8" });

  return { F: F, R: R };
}

function grcDemoLoad() {
  if (grcDemoLoaded()) return { ok: false, reason: "loaded" };
  if (!grcDemoIsEmpty()) return { ok: false, reason: "notEmpty" };
  const d = _demoData();
  const ids = {};
  // Éléments de documentation non couverts : une entrée tirée de l'exemple.
  if (typeof GRC_FICHE_DEFS !== "undefined") {
    Object.keys(GRC_FICHE_DEFS).forEach((page) => {
      if (GRC_FICHE_DEFS[page].plain) return;
      GRC_FICHE_DEFS[page].elements.filter((el) => (!el.kind || el.kind === "form") && el.example).forEach((el) => {
        const k = page + "/" + el.id;
        if (d.F[k]) return;
        const v = typeof _grcFicheExampleValues === "function" ? _grcFicheExampleValues(el) : {};
        d.F[k] = [Object.assign({ id: "demo-x-" + page + "-" + el.id, demo: true, updatedAt: new Date().toISOString(), updatedBy: "FSociety" },
          typeof grcFicheCleanEntry === "function" ? grcFicheCleanEntry(el, v) : v)];
      });
    });
  }
  Object.keys(d.F).forEach((k) => {
    const key = "/grc/fiches/" + k;
    const def = typeof GRC_FICHE_DEFS !== "undefined" ? (GRC_FICHE_DEFS[k.split("/")[0]] || { elements: [] }).elements.find((x) => x.id === k.split("/")[1]) : null;
    const list = d.F[k].map((e) => (def && def.fields ? Object.assign({ id: e.id, demo: true, updatedAt: e.updatedAt, updatedBy: e.updatedBy }, grcFicheCleanEntry(def, e)) : e));
    vaultSetItem(key, JSON.stringify(list));
    ids[key] = list.map((e) => e.id);
  });
  Object.keys(d.R).forEach((type) => {
    const key = _DEMO_REG[type];
    vaultSetItem(key, JSON.stringify(d.R[type]));
    ids[key] = d.R[type].map((e) => e.id);
  });
  vaultSetItem(GRC_DEMO_KEY, JSON.stringify({ loadedAt: new Date().toISOString(), ids: ids }));
  return { ok: true };
}

function grcDemoRemove() {
  let m = null;
  try { m = JSON.parse(vaultGetItem(GRC_DEMO_KEY) || "null"); } catch (e) { m = null; }
  if (!m || !m.ids) return 0;
  let n = 0;
  Object.keys(m.ids).forEach((key) => {
    const drop = m.ids[key];
    let list = [];
    try { list = JSON.parse(vaultGetItem(key) || "[]"); } catch (e) { list = []; }
    if (!Array.isArray(list)) return;
    const keep = list.filter((e) => !(e && drop.indexOf(e.id) !== -1));
    n += list.length - keep.length;
    if (keep.length) vaultSetItem(key, JSON.stringify(keep));
    else vaultRemoveItem(key);
  });
  vaultRemoveItem(GRC_DEMO_KEY);
  return n;
}

function grcDemoRender(host) {
  host.innerHTML = "";
  const p = document.createElement("p");
  p.className = "grc-fiche-hint";
  p.textContent = grcT("grc.demo.intro");
  host.appendChild(p);
  const bar = document.createElement("div");
  bar.className = "grc-toolbar grc-demo-bar";
  const st = document.createElement("p");
  st.className = "grc-demo-status";
  if (grcDemoLoaded()) {
    st.textContent = grcT("grc.demo.loaded");
    const tip = document.createElement("p");
    tip.className = "grc-fiche-hint";
    tip.textContent = grcT("grc.demo.tryBreak");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-toolbar-btn grc-toolbar-btn-danger grc-demo-remove";
    b.textContent = grcT("grc.demo.remove");
    b.addEventListener("click", () => {
      if (!confirm(grcT("grc.demo.confirmRemove"))) return;
      grcDemoRemove();
      alert(grcT("grc.demo.removed"));
      grcDemoRender(host);
    });
    bar.appendChild(b);
    host.appendChild(st);
    host.appendChild(tip);
  } else {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-registry-add-btn grc-demo-load";
    b.textContent = grcT("grc.demo.load");
    b.addEventListener("click", () => {
      const r = grcDemoLoad();
      if (!r.ok) { alert(grcT(r.reason === "notEmpty" ? "grc.demo.notEmpty" : "grc.demo.loaded")); return; }
      grcDemoRender(host);
    });
    bar.appendChild(b);
    if (!grcDemoIsEmpty()) {
      const w = document.createElement("p");
      w.className = "grc-fiche-hint grc-demo-notempty";
      w.textContent = grcT("grc.demo.notEmpty");
      host.appendChild(w);
    }
  }
  host.appendChild(bar);
}

/* ---------- modèles de départ (U8) ------------------------------------ */

const GRC_TEMPLATES = {
  services: [
    ["contexte-organisationnel", "enjeux-affaires", { enjeu: ["Confidentialité des dossiers clients", "Confidentiality of client files"], priorite: "haute" }],
    ["contexte-organisationnel", "parties-prenantes", { partie: ["Clients", "Customers"], categorie: "externe", type: "client" }],
    ["contexte-organisationnel", "exigences-pp", { exigence: ["Protéger les renseignements personnels des clients", "Protect customers’ personal information"], source: "legale", reference: ["Loi 25", "Bill 25"] }],
    ["contexte-organisationnel", "contexte-externe", { facteur: "menaces", nature: "menace", constat: ["Hameçonnage et fraude au président ciblant les PME", "Phishing and CEO fraud targeting SMEs"] }],
  ],
  sante: [
    ["contexte-organisationnel", "enjeux-affaires", { enjeu: ["Continuité des soins et confidentialité des dossiers de santé", "Continuity of care and health record confidentiality"], priorite: "haute" }],
    ["contexte-organisationnel", "parties-prenantes", { partie: ["Patients", "Patients"], categorie: "externe", type: "client" }],
    ["contexte-organisationnel", "exigences-pp", { exigence: ["Confidentialité des renseignements de santé", "Health information confidentiality"], source: "legale", reference: ["Loi 25 et lois sectorielles", "Bill 25 and sector laws"] }],
    ["contexte-organisationnel", "contexte-externe", { facteur: "menaces", nature: "menace", constat: ["Rançongiciels visant les établissements de santé", "Ransomware targeting healthcare"] }],
  ],
  manufacturier: [
    ["contexte-organisationnel", "enjeux-affaires", { enjeu: ["Disponibilité des lignes de production", "Production line availability"], priorite: "haute" }],
    ["contexte-organisationnel", "parties-prenantes", { partie: ["Donneurs d’ordre", "Prime contractors"], categorie: "externe", type: "client" }],
    ["contexte-organisationnel", "exigences-pp", { exigence: ["Protéger les plans et la propriété intellectuelle des clients", "Protect customers’ drawings and intellectual property"], source: "contractuelle" }],
    ["contexte-organisationnel", "contexte-externe", { facteur: "technologique", nature: "menace", constat: ["Systèmes industriels (OT) anciens et connectés", "Old, connected industrial (OT) systems"] }],
  ],
  obnl: [
    ["contexte-organisationnel", "enjeux-affaires", { enjeu: ["Confiance des donateurs et des bénévoles", "Donor and volunteer trust"], priorite: "haute" }],
    ["contexte-organisationnel", "parties-prenantes", { partie: ["Donateurs", "Donors"], categorie: "externe", type: "client" }],
    ["contexte-organisationnel", "exigences-pp", { exigence: ["Protéger les renseignements des donateurs et bénéficiaires", "Protect donor and beneficiary information"], source: "legale", reference: ["Loi 25", "Bill 25"] }],
    ["contexte-organisationnel", "contexte-interne", { facteur: "finances", nature: "faiblesse", constat: ["Budget TI limité, bénévoles aux accès étendus", "Limited IT budget, volunteers with broad access"] }],
  ],
};

function grcTemplatesApply(profile) {
  const rows = GRC_TEMPLATES[profile] || [];
  const en = typeof getSavedLang === "function" && getSavedLang() === "en";
  let n = 0;
  rows.forEach(([page, el, vals]) => {
    const def = GRC_FICHE_DEFS[page] && GRC_FICHE_DEFS[page].elements.find((x) => x.id === el);
    const v = {};
    Object.keys(vals).forEach((k) => { v[k] = Array.isArray(vals[k]) ? vals[k][en ? 1 : 0] : vals[k]; });
    const list = grcFicheEntries(page, el);
    const created = new Date().toISOString();
    list.push(Object.assign({ id: grkId("fiche") }, def ? grcFicheCleanEntry(def, v) : v, { tpl: profile, tplAt: created, updatedAt: created, updatedBy: "" }));
    grcFicheStore(page, el).save(list);
    n++;
  });
  return n;
}

// Entrées « modèle » jamais modifiées (updatedAt === tplAt).
function _tplEntries(cb) {
  Object.keys(GRC_FICHE_DEFS).forEach((page) => GRC_FICHE_DEFS[page].elements.filter((el) => !el.kind || el.kind === "form").forEach((el) => {
    const list = grcFicheEntries(page, el.id);
    cb(page, el, list);
  }));
}

function grcTemplatesCount() {
  let n = 0;
  _tplEntries((p, el, list) => { n += list.filter((e) => e.tpl).length; });
  return n;
}

function grcTemplatesRemove() {
  let n = 0;
  _tplEntries((page, el, list) => {
    const keep = list.filter((e) => !(e.tpl && e.updatedAt === e.tplAt));
    if (keep.length !== list.length) {
      n += list.length - keep.length;
      grcFicheStore(page, el.id).save(keep);
    }
  });
  return n;
}

function grcTemplatesRender(host) {
  host.innerHTML = "";
  const p = document.createElement("p");
  p.className = "grc-fiche-hint";
  p.textContent = grcT("grc.tpl.intro");
  host.appendChild(p);
  const bar = document.createElement("div");
  bar.className = "grc-toolbar grc-tpl-bar";
  Object.keys(GRC_TEMPLATES).forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-toolbar-btn grc-tpl-apply";
    b.dataset.profile = k;
    b.textContent = grcT("grc.tpl.apply") + " — " + grcT("grc.tpl.p." + k);
    b.addEventListener("click", () => { alert(grcT("grc.tpl.applied").replace("{n}", grcTemplatesApply(k))); grcTemplatesRender(host); });
    bar.appendChild(b);
  });
  if (grcTemplatesCount()) {
    const r = document.createElement("button");
    r.type = "button";
    r.className = "grc-toolbar-btn grc-toolbar-btn-danger grc-tpl-remove";
    r.textContent = grcT("grc.tpl.remove");
    r.addEventListener("click", () => { alert(grcT("grc.tpl.removed").replace("{n}", grcTemplatesRemove())); grcTemplatesRender(host); });
    bar.appendChild(r);
  }
  host.appendChild(bar);
}
