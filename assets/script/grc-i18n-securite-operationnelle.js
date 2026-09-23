/* Traductions du hub GRC "Sécurité opérationnelle"
   (grc/securite/operationnelle/index.html) -- spec/grc-restructure/.
   Seul le hub est traduit ici : les 7 pages de détail (architecture,
   vulnerabilites, iam, ressources-humaines, securite-physique, cloud, devsecops) ont été déplacées depuis grc/
   en gardant leurs clés grc.<slug>.* de grc-i18n-domains.js, d'où le
   keyPrefix "grc" (et non "grc.securite.operationnelle") passé à
   renderGrcDomains() / aux exports. Chargé après grc-i18n.js. */

Object.assign(I18N_DICT, {
  "grc.securite.operationnelle.hub.title": { fr: "Sécurité opérationnelle", en: "Operational Security" },
  "grc.securite.operationnelle.hub.subtitle": {
    fr: "Architecture de sécurité, gestion des vulnérabilités, identités et accès, ressources humaines et sensibilisation, sécurité physique, sécurité cloud et DevSecOps, organisés en 7 domaines.",
    en: "Security architecture, vulnerability management, identity and access, people and awareness, physical security, cloud security and DevSecOps, organized into 7 domains."
  },
});
