/* Traductions du sous-hub "Sécurité Base de données" (grc/securite/database/) --
   séparé de grc-i18n.js pour garder ce module dédié aux 8 pages détail de
   cette sous-section, plus les 2 clés du hub lui-même (hub.title / hub.subtitle).
   Fusionné dans le même I18N_DICT / applyI18n() (voir assets/script/i18n.js),
   namespacé sous "grc.securite.database.*". Chargé après i18n.js et
   grc-i18n.js sur le hub (index.html) et chacune de ses 8 pages détail.

   Note structurelle : contrairement aux autres pages GRC déjà traduites
   (ex. grc/actifs.html), ces 8 pages n'utilisent pas de <strong> pour les
   libellés de puce (juste du texte simple, parfois suivi d'un span
   .grc-control-tags non traduit) et n'ont pas de section "Rôle en GRC" --
   chaque clé itemN.label couvre donc le texte complet de la puce, et aucune
   clé .role n'a été créée puisque le paragraphe correspondant n'existe pas
   dans le HTML source. */

Object.assign(I18N_DICT, {
  // ===== Hub (grc/securite/database/index.html) =====
  "grc.securite.database.hub.title": { fr: "Sécurité Base de données", en: "Database Security" },
  "grc.securite.database.hub.subtitle": {
    fr: "Protéger les données stockées, les accès, les requêtes et l’intégrité des bases de données, en 8 domaines.",
    en: "Protect stored data, access, queries and the integrity of databases, across 8 domains."
  },

  // ===== architecture-bd =====
  "grc.securite.database.architecture-bd.title": { fr: "Architecture BD", en: "Database Architecture" },
  "grc.securite.database.architecture-bd.subtitle": { fr: "Décrire l’architecture des bases de données de l’organisation.", en: "Describe the organization's database architecture." },
  "grc.securite.database.architecture-bd.hubCard.title": { fr: "Architecture BD", en: "Database Architecture" },
  "grc.securite.database.architecture-bd.hubCard.desc": { fr: "Bases SQL/NoSQL, serveurs dédiés, réplication et clusters.", en: "SQL/NoSQL databases, dedicated servers, replication and clusters." },
  "grc.securite.database.architecture-bd.item1.label": { fr: "Bases SQL (MySQL, PostgreSQL, MSSQL)", en: "SQL databases (MySQL, PostgreSQL, MSSQL)" },
  "grc.securite.database.architecture-bd.item2.label": { fr: "Bases NoSQL (MongoDB, Redis)", en: "NoSQL databases (MongoDB, Redis)" },
  "grc.securite.database.architecture-bd.item3.label": { fr: "Serveurs dédiés", en: "Dedicated servers" },
  "grc.securite.database.architecture-bd.item4.label": { fr: "Réplication", en: "Replication" },
  "grc.securite.database.architecture-bd.item5.label": { fr: "Clusters", en: "Clusters" },

  // ===== chiffrement-bd =====
  "grc.securite.database.chiffrement-bd.title": { fr: "Chiffrement", en: "Encryption" },
  "grc.securite.database.chiffrement-bd.subtitle": { fr: "Décrire les mesures de chiffrement appliquées aux données.", en: "Describe the encryption measures applied to the data." },
  "grc.securite.database.chiffrement-bd.hubCard.title": { fr: "Chiffrement", en: "Encryption" },
  "grc.securite.database.chiffrement-bd.hubCard.desc": {
    fr: "Chiffrement au repos (TDE), en transit (TLS), des colonnes sensibles et hashing sécurisé.",
    en: "Encryption at rest (TDE), in transit (TLS), of sensitive columns, and secure hashing."
  },
  "grc.securite.database.chiffrement-bd.item1.label": { fr: "Chiffrement au repos (TDE)", en: "Encryption at rest (TDE)" },
  "grc.securite.database.chiffrement-bd.item2.label": { fr: "Chiffrement en transit (TLS)", en: "Encryption in transit (TLS)" },
  "grc.securite.database.chiffrement-bd.item3.label": { fr: "Chiffrement des colonnes sensibles", en: "Encryption of sensitive columns" },
  "grc.securite.database.chiffrement-bd.item4.label": { fr: "Hashing sécurisé (bcrypt, Argon2)", en: "Secure hashing (bcrypt, Argon2)" },

  // ===== controles-acces-bd =====
  "grc.securite.database.controles-acces-bd.title": { fr: "Contrôles d’accès", en: "Access Controls" },
  "grc.securite.database.controles-acces-bd.subtitle": { fr: "Décrire les règles d’accès aux bases de données.", en: "Describe the access rules for the databases." },
  "grc.securite.database.controles-acces-bd.hubCard.title": { fr: "Contrôles d’accès", en: "Access Controls" },
  "grc.securite.database.controles-acces-bd.hubCard.desc": {
    fr: "Comptes séparés par rôle, moindre privilège, comptes de service et MFA administrateur.",
    en: "Role-separated accounts, least privilege, service accounts and administrator MFA."
  },
  "grc.securite.database.controles-acces-bd.item1.label": { fr: "Comptes séparés par rôle", en: "Accounts separated by role" },
  "grc.securite.database.controles-acces-bd.item2.label": { fr: "Moindre privilège", en: "Least privilege" },
  "grc.securite.database.controles-acces-bd.item3.label": { fr: "Comptes de service dédiés", en: "Dedicated service accounts" },
  "grc.securite.database.controles-acces-bd.item4.label": { fr: "Interdiction des comptes partagés", en: "Shared accounts prohibited" },
  "grc.securite.database.controles-acces-bd.item5.label": { fr: "MFA pour les administrateurs", en: "MFA for administrators" },

  // ===== hardening-bd =====
  "grc.securite.database.hardening-bd.title": { fr: "Hardening BD", en: "Database Hardening" },
  "grc.securite.database.hardening-bd.subtitle": { fr: "Décrire les mesures de durcissement appliquées à la base de données.", en: "Describe the hardening measures applied to the database." },
  "grc.securite.database.hardening-bd.hubCard.title": { fr: "Hardening BD", en: "Database Hardening" },
  "grc.securite.database.hardening-bd.hubCard.desc": {
    fr: "Désactivation des fonctions dangereuses, limitation des ports, isolation réseau et mises à jour.",
    en: "Disabling dangerous functions, port restriction, network isolation and updates."
  },
  "grc.securite.database.hardening-bd.item1.label": { fr: "Désactivation des fonctions dangereuses", en: "Disabling dangerous functions" },
  "grc.securite.database.hardening-bd.item2.label": { fr: "Limitation des ports", en: "Port restriction" },
  "grc.securite.database.hardening-bd.item3.label": { fr: "Isolation réseau", en: "Network isolation" },
  "grc.securite.database.hardening-bd.item4.label": { fr: "Mise à jour régulière", en: "Regular updates" },
  "grc.securite.database.hardening-bd.item5.label": { fr: "Configuration minimale", en: "Minimal configuration" },

  // ===== journalisation-monitoring-bd =====
  "grc.securite.database.journalisation-monitoring-bd.title": { fr: "Journalisation & monitoring", en: "Logging & Monitoring" },
  "grc.securite.database.journalisation-monitoring-bd.subtitle": { fr: "Décrire les outils et processus de surveillance de la base de données.", en: "Describe the tools and processes used to monitor the database." },
  "grc.securite.database.journalisation-monitoring-bd.hubCard.title": { fr: "Journalisation & monitoring", en: "Logging & Monitoring" },
  "grc.securite.database.journalisation-monitoring-bd.hubCard.desc": {
    fr: "Logs de requêtes/accès/erreurs, audit trail et corrélation SIEM.",
    en: "Query/access/error logs, audit trail and SIEM correlation."
  },
  "grc.securite.database.journalisation-monitoring-bd.item1.label": { fr: "Logs de requêtes", en: "Query logs" },
  "grc.securite.database.journalisation-monitoring-bd.item2.label": { fr: "Logs d’accès", en: "Access logs" },
  "grc.securite.database.journalisation-monitoring-bd.item3.label": { fr: "Logs d’erreurs", en: "Error logs" },
  "grc.securite.database.journalisation-monitoring-bd.item4.label": { fr: "Audit trail", en: "Audit trail" },
  "grc.securite.database.journalisation-monitoring-bd.item5.label": { fr: "Corrélation SIEM", en: "SIEM correlation" },

  // ===== protection-attaques-bd =====
  "grc.securite.database.protection-attaques-bd.title": { fr: "Protection contre les attaques BD", en: "Protection Against Database Attacks" },
  "grc.securite.database.protection-attaques-bd.subtitle": {
    fr: "Décrire les protections mises en place contre les attaques ciblant la base de données.",
    en: "Describe the protections in place against attacks targeting the database."
  },
  "grc.securite.database.protection-attaques-bd.hubCard.title": { fr: "Protection contre les attaques BD", en: "Protection Against Database Attacks" },
  "grc.securite.database.protection-attaques-bd.hubCard.desc": {
    fr: "SQL/NoSQL Injection, élévation de privilèges, dump non autorisé, exfiltration et ransomware.",
    en: "SQL/NoSQL injection, privilege escalation, unauthorized dump, exfiltration and ransomware."
  },
  "grc.securite.database.protection-attaques-bd.threatsTitle": { fr: "Menaces couvertes", en: "Threats covered" },
  "grc.securite.database.protection-attaques-bd.item1.label": { fr: "SQL Injection", en: "SQL Injection" },
  "grc.securite.database.protection-attaques-bd.item2.label": { fr: "NoSQL Injection", en: "NoSQL Injection" },
  "grc.securite.database.protection-attaques-bd.item3.label": { fr: "Privilege escalation", en: "Privilege escalation" },
  "grc.securite.database.protection-attaques-bd.item4.label": { fr: "Dump non autorisé", en: "Unauthorized dump" },
  "grc.securite.database.protection-attaques-bd.item5.label": { fr: "Exfiltration de données", en: "Data exfiltration" },
  "grc.securite.database.protection-attaques-bd.item6.label": { fr: "Ransomware", en: "Ransomware" },

  // ===== sauvegarde-restauration =====
  "grc.securite.database.sauvegarde-restauration.title": { fr: "Sauvegarde & restauration", en: "Backup & Restore" },
  "grc.securite.database.sauvegarde-restauration.subtitle": { fr: "Décrire les processus de sauvegarde et de restauration.", en: "Describe the backup and restore processes." },
  "grc.securite.database.sauvegarde-restauration.hubCard.title": { fr: "Sauvegarde & restauration", en: "Backup & Restore" },
  "grc.securite.database.sauvegarde-restauration.hubCard.desc": {
    fr: "Sauvegardes régulières, tests de restauration, stockage hors site et chiffrement des backups.",
    en: "Regular backups, restore testing, off-site storage and backup encryption."
  },
  "grc.securite.database.sauvegarde-restauration.item1.label": { fr: "Sauvegardes régulières", en: "Regular backups" },
  "grc.securite.database.sauvegarde-restauration.item2.label": { fr: "Tests de restauration", en: "Restore testing" },
  "grc.securite.database.sauvegarde-restauration.item3.label": { fr: "Stockage hors site", en: "Off-site storage" },
  "grc.securite.database.sauvegarde-restauration.item4.label": { fr: "Rotation des sauvegardes", en: "Backup rotation" },
  "grc.securite.database.sauvegarde-restauration.item5.label": { fr: "Chiffrement des backups", en: "Backup encryption" },

  // ===== securite-requetes =====
  "grc.securite.database.securite-requetes.title": { fr: "Sécurité des requêtes", en: "Query Security" },
  "grc.securite.database.securite-requetes.subtitle": { fr: "Décrire les mesures de sécurité appliquées aux requêtes.", en: "Describe the security measures applied to queries." },
  "grc.securite.database.securite-requetes.hubCard.title": { fr: "Sécurité des requêtes", en: "Query Security" },
  "grc.securite.database.securite-requetes.hubCard.desc": {
    fr: "Requêtes préparées, ORM sécurisé et validation stricte des paramètres.",
    en: "Prepared statements, secure ORM and strict parameter validation."
  },
  "grc.securite.database.securite-requetes.item1.label": { fr: "Requêtes préparées", en: "Prepared statements" },
  "grc.securite.database.securite-requetes.item2.label": { fr: "ORM sécurisé", en: "Secure ORM" },
  "grc.securite.database.securite-requetes.item3.label": { fr: "Interdiction de concaténation SQL", en: "SQL concatenation prohibited" },
  "grc.securite.database.securite-requetes.item4.label": { fr: "Validation des paramètres", en: "Parameter validation" }
});
