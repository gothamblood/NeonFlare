/* Documentation — Continuité (grc/continuite.html) · ISO 22301. Dixième
   étape : rester debout quand tout va mal. La page principale documente
   l'analyse de risques PCA, les ressources critiques, les stratégies, la
   formation et l'amélioration ; le registre PCA/PRA existant (BIA,
   dépendances, redondance, PRA, tests, CCD, SPOC) est réutilisé tel quel.
   Les 9 sous-pages (BIA, PCA, PCO…) gardent leur checklist.
   Moteur : grc-fiches.js ; plan : spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const plans = () => grcFicheSrc.continuity();
  const processRef = () => grcFicheRefFrom(grcFicheEntries("contexte-organisationnel", "cartographie-processus"), (p) => p.nom);

  grcFicheRegister("continuite", {
    docTitle: L("Continuité des activités", "Business continuity"),
    docRef: "ISO 22301:2019 · ISO/IEC 27001:2022 A.5.29 – A.5.30",
    elements: [
      {
        id: "analyse-risques-pca",
        example: { scenario: L("Panne prolongée du centre de données", "Extended data centre outage"), probabilite: "faible", impact: "eleve" },
        title: L("Analyse de risques PCA", "BCP risk assessment"),
        ref: L("ISO 22301 cl. 8.2.3", "ISO 22301 cl. 8.2.3"),
        desc: L("Les scénarios de sinistre qui pourraient interrompre les activités couvertes par le PCA. Une entrée par scénario. Exemple : panne prolongée du fournisseur infonuagique — probabilité moyenne, impact élevé, processus touchés : facturation et paie.",
          "The disruption scenarios that could stop the activities covered by the BCP. One entry per scenario. Example: prolonged cloud provider outage — medium likelihood, high impact, processes hit: billing and payroll."),
        header: ["scenario", "impact"],
        fields: [
          { id: "scenario", type: "text", required: true, label: L("Scénario de sinistre", "Disruption scenario") },
          { id: "categorie", type: "select", label: L("Catégorie", "Category"), options: [
            O("cyber", "Cyberattaque", "Cyberattack"), O("panne", "Panne technique", "Technical outage"), O("site", "Perte de site (incendie, inondation…)", "Site loss (fire, flood…)"),
            O("personnel", "Indisponibilité de personnel", "Staff unavailability"), O("fournisseur", "Défaillance fournisseur", "Supplier failure"), O("autre", "Autre", "Other"),
          ] },
          { id: "probabilite", type: "select", label: L("Probabilité", "Likelihood"), options: [
            O("faible", "Faible", "Low"), O("moyenne", "Moyenne", "Medium"), O("elevee", "Élevée", "High"),
          ] },
          { id: "impact", type: "select", label: L("Impact", "Impact"), options: [
            O("faible", "Faible", "Low"), O("moyen", "Moyen", "Medium"), O("eleve", "Élevé", "High"),
          ] },
          { id: "processus", type: "textarea", hint: L("Quels processus s’arrêtent si ce sinistre arrive", "Which processes stop if this disaster happens"), label: L("Processus touchés", "Processes affected") },
        ],
      },
      {
        id: "ressources-critiques",
        example: { ressource: L("2 commis à la paie formés", "2 trained payroll clerks"), minimum: L("1 personne", "1 person") },
        title: L("Ressources critiques", "Critical resources"),
        ref: L("ISO 22301 cl. 8.3.2", "ISO 22301 cl. 8.3.2"),
        desc: L("Ce qu’il faut au minimum pour faire tourner les processus critiques : personnes, infrastructures, SI, ressources intellectuelles, fournisseurs. Une entrée par ressource, avec son suppléant. Exemple : humaines — 2 commis comptables formés à la paie ; suppléance : firme externe sous contrat.",
          "What is needed at minimum to run critical processes: people, infrastructure, IT, intellectual resources, suppliers. One entry per resource, with its fallback. Example: people — 2 bookkeepers trained on payroll; fallback: external firm under contract."),
        header: ["ressource", "categorie"],
        fields: [
          { id: "categorie", type: "select", label: L("Catégorie", "Category"), options: [
            O("humaines", "Humaines", "Human"), O("infrastructures", "Infrastructures", "Infrastructure"), O("si", "Systèmes d’information", "Information systems"),
            O("intellectuelles", "Ressources intellectuelles", "Intellectual resources"), O("fournisseurs", "Fournisseurs externes", "External suppliers"),
          ] },
          { id: "ressource", type: "text", required: true, label: L("Ressource", "Resource") },
          { id: "processus", type: "ref", label: L("Processus soutenu", "Process supported"), source: processRef },
          { id: "minimum", type: "text", label: L("Minimum requis", "Minimum required") },
          { id: "suppleance", type: "textarea", hint: L("Comment faire sans cette ressource (remplaçant, solution de repli)", "How to cope without this resource (substitute, fallback)"), label: L("Suppléance / solution de repli", "Fallback") },
        ],
        links: [{ href: "contexte-organisationnel.html#fiche-cartographie-processus", label: L("Cartographie des processus", "Process map") }],
      },
      {
        id: "strategies",
        example: { strategie: L("Bascule vers le site de relève infonuagique", "Failover to the cloud recovery site"), cout: L("12 000 $ / an", "$12,000 / year"), delai: L("4 h", "4 h") },
        title: L("Stratégies de continuité", "Continuity strategies"),
        ref: L("ISO 22301 cl. 8.3 · ISO 27001 A.8.14", "ISO 22301 cl. 8.3 · ISO 27001 A.8.14"),
        desc: L("Comment l’organisation continuera malgré le sinistre : redondance, site de repli, contournement manuel, externalisation, stock. Une entrée par stratégie, avec son coût et son délai de mise en œuvre.",
          "How the organization will keep going despite the disruption: redundancy, recovery site, manual workaround, outsourcing, stock. One entry per strategy, with its cost and time to implement."),
        header: ["strategie", "type"],
        fields: [
          { id: "strategie", type: "text", required: true, suggest: "strategie", label: L("Stratégie", "Strategy") },
          { id: "type", type: "select", label: L("Type", "Type"), options: [
            O("redondance", "Redondance", "Redundancy"), O("repli", "Site de repli", "Recovery site"), O("contournement", "Contournement manuel", "Manual workaround"),
            O("externalisation", "Externalisation", "Outsourcing"), O("stock", "Stock / réserve", "Stock / reserve"), O("autre", "Autre", "Other"),
          ] },
          { id: "processus", type: "textarea", hint: L("Processus protégés par cette stratégie", "Processes protected by this strategy"), label: L("Processus couverts", "Processes covered") },
          { id: "cout", type: "text", label: L("Coût", "Cost") },
          { id: "delai", type: "text", suggest: "delai", label: L("Délai de mise en œuvre", "Time to implement") },
        ],
      },
      {
        id: "formation",
        example: { public: L("Cellule de crise", "Crisis cell"), contenu: L("Rôles et arbre d’appel", "Roles and call tree") },
        title: L("Formation et sensibilisation", "Training and awareness"),
        ref: L("ISO 22301 cl. 7.2 · 7.3", "ISO 22301 cl. 7.2 · 7.3"),
        desc: L("Qui a été formé à quoi et quand : membres de la CCD, porte-parole, équipes du PRA, personnel. Une entrée par session.",
          "Who was trained on what and when: crisis cell members, spokespersons, recovery teams, staff. One entry per session."),
        header: ["contenu", "date"],
        fields: [
          { id: "public", type: "text", suggest: "public", label: L("Public", "Audience") },
          { id: "contenu", type: "text", required: true, label: L("Contenu", "Content") },
          { id: "date", type: "text", label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
          { id: "participants", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Participants", "Participants") },
        ],
      },
      Object.assign({
        id: "amelioration",
        title: L("Amélioration continue", "Continual improvement"),
        ref: L("ISO 22301 cl. 10", "ISO 22301 cl. 10"),
        desc: L("Vue des actions d’amélioration issues de la continuité (exercices, tests, incidents réels) dans le registre unique d’amélioration de Gouvernance. Les actions saisies ici auparavant y ont été reprises, sans perte.",
          "View of improvement actions arising from continuity (exercises, tests, real incidents) in the single improvement register in Governance. Actions previously entered here were carried over, without loss."),
      }, grcFicheImprovementView(["continuite"])),
      {
        id: "registre",
        essential: true,
        kind: "register",
        title: L("Registre PCA/PRA", "BCP/DRP register"),
        ref: L("ISO 22301 cl. 8.2.2 – 8.5", "ISO 22301 cl. 8.2.2 – 8.5"),
        desc: L("Un plan par service : BIA (DMIA, MAO, RTO, RPO, MBCO), dépendances et SPOF, redondance, procédure de reprise, tests, SPOC et CCD.",
          "One plan per service: BIA (MTPD, MAO, RTO, RPO, MBCO), dependencies and SPOFs, redundancy, recovery procedure, tests, SPOC and crisis cell."),
        block: "#grcContinuityRegistry",
        count: () => plans().length,
        reinit: () => initGrcContinuityRegistry(),
        table: () => ({
          columns: [L("Service", "Service"), L("Criticité", "Criticality"), L("DMIA", "MTPD"), L("RTO", "RTO"), L("RPO", "RPO"), L("SPOF", "SPOF")],
          rows: plans().map((p) => {
            const b = p.bia || {};
            const d = (m) => (typeof contFmtDuration === "function" ? contFmtDuration(m) : (m == null ? "" : String(m)));
            return [p.service || "", p.criticality || "", d(b.mtdMin), d(b.rtoMin), d(b.rpoMin),
              String(typeof grcContSpofCount === "function" ? grcContSpofCount(p) : "")];
          }),
        }),
      },
    ],
  });
})();
