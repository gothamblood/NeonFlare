/* Documentation — sous-pages de Continuité (grc/continuite/*.html) ·
   ISO 22301 cl. 8.3 – 8.6 (grc-normes N3, N4). Chaque plan a ses propres
   éléments ; ils se relient au registre PCA/PRA (plan), aux processus de
   la cartographie, aux rôles de Gouvernance et au registre unique
   d'amélioration. Les coordonnées de l'arbre d'appel restent sous le
   préfixe /grc/fiches/ (protégé par le coffre, décision E4).
   Moteur : grc-fiches.js. Identifiants STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const PLAN = { id: "plan", linkTo: "continuity", label: L("Plan (registre PCA/PRA)", "Plan (BCP/DRP register)") };
  const ORDRE = { id: "ordre", type: "number", label: L("Ordre", "Order") };

  grcFicheRegister("continuite-pca", {
    docTitle: L("Plan de continuité des activités (PCA)", "Business continuity plan (BCP)"),
    docRef: "ISO 22301:2019 clauses 5.2, 6.2, 8.4",
    elements: [
      {
        id: "politique",
        essential: true,
        title: L("Politique de continuité", "Continuity policy"),
        ref: L("ISO 22301 cl. 5.2 · ISO 27001 A.5.29", "ISO 22301 cl. 5.2 · ISO 27001 A.5.29"),
        lead: L("L’engagement de la direction sur la continuité, rédigé article par article.", "Management’s commitment to continuity, written article by article."),
        desc: L("Objectif, portée, principes, rôles, revue. Exemple d’objectif : « Maintenir les services de paie des clients même en cas de sinistre majeur ».",
          "Purpose, scope, principles, roles, review. Example purpose: \"Keep client payroll services running even after a major disaster\"."),
        header: ["texte", "type"],
        fields: [
          { id: "type", type: "select", label: L("Type d’article", "Article type"), options: [
            O("objectif", "Objectif", "Purpose"), O("portee", "Portée", "Scope"), O("principe", "Principe", "Principle"),
            O("roles", "Rôles", "Roles"), O("revue", "Revue", "Review"),
          ] },
          { id: "texte", type: "textarea", required: true, label: L("Texte", "Text") },
        ],
        example: { type: "objectif", texte: L("Maintenir les services de paie des clients même en cas de sinistre majeur", "Keep client payroll services running even after a major disaster") },
      },
      {
        id: "objectifs",
        essential: true,
        title: L("Objectifs de continuité", "Continuity objectives"),
        ref: L("ISO 22301 cl. 6.2", "ISO 22301 cl. 6.2"),
        lead: L("Des objectifs mesurables, reliés aux objectifs du SGSI quand ils se recoupent.", "Measurable objectives, linked to ISMS objectives where they overlap."),
        desc: L("Exemple : « Reprendre la paie en 4 h dans 100 % des exercices annuels » — mesure : résultat des exercices.",
          "Example: \"Resume payroll within 4 h in 100% of yearly exercises\" — measure: exercise results."),
        header: ["objectif", "echeance"],
        fields: [
          { id: "objectif", type: "text", required: true, label: L("Objectif", "Objective") },
          { id: "mesure", type: "text", label: L("Mesure", "Measure") },
          { id: "objectifs", linkTo: "objectif", multi: true, label: L("Objectifs du SGSI liés", "Linked ISMS objectives") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
          { id: "echeance", type: "date", label: L("Échéance", "Due date") },
        ],
        example: { objectif: L("Reprendre la paie en 4 h lors de chaque exercice annuel", "Resume payroll within 4 h at every yearly exercise"), mesure: L("Résultat des exercices", "Exercise results") },
      },
      {
        id: "activation",
        title: L("Activation", "Activation"),
        ref: L("ISO 22301 cl. 8.4.2", "ISO 22301 cl. 8.4.2"),
        lead: L("Quand et par qui le PCA est déclenché.", "When and by whom the BCP is triggered."),
        desc: L("Une entrée par critère d’activation. Exemple : indisponibilité du site principal > 2 h — décidée par la cellule de crise.",
          "One entry per activation criterion. Example: main site unavailable > 2 h — decided by the crisis cell."),
        header: ["critere", "autorite"],
        fields: [
          { id: "critere", type: "text", required: true, label: L("Critère", "Criterion") },
          { id: "autorite", linkTo: "role", label: L("Autorité qui active", "Activating authority") },
          { id: "plans", linkTo: "continuity", multi: true, label: L("Plans activés", "Plans activated") },
        ],
        example: { critere: L("Site principal indisponible plus de 2 h", "Main site unavailable for more than 2 h") },
      },
    ],
  });

  // (Fiche « continuite-bia » — vue « Synthèse du BIA » tirée des plans —
  // retirée le 2026-10-08 : orpheline depuis la suppression de la sous-page
  // et remplacée par le registre BIA par processus, onglet « BIA ».)

  grcFicheRegister("continuite-pco", {
    docTitle: L("Plan de continuité des opérations (PCO)", "Continuity of operations plan (COOP)"),
    docRef: "ISO 22301:2019 clause 8.4.4",
    elements: [
      {
        id: "mode-degrade",
        essential: true,
        title: L("Mode dégradé et contournements", "Degraded mode and workarounds"),
        ref: L("ISO 22301 cl. 8.4.4", "ISO 22301 cl. 8.4.4"),
        lead: L("Comment chaque processus critique continue, même au ralenti, pendant la crise.", "How each critical process keeps going, even slowly, during the crisis."),
        desc: L("Une entrée par processus : niveau minimal (MBCO), contournement manuel, ressources minimales. Exemple : paie — traitement des 20 plus gros clients à la main sur tableur.",
          "One entry per process: minimum level (MBCO), manual workaround, minimum resources. Example: payroll — the 20 largest clients processed by hand in a spreadsheet."),
        header: ["contournement", "processus"],
        fields: [
          { id: "processus", linkTo: "processus", label: L("Processus", "Process") },
          { id: "mbco", type: "text", label: L("Niveau minimal (MBCO)", "Minimum level (MBCO)") },
          { id: "contournement", type: "textarea", required: true, label: L("Contournement", "Workaround") },
          { id: "ressources", type: "text", hint: L("Personnes, postes, outils indispensables pour fonctionner au minimum", "People, workstations, tools essential to run at a minimum"), label: L("Ressources minimales", "Minimum resources") },
        ],
        example: { mbco: L("20 plus gros clients", "20 largest clients"), contournement: L("Paie calculée à la main sur tableur, virements saisis au portail bancaire", "Payroll computed by hand in a spreadsheet, transfers entered at the bank portal") },
      },
      {
        id: "repli",
        title: L("Repli des équipes", "Staff relocation"),
        ref: L("ISO 22301 cl. 8.4.4", "ISO 22301 cl. 8.4.4"),
        desc: L("Où et comment les équipes travaillent si les locaux sont inaccessibles. Exemple : télétravail pour 80 % du personnel, site de repli pour la paie.",
          "Where and how teams work if the premises are inaccessible. Example: remote work for 80% of staff, recovery site for payroll."),
        header: ["equipe", "moyen"],
        fields: [
          { id: "equipe", type: "text", required: true, label: L("Équipe", "Team") },
          { id: "moyen", type: "select", label: L("Moyen", "Means"), options: [O("teletravail", "Télétravail", "Remote work"), O("site", "Site de repli", "Recovery site"), O("rotation", "Rotation", "Rotation")] },
          { id: "detail", type: "textarea", label: L("Détail", "Details") },
        ],
        example: { equipe: L("Paie", "Payroll"), moyen: "site", detail: L("Bureau partagé de Laval, 6 postes", "Laval shared office, 6 desks") },
      },
    ],
  });

  grcFicheRegister("continuite-pgc", {
    docTitle: L("Plan de gestion de crise (PGC)", "Crisis management plan"),
    docRef: "ISO 22301:2019 clauses 8.4.2, 8.4.3 · ISO 22320 (gestion de crise)",
    elements: [
      {
        id: "arbre-appel",
        essential: true,
        title: L("Arbre d’appel", "Call tree"),
        ref: L("ISO 22301 cl. 8.4.3", "ISO 22301 cl. 8.4.3"),
        lead: L("Qui appelle qui, dans quel ordre, pour mobiliser la crise en quelques minutes.", "Who calls whom, in which order, to mobilize the crisis in minutes."),
        desc: L("Une entrée par personne à joindre, avec son suppléant et le plan concerné. Les coordonnées sont des renseignements personnels : active le coffre (Paramètres) pour les chiffrer.",
          "One entry per person to reach, with their deputy and the plan concerned. Contact details are personal information: enable the vault (Settings) to encrypt them."),
        header: ["titulaire", "ordre"],
        fields: [
          ORDRE,
          { id: "titulaire", type: "text", required: true, suggest: { vocab: "roles", from: ["role"] }, label: L("Personne", "Person") },
          { id: "roleId", linkTo: "role", label: L("Rôle", "Role") },
          { id: "contact", type: "text", label: L("Coordonnées", "Contact details") },
          { id: "suppleant", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Suppléant", "Deputy") },
          { id: "appelle", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Appelle ensuite", "Then calls") },
          { id: "plans", linkTo: "continuity", multi: true, label: L("Plans concernés", "Plans concerned") },
        ],
        example: { ordre: "1", titulaire: L("J. Roy", "J. Roy"), contact: L("514 555-0100", "514 555-0100"), suppleant: L("M. Côté", "M. Côté") },
      },
      {
        id: "declenchement",
        title: L("Déclenchement et niveaux de crise", "Triggering and crisis levels"),
        ref: L("ISO 22301 cl. 8.4.2 · ISO 22320", "ISO 22301 cl. 8.4.2 · ISO 22320"),
        desc: L("Les seuils qui font passer d’un incident à une crise, qui décide et ce qui se déclenche. Échelle : pré-alerte (on évalue) → mineur (quelques unités touchées) → majeur (plusieurs unités) → crise (une grande partie de l’organisation). Exemple : majeur — plusieurs services clients arrêtés — la DG active le PCA et le RPCA convoque la cellule.",
          "The thresholds that turn an incident into a crisis, who decides and what is triggered. Scale: pre-alert (assess) → minor (a few units hit) → major (several units) → crisis (a large part of the organization). Example: major — several customer services down — the CEO activates the BCP and the BCP manager convenes the cell."),
        header: ["niveau", "critere"],
        fields: [
          // Valeurs 1-3 conservées (données existantes) ; 0 = pré-alerte ajoutée.
          { id: "niveau", type: "select", label: L("Niveau", "Level"), options: [O("0", "0 — Pré-alerte (évaluation)", "0 — Pre-alert (assessment)"), O("1", "1 — Incident mineur / alerte (quelques unités)", "1 — Minor incident / alert (a few units)"), O("2", "2 — Incident majeur (plusieurs unités)", "2 — Major incident (several units)"), O("3", "3 — Crise (grande partie de l’organisation)", "3 — Crisis (large part of the organization)")] },
          { id: "critere", type: "textarea", required: true, label: L("Critères", "Criteria") },
          { id: "autorite", linkTo: "role", label: L("Qui décide", "Who decides") },
          { id: "declenche", type: "textarea", hint: L("Ex. aviser le responsable désigné ; activer le PCA ; convoquer la cellule de crise ; déclencher le PRA", "E.g. notify the designated manager; activate the BCP; convene the crisis cell; trigger the DRP"), label: L("Ce qui se déclenche", "What is triggered") },
        ],
        example: { niveau: "2", critere: L("Plusieurs services clients arrêtés plus de 2 h", "Several customer services down for more than 2 h") },
      },
      {
        id: "main-courante",
        title: L("Main courante", "Crisis log"),
        ref: L("ISO 22301 cl. 8.4.2", "ISO 22301 cl. 8.4.2"),
        desc: L("Le journal horodaté des faits et décisions pendant la crise (et pendant les exercices). Une entrée par fait ou décision.",
          "The time-stamped log of facts and decisions during the crisis (and during exercises). One entry per fact or decision."),
        header: ["evenement", "date"],
        fields: [
          { id: "date", type: "date", label: L("Date", "Date") },
          { id: "heure", type: "text", label: L("Heure", "Time") },
          { id: "evenement", type: "textarea", required: true, label: L("Fait ou décision", "Fact or decision") },
          { id: "auteur", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Auteur", "Author") },
        ],
        example: { heure: "09:40", evenement: L("Activation du PCA décidée par la cellule de crise", "BCP activation decided by the crisis cell") },
      },
    ],
  });

  grcFicheRegister("continuite-pcm", {
    docTitle: L("Plan de communication de crise (PCC)", "Crisis communication plan (PCC)"),
    docRef: "ISO 22301:2019 clause 8.4.3",
    elements: [
      {
        id: "porte-parole",
        essential: true,
        title: L("Porte-parole", "Spokespersons"),
        ref: L("ISO 22301 cl. 8.4.3", "ISO 22301 cl. 8.4.3"),
        desc: L("Qui parle au nom de l’organisation, à quels publics. Exemple : directrice générale — médias et clients ; RSSI — autorités.",
          "Who speaks for the organization, to which audiences. Example: CEO — media and customers; CISO — authorities."),
        header: ["nom", "publics"],
        fields: [
          { id: "nom", type: "text", required: true, suggest: { vocab: "roles", from: ["role"] }, label: L("Porte-parole", "Spokesperson") },
          { id: "roleId", linkTo: "role", label: L("Rôle", "Role") },
          { id: "publics", type: "text", suggest: "public", label: L("Publics", "Audiences") },
          { id: "suppleant", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Suppléant", "Deputy") },
        ],
        example: { nom: L("Directrice générale", "CEO"), publics: L("Médias et clients", "Media and customers") },
      },
      {
        id: "messages",
        essential: true,
        title: L("Messages types", "Message templates"),
        ref: L("ISO 22301 cl. 8.4.3", "ISO 22301 cl. 8.4.3"),
        desc: L("Des messages pré-approuvés par scénario et par public, prêts à adapter. Exemple : rançongiciel — clients — « Nous gérons un incident informatique ; vos données font l’objet d’une vérification… ».",
          "Pre-approved messages per scenario and audience, ready to adapt. Example: ransomware — customers — \"We are handling an IT incident; your data is being checked…\"."),
        header: ["scenario", "public"],
        fields: [
          { id: "scenario", type: "text", required: true, label: L("Scénario", "Scenario") },
          { id: "public", type: "text", suggest: "public", label: L("Public", "Audience") },
          { id: "message", type: "textarea", label: L("Message", "Message") },
          { id: "validePar", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Validé par", "Approved by") },
        ],
        example: { scenario: L("Rançongiciel", "Ransomware"), public: L("Clients", "Customers"), message: L("Nous gérons actuellement un incident informatique. Vos données font l’objet d’une vérification ; nous vous tiendrons informés.", "We are currently handling an IT incident. Your data is being checked; we will keep you informed.") },
      },
      {
        id: "notifications",
        title: L("Notifications obligatoires", "Mandatory notifications"),
        ref: L("ISO 22301 cl. 8.4.3 · Loi 25", "ISO 22301 cl. 8.4.3 · Bill 25"),
        desc: L("Les avis exigés par la loi ou les contrats : à qui, dans quel délai, à quelle condition. Exemple : CAI — incident de confidentialité présentant un risque de préjudice sérieux — avec diligence.",
          "Notices required by law or contracts: to whom, within what time, under which condition. Example: CAI — privacy incident with a risk of serious harm — promptly."),
        header: ["destinataire", "delai"],
        fields: [
          { id: "destinataire", type: "text", required: true, suggest: { vocab: "roles", from: ["role"] }, label: L("Destinataire", "Recipient") },
          { id: "condition", type: "textarea", label: L("Condition", "Condition") },
          { id: "delai", type: "text", suggest: "delai", label: L("Délai", "Timeframe") },
        ],
        example: { destinataire: L("Commission d’accès à l’information (CAI)", "Commission d’accès à l’information (CAI)"), condition: L("Incident de confidentialité avec risque de préjudice sérieux", "Privacy incident with risk of serious harm"), delai: L("Avec diligence", "Promptly") },
      },
      {
        id: "journal",
        title: L("Journal des communications", "Communication log"),
        ref: L("ISO 22301 cl. 8.4.3", "ISO 22301 cl. 8.4.3"),
        desc: L("Ce qui a été communiqué, à qui, quand et par quel canal, pendant la crise ou l’exercice.", "What was communicated, to whom, when and through which channel, during the crisis or exercise."),
        header: ["message", "date"],
        fields: [
          { id: "date", type: "date", label: L("Date", "Date") },
          { id: "destinataire", linkTo: "pp", label: L("Destinataire (partie prenante)", "Recipient (interested party)") },
          { id: "canal", type: "text", suggest: "canal", label: L("Canal", "Channel") },
          { id: "message", type: "textarea", required: true, label: L("Message", "Message") },
        ],
        example: { canal: L("Courriel", "Email"), message: L("Premier avis aux clients", "First notice to customers") },
      },
    ],
  });

  grcFicheRegister("continuite-pra", {
    docTitle: L("Plan de reprise des activités (PRA)", "Disaster recovery plan (DRP)"),
    docRef: "ISO 22301:2019 clause 8.4.4 · ISO/IEC 27031",
    elements: [
      {
        id: "sequence",
        essential: true,
        title: L("Séquence de reprise", "Recovery sequence"),
        ref: L("ISO 22301 cl. 8.4.4", "ISO 22301 cl. 8.4.4"),
        lead: L("Dans quel ordre on redémarre les activités, avec qui et en combien de temps.", "In which order activities restart, with whom and how fast."),
        desc: L("Une entrée par étape, dans l’ordre des priorités du BIA. Exemple : 1. paie — équipe paie + TI — 4 h.",
          "One entry per step, in BIA priority order. Example: 1. payroll — payroll team + IT — 4 h."),
        header: ["etape", "ordre"],
        fields: [
          ORDRE,
          { id: "etape", type: "text", required: true, label: L("Étape ou activité", "Step or activity") },
          { id: "processus", linkTo: "processus", label: L("Processus", "Process") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
          { id: "duree", type: "text", suggest: "delai", label: L("Durée visée", "Target duration") },
          PLAN,
        ],
        example: { ordre: "1", etape: L("Reprise de la paie", "Payroll recovery"), responsable: L("Directrice des opérations", "Operations director"), duree: L("4 h", "4 h") },
      },
      {
        id: "retour-normal",
        title: L("Retour à la normale", "Return to normal"),
        ref: L("ISO 22301 cl. 8.4.4", "ISO 22301 cl. 8.4.4"),
        desc: L("Les critères pour quitter le mode reprise et revenir à l’exploitation normale.", "The criteria to leave recovery mode and return to normal operations."),
        header: ["critere"],
        fields: [
          { id: "critere", type: "textarea", required: true, label: L("Critère", "Criterion") },
          { id: "validePar", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Validé par", "Approved by") },
        ],
        example: { critere: L("Toutes les paies de la semaine versées, contrôles de cohérence validés", "All payrolls of the week paid, consistency checks validated") },
      },
    ],
  });

  grcFicheRegister("continuite-psi", {
    docTitle: L("Plan de secours informatique (PSI)", "IT contingency plan"),
    docRef: "ISO 22301:2019 clause 8.3 · ISO/IEC 27031",
    elements: [
      {
        id: "moyens",
        essential: true,
        title: L("Moyens de secours", "Contingency resources"),
        ref: L("ISO 22301 cl. 8.3 · ISO 27001 A.8.14", "ISO 22301 cl. 8.3 · ISO 27001 A.8.14"),
        lead: L("Ce qui prend le relais quand l’informatique principale tombe : site de relève, redondance, contrats.", "What takes over when primary IT fails: recovery site, redundancy, contracts."),
        desc: L("Une entrée par moyen, relié aux actifs qu’il secourt et aux fournisseurs qui le fournissent. Exemple : site de relève infonuagique — serveur de paie — hébergeur X — capacité 100 %.",
          "One entry per resource, linked to the assets it backs up and the suppliers providing it. Example: cloud recovery site — payroll server — host X — 100% capacity."),
        header: ["moyen", "type"],
        fields: [
          { id: "moyen", type: "text", required: true, label: L("Moyen", "Resource") },
          { id: "type", type: "select", label: L("Type", "Type"), options: [O("site", "Site de relève", "Recovery site"), O("redondance", "Redondance", "Redundancy"), O("sauvegarde", "Sauvegarde", "Backup"), O("contrat", "Contrat de secours", "Contingency contract")] },
          { id: "actifs", linkTo: "asset", multi: true, label: L("Actifs secourus", "Assets covered") },
          { id: "fournisseurs", linkTo: "supplier", multi: true, label: L("Fournisseurs", "Suppliers") },
          { id: "capacite", type: "text", label: L("Capacité", "Capacity") },
        ],
        example: { moyen: L("Site de relève infonuagique", "Cloud recovery site"), type: "site", capacite: "100 %" },
      },
      {
        id: "bascule",
        title: L("Procédure de bascule", "Failover procedure"),
        ref: L("ISO 22301 cl. 8.4.4", "ISO 22301 cl. 8.4.4"),
        desc: L("Les étapes pour basculer vers les moyens de secours, dans l’ordre.", "The steps to fail over to contingency resources, in order."),
        header: ["etape", "ordre"],
        fields: [
          ORDRE,
          { id: "etape", type: "textarea", required: true, label: L("Étape", "Step") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
        ],
        example: { ordre: "1", etape: L("Confirmer l’indisponibilité du site principal", "Confirm the primary site is unavailable"), responsable: L("Service TI", "IT") },
      },
    ],
  });

  grcFicheRegister("continuite-pri", {
    docTitle: L("Plan de rétablissement informatique (PRI)", "IT recovery plan"),
    docRef: "ISO 22301:2019 clause 8.4.4 · ISO/IEC 27031",
    elements: [
      {
        id: "ordre",
        essential: true,
        title: L("Ordre de rétablissement", "Recovery order"),
        ref: L("ISO 22301 cl. 8.4.4 · ISO 27001 A.5.30", "ISO 22301 cl. 8.4.4 · ISO 27001 A.5.30"),
        lead: L("Dans quel ordre on reconstruit les systèmes pour revenir au fonctionnement nominal.", "In which order systems are rebuilt to return to nominal operation."),
        desc: L("Une entrée par système, dans l’ordre (infrastructure d’abord). Relie les actifs. Exemple : 1. annuaire et DNS ; 2. serveur de fichiers ; 3. application de paie.",
          "One entry per system, in order (infrastructure first). Link the assets. Example: 1. directory and DNS; 2. file server; 3. payroll application."),
        header: ["systeme", "ordre"],
        fields: [
          ORDRE,
          { id: "systeme", type: "text", required: true, suggest: { from: ["asset"] }, label: L("Système", "System") },
          { id: "actifs", linkTo: "asset", multi: true, label: L("Actifs", "Assets") },
          { id: "dependances", type: "text", suggest: { from: ["asset"] }, label: L("Dépend de", "Depends on") },
          { id: "rto", type: "text", suggest: "delai", label: L("RTO visé", "Target RTO") },
        ],
        example: { ordre: "1", systeme: L("Annuaire et DNS", "Directory and DNS"), rto: L("2 h", "2 h") },
      },
      {
        id: "validation",
        title: L("Validation technique", "Technical validation"),
        ref: L("ISO 22301 cl. 8.4.4", "ISO 22301 cl. 8.4.4"),
        desc: L("Comment on vérifie qu’un système rétabli est complet, intègre et sain (sans maliciel).", "How a restored system is checked to be complete, intact and clean (malware-free)."),
        header: ["critere"],
        fields: [
          { id: "critere", type: "textarea", required: true, label: L("Critère", "Criterion") },
          { id: "methode", type: "text", suggest: "validation", label: L("Méthode", "Method") },
        ],
        example: { critere: L("Sauvegarde restaurée analysée par l’antivirus avant remise en service", "Restored backup scanned by antivirus before going live"), methode: L("Analyse complète EDR", "Full EDR scan") },
      },
    ],
  });

  grcFicheRegister("continuite-tests-exercices", {
    docTitle: L("Tests et exercices", "Tests and exercises"),
    docRef: "ISO 22301:2019 clause 8.5 · ISO 22398 (exercices)",
    elements: [
      {
        id: "programme",
        essential: true,
        title: L("Programme d’exercices", "Exercise programme"),
        ref: L("ISO 22301 cl. 8.5", "ISO 22301 cl. 8.5"),
        lead: L("Le calendrier des exercices, du plus simple (sur table) au plus complet (bascule réelle).", "The exercise calendar, from the simplest (tabletop) to the most complete (real failover)."),
        desc: L("Une entrée par exercice planifié, relié au plan testé. Exemple : TTX rançongiciel — PCA paie — mars 2027.",
          "One entry per planned exercise, linked to the plan tested. Example: ransomware TTX — payroll BCP — March 2027."),
        header: ["exercice", "date"],
        fields: [
          { id: "exercice", type: "text", required: true, suggest: "exercice", label: L("Exercice", "Exercise") },
          { id: "type", type: "select", label: L("Type", "Type"), options: [O("ttx", "Sur table (TTX)", "Tabletop (TTX)"), O("simulation", "Simulation", "Simulation"), O("restauration", "Test de restauration", "Restore test"), O("bascule", "Bascule réelle", "Real failover"), O("evacuation", "Exercice d’évacuation", "Evacuation drill"), O("complet", "Exercice complet", "Full exercise")] },
          PLAN,
          { id: "date", type: "date", label: L("Date prévue", "Planned date") },
          { id: "objectif", type: "text", label: L("Objectif", "Objective") },
        ],
        example: { exercice: L("TTX rançongiciel", "Ransomware TTX"), type: "ttx", objectif: L("Valider l’arbre d’appel et la décision d’activation", "Validate the call tree and the activation decision") },
      },
      {
        id: "rapports",
        essential: true,
        title: L("Rapports d’exercice", "Exercise reports"),
        ref: L("ISO 22301 cl. 8.5 · 9.1", "ISO 22301 cl. 8.5 · 9.1"),
        desc: L("Ce qui a été observé, les écarts, et les actions ouvertes dans le registre unique d’amélioration.",
          "What was observed, the gaps, and the actions opened in the single improvement register."),
        header: ["resultat", "date"],
        fields: [
          PLAN,
          { id: "date", type: "date", label: L("Date", "Date") },
          // Ajoutés quand la fiche est devenue l'onglet « Tests & exercices »
          // de continuite.html : type joué, scénario, participants, RTO observé.
          { id: "type", type: "select", label: L("Type", "Type"), options: [O("ttx", "Sur table (TTX)", "Tabletop (TTX)"), O("simulation", "Simulation de crise", "Crisis simulation"), O("restauration", "Test de restauration", "Restore test"), O("bascule", "Bascule réelle", "Real failover"), O("evacuation", "Exercice d’évacuation", "Evacuation drill"), O("complet", "Exercice complet", "Full exercise")] },
          { id: "scenario", type: "textarea", label: L("Scénario joué", "Scenario played") },
          { id: "participants", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Participants", "Participants") },
          { id: "rtoObserve", type: "text", hint: L("Temps réel de reprise constaté, à comparer au RTO visé du plan (ex. 5 h)", "Actual recovery time observed, to compare with the plan's target RTO (e.g. 5 h)"), label: L("RTO observé", "Observed RTO") },
          { id: "resultat", type: "select", label: L("Résultat", "Result"), options: [O("reussi", "Réussi", "Passed"), O("partiel", "Partiel", "Partial"), O("echec", "Échec", "Failed")] },
          { id: "observations", type: "textarea", label: L("Observations et écarts", "Observations and gaps") },
          { id: "actions", linkTo: "amelioration", multi: true, label: L("Actions (registre d’amélioration)", "Actions (improvement register)") },
        ],
        example: { resultat: "partiel", observations: L("Le suppléant du RSSI n’avait pas accès à l’arbre d’appel", "The CISO’s deputy had no access to the call tree") },
        cross: [{ label: L("Créer l’action", "Create the action"), page: "gouvernance", tab: "amelioration", list: "renderGrcFiche_gouvernance_amelioration",
          values: (e) => ({ nature: "amelioration", origine: "continuite", description: e.observations || "" }) }],
      },
    ],
  });

  /* ================================================================= *
   *  Nouveaux types de plan (spec/grc-continuity-plans-register/ P3).
   *  Même patron que ci-dessus ; i18n FR/EN installé par grcFicheRegister.
   * ================================================================= */

  grcFicheRegister("continuite-pui", {
    docTitle: L("Plan d’urgence interne (PUI)", "Internal emergency plan"),
    docRef: "ISO 22301:2019 clause 8.4.2 · sécurité des personnes",
    elements: [
      {
        id: "consignes",
        essential: true,
        title: L("Consignes d’urgence", "Emergency instructions"),
        ref: L("ISO 22301 cl. 8.4.2 · ISO A.7.11", "ISO 22301 cl. 8.4.2 · ISO A.7.11"),
        lead: L("Les gestes immédiats pour protéger les personnes avant toute considération d’activité.", "The immediate actions to protect people, before any business consideration."),
        desc: L("Une entrée par situation (incendie, intrusion, fuite…), avec le geste à faire et qui le déclenche. Exemple : incendie — évacuer par les issues de secours — déclenché par toute personne.",
          "One entry per situation (fire, intrusion, leak…), with the action and who triggers it. Example: fire — evacuate through emergency exits — triggered by anyone."),
        header: ["situation", "consigne"],
        fields: [
          { id: "situation", type: "select", label: L("Situation", "Situation"), options: [
            O("incendie", "Incendie", "Fire"), O("intrusion", "Intrusion / malveillance", "Intrusion / malicious act"),
            O("fuite", "Fuite / produit dangereux", "Leak / hazardous material"), O("medical", "Urgence médicale", "Medical emergency"),
            O("meteo", "Événement météo / naturel", "Weather / natural event"),
          ] },
          { id: "consigne", type: "textarea", required: true, label: L("Consigne", "Instruction") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Qui déclenche", "Who triggers") },
        ],
        example: { situation: "incendie", consigne: L("Évacuer immédiatement par les issues de secours, ne pas prendre l’ascenseur", "Evacuate immediately through emergency exits, do not use the lift") },
      },
      {
        id: "rassemblement",
        title: L("Points de rassemblement", "Assembly points"),
        ref: L("ISO 22301 cl. 8.4.2", "ISO 22301 cl. 8.4.2"),
        desc: L("Où les personnes se regroupent et qui fait le comptage. Exemple : stationnement nord — comptage par le responsable d’étage.",
          "Where people gather and who does the headcount. Example: north car park — headcount by the floor warden."),
        header: ["lieu", "responsable"],
        fields: [
          { id: "lieu", type: "text", required: true, label: L("Lieu", "Location") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable du comptage", "Headcount owner") },
          { id: "capacite", type: "text", label: L("Capacité / notes", "Capacity / notes") },
        ],
        example: { lieu: L("Stationnement nord", "North car park"), responsable: L("Responsable d’étage", "Floor warden") },
      },
    ],
  });

  grcFicheRegister("continuite-prh", {
    docTitle: L("Plan RH de crise (PRH)", "Crisis HR plan"),
    docRef: "ISO 22301:2019 clause 8.3.2 · ressources humaines",
    elements: [
      {
        id: "mobilisation",
        essential: true,
        title: L("Mobilisation et astreinte", "Mobilization and on-call"),
        ref: L("ISO 22301 cl. 8.3.2 · 8.4.2", "ISO 22301 cl. 8.3.2 · 8.4.2"),
        lead: L("Qui doit être disponible en crise, avec quelle astreinte et quel suppléant.", "Who must be available in a crisis, with what on-call rota and deputy."),
        desc: L("Une entrée par fonction critique, avec les personnes et le suppléant. Exemple : paie — 2 gestionnaires + 1 suppléant — astreinte week-end.",
          "One entry per critical function, with people and deputy. Example: payroll — 2 officers + 1 deputy — weekend on-call."),
        header: ["fonction", "personnes"],
        fields: [
          { id: "fonction", type: "text", required: true, suggest: { vocab: "roles", from: ["role"] }, label: L("Fonction critique", "Critical function") },
          { id: "roleId", linkTo: "role", label: L("Rôle", "Role") },
          { id: "personnes", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Personnes", "People") },
          { id: "suppleant", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Suppléant", "Deputy") },
          { id: "astreinte", type: "text", label: L("Astreinte", "On-call") },
        ],
        example: { fonction: L("Paie", "Payroll"), personnes: L("2 gestionnaires", "2 officers"), astreinte: L("Week-end", "Weekend") },
      },
      {
        id: "soutien",
        title: L("Soutien aux personnes", "Support to people"),
        ref: L("ISO 22301 cl. 7.3 · 8.4.2", "ISO 22301 cl. 7.3 · 8.4.2"),
        desc: L("L’accompagnement des employés et de leurs familles pendant et après la crise. Exemple : cellule d’écoute psychologique — activée à la sortie de crise.",
          "Support for employees and their families during and after the crisis. Example: psychological support line — activated when leaving crisis mode."),
        header: ["mesure", "declencheur"],
        fields: [
          { id: "mesure", type: "textarea", required: true, label: L("Mesure de soutien", "Support measure") },
          { id: "declencheur", type: "text", label: L("Déclencheur", "Trigger") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
        ],
        example: { mesure: L("Cellule d’écoute psychologique pour le personnel", "Psychological support line for staff"), declencheur: L("Sortie de crise", "Leaving crisis mode") },
      },
    ],
  });

  grcFicheRegister("continuite-prl", {
    docTitle: L("Plan de repli / hébergement (PRL)", "Relocation / fallback plan"),
    docRef: "ISO 22301:2019 clause 8.4.4 · ISO A.7.11",
    elements: [
      {
        id: "sites-repli",
        essential: true,
        title: L("Sites de repli", "Fallback sites"),
        ref: L("ISO 22301 cl. 8.4.4 · ISO A.7.11", "ISO 22301 cl. 8.4.4 · ISO A.7.11"),
        lead: L("Où les équipes travaillent si les locaux habituels sont inaccessibles.", "Where teams work if the usual premises are inaccessible."),
        desc: L("Une entrée par site, avec sa capacité, son délai d’activation et le fournisseur/hébergeur. Exemple : bureau partagé de Laval — 10 postes — activable en 4 h.",
          "One entry per site, with capacity, activation time and provider/host. Example: Laval shared office — 10 desks — activatable in 4 h."),
        header: ["site", "capacite"],
        fields: [
          { id: "site", type: "text", required: true, label: L("Site de repli", "Fallback site") },
          { id: "capacite", type: "text", label: L("Capacité", "Capacity") },
          { id: "delai", type: "text", suggest: "delai", label: L("Délai d’activation", "Activation time") },
          { id: "fournisseurs", linkTo: "supplier", multi: true, label: L("Hébergeur / fournisseur", "Host / supplier") },
        ],
        example: { site: L("Bureau partagé de Laval", "Laval shared office"), capacite: L("10 postes", "10 desks"), delai: L("4 h", "4 h") },
      },
      {
        id: "activation",
        title: L("Activation et accès", "Activation and access"),
        ref: L("ISO 22301 cl. 8.4.4", "ISO 22301 cl. 8.4.4"),
        desc: L("Comment on ouvre et sécurise le site de repli, et qui y a accès. Exemple : clés chez le gardien — accès validé par le responsable des opérations.",
          "How the fallback site is opened and secured, and who has access. Example: keys held by the caretaker — access approved by the operations manager."),
        header: ["etape", "responsable"],
        fields: [
          { id: "etape", type: "textarea", required: true, label: L("Étape d’activation", "Activation step") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
        ],
        example: { etape: L("Récupérer les clés chez le gardien et ouvrir le site", "Collect the keys from the caretaker and open the site"), responsable: L("Responsable des opérations", "Operations manager") },
      },
    ],
  });

  grcFicheRegister("continuite-plog", {
    docTitle: L("Plan logistique (PLOG)", "Logistics plan"),
    docRef: "ISO 22301:2019 clause 8.3.2",
    elements: [
      {
        id: "ressources-materielles",
        essential: true,
        title: L("Matériel et approvisionnement", "Equipment and supplies"),
        ref: L("ISO 22301 cl. 8.3.2", "ISO 22301 cl. 8.3.2"),
        lead: L("Le matériel indispensable pour fonctionner en mode dégradé, et comment le réapprovisionner.", "The equipment essential to run in degraded mode, and how to resupply it."),
        desc: L("Une entrée par ressource matérielle critique, avec le stock de secours et le fournisseur. Exemple : groupe électrogène — 48 h de carburant — fournisseur X.",
          "One entry per critical material resource, with contingency stock and supplier. Example: generator — 48 h of fuel — supplier X."),
        header: ["ressource", "stock"],
        fields: [
          { id: "ressource", type: "text", required: true, label: L("Ressource matérielle", "Material resource") },
          { id: "actifs", linkTo: "asset", multi: true, label: L("Actifs liés", "Linked assets") },
          { id: "stock", type: "text", label: L("Stock de secours", "Contingency stock") },
          { id: "fournisseurs", linkTo: "supplier", multi: true, label: L("Fournisseurs", "Suppliers") },
        ],
        example: { ressource: L("Groupe électrogène", "Generator"), stock: L("48 h de carburant", "48 h of fuel") },
      },
      {
        id: "transport",
        title: L("Transport et acheminement", "Transport and delivery"),
        ref: L("ISO 22301 cl. 8.3.2", "ISO 22301 cl. 8.3.2"),
        desc: L("Comment les personnes et le matériel sont acheminés vers les sites en crise. Exemple : navette vers le site de repli — transporteur Y — sur appel.",
          "How people and equipment reach the sites during a crisis. Example: shuttle to the fallback site — carrier Y — on call."),
        header: ["besoin", "moyen"],
        fields: [
          { id: "besoin", type: "text", required: true, label: L("Besoin", "Need") },
          { id: "moyen", type: "text", label: L("Moyen", "Means") },
          { id: "fournisseurs", linkTo: "supplier", multi: true, label: L("Transporteur", "Carrier") },
        ],
        example: { besoin: L("Navette vers le site de repli", "Shuttle to the fallback site"), moyen: L("Transporteur sur appel", "Carrier on call") },
      },
    ],
  });

  grcFicheRegister("continuite-pdep", {
    docTitle: L("Plan de gestion des dépenses (PDEP)", "Expense management plan"),
    docRef: "ISO 22301:2019 clause 7.1 · délégations financières",
    elements: [
      {
        id: "delegations",
        essential: true,
        title: L("Délégations de dépense d’urgence", "Emergency spending delegations"),
        ref: L("ISO 22301 cl. 7.1 · 8.4.2", "ISO 22301 cl. 7.1 · 8.4.2"),
        lead: L("Qui peut engager des dépenses en crise, jusqu’à quel montant, sans la procédure habituelle.", "Who may commit spending in a crisis, up to what amount, outside the usual process."),
        desc: L("Une entrée par délégation, avec le seuil et le signataire. Exemple : directrice des opérations — jusqu’à 25 k$ — par courriel confirmé.",
          "One entry per delegation, with the threshold and signatory. Example: operations director — up to $25k — by confirmed email."),
        header: ["signataire", "seuil"],
        fields: [
          { id: "signataire", type: "text", required: true, suggest: { vocab: "roles", from: ["role"] }, label: L("Signataire", "Signatory") },
          { id: "roleId", linkTo: "role", label: L("Rôle", "Role") },
          { id: "seuil", type: "text", label: L("Seuil / montant", "Threshold / amount") },
          { id: "modalite", type: "text", label: L("Modalité d’approbation", "Approval method") },
        ],
        example: { signataire: L("Directrice des opérations", "Operations director"), seuil: L("Jusqu’à 25 k$", "Up to $25k"), modalite: L("Courriel confirmé", "Confirmed email") },
      },
      {
        id: "suivi",
        title: L("Suivi des dépenses de crise", "Crisis spending log"),
        ref: L("ISO 22301 cl. 7.5 · 9.1", "ISO 22301 cl. 7.5 · 9.1"),
        desc: L("Le journal des dépenses engagées en crise, pour la justification, l’assurance et le RETEX. Une entrée par dépense.",
          "The log of spending committed during the crisis, for justification, insurance and lessons learned. One entry per expense."),
        header: ["depense", "montant"],
        fields: [
          { id: "date", type: "date", label: L("Date", "Date") },
          { id: "depense", type: "text", required: true, label: L("Dépense", "Expense") },
          { id: "montant", type: "text", label: L("Montant", "Amount") },
          { id: "justificatif", type: "text", label: L("Justificatif", "Supporting document") },
        ],
        example: { depense: L("Location de 10 postes au site de repli", "Rental of 10 desks at the fallback site"), montant: "8 000 $" },
      },
    ],
  });

  grcFicheRegister("continuite-prii", {
    docTitle: L("Plan de réponse aux incidents informatiques (PRII)", "IT incident response plan (CIRP)"),
    docRef: "ISO/IEC 27035 · ISO 27001 A.5.24–A.5.28",
    elements: [
      {
        id: "detection",
        essential: true,
        title: L("Détection et qualification", "Detection and triage"),
        ref: L("ISO 27035 · ISO A.5.24 · A.5.25", "ISO 27035 · ISO A.5.24 · A.5.25"),
        lead: L("Comment un incident informatique est repéré, qualifié et classé en gravité.", "How an IT incident is detected, triaged and rated for severity."),
        desc: L("Une entrée par source de détection ou critère de qualification. Exemple : alerte EDR — gravité élevée — escalade à l’astreinte sécurité.",
          "One entry per detection source or triage criterion. Example: EDR alert — high severity — escalate to the security on-call."),
        header: ["source", "gravite"],
        fields: [
          { id: "source", type: "text", required: true, label: L("Source / critère", "Source / criterion") },
          { id: "gravite", type: "select", label: L("Gravité", "Severity"), options: [
            O("faible", "Faible", "Low"), O("moyenne", "Moyenne", "Medium"), O("elevee", "Élevée", "High"), O("critique", "Critique", "Critical")] },
          { id: "escalade", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Escalade vers", "Escalate to") },
        ],
        example: { source: L("Alerte EDR", "EDR alert"), gravite: "elevee", escalade: L("Astreinte sécurité", "Security on-call") },
      },
      {
        id: "reponse",
        essential: true,
        title: L("Endiguement, éradication, reprise", "Containment, eradication, recovery"),
        ref: L("ISO 27035 · ISO A.5.26 · NIST RS/RC", "ISO 27035 · ISO A.5.26 · NIST RS/RC"),
        lead: L("Les étapes pour limiter, supprimer puis se remettre de l’incident, en lien avec le PRI.", "The steps to limit, remove then recover from the incident, linked to the IT recovery plan."),
        desc: L("Une entrée par étape, dans l’ordre. Exemple : 1. isoler les postes touchés du réseau. Les preuves sont conservées avant toute remise en état.",
          "One entry per step, in order. Example: 1. isolate affected hosts from the network. Evidence is preserved before any restoration."),
        header: ["etape", "ordre"],
        fields: [
          ORDRE,
          { id: "etape", type: "textarea", required: true, label: L("Étape", "Step") },
          { id: "phase", type: "select", label: L("Phase", "Phase"), options: [
            O("endiguement", "Endiguement", "Containment"), O("eradication", "Éradication", "Eradication"),
            O("reprise", "Reprise", "Recovery"), O("preuves", "Préservation des preuves", "Evidence preservation")] },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
        ],
        example: { ordre: "1", etape: L("Isoler les postes touchés du réseau", "Isolate affected hosts from the network"), phase: "endiguement" },
      },
    ],
  });
})();
