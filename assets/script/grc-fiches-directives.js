/* Documentation — Directives (grc/directives.html) · ISO 27001 cl. 5.2,
   A.5.1. Septième étape : écrire les règles. Chaque politique est un
   élément dont les entrées sont ses ARTICLES (objectif, portée, règles,
   rôles, exceptions, sanctions, références) ; le cycle de vie des
   documents (version, approbation, revue) reste dans le registre
   documentaire existant. Moteur : grc-fiches.js ; plan :
   spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const ARTICLE_FIELDS = [
    { id: "type", type: "select", label: L("Type d’article", "Article type"), options: [
      O("objectif", "Objectif", "Purpose"), O("portee", "Portée", "Scope"), O("regle", "Règle", "Rule"),
      O("roles", "Rôles et responsabilités", "Roles and responsibilities"), O("exceptions", "Exceptions", "Exceptions"),
      O("conformite", "Conformité et sanctions", "Compliance and sanctions"), O("references", "Références", "References"),
    ] },
    { id: "texte", type: "textarea", required: true, label: L("Texte de l’article", "Article text") },
    // Ancien champ `controle` (un seul contrôle) repris via `legacy`.
    { id: "controles", type: "refs", legacy: "controle", label: L("Contrôles mis en œuvre", "Controls implemented"),
      source: () => grcFicheRefFrom(grcFicheSrc.controls(), (c) => (c.isoRef ? c.isoRef + " — " : "") + (c.name || "")) },
  ];

  const policy = (id, fr, en, ref, descFr, descEn, extra) => Object.assign({
    id: id, title: L(fr, en), ref: L(ref, ref), desc: L(descFr, descEn),
    header: ["texte", "type"], fields: ARTICLE_FIELDS,
    example: { type: "objectif", texte: L("Protéger la confidentialité, l’intégrité et la disponibilité des informations visées par cette politique.", "Protect the confidentiality, integrity and availability of the information covered by this policy.") },
  }, extra || {});

  grcFicheRegister("directives", {
    docTitle: L("Politiques et directives de sécurité", "Security policies and directives"),
    docRef: "ISO/IEC 27001:2022 clause 5.2 · Annex A 5.1",
    elements: [
      policy("politique-securite", "Politique de sécurité", "Security policy", "ISO 27001 cl. 5.2 · A.5.1",
        "La politique générale, approuvée par la direction : pourquoi la sécurité compte, les principes, qui en est responsable. Rédige-la article par article (objectif, portée, règles…). Exemple d’objectif : « Protéger la confidentialité, l’intégrité et la disponibilité des informations de l’organisation et de ses clients ».",
        "The general policy, approved by management: why security matters, the principles, who is accountable. Write it article by article (purpose, scope, rules…). Example purpose: \"Protect the confidentiality, integrity and availability of the organization’s and its customers’ information\".", { essential: true }),
      policy("acces", "Politique de gestion des accès", "Access management policy", "ISO 27001 A.5.15 · A.5.18 · CIS 6",
        "Qui obtient quel accès et comment : moindre privilège, besoin d’en connaître, approbation, revue périodique. Exemple de règle : « Tout accès est accordé sur demande approuvée par le propriétaire de l’actif et revu chaque trimestre ».",
        "Who gets which access and how: least privilege, need to know, approval, periodic review. Example rule: \"All access is granted on request approved by the asset owner and reviewed quarterly\".", { essential: true }),
      policy("mots-de-passe", "Politique de mots de passe", "Password policy", "ISO 27001 A.5.17 · CIS 5",
        "Règles d’authentification : longueur, gestionnaire de mots de passe, MFA, changement en cas de compromission. Exemple : « 14 caractères minimum ; MFA obligatoire pour tout accès distant et privilégié ».",
        "Authentication rules: length, password manager, MFA, change on compromise. Example: \"14 characters minimum; MFA mandatory for all remote and privileged access\"."),
      policy("sauvegarde", "Politique de sauvegarde", "Backup policy", "ISO 27001 A.8.13 · CIS 11",
        "Ce qui est sauvegardé, à quelle fréquence, combien de temps, où, et comment on vérifie la restauration. Exemple : « Sauvegarde quotidienne, copie hors site immuable, test de restauration mensuel ».",
        "What is backed up, how often, for how long, where, and how restores are verified. Example: \"Daily backup, immutable off-site copy, monthly restore test\"."),
      policy("classification", "Politique de classification", "Classification policy", "ISO 27001 A.5.12 · A.5.13",
        "Les niveaux de sensibilité de l’information et comment manipuler chacun. Le schéma détaillé est dans Actifs › Classification. Exemple de règle : « Toute information confidentielle est chiffrée en transit et au repos ».",
        "The information sensitivity levels and how to handle each. The detailed scheme is in Assets › Classification. Example rule: \"All confidential information is encrypted in transit and at rest\"."),
      policy("utilisation-acceptable", "Politique d’utilisation acceptable", "Acceptable use policy", "ISO 27001 A.5.10 · A.8.1",
        "Ce que les utilisateurs peuvent et ne peuvent pas faire avec les postes, le courriel, internet et les logiciels. Exemple : « Seuls les logiciels approuvés par les TI peuvent être installés ».",
        "What users may and may not do with workstations, email, internet and software. Example: \"Only IT-approved software may be installed\"."),
      policy("teletravail", "Politique télétravail", "Remote work policy", "ISO 27001 A.6.7",
        "Travailler hors des locaux en sécurité : accès distant, équipements, confidentialité à domicile. Exemple : « L’accès distant se fait uniquement par le VPN de l’organisation, avec MFA ».",
        "Working securely outside the premises: remote access, equipment, confidentiality at home. Example: \"Remote access only through the organization’s VPN, with MFA\"."),
      policy("transfert-information", "Politique de transfert de l’information", "Information transfer policy", "ISO 27001 A.5.14",
        "Comment l’information sort de l’organisation ou circule entre systèmes : courriel, partage de fichiers, supports amovibles, ententes avec les tiers. Exemple : « Tout envoi de renseignements confidentiels à l’externe passe par le portail de partage chiffré ».",
        "How information leaves the organization or moves between systems: email, file sharing, removable media, agreements with third parties. Example: \"Any external transmission of confidential information goes through the encrypted sharing portal\"."),
      policy("propriete-intellectuelle", "Politique de propriété intellectuelle", "Intellectual property policy", "ISO 27001 A.5.32",
        "Respect des licences logicielles, des droits d’auteur et protection des créations de l’organisation. Exemple : « Chaque logiciel installé est couvert par une licence inscrite au registre des actifs ».",
        "Compliance with software licences and copyright, and protection of the organization’s creations. Example: \"Every installed software is covered by a licence recorded in the asset register\"."),
      {
        id: "continuite",
        kind: "link",
        title: L("Politique de continuité", "Continuity policy"),
        ref: L("ISO 27001 A.5.29 · ISO 22301 cl. 5.2", "ISO 27001 A.5.29 · ISO 22301 cl. 5.2"),
        desc: L("La politique de continuité se rédige avec le PCA, dans Continuité › PCA — Plan de continuité des activités.",
          "The continuity policy is written with the BCP, in Continuity › BCP — Business Continuity Plan."),
        href: "continuite/pca.html",
        links: [{ label: L("Continuité › PCA", "Continuity › BCP") }],
      },
      {
        id: "registre",
        kind: "register",
        title: L("Registre documentaire (directives)", "Document register (directives)"),
        ref: L("ISO 27001 cl. 7.5", "ISO 27001 cl. 7.5"),
        desc: L("Le cycle de vie de chaque directive publiée : version, approbateur, statut, revue périodique.",
          "The lifecycle of each published directive: version, approver, status, periodic review."),
        block: "#grcDocumentsRegistry",
        count: () => grcFicheSrc.documents().filter((d) => d.docType === "directive").length,
        reinit: () => initGrcDocumentsRegistry({ docTypes: ["directive"], primaryType: "directive" }),
        table: () => ({
          columns: [L("Document", "Document"), L("Version", "Version"), L("Statut", "Status"), L("Approbateur", "Approver")],
          rows: grcFicheSrc.documents().filter((d) => d.docType === "directive").map((d) => [d.title || "", d.version || "", d.status || "", d.approver || ""]),
        }),
      },
    ],
  });
})();
