/* Documentation — Gestion des fournisseurs (grc/fournisseurs.html) ·
   ISO 27001 A.5.19–A.5.23. Treizième étape : la sécurité des tiers. Le
   registre des fournisseurs existant est réutilisé (évaluation du risque,
   clauses, certifications, revue) ; classification, due diligence, SLA et
   exigences ont leurs fiches, reliées à un fournisseur du registre.
   Moteur : grc-fiches.js ; plan : spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const sups = () => grcFicheSrc.suppliers();
  const crit = (v) => (["vital", "critique", "important", "mineur"].indexOf(v) !== -1 ? grcT("grc.fournisseurs.crit." + v) : (v || ""));
  const supRef = { id: "fournisseur", type: "ref", linkTo: "supplier", label: L("Fournisseur", "Supplier"),
    source: () => grcFicheRefFrom(sups(), (s) => s.name) };
  const yn = (b) => (b ? grcFicheL(L("Oui", "Yes")) : grcFicheL(L("Non", "No")));

  grcFicheRegister("fournisseurs", {
    docTitle: L("Sécurité dans les relations avec les fournisseurs", "Information security in supplier relationships"),
    docRef: "ISO/IEC 27001:2022 A.5.19 – A.5.23 · NIST CSF 2.0 GV.SC",
    elements: [
      {
        id: "registre",
        essential: true,
        kind: "register",
        title: L("Registre des fournisseurs", "Supplier register"),
        ref: L("ISO 27001 A.5.19 · NIST GV.SC", "ISO 27001 A.5.19 · NIST GV.SC"),
        desc: L("Un fournisseur par entrée : service, criticité, données partagées, évaluation du risque, contrat et clauses, certifications, cycle de vie et revue.",
          "One supplier per entry: service, criticality, data shared, risk assessment, contract and clauses, certifications, lifecycle and review."),
        block: "#grcSuppliersRegistry",
        count: () => sups().length,
        reinit: () => initGrcSuppliersRegistry(),
        table: () => ({
          columns: [L("Fournisseur", "Supplier"), L("Service", "Service"), L("Criticité", "Criticality"), L("Données partagées", "Data shared"), L("Statut", "Status")],
          rows: sups().map((s) => [s.name || "", s.service || "", crit(s.criticality), s.dataShared || "", s.status || ""]),
        }),
      },
      {
        id: "classification",
        example: { niveau: "critique", criteres: L("Accès aux données clients ou service indispensable à la paie", "Access to client data or service essential to payroll"), exigences: L("Clauses de sécurité, SOC 2, revue annuelle", "Security clauses, SOC 2, yearly review") },
        essential: true,
        title: L("Classification des fournisseurs", "Supplier classification"),
        ref: L("ISO 27001 A.5.19", "ISO 27001 A.5.19"),
        desc: L("Les niveaux de criticité utilisés dans le registre et ce qu’ils exigent. Une entrée par niveau. Exemple : « Vital » — accès à des données personnelles ou service sans lequel l’activité s’arrête ; exige certification ou audit annuel, clause de notification 24 h.",
          "The criticality levels used in the register and what they require. One entry per level. Example: \"Vital\" — access to personal data or a service without which the business stops; requires certification or yearly audit, 24 h notification clause."),
        header: ["criteres", "niveau"],
        fields: [
          { id: "niveau", type: "select", label: L("Niveau", "Level"), options: [
            O("vital", "Vital", "Vital"), O("critique", "Critique", "Critical"), O("important", "Important", "Important"), O("mineur", "Mineur", "Minor"),
          ] },
          { id: "criteres", type: "textarea", required: true, label: L("Critères", "Criteria") },
          { id: "exigences", type: "textarea", label: L("Exigences associées", "Associated requirements") },
          { id: "revue", type: "text", suggest: "frequence", label: L("Fréquence de revue", "Review frequency") },
        ],
      },
      {
        id: "evaluation",
        kind: "view",
        title: L("Évaluation des risques tiers", "Third-party risk assessment"),
        ref: L("ISO 27001 A.5.19 · NIST GV.SC", "ISO 27001 A.5.19 · NIST GV.SC"),
        desc: L("Score de risque de chaque fournisseur (probabilité × impact) et résiduel, tirés du registre.",
          "Risk score of each supplier (likelihood × impact) and residual, taken from the register."),
        table: () => ({
          columns: [L("Fournisseur", "Supplier"), L("Criticité", "Criticality"), L("Score", "Score"), L("Résiduel", "Residual"), L("Mesures", "Controls")],
          rows: sups().map((s) => {
            const r = s.risk || {};
            const sc = typeof grcSupRiskScore === "function" ? grcSupRiskScore(s) : (r.likelihood || 1) * (r.impact || 1);
            return [s.name || "", crit(s.criticality), String(sc), r.residual == null ? "—" : String(r.residual), r.controls || ""];
          }),
          empty: L("Aucun fournisseur.", "No supplier."),
        }),
        manage: "registre",
      },
      {
        id: "due-diligence",
        example: { question: L("Le fournisseur chiffre-t-il les données au repos ?", "Does the supplier encrypt data at rest?"), reponse: L("Oui, AES-256", "Yes, AES-256") },
        title: L("Due diligence", "Due diligence"),
        ref: L("ISO 27001 A.5.19 · A.5.20", "ISO 27001 A.5.19 · A.5.20"),
        desc: L("Les vérifications faites avant de retenir un fournisseur : une entrée par question posée, avec la réponse et la preuve. Exemple : « Chiffrez-vous nos données au repos ? » — oui, AES-256 — rapport SOC 2 section 4.",
          "The checks made before selecting a supplier: one entry per question asked, with the answer and the evidence. Example: \"Do you encrypt our data at rest?\" — yes, AES-256 — SOC 2 report section 4."),
        header: ["question", "fournisseur", "resultat"],
        fields: [
          supRef,
          { id: "domaine", type: "select", label: L("Domaine", "Domain"), options: [
            O("securite", "Sécurité", "Security"), O("vieprivee", "Vie privée", "Privacy"), O("continuite", "Continuité", "Continuity"),
            O("financier", "Solidité financière", "Financial soundness"), O("legal", "Légal", "Legal"), O("autre", "Autre", "Other"),
          ] },
          { id: "question", type: "textarea", required: true, label: L("Question", "Question") },
          { id: "reponse", type: "textarea", label: L("Réponse", "Answer") },
          { id: "preuve", type: "text", hint: L("Rapport SOC 2, certificat ISO, questionnaire rempli…", "SOC 2 report, ISO certificate, completed questionnaire…"), label: L("Preuve", "Evidence") },
          { id: "resultat", type: "select", label: L("Résultat", "Result"), options: [
            O("conforme", "Conforme", "Satisfactory"), O("partiel", "Partiel", "Partial"), O("nonconforme", "Non conforme", "Unsatisfactory"),
          ] },
          { id: "date", type: "text", label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
        ],
      },
      {
        id: "clauses",
        kind: "view",
        title: L("Clauses contractuelles", "Contract clauses"),
        ref: L("ISO 27001 A.5.20", "ISO 27001 A.5.20"),
        desc: L("Ce que prévoit chaque contrat : clauses de sécurité, délai de notification des incidents, droit d’audit, plan de sortie, entente sur les données (DPA). Les manques sont visibles d’un coup d’œil.",
          "What each contract provides: security clauses, incident notification delay, right to audit, exit plan, data processing agreement (DPA). Gaps are visible at a glance."),
        table: () => ({
          columns: [L("Fournisseur", "Supplier"), L("Clauses sécurité", "Security clauses"), L("Notification (h)", "Notification (h)"), L("Droit d’audit", "Right to audit"), L("Plan de sortie", "Exit plan"), L("DPA", "DPA"), L("Fin de contrat", "Contract end")],
          rows: sups().map((s) => {
            const c = s.contract || {};
            return [s.name || "", yn(c.securityClauses), c.breachNotifDelayH == null ? "—" : String(c.breachNotifDelayH),
              yn(c.rightToAudit), yn(c.exitPlan), yn(c.dpaSigned), grcFicheFmtDate(c.endDate)];
          }),
          empty: L("Aucun fournisseur.", "No supplier."),
        }),
        manage: "registre",
      },
      {
        id: "sla",
        example: { service: L("Hébergement de la paie", "Payroll hosting"), indicateur: L("Disponibilité mensuelle", "Monthly availability"), cible: "99,9 %" },
        essential: true,
        title: L("SLA", "SLAs"),
        ref: L("ISO 27001 A.5.20 · ISO 22301 cl. 8.3", "ISO 27001 A.5.20 · ISO 22301 cl. 8.3"),
        desc: L("Les engagements de service de chaque fournisseur critique et leur lien avec la continuité (MAO). Exemple : hébergeur — disponibilité 99,9 % par mois, rétablissement en 4 h, pénalité 10 % de la facture.",
          "The service commitments of each critical supplier and their link to continuity (MAO). Example: hosting provider — 99.9% monthly availability, 4 h restoration, 10% invoice penalty."),
        header: ["indicateur", "fournisseur", "cible"],
        fields: [
          supRef,
          { id: "service", type: "text", label: L("Service", "Service") },
          { id: "indicateur", type: "text", required: true, suggest: "indicateur-sla", label: L("Indicateur (disponibilité, délai…)", "Indicator (availability, time…)") },
          { id: "cible", type: "text", label: L("Cible", "Target") },
          { id: "penalite", type: "text", hint: L("Ce qui s’applique si le niveau n’est pas atteint (crédit, résiliation…)", "What applies if the level is missed (credit, termination…)"), label: L("Pénalité", "Penalty") },
          { id: "mao", type: "text", hint: L("Durée d’interruption maximale couverte par le contrat (ex. 8 h)", "Maximum outage covered by the contract (e.g. 8 h)"), label: L("MAO couverte", "MAO covered") },
        ],
      },
      {
        id: "exigences-continuite",
        example: { exigence: L("Plan de continuité testé chaque année", "Continuity plan tested yearly"), clause: L("Art. 12 du contrat", "Contract art. 12") },
        title: L("Exigences de continuité", "Continuity requirements"),
        ref: L("ISO 27001 A.5.21 · ISO 22301 cl. 8.3", "ISO 27001 A.5.21 · ISO 22301 cl. 8.3"),
        desc: L("Ce que les fournisseurs critiques doivent garantir en cas de sinistre : PCA testé, site de repli, délai de reprise, réversibilité.",
          "What critical suppliers must guarantee during a disruption: tested BCP, recovery site, recovery time, exit capability."),
        header: ["exigence", "fournisseur"],
        fields: [
          supRef,
          { id: "exigence", type: "textarea", required: true, label: L("Exigence", "Requirement") },
          { id: "clause", type: "text", label: L("Clause du contrat", "Contract clause") },
          { id: "verification", type: "text", suggest: "verification", label: L("Comment c’est vérifié", "How it is verified") },
        ],
      },
{
  id: "capacites-continuite",
  title: L("Capacités de continuité des fournisseurs", "Supplier continuity capabilities"),
  ref: L("ISO 22301 cl. 8.3 · 8.4 · ISO 27002 5.30", "ISO 22301 cl. 8.3 · 8.4 · ISO 27002 5.30"),
  lead: L("Ce que le fournisseur est réellement capable de faire en cas de crise, vérifié et comparé à tes besoins (RTO, DMIA).", "What the supplier can actually do in a crisis, verified and compared to your needs (RTO, MTPD)."),
  desc: L("Une entrée par fournisseur critique : son RTO déclaré, la preuve (test, rapport SOC 2, attestation), l’écart avec ton besoin et l’action si l’écart est trop grand. Exemple : hébergeur — RTO déclaré 8 h, besoin 4 h → écart, action : clause contractuelle ou second site.",
    "One entry per critical supplier: its declared RTO, the evidence (test, SOC 2 report, attestation), the gap with your need and the action if the gap is too large. Example: host — declared RTO 8 h, need 4 h → gap, action: contract clause or second site."),
  header: ["capacite", "ecart"],
  fields: [
    { id: "fournisseur", linkTo: "supplier", required: true, label: L("Fournisseur", "Supplier") },
    { id: "capacite", type: "text", required: true, label: L("Capacité déclarée (ex. RTO 8 h)", "Declared capability (e.g. RTO 8 h)") },
    { id: "preuve", type: "text", label: L("Preuve", "Evidence") },
    { id: "besoin", type: "text", label: L("Besoin de l’organisation", "Organization's need") },
    { id: "ecart", type: "select", label: L("Écart", "Gap"), options: [O("aucun", "Aucun", "None"), O("mineur", "Mineur", "Minor"), O("majeur", "Majeur", "Major")] },
    { id: "actions", linkTo: "amelioration", multi: true, label: L("Actions (registre d’amélioration)", "Actions (improvement register)") },
    { id: "dateRevue", type: "date", label: L("Prochaine vérification", "Next verification") },
  ],
  example: { capacite: L("RTO déclaré 8 h", "Declared RTO 8 h"), preuve: L("Rapport SOC 2 type II 2026", "2026 SOC 2 type II report"), besoin: L("RTO 4 h", "RTO 4 h"), ecart: "majeur" },
},
      {
        id: "exigences-securite",
        example: { exigence: L("MFA pour tout accès administrateur", "MFA for all administrator access"), clause: L("Annexe sécurité, art. 3", "Security schedule, art. 3") },
        essential: true,
        title: L("Exigences de sécurité", "Security requirements"),
        ref: L("ISO 27001 A.5.20 · A.5.21", "ISO 27001 A.5.20 · A.5.21"),
        desc: L("Les exigences de sécurité imposées aux fournisseurs : chiffrement, MFA, notification des incidents, sous-traitance, localisation des données.",
          "Security requirements imposed on suppliers: encryption, MFA, incident notification, subcontracting, data location."),
        header: ["exigence", "fournisseur"],
        fields: [
          supRef,
          { id: "exigence", type: "textarea", required: true, label: L("Exigence", "Requirement") },
          { id: "clause", type: "text", label: L("Clause du contrat", "Contract clause") },
          { id: "verification", type: "text", suggest: "verification", label: L("Comment c’est vérifié", "How it is verified") },
        ],
      },
      {
        id: "evaluations-periodiques",
        kind: "view",
        title: L("Évaluations périodiques", "Periodic assessments"),
        ref: L("ISO 27001 A.5.22", "ISO 27001 A.5.22"),
        desc: L("Dernière revue de chaque fournisseur et prochaine échéance ; les revues en retard sont signalées.",
          "Last review of each supplier and next due date; overdue reviews are flagged."),
        table: () => ({
          columns: [L("Fournisseur", "Supplier"), L("Dernière revue", "Last review"), L("Prochaine revue", "Next review"), L("Certifications", "Certifications")],
          rows: sups().map((s) => {
            const rv = (s.lifecycle && s.lifecycle.review) || {};
            const late = rv.nextDueAt && Date.parse(rv.nextDueAt) < Date.now();
            return [s.name || "", grcFicheFmtDate(rv.lastReviewedAt) || "—", grcFicheFmtDate(rv.nextDueAt) + (late ? " ⚠" : ""),
              (s.certifications || []).map((c) => c.kind).join(", ")];
          }),
          empty: L("Aucun fournisseur.", "No supplier."),
        }),
        manage: "registre",
      },
      {
        id: "dependances-critiques",
        kind: "view",
        title: L("Gestion des dépendances critiques", "Critical dependency management"),
        ref: L("ISO 27001 A.5.21 · ISO 22301 cl. 8.2.2", "ISO 27001 A.5.21 · ISO 22301 cl. 8.2.2"),
        desc: L("Les fournisseurs vitaux ou critiques et les plans de continuité qui en dépendent (dépendances de type fournisseur du registre PCA/PRA). Un fournisseur unique sans solution de repli est un SPOF.",
          "Vital or critical suppliers and the continuity plans that rely on them (supplier-type dependencies in the BCP/DRP register). A single supplier with no fallback is a SPOF."),
        table: () => {
          const plans = grcFicheSrc.continuity();
          return {
            columns: [L("Fournisseur", "Supplier"), L("Criticité", "Criticality"), L("Plans qui en dépendent", "Plans relying on it"), L("SPOF", "SPOF")],
            rows: sups().filter((s) => s.criticality === "vital" || s.criticality === "critique").map((s) => {
              const deps = [];
              let spof = false;
              plans.forEach((p) => (p.dependencies || []).forEach((d) => {
                if (d.type === "supplier" && (d.ref || "").trim().toLowerCase() === (s.name || "").trim().toLowerCase()) {
                  deps.push(p.service || "");
                  if (d.spof) spof = true;
                }
              }));
              return [s.name || "", crit(s.criticality), deps.join(", ") || "—", spof ? "⚠ " + grcFicheL(L("Oui", "Yes")) : grcFicheL(L("Non", "No"))];
            }),
            empty: L("Aucun fournisseur vital ou critique.", "No vital or critical supplier."),
          };
        },
        manage: "registre",
        links: [{ href: "continuite.html#fiche-faire-plan", label: L("Registre PCA/PRA", "BCP/DRP register") }],
      },
    ],
  });
})();
