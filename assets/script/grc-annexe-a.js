/* Catalogue des contrôles de l'Annexe A d'ISO/IEC 27001:2022
   (spec/grc-normes/ N1). Données en lecture seule.

   - 93 contrôles : 37 organisationnels (5.x), 8 liés aux personnes (6.x),
     14 physiques (7.x), 34 technologiques (8.x).
   - Libellés COURTS REFORMULÉS en FR / EN (décision E1) : ce ne sont pas
     les titres ni le texte de la norme ; la référence (A.x.y) renvoie à la
     norme elle-même, à consulter pour le détail.
   - Attributs au sens d'ISO/IEC 27002:2022 (type de contrôle, propriétés,
     concepts de cybersécurité, capacité opérationnelle, domaines) :
     SAISIS AU MIEUX, À VALIDER contre ISO/IEC 27002:2022 avant tout usage
     formel (voir spec/grc-normes/plan.md §4). Ils servent au filtrage et
     à repérer les manques, pas de référence opposable.

   Codes : t  = P préventif · D détectif · C correctif
           p  = C confidentialité · I intégrité · A disponibilité
           c  = Id Identifier · Pr Protéger · De Détecter · Re Répondre · Rc Rétablir
           cap = capacité opérationnelle (voir GRC_ANNEX_CAPABILITIES)
           d  = G Gouvernance et écosystème · P Protection · D Défense · R Résilience */

const GRC_ANNEX_VERSION = "ISO/IEC 27001:2022";

const GRC_ANNEX_THEMES = {
  "5": { fr: "Organisationnels", en: "Organizational" },
  "6": { fr: "Liés aux personnes", en: "People" },
  "7": { fr: "Physiques", en: "Physical" },
  "8": { fr: "Technologiques", en: "Technological" },
};

const GRC_ANNEX_CAPABILITIES = {
  gov: { fr: "Gouvernance", en: "Governance" },
  asset: { fr: "Gestion des actifs", en: "Asset management" },
  infoprot: { fr: "Protection de l’information", en: "Information protection" },
  hr: { fr: "Sécurité des ressources humaines", en: "Human resource security" },
  phys: { fr: "Sécurité physique", en: "Physical security" },
  sysnet: { fr: "Sécurité des systèmes et réseaux", en: "System and network security" },
  app: { fr: "Sécurité applicative", en: "Application security" },
  config: { fr: "Configuration sécurisée", en: "Secure configuration" },
  iam: { fr: "Identités et accès", en: "Identity and access management" },
  threat: { fr: "Menaces et vulnérabilités", en: "Threat and vulnerability management" },
  cont: { fr: "Continuité", en: "Continuity" },
  supplier: { fr: "Relations fournisseurs", en: "Supplier relationships security" },
  legal: { fr: "Légal et conformité", en: "Legal and compliance" },
  event: { fr: "Gestion des événements de sécurité", en: "Information security event management" },
  assur: { fr: "Assurance de la sécurité", en: "Information security assurance" },
};

const GRC_ANNEX_CONCEPTS = {
  Id: { fr: "Identifier", en: "Identify" }, Pr: { fr: "Protéger", en: "Protect" },
  De: { fr: "Détecter", en: "Detect" }, Re: { fr: "Répondre", en: "Respond" }, Rc: { fr: "Rétablir", en: "Recover" },
};
const GRC_ANNEX_TYPES = { P: { fr: "Préventif", en: "Preventive" }, D: { fr: "Détectif", en: "Detective" }, C: { fr: "Correctif", en: "Corrective" } };
const GRC_ANNEX_DOMAINS = {
  G: { fr: "Gouvernance et écosystème", en: "Governance and ecosystem" }, P: { fr: "Protection", en: "Protection" },
  D: { fr: "Défense", en: "Defence" }, R: { fr: "Résilience", en: "Resilience" },
};

