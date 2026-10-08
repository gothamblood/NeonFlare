/* Documentation — Analyse des risques (grc/analyse-risques.html) · ISO 27005.
   Quatrième étape : à partir du contexte et des actifs, on identifie,
   analyse et évalue les risques. Le registre des risques existant est
   réutilisé (onglet « Registre ») ; matrice et cartographie en sont des
   vues. Moteur : grc-fiches.js ; plan : spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });
  const LEVELS = ["1", "2", "3", "4", "5"].map((n) => O(n, n, n));

  const score = (r) => (typeof grcRiskCriticality === "function" ? grcRiskCriticality(r) : (r.probability || 1) * (r.impact || 1));
  const band = (sc) => (typeof grcRiskCriticalityLabel === "function" ? grcRiskCriticalityLabel(sc).text : String(sc));
  const ale = (r) => {
    if (typeof grcRiskQuant !== "function") return "";
    const q = grcRiskQuant(r);
    return q.ale == null ? "" : grkFormatMoney(q.ale, q.currency);
  };

  // Matrice P (lignes 5 -> 1) × I (colonnes 1 -> 5) : nombre de risques par case.
  function matrixTable() {
    const counts = {};
    grcFicheSrc.risks().forEach((r) => {
      const k = (r.probability || 1) + "-" + (r.impact || 1);
      counts[k] = (counts[k] || 0) + 1;
    });
    const rows = [];
    for (let p = 5; p >= 1; p--) {
      const row = ["P" + p];
      for (let i = 1; i <= 5; i++) {
        const n = counts[p + "-" + i] || 0;
        row.push(n ? n + " · " + band(p * i) : "·");
      }
      rows.push(row);
    }
    return { columns: ["P \\ I", "I1", "I2", "I3", "I4", "I5"], rows: rows };
  }

  grcFicheRegister("analyse-risques", {
    docTitle: L("Appréciation des risques", "Risk assessment"),
    docRef: "ISO/IEC 27001:2022 clause 6.1.2 · ISO/IEC 27005:2022",
    elements: [
      {
        id: "methodologie",
        example: { description: L("Méthode inspirée d’ISO 27005 : identification par actif, cotation P × I sur 5 niveaux, traitement au-delà du critère d’acceptation", "ISO 27005-based method: identification per asset, P × I rating on 5 levels, treatment above the acceptance criterion"), approuvePar: L("Comité de direction", "Executive committee") },
        essential: true,
        title: L("Méthodologie ISO 27005", "ISO 27005 methodology"),
        ref: L("ISO 27001 cl. 6.1.2 · ISO 27005", "ISO 27001 cl. 6.1.2 · ISO 27005"),
        desc: L("Comment l’organisation apprécie ses risques : approche, échelles, fréquence, outils. Une entrée par aspect. Exemple : échelle de probabilité — 1 « rare (moins d’une fois en 10 ans) » à 5 « quasi certain (plusieurs fois par an) ».",
          "How the organization assesses its risks: approach, scales, frequency, tools. One entry per aspect. Example: probability scale — 1 \"rare (less than once in 10 years)\" to 5 \"almost certain (several times a year)\"."),
        header: ["description", "aspect"],
        fields: [
          { id: "aspect", type: "select", label: L("Aspect", "Aspect"), options: [
            O("approche", "Approche", "Approach"), O("echelleP", "Échelle de probabilité", "Probability scale"),
            O("echelleI", "Échelle d’impact", "Impact scale"), O("quantitatif", "Volet quantitatif (SLE / ARO / ALE)", "Quantitative view (SLE / ARO / ALE)"),
            O("frequence", "Fréquence de l’appréciation", "Assessment frequency"), O("outils", "Outils", "Tools"),
          ] },
          { id: "description", type: "textarea", required: true, label: L("Description", "Description") },
          { id: "approuvePar", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Approuvé par", "Approved by") },
          { id: "date", type: "text", label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
        ],
      },
      {
        id: "contexte",
        example: { perimetre: L("Services de paie et de comptabilité, siège et infonuagique", "Payroll and accounting services, head office and cloud"), participants: L("RSSI, directrice des opérations, TI", "CISO, operations director, IT") },
        essential: true,
        // Renommé (2026-10-08) : contexte DE L'APPRÉCIATION (ISO 27005 cl. 6),
        // à ne pas confondre avec le Contexte organisationnel (ISO 27001 cl. 4).
        title: L("Contexte de l’appréciation", "Assessment context"),
        ref: L("ISO 27005 cl. 6 · ISO 27001 cl. 6.1.2 a)", "ISO 27005 cl. 6 · ISO 27001 cl. 6.1.2 a)"),
        desc: L("Établissement du contexte ISO 27005 pour CHAQUE appréciation : son périmètre (relié aux éléments de la portée du SGSI), les critères d’impact et de vraisemblance utilisés, les participants. Le contexte de l’organisation se documente dans Contexte organisationnel ; les niveaux 1 à 5 dans « Échelles de cotation » ; les critères d’acceptation dans Gouvernance.",
          "ISO 27005 context establishment for EACH assessment: its scope (linked to the ISMS scope items), the impact and likelihood criteria used, the participants. The organization's context is documented in Organizational context; levels 1 to 5 in \"Rating scales\"; acceptance criteria in Governance."),
        header: ["perimetre", "date"],
        fields: [
          { id: "perimetre", type: "textarea", required: true, label: L("Périmètre de l’appréciation", "Assessment scope") },
          { id: "porteeIds", linkTo: "portee", multi: true, label: L("Éléments de portée couverts", "Scope items covered") },
          { id: "criteresImpact", type: "textarea", hint: L("Ce qui rend un impact faible, moyen, élevé (argent, clients, loi…)", "What makes an impact low, medium, high (money, customers, law…)"), label: L("Critères d’impact", "Impact criteria") },
          { id: "criteresVraisemblance", type: "textarea", hint: L("Ce qui rend un scénario rare, possible, probable", "What makes a scenario rare, possible, likely"), label: L("Critères de vraisemblance", "Likelihood criteria") },
          { id: "participants", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Participants", "Participants") },
          { id: "date", type: "text", label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
        ],
        links: [{ href: "gouvernance.html#fiche-criteres-acceptation", label: L("Critères d’acceptation (Gouvernance)", "Acceptance criteria (Governance)") }],
      },
{
  id: "echelles",
  title: L("Échelles de cotation", "Rating scales"),
  ref: L("ISO 27005 §7.2 · ISO 27001 cl. 6.1.2", "ISO 27005 §7.2 · ISO 27001 cl. 6.1.2"),
  lead: L("Ce que veut dire chaque niveau (1 à 5) de vraisemblance et d’impact dans TON organisation.", "What each level (1 to 5) of likelihood and impact means in YOUR organization."),
  desc: L("Les niveaux 1 à 5 du registre restent les mêmes ; ici tu en écris la définition pour que tout le monde cote de la même façon. Une entrée par niveau et par échelle. Exemple : impact 4 — « Grave » — perte > 100 000 $ ou arrêt d’un service client > 1 jour.",
    "Register levels 1 to 5 stay the same; here you write their definition so everyone rates the same way. One entry per level and scale. Example: impact 4 — \"Severe\" — loss > $100,000 or customer service down > 1 day."),
  header: ["libelle", "echelle", "niveau"],
  fields: [
    { id: "echelle", type: "select", label: L("Échelle", "Scale"), options: [O("vraisemblance", "Vraisemblance", "Likelihood"), O("impact", "Impact", "Impact")] },
    { id: "niveau", type: "select", label: L("Niveau", "Level"), options: LEVELS },
    { id: "libelle", type: "text", required: true, label: L("Libellé", "Label") },
    { id: "definition", type: "textarea", label: L("Définition (seuils, exemples)", "Definition (thresholds, examples)") },
  ],
  example: { echelle: "impact", niveau: "4", libelle: L("Grave", "Severe"), definition: L("Perte > 100 000 $ ou arrêt d’un service client > 1 jour", "Loss > $100,000 or customer service down > 1 day") },
},
      {
        id: "identification",
        example: { atelier: L("Atelier risques 2027", "2027 risk workshop"), participants: L("RSSI, TI, opérations", "CISO, IT, operations"), resultats: L("12 risques identifiés, dont 3 élevés", "12 risks identified, 3 of them high") },
        title: L("Identification des risques", "Risk identification"),
        ref: L("ISO 27005 cl. 7.2", "ISO 27005 cl. 7.2"),
        desc: L("Les ateliers ou revues où les risques sont identifiés (actif, menace, vulnérabilité, événement redouté, conséquences). Chaque risque trouvé s’ajoute ensuite dans l’onglet « Registre des risques ». Exemple : atelier du 2026-03-10 avec TI et finances — sources : incidents passés, audit interne.",
          "The workshops or reviews where risks are identified (asset, threat, vulnerability, feared event, consequences). Each risk found is then added in the \"Risk register\" tab. Example: 2026-03-10 workshop with IT and finance — sources: past incidents, internal audit."),
        header: ["atelier", "date"],
        fields: [
          { id: "atelier", type: "text", required: true, label: L("Atelier ou revue", "Workshop or review") },
          { id: "date", type: "text", label: L("Date (AAAA-MM-JJ)", "Date (YYYY-MM-DD)") },
          { id: "participants", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Participants", "Participants") },
          { id: "sources", type: "textarea", hint: L("D’où viennent les risques identifiés (catalogue, audits, incidents…)", "Where the identified risks come from (catalogue, audits, incidents…)"), label: L("Sources (catalogue de menaces, audits, incidents…)", "Sources (threat catalogue, audits, incidents…)") },
          { id: "resultats", type: "textarea", label: L("Résultats (risques identifiés)", "Results (risks identified)") },
        ],
      },
{
  id: "sources-risque",
  title: L("Sources de risque", "Risk sources"),
  ref: L("ISO 27005 §7.3 · 8.2", "ISO 27005 §7.3 · 8.2"),
  lead: L("Qui ou quoi pourrait causer un risque : attaquants, erreurs humaines, pannes, événements naturels.", "Who or what could cause a risk: attackers, human error, failures, natural events."),
  desc: L("Décris chaque source, sa motivation et ses moyens, puis décide si tu la retiens pour l’analyse. Une source retenue devrait mener à au moins un scénario. Exemple : « Groupe de rançongiciel » — malveillante, gain financier, moyens élevés, retenue.",
    "Describe each source, its motivation and capabilities, then decide whether to retain it for the analysis. A retained source should lead to at least one scenario. Example: \"Ransomware group\" — malicious, financial gain, high capabilities, retained."),
  header: ["source", "type", "retenue"],
  fields: [
    { id: "source", type: "text", required: true, label: L("Source", "Source") },
    { id: "type", type: "select", label: L("Type", "Type"), options: [
      O("malveillante", "Humaine malveillante", "Malicious human"), O("accidentelle", "Humaine accidentelle", "Accidental human"),
      O("technique", "Technique (panne, défaut)", "Technical (failure, defect)"), O("environnementale", "Environnementale", "Environmental"),
    ] },
    { id: "motivation", type: "text", label: L("Motivation / objectif", "Motivation / goal") },
    { id: "moyens", type: "select", label: L("Moyens", "Capabilities"), options: [O("faibles", "Faibles", "Low"), O("moyens", "Moyens", "Medium"), O("eleves", "Élevés", "High")] },
    { id: "retenue", type: "select", label: L("Retenue pour l’analyse", "Retained for analysis"), options: [O("oui", "Oui", "Yes"), O("non", "Non", "No")] },
    { id: "justification", type: "textarea", hint: L("Pourquoi cette source est retenue ou écartée", "Why this source is kept or dismissed"), label: L("Justification", "Justification") },
  ],
  example: { source: L("Groupe de rançongiciel", "Ransomware group"), type: "malveillante", motivation: L("Gain financier", "Financial gain"), moyens: "eleves", retenue: "oui" },
},
{
  id: "scenarios",
  title: L("Scénarios de risque", "Risk scenarios"),
  ref: L("ISO 27005 §8.2 · 8.3", "ISO 27005 §8.2 · 8.3"),
  lead: L("Comment une source atteindrait un actif : le chemin d’attaque ou d’incident, du déclencheur à la conséquence.", "How a source would reach an asset: the attack or incident path, from trigger to consequence."),
  desc: L("Un scénario relie une source retenue à des actifs et décrit l’enchaînement. Il alimente ensuite un ou plusieurs risques du registre. Exemple : rançongiciel — hameçonnage d’un employé → chiffrement du serveur de fichiers → paie bloquée.",
    "A scenario links a retained source to assets and describes the chain of events. It then feeds one or more risks in the register. Example: ransomware — employee phishing → file server encrypted → payroll blocked."),
  header: ["objectif", "vraisemblance", "gravite"],
  fields: [
    { id: "objectif", type: "text", required: true, label: L("Scénario (en une phrase)", "Scenario (one sentence)") },
    { id: "source", linkTo: "sourceRisque", label: L("Source de risque", "Risk source") },
    { id: "actifs", linkTo: "asset", multi: true, label: L("Actifs visés", "Targeted assets") },
    { id: "chemin", type: "textarea", label: L("Chemin (étapes)", "Path (steps)") },
    { id: "vraisemblance", type: "select", label: L("Vraisemblance (1–5)", "Likelihood (1–5)"), options: LEVELS },
    { id: "gravite", type: "select", label: L("Gravité (1–5)", "Severity (1–5)"), options: LEVELS },
  ],
  example: { objectif: L("Chiffrement du serveur de fichiers par rançongiciel", "File server encrypted by ransomware"), chemin: L("Hameçonnage → poste compromis → serveur chiffré → paie bloquée", "Phishing → compromised workstation → server encrypted → payroll blocked"), vraisemblance: "3", gravite: "4" },
},
      {
        id: "analyse",
        kind: "view",
        title: L("Analyse des risques (P, I, niveau)", "Risk analysis (P, I, level)"),
        ref: L("ISO 27005 cl. 7.3", "ISO 27005 cl. 7.3"),
        desc: L("Matrice probabilité × impact : nombre de risques par case et niveau obtenu (P × I sur 25). Les cotes se saisissent dans le registre.",
          "Probability × impact matrix: number of risks per cell and resulting level (P × I out of 25). Ratings are entered in the register."),
        table: matrixTable,
        count: () => grcFicheSrc.risks().length,
        manage: "registre",
      },
      {
        id: "evaluation",
        essential: true,
        kind: "view",
        title: L("Évaluation des risques", "Risk evaluation"),
        ref: L("ISO 27005 cl. 7.4", "ISO 27005 cl. 7.4"),
        desc: L("Risques classés du plus élevé au plus faible, à comparer aux critères d’acceptation : ce qui dépasse doit être traité (page Traitement des risques).",
          "Risks ranked from highest to lowest, to compare with the acceptance criteria: whatever exceeds them must be treated (Risk treatment page)."),
        table: () => ({
          columns: [L("Risque", "Risk"), L("P × I", "P × I"), L("Niveau", "Level"), L("ALE", "ALE"), L("Propriétaire", "Owner"), L("Statut", "Status")],
          rows: grcFicheSrc.risks().slice().sort((a, b) => score(b) - score(a))
            .map((r) => [r.name || "", String(score(r)), band(score(r)), ale(r), r.owner || "",
              typeof grcRiskStatusLabel === "function" ? grcRiskStatusLabel(r.status) : (r.status || "")]),
          empty: L("Aucun risque dans le registre.", "No risk in the register."),
        }),
        manage: "registre",
        links: [{ href: "gouvernance.html#fiche-criteres-acceptation", label: L("Critères d’acceptation", "Acceptance criteria") }],
      },
      {
        id: "registre",
        essential: true,
        kind: "register",
        title: L("Registre des risques", "Risk register"),
        ref: L("ISO 27001 cl. 8.2 · NIST ID.RA", "ISO 27001 cl. 8.2 · NIST ID.RA"),
        desc: L("Un risque par entrée : actifs liés, menace, vulnérabilité, événement redouté, conséquences, P et I, volet quantitatif (AV, EF, ARO → SLE, ALE), propriétaire, statut, plan de traitement.",
          "One risk per entry: linked assets, threat, vulnerability, feared event, consequences, P and I, quantitative view (AV, EF, ARO → SLE, ALE), owner, status, treatment plan."),
        block: "#grcRiskRegistry",
        count: () => grcFicheSrc.risks().length,
        reinit: () => initGrcRiskRegistry(),
        table: () => ({
          columns: [L("Risque", "Risk"), L("Menace", "Threat"), L("Vulnérabilité", "Vulnerability"), L("Événement redouté", "Feared event"), L("P", "P"), L("I", "I"), L("ALE", "ALE")],
          rows: grcFicheSrc.risks().map((r) => [r.name || "", r.threat || "", r.vulnerability || "", r.evenementRedoute || "",
            String(r.probability || 1), String(r.impact || 1), ale(r)]),
        }),
      },
{
  id: "opportunites",
  title: L("Opportunités", "Opportunities"),
  ref: L("ISO 27001 cl. 6.1.1 · ISO 22301 cl. 6.1", "ISO 27001 cl. 6.1.1 · ISO 22301 cl. 6.1"),
  lead: L("Les effets POSITIFS à saisir : la norme demande de traiter les risques ET les opportunités.", "The POSITIVE effects to seize: the standard asks to address risks AND opportunities."),
  desc: L("Une entrée par opportunité, reliée au facteur du contexte qui la fait naître et à l’objectif qu’elle sert. Exemple : « Certification ISO 27001 exigée par de grands clients » — atout commercial, action : viser la certification en 18 mois.",
    "One entry per opportunity, linked to the context factor that creates it and to the objective it serves. Example: \"ISO 27001 certification required by large customers\" — commercial asset, action: aim for certification within 18 months."),
  header: ["opportunite", "statut"],
  fields: [
    { id: "opportunite", type: "text", required: true, label: L("Opportunité", "Opportunity") },
    { id: "source", linkTo: "facteurExt", label: L("Facteur externe à l’origine", "Originating external factor") },
    { id: "sourceInterne", linkTo: "facteurInt", label: L("Facteur interne à l’origine", "Originating internal factor") },
    { id: "objectif", linkTo: "objectif", label: L("Objectif servi", "Objective served") },
    { id: "benefice", type: "textarea", label: L("Bénéfice attendu", "Expected benefit") },
    { id: "action", type: "textarea", label: L("Action pour la saisir", "Action to seize it") },
    { id: "statut", type: "select", label: L("Statut", "Status"), options: [O("identifiee", "Identifiée", "Identified"), O("encours", "En cours", "In progress"), O("realisee", "Réalisée", "Realized"), O("abandonnee", "Abandonnée", "Dropped")] },
  ],
  example: { opportunite: L("Certification ISO 27001 exigée par de grands clients", "ISO 27001 certification required by large customers"), benefice: L("Accès à de nouveaux contrats", "Access to new contracts"), action: L("Viser la certification en 18 mois", "Aim for certification within 18 months"), statut: "identifiee" },
},
{
  id: "concertation",
  title: L("Communication et concertation", "Communication and consultation"),
  ref: L("ISO 27005 §6.6 · ISO 31000 §6.2", "ISO 27005 §6.6 · ISO 31000 §6.2"),
  lead: L("Qui a été consulté sur les risques, quand, et ce qui en est ressorti.", "Who was consulted on the risks, when, and what came out of it."),
  desc: L("Une entrée par échange avec une partie prenante (atelier, entrevue, présentation). Exemple : atelier avec la direction des opérations — validation des scénarios de rançongiciel.",
    "One entry per exchange with an interested party (workshop, interview, presentation). Example: workshop with operations management — validation of ransomware scenarios."),
  header: ["sujet", "date"],
  fields: [
    { id: "sujet", type: "text", required: true, label: L("Sujet", "Topic") },
    { id: "partie", linkTo: "pp", label: L("Partie prenante consultée", "Interested party consulted") },
    { id: "date", type: "date", label: L("Date", "Date") },
    { id: "retour", type: "textarea", label: L("Retour / décisions", "Feedback / decisions") },
    { id: "risques", linkTo: "risk", multi: true, label: L("Risques concernés", "Risks concerned") },
  ],
  example: { sujet: L("Validation des scénarios de rançongiciel", "Validation of ransomware scenarios"), retour: L("Scénario confirmé, impact jugé grave", "Scenario confirmed, impact rated severe") },
},
{
  id: "veille",
  title: L("Veille sur les menaces", "Threat intelligence"),
  ref: L("ISO 27002 5.7", "ISO 27002 5.7"),
  lead: L("Les informations sur les menaces que tu collectes, et ce qu’elles changent dans tes risques et contrôles.", "The threat information you collect, and what it changes in your risks and controls."),
  desc: L("Une entrée par information pertinente (bulletin, alerte, rapport). Relie-la aux risques à réévaluer et aux contrôles à ajuster. Exemple : alerte du Centre canadien pour la cybersécurité sur un rançongiciel visant les cabinets comptables.",
    "One entry per relevant piece of information (bulletin, alert, report). Link it to the risks to reassess and the controls to adjust. Example: Canadian Centre for Cyber Security alert on ransomware targeting accounting firms."),
  header: ["menace", "pertinence"],
  fields: [
    { id: "menace", type: "textarea", required: true, label: L("Menace ou information", "Threat or information") },
    { id: "sourceInfo", type: "text", suggest: "source-veille", label: L("Source de l’information", "Information source") },
    { id: "niveau", type: "select", label: L("Niveau", "Level"), options: [O("strategique", "Stratégique", "Strategic"), O("tactique", "Tactique", "Tactical"), O("operationnel", "Opérationnel", "Operational")] },
    { id: "date", type: "date", label: L("Date", "Date") },
    { id: "pertinence", type: "select", label: L("Pertinence", "Relevance"), options: [O("faible", "Faible", "Low"), O("moyenne", "Moyenne", "Medium"), O("elevee", "Élevée", "High")] },
    { id: "risques", linkTo: "risk", multi: true, label: L("Risques à réévaluer", "Risks to reassess") },
    { id: "controles", linkTo: "control", multi: true, label: L("Contrôles à ajuster", "Controls to adjust") },
  ],
  example: { menace: L("Campagne de rançongiciel visant les cabinets comptables", "Ransomware campaign targeting accounting firms"), sourceInfo: L("Centre canadien pour la cybersécurité", "Canadian Centre for Cyber Security"), niveau: "tactique", pertinence: "elevee" },
},
      {
        id: "cartographie",
        kind: "view",
        title: L("Cartographie des risques", "Risk map"),
        ref: L("NIST ID.RA · GV.OV", "NIST ID.RA · GV.OV"),
        desc: L("Vue d’ensemble pour la direction : répartition par niveau, dix principaux risques et perte annuelle attendue totale.",
          "Overview for management: breakdown by level, top ten risks and total expected annual loss."),
        table: () => {
          const risks = grcFicheSrc.risks().slice().sort((a, b) => score(b) - score(a));
          const by = {};
          risks.forEach((r) => { const b = band(score(r)); by[b] = (by[b] || 0) + 1; });
          const rows = Object.keys(by).map((b) => [grcFicheL(L("Niveau", "Level")) + " : " + b, String(by[b]), ""]);
          const total = typeof grcRisksAleTotal === "function" ? grcRisksAleTotal(risks) : null;
          if (total) rows.push([grcFicheL(L("ALE total", "Total ALE")), "", total]);
          risks.slice(0, 10).forEach((r, i) => rows.push([(i + 1) + ". " + (r.name || ""), band(score(r)), ale(r)]));
          return { columns: [L("Élément", "Item"), L("Niveau / nombre", "Level / count"), L("ALE", "ALE")], rows: risks.length ? rows : [],
            empty: L("Aucun risque dans le registre.", "No risk in the register.") };
        },
        count: () => grcFicheSrc.risks().length,
        manage: "registre",
      },
      {
        // Nœud papillon (note de cours) : l'événement redouté au centre ; à
        // gauche causes et prévention, à droite limitation et conséquences.
        id: "noeud-papillon",
        example: { evenement: L("Système de commande indisponible", "Order system unavailable"),
          causes: L("Rançongiciel\nPanne électrique\nErreur de changement\nPanne du fournisseur infonuagique\nRupture réseau", "Ransomware\nPower outage\nChange error\nCloud provider outage\nNetwork failure"),
          prevention: L("Segmentation\nRedondance électrique\nContrôle des changements\nSurveillance\nProtection des accès", "Segmentation\nPower redundancy\nChange control\nMonitoring\nAccess protection"),
          limitation: L("Mode manuel\nSite secondaire\nCommunication clients\nSauvegarde immuable\nProcédure de reprise", "Manual mode\nSecondary site\nCustomer communication\nImmutable backup\nRecovery procedure"),
          consequences: L("Arrêt des commandes\nPerte de revenus\nPlaintes clients\nAccumulation du travail\nAtteinte à la réputation", "Orders stopped\nLost revenue\nCustomer complaints\nWork backlog\nReputational damage") },
        title: L("Nœud papillon", "Bow-tie analysis"),
        ref: L("ISO 31010 · ISO 27005 §7", "ISO 31010 · ISO 27005 §7"),
        desc: L("Une entrée par événement redouté : au centre l’événement, à gauche ses causes et les mesures de prévention qui les bloquent, à droite les mesures de limitation et les conséquences qu’elles réduisent. Une ligne par cause, mesure ou conséquence. Relie les contrôles et les plans existants pour garder la chaîne.",
          "One entry per feared event: the event in the middle, its causes and the prevention measures that block them on the left, the limitation measures and the consequences they reduce on the right. One line per cause, measure or consequence. Link existing controls and plans to keep the chain."),
        header: ["evenement"],
        fields: [
          { id: "evenement", type: "text", required: true, label: L("Événement redouté (centre)", "Feared event (centre)") },
          { id: "riskId", linkTo: "risk", label: L("Risque du registre", "Register risk") },
          { id: "causes", type: "textarea", label: L("Causes (une par ligne)", "Causes (one per line)") },
          { id: "prevention", type: "textarea", label: L("Prévention (une par ligne)", "Prevention (one per line)") },
          { id: "controleIds", linkTo: "control", multi: true, label: L("Contrôles de prévention", "Prevention controls") },
          { id: "limitation", type: "textarea", label: L("Limitation (une par ligne)", "Limitation (one per line)") },
          { id: "planIds", linkTo: "continuity", multi: true, label: L("Plans de limitation", "Limitation plans") },
          { id: "consequences", type: "textarea", label: L("Conséquences (une par ligne)", "Consequences (one per line)") },
        ],
        render: (host) => {
          const draw = () => {
            let box = host.querySelector(".grc-bowtie-box");
            if (!box) { box = document.createElement("div"); box.className = "grc-bowtie-box"; host.insertBefore(box, host.firstChild); }
            box.innerHTML = "";
            const lines = (v) => String(v || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
            grcFicheEntries("analyse-risques", "noeud-papillon").forEach((e) => {
              const bt = document.createElement("div");
              bt.className = "grc-bowtie";
              const col = (cls, title, items) => {
                const c = document.createElement("div");
                c.className = "grc-bowtie-col " + cls;
                const h = document.createElement("div");
                h.className = "grc-bowtie-h";
                h.textContent = grcFicheL(title);
                c.appendChild(h);
                items.forEach((t) => { const d = document.createElement("div"); d.className = "grc-bowtie-item"; d.textContent = t; c.appendChild(d); });
                return c;
              };
              bt.appendChild(col("is-causes", L("Causes", "Causes"), lines(e.causes)));
              bt.appendChild(col("is-prev", L("Prévention", "Prevention"), lines(e.prevention)));
              const mid = document.createElement("div");
              mid.className = "grc-bowtie-event";
              mid.textContent = e.evenement || "";
              bt.appendChild(mid);
              bt.appendChild(col("is-limit", L("Limitation", "Limitation"), lines(e.limitation)));
              bt.appendChild(col("is-cons", L("Conséquences", "Consequences"), lines(e.consequences)));
              box.appendChild(bt);
            });
          };
          draw();
          if (!host.dataset.bowtieHook) {
            host.dataset.bowtieHook = "1";
            ["submit", "click"].forEach((ev) => host.addEventListener(ev, () => setTimeout(draw, 0)));
          }
        },
      },
    ],
  });
})();
