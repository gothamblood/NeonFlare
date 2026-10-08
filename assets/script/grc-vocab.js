/* Vocabulaires partagés des champs GRC à suggestions (spec/grc-suggest/).

   Un champ texte à suggestions propose ces termes dans un <datalist>,
   mais le texte libre reste toujours permis. Quand le texte saisi
   correspond à un terme (code, libellé FR ou EN ; casse, accents et
   espaces ignorés), c'est le CODE qui est enregistré, puis affiché dans
   la langue du site ; un texte libre est enregistré et affiché tel quel.
   Les codes sont STABLES (slug FR) : ne jamais les renommer.

   Format compact : [code, libellé FR, libellé EN]. Aucun fetch(). */

const GRC_VOCAB = {
  frequence: [
    ["continue", "Continue", "Continuous"],
    ["quotidienne", "Quotidienne", "Daily"],
    ["hebdomadaire", "Hebdomadaire", "Weekly"],
    ["mensuelle", "Mensuelle", "Monthly"],
    ["trimestrielle", "Trimestrielle", "Quarterly"],
    ["semestrielle", "Semestrielle", "Half-yearly"],
    ["annuelle", "Annuelle", "Yearly"],
    ["2-ans", "Tous les 2 ans", "Every 2 years"],
    ["changement-majeur", "À chaque changement majeur", "On every major change"],
    ["demande", "À la demande", "On demand"],
  ],
  delai: [
    ["immediat", "Immédiat", "Immediate"],
    ["15-min", "15 min", "15 min"],
    ["1-h", "1 h", "1 h"],
    ["4-h", "4 h", "4 h"],
    ["8-h", "8 h", "8 h"],
    ["24-h", "24 h", "24 h"],
    ["48-h", "48 h", "48 h"],
    ["72-h", "72 h", "72 h"],
    ["5-jours-ouvrables", "5 jours ouvrables", "5 business days"],
    ["30-jours", "30 jours", "30 days"],
  ],
  duree: [
    ["6-mois", "6 mois", "6 months"],
    ["1-an", "1 an", "1 year"],
    ["2-ans", "2 ans", "2 years"],
    ["3-ans", "3 ans", "3 years"],
    ["5-ans", "5 ans", "5 years"],
    ["7-ans", "7 ans", "7 years"],
    ["10-ans", "10 ans", "10 years"],
    ["contrat-2-ans", "Durée du contrat + 2 ans", "Contract term + 2 years"],
    ["emploi-2-ans", "Durée de l’emploi + 2 ans", "Employment + 2 years"],
    ["permanente", "Permanente", "Permanent"],
    ["remplacement", "Jusqu’au remplacement", "Until superseded"],
  ],
  canal: [
    ["courriel", "Courriel", "Email"],
    ["telephone", "Téléphone", "Phone"],
    ["portail", "Portail ou billetterie", "Portal or ticketing"],
    ["en-personne", "En personne", "In person"],
    ["messagerie", "Messagerie instantanée", "Instant messaging"],
    ["alerte-masse", "Alerte de masse (SMS)", "Mass alert (SMS)"],
    ["ligne-ethique", "Ligne éthique ou anonyme", "Ethics or anonymous line"],
  ],
  classification: [
    ["public", "Public", "Public"],
    ["interne", "Interne", "Internal"],
    ["confidentiel", "Confidentiel", "Confidential"],
    ["restreint", "Restreint", "Restricted"],
  ],
  escalade: [
    ["niveau-1", "Niveau 1 — équipe TI", "Level 1 — IT team"],
    ["niveau-2", "Niveau 2 — RSSI", "Level 2 — CISO"],
    ["niveau-3", "Niveau 3 — direction", "Level 3 — management"],
    ["cellule-crise", "Cellule de crise", "Crisis unit"],
  ],
  roles: [
    ["direction", "Direction générale", "Executive management"],
    ["rssi", "RSSI", "CISO"],
    ["rprp", "Responsable de la protection des renseignements personnels (RPRP)", "Privacy officer"],
    ["responsable-ti", "Responsable TI", "IT manager"],
    ["rh", "Ressources humaines", "Human resources"],
    ["juridique", "Juridique", "Legal"],
    ["proprietaire-actif", "Propriétaire de l’actif", "Asset owner"],
    ["proprietaire-processus", "Propriétaire du processus", "Process owner"],
    ["auditeur-interne", "Auditeur interne", "Internal auditor"],
    ["comite-securite", "Comité de sécurité", "Security committee"],
    ["cellule-crise", "Cellule de crise", "Crisis unit"],
    ["rpca", "Responsable du PCA (RPCA)", "BCP manager"],
    ["risk-manager", "Gestionnaire de risques", "Risk manager"],
    ["directeur-operations", "Directeur des opérations", "Operations director"],
    ["communication", "Communication", "Communications"],
    ["msp", "Fournisseur de services gérés", "Managed service provider"],
  ],
  public: [
    ["tous", "Tous les employés", "All staff"],
    ["direction", "Direction", "Management"],
    ["gestionnaires", "Gestionnaires", "Managers"],
    ["equipe-ti", "Équipe TI", "IT team"],
    ["nouveaux", "Nouveaux employés", "New hires"],
    ["privileges", "Utilisateurs à privilèges", "Privileged users"],
    ["prestataires", "Prestataires et consultants", "Contractors and consultants"],
    ["clients", "Clients", "Customers"],
    ["medias", "Médias", "Media"],
    ["autorites", "Autorités (CAI, police…)", "Authorities (CAI, police…)"],
  ],
  partie: [
    ["clients", "Clients", "Customers"],
    ["employes", "Employés", "Employees"],
    ["direction", "Direction", "Management"],
    ["conseil", "Actionnaires ou conseil", "Shareholders or board"],
    ["fournisseurs", "Fournisseurs", "Suppliers"],
    ["regulateurs", "Organismes de réglementation (CAI…)", "Regulators (CAI…)"],
    ["assureurs", "Assureurs", "Insurers"],
    ["partenaires", "Partenaires", "Partners"],
    ["grand-public", "Grand public", "General public"],
  ],
  instance: [
    ["conseil", "Conseil d’administration", "Board of directors"],
    ["comite-direction", "Comité de direction", "Executive committee"],
    ["comite-securite", "Comité de sécurité", "Security committee"],
    ["comite-audit", "Comité d’audit", "Audit committee"],
    ["cellule-crise", "Cellule de crise", "Crisis unit"],
  ],
  "source-interne": [
    ["entrevue", "Entrevue", "Interview"],
    ["atelier", "Atelier", "Workshop"],
    ["sondage", "Sondage", "Survey"],
    ["audit", "Audit", "Audit"],
    ["document", "Document", "Document"],
    ["incident", "Incident", "Incident"],
  ],
  "source-veille": [
    ["cccs", "Centre canadien pour la cybersécurité", "Canadian Centre for Cyber Security"],
    ["cert", "CERT / avis de sécurité", "CERT / security advisories"],
    ["cai", "CAI", "CAI (Quebec)"],
    ["fournisseur", "Fournisseur", "Supplier"],
    ["association", "Association sectorielle", "Industry association"],
    ["presse", "Presse spécialisée", "Specialist press"],
  ],
  "source-detection": [
    ["siem", "SIEM", "SIEM"],
    ["edr", "EDR / antivirus", "EDR / antivirus"],
    ["ids", "IDS / IPS", "IDS / IPS"],
    ["journaux", "Journaux", "Logs"],
    ["utilisateur", "Signalement d’un utilisateur", "User report"],
    ["mssp", "Fournisseur ou MSSP", "Supplier or MSSP"],
  ],
  "type-doc": [
    ["politique", "Politique", "Policy"],
    ["procedure", "Procédure", "Procedure"],
    ["enregistrement", "Enregistrement", "Record"],
    ["rapport", "Rapport", "Report"],
    ["contrat", "Contrat", "Contract"],
    ["preuve-audit", "Preuve d’audit", "Audit evidence"],
    ["journal", "Journal", "Log"],
    ["proces-verbal", "Procès-verbal", "Minutes"],
  ],
  format: [
    ["papier", "Papier", "Paper"],
    ["electronique", "Électronique", "Electronic"],
    ["mixte", "Papier et électronique", "Paper and electronic"],
  ],
  "base-conservation": [
    ["loi", "Loi", "Law"],
    ["reglement", "Règlement", "Regulation"],
    ["contrat", "Contrat", "Contract"],
    ["norme", "Norme", "Standard"],
    ["prescription", "Prescription légale", "Statute of limitations"],
    ["affaires", "Besoin d’affaires", "Business need"],
  ],
  verification: [
    ["audit-site", "Audit sur site", "On-site audit"],
    ["soc2", "Rapport SOC 2", "SOC 2 report"],
    ["iso27001", "Certificat ISO 27001", "ISO 27001 certificate"],
    ["questionnaire", "Questionnaire", "Questionnaire"],
    ["test", "Test ou exercice", "Test or exercise"],
    ["revue-doc", "Revue documentaire", "Document review"],
    ["inspection", "Inspection", "Inspection"],
    ["controle-auto", "Contrôle automatisé", "Automated check"],
  ],
  strategie: [
    ["redondance", "Redondance", "Redundancy"],
    ["site-releve", "Site de relève", "Recovery site"],
    ["site-chaud", "Site chaud (reprise très rapide, coût élevé)", "Hot site (very fast recovery, high cost)"],
    ["site-tiede", "Site tiède (compromis coût / délai)", "Warm site (cost / time trade-off)"],
    ["site-froid", "Site froid (faible coût, reprise lente)", "Cold site (low cost, slow recovery)"],
    ["actif-actif", "Architecture actif-actif", "Active-active architecture"],
    ["actif-passif", "Architecture actif-passif", "Active-passive architecture"],
    ["replication", "Réplication des données", "Data replication"],
    ["distance", "Travail à distance", "Remote work"],
    ["mode-degrade", "Mode dégradé ou manuel", "Degraded or manual mode"],
    ["sous-traitance", "Sous-traitance", "Outsourcing"],
    ["stock", "Stock de sécurité", "Safety stock"],
    ["accord-reciproque", "Accord réciproque", "Reciprocal agreement"],
    ["assurance", "Assurance", "Insurance"],
  ],
  // Options de secours des dépendances techniques (Continuité).
  continuiteTech: [
    ["renvoi-appel", "Renvoi automatique des appels vers les cellulaires (chez l’opérateur)", "Automatic call forwarding to mobiles (carrier-side)"],
    ["standard-heberge", "Standard automatisé hébergé", "Hosted automated switchboard"],
    ["softphone", "Softphone (application mobile rattachée au système)", "Softphone (mobile app tied to the system)"],
    ["ligne-analogique", "Ligne analogique de secours", "Backup analog line"],
    ["imprimer-ailleurs", "Imprimer ailleurs (commerce, autre bureau, confrère)", "Print elsewhere (shop, other office, peer)"],
    ["retour-arriere", "Retour arrière de la mise à jour (déploiement par vagues)", "Roll back the update (staged deployment)"],
    ["bureau-virtuel", "Bureau virtuel (aucune donnée sur l’appareil)", "Virtual desktop (no data on the device)"],
    ["fournisseur-alternatif", "Fournisseur alternatif sous contrat", "Alternate supplier under contract"],
    ["mode-manuel", "Mode manuel / papier", "Manual / paper mode"],
  ],
  exercice: [
    ["ttx", "Exercice sur table (TTX)", "Tabletop exercise (TTX)"],
    ["pas-a-pas", "Revue pas à pas", "Walkthrough"],
    ["simulation", "Simulation", "Simulation"],
    ["test-restauration", "Test technique de restauration", "Technical restore test"],
    ["bascule", "Bascule réelle", "Live failover"],
    ["grandeur-nature", "Exercice grandeur nature", "Full-scale exercise"],
  ],
  validation: [
    ["test-fonctionnel", "Test fonctionnel", "Functional test"],
    ["integrite", "Contrôle d’intégrité des données", "Data integrity check"],
    ["rapprochement", "Rapprochement avec la source", "Reconciliation with the source"],
    ["metier", "Validation par les utilisateurs métier", "Business user sign-off"],
  ],
  destruction: [
    ["effacement", "Effacement sécurisé (NIST SP 800-88)", "Secure erasure (NIST SP 800-88)"],
    ["crypto", "Effacement cryptographique", "Cryptographic erasure"],
    ["dechiquetage", "Déchiquetage", "Shredding"],
    ["demagnetisation", "Démagnétisation", "Degaussing"],
    ["tiers-certifie", "Destruction physique par un tiers certifié", "Physical destruction by a certified provider"],
  ],
  menace: [
    ["incendie", "Incendie", "Fire"],
    ["eau", "Inondation ou dégât d’eau", "Flood or water damage"],
    ["electricite", "Panne électrique", "Power outage"],
    ["chaleur", "Chaleur ou climatisation", "Heat or air conditioning"],
    ["seisme", "Séisme", "Earthquake"],
    ["intrusion", "Intrusion", "Intrusion"],
    ["vol", "Vol", "Theft"],
    ["vandalisme", "Vandalisme", "Vandalism"],
  ],
  surveillance: [
    ["cameras", "Caméras", "Cameras"],
    ["alarme", "Alarme", "Alarm"],
    ["gardiennage", "Gardiennage", "Security guards"],
    ["journal-acces", "Journal du contrôle d’accès", "Access control log"],
    ["detecteur", "Détecteur de mouvement", "Motion detector"],
  ],
  "indicateur-sla": [
    ["disponibilite", "Disponibilité", "Availability"],
    ["delai-reponse", "Délai de réponse", "Response time"],
    ["delai-resolution", "Délai de résolution", "Resolution time"],
    ["rto", "RTO", "RTO"],
    ["rpo", "RPO", "RPO"],
    ["notification", "Délai de notification d’incident", "Incident notification time"],
  ],
  sensibilisation: [
    ["accueil", "Formation d’accueil", "Onboarding training"],
    ["capsule", "Capsule en ligne", "E-learning module"],
    ["hameconnage", "Simulation d’hameçonnage", "Phishing simulation"],
    ["atelier", "Atelier", "Workshop"],
    ["affichage", "Affichage ou infolettre", "Posters or newsletter"],
    ["rappel-annuel", "Rappel annuel", "Annual refresher"],
  ],
  disciplinaire: [
    ["verbal", "Avertissement verbal", "Verbal warning"],
    ["ecrit", "Avertissement écrit", "Written warning"],
    ["suspension", "Suspension", "Suspension"],
    ["congediement", "Congédiement", "Dismissal"],
  ],
  depart: [
    ["retrait-acces", "Retrait des accès", "Access removal"],
    ["restitution", "Restitution des actifs", "Return of assets"],
    ["rappel-obligations", "Rappel des obligations", "Reminder of obligations"],
    ["entrevue-depart", "Entrevue de départ", "Exit interview"],
  ],
  signataires: [
    ["employe", "Employé", "Employee"],
    ["gestionnaire", "Gestionnaire", "Manager"],
    ["rh", "Ressources humaines", "Human resources"],
    ["prestataire", "Prestataire", "Contractor"],
  ],
};

