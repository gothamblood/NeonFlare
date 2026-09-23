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

  grcFicheRegister("continuite-bia", {
    docTitle: L("Bilan d’impact sur les activités (BIA)", "Business impact analysis (BIA)"),
    docRef: "ISO 22301:2019 clause 8.2.2 · ISO/TS 22317",
    elements: [
      {
        id: "synthese",
        kind: "view",
        essential: true,
        title: L("Synthèse du BIA", "BIA summary"),
        ref: L("ISO 22301 cl. 8.2.2", "ISO 22301 cl. 8.2.2"),
        desc: L("Tiré du registre PCA/PRA : processus couvert, criticité, DMIA, DMIA suggérée par les impacts dans le temps, RTO, RPO. Les impacts par horizon se saisissent dans le registre, onglet « BIA dans le temps ».",
          "Taken from the BCP/DRP register: covered process, criticality, MTPD, MTPD suggested by impacts over time, RTO, RPO. Impacts per horizon are entered in the register, \"BIA over time\" tab."),
        table: () => {
          const fmt = (m) => (typeof contFmtDuration === "function" ? contFmtDuration(m) : (m == null ? "" : String(m)));
          const plans = grcFicheSrc.continuity();
          return {
            columns: [L("Service", "Service"), L("Processus", "Process"), L("Criticité", "Criticality"), L("DMIA", "MTPD"), L("DMIA suggérée", "Suggested MTPD"), L("RTO", "RTO"), L("RPO", "RPO")],
            rows: plans.map((p) => {
              const b = p.bia || {};
              const sug = typeof grcContSuggestedMtd === "function" && typeof grcContinuityEnsureShape === "function" ? grcContSuggestedMtd(grcContinuityEnsureShape(p)) : null;
              return [p.service || "", p.processId && typeof grcLinksLabel === "function" ? grcLinksLabel("processus", p.processId) : "",
                p.criticality || "", fmt(b.mtdMin), fmt(sug), fmt(b.rtoMin), fmt(b.rpoMin)];
            }),
            empty: L("Aucun plan dans le registre (Continuité › Registre PCA/PRA).", "No plan in the register (Continuity › BCP/DRP register)."),
          };
        },
        manage: "../continuite.html#fiche-registre",
      },
    ],
  });

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
    docRef: "ISO 22301:2019 clauses 8.4.2, 8.4.3",
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
        ref: L("ISO 22301 cl. 8.4.2", "ISO 22301 cl. 8.4.2"),
        desc: L("Les seuils qui font passer d’un incident à une crise, et qui décide. Exemple : niveau 2 — plusieurs services clients arrêtés — le directeur général convoque la cellule.",
          "The thresholds that turn an incident into a crisis, and who decides. Example: level 2 — several customer services down — the CEO convenes the cell."),
        header: ["niveau", "critere"],
        fields: [
          { id: "niveau", type: "select", label: L("Niveau", "Level"), options: [O("1", "1 — Alerte", "1 — Alert"), O("2", "2 — Crise", "2 — Crisis"), O("3", "3 — Crise majeure", "3 — Major crisis")] },
          { id: "critere", type: "textarea", required: true, label: L("Critères", "Criteria") },
          { id: "autorite", linkTo: "role", label: L("Qui décide", "Who decides") },
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
    docTitle: L("Plan de communication de crise (PCM)", "Crisis communication plan"),
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
    docRef: "ISO 22301:2019 clause 8.4.4 · ISO 27031",
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
    docRef: "ISO 22301:2019 clause 8.3 · ISO 27031",
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
    docRef: "ISO 22301:2019 clause 8.4.4 · ISO 27031",
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
    docRef: "ISO 22301:2019 clause 8.5",
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
          { id: "type", type: "select", label: L("Type", "Type"), options: [O("ttx", "Sur table (TTX)", "Tabletop (TTX)"), O("simulation", "Simulation", "Simulation"), O("bascule", "Bascule réelle", "Real failover"), O("complet", "Exercice complet", "Full exercise")] },
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
})();
