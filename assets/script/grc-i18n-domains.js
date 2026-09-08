/* Traductions du contenu des 16 pages de domaine GRC "simples"
   (grc/architecture.html, cloud.html, conformite.html,
   contexte-organisationnel.html, continuite.html, devsecops.html,
   directives.html, documentation.html, fournisseurs.html,
   gouvernance.html, iam.html, indicateurs.html, procedures.html,
   traitement-risques.html, vie-privee.html, vulnerabilites.html) --
   séparé de grc-i18n.js (qui couvre déjà actifs, analyse-risques,
   controles, incidents et les clés grc.common.*) pour éviter les
   conflits d'édition entre les deux fichiers.

   Chargé après i18n.js et grc-i18n.js, avant grc-checklist.js -- voir
   l'ordre des balises script dans chacune des 16 pages ci-dessus.

   Deux familles de gabarit HTML coexistent parmi ces 16 pages :
   - Gabarit "checklist" (contexte-organisationnel, continuite,
     directives, documentation, gouvernance, procedures,
     traitement-risques) : un h2 "Contenu à inclure" (clé partagée
     grc.common.contentInclude, définie dans grc-i18n.js) suivi d'une
     liste <strong>libellé</strong> : description, puis un h2 "Rôle en
     GRC" (clé partagée grc.common.roleTitle) suivi d'un paragraphe de
     rôle -- clés grc.<slug>.itemN.label / itemN.desc / role.
   - Gabarit "pourquoi/quoi" (architecture, cloud, conformite,
     devsecops, fournisseurs, iam, indicateurs, vie-privee,
     vulnerabilites) : un h2 "Pourquoi c'est important" suivi d'une
     liste de phrases simples, puis un h2 "Ce que cette section doit
     contenir" suivi d'une autre liste -- pas de section de rôle sur
     ces pages. Ces deux titres ne sont pas repris tels quels ailleurs
     dans le dossier grc/, donc chaque page définit ses propres clés
     grc.<slug>.whyTitle / whyN / includeTitle / itemN plutôt que
     d'ajouter de nouvelles clés grc.common.* (qui appartiennent à
     grc-i18n.js, pas à ce fichier).

   Chaque page fournit aussi grc.<slug>.hubCard.title et .hubCard.desc
   -- texte affiché sur la carte cliquable du hub (grc/index.html),
   copié tel quel depuis grc/index.js (grcIndexConfig.domains). */

