/* Sous-sections de Continuité (spec/grc-restructure/ C2) -- une page par
   plan + BIA + tests. Enregistrées comme enfants de continuite.html pour
   que la carte 10 du hub, le tableau de bord et les exports les comptent
   (voir grcDomainChildren() dans grc-checklist.js). */
const continuiteIndexConfig = {
  "domains": [
    {
      "icon": "1",
      "title": "BIA et dépendances métier",
      "link": "bia.html",
      "description": "Processus critiques, DMIA/MTPD, MAO, RTO, RPO, MBCO, dépendances et SPOF.",
      "enabled": true
    },
    {
      "icon": "2",
      "title": "PCA — Plan de continuité des activités",
      "link": "pca.html",
      "description": "Cadre englobant : politique, portée, gouvernance, articulation des plans.",
      "enabled": true
    },
    {
      "icon": "3",
      "title": "PCO — Plan de continuité des opérations",
      "link": "pco.html",
      "description": "Opérations en mode dégradé, contournements, MBCO.",
      "enabled": true
    },
    {
      "icon": "4",
      "title": "PGC — Plan de gestion de crise",
      "link": "pgc.html",
      "description": "Déclenchement, CCD, SPOC, main courante, sortie de crise.",
      "enabled": true
    },
    {
      "icon": "5",
      "title": "PCM — Plan de communication de crise",
      "link": "pcm.html",
      "description": "Porte-parole, messages types, canaux, notifications légales.",
      "enabled": true
    },
    {
      "icon": "6",
      "title": "PRA — Plan de reprise des activités",
      "link": "pra.html",
      "description": "Reprise métier séquencée selon la criticité et les RTO.",
      "enabled": true
    },
    {
      "icon": "7",
      "title": "PSI — Plan de secours informatique",
      "link": "psi.html",
      "description": "Secours pendant l’incident : bascule, site de repli, MCO.",
      "enabled": true
    },
    {
      "icon": "8",
      "title": "PRI — Plan de rétablissement informatique",
      "link": "pri.html",
      "description": "Rétablissement après l’incident : restauration, intégrité, bascule retour.",
      "enabled": true
    },
    {
      "icon": "9",
      "title": "Tests et exercices",
      "link": "tests-exercices.html",
      "description": "Programme, TTX, simulations, bascules réelles, RETEX.",
      "enabled": true
    }
  ]
};

window.GRC_DOMAIN_CHILDREN = Object.assign(window.GRC_DOMAIN_CHILDREN || {}, {
  "continuite.html": { path: "continuite/", domains: continuiteIndexConfig.domains },
});
