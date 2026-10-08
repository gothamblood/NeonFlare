/* Documentation — Gouvernance (grc/gouvernance.html) · ISO 27001 cl. 5,
   6.1, 9.3. Deuxième étape : une fois le contexte connu, on organise qui
   décide, qui est responsable et jusqu'où l'organisation accepte le
   risque. Moteur : grc-fiches.js ; plan : spec/grc-fiches/plan.md.
   Identifiants STABLES. */

// « Préparer automatiquement » la revue de direction (grc-normes N8) :
// chaque entrée obligatoire pré-remplie avec un bilan chiffré tiré des
// registres. Rien n'est enregistré sans validation.
function grcGovReviewPrefill() {
  const en = typeof getSavedLang === "function" && getSavedLang() === "en";
  const t = (fr, e) => (en ? e : fr);
  const ctx = typeof grcLinksCtx === "function" ? grcLinksCtx() : { list: () => [] };
  const count = (arr, f) => arr.filter(f).length;
  const act = ctx.list("amelioration");
  const nc = act.filter((a) => a.nature === "nc");
  const mods = ctx.list("modification");
  const ex = ctx.list("exigence");
  const risks = ctx.list("risk");
  const toTreat = typeof grcLinksRiskToTreat === "function" ? risks.filter((r) => grcLinksRiskToTreat(r, ctx)) : [];
  const noPlan = toTreat.filter((r) => !(r.treatmentPlan && Array.isArray(r.treatmentPlan.planIds) && r.treatmentPlan.planIds.length));
  const audits = ctx.list("audit");
  const findings = ctx.list("finding");
  const obj = ctx.list("objectif").filter((o) => o.aspect === "objectif");
  const metrics = ctx.list("metric");
  const opp = ctx.list("opportunite");
  const year = Date.now() - 365 * 864e5;
  const recent = (list) => count(list, (e) => e.updatedAt && Date.parse(e.updatedAt) > year);
  return {
    date: new Date().toISOString().slice(0, 10),
    inActions: t("Actions : ", "Actions: ") + act.length + t(" au total, ", " in total, ") + count(act, (a) => a.statut !== "close") + t(" ouvertes, ", " open, ") + count(act, (a) => a.statut === "close") + t(" closes.", " closed."),
    inChangements: t("Modifications du système : ", "System changes: ") + mods.length + " (" + count(mods, (m) => m.statut === "realisee") + t(" réalisées). Contexte interne / externe mis à jour en 12 mois : ", " completed). Internal / external context updated in 12 months: ") + (recent(ctx.list("facteurInt")) + recent(ctx.list("facteurExt"))) + ".",
    inRetours: t("Exigences des parties prenantes : ", "Interested-party requirements: ") + ex.length + t(", dont non traitées : ", ", not addressed: ") + count(ex, (x) => x.traitee === "non") + ".",
    inNc: t("Non-conformités : ", "Nonconformities: ") + nc.length + t(" (ouvertes : ", " (open: ") + count(nc, (a) => a.statut !== "close") + t(", sans analyse des causes : ", ", without root-cause analysis: ") + count(nc, (a) => !(a.causes || "").trim()) + ").",
    inSurveillance: t("Indicateurs suivis : ", "Monitored indicators: ") + metrics.length + t(", avec au moins une mesure : ", ", with at least one measurement: ") + count(metrics, (m) => Array.isArray(m.series) && m.series.length) + ".",
    inAudits: t("Audits : ", "Audits: ") + audits.length + t(" ; constats : ", "; findings: ") + findings.length + t(", non vérifiés : ", ", not verified: ") + count(findings, (f) => f.verification !== "verified" && f.verification !== "accepted-risk") + ".",
    inObjectifs: t("Objectifs de sécurité : ", "Security objectives: ") + obj.length + t(" (atteints : ", " (achieved: ") + count(obj, (o) => o.statut === "atteint") + t(", en cours : ", ", in progress: ") + count(obj, (o) => o.statut === "encours") + ").",
    inRisques: t("Risques : ", "Risks: ") + risks.length + t(" ; à traiter : ", "; to treat: ") + toTreat.length + t(" ; à traiter sans plan : ", "; to treat without plan: ") + noPlan.length + ".",
    inAmelioration: t("Opportunités : ", "Opportunities: ") + opp.length + t(" ; améliorations proposées : ", "; proposed improvements: ") + count(act, (a) => a.nature === "amelioration") + ".",
  };
}

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const COMITE_FIELDS = [
    { id: "type", type: "select", label: L("Type d’entrée", "Entry type"), options: [
      O("mandat", "Mandat", "Mandate"), O("membre", "Membre", "Member"),
      O("reunion", "Réunion", "Meeting"), O("decision", "Décision", "Decision"),
    ] },
    { id: "libelle", type: "text", required: true, label: L("Nom ou libellé", "Name or label") },
    { id: "role", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Rôle / fonction", "Role / function") },
    { id: "roleId", linkTo: "role", label: L("Rôle défini (Rôles et responsabilités)", "Defined role (Roles and responsibilities)") },
    { id: "detail", type: "textarea", hint: L("Mandat, ordre du jour, décision prise… selon le type d’entrée", "Mandate, agenda, decision taken… depending on the entry type"), label: L("Détail (mandat, ordre du jour, décision…)", "Details (mandate, agenda, decision…)") },
    { id: "date", type: "text", label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
  ];

  // Propriétaire -> liste des noms (vues « propriétaires »).
  function ownersTable(list, nameOf, emptyFr, emptyEn) {
    const by = {};
    const orphans = [];
    list.forEach((x) => {
      const o = (x.owner || "").trim();
      if (!o) { orphans.push(nameOf(x)); return; }
      (by[o] = by[o] || []).push(nameOf(x));
    });
    const rows = Object.keys(by).sort().map((o) => [o, String(by[o].length), by[o].join(", ")]);
    if (orphans.length) rows.push([grcFicheL(L("⚠ Sans propriétaire", "⚠ No owner")), String(orphans.length), orphans.join(", ")]);
    return {
      columns: [L("Propriétaire", "Owner"), L("Nombre", "Count"), L("Éléments", "Items")],
      rows: rows,
      empty: L(emptyFr, emptyEn),
    };
  }

  grcFicheRegister("gouvernance", {
    docTitle: L("Gouvernance de la sécurité de l’information", "Information security governance"),
    docRef: "ISO/IEC 27001:2022 clauses 5, 6.1, 9.3",
    elements: [
      {
        id: "sgsi",
        cross: [{ label: L("Créer l’indicateur", "Create the indicator"), page: "indicateurs", tab: "registre", list: "renderGrcMetricsList", values: (e) => ({ name: e.mesure || e.enonce || "", objectifId: e.id }) }],
        essential: true,
        example: { aspect: "objectif", enonce: L("100 % des comptes à privilèges protégés par MFA", "100% of privileged accounts protected by MFA"), mesure: L("Taux de comptes à privilèges avec MFA", "Share of privileged accounts with MFA"), responsable: L("RSSI", "CISO"), statut: "encours", evaluation: L("Extraction mensuelle de l’annuaire, présentée au comité de sécurité", "Monthly directory extract, presented to the security committee") },
        title: L("SGSI", "ISMS"),
        ref: L("ISO 27001 cl. 4.4 · 6.2 · 10.1", "ISO 27001 cl. 4.4 · 6.2 · 10.1"),
        desc: L("Le système de management lui-même : ses objectifs de sécurité mesurables, ses processus et la façon dont il s’améliore (Planifier, Faire, Vérifier, Agir). Une entrée par objectif ou processus. Exemple : objectif — « 100 % des comptes à privilèges protégés par MFA d’ici juin », mesure : taux de comptes MFA.",
          "The management system itself: its measurable security objectives, its processes and how it improves (Plan, Do, Check, Act). One entry per objective or process. Example: objective — \"100% of privileged accounts protected by MFA by June\", measure: MFA account rate."),
        header: ["enonce", "aspect", "statut"],
        fields: [
          { id: "aspect", type: "select", label: L("Aspect", "Aspect"), options: [
            O("objectif", "Objectif de sécurité", "Security objective"), O("processus", "Processus du SGSI", "ISMS process"),
            O("pdca", "Cycle PDCA", "PDCA cycle"), O("amelioration", "Amélioration", "Improvement"),
          ] },
          { id: "enonce", type: "textarea", required: true, label: L("Énoncé", "Statement") },
          { id: "mesure", type: "text", label: L("Mesure / indicateur", "Measure / indicator") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
          { id: "echeance", type: "text", label: L("Échéance (AAAA-MM-JJ)", "Due date (YYYY-MM-DD)") },
          { id: "statut", type: "select", label: L("Statut", "Status"), options: [
            O("planifie", "Planifié", "Planned"), O("encours", "En cours", "In progress"),
            O("atteint", "Atteint", "Achieved"), O("abandonne", "Abandonné", "Dropped"),
          ] },

          { id: "enjeux", linkTo: "enjeu", multi: true, label: L("Enjeux d’affaires servis", "Business stakes served") },
          { id: "ressources", linkTo: "ressource", multi: true, label: L("Ressources nécessaires", "Required resources") },
          { id: "evaluation", type: "textarea", label: L("Comment les résultats seront évalués", "How results will be evaluated") },
        ],
      },
{
  id: "ressources-sgsi",
  title: L("Ressources du SGSI", "ISMS resources"),
  ref: L("ISO 27001 cl. 7.1 · ISO 22301 cl. 7.1", "ISO 27001 cl. 7.1 · ISO 22301 cl. 7.1"),
  lead: L("Ce qu’il faut (personnes, budget, outils, aide externe) pour faire vivre le SGSI et atteindre ses objectifs.", "What is needed (people, budget, tools, outside help) to run the ISMS and reach its objectives."),
  desc: L("Une entrée par ressource. Relie-la aux objectifs qu’elle sert : un objectif sans ressource est rarement atteint. Exemple : humaine — « 0,5 ETP analyste sécurité », approuvée par la direction.",
    "One entry per resource. Link it to the objectives it serves: an objective without resources is rarely met. Example: human — \"0.5 FTE security analyst\", approved by management."),
  header: ["description", "type", "statut"],
  fields: [
    { id: "type", type: "select", label: L("Type", "Type"), options: [
      O("humaine", "Humaine", "Human"), O("financiere", "Financière", "Financial"),
      O("technique", "Technique / outil", "Technical / tool"), O("externe", "Aide externe", "External help"),
    ] },
    { id: "description", type: "text", required: true, label: L("Ressource", "Resource") },
    { id: "besoin", type: "textarea", label: L("Pourquoi elle est nécessaire", "Why it is needed") },
    { id: "montant", type: "text", hint: L("Budget annuel ($) ou effort (jours-personnes)", "Annual budget ($) or effort (person-days)"), label: L("Montant ou charge", "Amount or effort") },
    { id: "statut", type: "select", label: L("Statut", "Status"), options: [
      O("demandee", "Demandée", "Requested"), O("approuvee", "Approuvée", "Approved"), O("allouee", "Allouée", "Allocated"), O("refusee", "Refusée", "Refused"),
    ] },
    { id: "objectifs", linkTo: "objectif", multi: true, label: L("Objectifs servis", "Objectives served") },
    { id: "approuvePar", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Approuvé par", "Approved by") },
  ],
  example: { type: "humaine", description: L("0,5 ETP analyste sécurité", "0.5 FTE security analyst"), besoin: L("Suivi des vulnérabilités et des journaux", "Vulnerability and log follow-up"), statut: "approuvee" },
},
      {
        id: "cadre",
        example: { instance: L("Comité de direction", "Executive committee"), role: L("Approuve la politique, les objectifs et le budget de sécurité", "Approves the security policy, objectives and budget"), niveau: "strategique", frequence: L("Trimestrielle", "Quarterly"), rendCompte: L("Conseil d’administration", "Board of directors") },
        title: L("Cadre de gouvernance", "Governance framework"),
        ref: L("ISO 27001 cl. 5.1 · NIST GV.OV", "ISO 27001 cl. 5.1 · NIST GV.OV"),
        desc: L("Les instances et mécanismes qui pilotent la sécurité, du conseil d’administration aux équipes. Une entrée par instance. Exemple : « Comité de direction » — stratégique, trimestriel, rend compte au conseil.",
          "The bodies and mechanisms that steer security, from the board to the teams. One entry per body. Example: \"Executive committee\" — strategic, quarterly, reports to the board."),
        header: ["instance", "niveau"],
        fields: [
          { id: "instance", type: "text", required: true, suggest: "instance", label: L("Instance ou mécanisme", "Body or mechanism") },
          { id: "role", type: "textarea", label: L("Rôle dans la sécurité", "Role in security") },
          { id: "niveau", type: "select", label: L("Niveau", "Level"), options: [
            O("strategique", "Stratégique", "Strategic"), O("tactique", "Tactique", "Tactical"), O("operationnel", "Opérationnel", "Operational"),
          ] },
          { id: "frequence", type: "text", suggest: "frequence", label: L("Fréquence", "Frequency") },
          { id: "rendCompte", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Rend compte à", "Reports to") },
        ],
      },
      {
        id: "politique-securite",
        kind: "link",
        title: L("Politique de sécurité", "Security policy"),
        ref: L("ISO 27001 cl. 5.2 · A.5.1", "ISO 27001 cl. 5.2 · A.5.1"),
        desc: L("La politique de sécurité est approuvée et portée par la direction (ici), mais son contenu se rédige dans Directives › Politique de sécurité.",
          "The security policy is approved and sponsored by management (here), but its content is written in Directives › Security policy."),
        href: "directives.html#fiche-politique-securite",
        links: [{ label: L("Directives › Politique de sécurité", "Directives › Security policy") }],
        count: () => grcFicheEntries("directives", "politique-securite").length,
      },
      {
        id: "comite-securite",
        example: { type: "membre", libelle: L("J. Roy", "J. Roy"), role: L("Président du comité", "Committee chair") },
        title: L("Comité de sécurité", "Security committee"),
        ref: L("ISO 27001 A.5.4 · NIST GV.RR", "ISO 27001 A.5.4 · NIST GV.RR"),
        desc: L("Le comité qui suit la sécurité au quotidien. Ajoute son mandat, ses membres, puis ses réunions et décisions au fil du temps. Exemple : membre — « J. Roy », rôle : RSSI, président du comité.",
          "The committee that follows security day to day. Add its mandate, its members, then its meetings and decisions over time. Example: member — \"J. Roy\", role: CISO, committee chair."),
        header: ["libelle", "type"],
        fields: COMITE_FIELDS,
      },
      {
        id: "comite-grc",
        example: { type: "membre", libelle: L("J. Roy", "J. Roy"), role: L("Président du comité", "Committee chair") },
        title: L("Comité GRC", "GRC committee"),
        ref: L("ISO 27001 cl. 9.3 · NIST GV.OV", "ISO 27001 cl. 9.3 · NIST GV.OV"),
        desc: L("Le comité qui arbitre les risques, suit la conformité et les indicateurs. Même logique : mandat, membres, réunions, décisions.",
          "The committee that arbitrates risks and follows compliance and indicators. Same logic: mandate, members, meetings, decisions."),
        header: ["libelle", "type"],
        fields: COMITE_FIELDS,
      },
      {
        id: "comite-crise",
        example: { type: "membre", libelle: L("J. Roy", "J. Roy"), role: L("Président du comité", "Committee chair") },
        title: L("Comité de gestion de crise (CCD)", "Crisis management committee (CCD)"),
        ref: L("ISO 22301 cl. 8.4.2", "ISO 22301 cl. 8.4.2"),
        desc: L("La cellule de crise décisionnelle au niveau de l’organisation : mandat, membres, suppléants, conditions d’activation. Les CCD propres à chaque plan se tiennent dans le registre de Continuité.",
          "The crisis decision cell at organization level: mandate, members, deputies, activation conditions. Plan-specific cells are kept in the Continuity register."),
        header: ["libelle", "type"],
        fields: COMITE_FIELDS,
        links: [{ href: "continuite/pgc.html", label: L("PGC — Plan de gestion de crise", "PGC — Crisis Management Plan") }],
      },
      {
        id: "roles",
        essential: true,
        example: { role: L("Responsable de la sécurité de l’information (RSSI)", "Chief information security officer (CISO)"), titulaire: L("J. Roy", "J. Roy"), suppleant: L("M. Côté", "M. Côté"), responsabilites: L("Pilote le SGSI, suit les risques, prépare la revue de direction", "Runs the ISMS, tracks risks, prepares the management review"), autorite: L("Approuve les exceptions de sécurité", "Approves security exceptions") },
        title: L("Rôles et responsabilités", "Roles and responsibilities"),
        ref: L("ISO 27001 cl. 5.3 · A.5.2 · A.5.3", "ISO 27001 cl. 5.3 · A.5.2 · A.5.3"),
        desc: L("Qui fait quoi en sécurité, avec un suppléant pour chaque rôle clé et ce que le rôle peut approuver. Veille à séparer les tâches incompatibles. Exemple : « RSSI » — titulaire J. Roy, suppléant M. Côté, approuve les exceptions de sécurité.",
          "Who does what in security, with a deputy for every key role and what the role may approve. Keep incompatible duties separate. Example: \"CISO\" — holder J. Roy, deputy M. Côté, approves security exceptions."),
        header: ["role", "titulaire"],
        fields: [
          { id: "role", type: "text", required: true, suggest: "roles", label: L("Rôle", "Role") },
          { id: "titulaire", type: "text", label: L("Titulaire", "Holder") },
          { id: "suppleant", type: "text", label: L("Suppléant", "Deputy") },
          { id: "responsabilites", type: "textarea", label: L("Responsabilités", "Responsibilities") },
          { id: "autorite", type: "textarea", label: L("Autorité (ce qu’il approuve)", "Authority (what it approves)") },
        ],
      },
      {
        // Matrice RACI (note de cours « Qui fait quoi dans l’élaboration de la
        // stratégie ») : une décision par ligne, UN seul A (champ simple).
        id: "raci",
        example: { decision: L("Niveaux de service minimaux (MBCO)", "Minimum service levels (MBCO)"), domaine: "continuite" },
        title: L("Matrice RACI", "RACI matrix"),
        ref: L("ISO 27001 cl. 5.3 · ISO 22301 cl. 5.3", "ISO 27001 cl. 5.3 · ISO 22301 cl. 5.3"),
        desc: L("Qui Réalise, qui Approuve (un seul A par ligne), qui est Consulté, qui est Informé, pour chaque décision clé. Les rôles viennent de « Rôles et responsabilités ». Signal d’alerte : l’informatique qui porte le A sur les niveaux de service décide seule de la promesse faite aux clients. Exemple : « Niveaux de service minimaux (MBCO) » — R directions métier, A direction générale, C RPCA, I DSI.",
          "Who is Responsible, who Approves (a single A per row), who is Consulted, who is Informed, for each key decision. Roles come from \"Roles and responsibilities\". Red flag: IT holding the A on service levels decides alone on the promise made to customers. Example: \"Minimum service levels (MBCO)\" — R business units, A executive management, C BCP manager, I IT."),
        header: ["decision", "domaine"],
        fields: [
          { id: "decision", type: "text", required: true, label: L("Décision / activité", "Decision / activity") },
          { id: "domaine", type: "select", label: L("Domaine", "Area"), options: [O("continuite", "Continuité", "Continuity"), O("securite", "Sécurité / SGSI", "Security / ISMS"), O("risques", "Risques", "Risk"), O("crise", "Gestion de crise", "Crisis management"), O("autre", "Autre", "Other")] },
          { id: "r", linkTo: "role", multi: true, label: L("R — Réalise", "R — Responsible") },
          { id: "a", linkTo: "role", required: true, label: L("A — Approuve et rend des comptes (un seul)", "A — Accountable (only one)") },
          { id: "c", linkTo: "role", multi: true, label: L("C — Consulté", "C — Consulted") },
          { id: "i", linkTo: "role", multi: true, label: L("I — Informé", "I — Informed") },
        ],
      },
{
  id: "communication",
  title: L("Communication", "Communication"),
  ref: L("ISO 27001 cl. 7.4 · ISO 22301 cl. 7.4", "ISO 27001 cl. 7.4 · ISO 22301 cl. 7.4"),
  lead: L("Quoi communiquer, à qui, quand, par qui et comment — en interne comme en externe.", "What to communicate, to whom, when, by whom and how — internally and externally."),
  desc: L("Une entrée par besoin de communication. Relie le public aux parties prenantes du Contexte. Exemple : « Politique de sécurité » — à tous les employés, à l’embauche puis chaque année, par le RSSI, par l’intranet.",
    "One entry per communication need. Link the audience to the interested parties from the Context. Example: \"Security policy\" — to all employees, at hiring then yearly, by the CISO, via the intranet."),
  header: ["sujet", "sens"],
  fields: [
    { id: "sujet", type: "text", required: true, label: L("Sujet (quoi)", "Topic (what)") },
    { id: "sens", type: "select", label: L("Interne ou externe", "Internal or external"), options: [O("interne", "Interne", "Internal"), O("externe", "Externe", "External")] },
    { id: "public", linkTo: "pp", multi: true, label: L("Public (parties prenantes)", "Audience (interested parties)") },
    { id: "quand", type: "text", suggest: "frequence", label: L("Quand / fréquence", "When / frequency") },
    { id: "qui", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Qui communique", "Who communicates") },
    { id: "canal", type: "select", label: L("Comment (canal)", "How (channel)"), options: [
      O("courriel", "Courriel", "Email"), O("reunion", "Réunion", "Meeting"), O("intranet", "Intranet", "Intranet"),
      O("affichage", "Affichage", "Posting"), O("rapport", "Rapport", "Report"), O("autre", "Autre", "Other"),
    ] },
    { id: "message", type: "textarea", hint: L("Quoi dire, en une ou deux phrases", "What to say, in one or two sentences"), label: L("Message ou contenu", "Message or content") },
  ],
  example: { sujet: L("Politique de sécurité", "Security policy"), sens: "interne", quand: L("À l’embauche puis chaque année", "At hiring then yearly"), qui: L("RSSI", "CISO"), canal: "intranet" },
},
      {
        id: "proprietaires-actifs",
        kind: "view",
        title: L("Propriétaires d’actifs", "Asset owners"),
        ref: L("ISO 27001 A.5.9", "ISO 27001 A.5.9"),
        desc: L("Tiré du registre des actifs : chaque actif doit avoir un propriétaire responsable de sa classification et de ses accès. Les actifs sans propriétaire sont signalés.",
          "Taken from the asset register: every asset must have an owner accountable for its classification and access. Assets without an owner are flagged."),
        table: () => ownersTable(grcFicheSrc.assets(), (a) => a.name || a.id,
          "Aucun actif dans le registre (page Actifs).", "No asset in the register (Assets page)."),
        manage: "actifs.html#fiche-registre",
      },
      {
        id: "gestionnaires-risques",
        kind: "view",
        title: L("Gestionnaires de risques", "Risk owners"),
        ref: L("ISO 27001 cl. 6.1.2", "ISO 27001 cl. 6.1.2"),
        desc: L("Tiré du registre des risques : chaque risque a un propriétaire qui décide de son traitement et de son acceptation.",
          "Taken from the risk register: every risk has an owner who decides its treatment and acceptance."),
        table: () => ownersTable(grcFicheSrc.risks(), (r) => r.name || r.id,
          "Aucun risque dans le registre (page Analyse des risques).", "No risk in the register (Risk analysis page)."),
        manage: "analyse-risques.html#fiche-registre",
      },
      {
        id: "appetit-risque",
        example: { domaine: "conformite", enonce: L("Aucun manquement à la Loi 25 n’est acceptable", "No breach of Bill 25 is acceptable"), tolerance: "faible" },
        title: L("Appétit au risque", "Risk appetite"),
        ref: L("ISO 27001 cl. 6.1.1 · NIST GV.RM", "ISO 27001 cl. 6.1.1 · NIST GV.RM"),
        desc: L("Jusqu’où la direction accepte de prendre des risques pour atteindre ses objectifs, domaine par domaine. Exemple : conformité — tolérance faible — « Aucun manquement à la Loi 25 n’est acceptable ».",
          "How much risk management is willing to take to reach its objectives, domain by domain. Example: compliance — low tolerance — \"No breach of Bill 25 is acceptable\"."),
        header: ["enonce", "domaine", "tolerance"],
        fields: [
          { id: "domaine", type: "select", label: L("Domaine", "Domain"), options: [
            O("securite", "Sécurité de l’information", "Information security"), O("conformite", "Conformité", "Compliance"),
            O("financier", "Financier", "Financial"), O("reputation", "Réputation", "Reputation"), O("operationnel", "Opérationnel", "Operational"),
          ] },
          { id: "enonce", type: "textarea", required: true, label: L("Énoncé", "Statement") },
          { id: "tolerance", type: "select", label: L("Tolérance", "Tolerance"), options: [
            O("faible", "Faible", "Low"), O("moderee", "Modérée", "Moderate"), O("elevee", "Élevée", "High"),
          ] },
          { id: "approuvePar", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Approuvé par", "Approved by") },
          { id: "date", type: "text", label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
        ],
      },
      {
        id: "criteres-acceptation",
        essential: true,
        example: { critere: L("Score P × I ≤ 8", "P × I score ≤ 8"), autorite: L("Propriétaire du risque", "Risk owner"), duree: L("12 mois", "12 months"), seuilPxI: "8", conditions: L("Réexamen à chaque revue de direction", "Re-examined at each management review") },
        title: L("Critères d’acceptation", "Acceptance criteria"),
        ref: L("ISO 27001 cl. 6.1.2 a)", "ISO 27001 cl. 6.1.2 a)"),
        desc: L("Les seuils sous lesquels un risque peut être accepté, et par qui. Ils traduisent l’appétit au risque en règles utilisables dans le registre des risques. Exemple : « Score P × I ≤ 8 » — accepté par le propriétaire du risque, 12 mois maximum.",
          "The thresholds below which a risk may be accepted, and by whom. They turn the risk appetite into rules usable in the risk register. Example: \"P × I score ≤ 8\" — accepted by the risk owner, 12 months maximum."),
        header: ["critere", "autorite"],
        fields: [
          { id: "critere", type: "text", required: true, label: L("Critère (ex. P × I ≤ 8, ALE ≤ 10 000 $)", "Criterion (e.g. P × I ≤ 8, ALE ≤ $10,000)") },
          { id: "autorite", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Qui peut accepter", "Who may accept") },
          { id: "duree", type: "text", suggest: "duree", label: L("Durée maximale d’acceptation", "Maximum acceptance period") },
          { id: "conditions", type: "textarea", label: L("Conditions", "Conditions") },

          { id: "seuilPxI", type: "number", label: L("Seuil chiffré P × I (au-delà : à traiter)", "Numeric P × I threshold (above: to treat)") },
          { id: "seuilAle", type: "number", hint: L("Montant annuel ($) au-delà duquel le risque doit être traité", "Annual amount ($) above which the risk must be treated"), label: L("Seuil ALE (au-delà : à traiter)", "ALE threshold (above: to treat)") },
        ],
      },
      {
        id: "revues-direction",
        cross: [{ label: L("Créer une action", "Create an action"), page: "gouvernance", tab: "amelioration", list: "renderGrcFiche_gouvernance_amelioration", values: (e) => ({ origine: "revue", sourceRevue: e.id }) }],
        essential: true,
        autoFill: { label: L("Préparer automatiquement", "Prepare automatically"), values: () => grcGovReviewPrefill() },
        lead: L("Au moins une fois par an, la direction examine le SGSI à partir d’entrées obligatoires et décide des suites.", "At least yearly, management examines the ISMS from mandatory inputs and decides on follow-up."),
        title: L("Revues de direction", "Management reviews"),
        ref: L("ISO 27001 cl. 9.3 · ISO 22301 cl. 9.3", "ISO 27001 cl. 9.3 · ISO 22301 cl. 9.3"),
        desc: L("La revue périodique (au moins annuelle) où la direction examine le SGSI et le PCA : état des actions, résultats d’audits, indicateurs, risques, et décide des changements. Une entrée par revue.",
          "The periodic (at least yearly) review where management examines the ISMS and the BCP: action status, audit results, indicators, risks, and decides on changes. One entry per review."),
        header: ["date", "decisions"],
        fields: [
          { id: "date", type: "text", required: true, label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
          { id: "participants", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Participants", "Participants") },
          { id: "entrees", type: "textarea", hint: L("Liste des sujets présentés à la direction", "List of topics presented to management"), label: L("Entrées examinées", "Inputs reviewed") },
          { id: "decisions", type: "textarea", hint: L("Ce que la direction a décidé (ressources, priorités, risques acceptés…)", "What management decided (resources, priorities, accepted risks…)"), label: L("Décisions", "Decisions") },
          { id: "actions", type: "textarea", hint: L("Qui fait quoi, pour quand", "Who does what, by when"), label: L("Actions", "Actions") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable du suivi", "Follow-up owner") },
          { id: "echeance", type: "text", label: L("Échéance (AAAA-MM-JJ)", "Due date (YYYY-MM-DD)") },

          { id: "inActions", type: "textarea", hint: L("Actions des revues précédentes : faites, en retard, abandonnées", "Actions from previous reviews: done, late, dropped"), label: L("Entrée — état des actions des revues précédentes", "Input — status of actions from previous reviews") },
          { id: "inChangements", type: "textarea", hint: L("Changements internes ou externes depuis la dernière revue", "Internal or external changes since the last review"), label: L("Entrée — changements des enjeux internes et externes", "Input — changes in internal and external issues") },
          { id: "inRetours", type: "textarea", hint: L("Nouvelles attentes de clients, autorités, employés…", "New expectations from customers, authorities, staff…"), label: L("Entrée — besoins et attentes des parties prenantes", "Input — needs and expectations of interested parties") },
          { id: "inNc", type: "textarea", hint: L("Écarts relevés et état des actions correctives", "Nonconformities found and status of corrective actions"), label: L("Entrée — non-conformités et actions correctives", "Input — nonconformities and corrective actions") },
          { id: "inSurveillance", type: "textarea", hint: L("Tendances des indicateurs (KPI / KRI)", "Indicator trends (KPI / KRI)"), label: L("Entrée — résultats de surveillance et de mesure", "Input — monitoring and measurement results") },
          { id: "inAudits", type: "textarea", hint: L("Principaux constats des audits internes et externes", "Main findings of internal and external audits"), label: L("Entrée — résultats d’audit", "Input — audit results") },
          { id: "inObjectifs", type: "textarea", hint: L("Objectifs atteints, en retard, à revoir", "Objectives met, late, to be revised"), label: L("Entrée — atteinte des objectifs", "Input — fulfilment of objectives") },
          { id: "inRisques", type: "textarea", hint: L("Nouveaux risques, risques hors tolérance, avancement des plans", "New risks, risks beyond tolerance, plan progress"), label: L("Entrée — résultats de l’appréciation des risques et plan de traitement", "Input — risk assessment results and treatment plan") },
          { id: "inAmelioration", type: "textarea", hint: L("Idées et opportunités d’amélioration relevées", "Improvement ideas and opportunities raised"), label: L("Entrée — opportunités d’amélioration continue", "Input — opportunities for continual improvement") },
          { id: "decisionIds", linkTo: "amelioration", multi: true, label: L("Actions décidées (registre d’amélioration)", "Decided actions (improvement register)") },
          { id: "modificationIds", linkTo: "modification", multi: true, label: L("Modifications du système décidées", "Decided system changes") },
        ],
      },
{
  id: "amelioration",
  essential: true,
  title: L("Amélioration et actions correctives", "Improvement and corrective actions"),
  ref: L("ISO 27001 cl. 10.1 · 10.2 · ISO 22301 cl. 10", "ISO 27001 cl. 10.1 · 10.2 · ISO 22301 cl. 10"),
  lead: L("Le registre UNIQUE des non-conformités, actions correctives et améliorations, quelle que soit leur source.", "The SINGLE register of nonconformities, corrective actions and improvements, whatever their source."),
  desc: L("Audit, incident, leçon apprise, revue de direction, indicateur, exercice de continuité : tout aboutit ici. Pour une non-conformité : corriger, analyser les causes, agir sur les causes, puis vérifier l’efficacité avant de clore. Les autres pages (Incidents, Continuité, Conformité) affichent des vues filtrées de ce registre.",
    "Audit, incident, lesson learned, management review, indicator, continuity exercise: everything ends up here. For a nonconformity: correct, analyse causes, act on causes, then check effectiveness before closing. Other pages (Incidents, Continuity, Compliance) show filtered views of this register."),
  header: ["description", "nature", "statut"],
  fields: [
    { id: "nature", type: "select", label: L("Nature", "Nature"), options: [
      O("nc", "Non-conformité", "Nonconformity"), O("observation", "Observation", "Observation"), O("amelioration", "Amélioration", "Improvement"),
    ] },
    { id: "origine", type: "select", label: L("Source", "Source"), options: [
      O("audit", "Audit", "Audit"), O("incident", "Incident", "Incident"), O("revue", "Revue de direction", "Management review"),
      O("indicateur", "Indicateur", "Indicator"), O("continuite", "Continuité (exercice, test)", "Continuity (exercise, test)"),
      O("plainte", "Plainte / retour", "Complaint / feedback"), O("autre", "Autre", "Other"),
    ] },
    { id: "description", type: "textarea", required: true, label: L("Constat ou amélioration", "Finding or improvement") },
    { id: "sourceConstat", linkTo: "finding", label: L("Constat d’audit lié", "Linked audit finding") },
    { id: "sourceIncident", linkTo: "incident", label: L("Incident lié", "Linked incident") },
    { id: "sourceLecon", linkTo: "lecon", label: L("Leçon apprise liée", "Linked lesson learned") },
    { id: "sourceRevue", linkTo: "revue", label: L("Revue de direction liée", "Linked management review") },
    { id: "sourceIndicateur", linkTo: "metric", label: L("Indicateur lié", "Linked indicator") },
    { id: "correction", type: "textarea", label: L("Correction immédiate", "Immediate correction") },
    { id: "causes", type: "textarea", label: L("Analyse des causes", "Root-cause analysis") },
    { id: "action", type: "textarea", label: L("Action sur les causes / amélioration", "Action on causes / improvement") },
    { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
    { id: "echeance", type: "date", label: L("Échéance", "Due date") },
    { id: "statut", type: "select", label: L("Statut", "Status"), options: [
      O("ouverte", "Ouverte", "Open"), O("encours", "En cours", "In progress"), O("close", "Close", "Closed"),
    ] },
    { id: "verification", type: "textarea", hint: L("Comment on vérifie que l’action a réglé le problème, et quand", "How and when you check the action solved the problem"), label: L("Vérification de l’efficacité", "Effectiveness check") },
  ],
  example: { nature: "nc", origine: "audit", description: L("Les accès des départs ne sont pas retirés sous 24 h", "Leavers’ access is not removed within 24 h"), correction: L("Retrait immédiat des 3 comptes trouvés", "Immediate removal of the 3 accounts found"), causes: L("Aucune alerte RH vers l’équipe TI", "No HR alert to the IT team"), action: L("Formulaire de départ relié au service TI", "Leaver form connected to IT"), statut: "encours" },
},
{
  id: "modifications",
  title: L("Modifications du système", "Changes to the management system"),
  ref: L("ISO 27001 cl. 6.3", "ISO 27001 cl. 6.3"),
  lead: L("Les changements du SGSI lui-même (portée, organisation, processus, outils du système), planifiés et maîtrisés.", "Changes to the ISMS itself (scope, organisation, processes, system tools), planned and controlled."),
  desc: L("À ne pas confondre avec la gestion des changements techniques (Procédures › Changements), qui porte sur les systèmes d’information. Ici : motif, conséquences, ressources, responsable, et ce qui doit être revu (risques, contrôles, processus, documents) avant de clore.",
    "Not to be confused with technical change management (Procedures › Changes), which covers information systems. Here: reason, consequences, resources, owner, and what must be reviewed (risks, controls, processes, documents) before closing."),
  header: ["modification", "statut"],
  fields: [
    { id: "modification", type: "text", required: true, label: L("Modification", "Change") },
    { id: "motif", type: "textarea", label: L("Motif", "Reason") },
    { id: "consequences", type: "textarea", hint: L("Ce qui pourrait mal tourner pendant ou après le changement", "What could go wrong during or after the change"), label: L("Conséquences possibles", "Potential consequences") },
    { id: "ressources", type: "text", hint: L("Personnes, budget, outils nécessaires", "People, budget, tools needed"), label: L("Ressources", "Resources") },
    { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
    { id: "echeance", type: "date", label: L("Échéance", "Due date") },
    { id: "statut", type: "select", label: L("Statut", "Status"), options: [
      O("planifiee", "Planifiée", "Planned"), O("encours", "En cours", "In progress"), O("realisee", "Réalisée", "Completed"), O("annulee", "Annulée", "Cancelled"),
    ] },
    { id: "risques", linkTo: "risk", multi: true, label: L("Risques touchés", "Affected risks") },
    { id: "controles", linkTo: "control", multi: true, label: L("Contrôles touchés", "Affected controls") },
    { id: "processus", linkTo: "processus", multi: true, label: L("Processus touchés", "Affected processes") },
    { id: "documents", linkTo: "document", multi: true, label: L("Documents touchés", "Affected documents") },
    { id: "revus", type: "select", label: L("Éléments touchés revus", "Affected items reviewed"), options: [O("non", "Non", "No"), O("oui", "Oui", "Yes")] },
  ],
  example: { modification: L("Ajout du site de Laval à la portée", "Adding the Laval site to the scope"), motif: L("Ouverture d’un bureau", "New office opening"), statut: "planifiee", revus: "non" },
},
      {
        id: "registre-documentaire",
        kind: "register",
        title: L("Registre documentaire et autorité", "Document register and authority"),
        ref: L("ISO 27001 cl. 7.5", "ISO 27001 cl. 7.5"),
        desc: L("Les documents de gouvernance (politiques, registre d’autorité) avec leur cycle de vie, et la table « qui approuve quoi ».",
          "Governance documents (policies, authority register) with their lifecycle, and the \"who approves what\" table."),
        block: "#grcDocumentsRegistry",
        count: () => grcFicheSrc.documents().filter((d) => d.docType === "authority-register" || d.docType === "policy").length,
        reinit: () => initGrcDocumentsRegistry({ docTypes: ["authority-register", "policy"], primaryType: "authority-register" }),
        table: () => ({
          columns: [L("Document", "Document"), L("Type", "Type"), L("Version", "Version"), L("Statut", "Status"), L("Approbateur", "Approver")],
          rows: grcFicheSrc.documents().filter((d) => d.docType === "authority-register" || d.docType === "policy")
            .map((d) => [d.title || "", d.docType || "", d.version || "", d.status || "", d.approver || ""]),
        }),
      },
    ],
  });
})();
