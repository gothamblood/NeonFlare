/* Traductions du sous-hub Sécurité WebApp (grc/securite/webapp/) -- séparé
   de grc-i18n.js pour garder ce worker isolé des autres sous-sections GRC
   pendant le chantier i18n. Fusionné dans le même I18N_DICT / applyI18n()
   (voir assets/script/i18n.js), namespacé sous "grc.securite.webapp.*".
   Chargé après i18n.js et grc-i18n.js sur le hub (index.html) et les 8
   pages de détail du dossier.

   Note : contrairement au registre "actifs" (voir grc-i18n.js), les pages
   de détail de cette sous-section n'ont pas de bloc "Rôle en GRC" ni de
   libellés en gras suivis d'une description -- chaque item est une simple
   puce de checklist, donc seule une clé ".itemN.label" existe par puce
   (pas de ".itemN.desc"). Le titre du bloc de contenu n'utilise pas non
   plus la clé partagée grc.common.contentInclude car le libellé réel
   diffère ("Éléments à inclure" / "Menaces couvertes" et non "Contenu à
   inclure") -- chaque page a donc sa propre clé ".sectionTitle" pour ne
   pas modifier silencieusement le texte français affiché. */

Object.assign(I18N_DICT, {
  // ===== Hub (grc/securite/webapp/index.html) =====
  "grc.securite.webapp.hub.title": { fr: "Sécurité WebApp", en: "WebApp Security" },
  "grc.securite.webapp.hub.subtitle": {
    fr: "Protéger les applications web contre les attaques, vulnérabilités et comportements malveillants, en 8 domaines.",
    en: "Protect web applications against attacks, vulnerabilities and malicious behavior, across 8 domains."
  },

  // ===== architecture-applicative =====
  "grc.securite.webapp.architecture-applicative.title": { fr: "Architecture applicative", en: "Application architecture" },
  "grc.securite.webapp.architecture-applicative.subtitle": { fr: "Décrire l’architecture de l’application web.", en: "Describe the web application’s architecture." },
  "grc.securite.webapp.architecture-applicative.hubCard.title": { fr: "Architecture applicative", en: "Application architecture" },
  "grc.securite.webapp.architecture-applicative.hubCard.desc": {
    fr: "Frontend (SPA/SSR/CSR), backend, reverse proxy, CDN et WAF.",
    en: "Frontend (SPA/SSR/CSR), backend, reverse proxy, CDN and WAF."
  },
  "grc.securite.webapp.architecture-applicative.sectionTitle": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.webapp.architecture-applicative.item1.label": { fr: "Frontend (SPA, SSR, CSR)", en: "Frontend (SPA, SSR, CSR)" },
  "grc.securite.webapp.architecture-applicative.item2.label": { fr: "Backend (API, microservices)", en: "Backend (API, microservices)" },
  "grc.securite.webapp.architecture-applicative.item3.label": { fr: "Reverse proxy", en: "Reverse proxy" },
  "grc.securite.webapp.architecture-applicative.item4.label": { fr: "CDN", en: "CDN" },
  "grc.securite.webapp.architecture-applicative.item5.label": { fr: "WAF (Web Application Firewall)", en: "WAF (Web Application Firewall)" },

  // ===== controles-webapp =====
  "grc.securite.webapp.controles-webapp.title": { fr: "Contrôles de sécurité WebApp", en: "WebApp security controls" },
  "grc.securite.webapp.controles-webapp.subtitle": {
    fr: "Inclure les contrôles techniques obligatoires pour sécuriser l’application web.",
    en: "Include the mandatory technical controls to secure the web application."
  },
  "grc.securite.webapp.controles-webapp.hubCard.title": { fr: "Contrôles de sécurité WebApp", en: "WebApp security controls" },
  "grc.securite.webapp.controles-webapp.hubCard.desc": {
    fr: "HTTPS, CSP, HSTS, X-Frame-Options, X-XSS-Protection et cookies sécurisés.",
    en: "HTTPS, CSP, HSTS, X-Frame-Options, X-XSS-Protection and secure cookies."
  },
  "grc.securite.webapp.controles-webapp.sectionTitle": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.webapp.controles-webapp.item1.label": { fr: "HTTPS obligatoire", en: "Mandatory HTTPS" },
  "grc.securite.webapp.controles-webapp.item2.label": { fr: "CSP (Content Security Policy)", en: "CSP (Content Security Policy)" },
  "grc.securite.webapp.controles-webapp.item3.label": { fr: "HSTS", en: "HSTS" },
  "grc.securite.webapp.controles-webapp.item4.label": { fr: "X-Frame-Options", en: "X-Frame-Options" },
  "grc.securite.webapp.controles-webapp.item5.label": { fr: "X-XSS-Protection", en: "X-XSS-Protection" },
  "grc.securite.webapp.controles-webapp.item6.label": { fr: "SameSite cookies", en: "SameSite cookies" },
  "grc.securite.webapp.controles-webapp.item7.label": { fr: "Secure cookies", en: "Secure cookies" },
  "grc.securite.webapp.controles-webapp.item8.label": { fr: "HttpOnly cookies", en: "HttpOnly cookies" },

  // ===== gestion-sessions =====
  "grc.securite.webapp.gestion-sessions.title": { fr: "Gestion des sessions", en: "Session management" },
  "grc.securite.webapp.gestion-sessions.subtitle": { fr: "Décrire la gestion des sessions utilisateur.", en: "Describe user session management." },
  "grc.securite.webapp.gestion-sessions.hubCard.title": { fr: "Gestion des sessions", en: "Session management" },
  "grc.securite.webapp.gestion-sessions.hubCard.desc": {
    fr: "Tokens sécurisés, expiration courte, rotation et invalidation à la déconnexion.",
    en: "Secure tokens, short expiration, rotation and invalidation on logout."
  },
  "grc.securite.webapp.gestion-sessions.sectionTitle": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.webapp.gestion-sessions.item1.label": { fr: "Tokens sécurisés", en: "Secure tokens" },
  "grc.securite.webapp.gestion-sessions.item2.label": { fr: "Expiration courte", en: "Short expiration" },
  "grc.securite.webapp.gestion-sessions.item3.label": { fr: "Rotation des tokens", en: "Token rotation" },
  "grc.securite.webapp.gestion-sessions.item4.label": { fr: "Invalidation à la déconnexion", en: "Invalidation on logout" },

  // ===== journalisation-monitoring =====
  "grc.securite.webapp.journalisation-monitoring.title": { fr: "Journalisation & monitoring", en: "Logging & monitoring" },
  "grc.securite.webapp.journalisation-monitoring.subtitle": {
    fr: "Décrire les outils et processus de surveillance de l’application web.",
    en: "Describe the tools and processes used to monitor the web application."
  },
  "grc.securite.webapp.journalisation-monitoring.hubCard.title": { fr: "Journalisation & monitoring", en: "Logging & monitoring" },
  "grc.securite.webapp.journalisation-monitoring.hubCard.desc": {
    fr: "Logs applicatifs, logs d’erreurs/d’accès, corrélation SIEM et alertes WAF.",
    en: "Application logs, error/access logs, SIEM correlation and WAF alerts."
  },
  "grc.securite.webapp.journalisation-monitoring.sectionTitle": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.webapp.journalisation-monitoring.item1.label": { fr: "Logs applicatifs", en: "Application logs" },
  "grc.securite.webapp.journalisation-monitoring.item2.label": { fr: "Logs d’erreurs", en: "Error logs" },
  "grc.securite.webapp.journalisation-monitoring.item3.label": { fr: "Logs d’accès", en: "Access logs" },
  "grc.securite.webapp.journalisation-monitoring.item4.label": { fr: "Corrélation SIEM", en: "SIEM correlation" },
  "grc.securite.webapp.journalisation-monitoring.item5.label": { fr: "Alertes WAF", en: "WAF alerts" },

  // ===== protection-attaques-webapp =====
  "grc.securite.webapp.protection-attaques-webapp.title": { fr: "Protection contre les attaques WebApp", en: "Protection against WebApp attacks" },
  "grc.securite.webapp.protection-attaques-webapp.subtitle": {
    fr: "Décrire les protections mises en place contre les attaques ciblant l’application web.",
    en: "Describe the protections in place against attacks targeting the web application."
  },
  "grc.securite.webapp.protection-attaques-webapp.hubCard.title": { fr: "Protection contre les attaques WebApp", en: "Protection against WebApp attacks" },
  "grc.securite.webapp.protection-attaques-webapp.hubCard.desc": {
    fr: "XSS, CSRF, injections, Directory Traversal, upload abusif, Broken Access Control, IDOR.",
    en: "XSS, CSRF, injections, Directory Traversal, file upload abuse, Broken Access Control, IDOR."
  },
  "grc.securite.webapp.protection-attaques-webapp.sectionTitle": { fr: "Menaces couvertes", en: "Threats covered" },
  "grc.securite.webapp.protection-attaques-webapp.item1.label": { fr: "XSS (stocké, réfléchi, DOM)", en: "XSS (stored, reflected, DOM)" },
  "grc.securite.webapp.protection-attaques-webapp.item2.label": { fr: "CSRF", en: "CSRF" },
  "grc.securite.webapp.protection-attaques-webapp.item3.label": { fr: "SQL Injection", en: "SQL Injection" },
  "grc.securite.webapp.protection-attaques-webapp.item4.label": { fr: "Command Injection", en: "Command Injection" },
  "grc.securite.webapp.protection-attaques-webapp.item5.label": { fr: "Directory Traversal", en: "Directory Traversal" },
  "grc.securite.webapp.protection-attaques-webapp.item6.label": { fr: "File Upload abuse", en: "File Upload abuse" },
  "grc.securite.webapp.protection-attaques-webapp.item7.label": { fr: "Broken Access Control", en: "Broken Access Control" },
  "grc.securite.webapp.protection-attaques-webapp.item8.label": { fr: "Insecure Direct Object Reference (IDOR)", en: "Insecure Direct Object Reference (IDOR)" },

  // ===== securite-fichiers =====
  "grc.securite.webapp.securite-fichiers.title": { fr: "Sécurité des fichiers", en: "File security" },
  "grc.securite.webapp.securite-fichiers.subtitle": {
    fr: "Décrire les mesures de sécurité appliquées aux fichiers téléversés.",
    en: "Describe the security measures applied to uploaded files."
  },
  "grc.securite.webapp.securite-fichiers.hubCard.title": { fr: "Sécurité des fichiers", en: "File security" },
  "grc.securite.webapp.securite-fichiers.hubCard.desc": {
    fr: "Scan antivirus, restrictions MIME/extensions et stockage isolé.",
    en: "Antivirus scanning, MIME/extension restrictions and isolated storage."
  },
  "grc.securite.webapp.securite-fichiers.sectionTitle": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.webapp.securite-fichiers.item1.label": { fr: "Scan antivirus", en: "Antivirus scanning" },
  "grc.securite.webapp.securite-fichiers.item2.label": { fr: "Restrictions MIME", en: "MIME restrictions" },
  "grc.securite.webapp.securite-fichiers.item3.label": { fr: "Restrictions d’extensions", en: "Extension restrictions" },
  "grc.securite.webapp.securite-fichiers.item4.label": { fr: "Stockage isolé (pas dans /wwwroot)", en: "Isolated storage (not under /wwwroot)" },

  // ===== tests-audits-webapp =====
  "grc.securite.webapp.tests-audits-webapp.title": { fr: "Tests & audits WebApp", en: "WebApp tests & audits" },
  "grc.securite.webapp.tests-audits-webapp.subtitle": {
    fr: "Décrire les tests et audits réalisés pour valider la sécurité de l’application web.",
    en: "Describe the tests and audits performed to validate the web application’s security."
  },
  "grc.securite.webapp.tests-audits-webapp.hubCard.title": { fr: "Tests & audits WebApp", en: "WebApp tests & audits" },
  "grc.securite.webapp.tests-audits-webapp.hubCard.desc": {
    fr: "OWASP Top 10, pentest applicatif, scans automatisés (ZAP, Burp Suite) et tests unitaires.",
    en: "OWASP Top 10, application penetration testing, automated scans (ZAP, Burp Suite) and unit tests."
  },
  "grc.securite.webapp.tests-audits-webapp.sectionTitle": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.webapp.tests-audits-webapp.item1.label": { fr: "OWASP Top 10", en: "OWASP Top 10" },
  "grc.securite.webapp.tests-audits-webapp.item2.label": { fr: "Pentest applicatif", en: "Application penetration testing" },
  "grc.securite.webapp.tests-audits-webapp.item3.label": { fr: "Scans automatisés (ZAP, Burp Suite)", en: "Automated scans (ZAP, Burp Suite)" },
  "grc.securite.webapp.tests-audits-webapp.item4.label": { fr: "Tests unitaires de sécurité", en: "Security unit tests" },
  "grc.securite.webapp.tests-audits-webapp.item5.label": { fr: "Tests d’intégration", en: "Integration tests" },

  // ===== validation-entrees =====
  "grc.securite.webapp.validation-entrees.title": { fr: "Validation des entrées", en: "Input validation" },
  "grc.securite.webapp.validation-entrees.subtitle": {
    fr: "Décrire les mesures de validation des entrées utilisateur.",
    en: "Describe the measures used to validate user input."
  },
  "grc.securite.webapp.validation-entrees.hubCard.title": { fr: "Validation des entrées", en: "Input validation" },
  "grc.securite.webapp.validation-entrees.hubCard.desc": {
    fr: "Validation côté serveur/client, normalisation des données et filtrage strict.",
    en: "Server/client-side validation, data normalization and strict filtering."
  },
  "grc.securite.webapp.validation-entrees.sectionTitle": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.webapp.validation-entrees.item1.label": { fr: "Validation côté serveur", en: "Server-side validation" },
  "grc.securite.webapp.validation-entrees.item2.label": { fr: "Validation côté client (optionnelle)", en: "Client-side validation (optional)" },
  "grc.securite.webapp.validation-entrees.item3.label": { fr: "Normalisation des données", en: "Data normalization" },
  "grc.securite.webapp.validation-entrees.item4.label": { fr: "Filtrage strict", en: "Strict filtering" }
});
