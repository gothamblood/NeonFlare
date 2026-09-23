/* Documentation — Procédures (grc/procedures.html) · ISO 27001 A.5.37.
   Huitième étape : comment les règles s'appliquent concrètement. Chaque
   procédure est un élément dont les entrées sont ses ÉTAPES (déclencheur,
   étape, vérification, preuve, escalade) ; le cycle de vie des documents
   reste dans le registre documentaire existant. Moteur : grc-fiches.js ;
   plan : spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const STEP_FIELDS = [
    { id: "ordre", type: "text", label: L("N°", "No.") },
    { id: "type", type: "select", label: L("Type", "Type"), options: [
      O("etape", "Étape", "Step"), O("declencheur", "Déclencheur", "Trigger"), O("verification", "Vérification", "Check"),
      O("preuve", "Preuve à conserver", "Evidence to keep"), O("escalade", "Escalade", "Escalation"),
    ] },
    { id: "description", type: "textarea", required: true, label: L("Description", "Description") },
    { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable (rôle)", "Owner (role)") },
    { id: "outil", type: "text", hint: L("Où se fait l’étape (billetterie, formulaire, console…)", "Where the step is done (ticketing, form, console…)"), label: L("Outil ou formulaire", "Tool or form") },
    { id: "delai", type: "text", suggest: "delai", label: L("Délai", "Timeframe") },
    { id: "controles", type: "refs", linkTo: "control", label: L("Contrôles appliqués par l’étape", "Controls applied by the step") },
  ];

  const proc = (id, fr, en, ref, descFr, descEn, extra) => Object.assign({
    id: id, title: L(fr, en), ref: L(ref, ref), desc: L(descFr, descEn),
    header: ["ordre", "description", "type"], fields: STEP_FIELDS,
    example: { ordre: L("1", "1"), type: "declencheur", description: L("Demande reçue au service TI par le formulaire prévu", "Request received by IT through the designated form"), responsable: L("Service TI", "IT") },
  }, extra || {});

  grcFicheRegister("procedures", {
    docTitle: L("Procédures de sécurité", "Security procedures"),
    docRef: "ISO/IEC 27001:2022 Annex A 5.37",
    elements: [
      proc("acces", "Gestion des accès", "Access management", "ISO 27001 A.5.18 · CIS 6",
        "Les étapes pour créer, modifier et retirer un accès. Une entrée par étape, numérotée. Exemple : 1. déclencheur — demande du gestionnaire au service TI ; 2. vérification — approbation du propriétaire de l’actif.",
        "The steps to create, change and remove access. One numbered entry per step. Example: 1. trigger — manager request to IT; 2. check — asset owner approval.", { essential: true }),
      proc("changements", "Gestion des changements", "Change management", "ISO 27001 A.8.32",
        "De la demande de changement à sa mise en production : évaluation, approbation, test, retour arrière.",
        "From the change request to production: assessment, approval, testing, rollback."),
      proc("sauvegarde", "Sauvegarde", "Backup", "ISO 27001 A.8.13 · CIS 11",
        "Planifier, exécuter et surveiller les sauvegardes ; que faire en cas d’échec.",
        "Schedule, run and monitor backups; what to do on failure.", { essential: true }),
      proc("restauration", "Restauration", "Restore", "ISO 27001 A.8.13 · NIST RC.RP",
        "Restaurer des données ou un système, puis valider que tout est correct. Inclut le test périodique de restauration.",
        "Restore data or a system, then validate that everything is correct. Includes the periodic restore test."),
      proc("incidents", "Gestion des incidents", "Incident management", "ISO 27001 A.5.26 · CIS 17",
        "Le déroulé opérationnel face à un incident (le détail des rôles et niveaux est dans la page Incidents).",
        "The operational flow when facing an incident (roles and levels are detailed on the Incidents page).", { essential: true }),
      proc("actifs", "Gestion des actifs", "Asset management", "ISO 27001 A.5.9 · A.5.11 · CIS 1",
        "Entrée d’un actif dans l’inventaire, mise à jour, sortie et restitution (départ d’un employé, fin de vie).",
        "Adding an asset to the inventory, updating it, retiring and returning it (employee departure, end of life)."),
      {
        id: "vulnerabilites",
        kind: "link",
        title: L("Gestion des vulnérabilités", "Vulnerability management"),
        ref: L("ISO 27001 A.8.8 · CIS 7", "ISO 27001 A.8.8 · CIS 7"),
        desc: L("La gestion des vulnérabilités (scans, priorisation CVSS, correctifs, SLA) se documente dans Sécurité opérationnelle › Vulnérabilités.",
          "Vulnerability management (scans, CVSS prioritization, patching, SLAs) is documented in Operational Security › Vulnerabilities."),
        href: "securite/operationnelle/vulnerabilites.html",
        links: [{ label: L("Sécurité opérationnelle › Vulnérabilités", "Operational Security › Vulnerabilities") }],
      },
      proc("escalade", "Escalade opérationnelle", "Operational escalation", "ISO 27001 A.5.24 · A.6.8",
        "Quand et vers qui remonter un problème : niveaux, délais, SPOC, contacts d’astreinte.",
        "When and to whom to escalate an issue: levels, timeframes, SPOC, on-call contacts."),
      proc("mco", "MCO", "Operational readiness (MCO)", "ISO 27001 A.8.6 · A.8.15 · A.8.16",
        "Maintien en condition opérationnelle : mises à jour, supervision, capacité, journalisation — les gestes réguliers qui gardent les systèmes prêts.",
        "Keeping systems operational: updates, monitoring, capacity, logging — the routine tasks that keep systems ready."),
{
  id: "projets",
  title: L("Sécurité dans les projets", "Information security in projects"),
  ref: L("ISO 27002 5.8", "ISO 27002 5.8"),
  lead: L("Chaque projet (nouveau système, déménagement, fournisseur…) intègre la sécurité dès le départ.", "Every project (new system, move, supplier…) builds security in from the start."),
  desc: L("Une entrée par projet : exigences de sécurité, risques propres au projet, jalons de validation. Exemple : « Migration de la paie vers l’infonuagique » — exigences : chiffrement, MFA, clauses de réversibilité ; jalon : revue sécurité avant la mise en production.",
    "One entry per project: security requirements, project-specific risks, validation milestones. Example: \"Payroll migration to the cloud\" — requirements: encryption, MFA, exit clauses; milestone: security review before go-live."),
  header: ["projet", "phase"],
  fields: [
    { id: "projet", type: "text", required: true, label: L("Projet", "Project") },
    { id: "phase", type: "select", label: L("Phase", "Phase"), options: [O("initiation", "Initiation", "Initiation"), O("conception", "Conception", "Design"), O("realisation", "Réalisation", "Build"), O("production", "Mise en production", "Go-live"), O("clos", "Clos", "Closed")] },
    { id: "exigences", type: "textarea", label: L("Exigences de sécurité", "Security requirements") },
    { id: "risques", linkTo: "risk", multi: true, label: L("Risques du projet", "Project risks") },
    { id: "jalon", type: "text", label: L("Jalon de validation sécurité", "Security validation milestone") },
    { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
    { id: "echeance", type: "date", label: L("Échéance", "Due date") },
  ],
  example: { projet: L("Migration de la paie vers l’infonuagique", "Payroll migration to the cloud"), phase: "conception", exigences: L("Chiffrement, MFA, clauses de réversibilité", "Encryption, MFA, exit clauses"), jalon: L("Revue sécurité avant la mise en production", "Security review before go-live") },
},
      {
        id: "registre",
        kind: "register",
        title: L("Registre documentaire (procédures)", "Document register (procedures)"),
        ref: L("ISO 27001 cl. 7.5", "ISO 27001 cl. 7.5"),
        desc: L("Le cycle de vie de chaque procédure publiée : version, approbateur, statut, revue périodique.",
          "The lifecycle of each published procedure: version, approver, status, periodic review."),
        block: "#grcDocumentsRegistry",
        count: () => grcFicheSrc.documents().filter((d) => d.docType === "procedure").length,
        reinit: () => initGrcDocumentsRegistry({ docTypes: ["procedure"], primaryType: "procedure" }),
        table: () => ({
          columns: [L("Document", "Document"), L("Version", "Version"), L("Statut", "Status"), L("Approbateur", "Approver")],
          rows: grcFicheSrc.documents().filter((d) => d.docType === "procedure").map((d) => [d.title || "", d.version || "", d.status || "", d.approver || ""]),
        }),
      },
    ],
  });
})();
