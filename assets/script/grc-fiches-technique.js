/* Documentation légère des hubs techniques (grc/securite/<section>/<page>.html) —
   grc-normes N11, décision E5 : les mêmes quatre éléments sur les 38
   pages, reliés à la chaîne (contrôles, actifs, risques, registre
   d'amélioration). La page est identifiée par
   <body data-fiche-page="tech-<section>--<page>"> ; le titre du document
   reprend le titre de la page. Moteur : grc-fiches.js. IDs STABLES. */

(function () {
  const page = document.body && document.body.dataset.fichePage;
  if (!page || page.indexOf("tech-") !== 0) return;
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });
  const h1 = document.querySelector("h1.page-title");
  const title = h1 ? h1.textContent.trim() : page;

  grcFicheRegister(page, {
    docTitle: L(title, title),
    docRef: "ISO/IEC 27001:2022 Annex A · ISO/IEC 27002:2022",
    elements: [
      {
        id: "exigences",
        essential: true,
        title: L("Exigences de sécurité", "Security requirements"),
        ref: L("ISO 27001 cl. 6.1.3 · A.8", "ISO 27001 cl. 6.1.3 · A.8"),
        lead: L("Ce que ce domaine technique doit respecter (norme, loi, contrat, règle interne).", "What this technical domain must comply with (standard, law, contract, internal rule)."),
        desc: L("Une entrée par exigence. Exemple : « Tout flux entre zones passe par un pare-feu avec règles revues chaque trimestre » — interne, priorité haute.",
          "One entry per requirement. Example: \"All traffic between zones goes through a firewall with rules reviewed quarterly\" — internal, high priority."),
        header: ["exigence", "priorite"],
        fields: [
          { id: "exigence", type: "textarea", required: true, label: L("Exigence", "Requirement") },
          { id: "source", type: "select", label: L("Source", "Source"), options: [O("interne", "Règle interne", "Internal rule"), O("norme", "Norme", "Standard"), O("loi", "Loi", "Law"), O("contrat", "Contrat", "Contract")] },
          { id: "priorite", type: "select", label: L("Priorité", "Priority"), options: [O("haute", "Haute", "High"), O("moyenne", "Moyenne", "Medium"), O("basse", "Basse", "Low")] },
        ],
        example: { exigence: L("Les accès d’administration passent par un bastion avec MFA", "Administrative access goes through a bastion with MFA"), source: "interne", priorite: "haute" },
      },
      {
        id: "mesures",
        essential: true,
        title: L("Mesures en place", "Measures in place"),
        ref: L("ISO 27001 A.8", "ISO 27001 A.8"),
        lead: L("Comment les exigences sont appliquées, reliées aux contrôles du registre et aux actifs concernés.", "How requirements are applied, linked to register controls and affected assets."),
        desc: L("Une entrée par mesure. Relie-la au contrôle qu’elle met en œuvre : elle devient une preuve de la chaîne.", "One entry per measure. Link it to the control it implements: it becomes evidence in the chain."),
        header: ["mesure", "etat"],
        fields: [
          { id: "mesure", type: "text", required: true, label: L("Mesure", "Measure") },
          { id: "etat", type: "select", label: L("État", "Status"), options: [O("enplace", "En place", "In place"), O("partiel", "Partiel", "Partial"), O("planifie", "Planifié", "Planned")] },
          { id: "controles", linkTo: "control", multi: true, label: L("Contrôles mis en œuvre", "Controls implemented") },
          { id: "actifs", linkTo: "asset", multi: true, label: L("Actifs concernés", "Assets concerned") },
          { id: "preuve", type: "text", label: L("Preuve", "Evidence") },
        ],
        example: { mesure: L("Bastion d’administration avec MFA", "Administration bastion with MFA"), etat: "enplace", preuve: L("Configuration exportée", "Exported configuration") },
      },
      {
        id: "risques",
        title: L("Risques liés", "Related risks"),
        ref: L("ISO 27005", "ISO 27005"),
        desc: L("Les risques du registre que ce domaine technique contribue à traiter, avec un commentaire.", "The register risks this technical domain helps to treat, with a comment."),
        header: ["commentaire"],
        fields: [
          { id: "risques", linkTo: "risk", multi: true, required: true, label: L("Risques", "Risks") },
          { id: "commentaire", type: "textarea", label: L("Commentaire", "Comment") },
        ],
      },
      {
        id: "ecarts",
        title: L("Écarts et actions", "Gaps and actions"),
        ref: L("ISO 27001 cl. 10", "ISO 27001 cl. 10"),
        desc: L("Ce qui manque encore et l’action prévue (reliée au registre unique d’amélioration si elle y est suivie).", "What is still missing and the planned action (linked to the single improvement register if tracked there)."),
        header: ["ecart", "statut"],
        fields: [
          { id: "ecart", type: "textarea", required: true, label: L("Écart", "Gap") },
          { id: "action", type: "textarea", label: L("Action", "Action") },
          { id: "actionId", linkTo: "amelioration", label: L("Action dans le registre d’amélioration", "Action in the improvement register") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
          { id: "echeance", type: "date", label: L("Échéance", "Due date") },
          { id: "statut", type: "select", label: L("Statut", "Status"), options: [O("ouverte", "Ouverte", "Open"), O("encours", "En cours", "In progress"), O("close", "Close", "Closed")] },
        ],
        example: { ecart: L("Les journaux du pare-feu ne sont pas centralisés", "Firewall logs are not centralized"), action: L("Envoyer les journaux vers le SIEM", "Send logs to the SIEM"), statut: "ouverte" },
      },
    ],
  });
})();
