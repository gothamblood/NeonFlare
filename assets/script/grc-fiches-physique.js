/* Documentation — Sécurité physique (grc/securite/operationnelle/securite-physique.html) · ISO 27001 A.7. Domaine de mesures (Sécurité opérationnelle) : les lieux et les équipements.
   Moteur : grc-fiches.js. Identifiants STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  grcFicheRegister("securite-physique", {
    docTitle: L("Sécurité physique et environnementale", "Physical and environmental security"),
    docRef: "ISO/IEC 27001:2022 Annex A 7",
    elements: [
      {
        id: "zones",
        essential: true,
        title: L("Zones et accès physiques", "Zones and physical access"),
        ref: L("ISO 27001 A.7.1 · A.7.2 · A.7.3", "ISO 27001 A.7.1 · A.7.2 · A.7.3"),
        lead: L("Les lieux à protéger, leur niveau de sécurité et qui peut y entrer.", "The places to protect, their security level and who may enter."),
        desc: L("Une entrée par zone (accueil, bureaux, salle des serveurs…). Relie-la au site de la portée et aux actifs qu’elle abrite. Exemple : « Salle des serveurs » — zone sensible — accès par badge limité aux TI, registre des visiteurs.", "One entry per zone (reception, offices, server room…). Link it to the scope site and the assets it houses. Example: \"Server room\" — sensitive zone — badge access limited to IT, visitor log."),
        header: ["zone", "niveau"],
        fields: [
          { id: "zone", type: "text", required: true, label: L("Zone", "Zone") },
          { id: "site", linkTo: "portee", label: L("Site (portée)", "Site (scope)") },
          { id: "niveau", type: "select", label: L("Niveau", "Level"), options: [O("public", "Publique", "Public"), O("controle", "Contrôlée", "Controlled"), O("restreint", "Restreinte", "Restricted"), O("sensible", "Sensible", "Sensitive")] },
          { id: "acces", type: "textarea", label: L("Contrôle des accès", "Access control") },
          { id: "actifs", linkTo: "asset", multi: true, label: L("Actifs abrités", "Assets housed") },
        ],
        example: { zone: L("Salle des serveurs", "Server room"), niveau: "sensible", acces: L("Badge limité aux TI, registre des visiteurs", "Badge limited to IT, visitor log") },
      },
      {
        id: "surveillance",
        title: L("Surveillance physique", "Physical monitoring"),
        ref: L("ISO 27001 A.7.4", "ISO 27001 A.7.4"),
        lead: L("Comment les lieux sont surveillés et ce qu’on fait des enregistrements.", "How premises are monitored and what happens to recordings."),
        desc: L("Une entrée par moyen de surveillance. Pense à la vie privée (affichage, conservation limitée). Exemple : caméra à l’entrée de la salle des serveurs, conservation 30 jours.", "One entry per monitoring means. Mind privacy (signage, limited retention). Example: camera at the server room entrance, 30-day retention."),
        header: ["moyen"],
        fields: [
          { id: "moyen", type: "text", required: true, suggest: "surveillance", label: L("Moyen", "Means") },
          { id: "zone", linkTo: "zone", label: L("Zone", "Zone") },
          { id: "conservation", type: "text", suggest: "duree", label: L("Conservation des enregistrements", "Recording retention") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
        ],
        example: { moyen: L("Caméra à l’entrée de la salle des serveurs", "Camera at the server room entrance"), conservation: L("30 jours", "30 days") },
      },
      {
        id: "environnement",
        essential: true,
        title: L("Menaces environnementales et services support", "Environmental threats and utilities"),
        ref: L("ISO 27001 A.7.5 · A.7.8 · A.7.11", "ISO 27001 A.7.5 · A.7.8 · A.7.11"),
        lead: L("Ce qui peut endommager les lieux ou couper les services (feu, eau, électricité) et comment c’est prévenu.", "What can damage premises or cut utilities (fire, water, power) and how it is prevented."),
        desc: L("Une entrée par menace et zone, reliée au contrôle qui la traite. Exemple : coupure électrique — salle des serveurs — onduleur 30 min + génératrice.", "One entry per threat and zone, linked to the control addressing it. Example: power outage — server room — 30-min UPS + generator."),
        header: ["menace", "zone"],
        fields: [
          { id: "menace", type: "text", required: true, suggest: "menace", label: L("Menace", "Threat") },
          { id: "zone", linkTo: "zone", label: L("Zone", "Zone") },
          { id: "mesure", type: "textarea", label: L("Mesure en place", "Measure in place") },
          { id: "controle", linkTo: "control", label: L("Contrôle du registre", "Register control") },
          { id: "dateRevue", type: "date", label: L("Prochain test / vérification", "Next test / check") },
        ],
        example: { menace: L("Coupure électrique", "Power outage"), mesure: L("Onduleur 30 min et génératrice", "30-min UPS and generator") },
      },
      {
        id: "bureau-propre",
        title: L("Bureau propre et écran verrouillé", "Clear desk and clear screen"),
        ref: L("ISO 27001 A.7.7", "ISO 27001 A.7.7"),
        lead: L("Les règles pour ne rien laisser traîner : papiers, clés USB, écrans déverrouillés.", "The rules to leave nothing lying around: papers, USB keys, unlocked screens."),
        desc: L("Une entrée par règle. Exemple : verrouillage automatique de l’écran après 5 minutes ; documents confidentiels sous clé en fin de journée.", "One entry per rule. Example: automatic screen lock after 5 minutes; confidential documents locked away at end of day."),
        header: ["regle"],
        fields: [
          { id: "regle", type: "textarea", required: true, label: L("Règle", "Rule") },
          { id: "verification", type: "text", suggest: "verification", label: L("Comment c’est vérifié", "How it is checked") },
        ],
        example: { regle: L("Écran verrouillé automatiquement après 5 minutes", "Screen automatically locked after 5 minutes"), verification: L("Stratégie de groupe, contrôle mensuel", "Group policy, monthly check") },
      },
      {
        id: "equipements",
        title: L("Équipements : emplacement, hors site, maintenance", "Equipment: siting, off-premises, maintenance"),
        ref: L("ISO 27001 A.7.8 · A.7.9 · A.7.13", "ISO 27001 A.7.8 · A.7.9 · A.7.13"),
        lead: L("Comment les équipements sont placés, sortis des locaux et entretenus.", "How equipment is sited, taken off-premises and maintained."),
        desc: L("Une entrée par catégorie d’équipement. Exemple : portables — chiffrement du disque, câble antivol en déplacement, maintenance par le fournisseur autorisé seulement.", "One entry per equipment category. Example: laptops — disk encryption, lock cable when travelling, maintenance by authorized supplier only."),
        header: ["equipement"],
        fields: [
          { id: "equipement", type: "text", required: true, suggest: { from: ["asset"] }, label: L("Équipement", "Equipment") },
          { id: "mesures", type: "textarea", label: L("Mesures", "Measures") },
          { id: "maintenance", type: "text", hint: L("Qui s’en charge et à quelle fréquence", "Who takes care of it and how often"), label: L("Maintenance (qui, fréquence)", "Maintenance (who, frequency)") },
          { id: "actifs", linkTo: "asset", multi: true, label: L("Actifs concernés", "Assets concerned") },
        ],
        example: { equipement: L("Ordinateurs portables", "Laptops"), mesures: L("Disque chiffré, câble antivol en déplacement", "Encrypted disk, lock cable when travelling") },
      },
      {
        id: "supports",
        title: L("Supports de stockage et câblage", "Storage media and cabling"),
        ref: L("ISO 27001 A.7.10 · A.7.12", "ISO 27001 A.7.10 · A.7.12"),
        lead: L("Clés USB, disques, bandes : comment on les utilise, transporte et protège ; et le câblage réseau.", "USB keys, disks, tapes: how they are used, transported and protected; and network cabling."),
        desc: L("Une entrée par type de support ou d’installation. Exemple : clés USB — interdites sauf chiffrées et fournies par les TI.", "One entry per media type or installation. Example: USB keys — forbidden unless encrypted and issued by IT."),
        header: ["support"],
        fields: [
          { id: "support", type: "text", required: true, label: L("Support ou installation", "Media or installation") },
          { id: "regle", type: "textarea", label: L("Règle", "Rule") },
        ],
        example: { support: L("Clés USB", "USB keys"), regle: L("Interdites sauf chiffrées et fournies par les TI", "Forbidden unless encrypted and issued by IT") },
      },
      {
        id: "rebut",
        essential: true,
        title: L("Mise au rebut et réutilisation", "Secure disposal and re-use"),
        ref: L("ISO 27001 A.7.14", "ISO 27001 A.7.14"),
        lead: L("Comment un équipement ou un support est effacé ou détruit avant de quitter l’organisation, avec preuve.", "How equipment or media is wiped or destroyed before leaving the organization, with proof."),
        desc: L("Une entrée par méthode. Relie le fournisseur de destruction s’il y en a un. Exemple : disques — destruction physique par un fournisseur certifié, certificat de destruction conservé 7 ans.", "One entry per method. Link the destruction supplier if any. Example: disks — physical destruction by a certified supplier, destruction certificate kept 7 years."),
        header: ["methode"],
        fields: [
          { id: "methode", type: "text", required: true, suggest: "destruction", label: L("Méthode", "Method") },
          { id: "supports", type: "text", label: L("Supports concernés", "Media concerned") },
          { id: "fournisseur", linkTo: "supplier", label: L("Fournisseur de destruction", "Destruction supplier") },
          { id: "preuve", type: "text", label: L("Preuve conservée", "Evidence kept") },
        ],
        example: { methode: L("Destruction physique certifiée", "Certified physical destruction"), supports: L("Disques durs et SSD", "Hard drives and SSDs"), preuve: L("Certificat conservé 7 ans", "Certificate kept 7 years") },
      },
    ],
  });
})();
