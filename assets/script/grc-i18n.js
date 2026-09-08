/* Traductions de la section GRC -- séparé de assets/script/i18n.js pour
   garder ce fichier-là focalisé sur la coquille du site (menu, Settings,
   onboarding). Fusionné dans le même I18N_DICT / applyI18n() (voir
   i18n.js), juste namespacé sous "grc.*". Chargé sur chaque page
   chaque page du dossier grc (les domaines et leurs 4 sous-sections
   sécurité), après i18n.js.

   Deux familles de clés :
   - grc.common.*  : texte répété tel quel sur (presque) chaque page --
     boutons Modifier/Supprimer/Enregistrer/Annuler, les intitulés
     "Contenu à inclure"/"Rôle en GRC", les liens de retour, les alertes
     coffre-verrouillé/popup-bloquée. Une seule entrée au lieu de la
     dupliquer sur 58 pages et 4 registres.
   - grc.<slug>.*  : contenu propre à une page (titre, sous-titre,
     libellés de formulaire, options, en-têtes de tableau PDF). <slug>
     est le nom de fichier sans .html (ex. "actifs").

   grcT(key) mirrors onbT() dans onboarding-wizard.js -- lit I18N_DICT
   directement, pour tout le HTML généré dynamiquement par les registres
   (boutons, badges, en-têtes de rapport PDF) que le scan DOM
   d'applyI18n() n'atteint jamais. */

function grcT(key) {
  const entry = I18N_DICT[key];
  return (entry && entry[getSavedLang()]) || (entry && entry.fr) || key;
}

