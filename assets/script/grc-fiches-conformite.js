/* Documentation — Gestion de la conformité (grc/conformite.html) ·
   ISO 27001 A.5.31–A.5.36. Douzième étape : prouver qu'on respecte ses
   obligations. Le registre de conformité (obligations + audits) est
   réutilisé ; normes, audits, écarts et plans correctifs en sont des vues
   filtrées. La vie privée (Loi 25) a sa propre page :
   grc-fiches-vie-privee.js (spec/grc-hub-iso/).
   Moteur : grc-fiches.js ; plan : spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const all = () => grcFicheSrc.compliance();
  const obligations = () => all().filter((e) => e.kind !== "audit");
  const audits = () => all().filter((e) => e.kind === "audit");
  const text = (o) => [o.ref, o.title, o.sourceRef, o.notes].join(" ").toLowerCase();

  const oblCols = [L("Réf.", "Ref."), L("Obligation", "Obligation"), L("Applicabilité", "Applicability"), L("Statut", "Status"), L("Propriétaire", "Owner")];
  const oblRow = (o) => [o.ref || "", o.title || "", o.applicability || "", o.status || "", o.owner || ""];

  function oblView(id, fr, en, ref, descFr, descEn, filter, emptyFr, emptyEn) {
    return {
      id: id, kind: "view", title: L(fr, en), ref: L(ref, ref), desc: L(descFr, descEn),
      table: () => ({ columns: oblCols, rows: obligations().filter(filter).map(oblRow), empty: L(emptyFr, emptyEn) }),
      manage: "registre-conformite",
    };
  }

  function auditView(id, fr, en, types, descFr, descEn) {
    return {
      id: id, kind: "view", title: L(fr, en), ref: L("ISO 27001 cl. 9.2 · A.5.35", "ISO 27001 cl. 9.2 · A.5.35"), desc: L(descFr, descEn),
      table: () => ({
        columns: [L("Audit", "Audit"), L("Type", "Type"), L("Périmètre", "Scope"), L("Auditeur", "Auditor"), L("Constats", "Findings"), L("Statut", "Status")],
        rows: audits().filter((a) => types.indexOf(a.type) !== -1)
          .map((a) => [a.title || "", a.type || "", a.scope || "", a.auditor || "", String((a.findings || []).length), a.status || ""]),
        empty: L("Aucun audit de ce type.", "No audit of this type."),
      }),
      manage: "registre-conformite",
    };
  }

  const findings = () => {
    const rows = [];
    audits().forEach((a) => (a.findings || []).forEach((f) => rows.push({ audit: a.title || "", f: f })));
    return rows;
  };

  grcFicheRegister("conformite", {
    docTitle: L("Gestion de la conformité", "Compliance management"),
    docRef: "ISO/IEC 27001:2022 A.5.31 – A.5.36 · cl. 9.2 · cl. 10.2",
    elements: [
      oblView("iso27001", "ISO 27001", "ISO 27001", "ISO 27001 cl. 4 – 10 · Annexe A",
        "Les exigences de la norme ISO 27001 suivies dans le registre de conformité (obligations dont la référence mentionne 27001).",
        "ISO 27001 requirements tracked in the compliance register (obligations whose reference mentions 27001).",
        (o) => text(o).indexOf("27001") !== -1, "Aucune obligation ISO 27001 — ajoute-les dans « Registre de conformité ».", "No ISO 27001 obligation — add them in \"Compliance register\"."),
      oblView("iso27005", "ISO 27005", "ISO 27005", "ISO 27005",
        "La méthode de gestion des risques retenue (obligations dont la référence mentionne 27005).",
        "The risk management method adopted (obligations whose reference mentions 27005).",
        (o) => text(o).indexOf("27005") !== -1, "Aucune obligation ISO 27005.", "No ISO 27005 obligation."),
      oblView("iso22301", "ISO 22301", "ISO 22301", "ISO 22301",
        "Les exigences du système de management de la continuité (obligations dont la référence mentionne 22301).",
        "Business continuity management system requirements (obligations whose reference mentions 22301).",
        (o) => text(o).indexOf("22301") !== -1, "Aucune obligation ISO 22301.", "No ISO 22301 obligation."),
      oblView("legales", "Exigences légales", "Legal requirements", "ISO 27001 A.5.31",
        "Toutes les lois et règlements applicables (obligations de source « loi »).",
        "All applicable laws and regulations (obligations with a \"law\" source).",
        (o) => o.sourceType === "law", "Aucune exigence légale.", "No legal requirement."),
      oblView("contractuelles", "Exigences contractuelles", "Contractual requirements", "ISO 27001 A.5.31 · A.5.20",
        "Les obligations de sécurité envers clients et partenaires (obligations de source « contrat »).",
        "Security obligations towards customers and partners (obligations with a \"contract\" source).",
        (o) => o.sourceType === "contract", "Aucune exigence contractuelle.", "No contractual requirement."),
{
  id: "programme-audit",
  essential: true,
  title: L("Programme d’audit interne", "Internal audit programme"),
  ref: L("ISO 27001 cl. 9.2.2 · ISO 22301 cl. 9.2", "ISO 27001 cl. 9.2.2 · ISO 22301 cl. 9.2"),
  lead: L("Le plan pluriannuel des audits internes : quoi auditer, quand, par qui, selon quels critères.", "The multi-year internal audit plan: what to audit, when, by whom, against which criteria."),
  desc: L("Une entrée par cycle ou campagne d’audit. Sur un cycle (souvent 3 ans), les clauses 4 à 10 et les contrôles applicables doivent tous être couverts ; l’auditeur ne peut pas auditer son propre travail. Relie chaque entrée à l’audit réalisé dans le registre de conformité.",
    "One entry per audit cycle or campaign. Over a cycle (often 3 years), clauses 4 to 10 and the applicable controls must all be covered; auditors may not audit their own work. Link each entry to the audit carried out in the compliance register."),
  header: ["cycle", "periode"],
  fields: [
    { id: "cycle", type: "text", required: true, label: L("Cycle ou campagne", "Cycle or campaign") },
    { id: "periode", type: "text", label: L("Période (ex. T2 2027)", "Period (e.g. Q2 2027)") },
    { id: "clauses", type: "text", label: L("Clauses couvertes (ex. 4, 5, 6)", "Clauses covered (e.g. 4, 5, 6)") },
    { id: "catalogue", linkTo: "annex", multi: true, label: L("Contrôles de l’Annexe A couverts", "Annex A controls covered") },
    { id: "processus", linkTo: "processus", multi: true, label: L("Processus audités", "Audited processes") },
    { id: "criteres", type: "textarea", hint: L("Référentiel audité, échantillonnage, entrevues, tests…", "Audited framework, sampling, interviews, tests…"), label: L("Critères et méthode", "Criteria and method") },
    { id: "auditeur", type: "text", label: L("Auditeur", "Auditor") },
    { id: "independance", type: "textarea", label: L("Indépendance (pourquoi l’auditeur est impartial)", "Independence (why the auditor is impartial)") },
    { id: "audit", linkTo: "audit", label: L("Audit réalisé (registre)", "Audit carried out (register)") },
  ],
  example: { cycle: L("Cycle 2027-2029 — année 1", "2027-2029 cycle — year 1"), periode: L("T2 2027", "Q2 2027"), clauses: "4, 5, 6, 7", auditeur: L("Cabinet externe FSociety Audit", "External firm FSociety Audit"), independance: L("Aucune responsabilité dans le SGSI", "No responsibility in the ISMS") },
},
      auditView("audits-internes", "Audits internes", "Internal audits", ["internal"],
        "Le programme d’audit interne : périmètre, auditeur indépendant, constats.",
        "The internal audit programme: scope, independent auditor, findings."),
      auditView("audits-externes", "Audits externes", "External audits", ["external", "certification"],
        "Audits de certification, de clients ou d’autorités.",
        "Certification, customer or authority audits."),
      {
        id: "ecarts",
        essential: true,
        kind: "view",
        title: L("Écarts", "Nonconformities"),
        ref: L("ISO 27001 cl. 10.2 · A.5.36", "ISO 27001 cl. 10.2 · A.5.36"),
        desc: L("Les non-conformités relevées lors des audits, par gravité.",
          "Nonconformities found during audits, by severity."),
        table: () => ({
          columns: [L("Audit", "Audit"), L("Constat", "Finding"), L("Gravité", "Severity"), L("Clause", "Clause"), L("Vérification", "Verification")],
          rows: findings().map((x) => [x.audit, x.f.text || "", x.f.severity || "", x.f.clause || "", x.f.verification || ""]),
          empty: L("Aucun écart relevé.", "No nonconformity found."),
        }),
        manage: "registre-conformite",
      },
      {
        id: "plans-correctifs",
        kind: "view",
        title: L("Plans correctifs", "Corrective action plans"),
        ref: L("ISO 27001 cl. 10.2", "ISO 27001 cl. 10.2"),
        desc: L("L’action corrective de chaque écart, son responsable et son échéance ; les retards sont signalés.",
          "The corrective action for each nonconformity, its owner and due date; overdue ones are flagged."),
        table: () => ({
          columns: [L("Constat", "Finding"), L("Action corrective", "Corrective action"), L("Responsable", "Owner"), L("Échéance", "Due"), L("Vérification", "Verification")],
          rows: findings().filter((x) => (x.f.correctiveAction || "").trim()).map((x) => {
            const late = x.f.dueAt && Date.parse(x.f.dueAt) < Date.now() && x.f.verification !== "verified";
            return [x.f.text || "", x.f.correctiveAction || "", x.f.owner || "", grcFicheFmtDate(x.f.dueAt) + (late ? " ⚠" : ""), x.f.verification || ""];
          }),
          empty: L("Aucune action corrective.", "No corrective action."),
        }),
        manage: "registre-conformite",
      },
Object.assign({
  id: "actions-amelioration",
  title: L("Actions correctives (registre unique)", "Corrective actions (single register)"),
  ref: L("ISO 27001 cl. 10.2", "ISO 27001 cl. 10.2"),
  desc: L("Vue des non-conformités et actions issues des audits dans le registre unique d’amélioration (Gouvernance).", "View of audit-driven nonconformities and actions in the single improvement register (Governance)."),
}, grcFicheImprovementView(["audit"], { nature: "nc" })),
      {
        id: "registre-conformite",
        essential: true,
        kind: "register",
        title: L("Registre de conformité", "Compliance register"),
        ref: L("ISO 27001 A.5.31 – A.5.36", "ISO 27001 A.5.31 – A.5.36"),
        desc: L("Obligations (loi, norme, contrat, politique) avec applicabilité et statut, et audits avec leurs constats.",
          "Obligations (law, standard, contract, policy) with applicability and status, and audits with their findings."),
        block: "#grcComplianceRegistry",
        count: () => all().length,
        reinit: () => initGrcComplianceRegistry(),
        table: () => ({ columns: oblCols, rows: obligations().map(oblRow) }),
      },
    ],
  });
})();
