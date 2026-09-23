/* Documentation — Contexte organisationnel (grc/contexte-organisationnel.html)
   ISO 27001 clause 4 · ISO 22301 clause 4. Première page d'une démarche
   GRC : on décrit l'organisation AVANT d'analyser ses risques.

   Un élément = un registre d'entrées (moteur : grc-fiches.js). L'ordre
   des éléments est l'ordre dans lequel un praticien les documente. Les
   descriptions guident un débutant : quoi écrire, pourquoi, exemple.
   Les identifiants (éléments, champs, options) sont STABLES : les
   renommer orphelinerait les entrées déjà saisies. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const STATUT = { id: "statut", type: "select", label: L("Statut", "Status"), options: [
    O("brouillon", "Brouillon", "Draft"), O("approuve", "Approuvé", "Approved"), O("retire", "Retiré", "Retired"),
  ] };
  const APPROUVE_PAR = { id: "approuvePar", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Approuvé par", "Approved by") };
  const DATE_APPRO = { id: "dateApprobation", type: "text", label: L("Date d’approbation (AAAA-MM-JJ)", "Approval date (YYYY-MM-DD)") };

  grcFicheRegister("contexte-organisationnel", {
    docTitle: L("Contexte de l’organisation", "Context of the organization"),
    docRef: "ISO/IEC 27001:2022 clause 4 · ISO 22301:2019 clause 4",
    elements: [
      {
        id: "mission-vision",
        example: { type: "mission", enonce: L("Offrir aux PME des services comptables fiables et confidentiels", "Provide SMEs with reliable, confidential accounting services"), securite: L("La confidentialité des dossiers clients", "Confidentiality of client files"), statut: "brouillon" },
        essential: true,
        title: L("Mission et vision", "Mission and vision"),
        ref: L("ISO 27001 cl. 4.1 · 5.1", "ISO 27001 cl. 4.1 · 5.1"),
        desc: L(
          "Point de départ : ce que l’organisation fait et vers où elle va. Ajoute une entrée par énoncé (mission, vision, chaque valeur, chaque objectif d’affaires). Tout le reste du SGSI devra servir ces énoncés. Exemple de mission : « Offrir aux PME du Québec des services comptables fiables et confidentiels ».",
          "Starting point: what the organization does and where it is heading. Add one entry per statement (mission, vision, each value, each business objective). The rest of the ISMS must serve these statements. Example mission: \"Provide Quebec SMEs with reliable, confidential accounting services\"."),
        header: ["enonce", "type"],
        fields: [
          { id: "type", type: "select", label: L("Type d’énoncé", "Statement type"), options: [
            O("mission", "Mission", "Mission"), O("vision", "Vision", "Vision"),
            O("valeur", "Valeur", "Value"), O("objectif", "Objectif d’affaires", "Business objective"),
          ] },
          { id: "enonce", type: "textarea", required: true, label: L("Énoncé", "Statement") },
          { id: "securite", type: "textarea", label: L("Ce que la sécurité doit protéger ou permettre", "What security must protect or enable") },
          STATUT, APPROUVE_PAR, DATE_APPRO,
        ],
      },
      {
        id: "contexte-interne",
        example: { facteur: "competences", nature: "faiblesse", constat: L("Une seule personne administre les serveurs, pas de suppléant", "A single person administers the servers, no deputy"), incidence: L("Arrêt prolongé si cette personne est absente", "Extended outage if this person is absent") },
        essential: true,
        title: L("Contexte interne", "Internal context"),
        ref: L("ISO 27001 cl. 4.1 · ISO 22301 cl. 4.1", "ISO 27001 cl. 4.1 · ISO 22301 cl. 4.1"),
        desc: L(
          "Ce qui, à l’intérieur de l’organisation, aide ou freine la sécurité. Une entrée par constat. Pense structure, culture, compétences, budget, technologies, façons de travailler. Exemple : faiblesse, compétences — « Une seule personne administre les serveurs, pas de suppléant ».",
          "What, inside the organization, helps or hinders security. One entry per finding. Think structure, culture, skills, budget, technology, ways of working. Example: weakness, skills — \"A single person administers the servers, no deputy\"."),
        header: ["constat", "facteur", "nature"],
        fields: [
          { id: "facteur", type: "select", label: L("Facteur", "Factor"), options: [
            O("gouvernance", "Gouvernance et structure", "Governance and structure"),
            O("culture", "Culture et sensibilisation", "Culture and awareness"),
            O("competences", "Ressources humaines et compétences", "People and skills"),
            O("finances", "Ressources financières", "Financial resources"),
            O("si", "Systèmes d’information et technologies", "Information systems and technology"),
            O("processus", "Processus et méthodes", "Processes and methods"),
            O("engagements", "Engagements et politiques internes", "Internal commitments and policies"),
            O("autre", "Autre", "Other"),
          ] },
          { id: "nature", type: "select", label: L("Nature", "Nature"), options: [
            O("faiblesse", "Faiblesse", "Weakness"), O("force", "Force", "Strength"),
          ] },
          { id: "constat", type: "textarea", required: true, label: L("Constat", "Finding") },
          { id: "incidence", type: "textarea", label: L("Incidence sur la sécurité ou la continuité", "Impact on security or continuity") },
          { id: "source", type: "text", suggest: "source-interne", label: L("Source (entrevue, audit, document…)", "Source (interview, audit, document…)") },
        ],
      },
      {
        id: "contexte-externe",
        cross: [{ label: L("Créer un risque", "Create a risk"), page: "analyse-risques", tab: "registre", list: "renderGrcRiskRegistry", values: (e) => ({ name: e.constat || "", threat: e.constat || "", menaceIds: [e.id] }) }],
        example: { facteur: "legal", nature: "menace", constat: L("La Loi 25 impose de déclarer les incidents de confidentialité", "Bill 25 requires reporting privacy incidents") },
        essential: true,
        title: L("Contexte externe", "External context"),
        ref: L("ISO 27001 cl. 4.1 · ISO 22301 cl. 4.1", "ISO 27001 cl. 4.1 · ISO 22301 cl. 4.1"),
        desc: L(
          "Ce qui, à l’extérieur, crée des menaces ou des opportunités : lois, clients, concurrence, cybercriminalité, fournisseurs, économie. Une entrée par constat. Exemple : menace, légal — « La Loi 25 impose de déclarer les incidents de confidentialité à la CAI ».",
          "What, outside, creates threats or opportunities: laws, customers, competition, cybercrime, suppliers, economy. One entry per finding. Example: threat, legal — \"Quebec's Bill 25 requires reporting privacy incidents to the CAI\"."),
        header: ["constat", "facteur", "nature"],
        fields: [
          { id: "facteur", type: "select", label: L("Facteur", "Factor"), options: [
            O("legal", "Légal et réglementaire", "Legal and regulatory"),
            O("contractuel", "Contractuel", "Contractual"),
            O("marche", "Marché et concurrence", "Market and competition"),
            O("menaces", "Menaces et cybercriminalité", "Threats and cybercrime"),
            O("technologique", "Technologique", "Technological"),
            O("economique", "Économique et financier", "Economic and financial"),
            O("social", "Social et environnemental", "Social and environmental"),
            O("fournisseurs", "Fournisseurs et partenaires", "Suppliers and partners"),
            O("autre", "Autre", "Other"),
          ] },
          { id: "nature", type: "select", label: L("Nature", "Nature"), options: [
            O("menace", "Menace", "Threat"), O("opportunite", "Opportunité", "Opportunity"),
          ] },
          { id: "constat", type: "textarea", required: true, label: L("Constat", "Finding") },
          { id: "incidence", type: "textarea", hint: L("En quoi ce facteur peut toucher la sécurité ou la continuité ?", "How could this factor affect security or continuity?"), label: L("Incidence sur la sécurité ou la continuité", "Impact on security or continuity") },
          { id: "source", type: "text", suggest: "source-veille", label: L("Source de veille", "Monitoring source") },
        ],
      },
      {
        id: "parties-prenantes",
        example: { partie: L("Clients", "Customers"), attentes: L("Confidentialité de leurs dossiers, service disponible", "Confidentiality of their files, available service") },
        essential: true,
        title: L("Parties prenantes", "Interested parties"),
        ref: L("ISO 27001 cl. 4.2 a) · ISO 22301 cl. 4.2.1", "ISO 27001 cl. 4.2 a) · ISO 22301 cl. 4.2.1"),
        desc: L(
          "Qui est concerné par la sécurité de l’information de l’organisation, et qu’attend-il ? Une entrée par partie : clients, employés, direction, fournisseurs, autorités, assureurs… Exemple : « Clients PME » (externe) — attendent que leurs données financières restent confidentielles.",
          "Who is concerned by the organization's information security, and what do they expect? One entry per party: customers, employees, management, suppliers, authorities, insurers… Example: \"SME customers\" (external) — expect their financial data to stay confidential."),
        header: ["partie", "categorie", "influence"],
        fields: [
          { id: "partie", type: "text", required: true, suggest: "partie", label: L("Partie prenante", "Interested party") },
          { id: "categorie", type: "select", label: L("Interne / externe", "Internal / external"), options: [
            O("externe", "Externe", "External"), O("interne", "Interne", "Internal"),
          ] },
          { id: "type", type: "select", label: L("Type", "Type"), options: [
            O("client", "Client", "Customer"),
            O("employe", "Employé", "Employee"),
            O("direction", "Direction", "Management"),
            O("actionnaire", "Actionnaire / investisseur", "Shareholder / investor"),
            O("fournisseur", "Fournisseur / partenaire", "Supplier / partner"),
            O("autorite", "Autorité / régulateur", "Authority / regulator"),
            O("assureur", "Assureur", "Insurer"),
            O("public", "Public / communauté", "Public / community"),
            O("autre", "Autre", "Other"),
          ] },
          { id: "attentes", type: "textarea", label: L("Attentes envers la sécurité", "Security expectations") },
          { id: "influence", type: "select", label: L("Influence", "Influence"), options: [
            O("moyenne", "Moyenne", "Medium"), O("forte", "Forte", "High"), O("faible", "Faible", "Low"),
          ] },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable de la relation", "Relationship owner") },
        ],
      },
      {
        id: "exigences-pp",
        cross: [{ label: L("Suivre en conformité", "Track in compliance"), page: "conformite", tab: "registre-conformite", list: "renderGrcObligationsList", values: (e) => ({ title: e.exigence || "", sourceRef: e.reference || "", sourceExigenceId: e.id }) }],
        example: { exigence: L("Protéger les renseignements personnels des clients", "Protect customers’ personal information"), partie: L("Clients", "Customers"), reference: L("Loi 25", "Bill 25") },
        essential: true,
        title: L("Exigences des parties prenantes", "Interested parties’ requirements"),
        ref: L("ISO 27001 cl. 4.2 b) c) · ISO 22301 cl. 4.2.2", "ISO 27001 cl. 4.2 b) c) · ISO 22301 cl. 4.2.2"),
        desc: L(
          "Parmi les attentes notées plus haut, lesquelles deviennent des exigences que le SGSI doit respecter ? Une entrée par exigence, avec sa source (loi, contrat, norme) et la façon dont elle est traitée. Exemple : « Chiffrer les données clients au repos » — contractuelle, clause 8.2 du contrat de service.",
          "Among the expectations noted above, which become requirements the ISMS must meet? One entry per requirement, with its source (law, contract, standard) and how it is addressed. Example: \"Encrypt customer data at rest\" — contractual, clause 8.2 of the service agreement."),
        header: ["exigence", "source", "traitee"],
        fields: [
          { id: "exigence", type: "textarea", required: true, label: L("Exigence", "Requirement") },
          { id: "partie", type: "text", suggest: { vocab: "partie", from: ["pp"] }, label: L("Partie prenante", "Interested party") },
          { id: "source", type: "select", label: L("Source", "Source"), options: [
            O("legale", "Légale / réglementaire", "Legal / regulatory"),
            O("contractuelle", "Contractuelle", "Contractual"),
            O("normative", "Normative", "Standard"),
            O("affaires", "Affaires", "Business"),
            O("autre", "Autre", "Other"),
          ] },
          { id: "reference", type: "text", label: L("Référence (article, clause)", "Reference (article, clause)") },
          { id: "traitee", type: "select", label: L("Traitée par le SGSI", "Addressed by the ISMS"), options: [
            O("non", "Non", "No"), O("partiel", "Partiellement", "Partially"), O("oui", "Oui", "Yes"),
          ] },
          { id: "moyen", type: "text", hint: L("Quel contrôle, processus ou document y répond ?", "Which control, process or document addresses it?"), label: L("Comment (contrôle, processus, document)", "How (control, process, document)") },

          { id: "partieId", linkTo: "pp", label: L("Partie prenante (liée)", "Interested party (linked)") },
        ],
        links: [{ href: "conformite.html", label: L("Gestion de la conformité", "Compliance management") }],
      },
      {
        id: "portee-sgsi",
        example: { description: L("Siège social de Montréal et services infonuagiques de production", "Montreal head office and production cloud services"), justification: L("Là où sont traités les dossiers clients", "Where client files are processed"), statut: "brouillon" },
        essential: true,
        title: L("Portée du SGSI", "ISMS scope"),
        ref: L("ISO 27001 cl. 4.3", "ISO 27001 cl. 4.3"),
        desc: L(
          "Maintenant que l’organisation, ses enjeux et ses exigences sont connus : que couvre le SGSI ? Commence par une entrée « Énoncé de la portée » (une ou deux phrases, comme sur un certificat), puis une entrée par unité, site, système, interface externe — et chaque exclusion avec sa justification.",
          "Now that the organization, its issues and its requirements are known: what does the ISMS cover? Start with a \"Scope statement\" entry (one or two sentences, as on a certificate), then one entry per unit, site, system, external interface — and each exclusion with its justification."),
        header: ["description", "element"],
        fields: [
          { id: "element", type: "select", label: L("Élément de portée", "Scope item"), options: [
            O("enonce", "Énoncé de la portée", "Scope statement"),
            O("unite", "Unité organisationnelle incluse", "Organizational unit included"),
            O("site", "Site inclus", "Site included"),
            O("systeme", "Système / service inclus", "System / service included"),
            O("donnees", "Données incluses", "Data included"),
            O("interface", "Interface / dépendance externe", "External interface / dependency"),
            O("exclusion", "Exclusion", "Exclusion"),
          ] },
          { id: "description", type: "textarea", required: true, label: L("Description", "Description") },
          { id: "justification", type: "textarea", label: L("Justification (obligatoire pour une exclusion)", "Justification (required for an exclusion)") },
          STATUT, APPROUVE_PAR, DATE_APPRO,

          { id: "actifs", linkTo: "asset", multi: true, label: L("Actifs couverts", "Covered assets") },
        ],
      },
      {
        id: "portee-pca",
        example: { description: L("Services de paie et de comptabilité clients", "Client payroll and accounting services"), statut: "brouillon" },
        title: L("Portée du PCA", "BCP scope"),
        ref: L("ISO 22301 cl. 4.3", "ISO 22301 cl. 4.3"),
        desc: L(
          "Quels produits, services et activités doivent continuer en cas de sinistre ? Même logique que la portée du SGSI : un énoncé, puis une entrée par activité, site ou exigence de continuité, et chaque exclusion justifiée. Ces activités seront ensuite évaluées dans le BIA.",
          "Which products, services and activities must continue during a disruption? Same logic as the ISMS scope: a statement, then one entry per activity, site or continuity requirement, and each justified exclusion. These activities are then assessed in the BIA."),
        header: ["description", "element"],
        fields: [
          { id: "element", type: "select", label: L("Élément de portée", "Scope item"), options: [
            O("enonce", "Énoncé de la portée", "Scope statement"),
            O("activite", "Produit / service / activité couvert", "Product / service / activity covered"),
            O("site", "Site couvert", "Site covered"),
            O("exigence", "Exigence légale ou contractuelle de continuité", "Legal or contractual continuity requirement"),
            O("exclusion", "Exclusion", "Exclusion"),
          ] },
          { id: "description", type: "textarea", required: true, label: L("Description", "Description") },
          { id: "justification", type: "textarea", hint: L("Pourquoi ce service est-il exclu ? (obligatoire pour une exclusion)", "Why is this service excluded? (required for an exclusion)"), label: L("Justification (obligatoire pour une exclusion)", "Justification (required for an exclusion)") },
          STATUT, APPROUVE_PAR, DATE_APPRO,
        ],
        links: [
          { href: "continuite/bia.html", label: L("BIA et dépendances métier", "BIA and business dependencies") },
          { href: "continuite/pca.html", label: L("PCA — Plan de continuité des activités", "BCP — Business Continuity Plan") },
        ],
      },
      {
        id: "enjeux-affaires",
        cross: [{ label: L("Créer un risque", "Create a risk"), page: "analyse-risques", tab: "registre", list: "renderGrcRiskRegistry", values: (e) => ({ name: e.enjeu || "", consequences: e.consequence || "", enjeuIds: [e.id] }) }],
        example: { enjeu: L("Garder la confiance des clients", "Keep customers’ trust"), consequence: L("Perte de clients après une fuite", "Customer loss after a leak") },
        essential: true,
        title: L("Enjeux d’affaires", "Business stakes"),
        ref: L("ISO 27001 cl. 4.1 · 6.1.1", "ISO 27001 cl. 4.1 · 6.1.1"),
        desc: L(
          "La synthèse de tout ce qui précède : ce qui compte vraiment pour l’organisation et ce qu’elle perdrait si la sécurité échouait. Une entrée par enjeu, classée et priorisée — c’est l’entrée directe de l’analyse des risques. Exemple : disponibilité, haute — « La plateforme de facturation ne peut pas être arrêtée plus de 24 h en fin de mois ».",
          "The synthesis of everything above: what truly matters to the organization and what it would lose if security failed. One entry per stake, categorized and prioritized — the direct input to the risk analysis. Example: availability, high — \"The billing platform cannot be down for more than 24 h at month-end\"."),
        header: ["enjeu", "categorie", "priorite"],
        fields: [
          { id: "enjeu", type: "textarea", required: true, label: L("Enjeu", "Stake") },
          { id: "categorie", type: "select", label: L("Catégorie", "Category"), options: [
            O("confidentialite", "Confidentialité", "Confidentiality"),
            O("integrite", "Intégrité", "Integrity"),
            O("disponibilite", "Disponibilité", "Availability"),
            O("tracabilite", "Traçabilité", "Traceability"),
            O("conformite", "Conformité", "Compliance"),
            O("reputation", "Réputation", "Reputation"),
            O("financier", "Financier", "Financial"),
            O("operationnel", "Opérationnel", "Operational"),
          ] },
          { id: "consequence", type: "textarea", label: L("Conséquence si non maîtrisé", "Consequence if not managed") },
          { id: "priorite", type: "select", label: L("Priorité", "Priority"), options: [
            O("haute", "Haute", "High"), O("moyenne", "Moyenne", "Medium"), O("basse", "Basse", "Low"),
          ] },

          { id: "processus", linkTo: "processus", multi: true, label: L("Processus concernés", "Processes concerned") },
        ],
        links: [{ href: "analyse-risques.html", label: L("Analyse des risques (étape suivante)", "Risk analysis (next step)") }],
      },
      {
        id: "cartographie-processus",
        cross: [{ label: L("Créer le plan de continuité", "Create the continuity plan"), page: "continuite", tab: "registre", list: "grcContinuityOpenWith", values: (e) => ({ service: e.nom || "", processId: e.id }) }],
        example: { nom: L("Paie des clients", "Client payroll"), proprietaire: L("Directrice des opérations", "Operations director"), finalite: L("Verser les salaires des employés des clients à temps", "Pay clients’ employees on time") },
        essential: true,
        title: L("Cartographie des processus", "Process map"),
        ref: L("ISO 27001 cl. 4.4 · ISO 22301 cl. 8.2.2", "ISO 27001 cl. 4.4 · ISO 22301 cl. 8.2.2"),
        desc: L(
          "Comment l’organisation fonctionne concrètement : ses processus métier (ce qu’elle livre), de pilotage (comment elle décide) et de soutien (TI, RH, finances). Une entrée par processus, avec son propriétaire, sa criticité et ses dépendances — le BIA partira de cette liste.",
          "How the organization actually works: its core processes (what it delivers), management processes (how it decides) and support processes (IT, HR, finance). One entry per process, with its owner, criticality and dependencies — the BIA starts from this list."),
        header: ["nom", "type", "criticite"],
        fields: [
          { id: "nom", type: "text", required: true, label: L("Processus", "Process") },
          { id: "type", type: "select", label: L("Type", "Type"), options: [
            O("metier", "Métier (réalisation)", "Core (delivery)"),
            O("pilotage", "Pilotage", "Management"),
            O("soutien", "Soutien", "Support"),
          ] },
          { id: "proprietaire", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Propriétaire", "Owner") },
          { id: "finalite", type: "textarea", label: L("Finalité, entrées et sorties", "Purpose, inputs and outputs") },
          { id: "criticite", type: "select", label: L("Criticité", "Criticality"), options: [
            O("important", "Important", "Important"), O("vital", "Vital", "Vital"),
            O("critique", "Critique", "Critical"), O("differable", "Différable", "Deferrable"),
          ] },
          { id: "dependances", type: "textarea", hint: L("Systèmes, fournisseurs, personnes clés sans lesquels le processus s’arrête", "Systems, suppliers, key people without whom the process stops"), label: L("Dépendances (SI, fournisseurs, personnes)", "Dependencies (IT, suppliers, people)") },

          { id: "actifs", linkTo: "asset", multi: true, label: L("Actifs utilisés", "Assets used") },
          { id: "fournisseurs", linkTo: "supplier", multi: true, label: L("Fournisseurs", "Suppliers") },
        ],
        links: [{ href: "continuite/bia.html", label: L("BIA et dépendances métier", "BIA and business dependencies") }],
      },
    ],
  });
})();