Object.assign(I18N_DICT, {
  // -- Navigation / retour --------------------------------------------
  "grc.common.backToGrc": { fr: "← Retour au GRC", en: "← Back to GRC" },
  "grc.common.backToReseau": { fr: "← Retour à Sécurité Réseau", en: "← Back to Network Security" },
  "grc.common.backToApi": { fr: "← Retour à Sécurité API", en: "← Back to API Security" },
  "grc.common.backToWebapp": { fr: "← Retour à Sécurité WebApp", en: "← Back to WebApp Security" },
  "grc.common.backToDatabase": { fr: "← Retour à Sécurité base de données", en: "← Back to Database Security" },

  // -- Structure de page commune (checklist "Contenu à inclure") ------
  "grc.common.contentInclude": { fr: "Contenu à inclure", en: "Content to include" },
  "grc.common.roleTitle": { fr: "Rôle en GRC", en: "Role in GRC" },
  "grc.common.notesTitle": { fr: "Notes", en: "Notes" },
  "grc.common.notesPlaceholder": { fr: "Vos notes sur ce domaine…", en: "Your notes on this domain…" },
  "grc.common.notVisited": { fr: "Pas encore consulté", en: "Not visited yet" },
  "grc.common.hasNotes": { fr: "Ce domaine a des notes", en: "This domain has notes" },
  "grc.common.checkedCount": { fr: "{done} / {total} cochés", en: "{done} / {total} checked" },
  "grc.common.modifiedBy": { fr: "Modifié par {by} le {date}", en: "Modified by {by} on {date}" },
  "grc.common.modifiedByAnonymous": { fr: "anonyme", en: "anonymous" },
  "grc.common.lastModifiedAnonymous": { fr: "Dernière modification : {date} (anonyme)", en: "Last modified: {date} (anonymous)" },
  "grc.common.lastModifiedBy": { fr: "Dernière modification : {date} par {by}", en: "Last modified: {date} by {by}" },

  // -- Boutons/formulaires partagés par les 4 registres ----------------
  "grc.common.btnEdit": { fr: "Modifier", en: "Edit" },
  "grc.common.btnDelete": { fr: "Supprimer", en: "Delete" },
  "grc.common.btnSave": { fr: "Enregistrer", en: "Save" },
  "grc.common.btnCancel": { fr: "Annuler", en: "Cancel" },
  "grc.common.btnExport": { fr: "⬇ Exporter", en: "⬇ Export" },
  "grc.common.btnExportPdf": { fr: "⬇ Export PDF", en: "⬇ Export PDF" },
  "grc.common.btnImport": { fr: "⬆ Importer", en: "⬆ Import" },
  "grc.common.confirmDelete": { fr: "Supprimer \"{name}\" ?", en: "Delete \"{name}\"?" },
  "grc.common.invalidJsonFile": { fr: "Fichier JSON invalide.", en: "Invalid JSON file." },
  "grc.common.owner": { fr: "Propriétaire", en: "Owner" },

  // -- Alertes coffre-fort / popup / erreurs de rapport ----------------
  "grc.common.vaultLockedExport": {
    fr: "Coffre verrouillé — déverrouille le chiffrement (Paramètres ▸ Chiffrement) avant d'exporter.",
    en: "Vault locked — unlock encryption (Settings ▸ Encryption) before exporting."
  },
  "grc.common.vaultLockedImport": {
    fr: "Coffre verrouillé — déverrouille le chiffrement (Paramètres ▸ Chiffrement) avant d'importer.",
    en: "Vault locked — unlock encryption (Settings ▸ Encryption) before importing."
  },
  "grc.common.popupBlocked": {
    fr: "Le navigateur a bloqué l'ouverture d'un nouvel onglet pour l'export PDF -- autorise les pop-ups pour ce site et réessaie.",
    en: "Your browser blocked the new tab for the PDF export -- allow pop-ups for this site and try again."
  },
  "grc.common.filenamePrompt": { fr: "Nom du fichier :", en: "File name:" },
  "grc.common.cannotReadFile": { fr: "Impossible de lire le fichier.", en: "Unable to read the file." },
  "grc.common.notValidJson": { fr: "Ce fichier n'est pas un JSON valide.", en: "This file is not valid JSON." },
  "grc.common.cannotDecrypt": { fr: "Impossible de déchiffrer ce fichier.", en: "Unable to decrypt this file." },
  "grc.common.unexpectedFormat": { fr: "Format inattendu -- ce n'est pas un export GRC.", en: "Unexpected format -- this isn't a GRC export." },
  "grc.common.generatedOn": { fr: "Généré le", en: "Generated on" },
  "grc.common.fullReportTitle": { fr: "Rapport GRC", en: "GRC report" },
  "grc.common.notVisitedSentence": { fr: "Pas encore consulté.", en: "Not visited yet." },
  "grc.common.coverage": { fr: "Couverture : {done} / {total} ({pct}%)", en: "Coverage: {done} / {total} ({pct}%)" },
  "grc.common.notesLabel": { fr: "Notes :", en: "Notes:" },

  // ===================== Hub principal (grc/index.html) ===============
  "grc.hub.title": { fr: "Gouvernance, Risques & Conformité", en: "Governance, Risk & Compliance" },
  "grc.hub.subtitle": {
    fr: "Le système de management de la sécurité de l'information, organisé en 20 domaines : de la gouvernance et l'analyse des risques jusqu'à l'IAM, le cloud et le DevSecOps.",
    en: "The information security management system, organized into 20 domains: from governance and risk analysis to IAM, cloud and DevSecOps."
  },
  "grc.hub.exportJson": { fr: "Exporter JSON", en: "Export JSON" },
  "grc.hub.saveAs": { fr: "Enregistrer sous…", en: "Save as…" },
  "grc.hub.exportWord": { fr: "Exporter Word", en: "Export Word" },
  "grc.hub.exportPdf": { fr: "Exporter PDF", en: "Export PDF" },
  "grc.hub.importJson": { fr: "Importer JSON", en: "Import JSON" },
  "grc.hub.reset": { fr: "Réinitialiser", en: "Reset" },
  "grc.hub.confirmReset": {
    fr: "Effacer toutes les cases cochées et toutes les notes, sur les 5 sections GRC ? Cette action est irréversible.",
    en: "Clear every checked box and note, across all 5 GRC sections? This action is irreversible."
  },
  "grc.hub.confirmImport": {
    fr: "Importer ce fichier remplacera toutes les cases cochées et notes actuelles sur les 5 sections GRC. Continuer ?",
    en: "Importing this file will replace every currently checked box and note across the 5 GRC sections. Continue?"
  },
  "grc.hub.importRestoredCount": { fr: "{count} domaine(s) restauré(s) depuis le fichier.", en: "{count} domain(s) restored from the file." },
  "grc.hub.importFailed": { fr: "Import impossible : {message}", en: "Import failed: {message}" },
  "grc.hub.confirmResetSection": {
    fr: "Effacer toutes les cases cochées et toutes les notes de cette section ? Cette action est irréversible.",
    en: "Clear every checked box and note in this section? This action is irreversible."
  },
  "grc.hub.confirmImportSection": {
    fr: "Importer ce fichier remplacera toutes les cases cochées et notes actuelles de cette section. Continuer ?",
    en: "Importing this file will replace every currently checked box and note in this section. Continue?"
  },

  // -- Cartes du hub principal (grc/index.html, grc-loader.js) ---------
  "grc.actifs.hubCard.title": { fr: "Actifs", en: "Assets" },
  "grc.actifs.hubCard.desc": {
    fr: "Inventaire et classification des actifs informationnels et de leurs propriétaires.",
    en: "Inventory and classification of information assets and their owners."
  },
  "grc.analyse-risques.hubCard.title": { fr: "Analyse des risques", en: "Risk analysis" },
  "grc.analyse-risques.hubCard.desc": {
    fr: "Identification, évaluation et priorisation des risques liés aux actifs et processus.",
    en: "Identification, assessment and prioritization of risks tied to assets and processes."
  },
  "grc.controles.hubCard.title": { fr: "Contrôles", en: "Controls" },
  "grc.controles.hubCard.desc": {
    fr: "Mesures de sécurité mises en œuvre et leur correspondance avec les référentiels (ISO 27001, NIST, CIS).",
    en: "Security measures in place and how they map to frameworks (ISO 27001, NIST, CIS)."
  },
  "grc.incidents.hubCard.title": { fr: "Incidents", en: "Incidents" },
  "grc.incidents.hubCard.desc": {
    fr: "Processus de détection, réponse et suivi des incidents de sécurité.",
    en: "Detection, response and follow-up process for security incidents."
  },

  // ===================== Actifs (grc/actifs.html) =====================
  "grc.actifs.title": { fr: "Inventaire et classification des actifs", en: "Asset inventory and classification" },
  "grc.actifs.subtitle": { fr: "Cette section identifie ce qui doit être protégé et à quel niveau.", en: "This section identifies what must be protected, and at what level." },
  "grc.actifs.registryTitle": { fr: "Registre des actifs", en: "Asset registry" },
  "grc.actifs.item1.label": { fr: "Méthodologie", en: "Methodology" },
  "grc.actifs.item1.desc": { fr: "ISO 27001/27002/27005.", en: "ISO 27001/27002/27005." },
  "grc.actifs.item2.label": { fr: "Types d’actifs", en: "Asset types" },
  "grc.actifs.item2.desc": { fr: "physiques, logiciels, données, humains, réseau.", en: "physical, software, data, people, network." },
  "grc.actifs.item3.label": { fr: "Classification CIA", en: "CIA classification" },
  "grc.actifs.item3.desc": { fr: "confidentialité, intégrité, disponibilité (1–3).", en: "confidentiality, integrity, availability (1–3)." },
  "grc.actifs.item4.label": { fr: "Criticité globale", en: "Overall criticality" },
  "grc.actifs.item4.desc": { fr: "importance de l’actif pour l’organisation.", en: "how important the asset is to the organization." },
  "grc.actifs.item5.label": { fr: "Actifs primaires vs support", en: "Primary vs. supporting assets" },
  "grc.actifs.item6.label": { fr: "Dépendances", en: "Dependencies" },
  "grc.actifs.item6.desc": { fr: "liens entre actifs.", en: "links between assets." },
  "grc.actifs.role": { fr: "L’inventaire est la base de l’analyse des risques : on ne peut protéger que ce qu’on connaît.", en: "The inventory is the foundation of risk analysis: you can only protect what you know about." },

  "grc.actifs.form.title": { fr: "Ajouter un actif", en: "Add an asset" },
  "grc.actifs.form.titleEdit": { fr: "Modifier l'actif", en: "Edit asset" },
  "grc.actifs.form.addBtn": { fr: "+ Ajouter un actif", en: "+ Add an asset" },
  "grc.actifs.form.name": { fr: "Nom", en: "Name" },
  "grc.actifs.form.type": { fr: "Type", en: "Type" },
  "grc.actifs.form.confidentiality": { fr: "Confidentialité (1-3)", en: "Confidentiality (1-3)" },
  "grc.actifs.form.integrity": { fr: "Intégrité (1-3)", en: "Integrity (1-3)" },
  "grc.actifs.form.availability": { fr: "Disponibilité (1-3)", en: "Availability (1-3)" },
  "grc.actifs.form.role": { fr: "Rôle", en: "Role" },
  "grc.actifs.form.rolePrimary": { fr: "Primaire", en: "Primary" },
  "grc.actifs.form.roleSupport": { fr: "Support", en: "Supporting" },
  "grc.actifs.form.owner": { fr: "Propriétaire", en: "Owner" },
  "grc.actifs.form.nextReview": { fr: "Prochaine revue", en: "Next review" },
  "grc.actifs.form.dependsOn": { fr: "Dépendances (autres actifs)", en: "Dependencies (other assets)" },
  "grc.actifs.form.notes": { fr: "Notes", en: "Notes" },

  "grc.actifs.type.physique": { fr: "Physique", en: "Physical" },
  "grc.actifs.type.logiciel": { fr: "Logiciel", en: "Software" },
  "grc.actifs.type.donnee": { fr: "Donnée", en: "Data" },
  "grc.actifs.type.humain": { fr: "Humain", en: "People" },
  "grc.actifs.type.reseau": { fr: "Réseau", en: "Network" },

  "grc.actifs.crit.high": { fr: "Élevée", en: "High" },
  "grc.actifs.crit.medium": { fr: "Moyenne", en: "Medium" },
  "grc.actifs.crit.low": { fr: "Faible", en: "Low" },

  "grc.actifs.detail.cia": { fr: "CIA : C{c} / I{i} / A{a} — Rôle : {role}", en: "CIA: C{c} / I{i} / A{a} — Role: {role}" },
  "grc.actifs.detail.owner": { fr: "Propriétaire : {owner}", en: "Owner: {owner}" },
  "grc.actifs.detail.nextReview": { fr: "Prochaine revue : {date}", en: "Next review: {date}" },
  "grc.actifs.detail.dependsOn": { fr: "Dépend de : {names}", en: "Depends on: {names}" },

  "grc.actifs.pdf.title": { fr: "Registre des actifs", en: "Asset registry" },
  "grc.actifs.pdf.empty": { fr: "Aucun actif enregistré.", en: "No assets recorded." },
  "grc.actifs.pdf.colName": { fr: "Nom", en: "Name" },
  "grc.actifs.pdf.colType": { fr: "Type", en: "Type" },
  "grc.actifs.pdf.colRole": { fr: "Rôle", en: "Role" },
  "grc.actifs.pdf.colOwner": { fr: "Propriétaire", en: "Owner" },
  "grc.actifs.pdf.colNextReview": { fr: "Prochaine revue", en: "Next review" },
  "grc.actifs.pdf.colDependsOn": { fr: "Dépendances", en: "Dependencies" },
  "grc.actifs.pdf.colNotes": { fr: "Notes", en: "Notes" },
  "grc.actifs.pdf.colCrit": { fr: "Criticité", en: "Criticality" },
  "grc.actifs.pdf.invalidImport": { fr: "Format invalide : un tableau d'actifs est attendu.", en: "Invalid format: an array of assets is expected." },

  // ===================== Analyse des risques (analyse-risques.html) ===
  "grc.risques.title": { fr: "Analyse des risques (ISO 27005)", en: "Risk analysis (ISO 27005)" },
  "grc.risques.subtitle": { fr: "Cette section identifie les risques, les analyse et les priorise.", en: "This section identifies risks, analyzes them, and prioritizes them." },
  "grc.risques.registryTitle": { fr: "Registre des risques", en: "Risk registry" },
  "grc.risques.item1.label": { fr: "Méthodologie ISO 27005", en: "ISO 27005 methodology" },
  "grc.risques.item1.desc": { fr: "analyse qualitative basée sur les conséquences.", en: "qualitative analysis based on consequences." },
  "grc.risques.item2.label": { fr: "Identification des risques", en: "Risk identification" },
  "grc.risques.item2.desc": { fr: "menaces, vulnérabilités, impacts.", en: "threats, vulnerabilities, impacts." },
  "grc.risques.item3.label": { fr: "Scénarios de risques", en: "Risk scenarios" },
  "grc.risques.item3.desc": { fr: "techniques, humains, physiques, légaux.", en: "technical, human, physical, legal." },
  "grc.risques.item4.label": { fr: "Matrices", en: "Matrices" },
  "grc.risques.item4.desc": { fr: "exposition, criticité, ISO 27005.", en: "exposure, criticality, ISO 27005." },
  "grc.risques.item5.label": { fr: "Synthèse", en: "Summary" },
  "grc.risques.item5.desc": { fr: "risques critiques, risques modérés, risques faibles.", en: "critical risks, moderate risks, low risks." },
  "grc.risques.role": { fr: "L’analyse des risques permet de comprendre où se trouvent les dangers et quelles actions sont prioritaires.", en: "Risk analysis helps understand where the dangers lie and which actions to prioritize." },

  "grc.risques.form.title": { fr: "Ajouter un risque", en: "Add a risk" },
  "grc.risques.form.titleEdit": { fr: "Modifier le risque", en: "Edit risk" },
  "grc.risques.form.addBtn": { fr: "+ Ajouter un risque", en: "+ Add a risk" },
  "grc.risques.form.name": { fr: "Nom du risque", en: "Risk name" },
  "grc.risques.form.threat": { fr: "Menace", en: "Threat" },
  "grc.risques.form.vulnerability": { fr: "Vulnérabilité", en: "Vulnerability" },
  "grc.risques.form.assets": { fr: "Actifs concernés", en: "Affected assets" },
  "grc.risques.form.probability": { fr: "Probabilité (1-3)", en: "Probability (1-3)" },
  "grc.risques.form.impact": { fr: "Impact (1-3)", en: "Impact (1-3)" },
  "grc.risques.form.treatmentStrategy": { fr: "Stratégie de traitement", en: "Treatment strategy" },
  "grc.risques.form.treatment": { fr: "Plan de traitement", en: "Treatment plan" },
  "grc.risques.form.treatmentPlaceholder": {
    fr: "Détaille ici la mise en œuvre de la stratégie choisie ci-dessus.",
    en: "Detail here how the strategy chosen above is actually carried out."
  },
  "grc.risques.form.owner": { fr: "Propriétaire", en: "Owner" },
  "grc.risques.form.reviewDate": { fr: "Date de revue", en: "Review date" },
  "grc.risques.form.status": { fr: "Statut", en: "Status" },

  "grc.risques.status.ouvert": { fr: "Ouvert", en: "Open" },
  "grc.risques.status.traite": { fr: "Traité", en: "Treated" },
  "grc.risques.status.accepte": { fr: "Accepté", en: "Accepted" },

  "grc.risques.strategy.none": { fr: "Non défini", en: "Not defined" },
  "grc.risques.strategy.evitement": { fr: "Évitement", en: "Avoidance" },
  "grc.risques.strategy.mitigation": { fr: "Mitigation", en: "Mitigation" },
  "grc.risques.strategy.transfert": { fr: "Transfert", en: "Transfer" },
  "grc.risques.strategy.acceptation": { fr: "Acceptation", en: "Acceptance" },

  "grc.risques.crit.high": { fr: "Élevée", en: "High" },
  "grc.risques.crit.medium": { fr: "Moyenne", en: "Medium" },
  "grc.risques.crit.low": { fr: "Faible", en: "Low" },

  "grc.risques.detail.threat": { fr: "Menace : {value}", en: "Threat: {value}" },
  "grc.risques.detail.vulnerability": { fr: "Vulnérabilité : {value}", en: "Vulnerability: {value}" },
  "grc.risques.detail.assets": { fr: "Actifs concernés : {names}", en: "Affected assets: {names}" },
  "grc.risques.detail.probImpact": { fr: "Probabilité {p} × Impact {i} — Statut : {status}", en: "Probability {p} × Impact {i} — Status: {status}" },
  "grc.risques.detail.owner": { fr: "Propriétaire : {owner}", en: "Owner: {owner}" },
  "grc.risques.detail.reviewDate": { fr: "Prochaine revue : {date}", en: "Next review: {date}" },
  "grc.risques.detail.strategy": { fr: "Stratégie : {value}", en: "Strategy: {value}" },
  "grc.risques.detail.treatment": { fr: "Traitement : {value}", en: "Treatment: {value}" },
  "grc.risques.detail.treatedBy": { fr: "Traité par : {names}", en: "Treated by: {names}" },

  "grc.risques.pdf.title": { fr: "Registre des risques", en: "Risk registry" },
  "grc.risques.pdf.empty": { fr: "Aucun risque enregistré.", en: "No risks recorded." },
  "grc.risques.pdf.colName": { fr: "Nom", en: "Name" },
  "grc.risques.pdf.colThreat": { fr: "Menace", en: "Threat" },
  "grc.risques.pdf.colVulnerability": { fr: "Vulnérabilité", en: "Vulnerability" },
  "grc.risques.pdf.colAssets": { fr: "Actifs concernés", en: "Affected assets" },
  "grc.risques.pdf.colProbability": { fr: "Prob.", en: "Prob." },
  "grc.risques.pdf.colImpact": { fr: "Impact", en: "Impact" },
  "grc.risques.pdf.colCrit": { fr: "Criticité", en: "Criticality" },
  "grc.risques.pdf.colStatus": { fr: "Statut", en: "Status" },
  "grc.risques.pdf.colOwner": { fr: "Propriétaire", en: "Owner" },
  "grc.risques.pdf.colReviewDate": { fr: "Prochaine revue", en: "Next review" },
  "grc.risques.pdf.colStrategy": { fr: "Stratégie", en: "Strategy" },
  "grc.risques.pdf.colTreatment": { fr: "Traitement", en: "Treatment" },
  "grc.risques.pdf.invalidImport": { fr: "Format invalide : un tableau de risques est attendu.", en: "Invalid format: an array of risks is expected." },
  "grc.risques.matrix.impact": { fr: "Impact {n}", en: "Impact {n}" },
  "grc.risques.matrix.probability": { fr: "Probabilité {n}", en: "Probability {n}" },

  // ===================== Contrôles (controles.html) ===================
  "grc.controles.title": { fr: "Sélection des contrôles", en: "Control selection" },
  "grc.controles.subtitle": { fr: "Cette section décrit les mesures de sécurité choisies pour réduire les risques.", en: "This section describes the security measures chosen to reduce risk." },
  "grc.controles.registryTitle": { fr: "Registre des contrôles", en: "Control registry" },
  "grc.controles.item1.label": { fr: "Contrôles ISO 27001 Annexe A", en: "ISO 27001 Annex A controls" },
  "grc.controles.item2.label": { fr: "Mapping", en: "Mapping" },
  "grc.controles.item2.desc": { fr: "ISO / NIST / CIS.", en: "ISO / NIST / CIS." },
  "grc.controles.item3.label": { fr: "Déclaration d’Applicabilité (DDA)", en: "Statement of Applicability (SoA)" },
  "grc.controles.item3.desc": { fr: "contrôles retenus ou non retenus.", en: "controls adopted or not adopted." },
  "grc.controles.item4.label": { fr: "Contrôles organisationnels", en: "Organizational controls" },
  "grc.controles.item4.desc": { fr: "politiques, gouvernance, sensibilisation.", en: "policies, governance, awareness." },
  "grc.controles.item5.label": { fr: "Contrôles techniques", en: "Technical controls" },
  "grc.controles.item5.desc": { fr: "MFA, pare-feu, segmentation, chiffrement.", en: "MFA, firewalls, segmentation, encryption." },
  "grc.controles.item6.label": { fr: "Contrôles humains", en: "Human controls" },
  "grc.controles.item6.desc": { fr: "formation, responsabilités.", en: "training, accountability." },
  "grc.controles.role": { fr: "Les contrôles sont les outils concrets qui protègent les actifs et réduisent les risques.", en: "Controls are the concrete tools that protect assets and reduce risk." },

  "grc.controles.form.title": { fr: "Ajouter un contrôle", en: "Add a control" },
  "grc.controles.form.titleEdit": { fr: "Modifier le contrôle", en: "Edit control" },
  "grc.controles.form.addBtn": { fr: "+ Ajouter un contrôle", en: "+ Add a control" },
  "grc.controles.form.name": { fr: "Nom du contrôle", en: "Control name" },
  "grc.controles.form.isoRef": { fr: "ISO 27001 Annexe A", en: "ISO 27001 Annex A" },
  "grc.controles.form.nistRef": { fr: "NIST CSF", en: "NIST CSF" },
  "grc.controles.form.cisRef": { fr: "CIS", en: "CIS" },
  "grc.controles.form.type": { fr: "Type", en: "Type" },
  "grc.controles.form.status": { fr: "Statut d'implémentation", en: "Implementation status" },
  "grc.controles.form.risks": { fr: "Risques traités", en: "Risks addressed" },
  "grc.controles.form.owner": { fr: "Propriétaire", en: "Owner" },
  "grc.controles.form.evidence": { fr: "Preuve / évidence", en: "Evidence" },

  "grc.controles.type.organisationnel": { fr: "Organisationnel", en: "Organizational" },
  "grc.controles.type.technique": { fr: "Technique", en: "Technical" },
  "grc.controles.type.humain": { fr: "Humain", en: "Human" },

  "grc.controles.status.nonImplemente": { fr: "Non implémenté", en: "Not implemented" },
  "grc.controles.status.partiel": { fr: "Partiel", en: "Partial" },
  "grc.controles.status.implemente": { fr: "Implémenté", en: "Implemented" },
  "grc.controles.status.nonApplicable": { fr: "Non applicable", en: "Not applicable" },

  "grc.controles.detail.type": { fr: "Type : {value}", en: "Type: {value}" },
  "grc.controles.detail.refs": { fr: "Référentiels : {value}", en: "Frameworks: {value}" },
  "grc.controles.detail.risks": { fr: "Risques traités : {names}", en: "Risks addressed: {names}" },
  "grc.controles.detail.owner": { fr: "Propriétaire : {owner}", en: "Owner: {owner}" },
  "grc.controles.detail.evidence": { fr: "Preuve / évidence : {value}", en: "Evidence: {value}" },

  "grc.controles.pdf.title": { fr: "Déclaration d'applicabilité — Registre des contrôles", en: "Statement of Applicability — Control registry" },
  "grc.controles.pdf.empty": { fr: "Aucun contrôle enregistré.", en: "No controls recorded." },
  "grc.controles.pdf.colName": { fr: "Nom", en: "Name" },
  "grc.controles.pdf.colIso": { fr: "ISO 27001", en: "ISO 27001" },
  "grc.controles.pdf.colNist": { fr: "NIST CSF", en: "NIST CSF" },
  "grc.controles.pdf.colCis": { fr: "CIS", en: "CIS" },
  "grc.controles.pdf.colType": { fr: "Type", en: "Type" },
  "grc.controles.pdf.colStatus": { fr: "Statut", en: "Status" },
  "grc.controles.pdf.colRisks": { fr: "Risques traités", en: "Risks addressed" },
  "grc.controles.pdf.colOwner": { fr: "Propriétaire", en: "Owner" },
  "grc.controles.pdf.colEvidence": { fr: "Preuve / évidence", en: "Evidence" },
  "grc.controles.pdf.invalidImport": { fr: "Format invalide : un tableau de contrôles est attendu.", en: "Invalid format: an array of controls is expected." },

  // ===================== Incidents (incidents.html) ====================
  "grc.incidents.title": { fr: "Gestion des incidents", en: "Incident management" },
  "grc.incidents.subtitle": { fr: "Cette section décrit comment l’organisation réagit aux incidents de sécurité.", en: "This section describes how the organization responds to security incidents." },
  "grc.incidents.registryTitle": { fr: "Journal des incidents", en: "Incident log" },
  "grc.incidents.item1.label": { fr: "Objectifs", en: "Objectives" },
  "grc.incidents.item1.desc": { fr: "limiter l’impact, restaurer les services.", en: "limit impact, restore services." },
  "grc.incidents.item2.label": { fr: "Définitions", en: "Definitions" },
  "grc.incidents.item2.desc": { fr: "incident, événement, alerte.", en: "incident, event, alert." },
  "grc.incidents.item3.label": { fr: "Rôles", en: "Roles" },
  "grc.incidents.item3.desc": { fr: "SOC, CISO, TI, utilisateurs.", en: "SOC, CISO, IT, users." },
  "grc.incidents.item4.label": { fr: "Classification", en: "Classification" },
  "grc.incidents.item4.desc": { fr: "mineur, majeur, critique.", en: "minor, major, critical." },
  "grc.incidents.item5.label": { fr: "Processus", en: "Process" },
  "grc.incidents.item5.desc": { fr: "Detect → Respond → Recover.", en: "Detect → Respond → Recover." },
  "grc.incidents.item6.label": { fr: "Communication", en: "Communication" },
  "grc.incidents.item6.desc": { fr: "escalade, notifications.", en: "escalation, notifications." },
  "grc.incidents.item7.label": { fr: "Documentation", en: "Documentation" },
  "grc.incidents.item7.desc": { fr: "rapport d’incident.", en: "incident report." },
  "grc.incidents.item8.label": { fr: "Amélioration continue", en: "Continuous improvement" },
  "grc.incidents.item8.desc": { fr: "post-mortem.", en: "post-mortem." },
  "grc.incidents.role": { fr: "La gestion des incidents protège l’organisation contre les interruptions et les pertes.", en: "Incident management protects the organization against disruption and loss." },

  "grc.incidents.form.title": { fr: "Déclarer un incident", en: "Report an incident" },
  "grc.incidents.form.titleEdit": { fr: "Modifier l'incident", en: "Edit incident" },
  "grc.incidents.form.addBtn": { fr: "+ Déclarer un incident", en: "+ Report an incident" },
  "grc.incidents.form.title2": { fr: "Titre", en: "Title" },
  "grc.incidents.form.description": { fr: "Description", en: "Description" },
  "grc.incidents.form.severity": { fr: "Sévérité", en: "Severity" },
  "grc.incidents.form.status": { fr: "Statut", en: "Status" },
  "grc.incidents.form.detectedAt": { fr: "Détection", en: "Detected" },
  "grc.incidents.form.respondedAt": { fr: "Réponse", en: "Responded" },
  "grc.incidents.form.resolvedAt": { fr: "Résolution", en: "Resolved" },
  "grc.incidents.form.owner": { fr: "Propriétaire", en: "Owner" },
  "grc.incidents.form.postmortem": { fr: "Post-mortem / amélioration continue", en: "Post-mortem / continuous improvement" },

  "grc.incidents.severity.mineur": { fr: "Mineur", en: "Minor" },
  "grc.incidents.severity.majeur": { fr: "Majeur", en: "Major" },
  "grc.incidents.severity.critique": { fr: "Critique", en: "Critical" },

  "grc.incidents.status.ouvert": { fr: "Ouvert", en: "Open" },
  "grc.incidents.status.enCours": { fr: "En cours", en: "In progress" },
  "grc.incidents.status.resolu": { fr: "Résolu", en: "Resolved" },
  "grc.incidents.status.clos": { fr: "Clos", en: "Closed" },

  "grc.incidents.detail.detectedAt": { fr: "Détection : {value}", en: "Detected: {value}" },
  "grc.incidents.detail.respondedAt": { fr: "Réponse : {value}", en: "Responded: {value}" },
  "grc.incidents.detail.resolvedAt": { fr: "Résolution : {value}", en: "Resolved: {value}" },
  "grc.incidents.detail.duration": { fr: "Temps de résolution : {value}", en: "Resolution time: {value}" },
  "grc.incidents.detail.durationHours": { fr: "{value} h", en: "{value} h" },
  "grc.incidents.detail.durationDays": { fr: "{value} j", en: "{value} d" },
  "grc.incidents.detail.owner": { fr: "Propriétaire : {value}", en: "Owner: {value}" },
  "grc.incidents.detail.postmortem": { fr: "Post-mortem : {value}", en: "Post-mortem: {value}" },
  "grc.incidents.invalidImport": { fr: "Format invalide : un tableau d'incidents est attendu.", en: "Invalid format: an array of incidents is expected." }
});
