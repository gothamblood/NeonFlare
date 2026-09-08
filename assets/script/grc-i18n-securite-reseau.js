/* Traductions du sous-hub GRC "Sécurité Réseau" (grc/securite/reseau/) --
   couvre le hub (index.html) et ses 10 pages de détail. Fusionné dans le
   même I18N_DICT que assets/script/i18n.js et assets/script/grc-i18n.js,
   chargé juste après grc-i18n.js sur chaque page du dossier. Les clés
   grc.common.* (contentInclude, roleTitle, backToReseau, etc.) restent
   définies dans grc-i18n.js -- ce fichier ne redéfinit que le contenu
   propre à ce sous-hub sous le préfixe "grc.securite.reseau.*".

   Note structurelle : contrairement aux 4 registres GRC déjà traduits,
   les 10 pages de détail de cette section n'ont pas toutes un unique
   "<h2>Contenu à inclure</h2>" suivi d'un "<h2>Rôle en GRC</h2>" --
   certaines ont plusieurs listes à en-tête propre (ex. architecture-reseau
   a "Zones réseau" et "Principes" ; controles-reseau en a cinq), et
   aucune ne comporte de section "Rôle en GRC". Les clés reflètent donc
   le contenu réel de chaque page plutôt que le gabarit type :
   - <slug>.title / .subtitle : h1 / sous-titre
   - <slug>.hubCard.title / .hubCard.desc : carte de la page d'accueil
     du sous-hub (voir index.js / grc-loader.js)
   - <slug>.listN.heading : en-tête de la N-ième liste de la page
   - <slug>.listN.itemM : M-ième puce de cette liste (texte seul, les
     références ISO/NIST/CIS en <span class="grc-control-tags"> ne sont
     jamais traduites)
   - <slug>.highlight.label / .highlight.text : pour les deux pages
     (monitoring, segmentation) qui ont un paragraphe "Objectif : ..." */