// Clé de comparaison : casse, accents, apostrophes et espaces ignorés.
function _grcVocabNorm(s) {
  return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

const _GRC_VOCAB_INDEX = {};

function _grcVocabIndex(name) {
  if (_GRC_VOCAB_INDEX[name]) return _GRC_VOCAB_INDEX[name];
  const idx = {};
  (GRC_VOCAB[name] || []).forEach((t) => {
    [t[0], t[1], t[2]].forEach((s) => {
      const k = _grcVocabNorm(s);
      if (k && !(k in idx)) idx[k] = t;
    });
  });
  _GRC_VOCAB_INDEX[name] = idx;
  return idx;
}

// Terme [code, fr, en] correspondant à un code ou à un libellé, sinon null.
function grcVocabMatch(name, text) {
  if (!name || text == null || text === "") return null;
  return _grcVocabIndex(name)[_grcVocabNorm(text)] || null;
}

// Valeur à enregistrer : le code si le texte est un terme, sinon le texte.
function grcVocabEncode(name, text) {
  const t = grcVocabMatch(name, text);
  return t ? t[0] : (text == null ? "" : String(text));
}

// Valeur à afficher : le libellé dans la langue du site si c'est un terme
// (code ou libellé d'une autre langue), sinon le texte tel quel.
function grcVocabDisplay(name, v) {
  const t = grcVocabMatch(name, v);
  if (!t) return v == null ? "" : String(v);
  const en = typeof getSavedLang === "function" && getSavedLang() === "en";
  return en ? t[2] : t[1];
}

// Libellés proposés dans la langue du site.
function grcVocabLabels(name) {
  const en = typeof getSavedLang === "function" && getSavedLang() === "en";
  return (GRC_VOCAB[name] || []).map((t) => (en ? t[2] : t[1]));
}
