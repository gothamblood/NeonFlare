/* Documentation — Actifs (grc/actifs.html) · ISO 27001 A.5.9–A.5.13.
   Troisième étape : on recense ce qu'il faut protéger. Le registre des
   actifs existant est réutilisé tel quel (onglet « Registre ») ; les
   catégories de ressources sont des vues filtrées de ce registre.
   Moteur : grc-fiches.js ; plan : spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const typeLabel = (t) => (typeof grcAssetTypeLabel === "function" ? grcAssetTypeLabel(t) : t);
  const critOf = (a) => (typeof grcAssetCriticality === "function" ? grcAssetCriticality(a) : "");

  function assetsByTypes(types, emptyFr, emptyEn) {
    return () => ({
      columns: [L("Actif", "Asset"), L("Type", "Type"), L("Criticité (1–3)", "Criticality (1–3)"), L("Propriétaire", "Owner")],
      rows: grcFicheSrc.assets().filter((a) => types.indexOf(a.type) !== -1)
        .map((a) => [a.name || "", typeLabel(a.type), String(critOf(a)), a.owner || ""]),
      empty: L(emptyFr, emptyEn),
    });
  }

  grcFicheRegister("actifs", {
    docTitle: L("Inventaire et classification des actifs", "Asset inventory and classification"),
    docRef: "ISO/IEC 27001:2022 A.5.9 – A.5.13",
    elements: [
      {
        id: "inventaire",
        example: { perimetre: L("Postes, serveurs, applications infonuagiques et données clients du siège", "Workstations, servers, cloud applications and client data at head office"), frequence: L("Revue trimestrielle", "Quarterly review"), responsable: L("Service TI", "IT") },
        essential: true,
        title: L("Périmètre", "Scope"),
        ref: L("ISO 27001 A.5.9 · CIS 1 · CIS 2", "ISO 27001 A.5.9 · CIS 1 · CIS 2"),
        desc: L("Comment l’inventaire est tenu à jour : son périmètre, d’où viennent les données, à quelle fréquence et par qui. Les actifs eux-mêmes se saisissent dans l’onglet « Registre des actifs ». Exemple : périmètre — tous les postes et serveurs ; source — outil de gestion de parc ; mensuel ; responsable TI.",
          "How the inventory is kept up to date: its scope, where the data comes from, how often and by whom. The assets themselves are entered in the \"Asset register\" tab. Example: scope — all workstations and servers; source — asset management tool; monthly; IT lead."),
        header: ["perimetre", "source"],
        fields: [
          { id: "perimetre", type: "textarea", required: true, label: L("Périmètre inventorié", "Inventory scope") },
          { id: "source", type: "select", label: L("Source", "Source"), options: [
            O("outil", "Outil de gestion de parc / CMDB", "Asset management tool / CMDB"), O("decouverte", "Découverte réseau", "Network discovery"),
            O("entrevue", "Entrevues", "Interviews"), O("manuel", "Relevé manuel", "Manual survey"), O("autre", "Autre", "Other"),
          ] },
          { id: "frequence", type: "text", suggest: "frequence", label: L("Fréquence de mise à jour", "Update frequency") },
          { id: "responsable", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Responsable", "Owner") },
          { id: "derniereMaj", type: "text", label: L("Dernière mise à jour (AAAA-MM-JJ)", "Last update (YYYY-MM-DD)") },
        ],
      },
      {
        id: "classification",
        example: { niveau: L("Confidentiel", "Confidential"), definition: L("Information dont la divulgation nuirait aux clients ou à l’organisation", "Information whose disclosure would harm customers or the organization"), exemples: L("Dossiers clients, paie", "Client files, payroll"), regles: L("Chiffrement obligatoire, partage sur autorisation", "Encryption mandatory, sharing on authorization") },
        essential: true,
        title: L("Classification des actifs", "Asset classification"),
        ref: L("ISO 27001 A.5.12 · A.5.13 · CIS 3", "ISO 27001 A.5.12 · A.5.13 · CIS 3"),
        desc: L("Le schéma de classification de l’organisation : un niveau par entrée, avec sa définition, des exemples et les règles de manipulation. Le registre des actifs applique ensuite ces niveaux (C / I / D de 1 à 3). Exemple : « Confidentiel » — données clients et financières ; chiffrement obligatoire, partage sur autorisation.",
          "The organization’s classification scheme: one level per entry, with its definition, examples and handling rules. The asset register then applies these levels (C / I / A from 1 to 3). Example: \"Confidential\" — customer and financial data; encryption mandatory, sharing on approval."),
        header: ["niveau", "valeur"],
        fields: [
          { id: "niveau", type: "text", required: true, suggest: "classification", label: L("Niveau", "Level") },
          { id: "valeur", type: "select", label: L("Correspondance (1–3)", "Maps to (1–3)"), options: [
            O("1", "1 — faible", "1 — low"), O("2", "2 — moyen", "2 — medium"), O("3", "3 — élevé", "3 — high"),
          ] },
          { id: "definition", type: "textarea", label: L("Définition", "Definition") },
          { id: "exemples", type: "textarea", label: L("Exemples", "Examples") },
          { id: "regles", type: "textarea", label: L("Règles de manipulation (stockage, partage, destruction)", "Handling rules (storage, sharing, disposal)") },
          { id: "marquage", type: "text", suggest: "classification", label: L("Marquage", "Labelling") },
        ],
      },
      {
        id: "proprietaires",
        kind: "view",
        title: L("Propriétaires des actifs", "Asset owners"),
        ref: L("ISO 27001 A.5.9", "ISO 27001 A.5.9"),
        desc: L("Chaque actif doit avoir un propriétaire responsable. Tiré du registre ; les actifs sans propriétaire sont signalés — complète-les dans l’onglet « Registre des actifs ».",
          "Every asset must have an accountable owner. Taken from the register; assets without an owner are flagged — complete them in the \"Asset register\" tab."),
        table: () => {
          const by = {};
          const orphans = [];
          grcFicheSrc.assets().forEach((a) => {
            const o = (a.owner || "").trim();
            if (!o) orphans.push(a.name || a.id);
            else (by[o] = by[o] || []).push(a.name || a.id);
          });
          const rows = Object.keys(by).sort().map((o) => [o, String(by[o].length), by[o].join(", ")]);
          if (orphans.length) rows.push([grcFicheL(L("⚠ Sans propriétaire", "⚠ No owner")), String(orphans.length), orphans.join(", ")]);
          return { columns: [L("Propriétaire", "Owner"), L("Nombre", "Count"), L("Actifs", "Assets")], rows: rows,
            empty: L("Aucun actif dans le registre.", "No asset in the register.") };
        },
        manage: "registre",
      },
      {
        id: "registre",
        essential: true,
        kind: "register",
        title: L("Registre des actifs", "Asset register"),
        ref: L("ISO 27001 A.5.9 · NIST ID.AM · CIS 1", "ISO 27001 A.5.9 · NIST ID.AM · CIS 1"),
        desc: L("Un actif par entrée : type, classification C / I / D, rôle primaire ou support, propriétaire, valeur (AV, utilisée pour le calcul du SLE), dépendances.",
          "One asset per entry: type, C / I / A classification, primary or supporting role, owner, value (AV, used to compute the SLE), dependencies."),
        block: "#grcAssetRegistry",
        count: () => grcFicheSrc.assets().length,
        reinit: () => initGrcAssetRegistry(),
        table: () => ({
          columns: [L("Actif", "Asset"), L("Type", "Type"), L("C/I/D", "C/I/A"), L("Propriétaire", "Owner"), L("Valeur", "Value")],
          rows: grcFicheSrc.assets().map((a) => [a.name || "", typeLabel(a.type), [a.c, a.i, a.a].join("/"), a.owner || "",
            typeof grkFormatMoney === "function" ? grkFormatMoney(a.valueAmount, a.valueCurrency) : ""]),
        }),
      },
      {
        id: "rh",
        kind: "view",
        title: L("Ressources humaines", "Human resources"),
        ref: L("ISO 27001 A.6.1 · NIST GV.RR", "ISO 27001 A.6.1 · NIST GV.RR"),
        desc: L("Les personnes et compétences clés, surtout celles difficiles à remplacer (actifs de type « humain » du registre). Pense à leur suppléant.",
          "Key people and skills, especially hard-to-replace ones (\"human\" assets in the register). Think about their deputy."),
        table: assetsByTypes(["humain"], "Aucun actif « humain » dans le registre.", "No \"human\" asset in the register."),
        manage: "registre",
      },
      {
        id: "infrastructures",
        kind: "view",
        title: L("Infrastructures", "Infrastructure"),
        ref: L("ISO 27001 A.7 · A.8.20", "ISO 27001 A.7 · A.8.20"),
        desc: L("Sites, locaux, équipements et réseau (actifs de type « physique » et « réseau »).",
          "Sites, premises, equipment and network (\"physical\" and \"network\" assets)."),
        table: assetsByTypes(["physique", "reseau"], "Aucune infrastructure dans le registre.", "No infrastructure in the register."),
        manage: "registre",
      },
      {
        id: "si",
        kind: "view",
        title: L("Systèmes d’information", "Information systems"),
        ref: L("ISO 27001 A.5.9 · CIS 1 · CIS 2", "ISO 27001 A.5.9 · CIS 1 · CIS 2"),
        desc: L("Applications, logiciels et données (actifs de type « logiciel » et « donnée »).",
          "Applications, software and data (\"software\" and \"data\" assets)."),
        table: assetsByTypes(["logiciel", "donnee"], "Aucun système d’information dans le registre.", "No information system in the register."),
        manage: "registre",
      },
      {
        id: "intellectuelles",
        kind: "view",
        title: L("Ressources intellectuelles", "Intellectual resources"),
        ref: L("ISO 27001 A.5.32", "ISO 27001 A.5.32"),
        desc: L("Savoir-faire, propriété intellectuelle, méthodes, documentation (actifs de type « intellectuel »).",
          "Know-how, intellectual property, methods, documentation (\"intellectual\" assets)."),
        table: assetsByTypes(["intellectuel"], "Aucune ressource intellectuelle dans le registre.", "No intellectual resource in the register."),
        manage: "registre",
      },
      {
        id: "fournisseurs",
        kind: "view",
        title: L("Fournisseurs externes", "External suppliers"),
        ref: L("ISO 27001 A.5.19 · NIST GV.SC · CIS 15", "ISO 27001 A.5.19 · NIST GV.SC · CIS 15"),
        desc: L("Les prestataires dont dépendent tes actifs, tirés du registre des fournisseurs.",
          "The providers your assets rely on, taken from the supplier register."),
        table: () => ({
          columns: [L("Fournisseur", "Supplier"), L("Service", "Service"), L("Criticité", "Criticality"), L("Données partagées", "Data shared")],
          rows: grcFicheSrc.suppliers().map((s) => [s.name || "", s.service || "", s.criticality || "", s.dataShared || ""]),
          empty: L("Aucun fournisseur (page Gestion des fournisseurs).", "No supplier (Supplier management page)."),
        }),
        manage: "fournisseurs.html#fiche-registre",
      },
    ],
  });
})();