// [id, fr, en, t, p, c, cap, d]
const _GRC_ANNEX_ROWS = [
  ["5.1", "Politiques de sécurité de l’information", "Information security policies", "P", "CIA", "Id", "gov", "G R"],
  ["5.2", "Rôles et responsabilités en sécurité", "Security roles and responsibilities", "P", "CIA", "Id", "gov", "G P R"],
  ["5.3", "Séparation des tâches incompatibles", "Segregation of conflicting duties", "P", "CIA", "Pr", "gov iam", "G"],
  ["5.4", "Engagement de la direction envers la sécurité", "Management commitment to security", "P", "CIA", "Id", "gov", "G"],
  ["5.5", "Relations avec les autorités", "Relations with authorities", "P C", "CIA", "Id Pr Re Rc", "gov", "D R"],
  ["5.6", "Relations avec les groupes d’intérêt", "Relations with special interest groups", "P C", "CIA", "Pr Re Rc", "gov", "D"],
  ["5.7", "Renseignement sur les menaces", "Threat intelligence", "P D C", "CIA", "Id De Re", "threat", "D R"],
  ["5.8", "Sécurité dans la gestion de projet", "Security in project management", "P", "CIA", "Id Pr", "gov", "G P"],
  ["5.9", "Inventaire des informations et actifs associés", "Inventory of information and associated assets", "P", "CIA", "Id", "asset", "G P"],
  ["5.10", "Utilisation acceptable des actifs", "Acceptable use of assets", "P", "CIA", "Pr", "asset infoprot", "G P"],
  ["5.11", "Restitution des actifs", "Return of assets", "P", "CIA", "Pr", "asset", "P"],
  ["5.12", "Classification de l’information", "Information classification", "P", "CIA", "Id", "infoprot", "P D"],
  ["5.13", "Marquage de l’information", "Information labelling", "P", "CIA", "Pr", "infoprot", "D P"],
  ["5.14", "Transfert de l’information", "Information transfer", "P", "CIA", "Pr", "asset infoprot", "P"],
  ["5.15", "Règles de contrôle d’accès", "Access control rules", "P", "CIA", "Pr", "iam", "P"],
  ["5.16", "Gestion des identités", "Identity management", "P", "CIA", "Pr", "iam", "P"],
  ["5.17", "Informations d’authentification", "Authentication information", "P", "CIA", "Pr", "iam", "P"],
  ["5.18", "Droits d’accès", "Access rights", "P", "CIA", "Pr", "iam", "P"],
  ["5.19", "Sécurité dans les relations avec les fournisseurs", "Security in supplier relationships", "P", "CIA", "Id", "supplier", "G P"],
  ["5.20", "Sécurité dans les contrats fournisseurs", "Security in supplier agreements", "P", "CIA", "Id", "supplier", "G P"],
  ["5.21", "Sécurité de la chaîne d’approvisionnement TIC", "ICT supply chain security", "P", "CIA", "Id", "supplier", "G P"],
  ["5.22", "Surveillance et changements des services fournisseurs", "Monitoring and change of supplier services", "P", "CIA", "Id", "supplier assur", "G P D"],
  ["5.23", "Sécurité des services infonuagiques", "Security of cloud services", "P", "CIA", "Pr", "supplier", "G P"],
  ["5.24", "Préparation à la gestion des incidents", "Incident management planning and preparation", "C", "CIA", "Re Rc", "gov event", "D"],
  ["5.25", "Évaluation des événements de sécurité", "Assessment of security events", "D", "CIA", "De Re", "event", "D"],
  ["5.26", "Réponse aux incidents de sécurité", "Response to security incidents", "C", "CIA", "Re Rc", "event", "D"],
  ["5.27", "Tirer les leçons des incidents", "Learning from incidents", "P", "CIA", "Id Pr", "event", "D"],
  ["5.28", "Collecte des preuves", "Collection of evidence", "C", "CIA", "De Re", "event", "D"],
  ["5.29", "Sécurité pendant une perturbation", "Security during disruption", "P C", "CIA", "Pr Re", "cont", "P R"],
  ["5.30", "Préparation des TIC à la continuité", "ICT readiness for business continuity", "C", "A", "Re", "cont", "R"],
  ["5.31", "Exigences légales, réglementaires et contractuelles", "Legal, regulatory and contractual requirements", "P", "CIA", "Id", "legal", "G P"],
  ["5.32", "Droits de propriété intellectuelle", "Intellectual property rights", "P", "CIA", "Id", "legal", "G"],
  ["5.33", "Protection des enregistrements", "Protection of records", "P", "CIA", "Id Pr", "legal asset infoprot", "D"],
  ["5.34", "Vie privée et renseignements personnels", "Privacy and personal information", "P", "CIA", "Id Pr", "infoprot legal", "P"],
  ["5.35", "Revue indépendante de la sécurité", "Independent security review", "P C", "CIA", "Id Pr", "assur", "G"],
  ["5.36", "Conformité aux politiques et normes de sécurité", "Compliance with security policies and standards", "P", "CIA", "Id Pr", "legal assur", "G"],
  ["5.37", "Procédures d’exploitation documentées", "Documented operating procedures", "P C", "CIA", "Pr Rc", "asset phys sysnet app config iam threat cont event", "G P D"],
  ["6.1", "Vérification avant embauche", "Pre-employment screening", "P", "CIA", "Pr", "hr", "G"],
  ["6.2", "Conditions d’emploi", "Terms and conditions of employment", "P", "CIA", "Pr", "hr", "G"],
  ["6.3", "Sensibilisation, formation et éducation", "Awareness, education and training", "P", "CIA", "Pr", "hr", "G"],
  ["6.4", "Processus disciplinaire", "Disciplinary process", "P C", "CIA", "Pr Re", "hr", "G"],
  ["6.5", "Responsabilités après le départ ou le changement de poste", "Responsibilities after leaving or changing job", "P", "CIA", "Pr", "hr asset", "G"],
  ["6.6", "Ententes de confidentialité", "Confidentiality agreements", "P", "C", "Pr", "hr infoprot supplier", "G"],
  ["6.7", "Télétravail", "Remote working", "P", "CIA", "Pr", "asset infoprot phys sysnet", "P"],
  ["6.8", "Signalement des événements de sécurité", "Reporting security events", "D", "CIA", "De", "event", "D"],
  ["7.1", "Périmètres de sécurité physique", "Physical security perimeters", "P", "CIA", "Pr", "phys", "P"],
  ["7.2", "Accès physique", "Physical entry", "P", "CIA", "Pr", "phys iam", "P"],
  ["7.3", "Sécurisation des bureaux, salles et installations", "Securing offices, rooms and facilities", "P", "CIA", "Pr", "phys asset", "P"],
  ["7.4", "Surveillance de la sécurité physique", "Physical security monitoring", "P D", "CIA", "Pr De", "phys", "P D"],
  ["7.5", "Protection contre les menaces physiques et environnementales", "Protection against physical and environmental threats", "P", "CIA", "Pr", "phys", "P"],
  ["7.6", "Travail dans les zones sécurisées", "Working in secure areas", "P", "CIA", "Pr", "phys", "P"],
  ["7.7", "Bureau propre et écran verrouillé", "Clear desk and clear screen", "P", "C", "Pr", "phys", "P"],
  ["7.8", "Emplacement et protection des équipements", "Equipment siting and protection", "P", "CIA", "Pr", "phys asset", "P"],
  ["7.9", "Sécurité des actifs hors des locaux", "Security of off-premises assets", "P", "CIA", "Pr", "phys asset", "P"],
  ["7.10", "Supports de stockage", "Storage media", "P", "CIA", "Pr", "phys asset", "P"],
  ["7.11", "Services de soutien (énergie, climatisation…)", "Supporting utilities", "P D", "IA", "Pr De", "phys", "P"],
  ["7.12", "Sécurité du câblage", "Cabling security", "P", "CA", "Pr", "phys", "P"],
  ["7.13", "Maintenance des équipements", "Equipment maintenance", "P", "CIA", "Pr", "phys asset", "P R"],
  ["7.14", "Mise au rebut ou réutilisation sécurisée des équipements", "Secure disposal or reuse of equipment", "P", "C", "Pr", "phys asset", "P"],
  ["8.1", "Postes et appareils des utilisateurs", "User endpoint devices", "P", "CIA", "Pr", "asset infoprot", "P"],
  ["8.2", "Droits d’accès privilégiés", "Privileged access rights", "P", "CIA", "Pr", "iam", "P"],
  ["8.3", "Restriction de l’accès à l’information", "Information access restriction", "P", "CIA", "Pr", "iam", "P"],
  ["8.4", "Accès au code source", "Access to source code", "P", "CIA", "Pr", "iam app config", "P"],
  ["8.5", "Authentification sécurisée", "Secure authentication", "P", "CIA", "Pr", "iam", "P"],
  ["8.6", "Gestion de la capacité", "Capacity management", "P D", "IA", "Id Pr De", "cont", "G P"],
  ["8.7", "Protection contre les maliciels", "Protection against malware", "P D C", "CIA", "Pr De", "sysnet infoprot", "P D"],
  ["8.8", "Gestion des vulnérabilités techniques", "Technical vulnerability management", "P", "CIA", "Id Pr", "threat", "G P D"],
  ["8.9", "Gestion de la configuration", "Configuration management", "P", "CIA", "Pr", "config", "P"],
  ["8.10", "Suppression de l’information", "Information deletion", "P", "C", "Pr", "infoprot legal", "P"],
  ["8.11", "Masquage des données", "Data masking", "P", "C", "Pr", "infoprot", "P"],
  ["8.12", "Prévention des fuites de données", "Data leakage prevention", "P D", "C", "Pr De", "infoprot", "P D"],
  ["8.13", "Sauvegarde de l’information", "Information backup", "C", "IA", "Rc", "cont", "P"],
  ["8.14", "Redondance des installations de traitement", "Redundancy of processing facilities", "P", "A", "Pr", "cont asset", "P R"],
  ["8.15", "Journalisation", "Logging", "D", "CIA", "De", "event", "P D"],
  ["8.16", "Activités de surveillance", "Monitoring activities", "D C", "CIA", "De Re", "event", "D"],
  ["8.17", "Synchronisation des horloges", "Clock synchronization", "D", "I", "Pr De", "event", "P D"],
  ["8.18", "Utilitaires à privilèges", "Privileged utility programs", "P", "CIA", "Pr", "sysnet config app", "P"],
  ["8.19", "Installation de logiciels sur les systèmes en exploitation", "Software installation on operational systems", "P", "CIA", "Pr", "config app", "P"],
  ["8.20", "Sécurité des réseaux", "Network security", "P D", "CIA", "Pr De", "sysnet", "P"],
  ["8.21", "Sécurité des services réseau", "Security of network services", "P", "CIA", "Pr", "sysnet", "P"],
  ["8.22", "Cloisonnement des réseaux", "Network segregation", "P", "CIA", "Pr", "sysnet", "P"],
  ["8.23", "Filtrage web", "Web filtering", "P", "CIA", "Pr", "sysnet", "P"],
  ["8.24", "Utilisation de la cryptographie", "Use of cryptography", "P", "CIA", "Pr", "config", "P"],
  ["8.25", "Cycle de développement sécurisé", "Secure development life cycle", "P", "CIA", "Pr", "app sysnet", "P"],
  ["8.26", "Exigences de sécurité applicative", "Application security requirements", "P", "CIA", "Pr", "app sysnet", "P D"],
  ["8.27", "Principes d’architecture et d’ingénierie sécurisées", "Secure architecture and engineering principles", "P", "CIA", "Pr", "app sysnet", "P"],
  ["8.28", "Codage sécurisé", "Secure coding", "P", "CIA", "Pr", "app sysnet", "P"],
  ["8.29", "Tests de sécurité en développement et à la recette", "Security testing in development and acceptance", "P", "CIA", "Id", "app assur sysnet", "P"],
  ["8.30", "Développement externalisé", "Outsourced development", "P D", "CIA", "Id Pr De", "sysnet app supplier", "G P"],
  ["8.31", "Séparation des environnements de développement, test et production", "Separation of development, test and production", "P", "CIA", "Pr", "app sysnet", "P"],
  ["8.32", "Gestion des changements", "Change management", "P", "CIA", "Pr", "app sysnet", "P"],
  ["8.33", "Données de test", "Test information", "P", "CI", "Pr", "infoprot", "P"],
  ["8.34", "Protection des systèmes pendant les tests d’audit", "Protection of systems during audit testing", "P", "CIA", "Pr", "sysnet infoprot", "G P"],
];

