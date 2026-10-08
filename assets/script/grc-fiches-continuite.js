/* Documentation — Continuité (grc/continuite.html) · ISO 22301. Dixième
   étape : rester debout quand tout va mal. La page principale documente
   l'analyse de risques PCA, les ressources critiques, les stratégies, la
   formation et l'amélioration ; le registre PCA/PRA existant (BIA,
   dépendances, redondance, PRA, tests, CCD, SPOC) est réutilisé tel quel.
   Les 9 sous-pages (BIA, PCA, PCO…) gardent leur checklist.
   Moteur : grc-fiches.js ; plan : spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const plans = () => grcFicheSrc.continuity();
  const bias = () => (typeof getGrcBia === "function" ? getGrcBia() : []);
  // Disponibilité (note de cours) : D = MTBF / (MTBF + MTTR) ; série = produit
  // des disponibilités ; parallèle = 1 − produit des indisponibilités.
  // Année moyenne = 8 766 h (365,25 j).
  const HOURS_YEAR = 8766;
  const num = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return Number.isFinite(n) ? n : null; };
  const availOf = (e) => { const b = num(e.mtbf); const r = num(e.mttr); return b != null && r != null && b + r > 0 ? b / (b + r) : null; };
  const pct = (d) => (d == null ? "—" : (Math.round(d * 100000) / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 }) + " %");
  const downtime = (d) => {
    if (d == null) return "—";
    const h = (1 - d) * HOURS_YEAR;
    if (h >= 48) return (Math.round(h / 24 * 10) / 10) + " j";
    if (h >= 1) return Math.floor(h) + " h " + Math.round((h % 1) * 60) + " min";
    return Math.round(h * 60) + " min";
  };
  function renderAvailability(host) {
    const draw = () => {
      let box = host.querySelector(".grc-avail-box");
      if (!box) { box = document.createElement("div"); box.className = "grc-avail-box"; host.insertBefore(box, host.firstChild); }
      box.innerHTML = "";
      const rows = grcFicheEntries("continuite", "disponibilite");
      if (!rows.length) return;
      const groups = {};
      rows.forEach((e) => { const g = (e.chaine || "").trim() || "—"; (groups[g] = groups[g] || []).push(e); });
      const t = document.createElement("table");
      t.className = "grc-fiche-table grc-avail-table";
      const head = [L("Chaîne / service", "Chain / service"), L("Composants", "Components"), L("Montage", "Arrangement"), L("Disponibilité calculée", "Computed availability"), L("Indisponibilité / an", "Downtime / year"), L("Cible", "Target")];
      t.innerHTML = "<thead><tr>" + head.map((h) => "<th>" + grkEscapeHtml(grcFicheL(h)) + "</th>").join("") + "</tr></thead>";
      const tb = document.createElement("tbody");
      Object.keys(groups).forEach((g) => {
        const list = groups[g];
        const ds = list.map(availOf).filter((d) => d != null);
        const par = list.some((e) => e.montage === "parallele");
        const d = !ds.length ? null : (par ? 1 - ds.reduce((a, x) => a * (1 - x), 1) : ds.reduce((a, x) => a * x, 1));
        const target = list.map((e) => num(e.cible)).find((x) => x != null);
        const tr = document.createElement("tr");
        const miss = target != null && d != null && d * 100 < target;
        [g, list.map((e) => e.systeme + " (" + pct(availOf(e)) + ")").join(", "),
          grcFicheL(par ? L("Parallèle — un seul suffit", "Parallel — one is enough") : L("Série — tout doit marcher", "Series — all must work")),
          pct(d), downtime(d), target == null ? "—" : target + " %" + (miss ? " ⚠" : "")].forEach((v) => {
          const td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
        });
        if (miss) tr.className = "grc-avail-miss";
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      box.appendChild(t);
    };
    draw();
    if (!host.dataset.availHook) {
      host.dataset.availHook = "1";
      ["submit", "click"].forEach((ev) => host.addEventListener(ev, () => setTimeout(draw, 0)));
    }
  }
  const availEl = {
    id: "disponibilite",
    example: { systeme: L("Serveur ERP", "ERP server"), chaine: L("Prise de commande", "Order taking"), mtbf: "720", mttr: "6", montage: "serie", cible: "99.9" },
    title: L("Disponibilité (MTBF / MTTR)", "Availability (MTBF / MTTR)"),
    ref: L("ISO 22301 cl. 8.3 · ISO/IEC 27031 · ISO 27001 A.8.14", "ISO 22301 cl. 8.3 · ISO/IEC 27031 · ISO 27001 A.8.14"),
    desc: L("Une entrée par composant d’une chaîne de service. Disponibilité = MTBF ÷ (MTBF + MTTR) (ex. 720 h ÷ 726 h = 99,17 %). En série, tout doit marcher : on multiplie les disponibilités (3 × 99 % = 97,03 %, soit ~260 h d’arrêt par an) ; en parallèle, un seul suffit : 1 − produit des indisponibilités (2 × 99 % = 99,99 %, ~52 min). Repères : 99,99 % ≈ 52 min / an, 99,999 % ≈ 5 min 15.",
      "One entry per component of a service chain. Availability = MTBF ÷ (MTBF + MTTR) (e.g. 720 h ÷ 726 h = 99.17%). In series, everything must work: multiply availabilities (3 × 99% = 97.03%, ~260 h down per year); in parallel, one is enough: 1 − product of unavailabilities (2 × 99% = 99.99%, ~52 min). Benchmarks: 99.99% ≈ 52 min / year, 99.999% ≈ 5 min 15."),
    header: ["systeme", "chaine"],
    fields: [
      { id: "systeme", type: "text", required: true, label: L("Composant", "Component") },
      { id: "chaine", type: "text", hint: L("Même nom pour les composants d’une même chaîne (ex. « Prise de commande »)", "Same name for the components of one chain (e.g. \"Order taking\")"), label: L("Chaîne / service", "Chain / service") },
      { id: "assetId", linkTo: "asset", label: L("Actif", "Asset") },
      { id: "mtbf", type: "number", label: L("MTBF (heures entre pannes)", "MTBF (hours between failures)") },
      { id: "mttr", type: "number", label: L("MTTR (heures de réparation)", "MTTR (hours to repair)") },
      { id: "montage", type: "select", label: L("Montage dans la chaîne", "Arrangement in the chain"), options: [O("serie", "Série — tout doit marcher", "Series — all must work"), O("parallele", "Parallèle — redondé, un seul suffit", "Parallel — redundant, one is enough")] },
      { id: "cible", type: "number", label: L("Disponibilité visée (%)", "Target availability (%)") },
    ],
    render: renderAvailability,
  };

  // Dépendances techniques (note de cours « Recenser ses dépendances
  // techniques », téléphonie, multifonction, BYOD) -- revue annuelle.
  const depTechEl = {
    id: "dependances-tech",
    example: { type: "service-externe", element: L("Authentification fédérée (SSO)", "Federated authentication (SSO)"), question: L("Quel est le mode dégradé, et qui le déclenche ?", "What is the degraded mode, and who triggers it?") },
    title: L("Dépendances techniques", "Technical dependencies"),
    ref: L("ISO 22301 cl. 8.2.2 · 8.3 · ISO 27001 A.5.30", "ISO 22301 cl. 8.2.2 · 8.3 · ISO 27001 A.5.30"),
    desc: L("Exercice court, à refaire chaque année : la colonne « question de continuité » est celle qui manque dans la plupart des plans. Agent déployé partout (EDR, supervision, sauvegarde) : comment revenir en arrière si une mise à jour casse le parc ? Service externe critique (SSO, DNS, paiement, IA) : quel mode dégradé, qui le déclenche ? Fournisseur unique : que se passe-t-il pendant sa panne ? Compétence unique : qui d’autre sait faire, et l’a déjà fait en exercice ? Dépendance en cascade : le contrat oblige-t-il à déclarer la sous-traitance ? Téléphonie : renvoi d’appel chez l’opérateur, standard hébergé, softphone, ligne analogique — toutes fonctionnent à condition d’avoir été mises en place AVANT. Multifonction : souvent unique, porte la télécopie, a un disque interne et des services (FTP, SNMP…) ouverts ; mode dégradé = savoir où imprimer. BYOD : voir Directives › Politique BYOD.",
      "A short exercise to repeat yearly: the \"continuity question\" column is the one missing from most plans. Agent deployed everywhere (EDR, monitoring, backup): how to roll back if an update breaks the fleet? Critical external service (SSO, DNS, payment, AI): which degraded mode, who triggers it? Single supplier: what happens during its outage? Single skill: who else can do it, and has done it in an exercise? Cascading dependency: does the contract require disclosing subcontracting? Telephony: carrier-side call forwarding, hosted switchboard, softphone, analog line — all work provided they were set up BEFORE. Multifunction printer: often unique, carries fax, has an internal disk and open services (FTP, SNMP…); degraded mode = knowing where to print. BYOD: see Directives › BYOD policy."),
    header: ["element", "type"],
    fields: [
      { id: "type", type: "select", label: L("Type de dépendance", "Dependency type"), options: [
        O("agent", "Agent déployé partout", "Agent deployed everywhere"), O("service-externe", "Service externe critique", "Critical external service"),
        O("fournisseur-unique", "Fournisseur unique", "Single supplier"), O("competence-unique", "Compétence unique", "Single skill"),
        O("cascade", "Dépendance en cascade (sous-traitance)", "Cascading dependency (subcontracting)"), O("telephonie", "Téléphonie", "Telephony"),
        O("multifonction", "Multifonction / imprimante / télécopie", "Multifunction / printer / fax"), O("byod", "Appareils personnels (BYOD)", "Personal devices (BYOD)"), O("autre", "Autre", "Other"),
      ] },
      { id: "element", type: "text", required: true, label: L("Élément", "Item") },
      { id: "assetId", linkTo: "asset", label: L("Actif", "Asset") },
      { id: "supplierId", linkTo: "supplier", label: L("Fournisseur", "Supplier") },
      { id: "question", type: "textarea", label: L("Question de continuité", "Continuity question") },
      { id: "modeDegrade", type: "text", suggest: "continuiteTech", label: L("Mode dégradé / option de secours", "Degraded mode / fallback option") },
      { id: "declencheur", linkTo: "role", label: L("Qui le déclenche", "Who triggers it") },
      { id: "teste", type: "select", label: L("Testé en exercice", "Tested in an exercise"), options: [O("non", "Non", "No"), O("oui", "Oui", "Yes")] },
    ],
  };

  // Outils physiques du dispositif de crise + trousse de crise (note de cours).
  const crisisToolsEl = {
    id: "outils-crise",
    example: { outil: "cartelette", contenu: L("Numéro du SPOC et de la cellule, 3 premiers réflexes du rôle, pont téléphonique de repli", "SPOC and cell numbers, the role's first 3 reflexes, fallback conference bridge"), emplacement: L("Portefeuille de chaque membre de la CCD", "Wallet of each crisis-cell member"), frequence: L("Trimestrielle", "Quarterly") },
    title: L("Outils de crise (trousse, cartelette, annuaire)", "Crisis tools (kit, card, directory)"),
    ref: L("ISO 22301 cl. 8.4.2 · 8.4.3 · ISO 22320", "ISO 22301 cl. 8.4.2 · 8.4.3 · ISO 22320"),
    desc: L("Ce qui doit exister AVANT la panne, parce que ça ne se fabrique pas pendant. Cartelette de crise : carte format poche remise à chaque acteur (numéro du SPOC et de la cellule, trois premiers réflexes du rôle, pont téléphonique de repli) — fonctionne sans réseau ni électricité. Annuaire de crise : coordonnées de tous les acteurs et suppléants, fournisseurs critiques 24/7, autorités, assureur, régulateur — vérifié au moins chaque trimestre. Main courante : tenue par un rapporteur désigné (fiche PGC). Trousse de crise : sur papier (liste d’appel, plan court, contacts fournisseurs et assureurs, bons de commande, plan de câblage), sur support hors ligne (configurations réseau, images de postes, médias et licences, mots de passe de dernier recours sous enveloppe scellée, site web statique de repli), matériel (postes vierges, routeur cellulaire avec SIM active, câbles, chargeurs, multiprise). La trousse ne vit pas dans la salle serveurs : elle vit ailleurs, et quelqu’un est nommé pour la tenir à jour — une trousse jamais ouverte donne une fausse assurance.",
      "What must exist BEFORE the outage, because it can't be built during it. Crisis card: pocket card given to each actor (SPOC and cell numbers, the role's first three reflexes, fallback conference bridge) — works without network or power. Crisis directory: contact details of all actors and deputies, 24/7 critical suppliers, authorities, insurer, regulator — checked at least quarterly. Crisis log: kept by a designated recorder (PGC sheet). Crisis kit: on paper (call list, short plan, supplier and insurer contacts, blank purchase orders, cabling plan), on offline media (network configurations, workstation images, installation media and licences, last-resort passwords in a sealed envelope, static fallback website), hardware (blank workstations, cellular router with active SIM, cables, chargers, power strip). The kit does not live in the server room: it lives elsewhere, and someone is named to keep it current — a kit never opened gives false assurance."),
    header: ["outil", "emplacement"],
    fields: [
      { id: "outil", type: "select", label: L("Outil", "Tool"), options: [
        O("cartelette", "Cartelette de crise", "Crisis card"), O("annuaire", "Annuaire de crise", "Crisis directory"),
        O("trousse-papier", "Trousse — sur papier", "Kit — on paper"), O("trousse-hors-ligne", "Trousse — support hors ligne", "Kit — offline media"),
        O("trousse-materiel", "Trousse — matériel", "Kit — hardware"), O("autre", "Autre", "Other"),
      ] },
      { id: "contenu", type: "textarea", required: true, label: L("Contenu", "Contents") },
      { id: "emplacement", type: "text", hint: L("Hors de la salle serveurs", "Outside the server room"), label: L("Emplacement", "Location") },
      { id: "responsable", linkTo: "role", label: L("Responsable de la mise à jour", "Owner of updates") },
      { id: "frequence", type: "text", suggest: "frequence", label: L("Fréquence de vérification", "Check frequency") },
      { id: "verifie", type: "date", label: L("Dernière vérification", "Last check") },
    ],
  };
  const dur = (m) => (typeof contFmtDuration === "function" ? contFmtDuration(m) : (m == null ? "" : String(m)));
  // Registres vivants de la page (spec/grc-bia-register/) intégrés comme
  // onglets de la fiche : `block` déplace la section existante dans l'élément
  // (comme Conformité / Actifs). Ordre = démarche de la note de cours :
  // BIA → risques → ressources → stratégies → plans → tests → amélioration.
  const biaEl = {
    id: "bia",
    essential: true,
    kind: "register",
    title: L("BIA", "BIA"),
    ref: L("ISO 22301 cl. 8.2.2", "ISO 22301 cl. 8.2.2"),
    desc: L("Bilan d'impact par processus : impacts dans le temps (financier, opérationnel, réputation, réglementaire, humain), DMIA / MAO / RTO / RPO / MBCO justifiés, dépendances métier et SPOF.",
      "Business impact analysis by process: impacts over time (financial, operational, reputation, regulatory, human), justified MTPD / MAO / RTO / RPO / MBCO, business dependencies and SPOFs."),
    block: "#bia",
    count: () => bias().length,
    reinit: () => {
      if (typeof initGrcBiaRegistry === "function") initGrcBiaRegistry();
      if (typeof grcContRenderSectionChecklist === "function") grcContRenderSectionChecklist(document.getElementById("grcContBiaChecklist"), "bia");
    },
    table: () => ({
      columns: [L("Processus", "Process"), L("Criticité", "Criticality"), L("DMIA", "MTPD"), L("RTO", "RTO"), L("RPO", "RPO"), L("SPOF", "SPOF")],
      rows: bias().map((p) => {
        const b = p.bia || {};
        return [p.label || "", p.criticality || "", dur(b.mtdMin), dur(b.rtoMin), dur(b.rpoMin),
          String(typeof grcBiaSpofCount === "function" ? grcBiaSpofCount(p) : "")];
      }),
    }),
  };
  const planEl = {
    id: "faire-plan",
    essential: true,
    kind: "register",
    title: L("Faire un plan", "Create a plan"),
    ref: L("ISO 22301 cl. 8.4", "ISO 22301 cl. 8.4"),
    desc: L("Registre des plans (PUI, PCA, PGC, PCO, PSI, PCC, PRII, PRI/DRP, PRA…) : un plan par entrée, avec son type, sa fiche et sa checklist.",
      "Plan register (internal emergency, BCP, crisis, operations, IT continuity, crisis comms, incident response, IT recovery/DRP, business recovery…): one plan per entry, with its type, its sheet and its checklist."),
    block: "#faire-plan",
    count: () => plans().length,
    reinit: () => { if (typeof initGrcContinuityRegistry === "function") initGrcContinuityRegistry(); },
  };
  const testsEl = {
    id: "tests",
    essential: true,
    kind: "register",
    title: L("Tests & exercices", "Tests & exercises"),
    ref: L("ISO 22301 cl. 8.5 · ISO 22398", "ISO 22301 cl. 8.5 · ISO 22398"),
    desc: L("Programme d'exercices (planifiés) et rapports d'exercice (réalisés : type, plan testé, scénario, participants, RTO observé, résultat, écarts, actions ouvertes dans le registre d'amélioration) ; puis le contenu attendu du programme.",
      "Exercise programme (planned) and exercise reports (done: type, plan tested, scenario, participants, observed RTO, result, gaps, actions opened in the improvement register); then the expected programme content."),
    block: "#tests",
    count: () => grcFicheEntries("continuite-tests-exercices", "programme").length + grcFicheEntries("continuite-tests-exercices", "rapports").length,
    reinit: () => {
      const f = document.getElementById("grcContTestsFiche");
      if (f && typeof grcFichesRenderEmbedded === "function") grcFichesRenderEmbedded(f, "continuite-tests-exercices");
      if (typeof grcContRenderSectionChecklist === "function") grcContRenderSectionChecklist(document.getElementById("grcContTestsChecklist"), "tests-exercices");
    },
  };
  const processRef = () => grcFicheRefFrom(grcFicheEntries("contexte-organisationnel", "cartographie-processus"), (p) => p.nom);

  grcFicheRegister("continuite", {
    docTitle: L("Continuité des activités", "Business continuity"),
    docRef: "ISO 22301:2019 · ISO 22313 · ISO 22316 (résilience) · ISO/IEC 27031 · ISO 31000 · ISO/IEC 27001:2022 A.5.29 – A.5.30",
    elements: [
      biaEl,
      {
        id: "analyse-risques-pca",
        example: { scenario: L("Panne prolongée du centre de données", "Extended data centre outage"), probabilite: "faible", impact: "eleve" },
        title: L("Analyse de risques PCA", "BCP risk assessment"),
        ref: L("ISO 22301 cl. 8.2.3 · ISO 31000", "ISO 22301 cl. 8.2.3 · ISO 31000"),
        desc: L("Les scénarios de sinistre qui pourraient interrompre les activités couvertes par le PCA. Une entrée par scénario. Exemple : panne prolongée du fournisseur infonuagique — probabilité moyenne, impact élevé, processus touchés : facturation et paie.",
          "The disruption scenarios that could stop the activities covered by the BCP. One entry per scenario. Example: prolonged cloud provider outage — medium likelihood, high impact, processes hit: billing and payroll."),
        header: ["scenario", "impact"],
        fields: [
          { id: "scenario", type: "text", required: true, label: L("Scénario de sinistre", "Disruption scenario") },
          { id: "categorie", type: "select", label: L("Catégorie", "Category"), options: [
            // Types de menaces (note de cours, cas PRA) ; valeurs existantes conservées.
            O("cyber", "Compromission d’informations (cyberattaque, déni de service, virus)", "Information compromise (cyberattack, denial of service, virus)"),
            O("panne", "Défaillance technique du SI (panne, saturation, blocage)", "IT component failure (outage, saturation, lock-up)"),
            O("site", "Dommage physique (incendie, dégât des eaux, destruction de matériel)", "Physical damage (fire, water damage, equipment destruction)"),
            O("naturelle", "Catastrophe naturelle (climat, séisme, inondation)", "Natural disaster (weather, earthquake, flood)"),
            O("services-essentiels", "Perte de services essentiels (électricité, climatisation, eau, télécoms)", "Loss of essential services (power, cooling, water, telecoms)"),
            O("actions-non-autorisees", "Actions non autorisées (destruction ou altération de données)", "Unauthorized actions (data destruction or alteration)"),
            O("personnel", "Indisponibilité de personnel", "Staff unavailability"), O("fournisseur", "Défaillance fournisseur", "Supplier failure"), O("autre", "Autre", "Other"),
          ] },
          { id: "probabilite", type: "select", label: L("Probabilité", "Likelihood"), options: [
            O("faible", "Faible", "Low"), O("moyenne", "Moyenne", "Medium"), O("elevee", "Élevée", "High"),
          ] },
          { id: "impact", type: "select", label: L("Impact", "Impact"), options: [
            O("faible", "Faible", "Low"), O("moyen", "Moyen", "Medium"), O("eleve", "Élevé", "High"),
          ] },
          // Lien réel vers la cartographie des processus (2026-10-08) ; l'ancien
          // texte libre reste dans « processus » (relabellisé « Précisions »).
          { id: "processusIds", linkTo: "processus", multi: true, label: L("Processus touchés", "Processes affected") },
          { id: "processus", type: "textarea", hint: L("Précisions sur l’arrêt des processus (facultatif)", "Details on how the processes stop (optional)"), label: L("Précisions", "Details") },
        ],
      },
      {
        id: "ressources-critiques",
        example: { ressource: L("2 commis à la paie formés", "2 trained payroll clerks"), minimum: L("1 personne", "1 person") },
        title: L("Ressources critiques", "Critical resources"),
        ref: L("ISO 22301 cl. 8.3.2", "ISO 22301 cl. 8.3.2"),
        desc: L("Ce qu’il faut au minimum pour faire tourner les processus critiques : personnes, infrastructures, SI, ressources intellectuelles, fournisseurs. Une entrée par ressource, avec son suppléant. Relie-la à l’actif, au fournisseur ou au rôle existant plutôt que de la ressaisir ; les besoins dans le temps d’un processus précis se notent dans son BIA. Exemple : humaines — 2 commis comptables formés à la paie ; suppléance : firme externe sous contrat.",
          "What is needed at minimum to run critical processes: people, infrastructure, IT, intellectual resources, suppliers. One entry per resource, with its fallback. Link it to the existing asset, supplier or role rather than re-typing it; a given process's needs over time go in its BIA. Example: people — 2 bookkeepers trained on payroll; fallback: external firm under contract."),
        header: ["ressource", "categorie"],
        fields: [
          { id: "categorie", type: "select", label: L("Catégorie", "Category"), options: [
            O("humaines", "Humaines", "Human"), O("infrastructures", "Infrastructures", "Infrastructure"), O("si", "Systèmes d’information", "Information systems"),
            O("intellectuelles", "Ressources intellectuelles", "Intellectual resources"), O("fournisseurs", "Fournisseurs externes", "External suppliers"),
          ] },
          { id: "ressource", type: "text", required: true, label: L("Ressource", "Resource") },
          { id: "processus", type: "ref", linkTo: "processus", label: L("Processus soutenu", "Process supported"), source: processRef },
          // Liens vers la ressource réelle (pas de ressaisie de l'inventaire) :
          // actif (Actifs), fournisseur (Fournisseurs) ou rôle (Gouvernance).
          { id: "assetId", linkTo: "asset", label: L("Actif concerné", "Related asset") },
          { id: "supplierId", linkTo: "supplier", label: L("Fournisseur concerné", "Related supplier") },
          { id: "roleId", linkTo: "role", label: L("Rôle concerné", "Related role") },
          { id: "minimum", type: "text", label: L("Minimum requis", "Minimum required") },
          { id: "suppleance", type: "textarea", hint: L("Comment faire sans cette ressource (remplaçant, solution de repli)", "How to cope without this resource (substitute, fallback)"), label: L("Suppléance / solution de repli", "Fallback") },
        ],
        links: [{ href: "contexte-organisationnel.html#fiche-cartographie-processus", label: L("Cartographie des processus", "Process map") }],
      },
      {
        id: "strategies",
        example: { strategie: L("Bascule vers le site de relève infonuagique", "Failover to the cloud recovery site"), cout: L("12 000 $ / an", "$12,000 / year"), delai: L("4 h", "4 h") },
        title: L("Stratégies de continuité", "Continuity strategies"),
        ref: L("ISO 22301 cl. 8.3 · ISO 27001 A.8.14", "ISO 22301 cl. 8.3 · ISO 27001 A.8.14"),
        desc: L("Comment l’organisation continuera malgré le sinistre. Une entrée par stratégie, avec son coût complet et son délai. Repères : plus de 24 h → sauvegarde hors site, BaaS, site froid ($) ; 4 à 24 h → site tiède, infogérance, veille infonuagique ($$) ; 1 à 4 h → DRaaS, site chaud mutualisé ($$$) ; moins d’une heure → actif-actif multi-site, grappes étendues ($$$$). Construire en interne : maîtrise complète, mais compétence à maintenir, coût réel découvert à l’usage, aucun engagement opposable. Acheter un service : RTO contractuel, tests souvent inclus, coût prévisible, mais dépendance au fournisseur, réversibilité à prévoir, capacité partagée en cas de sinistre régional. Le but n’est pas de tout protéger à n’importe quel prix : comparer au coût de l’arrêt (ROSI dans Traitement des risques).",
          "How the organization will keep going despite the disruption. One entry per strategy, with its full cost and lead time. Benchmarks: over 24 h → off-site backup, BaaS, cold site ($); 4 to 24 h → warm site, managed services, cloud standby ($$); 1 to 4 h → DRaaS, shared hot site ($$$); under an hour → multi-site active-active, stretched clusters ($$$$). Build in-house: full control, but skills to maintain, real cost discovered over time, no enforceable commitment. Buy a service: contractual RTO, tests often included, predictable cost, but supplier dependency, reversibility to plan, capacity shared in a regional disaster. The aim is not to protect everything at any price: compare with the cost of downtime (ROSI in Risk treatment)."),
        header: ["strategie", "type"],
        fields: [
          { id: "strategie", type: "text", required: true, suggest: "strategie", label: L("Stratégie", "Strategy") },
          { id: "type", type: "select", label: L("Type", "Type"), options: [
            O("redondance", "Redondance", "Redundancy"), O("repli", "Site de repli", "Recovery site"),
            O("site-chaud", "Site de relève chaud", "Hot site"), O("site-tiede", "Site de relève tiède", "Warm site"), O("site-froid", "Site de relève froid", "Cold site"),
            O("actif-actif", "Actif-actif (multi-site)", "Active-active (multi-site)"), O("actif-passif", "Actif-passif (bascule)", "Active-passive (failover)"),
            O("replication-sync", "Réplication synchrone (RPO ≈ 0)", "Synchronous replication (RPO ≈ 0)"), O("replication-async", "Réplication asynchrone", "Asynchronous replication"),
            O("teletravail", "Télétravail d’urgence", "Emergency remote work"), O("contournement", "Contournement manuel", "Manual workaround"),
            O("externalisation", "Externalisation", "Outsourcing"), O("stock", "Stock / réserve", "Stock / reserve"), O("autre", "Autre", "Other"),
          ] },
          { id: "processusIds", linkTo: "processus", multi: true, label: L("Processus couverts", "Processes covered") },
          { id: "processus", type: "textarea", hint: L("Précisions sur la couverture (facultatif)", "Details on the coverage (optional)"), label: L("Précisions", "Details") },
          // Construire ou acheter + coût complet d'une solution de secours
          // (note de cours) ; « cout » reste le coût global déjà saisi.
          { id: "approche", type: "select", label: L("Construire ou acheter", "Build or buy"), options: [
            O("interne", "Construire en interne", "Build in-house"), O("service", "Acheter un service (DRaaS, BaaS, infogérance…)", "Buy a service (DRaaS, BaaS, managed…)"), O("mixte", "Mixte", "Mixed")] },
          { id: "cout", type: "text", label: L("Coût global", "Overall cost") },
          { id: "coutAcquisition", type: "text", label: L("Acquisition (entrée, licences, matériel)", "Acquisition (entry, licences, hardware)") },
          { id: "coutExploitation", type: "text", label: L("Exploitation récurrente (abonnement, énergie, maintenance)", "Recurring operation (subscription, power, maintenance)") },
          { id: "coutAutres", type: "textarea", hint: L("Compétence (temps d’équipe), tests (exercices de bascule), maintien en condition, sortie (frais de transfert, réversibilité)", "Skills (team time), tests (failover exercises), upkeep, exit (transfer fees, reversibility)"), label: L("Compétence, tests, maintien, sortie", "Skills, tests, upkeep, exit") },
          { id: "rtoGaranti", type: "text", hint: L("Service acheté : RTO garanti au contrat (opposable). Interne : aucun engagement opposable", "Bought service: contractual (enforceable) RTO. In-house: no enforceable commitment"), label: L("RTO garanti", "Guaranteed RTO") },
          { id: "delai", type: "text", suggest: "delai", label: L("Délai de mise en œuvre", "Time to implement") },
        ],
      },
      {
        // Sauvegardes (note de cours : règle 3-2-1, complète / différentielle /
        // incrémentale, réplication) -- une entrée par jeu de données protégé.
        id: "sauvegardes",
        example: { donnees: L("Base de données de la paie", "Payroll database"), type: "incrementale", frequence: L("Quotidienne + complète le dimanche", "Daily + full on Sunday"), copies: "3", supports: "2", horsSite: "oui", immuable: "oui" },
        title: L("Sauvegardes (3-2-1)", "Backups (3-2-1)"),
        ref: L("ISO 27001 A.8.13 · ISO 22301 cl. 8.3 · ISO/IEC 27031 · CIS 11", "ISO 27001 A.8.13 · ISO 22301 cl. 8.3 · ISO/IEC 27031 · CIS 11"),
        desc: L("Une entrée par jeu de données sauvegardé. Règle 3-2-1 : 3 copies (l’original + 2), sur 2 types de supports différents, dont 1 hors site (autre bâtiment, plus de 10 km, ou nuage). Complète = tout ; différentielle = tout ce qui a changé depuis la dernière complète (restauration : complète + dernière différentielle) ; incrémentale = ce qui a changé depuis la dernière sauvegarde (restauration : complète + toutes les incrémentales). Le RPO atteint dépend de la fréquence ; une sauvegarde jamais restaurée n’est pas une sauvegarde.",
          "One entry per backed-up data set. 3-2-1 rule: 3 copies (the original + 2), on 2 different media types, 1 of them off-site (another building, over 10 km, or cloud). Full = everything; differential = all changes since the last full (restore: full + latest differential); incremental = changes since the last backup (restore: full + every incremental). The achieved RPO depends on frequency; a backup never restored is not a backup."),
        header: ["donnees", "type"],
        fields: [
          { id: "donnees", type: "text", required: true, label: L("Données / système", "Data / system") },
          { id: "processusIds", linkTo: "processus", multi: true, label: L("Processus soutenus", "Processes supported") },
          { id: "type", type: "select", label: L("Type", "Type"), options: [O("complete", "Complète", "Full"), O("differentielle", "Différentielle", "Differential"), O("incrementale", "Incrémentale", "Incremental"), O("replication-sync", "Réplication synchrone", "Synchronous replication"), O("replication-async", "Réplication asynchrone", "Asynchronous replication"), O("snapshot", "Instantané (snapshot)", "Snapshot")] },
          { id: "frequence", type: "text", suggest: "frequence", label: L("Fréquence", "Frequency") },
          { id: "copies", type: "select", label: L("Nombre de copies (original compris)", "Number of copies (original included)"), options: [O("1", "1", "1"), O("2", "2", "2"), O("3", "3 (règle 3-2-1)", "3 (3-2-1 rule)"), O("4", "4 ou plus", "4 or more")] },
          { id: "supports", type: "select", label: L("Types de supports différents", "Different media types"), options: [O("1", "1", "1"), O("2", "2 (règle 3-2-1)", "2 (3-2-1 rule)"), O("3", "3 ou plus", "3 or more")] },
          { id: "horsSite", type: "select", label: L("Copie hors site", "Off-site copy"), options: [O("non", "Non", "No"), O("oui", "Oui", "Yes")] },
          { id: "immuable", type: "select", label: L("Copie immuable ou hors ligne", "Immutable or offline copy"), options: [O("non", "Non", "No"), O("oui", "Oui", "Yes")] },
          { id: "dernierTest", type: "date", label: L("Dernier test de restauration", "Last restore test") },
          { id: "rpo", type: "text", hint: L("Perte de données maximale réellement atteinte (ex. 24 h)", "Maximum data loss actually achieved (e.g. 24 h)"), label: L("RPO atteint", "Achieved RPO") },
        ],
      },
      availEl,
      depTechEl,
      planEl,
      testsEl,
      crisisToolsEl,
      {
        id: "formation",
        example: { public: L("Cellule de crise", "Crisis cell"), contenu: L("Rôles et arbre d’appel", "Roles and call tree") },
        title: L("Formation et sensibilisation", "Training and awareness"),
        ref: L("ISO 22301 cl. 7.2 · 7.3", "ISO 22301 cl. 7.2 · 7.3"),
        desc: L("Qui a été formé à quoi et quand : membres de la CCD, porte-parole, équipes du PRA, personnel. Une entrée par session.",
          "Who was trained on what and when: crisis cell members, spokespersons, recovery teams, staff. One entry per session."),
        header: ["contenu", "date"],
        fields: [
          { id: "public", type: "text", suggest: "public", label: L("Public", "Audience") },
          { id: "contenu", type: "text", required: true, label: L("Contenu", "Content") },
          { id: "date", type: "text", label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
          { id: "participants", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Participants", "Participants") },
        ],
      },
      Object.assign({
        id: "amelioration",
        title: L("Amélioration continue", "Continual improvement"),
        ref: L("ISO 22301 cl. 10", "ISO 22301 cl. 10"),
        desc: L("Vue des actions d’amélioration issues de la continuité (exercices, tests, incidents réels) dans le registre unique d’amélioration de Gouvernance. Les actions saisies ici auparavant y ont été reprises, sans perte.",
          "View of improvement actions arising from continuity (exercises, tests, real incidents) in the single improvement register in Governance. Actions previously entered here were carried over, without loss."),
      }, grcFicheImprovementView(["continuite"])),
      {
        // Vue lecture seule (le registre vivant est dans l'onglet « Faire un
        // plan » de la page, spec/grc-bia-register/ BP1) : plus de `block`
        // (ne déplace plus #grcContinuityRegistry) ni de `reinit`.
        id: "registre",
        essential: true,
        kind: "view",
        title: L("Plans de continuité (synthèse)", "Continuity plans (overview)"),
        ref: L("ISO 22301 cl. 8.2.2 – 8.5", "ISO 22301 cl. 8.2.2 – 8.5"),
        desc: L("Vue des plans saisis dans l'onglet « Faire un plan » : BIA (DMIA, MAO, RTO, RPO, MBCO), dépendances et SPOF, redondance, procédure de reprise, tests, SPOC et CCD.",
          "Overview of the plans captured in the \"Create a plan\" tab: BIA (MTPD, MAO, RTO, RPO, MBCO), dependencies and SPOFs, redundancy, recovery procedure, tests, SPOC and crisis cell."),
        manage: "faire-plan",
        count: () => plans().length,
        table: () => ({
          columns: [L("Service", "Service"), L("Criticité", "Criticality"), L("DMIA", "MTPD"), L("RTO", "RTO"), L("RPO", "RPO"), L("SPOF", "SPOF")],
          rows: plans().map((p) => {
            const b = p.bia || {};
            const d = (m) => (typeof contFmtDuration === "function" ? contFmtDuration(m) : (m == null ? "" : String(m)));
            return [p.service || "", p.criticality || "", d(b.mtdMin), d(b.rtoMin), d(b.rpoMin),
              String(typeof grcContSpofCount === "function" ? grcContSpofCount(p) : "")];
          }),
        }),
      },
    ],
  });
})();
