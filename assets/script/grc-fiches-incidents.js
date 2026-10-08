/* Documentation — Incidents (grc/incidents.html) · ISO 27001 A.5.24–A.5.28.
   Neuvième étape : se préparer à réagir. Chaque phase de la gestion des
   incidents a sa fiche (détection, déclaration, analyse, classification,
   réponse, escalade, leçons) ; le suivi réel reste dans le journal
   d'incidents existant (et son mode IR). Moteur : grc-fiches.js ; plan :
   spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const incidents = () => grcFicheSrc.incidents();
  const sev = (v) => (["mineur", "majeur", "critique"].indexOf(v) !== -1 ? grcT("grc.incidents.severity." + v) : (v || ""));
  const status = (v) => (typeof grcIncidentStatusLabel === "function" ? grcIncidentStatusLabel(v) : (v || ""));

  grcFicheRegister("incidents", {
    docTitle: L("Gestion des incidents de sécurité", "Security incident management"),
    docRef: "ISO/IEC 27001:2022 Annex A 5.24 – 5.28 · NIST CSF 2.0 DE, RS, RC",
    elements: [
      {
        id: "detection",
        example: { source: L("Antivirus des postes (EDR)", "Workstation antivirus (EDR)"), seuil: L("Toute détection de rançongiciel déclenche un incident", "Any ransomware detection triggers an incident"), responsable: L("Service TI", "IT") },
        title: L("Détection", "Detection"),
        ref: L("ISO 27001 A.8.16 · NIST DE.CM · DE.AE", "ISO 27001 A.8.16 · NIST DE.CM · DE.AE"),
        desc: L("D’où viennent les alertes et qui les surveille. Une entrée par source. Exemple : EDR sur les postes — alerte critique transmise au SOC en temps réel, responsable : analyste de garde.",
          "Where alerts come from and who watches them. One entry per source. Example: EDR on workstations — critical alert sent to the SOC in real time, owner: on-call analyst."),
        header: ["source", "type"],
        fields: [
          { id: "type", type: "select", label: L("Type de source", "Source type"), options: [
            O("siem", "SIEM / journaux", "SIEM / logs"), O("edr", "EDR / antivirus", "EDR / antivirus"), O("reseau", "Sonde réseau / IDS", "Network sensor / IDS"),
            O("utilisateur", "Signalement d’un utilisateur", "User report"), O("fournisseur", "Fournisseur / partenaire", "Supplier / partner"),
            O("externe", "Source externe (CERT, client, autorité)", "External source (CERT, customer, authority)"), O("autre", "Autre", "Other"),
          ] },
          { id: "source", type: "text", required: true, suggest: "source-detection", label: L("Source / outil", "Source / tool") },
          { id: "seuil", type: "textarea", label: L("Ce qui déclenche une alerte", "What triggers an alert") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Qui surveille", "Who monitors") },
        ],
      },
      {
        id: "declaration",
        example: { canal: L("securite@fsociety.example", "security@fsociety.example"), spoc: L("Service TI", "IT"), delai: L("Immédiatement", "Immediately") },
        title: L("Déclaration", "Reporting"),
        ref: L("ISO 27001 A.6.8", "ISO 27001 A.6.8"),
        desc: L("Comment n’importe qui signale un événement de sécurité : canal unique, informations minimales, délai. Exemple : courriel securite@… ou poste 555 ; dire quoi, quand, quel système, qui a vu ; dans l’heure.",
          "How anyone reports a security event: single channel, minimum information, timeframe. Example: email security@… or ext. 555; say what, when, which system, who saw it; within the hour."),
        header: ["canal"],
        fields: [
          { id: "canal", type: "text", required: true, suggest: "canal", label: L("Canal", "Channel") },
          { id: "spoc", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("SPOC (point de contact unique)", "SPOC (single point of contact)") },
          { id: "informations", type: "textarea", hint: L("Quoi, quand, où, qui l’a vu, ce qui a déjà été fait", "What, when, where, who saw it, what has already been done"), label: L("Informations minimales à fournir", "Minimum information to provide") },
          { id: "delai", type: "text", suggest: "delai", label: L("Délai de déclaration", "Reporting timeframe") },
        ],
      },
      {
        id: "analyse",
        example: { etape: L("Qualification", "Qualification"), methode: L("Vérifier l’alerte, identifier les systèmes touchés", "Check the alert, identify affected systems") },
        title: L("Analyse", "Analysis"),
        ref: L("ISO 27001 A.5.25 · A.5.28 · NIST RS.AN", "ISO 27001 A.5.25 · A.5.28 · NIST RS.AN"),
        desc: L("Les étapes pour qualifier un événement : est-ce un incident, quel périmètre, quelle cause, quelles preuves conserver. Une entrée par étape.",
          "The steps to qualify an event: is it an incident, what scope, what cause, what evidence to keep. One entry per step."),
        header: ["etape"],
        fields: [
          { id: "etape", type: "text", required: true, label: L("Étape", "Step") },
          { id: "methode", type: "textarea", label: L("Méthode / outils", "Method / tools") },
          { id: "preuves", type: "textarea", hint: L("Journaux, captures, courriels, images disque…", "Logs, screenshots, emails, disk images…"), label: L("Preuves à conserver", "Evidence to keep") },
        ],
      },
      {
        id: "classification",
        example: { criteres: L("Arrêt d’un service client ou fuite de renseignements personnels", "Customer service outage or personal information leak"), delai: L("1 h", "1 h") },
        essential: true,
        title: L("Classification", "Classification"),
        ref: L("ISO 27001 A.5.25", "ISO 27001 A.5.25"),
        desc: L("L’échelle de gravité de l’organisation : un niveau par entrée, ses critères, des exemples et le délai de réponse attendu. Pense aux incidents de confidentialité (Loi 25). Exemple : critique — arrêt d’un service vital ou fuite de renseignements personnels ; réponse sous 1 h.",
          "The organization’s severity scale: one level per entry, its criteria, examples and expected response time. Think of privacy incidents (Bill 25). Example: critical — outage of a vital service or personal data leak; response within 1 h."),
        header: ["criteres", "niveau"],
        fields: [
          { id: "niveau", type: "select", label: L("Niveau", "Level"), options: [
            O("mineur", "Mineur", "Minor"), O("majeur", "Majeur", "Major"), O("critique", "Critique", "Critical"),
          ] },
          { id: "criteres", type: "textarea", required: true, label: L("Critères", "Criteria") },
          { id: "exemples", type: "textarea", hint: L("Incidents typiques de ce niveau", "Typical incidents at this level"), label: L("Exemples", "Examples") },
          { id: "delai", type: "text", suggest: "delai", label: L("Délai de réponse", "Response time") },
        ],
      },
      {
        id: "reponse",
        example: { scenario: L("Rançongiciel", "Ransomware"), etapes: L("Isoler le poste, couper les partages, alerter la cellule de crise", "Isolate the workstation, cut shares, alert the crisis cell"), responsable: L("RSSI", "CISO") },
        essential: true,
        title: L("Réponse", "Response"),
        ref: L("ISO 27001 A.5.26 · NIST RS.MI · RC.RP", "ISO 27001 A.5.26 · NIST RS.MI · RC.RP"),
        desc: L("Les playbooks : pour chaque scénario courant, les étapes de confinement, d’éradication et de reprise. Exemple : rançongiciel — isoler le poste du réseau, ne pas l’éteindre, prévenir le RSSI, identifier la souche…",
          "The playbooks: for each common scenario, the containment, eradication and recovery steps. Example: ransomware — isolate the machine from the network, do not shut it down, notify the CISO, identify the strain…"),
        header: ["scenario"],
        fields: [
          { id: "scenario", type: "text", required: true, label: L("Scénario", "Scenario") },
          { id: "etapes", type: "textarea", label: L("Étapes (confinement, éradication, reprise)", "Steps (containment, eradication, recovery)") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
        ],
      },
      {
        id: "escalade",
        example: { niveau: L("Niveau 2", "Level 2"), declencheur: L("Incident majeur ou données clients touchées", "Major incident or client data affected"), qui: L("RSSI puis direction", "CISO then management"), delai: L("1 h", "1 h") },
        title: L("Escalade", "Escalation"),
        ref: L("ISO 27001 A.5.24 · NIST RS.CO", "ISO 27001 A.5.24 · NIST RS.CO"),
        desc: L("Quand un incident monte d’un niveau, et jusqu’à la gestion de crise : déclencheur, qui prévenir, délai, contact. Exemple : niveau 3 — incident critique confirmé → CCD, sous 30 min, SPOC : RSSI.",
          "When an incident goes up a level, up to crisis management: trigger, whom to notify, timeframe, contact. Example: level 3 — confirmed critical incident → crisis decision cell, within 30 min, SPOC: CISO."),
        header: ["niveau", "declencheur"],
        fields: [
          { id: "niveau", type: "text", required: true, suggest: "escalade", label: L("Niveau", "Level") },
          { id: "declencheur", type: "textarea", label: L("Déclencheur", "Trigger") },
          { id: "qui", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Qui prévenir", "Whom to notify") },
          { id: "delai", type: "text", suggest: "delai", label: L("Délai", "Timeframe") },
          { id: "contact", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Contact / SPOC", "Contact / SPOC") },
        ],
        links: [{ href: "continuite/pgc.html", label: L("PGC — Plan de gestion de crise", "PGC — Crisis Management Plan") }],
      },
      {
        id: "suivi",
        essential: true,
        kind: "register",
        title: L("Suivi des incidents", "Incident tracking"),
        ref: L("ISO 27001 A.5.26 · NIST RS.MA", "ISO 27001 A.5.26 · NIST RS.MA"),
        desc: L("Le journal des incidents réels : gravité, chronologie, responsable, post-mortem. Chaque incident s’ouvre en espace de réponse (timeline, IOC, tâches).",
          "The log of actual incidents: severity, timeline, owner, post-mortem. Each incident opens into a response workspace (timeline, IOCs, tasks)."),
        block: "#grcIncidentRegistry",
        count: () => incidents().length,
        reinit: () => initGrcIncidentRegistry(),
        table: () => ({
          columns: [L("Incident", "Incident"), L("Gravité", "Severity"), L("Statut", "Status"), L("Détecté le", "Detected"), L("Responsable", "Owner")],
          rows: incidents().map((i) => [i.title || "", sev(i.severity), status(i.status), grcFicheFmtDate(i.detectedAt), i.owner || ""]),
        }),
      },
      {
        id: "post-mortem",
        kind: "view",
        title: L("Post-mortem", "Post-mortem"),
        ref: L("ISO 27001 A.5.27 · NIST ID.IM", "ISO 27001 A.5.27 · NIST ID.IM"),
        desc: L("Les incidents résolus ou clos et leur revue sans blâme. Un incident clos sans post-mortem est signalé.",
          "Resolved or closed incidents and their blameless review. A closed incident without a post-mortem is flagged."),
        table: () => ({
          columns: [L("Incident", "Incident"), L("Gravité", "Severity"), L("Statut", "Status"), L("Post-mortem", "Post-mortem")],
          rows: incidents().filter((i) => i.status === "resolu" || i.status === "clos")
            .map((i) => [i.title || "", sev(i.severity), status(i.status), (i.postmortem || "").trim() || "⚠ " + grcFicheL(L("à rédiger", "to write"))]),
          empty: L("Aucun incident résolu ou clos.", "No resolved or closed incident."),
        }),
        manage: "suivi",
      },
      {
        id: "lecons",
        essential: true,
        example: { lecon: L("L’alerte de l’antivirus n’a été vue que le lendemain", "The antivirus alert was only seen the next day"), action: L("Transférer les alertes critiques vers le cellulaire de garde", "Forward critical alerts to the on-call phone"), statut: "ouverte" },
        cross: [{ label: L("Créer l’action d’amélioration", "Create the improvement action"), page: "gouvernance", tab: "amelioration", list: "renderGrcFiche_gouvernance_amelioration", values: (e) => ({ nature: "amelioration", origine: "incident", description: e.lecon || "", action: e.action || "", sourceLecon: e.id, sourceIncident: e.incident || "" }) }],
        title: L("Leçons apprises", "Lessons learned"),
        ref: L("ISO 27001 A.5.27 · 10.1 · NIST ID.IM", "ISO 27001 A.5.27 · 10.1 · NIST ID.IM"),
        desc: L("Ce que chaque incident a appris et l’action d’amélioration qui en découle, suivie jusqu’à clôture. Les scénarios servent ensuite aux exercices sur table (TTX).",
          "What each incident taught and the resulting improvement action, tracked to closure. The scenarios then feed tabletop exercises (TTX)."),
        header: ["lecon", "statut"],
        fields: [
          { id: "lecon", type: "textarea", required: true, label: L("Leçon", "Lesson") },
          { id: "incident", type: "ref", linkTo: "incident", label: L("Incident source", "Source incident"),
            source: () => grcFicheRefFrom(incidents(), (i) => i.title) },
          { id: "action", type: "textarea", label: L("Action d’amélioration", "Improvement action") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
          { id: "echeance", type: "text", label: L("Échéance (AAAA-MM-JJ)", "Due date (YYYY-MM-DD)") },
          { id: "statut", type: "select", label: L("Statut", "Status"), options: [
            O("ouverte", "Ouverte", "Open"), O("encours", "En cours", "In progress"), O("close", "Close", "Closed"),
          ] },

          { id: "actionId", linkTo: "amelioration", label: L("Action dans le registre d’amélioration", "Action in the improvement register") },
        ],
        links: [{ href: "continuite/tests-exercices.html", label: L("Tests et exercices (TTX)", "Tests and exercises (TTX)") }],
      },
Object.assign({
  id: "actions",
  title: L("Actions correctives (incidents)", "Corrective actions (incidents)"),
  ref: L("ISO 27001 cl. 10.2", "ISO 27001 cl. 10.2"),
  desc: L("Vue des actions issues des incidents dans le registre unique d’amélioration (Gouvernance).", "View of incident-driven actions in the single improvement register (Governance)."),
}, grcFicheImprovementView(["incident"])),
    ],
  });
})();
