/* Traductions de la sous-section GRC "Sécurité API" (grc/securite/api/) --
   chargé après i18n.js et grc-i18n.js sur le hub (index.html) et sur
   chacune des 7 pages de domaine. Réutilise les clés partagées définies
   dans grc-i18n.js (grc.common.backToApi, grc.common.contentInclude,
   grc.common.roleTitle) plutôt que de les redéfinir ici.

   Une entrée par domaine sous grc.securite.api.<slug>.*, où <slug> est
   le nom de fichier sans .html (ex. "architecture-api"). Chaque domaine
   fournit .title/.subtitle (h1/p de sa propre page), .hubCard.title/.desc
   (carte cliquable sur le hub, lues par grc-loader.js via
   renderGrcDomains(..., "grc.securite.api")), et .itemN.label pour
   chaque puce de la liste "Contenu à inclure". */

Object.assign(I18N_DICT, {
  // ===================== Hub (grc/securite/api/index.html) ============
  "grc.securite.api.hub.title": { fr: "Sécurité API", en: "API Security" },
  "grc.securite.api.hub.subtitle": {
    fr: "Architecture, authentification, contrôles et protection des API, organisés en 7 domaines.",
    en: "Architecture, authentication, controls and protection of APIs, organized into 7 domains."
  },

  // ===================== architecture-api ==============================
  "grc.securite.api.architecture-api.title": { fr: "Architecture API", en: "API Architecture" },
  "grc.securite.api.architecture-api.subtitle": {
    fr: "Décrire l’architecture des API exposées par l’organisation.",
    en: "Describe the architecture of the APIs exposed by the organization."
  },
  "grc.securite.api.architecture-api.hubCard.title": { fr: "Architecture API", en: "API Architecture" },
  "grc.securite.api.architecture-api.hubCard.desc": {
    fr: "REST, GraphQL, SOAP, microservices, API Gateway, reverse proxy et load balancer.",
    en: "REST, GraphQL, SOAP, microservices, API Gateway, reverse proxy and load balancer."
  },
  "grc.securite.api.architecture-api.item1.label": { fr: "API REST, GraphQL, SOAP", en: "REST, GraphQL, SOAP APIs" },
  "grc.securite.api.architecture-api.item2.label": { fr: "Microservices", en: "Microservices" },
  "grc.securite.api.architecture-api.item3.label": { fr: "API Gateway", en: "API Gateway" },
  "grc.securite.api.architecture-api.item4.label": { fr: "Reverse proxy", en: "Reverse proxy" },
  "grc.securite.api.architecture-api.item5.label": { fr: "Load balancer", en: "Load balancer" },

  // ===================== authentification-autorisation ================
  "grc.securite.api.authentification-autorisation.title": { fr: "Authentification & Autorisation", en: "Authentication & Authorization" },
  "grc.securite.api.authentification-autorisation.subtitle": {
    fr: "Décrire les mécanismes d’authentification et d’autorisation des API.",
    en: "Describe the API authentication and authorization mechanisms."
  },
  "grc.securite.api.authentification-autorisation.hubCard.title": { fr: "Authentification & Autorisation", en: "Authentication & Authorization" },
  "grc.securite.api.authentification-autorisation.hubCard.desc": {
    fr: "OAuth2/OIDC, JWT, clés API et modèles RBAC/ABAC avec moindre privilège.",
    en: "OAuth2/OIDC, JWT, API keys and RBAC/ABAC models with least privilege."
  },
  "grc.securite.api.authentification-autorisation.item1.label": { fr: "OAuth2 / OIDC", en: "OAuth2 / OIDC" },
  "grc.securite.api.authentification-autorisation.item2.label": { fr: "JWT (rotation, expiration, signature)", en: "JWT (rotation, expiration, signature)" },
  "grc.securite.api.authentification-autorisation.item3.label": { fr: "API Keys (rotation, restrictions IP)", en: "API keys (rotation, IP restrictions)" },
  "grc.securite.api.authentification-autorisation.item4.label": { fr: "RBAC / ABAC", en: "RBAC / ABAC" },
  "grc.securite.api.authentification-autorisation.item5.label": { fr: "Moindre privilège", en: "Least privilege" },

  // ===================== controles-api =================================
  "grc.securite.api.controles-api.title": { fr: "Contrôles de sécurité API", en: "API Security Controls" },
  "grc.securite.api.controles-api.subtitle": {
    fr: "Inclure les contrôles techniques obligatoires pour sécuriser les API.",
    en: "Include the mandatory technical controls used to secure the APIs."
  },
  "grc.securite.api.controles-api.hubCard.title": { fr: "Contrôles de sécurité API", en: "API Security Controls" },
  "grc.securite.api.controles-api.hubCard.desc": {
    fr: "Rate limiting, throttling, listes IP, validation des entrées et TLS obligatoire.",
    en: "Rate limiting, throttling, IP lists, input validation and mandatory TLS."
  },
  "grc.securite.api.controles-api.item1.label": { fr: "Rate limiting", en: "Rate limiting" },
  "grc.securite.api.controles-api.item2.label": { fr: "Throttling", en: "Throttling" },
  "grc.securite.api.controles-api.item3.label": { fr: "IP allow/deny lists", en: "IP allow/deny lists" },
  "grc.securite.api.controles-api.item4.label": { fr: "Validation stricte des entrées", en: "Strict input validation" },
  "grc.securite.api.controles-api.item5.label": { fr: "Normalisation des données", en: "Data normalization" },
  "grc.securite.api.controles-api.item6.label": { fr: "Chiffrement TLS obligatoire", en: "Mandatory TLS encryption" },

  // ===================== gestion-cycle-vie ==============================
  "grc.securite.api.gestion-cycle-vie.title": { fr: "Gestion du cycle de vie", en: "Lifecycle Management" },
  "grc.securite.api.gestion-cycle-vie.subtitle": {
    fr: "Décrire la gestion du cycle de vie des API, de la conception à la dépréciation.",
    en: "Describe API lifecycle management, from design to deprecation."
  },
  "grc.securite.api.gestion-cycle-vie.hubCard.title": { fr: "Gestion du cycle de vie", en: "Lifecycle Management" },
  "grc.securite.api.gestion-cycle-vie.hubCard.desc": {
    fr: "Versioning, dépréciation contrôlée, documentation OpenAPI/Swagger et CI/CD sécurisé.",
    en: "Versioning, controlled deprecation, OpenAPI/Swagger documentation and secure CI/CD."
  },
  "grc.securite.api.gestion-cycle-vie.item1.label": { fr: "Versioning (v1, v2, v3)", en: "Versioning (v1, v2, v3)" },
  "grc.securite.api.gestion-cycle-vie.item2.label": { fr: "Dépréciation contrôlée", en: "Controlled deprecation" },
  "grc.securite.api.gestion-cycle-vie.item3.label": { fr: "Documentation (OpenAPI/Swagger)", en: "Documentation (OpenAPI/Swagger)" },
  "grc.securite.api.gestion-cycle-vie.item4.label": { fr: "CI/CD sécurisé", en: "Secure CI/CD" },

  // ===================== journalisation-monitoring ======================
  "grc.securite.api.journalisation-monitoring.title": { fr: "Journalisation & monitoring", en: "Logging & Monitoring" },
  "grc.securite.api.journalisation-monitoring.subtitle": {
    fr: "Décrire les outils et processus de surveillance des API.",
    en: "Describe the tools and processes used to monitor APIs."
  },
  "grc.securite.api.journalisation-monitoring.hubCard.title": { fr: "Journalisation & monitoring", en: "Logging & Monitoring" },
  "grc.securite.api.journalisation-monitoring.hubCard.desc": {
    fr: "Logs API Gateway, logs d’erreurs/d’accès, corrélation SIEM et alertes temps réel.",
    en: "API Gateway logs, error/access logs, SIEM correlation and real-time alerts."
  },
  "grc.securite.api.journalisation-monitoring.item1.label": { fr: "Logs API Gateway", en: "API Gateway logs" },
  "grc.securite.api.journalisation-monitoring.item2.label": { fr: "Logs d’erreurs", en: "Error logs" },
  "grc.securite.api.journalisation-monitoring.item3.label": { fr: "Logs d’accès", en: "Access logs" },
  "grc.securite.api.journalisation-monitoring.item4.label": { fr: "Corrélation SIEM", en: "SIEM correlation" },
  "grc.securite.api.journalisation-monitoring.item5.label": { fr: "Alertes en temps réel", en: "Real-time alerts" },

  // ===================== protection-attaques-api =========================
  "grc.securite.api.protection-attaques-api.title": { fr: "Protection contre les attaques API", en: "Protection Against API Attacks" },
  "grc.securite.api.protection-attaques-api.subtitle": {
    fr: "Décrire les protections mises en place contre les attaques ciblant les API (OWASP API Security Top 10).",
    en: "Describe the protections in place against attacks targeting APIs (OWASP API Security Top 10)."
  },
  "grc.securite.api.protection-attaques-api.hubCard.title": { fr: "Protection contre les attaques API", en: "Protection Against API Attacks" },
  "grc.securite.api.protection-attaques-api.hubCard.desc": {
    fr: "Injections, BOLA, BFLA, Mass Assignment, Excessive Data Exposure et SSRF (OWASP API Top 10).",
    en: "Injections, BOLA, BFLA, Mass Assignment, Excessive Data Exposure and SSRF (OWASP API Top 10)."
  },
  "grc.securite.api.protection-attaques-api.sectionTitle": { fr: "Menaces couvertes", en: "Threats covered" },
  "grc.securite.api.protection-attaques-api.item1.label": { fr: "Injection (SQL, NoSQL, LDAP, OS)", en: "Injection (SQL, NoSQL, LDAP, OS)" },
  "grc.securite.api.protection-attaques-api.item2.label": { fr: "Broken Authentication", en: "Broken Authentication" },
  "grc.securite.api.protection-attaques-api.item3.label": { fr: "Broken Object Level Authorization (BOLA)", en: "Broken Object Level Authorization (BOLA)" },
  "grc.securite.api.protection-attaques-api.item4.label": { fr: "Broken Function Level Authorization (BFLA)", en: "Broken Function Level Authorization (BFLA)" },
  "grc.securite.api.protection-attaques-api.item5.label": { fr: "Mass Assignment", en: "Mass Assignment" },
  "grc.securite.api.protection-attaques-api.item6.label": { fr: "Excessive Data Exposure", en: "Excessive Data Exposure" },
  "grc.securite.api.protection-attaques-api.item7.label": { fr: "SSRF", en: "SSRF" },

  // ===================== tests-audits-api =================================
  "grc.securite.api.tests-audits-api.title": { fr: "Tests & audits API", en: "API Tests & Audits" },
  "grc.securite.api.tests-audits-api.subtitle": {
    fr: "Décrire les tests et audits réalisés pour valider la sécurité des API.",
    en: "Describe the tests and audits performed to validate API security."
  },
  "grc.securite.api.tests-audits-api.hubCard.title": { fr: "Tests & audits API", en: "API Tests & Audits" },
  "grc.securite.api.tests-audits-api.hubCard.desc": {
    fr: "Tests automatisés, tests OWASP API Security Top 10, pentest et scans de vulnérabilités.",
    en: "Automated tests, OWASP API Security Top 10 tests, pentest and vulnerability scans."
  },
  "grc.securite.api.tests-audits-api.item1.label": { fr: "Tests automatisés (Postman, Newman)", en: "Automated tests (Postman, Newman)" },
  "grc.securite.api.tests-audits-api.item2.label": { fr: "Tests de sécurité (OWASP API Security Top 10)", en: "Security tests (OWASP API Security Top 10)" },
  "grc.securite.api.tests-audits-api.item3.label": { fr: "Pentest API", en: "API pentest" },
  "grc.securite.api.tests-audits-api.item4.label": { fr: "Scans de vulnérabilités", en: "Vulnerability scans" }
});