Object.assign(I18N_DICT, {
  // ===================== architecture =====================
  "grc.architecture.title": { fr: "Architecture de sécurité", en: "Security Architecture" },
  "grc.architecture.subtitle": {
    fr: "L’architecture de sécurité décrit la structure technique qui met en œuvre la gouvernance et les contrôles définis ailleurs dans le programme GRC.",
    en: "Security architecture describes the technical structure that implements the governance and controls defined elsewhere in the GRC program."
  },
  "grc.architecture.hubCard.title": { fr: "Architecture de sécurité", en: "Security Architecture" },
  "grc.architecture.hubCard.desc": {
    fr: "Structure technique de la sécurité : réseau, applicatif, cloud, modèles Zero Trust / Defense in Depth.",
    en: "Technical structure of security: network, application, cloud, Zero Trust / Defense in Depth models."
  },
  "grc.architecture.whyTitle": { fr: "Pourquoi c’est important", en: "Why it matters" },
  "grc.architecture.why1": { fr: "Permet de montrer la structure technique de la sécurité.", en: "Shows the technical structure of security." },
  "grc.architecture.why2": {
    fr: "Essentiel pour démontrer la cohérence entre l’architecture technique et la gouvernance GRC.",
    en: "Essential for demonstrating consistency between the technical architecture and GRC governance."
  },
  "grc.architecture.includeTitle": { fr: "Ce que cette section doit contenir", en: "What this section should include" },
  "grc.architecture.item1": { fr: "Modèle de sécurité (Zero Trust, Defense in Depth)", en: "Security model (Zero Trust, Defense in Depth)" },
  "grc.architecture.item2": { fr: "Architecture réseau", en: "Network architecture" },
  "grc.architecture.item3": { fr: "Architecture applicative", en: "Application architecture" },
  "grc.architecture.item4": { fr: "Architecture cloud / on-prem", en: "Cloud / on-prem architecture" },
  "grc.architecture.item5": { fr: "Diagrammes techniques", en: "Technical diagrams" },

  // ===================== cloud =====================
  "grc.cloud.title": { fr: "Cloud Security", en: "Cloud Security" },
  "grc.cloud.subtitle": {
    fr: "Décrire les mesures de sécurité spécifiques aux environnements cloud utilisés par l’organisation, le cas échéant.",
    en: "Describes the security measures specific to the cloud environments the organization uses, where applicable."
  },
  "grc.cloud.hubCard.title": { fr: "Cloud Security", en: "Cloud Security" },
  "grc.cloud.hubCard.desc": {
    fr: "Sécurité des environnements cloud (IaaS/PaaS/SaaS), si l’organisation en dépend.",
    en: "Security of cloud environments (IaaS/PaaS/SaaS), where the organization relies on them."
  },
  "grc.cloud.whyTitle": { fr: "Pourquoi c’est important", en: "Why it matters" },
  "grc.cloud.why1": { fr: "Ne s’applique que si l’organisation exploite des services cloud.", en: "Only applies if the organization uses cloud services." },
  "grc.cloud.why2": {
    fr: "Complète les contrôles réseau et applicatifs déjà couverts ailleurs dans le programme.",
    en: "Complements the network and application controls already covered elsewhere in the program."
  },
  "grc.cloud.why3": {
    fr: "Modèle de responsabilité partagée : certains contrôles reviennent au fournisseur, d’autres à l’organisation.",
    en: "Shared responsibility model: some controls fall to the provider, others to the organization."
  },
  "grc.cloud.includeTitle": { fr: "Ce que cette section doit contenir", en: "What this section should include" },
  "grc.cloud.item1": { fr: "Modèle de responsabilité partagée (Shared Responsibility Model)", en: "Shared Responsibility Model" },
  "grc.cloud.item2": { fr: "Configuration sécurisée (CSPM)", en: "Secure configuration (CSPM)" },
  "grc.cloud.item3": {
    fr: "Gestion des identités cloud (IAM cloud, rôles, clés d’accès)",
    en: "Cloud identity management (cloud IAM, roles, access keys)"
  },
  "grc.cloud.item4": { fr: "Chiffrement des données cloud (au repos et en transit)", en: "Cloud data encryption (at rest and in transit)" },
  "grc.cloud.item5": {
    fr: "Sécurité des conteneurs et de l’orchestration (Kubernetes, Docker)",
    en: "Container and orchestration security (Kubernetes, Docker)"
  },
  "grc.cloud.item6": { fr: "Journalisation et surveillance cloud-native", en: "Cloud-native logging and monitoring" },

  // ===================== conformite =====================
  "grc.conformite.title": { fr: "Gestion de la conformité", en: "Compliance Management" },
  "grc.conformite.subtitle": {
    fr: "La gestion de la conformité assure que l’organisation respecte ses obligations légales, contractuelles et normatives, et structure ses audits internes et externes.",
    en: "Compliance management ensures the organization meets its legal, contractual and regulatory obligations, and structures its internal and external audits."
  },
  "grc.conformite.hubCard.title": { fr: "Gestion de la conformité", en: "Compliance Management" },
  "grc.conformite.hubCard.desc": {
    fr: "Respect des lois, normes et obligations contractuelles ; suivi des écarts et des audits.",
    en: "Compliance with laws, standards and contractual obligations; tracking of gaps and audits."
  },
  "grc.conformite.whyTitle": { fr: "Pourquoi c’est important", en: "Why it matters" },
  "grc.conformite.why1": {
    fr: "Assure que l’organisation respecte les lois, normes, obligations contractuelles.",
    en: "Ensures the organization complies with laws, standards and contractual obligations."
  },
  "grc.conformite.why2": { fr: "Permet de suivre les écarts de conformité.", en: "Enables tracking of compliance gaps." },
  "grc.conformite.why3": { fr: "Structure les audits internes et externes.", en: "Structures internal and external audits." },
  "grc.conformite.includeTitle": { fr: "Ce que cette section doit contenir", en: "What this section should include" },
  "grc.conformite.item1": { fr: "Obligations légales (LPRPDE, Loi 25, etc.)", en: "Legal obligations (PIPEDA, Bill 25, etc.)" },
  "grc.conformite.item2": { fr: "Obligations contractuelles", en: "Contractual obligations" },
  "grc.conformite.item3": { fr: "Normes (ISO, NIST, CIS)", en: "Standards (ISO, NIST, CIS)" },
  "grc.conformite.item4": { fr: "Registre de conformité", en: "Compliance register" },
  "grc.conformite.item5": { fr: "Processus d’audit", en: "Audit process" },
  "grc.conformite.item6": { fr: "Suivi des non-conformités", en: "Non-conformity tracking" },

  // ===================== contexte-organisationnel =====================
  "grc.contexte-organisationnel.title": { fr: "Contexte organisationnel", en: "Organizational Context" },
  "grc.contexte-organisationnel.subtitle": {
    fr: "Cette section décrit l’environnement dans lequel la sécurité de l’information doit opérer. Elle sert à comprendre l’entreprise, ses activités, ses enjeux et ses obligations.",
    en: "This section describes the environment in which information security must operate. It helps understand the organization, its activities, its challenges and its obligations."
  },
  "grc.contexte-organisationnel.hubCard.title": { fr: "Contexte organisationnel", en: "Organizational Context" },
  "grc.contexte-organisationnel.hubCard.desc": {
    fr: "Enjeux internes/externes, parties prenantes et périmètre du système de management de la sécurité.",
    en: "Internal/external issues, stakeholders and scope of the information security management system."
  },
  "grc.contexte-organisationnel.item1.label": { fr: "Présentation de l’organisation", en: "Organization overview" },
  "grc.contexte-organisationnel.item1.desc": { fr: "secteur d’activité, taille, services, clientèle.", en: "industry, size, services, customer base." },
  "grc.contexte-organisationnel.item2.label": { fr: "Enjeux informationnels", en: "Information-related concerns" },
  "grc.contexte-organisationnel.item2.desc": {
    fr: "confidentialité, intégrité, disponibilité, traçabilité, conformité.",
    en: "confidentiality, integrity, availability, traceability, compliance."
  },
  "grc.contexte-organisationnel.item3.label": { fr: "Contexte légal", en: "Legal context" },
  "grc.contexte-organisationnel.item3.desc": { fr: "lois provinciales/fédérales, obligations réglementaires.", en: "provincial/federal laws, regulatory obligations." },
  "grc.contexte-organisationnel.item4.label": { fr: "Normes de référence", en: "Reference standards" },
  "grc.contexte-organisationnel.item4.desc": { fr: "ISO 27001, ISO 27005, NIST, CIS.", en: "ISO 27001, ISO 27005, NIST, CIS." },
  "grc.contexte-organisationnel.item5.label": { fr: "Importance stratégique de la sécurité", en: "Strategic importance of security" },
  "grc.contexte-organisationnel.item5.desc": { fr: "impact sur les opérations, réputation, finances.", en: "impact on operations, reputation, finances." },
  "grc.contexte-organisationnel.role": {
    fr: "Le contexte organisationnel permet de comprendre pourquoi la sécurité est essentielle et quels risques sont les plus critiques.",
    en: "Organizational context helps understand why security is essential and which risks are most critical."
  },

  // ===================== continuite =====================
  "grc.continuite.title": { fr: "Plan de continuité (PCA/PRA)", en: "Continuity Plan (BCP/DRP)" },
  "grc.continuite.subtitle": { fr: "Cette section assure la résilience de l’organisation.", en: "This section ensures the organization’s resilience." },
  "grc.continuite.hubCard.title": { fr: "Continuité", en: "Continuity" },
  "grc.continuite.hubCard.desc": {
    fr: "Plans de continuité et de reprise d’activité face aux scénarios de disruption.",
    en: "Business continuity and disaster recovery plans for disruption scenarios."
  },
  "grc.continuite.item1.label": { fr: "Objectifs", en: "Objectives" },
  "grc.continuite.item1.desc": { fr: "maintenir les services essentiels.", en: "maintain essential services." },
  "grc.continuite.item2.label": { fr: "Sinistres couverts", en: "Covered disasters" },
  "grc.continuite.item2.desc": { fr: "panne, cyberattaque, incendie, etc.", en: "outage, cyberattack, fire, etc." },
  "grc.continuite.item3.label": { fr: "Sauvegardes", en: "Backups" },
  "grc.continuite.item3.desc": { fr: "RPO, RTO.", en: "RPO, RTO." },
  "grc.continuite.item4.label": { fr: "Redondance", en: "Redundancy" },
  "grc.continuite.item4.desc": { fr: "systèmes, réseaux, sites.", en: "systems, networks, sites." },
  "grc.continuite.item5.label": { fr: "Reprise", en: "Recovery" },
  "grc.continuite.item5.desc": { fr: "procédures PRA.", en: "DRP procedures." },
  "grc.continuite.item6.label": { fr: "Tests", en: "Tests" },
  "grc.continuite.item6.desc": { fr: "fréquence, résultats.", en: "frequency, results." },
  "grc.continuite.item7.label": { fr: "Mise à jour", en: "Update" },
  "grc.continuite.item7.desc": { fr: "révision annuelle.", en: "annual review." },
  "grc.continuite.role": {
    fr: "Le PCA/PRA garantit que l’organisation peut survivre à un incident majeur.",
    en: "The BCP/DRP guarantees that the organization can survive a major incident."
  },

  // ===================== devsecops =====================
  "grc.devsecops.title": { fr: "DevSecOps", en: "DevSecOps" },
  "grc.devsecops.subtitle": {
    fr: "Le DevSecOps intègre la sécurité directement dans le cycle de vie du développement logiciel.",
    en: "DevSecOps integrates security directly into the software development lifecycle."
  },
  "grc.devsecops.hubCard.title": { fr: "DevSecOps", en: "DevSecOps" },
  "grc.devsecops.hubCard.desc": {
    fr: "Sécurité intégrée au cycle de développement : CI/CD, SAST/DAST, gestion des secrets.",
    en: "Security built into the development cycle: CI/CD, SAST/DAST, secrets management."
  },
  "grc.devsecops.whyTitle": { fr: "Pourquoi c’est important", en: "Why it matters" },
  "grc.devsecops.why1": {
    fr: "Évite que les vulnérabilités atteignent la production en les détectant tôt dans le pipeline.",
    en: "Prevents vulnerabilities from reaching production by catching them early in the pipeline."
  },
  "grc.devsecops.why2": {
    fr: "Intègre des contrôles de sécurité continus plutôt qu’un audit ponctuel en fin de projet.",
    en: "Builds in continuous security controls rather than a one-off audit at the end of the project."
  },
  "grc.devsecops.why3": {
    fr: "Complète la gestion du cycle de vie et des tests déjà couverts pour les API et applications web.",
    en: "Complements the lifecycle and testing practices already covered for APIs and web applications."
  },
  "grc.devsecops.includeTitle": { fr: "Ce que cette section doit contenir", en: "What this section should include" },
  "grc.devsecops.item1": { fr: "CI/CD sécurisé (pipelines, secrets management)", en: "Secure CI/CD (pipelines, secrets management)" },
  "grc.devsecops.item2": { fr: "SAST (analyse statique du code)", en: "SAST (static code analysis)" },
  "grc.devsecops.item3": { fr: "DAST (analyse dynamique en exécution)", en: "DAST (dynamic analysis at runtime)" },
  "grc.devsecops.item4": { fr: "Analyse des dépendances (SCA)", en: "Dependency analysis (SCA)" },
  "grc.devsecops.item5": { fr: "Gestion des secrets (clés API, identifiants)", en: "Secrets management (API keys, credentials)" },
  "grc.devsecops.item6": {
    fr: "Sécurité des conteneurs et des images (scan d’images)",
    en: "Container and image security (image scanning)"
  },

  // ===================== directives =====================
  "grc.directives.title": { fr: "Directives de sécurité", en: "Security Directives" },
  "grc.directives.subtitle": { fr: "Les directives sont les règles que les employés doivent suivre.", en: "Directives are the rules employees must follow." },
  "grc.directives.hubCard.title": { fr: "Directives", en: "Directives" },
  "grc.directives.hubCard.desc": {
    fr: "Politiques et chartes encadrant les pratiques de sécurité de l’organisation.",
    en: "Policies and charters governing the organization’s security practices."
  },
  "grc.directives.item1.label": { fr: "Contrôle d’accès", en: "Access control" },
  "grc.directives.item1.desc": { fr: "moindre privilège, MFA.", en: "least privilege, MFA." },
  "grc.directives.item2.label": { fr: "Authentification", en: "Authentication" },
  "grc.directives.item2.desc": { fr: "gestion des identifiants.", en: "credential management." },
  "grc.directives.item3.label": { fr: "Sécurité des postes", en: "Endpoint security" },
  "grc.directives.item3.desc": { fr: "antivirus, mises à jour, verrouillage.", en: "antivirus, updates, locking." },
  "grc.directives.item4.label": { fr: "Sécurité réseau", en: "Network security" },
  "grc.directives.item4.desc": { fr: "segmentation, filtrage, chiffrement.", en: "segmentation, filtering, encryption." },
  "grc.directives.item5.label": { fr: "Classification des données", en: "Data classification" },
  "grc.directives.item5.desc": { fr: "niveaux de sensibilité.", en: "sensitivity levels." },
  "grc.directives.item6.label": { fr: "Sauvegarde", en: "Backup" },
  "grc.directives.item6.desc": { fr: "fréquence, stockage, restauration.", en: "frequency, storage, restoration." },
  "grc.directives.item7.label": { fr: "DevSecOps", en: "DevSecOps" },
  "grc.directives.item7.desc": { fr: "sécurité intégrée au développement.", en: "security built into development." },
  "grc.directives.item8.label": { fr: "Sensibilisation", en: "Awareness" },
  "grc.directives.item8.desc": { fr: "formation continue.", en: "ongoing training." },
  "grc.directives.item9.label": { fr: "Supervision", en: "Oversight" },
  "grc.directives.item9.desc": { fr: "audits, conformité.", en: "audits, compliance." },
  "grc.directives.role": {
    fr: "Les directives assurent que les employés adoptent des comportements sécuritaires.",
    en: "Directives ensure employees adopt secure behaviors."
  },

  // ===================== documentation =====================
  "grc.documentation.title": { fr: "Gestion documentaire", en: "Document Management" },
  "grc.documentation.subtitle": { fr: "Cette section encadre la vie des documents de sécurité.", en: "This section governs the lifecycle of security documents." },
  "grc.documentation.hubCard.title": { fr: "Documentation", en: "Documentation" },
  "grc.documentation.hubCard.desc": {
    fr: "Registre central des documents, versions et preuves du système de management.",
    en: "Central register of documents, versions and evidence for the management system."
  },
  "grc.documentation.item1.label": { fr: "Mise en vigueur", en: "Entry into force" },
  "grc.documentation.item1.desc": { fr: "date, approbation.", en: "date, approval." },
  "grc.documentation.item2.label": { fr: "Révision", en: "Review" },
  "grc.documentation.item2.desc": { fr: "fréquence, versioning.", en: "frequency, versioning." },
  "grc.documentation.item3.label": { fr: "Archivage", en: "Archiving" },
  "grc.documentation.item3.desc": { fr: "conservation, accès.", en: "retention, access." },
  "grc.documentation.item4.label": { fr: "Références", en: "References" },
  "grc.documentation.item4.desc": { fr: "normes, lois, documents internes.", en: "standards, laws, internal documents." },
  "grc.documentation.role": {
    fr: "La gestion documentaire assure que les documents sont à jour, accessibles et conformes.",
    en: "Document management ensures documents stay current, accessible and compliant."
  },

  // ===================== fournisseurs =====================
  "grc.fournisseurs.title": { fr: "Gestion des fournisseurs", en: "Vendor Management" },
  "grc.fournisseurs.subtitle": {
    fr: "Les risques liés aux fournisseurs sont un pilier GRC moderne : ils représentent une surface d’attaque majeure et sont encadrés par ISO 27001 (Annexe A.15).",
    en: "Vendor-related risk is a pillar of modern GRC: vendors represent a major attack surface and are governed by ISO 27001 (Annex A.15)."
  },
  "grc.fournisseurs.hubCard.title": { fr: "Gestion des fournisseurs", en: "Vendor Management" },
  "grc.fournisseurs.hubCard.desc": {
    fr: "Évaluation et suivi des risques tiers (Third-Party Risk Management), exigences ISO 27001 Annexe A.15.",
    en: "Third-party risk management assessment and tracking, ISO 27001 Annex A.15 requirements."
  },
  "grc.fournisseurs.whyTitle": { fr: "Pourquoi c’est important", en: "Why it matters" },
  "grc.fournisseurs.why1": { fr: "Les fournisseurs représentent une surface d’attaque majeure.", en: "Vendors represent a major attack surface." },
  "grc.fournisseurs.why2": { fr: "Obligatoire dans ISO 27001 (Annexe A.15).", en: "Mandatory under ISO 27001 (Annex A.15)." },
  "grc.fournisseurs.why3": { fr: "Permet de contrôler les risques de sous-traitance.", en: "Enables control of subcontracting risk." },
  "grc.fournisseurs.includeTitle": { fr: "Ce que cette section doit contenir", en: "What this section should include" },
  "grc.fournisseurs.item1": { fr: "Registre des fournisseurs", en: "Vendor register" },
  "grc.fournisseurs.item2": { fr: "Évaluation des risques tiers", en: "Third-party risk assessment" },
  "grc.fournisseurs.item3": { fr: "Exigences contractuelles de sécurité", en: "Contractual security requirements" },
  "grc.fournisseurs.item4": { fr: "Suivi des certifications (ISO, SOC2, etc.)", en: "Certification tracking (ISO, SOC 2, etc.)" },
  "grc.fournisseurs.item5": {
    fr: "Processus d’onboarding / offboarding fournisseur",
    en: "Vendor onboarding / offboarding process"
  },

  // ===================== gouvernance =====================
  "grc.gouvernance.title": { fr: "Gouvernance de la sécurité", en: "Security Governance" },
  "grc.gouvernance.subtitle": {
    fr: "La gouvernance définit qui décide quoi, qui est responsable, et comment la sécurité est pilotée.",
    en: "Governance defines who decides what, who is accountable, and how security is steered."
  },
  "grc.gouvernance.hubCard.title": { fr: "Gouvernance", en: "Governance" },
  "grc.gouvernance.hubCard.desc": {
    fr: "Rôles, responsabilités, comités et structure de pilotage de la sécurité de l’information.",
    en: "Roles, responsibilities, committees and steering structure for information security."
  },
  "grc.gouvernance.item1.label": { fr: "Leadership", en: "Leadership" },
  "grc.gouvernance.item1.desc": { fr: "engagement de la direction, allocation des ressources.", en: "management commitment, resource allocation." },
  "grc.gouvernance.item2.label": { fr: "Modèle PDCA", en: "PDCA model" },
  "grc.gouvernance.item2.desc": { fr: "planification, mise en œuvre, vérification, amélioration.", en: "plan, do, check, act." },
  "grc.gouvernance.item3.label": { fr: "Rôles et responsabilités", en: "Roles and responsibilities" },
  "grc.gouvernance.item3.desc": { fr: "CEO, CISO, SOC, GRC, TI, RH, DevOps, utilisateurs.", en: "CEO, CISO, SOC, GRC, IT, HR, DevOps, users." },
  "grc.gouvernance.item4.label": { fr: "Organigramme sécurité", en: "Security org chart" },
  "grc.gouvernance.item4.desc": { fr: "structure hiérarchique.", en: "reporting structure." },
  "grc.gouvernance.item5.label": { fr: "Registre d’autorité", en: "Authority register" },
  "grc.gouvernance.item5.desc": { fr: "qui approuve quoi.", en: "who approves what." },
  "grc.gouvernance.role": {
    fr: "La gouvernance assure que la sécurité est structurée, soutenue et alignée avec les objectifs de l’organisation.",
    en: "Governance ensures security is structured, supported and aligned with the organization’s objectives."
  },

  // ===================== iam =====================
  "grc.iam.title": { fr: "Identity & Access Management", en: "Identity & Access Management" },
  "grc.iam.subtitle": {
    fr: "L’IAM encadre la gestion des identités, l’authentification et les droits d’accès à travers l’organisation.",
    en: "IAM governs identity management, authentication and access rights across the organization."
  },
  "grc.iam.hubCard.title": { fr: "Identity & Access Management", en: "Identity & Access Management" },
  "grc.iam.hubCard.desc": {
    fr: "Pilier Zero Trust : gestion des identités, authentification (MFA) et contrôle d’accès (RBAC).",
    en: "Zero Trust pillar: identity management, authentication (MFA) and access control (RBAC)."
  },
  "grc.iam.whyTitle": { fr: "Pourquoi c’est important", en: "Why it matters" },
  "grc.iam.why1": {
    fr: "Pilier central du Zero Trust : ne jamais faire confiance par défaut, vérifier chaque accès.",
    en: "A core Zero Trust pillar: never trust by default, verify every access."
  },
  "grc.iam.why2": { fr: "Réduit la surface d’attaque liée aux identités compromises.", en: "Reduces the attack surface tied to compromised identities." },
  "grc.iam.why3": {
    fr: "Base technique de la gouvernance des accès définie ailleurs dans le programme GRC.",
    en: "The technical foundation for access governance defined elsewhere in the GRC program."
  },
  "grc.iam.includeTitle": { fr: "Ce que cette section doit contenir", en: "What this section should include" },
  "grc.iam.item1": { fr: "Zero Trust Network Architecture", en: "Zero Trust Network Architecture" },
  "grc.iam.item2": { fr: "MFA (authentification multifacteur) obligatoire", en: "Mandatory MFA (multi-factor authentication)" },
  "grc.iam.item3": { fr: "RBAC : attribution des droits basée sur le rôle", en: "RBAC: role-based access assignment" },
  "grc.iam.item4": { fr: "Cycle de vie des identités (provisioning, déprovisioning)", en: "Identity lifecycle (provisioning, deprovisioning)" },
  "grc.iam.item5": { fr: "Fédération d’identités (SSO, OIDC/SAML)", en: "Identity federation (SSO, OIDC/SAML)" },
  "grc.iam.item6": { fr: "Revue périodique des accès", en: "Periodic access reviews" },

  // ===================== indicateurs =====================
  "grc.indicateurs.title": { fr: "Gestion des performances GRC", en: "GRC Performance Management" },
  "grc.indicateurs.subtitle": {
    fr: "Les indicateurs de performance permettent de mesurer l’efficacité du programme de sécurité, conformément à la clause 9.1 d’ISO 27001.",
    en: "Performance indicators measure the effectiveness of the security program, in line with ISO 27001 clause 9.1."
  },
  "grc.indicateurs.hubCard.title": { fr: "Gestion des performances GRC", en: "GRC Performance Management" },
  "grc.indicateurs.hubCard.desc": {
    fr: "Indicateurs KPI/KRI, tableaux de bord et rapports périodiques, exigés par ISO 27001 (clause 9.1).",
    en: "KPI/KRI indicators, dashboards and periodic reports, required by ISO 27001 (clause 9.1)."
  },
  "grc.indicateurs.whyTitle": { fr: "Pourquoi c’est important", en: "Why it matters" },
  "grc.indicateurs.why1": { fr: "Permet de mesurer l’efficacité du programme de sécurité.", en: "Enables measurement of the security program’s effectiveness." },
  "grc.indicateurs.why2": { fr: "Obligatoire dans ISO 27001 (clause 9.1).", en: "Mandatory under ISO 27001 (clause 9.1)." },
  "grc.indicateurs.why3": { fr: "Essentiel pour démontrer la maturité du programme GRC.", en: "Essential for demonstrating the GRC program’s maturity." },
  "grc.indicateurs.includeTitle": { fr: "Ce que cette section doit contenir", en: "What this section should include" },
  "grc.indicateurs.item1": { fr: "KPI (Key Performance Indicators)", en: "KPI (Key Performance Indicators)" },
  "grc.indicateurs.item2": { fr: "KRI (Key Risk Indicators)", en: "KRI (Key Risk Indicators)" },
  "grc.indicateurs.item3": { fr: "Tableaux de bord", en: "Dashboards" },
  "grc.indicateurs.item4": { fr: "Méthodes de suivi", en: "Tracking methods" },
  "grc.indicateurs.item5": { fr: "Rapports périodiques", en: "Periodic reports" },

  // ===================== procedures =====================
  "grc.procedures.title": { fr: "Procédures de sécurité", en: "Security Procedures" },
  "grc.procedures.subtitle": { fr: "Les procédures sont les étapes concrètes pour exécuter les directives.", en: "Procedures are the concrete steps for carrying out directives." },
  "grc.procedures.hubCard.title": { fr: "Procédures", en: "Procedures" },
  "grc.procedures.hubCard.desc": {
    fr: "Modes opératoires détaillés pour l’application concrète des directives.",
    en: "Detailed operating instructions for the practical application of directives."
  },
  "grc.procedures.item1.label": { fr: "Gestion des accès", en: "Access management" },
  "grc.procedures.item1.desc": { fr: "création, modification, révocation.", en: "creation, modification, revocation." },
  "grc.procedures.item2.label": { fr: "Sauvegarde / restauration", en: "Backup / restoration" },
  "grc.procedures.item2.desc": { fr: "planification, test, validation.", en: "planning, testing, validation." },
  "grc.procedures.item3.label": { fr: "Gestion des incidents", en: "Incident management" },
  "grc.procedures.item3.desc": { fr: "détection, réponse, reprise.", en: "detection, response, recovery." },
  "grc.procedures.item4.label": { fr: "Gestion des changements", en: "Change management" },
  "grc.procedures.item4.desc": { fr: "approbation, documentation.", en: "approval, documentation." },
  "grc.procedures.item5.label": { fr: "Journalisation", en: "Logging" },
  "grc.procedures.item5.desc": { fr: "collecte, stockage, analyse.", en: "collection, storage, analysis." },
  "grc.procedures.role": {
    fr: "Les procédures garantissent que les actions sont exécutées de manière cohérente et contrôlée.",
    en: "Procedures guarantee that actions are carried out consistently and under control."
  },

  // ===================== traitement-risques =====================
  "grc.traitement-risques.title": { fr: "Traitement des risques", en: "Risk Treatment" },
  "grc.traitement-risques.subtitle": { fr: "Cette section explique comment l’organisation gère chaque risque.", en: "This section explains how the organization handles each risk." },
  "grc.traitement-risques.hubCard.title": { fr: "Traitement des risques", en: "Risk Treatment" },
  "grc.traitement-risques.hubCard.desc": {
    fr: "Plans de traitement, mesures d’atténuation et suivi des risques résiduels.",
    en: "Treatment plans, mitigation measures and tracking of residual risk."
  },
  "grc.traitement-risques.item1.label": { fr: "Évitement", en: "Avoidance" },
  "grc.traitement-risques.item1.desc": { fr: "supprimer l’activité à risque.", en: "eliminate the risky activity." },
  "grc.traitement-risques.item2.label": { fr: "Mitigation", en: "Mitigation" },
  "grc.traitement-risques.item2.desc": { fr: "réduire la probabilité ou l’impact.", en: "reduce the likelihood or impact." },
  "grc.traitement-risques.item3.label": { fr: "Transfert", en: "Transfer" },
  "grc.traitement-risques.item3.desc": { fr: "assurance, sous-traitance.", en: "insurance, outsourcing." },
  "grc.traitement-risques.item4.label": { fr: "Acceptation", en: "Acceptance" },
  "grc.traitement-risques.item4.desc": { fr: "risque toléré.", en: "tolerated risk." },
  "grc.traitement-risques.item5.label": { fr: "Risques résiduels", en: "Residual risks" },
  "grc.traitement-risques.item5.desc": { fr: "ce qui reste après traitement.", en: "what remains after treatment." },
  "grc.traitement-risques.role": {
    fr: "Le traitement des risques permet de prendre des décisions éclairées et alignées avec la tolérance au risque de l’organisation.",
    en: "Risk treatment enables informed decisions aligned with the organization’s risk tolerance."
  },

  // ===================== vie-privee =====================
  "grc.vie-privee.title": { fr: "Gestion de la vie privée", en: "Privacy Management" },
  "grc.vie-privee.subtitle": {
    fr: "La protection des renseignements personnels est un complément essentiel à la sécurité de l’information, encadré au Québec par la Loi 25.",
    en: "Protecting personal information is an essential complement to information security, governed in Quebec by Bill 25."
  },
  "grc.vie-privee.hubCard.title": { fr: "Gestion de la vie privée", en: "Privacy Management" },
  "grc.vie-privee.hubCard.desc": {
    fr: "Protection des renseignements personnels, consentement et conformité à la Loi 25.",
    en: "Personal information protection, consent and compliance with Bill 25."
  },
  "grc.vie-privee.whyTitle": { fr: "Pourquoi c’est important", en: "Why it matters" },
  "grc.vie-privee.why1": { fr: "Obligatoire avec la Loi 25 au Québec.", en: "Mandatory under Quebec’s Bill 25." },
  "grc.vie-privee.why2": { fr: "Complément essentiel à la sécurité de l’information.", en: "Essential complement to information security." },
  "grc.vie-privee.why3": { fr: "Nécessite des processus spécifiques.", en: "Requires dedicated processes." },
  "grc.vie-privee.includeTitle": { fr: "Ce que cette section doit contenir", en: "What this section should include" },
  "grc.vie-privee.item1": { fr: "Politique de vie privée", en: "Privacy policy" },
  "grc.vie-privee.item2": { fr: "Registre des renseignements personnels", en: "Personal information register" },
  "grc.vie-privee.item3": { fr: "Consentement", en: "Consent" },
  "grc.vie-privee.item4": { fr: "Minimisation des données", en: "Data minimization" },
  "grc.vie-privee.item5": { fr: "DPIA (Privacy Impact Assessment)", en: "DPIA (Privacy Impact Assessment)" },
  "grc.vie-privee.item6": {
    fr: "Droits des personnes (accès, rectification, suppression)",
    en: "Data subject rights (access, rectification, erasure)"
  },

  // ===================== vulnerabilites =====================
  "grc.vulnerabilites.title": { fr: "Gestion des vulnérabilités", en: "Vulnerability Management" },
  "grc.vulnerabilites.subtitle": {
    fr: "La gestion des vulnérabilités est un processus opérationnel encadré par ISO 27001 (A.12.6), distinct de l’analyse des risques.",
    en: "Vulnerability management is an operational process governed by ISO 27001 (A.12.6), distinct from risk analysis."
  },
  "grc.vulnerabilites.hubCard.title": { fr: "Gestion des vulnérabilités", en: "Vulnerability Management" },
  "grc.vulnerabilites.hubCard.desc": {
    fr: "Scan, priorisation CVSS, correctifs et suivi des remédiations, exigés par ISO 27001 (A.12.6).",
    en: "Scanning, CVSS prioritization, patches and remediation tracking, required by ISO 27001 (A.12.6)."
  },
  "grc.vulnerabilites.whyTitle": { fr: "Pourquoi c’est important", en: "Why it matters" },
  "grc.vulnerabilites.why1": { fr: "Obligatoire dans ISO 27001 (A.12.6).", en: "Mandatory under ISO 27001 (A.12.6)." },
  "grc.vulnerabilites.why2": {
    fr: "Essentiel pour démontrer la maturité opérationnelle du programme de sécurité.",
    en: "Essential for demonstrating the security program’s operational maturity."
  },
  "grc.vulnerabilites.includeTitle": { fr: "Ce que cette section doit contenir", en: "What this section should include" },
  "grc.vulnerabilites.item1": { fr: "Processus de scan", en: "Scanning process" },
  "grc.vulnerabilites.item2": { fr: "Gestion des correctifs (patch management)", en: "Patch management" },
  "grc.vulnerabilites.item3": { fr: "Priorisation (CVSS)", en: "Prioritization (CVSS)" },
  "grc.vulnerabilites.item4": { fr: "Rapports de vulnérabilités", en: "Vulnerability reports" },
  "grc.vulnerabilites.item5": { fr: "Suivi des remédiations", en: "Remediation tracking" }
});