Object.assign(I18N_DICT, {
  // ===== hub (grc/securite/reseau/index.html) =====
  "grc.securite.reseau.hub.title": { fr: "Sécurité Réseau", en: "Network Security" },
  "grc.securite.reseau.hub.subtitle": {
    fr: "Architecture, segmentation, contrôles, surveillance et durcissement du réseau, organisés en 10 domaines.",
    en: "Network architecture, segmentation, controls, monitoring and hardening, organized into 10 domains."
  },

  // ===== architecture-reseau =====
  "grc.securite.reseau.architecture-reseau.title": { fr: "Architecture réseau sécurisée", en: "Secure network architecture" },
  "grc.securite.reseau.architecture-reseau.subtitle": {
    fr: "Décrire la structure réseau de l’organisation.",
    en: "Describe the organization’s network structure."
  },
  "grc.securite.reseau.architecture-reseau.hubCard.title": { fr: "Architecture réseau sécurisée", en: "Secure network architecture" },
  "grc.securite.reseau.architecture-reseau.hubCard.desc": {
    fr: "Zones réseau (LAN, WAN, DMZ) et principes de conception (Defense in Depth, Zero Trust).",
    en: "Network zones (LAN, WAN, DMZ) and design principles (Defense in Depth, Zero Trust)."
  },
  "grc.securite.reseau.architecture-reseau.list1.heading": { fr: "Zones réseau", en: "Network zones" },
  "grc.securite.reseau.architecture-reseau.list1.item1": { fr: "Réseau interne (LAN)", en: "Internal network (LAN)" },
  "grc.securite.reseau.architecture-reseau.list1.item2": { fr: "Réseau externe (WAN)", en: "External network (WAN)" },
  "grc.securite.reseau.architecture-reseau.list1.item3": { fr: "DMZ", en: "DMZ" },
  "grc.securite.reseau.architecture-reseau.list1.item4": {
    fr: "Zones sensibles (administration, serveurs, bases de données)",
    en: "Sensitive zones (administration, servers, databases)"
  },
  "grc.securite.reseau.architecture-reseau.list1.item5": { fr: "Zones utilisateurs", en: "User zones" },
  "grc.securite.reseau.architecture-reseau.list1.item6": { fr: "Zones invitées", en: "Guest zones" },
  "grc.securite.reseau.architecture-reseau.list1.item7": { fr: "Réseau VPN / accès distant", en: "VPN network / remote access" },
  "grc.securite.reseau.architecture-reseau.list2.heading": { fr: "Principes", en: "Principles" },
  "grc.securite.reseau.architecture-reseau.list2.item1": { fr: "Defense in Depth", en: "Defense in Depth" },
  "grc.securite.reseau.architecture-reseau.list2.item2": { fr: "Zero Trust Network Architecture", en: "Zero Trust Network Architecture" },
  "grc.securite.reseau.architecture-reseau.list2.item3": { fr: "Segmentation stricte", en: "Strict segmentation" },
  "grc.securite.reseau.architecture-reseau.list2.item4": { fr: "Deny all, allow by exception", en: "Deny all, allow by exception" },

  // ===== controles-reseau =====
  "grc.securite.reseau.controles-reseau.title": { fr: "Contrôles réseau essentiels", en: "Essential network controls" },
  "grc.securite.reseau.controles-reseau.subtitle": {
    fr: "Inclure les contrôles techniques obligatoires.",
    en: "Include the mandatory technical controls."
  },
  "grc.securite.reseau.controles-reseau.hubCard.title": { fr: "Contrôles réseau essentiels", en: "Essential network controls" },
  "grc.securite.reseau.controles-reseau.hubCard.desc": {
    fr: "Pare-feu, IDS/IPS, chiffrement, filtrage DNS et NAT/PAT.",
    en: "Firewalls, IDS/IPS, encryption, DNS filtering and NAT/PAT."
  },
  "grc.securite.reseau.controles-reseau.list1.heading": { fr: "🔐 Pare-feu", en: "🔐 Firewall" },
  "grc.securite.reseau.controles-reseau.list1.item1": { fr: "Filtrage entrant / sortant", en: "Inbound / outbound filtering" },
  "grc.securite.reseau.controles-reseau.list1.item2": { fr: "Règles restrictives", en: "Restrictive rules" },
  "grc.securite.reseau.controles-reseau.list1.item3": { fr: "Inspection profonde (DPI)", en: "Deep packet inspection (DPI)" },
  "grc.securite.reseau.controles-reseau.list1.item4": { fr: "Journalisation", en: "Logging" },
  "grc.securite.reseau.controles-reseau.list2.heading": { fr: "🛡️ IDS / IPS", en: "🛡️ IDS / IPS" },
  "grc.securite.reseau.controles-reseau.list2.item1": { fr: "Détection d’intrusion", en: "Intrusion detection" },
  "grc.securite.reseau.controles-reseau.list2.item2": { fr: "Prévention d’intrusion", en: "Intrusion prevention" },
  "grc.securite.reseau.controles-reseau.list2.item3": { fr: "Signatures + heuristiques", en: "Signatures + heuristics" },
  "grc.securite.reseau.controles-reseau.list2.item4": { fr: "Corrélation avec SIEM", en: "Correlation with SIEM" },
  "grc.securite.reseau.controles-reseau.list3.heading": { fr: "🔒 Chiffrement", en: "🔒 Encryption" },
  "grc.securite.reseau.controles-reseau.list3.item1": { fr: "TLS obligatoire", en: "Mandatory TLS" },
  "grc.securite.reseau.controles-reseau.list3.item2": { fr: "VPN pour accès distant", en: "VPN for remote access" },
  "grc.securite.reseau.controles-reseau.list3.item3": { fr: "SSH pour administration", en: "SSH for administration" },
  "grc.securite.reseau.controles-reseau.list3.item4": { fr: "Interdiction du trafic non chiffré", en: "Unencrypted traffic prohibited" },
  "grc.securite.reseau.controles-reseau.list4.heading": { fr: "🚫 Filtrage DNS", en: "🚫 DNS filtering" },
  "grc.securite.reseau.controles-reseau.list4.item1": { fr: "DNS sécurisé", en: "Secure DNS" },
  "grc.securite.reseau.controles-reseau.list4.item2": { fr: "Protection contre phishing", en: "Phishing protection" },
  "grc.securite.reseau.controles-reseau.list4.item3": { fr: "Blocage des domaines malveillants", en: "Blocking of malicious domains" },
  "grc.securite.reseau.controles-reseau.list5.heading": { fr: "🧱 NAT / PAT", en: "🧱 NAT / PAT" },
  "grc.securite.reseau.controles-reseau.list5.item1": { fr: "Masquage des adresses internes", en: "Masking of internal addresses" },
  "grc.securite.reseau.controles-reseau.list5.item2": { fr: "Protection contre scans externes", en: "Protection against external scans" },

  // ===== gestion-acces =====
  "grc.securite.reseau.gestion-acces.title": { fr: "Gestion des accès réseau", en: "Network access management" },
  "grc.securite.reseau.gestion-acces.subtitle": {
    fr: "Décrire les règles d’accès.",
    en: "Describe the access rules."
  },
  "grc.securite.reseau.gestion-acces.hubCard.title": { fr: "Gestion des accès réseau", en: "Network access management" },
  "grc.securite.reseau.gestion-acces.hubCard.desc": {
    fr: "RBAC, moindre privilège, MFA et séparation des comptes administrateur.",
    en: "RBAC, least privilege, MFA and separation of administrator accounts."
  },
  "grc.securite.reseau.gestion-acces.list1.heading": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.reseau.gestion-acces.list1.item1": { fr: "Accès basé sur le rôle (RBAC)", en: "Role-based access control (RBAC)" },
  "grc.securite.reseau.gestion-acces.list1.item2": { fr: "Moindre privilège", en: "Least privilege" },
  "grc.securite.reseau.gestion-acces.list1.item3": { fr: "MFA obligatoire", en: "Mandatory MFA" },
  "grc.securite.reseau.gestion-acces.list1.item4": { fr: "Interdiction du partage d’identifiants", en: "Credential sharing prohibited" },
  "grc.securite.reseau.gestion-acces.list1.item5": {
    fr: "Accès administrateur séparé du compte utilisateur",
    en: "Administrator access separated from the user account"
  },

  // ===== gestion-equipements =====
  "grc.securite.reseau.gestion-equipements.title": { fr: "Gestion des équipements réseau", en: "Network equipment management" },
  "grc.securite.reseau.gestion-equipements.subtitle": {
    fr: "Décrire la gestion des équipements réseau de l’organisation.",
    en: "Describe how the organization manages its network equipment."
  },
  "grc.securite.reseau.gestion-equipements.hubCard.title": { fr: "Gestion des équipements réseau", en: "Network equipment management" },
  "grc.securite.reseau.gestion-equipements.hubCard.desc": {
    fr: "Switches, routeurs, points d’accès, contrôleurs et firewalls, avec hardening et firmware à jour.",
    en: "Switches, routers, access points, controllers and firewalls, with hardening and up-to-date firmware."
  },
  "grc.securite.reseau.gestion-equipements.list1.heading": { fr: "Équipements couverts", en: "Equipment covered" },
  "grc.securite.reseau.gestion-equipements.list1.item1": { fr: "Switches", en: "Switches" },
  "grc.securite.reseau.gestion-equipements.list1.item2": { fr: "Routeurs", en: "Routers" },
  "grc.securite.reseau.gestion-equipements.list1.item3": { fr: "Points d’accès Wi-Fi", en: "Wi-Fi access points" },
  "grc.securite.reseau.gestion-equipements.list1.item4": { fr: "Contrôleurs réseau", en: "Network controllers" },
  "grc.securite.reseau.gestion-equipements.list1.item5": { fr: "Firewalls", en: "Firewalls" },
  "grc.securite.reseau.gestion-equipements.list2.heading": { fr: "Bonnes pratiques", en: "Best practices" },
  "grc.securite.reseau.gestion-equipements.list2.item1": { fr: "Firmware à jour", en: "Up-to-date firmware" },
  "grc.securite.reseau.gestion-equipements.list2.item2": { fr: "Accès admin limité", en: "Restricted admin access" },
  "grc.securite.reseau.gestion-equipements.list2.item3": { fr: "Configuration sauvegardée", en: "Configuration backed up" },
  "grc.securite.reseau.gestion-equipements.list2.item4": { fr: "Hardening des équipements", en: "Equipment hardening" },

  // ===== monitoring =====
  "grc.securite.reseau.monitoring.title": { fr: "Monitoring et journalisation réseau", en: "Network monitoring and logging" },
  "grc.securite.reseau.monitoring.subtitle": {
    fr: "Décrire les outils et processus de surveillance du réseau.",
    en: "Describe the tools and processes used to monitor the network."
  },
  "grc.securite.reseau.monitoring.hubCard.title": { fr: "Monitoring et journalisation réseau", en: "Network monitoring and logging" },
  "grc.securite.reseau.monitoring.hubCard.desc": {
    fr: "SIEM, logs pare-feu/VPN/IDS-IPS et détection d’anomalies en temps réel.",
    en: "SIEM, firewall/VPN/IDS-IPS logs and real-time anomaly detection."
  },
  "grc.securite.reseau.monitoring.list1.heading": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.reseau.monitoring.list1.item1": { fr: "SIEM", en: "SIEM" },
  "grc.securite.reseau.monitoring.list1.item2": { fr: "Logs pare-feu", en: "Firewall logs" },
  "grc.securite.reseau.monitoring.list1.item3": { fr: "Logs VPN", en: "VPN logs" },
  "grc.securite.reseau.monitoring.list1.item4": { fr: "Logs IDS/IPS", en: "IDS/IPS logs" },
  "grc.securite.reseau.monitoring.list1.item5": { fr: "Détection d’anomalies", en: "Anomaly detection" },
  "grc.securite.reseau.monitoring.list1.item6": { fr: "Alertes en temps réel", en: "Real-time alerts" },
  "grc.securite.reseau.monitoring.highlight.label": { fr: "Objectif :", en: "Goal:" },
  "grc.securite.reseau.monitoring.highlight.text": {
    fr: "Détecter rapidement les comportements suspects.",
    en: "Quickly detect suspicious behavior."
  },

  // ===== protection-attaques =====
  "grc.securite.reseau.protection-attaques.title": { fr: "Protection contre les attaques réseau", en: "Protection against network attacks" },
  "grc.securite.reseau.protection-attaques.subtitle": {
    fr: "Décrire les protections mises en place contre les attaques réseau courantes.",
    en: "Describe the protections in place against common network attacks."
  },
  "grc.securite.reseau.protection-attaques.hubCard.title": { fr: "Protection contre les attaques réseau", en: "Protection against network attacks" },
  "grc.securite.reseau.protection-attaques.hubCard.desc": {
    fr: "DDoS, MITM, scans de ports, ARP/DHCP spoofing, pivoting et exfiltration.",
    en: "DDoS, MITM, port scans, ARP/DHCP spoofing, pivoting and exfiltration."
  },
  "grc.securite.reseau.protection-attaques.list1.heading": { fr: "Menaces couvertes", en: "Threats covered" },
  "grc.securite.reseau.protection-attaques.list1.item1": { fr: "DDoS", en: "DDoS" },
  "grc.securite.reseau.protection-attaques.list1.item2": { fr: "MITM", en: "MITM" },
  "grc.securite.reseau.protection-attaques.list1.item3": { fr: "Scans de ports", en: "Port scans" },
  "grc.securite.reseau.protection-attaques.list1.item4": { fr: "ARP spoofing", en: "ARP spoofing" },
  "grc.securite.reseau.protection-attaques.list1.item5": { fr: "DHCP spoofing", en: "DHCP spoofing" },
  "grc.securite.reseau.protection-attaques.list1.item6": { fr: "Pivoting interne", en: "Internal pivoting" },
  "grc.securite.reseau.protection-attaques.list1.item7": { fr: "Exfiltration de données", en: "Data exfiltration" },

  // ===== securite-communications =====
  "grc.securite.reseau.securite-communications.title": { fr: "Sécurité des communications", en: "Communications security" },
  "grc.securite.reseau.securite-communications.subtitle": {
    fr: "Décrire les mesures pour protéger les flux.",
    en: "Describe the measures used to protect network traffic."
  },
  "grc.securite.reseau.securite-communications.hubCard.title": { fr: "Sécurité des communications", en: "Communications security" },
  "grc.securite.reseau.securite-communications.hubCard.desc": {
    fr: "TLS 1.2+, certificats gérés, VPN IPSec/SSL et interdiction des protocoles obsolètes.",
    en: "TLS 1.2+, managed certificates, IPSec/SSL VPN and prohibition of obsolete protocols."
  },
  "grc.securite.reseau.securite-communications.list1.heading": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.reseau.securite-communications.list1.item1": { fr: "Chiffrement TLS 1.2+", en: "TLS 1.2+ encryption" },
  "grc.securite.reseau.securite-communications.list1.item2": { fr: "Certificats gérés", en: "Managed certificates" },
  "grc.securite.reseau.securite-communications.list1.item3": { fr: "VPN IPSec / SSL", en: "IPSec / SSL VPN" },
  "grc.securite.reseau.securite-communications.list1.item4": {
    fr: "Interdiction des protocoles obsolètes (FTP, Telnet, SMBv1)",
    en: "Obsolete protocols prohibited (FTP, Telnet, SMBv1)"
  },

  // ===== securite-wifi =====
  "grc.securite.reseau.securite-wifi.title": { fr: "Sécurité Wi-Fi", en: "Wi-Fi security" },
  "grc.securite.reseau.securite-wifi.subtitle": {
    fr: "Décrire les mesures de sécurité appliquées aux réseaux Wi-Fi.",
    en: "Describe the security measures applied to Wi-Fi networks."
  },
  "grc.securite.reseau.securite-wifi.hubCard.title": { fr: "Sécurité Wi-Fi", en: "Wi-Fi security" },
  "grc.securite.reseau.securite-wifi.hubCard.desc": {
    fr: "WPA3, SSID séparés, isolation des clients et interdiction des hotspots personnels.",
    en: "WPA3, separate SSIDs, client isolation and prohibition of personal hotspots."
  },
  "grc.securite.reseau.securite-wifi.list1.heading": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.reseau.securite-wifi.list1.item1": { fr: "WPA3 obligatoire", en: "Mandatory WPA3" },
  "grc.securite.reseau.securite-wifi.list1.item2": {
    fr: "SSID séparés (invités, employés, IoT)",
    en: "Separate SSIDs (guests, employees, IoT)"
  },
  "grc.securite.reseau.securite-wifi.list1.item3": { fr: "Filtrage MAC (optionnel)", en: "MAC filtering (optional)" },
  "grc.securite.reseau.securite-wifi.list1.item4": { fr: "Isolation des clients", en: "Client isolation" },
  "grc.securite.reseau.securite-wifi.list1.item5": {
    fr: "Interdiction des hotspots personnels",
    en: "Personal hotspots prohibited"
  },

  // ===== segmentation =====
  "grc.securite.reseau.segmentation.title": { fr: "Segmentation réseau", en: "Network segmentation" },
  "grc.securite.reseau.segmentation.subtitle": {
    fr: "Décrire comment les réseaux sont séparés pour limiter les risques.",
    en: "Describe how networks are separated to limit risk."
  },
  "grc.securite.reseau.segmentation.hubCard.title": { fr: "Segmentation réseau", en: "Network segmentation" },
  "grc.securite.reseau.segmentation.hubCard.desc": {
    fr: "VLAN, ACL et micro-segmentation pour limiter le déplacement latéral d’un attaquant.",
    en: "VLANs, ACLs and micro-segmentation to limit an attacker’s lateral movement."
  },
  "grc.securite.reseau.segmentation.list1.heading": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.reseau.segmentation.list1.item1": { fr: "VLAN par département", en: "VLAN per department" },
  "grc.securite.reseau.segmentation.list1.item2": { fr: "VLAN pour les serveurs", en: "VLAN for servers" },
  "grc.securite.reseau.segmentation.list1.item3": { fr: "VLAN pour les équipements IoT", en: "VLAN for IoT devices" },
  "grc.securite.reseau.segmentation.list1.item4": { fr: "VLAN pour les invités", en: "VLAN for guests" },
  "grc.securite.reseau.segmentation.list1.item5": { fr: "ACL entre VLAN", en: "ACLs between VLANs" },
  "grc.securite.reseau.segmentation.list1.item6": {
    fr: "Micro-segmentation pour les environnements critiques",
    en: "Micro-segmentation for critical environments"
  },
  "grc.securite.reseau.segmentation.highlight.label": { fr: "Objectif :", en: "Goal:" },
  "grc.securite.reseau.segmentation.highlight.text": {
    fr: "Empêcher un attaquant de se déplacer latéralement.",
    en: "Prevent an attacker from moving laterally."
  },

  // ===== tests-audits =====
  "grc.securite.reseau.tests-audits.title": { fr: "Tests et audits réseau", en: "Network tests and audits" },
  "grc.securite.reseau.tests-audits.subtitle": {
    fr: "Décrire les tests et audits réalisés pour valider la sécurité réseau.",
    en: "Describe the tests and audits performed to validate network security."
  },
  "grc.securite.reseau.tests-audits.hubCard.title": { fr: "Tests et audits réseau", en: "Network tests and audits" },
  "grc.securite.reseau.tests-audits.hubCard.desc": {
    fr: "Tests de pénétration, scans de vulnérabilités et audits de configuration et de segmentation.",
    en: "Penetration testing, vulnerability scans, and configuration and segmentation audits."
  },
  "grc.securite.reseau.tests-audits.list1.heading": { fr: "Éléments à inclure", en: "Elements to include" },
  "grc.securite.reseau.tests-audits.list1.item1": { fr: "Tests de pénétration réseau", en: "Network penetration testing" },
  "grc.securite.reseau.tests-audits.list1.item2": { fr: "Scans de vulnérabilités", en: "Vulnerability scans" },
  "grc.securite.reseau.tests-audits.list1.item3": { fr: "Audits de configuration", en: "Configuration audits" },
  "grc.securite.reseau.tests-audits.list1.item4": { fr: "Vérification des règles de pare-feu", en: "Firewall rule review" },
  "grc.securite.reseau.tests-audits.list1.item5": { fr: "Tests de segmentation", en: "Segmentation testing" }
});
