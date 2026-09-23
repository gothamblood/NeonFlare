/* Documentation — Traitement des risques (grc/traitement-risques.html)
   · ISO 27001 cl. 6.1.3. Cinquième étape : décider quoi faire de chaque
   risque. Le registre des plans existant est réutilisé ; les stratégies,
   le résiduel, l'acceptation et le suivi en sont des vues. Seul le
   transfert ajoute un formulaire (contrats d'assurance / sous-traitance).
   Moteur : grc-fiches.js ; plan : spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const plans = () => grcFicheSrc.treatmentPlans();
  const risks = () => grcFicheSrc.risks();
  const linkedRisks = (planId) => risks().filter((r) => r.treatmentPlan && Array.isArray(r.treatmentPlan.planIds)
    && r.treatmentPlan.planIds.indexOf(planId) !== -1).map((r) => r.name || r.id);
  const treated = () => risks().filter((r) => r.treatmentPlan && typeof r.treatmentPlan === "object");

  function byStrategy(strategy, emptyFr, emptyEn) {
    return () => ({
      columns: [L("Plan", "Plan"), L("Justification", "Rationale"), L("Risques liés", "Linked risks"), L("Actions (faites / total)", "Actions (done / total)")],
      rows: plans().filter((p) => p.strategy === strategy).map((p) => {
        const acts = Array.isArray(p.actions) ? p.actions : [];
        return [p.name || "", p.rationale || "", linkedRisks(p.id).join(", "),
          acts.filter((a) => a.status === "done").length + " / " + acts.length];
      }),
      empty: L(emptyFr, emptyEn),
    });
  }

  function strategyView(id, fr, en, strategy, descFr, descEn) {
    return {
      id: id, kind: "view", title: L(fr, en),
      ref: L("ISO 27001 cl. 6.1.3 · ISO 27005 cl. 8", "ISO 27001 cl. 6.1.3 · ISO 27005 cl. 8"),
      desc: L(descFr, descEn),
      table: byStrategy(strategy, "Aucun plan avec cette stratégie.", "No plan with this strategy."),
      manage: "plans",
    };
  }

  grcFicheRegister("traitement-risques", {
    docTitle: L("Traitement des risques", "Risk treatment"),
    docRef: "ISO/IEC 27001:2022 clause 6.1.3 · ISO/IEC 27005:2022 clause 8",
    elements: [
      {
        id: "plans",
        essential: true,
        kind: "register",
        title: L("Plans de traitement", "Treatment plans"),
        ref: L("ISO 27001 cl. 6.1.3 · NIST GV.RM", "ISO 27001 cl. 6.1.3 · NIST GV.RM"),
        desc: L("Un plan par entrée : stratégie, justification, actions avec responsables et échéances, contrôles liés. Un plan peut couvrir plusieurs risques (liaison depuis la page Analyse des risques).",
          "One plan per entry: strategy, rationale, actions with owners and due dates, linked controls. A plan can cover several risks (linked from the Risk analysis page)."),
        block: "#grcTreatmentPlansRegistry",
        count: () => plans().length,
        reinit: () => initGrcTreatmentPlansRegistry(),
        table: () => ({
          columns: [L("Plan", "Plan"), L("Stratégie", "Strategy"), L("Risques liés", "Linked risks"), L("Actions", "Actions")],
          rows: plans().map((p) => [p.name || "", p.strategy || "", linkedRisks(p.id).join(", "), String((p.actions || []).length)]),
        }),
      },
      strategyView("evitement", "Évitement", "Avoidance", "avoid",
        "Supprimer l’activité ou la situation à l’origine du risque. Plans avec la stratégie « éviter ».",
        "Remove the activity or situation causing the risk. Plans with the \"avoid\" strategy."),
      strategyView("reduction", "Réduction", "Reduction", "mitigate",
        "Réduire la probabilité ou l’impact par des contrôles. Plans avec la stratégie « atténuer ».",
        "Reduce likelihood or impact through controls. Plans with the \"mitigate\" strategy."),
      {
        id: "transfert",
        example: { tiers: L("Assureur cyber", "Cyber insurer"), couverture: L("Rançongiciel et fuite de données", "Ransomware and data breach"), plafond: L("1 000 000 $", "$1,000,000") },
        title: L("Transfert", "Transfer"),
        ref: L("ISO 27001 cl. 6.1.3 · NIST GV.SC", "ISO 27001 cl. 6.1.3 · NIST GV.SC"),
        desc: L("Transférer tout ou partie du risque à un tiers : assurance cyber, sous-traitance, clause contractuelle. En haut, les plans « transférer » ; en dessous, un contrat de transfert par entrée. Exemple : assurance cyber — assureur X, couverture rançongiciel et responsabilité, plafond 1 M$, franchise 25 000 $, échéance 2027-01-01.",
          "Transfer all or part of the risk to a third party: cyber insurance, outsourcing, contractual clause. Above, the \"transfer\" plans; below, one transfer contract per entry. Example: cyber insurance — insurer X, ransomware and liability cover, $1M limit, $25,000 deductible, expires 2027-01-01."),
        table: byStrategy("transfer", "Aucun plan « transférer ».", "No \"transfer\" plan."),
        header: ["tiers", "type", "echeance"],
        fields: [
          { id: "type", type: "select", label: L("Type", "Type"), options: [
            O("assurance", "Assurance cyber", "Cyber insurance"), O("soustraitance", "Sous-traitance", "Outsourcing"),
            O("clause", "Clause contractuelle", "Contractual clause"), O("autre", "Autre", "Other"),
          ] },
          { id: "tiers", type: "text", required: true, suggest: { from: ["supplier"] }, label: L("Assureur ou fournisseur", "Insurer or supplier") },
          { id: "couverture", type: "textarea", label: L("Couverture (risques transférés)", "Coverage (risks transferred)") },
          { id: "plafond", type: "text", label: L("Plafond", "Limit") },
          { id: "franchise", type: "text", hint: L("Montant restant à la charge de l’organisation ($)", "Amount left for the organization to pay ($)"), label: L("Franchise", "Deductible") },
          { id: "echeance", type: "text", label: L("Échéance (AAAA-MM-JJ)", "Expiry (YYYY-MM-DD)") },
          { id: "plan", type: "ref", label: L("Plan de traitement lié", "Linked treatment plan"),
            source: () => grcFicheRefFrom(plans(), (p) => p.name) },
        ],
      },
      strategyView("acceptation", "Acceptation", "Acceptance", "accept",
        "Accepter le risque en connaissance de cause, dans les limites de l’appétit au risque. Plans avec la stratégie « accepter » (l’acceptation formelle est dans l’onglet suivant).",
        "Accept the risk knowingly, within the risk appetite. Plans with the \"accept\" strategy (formal acceptance is in the next tab)."),
      {
        id: "residuels",
        essential: true,
        kind: "view",
        title: L("Risques résiduels", "Residual risks"),
        ref: L("ISO 27001 cl. 6.1.3 · 8.3", "ISO 27001 cl. 6.1.3 · 8.3"),
        desc: L("Ce qui reste après traitement : risque résiduel = risque initial − réduction apportée par les mesures. Score P × I avant / après et, si le volet quantitatif est renseigné, ALE avant / après et ROSI.",
          "What remains after treatment: residual risk = initial risk − reduction brought by the measures. P × I score before / after and, when the quantitative view is filled in, ALE before / after and ROSI."),
        table: () => ({
          columns: [L("Risque", "Risk"), L("Initial (P × I)", "Initial (P × I)"), L("Résiduel (P × I)", "Residual (P × I)"), L("ALE initial → résiduel", "Initial → residual ALE"), L("ROSI", "ROSI")],
          rows: treated().map((r) => {
            const rs = typeof grcRiskResidualScore === "function" ? grcRiskResidualScore(r) : null;
            const q = typeof grcRiskResidualQuant === "function" ? grcRiskResidualQuant(r) : null;
            return [r.name || "",
              String(typeof grcRiskInherentScore === "function" ? grcRiskInherentScore(r) : ""),
              rs == null ? "—" : String(rs),
              q && q.ale != null ? grkFormatMoney(q.initialAle, q.currency) + " → " + grkFormatMoney(q.ale, q.currency) : "—",
              q && q.rosi != null ? Math.round(q.rosi * 100) + " %" : "—"];
          }),
          empty: L("Aucun risque traité (lier un plan depuis la page Analyse des risques).", "No treated risk (link a plan from the Risk analysis page)."),
        }),
        manage: "analyse-risques.html#fiche-registre",
      },
      {
        id: "acceptation-formelle",
        essential: true,
        kind: "view",
        title: L("Acceptation formelle", "Formal acceptance"),
        ref: L("ISO 27001 cl. 6.1.3 f)", "ISO 27001 cl. 6.1.3 f)"),
        desc: L("Les risques dont l’acceptation est requise (stratégie « accepter » ou résiduel non nul) : qui a accepté, quand, pourquoi, et date de réexamen. Les acceptations échues sont signalées.",
          "Risks whose acceptance is required (\"accept\" strategy or non-zero residual): who accepted, when, why, and review date. Overdue acceptances are flagged."),
        table: () => ({
          columns: [L("Risque", "Risk"), L("Accepté par", "Accepted by"), L("Date", "Date"), L("Motif", "Reason"), L("Réexamen", "Review")],
          rows: treated().filter((r) => typeof grcRiskAcceptanceRequired === "function" && grcRiskAcceptanceRequired(r)).map((r) => {
            const a = grcRiskEnsureTreatment(r).acceptance || {};
            const due = typeof grcRiskAcceptanceDueForReview === "function" && grcRiskAcceptanceDueForReview(r);
            return [r.name || "", a.by || "—", grcFicheFmtDate(a.at), a.reason || "", grcFicheFmtDate(a.reviewAt) + (due ? " ⚠" : "")];
          }),
          empty: L("Aucune acceptation requise.", "No acceptance required."),
        }),
        manage: "analyse-risques.html#fiche-registre",
      },
      {
        id: "suivi",
        kind: "view",
        title: L("Suivi des traitements", "Treatment follow-up"),
        ref: L("ISO 27001 cl. 8.3 · 9.1", "ISO 27001 cl. 8.3 · 9.1"),
        desc: L("Avancement de chaque plan et actions en retard, pour le comité GRC.",
          "Progress of each plan and overdue actions, for the GRC committee."),
        table: () => ({
          columns: [L("Plan", "Plan"), L("Avancement", "Progress"), L("Actions en retard", "Overdue actions"), L("Prochaine échéance", "Next due date")],
          rows: plans().map((p) => {
            const acts = Array.isArray(p.actions) ? p.actions : [];
            const done = acts.filter((a) => a.status === "done").length;
            const late = acts.filter((a) => typeof grcTpActionOverdue === "function" && grcTpActionOverdue(a)).length;
            const next = acts.filter((a) => a.status !== "done" && a.dueAt).map((a) => a.dueAt).sort()[0];
            return [p.name || "", acts.length ? Math.round(done / acts.length * 100) + " %" : "—", late ? late + " ⚠" : "0", grcFicheFmtDate(next)];
          }),
          empty: L("Aucun plan de traitement.", "No treatment plan."),
        }),
        manage: "plans",
      },
    ],
  });
})();