const GRC_ANNEX_A = _GRC_ANNEX_ROWS.map((r) => ({
  id: "A." + r[0],
  ref: r[0],
  theme: r[0].split(".")[0],
  label: { fr: r[1], en: r[2] },
  attrs: {
    types: r[3].split(" "),
    props: r[4].split(""),
    concepts: r[5].split(" "),
    capabilities: r[6].split(" "),
    domains: r[7].split(" "),
  },
}));

function grcAnnexLabel(id) {
  const c = GRC_ANNEX_A.find((x) => x.id === id || x.ref === id);
  if (!c) return id || "";
  const en = typeof getSavedLang === "function" && getSavedLang() === "en";
  return c.id + " — " + (en ? c.label.en : c.label.fr);
}

// Référence libre ("A.8.5", "8.5", "ISO A.5.15 · …") -> identifiants du
// catalogue reconnus dans le texte (rapprochement assisté, chaine.md §5).
function grcAnnexMatch(text) {
  const out = [];
  String(text || "").replace(/(?:A\.)?\b([5-8])\.(\d{1,2})\b/g, (m, a, b) => {
    const id = "A." + a + "." + Number(b);
    if (GRC_ANNEX_A.some((c) => c.id === id) && out.indexOf(id) === -1) out.push(id);
    return m;
  });
  return out;
}
