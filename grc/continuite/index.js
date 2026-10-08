/* Sources de couverture du domaine Continuité (carte 10 du hub) après le
   passage au registre unique (spec/grc-continuity-plans-register/ P4).

   Les anciennes sous-pages par plan sont supprimées (devenues des stubs de
   redirection). Leur CONTENU vit désormais dans le registre (onglets Fiche +
   Checklist par type) et dans les sections BIA & Tests de continuite.html,
   mais l'état de cochage reste stocké sous les MÊMES clés
   /grc/checklist.../continuite/<slug>.html (zéro migration). On conserve donc
   ces clés comme ENFANTS de couverture : readDomainCoverage les lit depuis le
   stockage (la page n'a pas besoin d'exister) et elles comptent une fois dans
   le % de la carte Continuité, l'export, le reset et l'import.

   `refreshVia: "continuite.html"` : pour le rafraîchissement de langue avant
   export (grcRefreshDomainCaches), charger continuite.html — qui re-persiste
   toutes ces checklists (grcContRepersistAll) — au lieu du stub. Plus de
   grille de sous-sections (continuite-subsections.js retiré). */
const CONT_COV_REFRESH = "continuite.html";
const continuiteIndexConfig = {
  "domains": [
    { title: "BIA et dépendances métier", link: "bia.html", description: "Processus critiques, DMIA/MTPD, MAO, RTO, RPO, MBCO, dépendances et SPOF.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PCA — Plan de continuité des activités", link: "pca.html", description: "Politique, portée, gouvernance, articulation des plans.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PGC — Plan de gestion de crise", link: "pgc.html", description: "Déclenchement, CCD, SPOC, main courante, sortie de crise.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PCO — Plan de continuité des opérations", link: "pco.html", description: "Mode dégradé, contournements, MBCO, repli.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PSI — Plan de continuité des services informatiques", link: "psi.html", description: "Moyens de secours, bascule, sauvegardes, MCO.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PCC — Plan de communication de crise", link: "pcm.html", description: "Porte-parole, messages types, canaux, notifications.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PRH — Plan RH de crise", link: "prh.html", description: "Mobilisation, astreinte, soutien aux personnes.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PRL — Plan de repli / hébergement", link: "prl.html", description: "Sites de repli, capacité, délai, accès.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PLOG — Plan logistique", link: "plog.html", description: "Matériel, stocks, transport, énergie.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PDEP — Plan de gestion des dépenses", link: "pdep.html", description: "Délégations, seuils, suivi, justificatifs.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PUI — Plan d’urgence interne", link: "pui.html", description: "Alerte, évacuation, confinement, rassemblement.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PRII — Plan de réponse aux incidents informatiques", link: "prii.html", description: "Détection, endiguement, éradication, preuves.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PRA — Plan de reprise des activités", link: "pra.html", description: "Priorisation, séquencement, retour à la normale.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "PRI — Plan de rétablissement informatique", link: "pri.html", description: "Ordre de rétablissement, restauration, intégrité.", refreshVia: CONT_COV_REFRESH, enabled: true },
    { title: "Tests et exercices", link: "tests-exercices.html", description: "Programme, TTX, simulations, bascules réelles, RETEX.", refreshVia: CONT_COV_REFRESH, enabled: true },
  ],
};

window.GRC_DOMAIN_CHILDREN = Object.assign(window.GRC_DOMAIN_CHILDREN || {}, {
  "continuite.html": { path: "continuite/", domains: continuiteIndexConfig.domains },
});
