/* Documentation — Performance et indicateurs GRC (grc/indicateurs.html) ·
   ISO 27001 cl. 9.1. Quatorzième étape : mesurer et rendre compte. Le
   registre d'indicateurs existant est réutilisé ; KPI, KRI, indicateurs
   SGSI / PCA et tableau de bord en sont des vues ; rapports exécutifs et
   suivi des objectifs ont leurs fiches. Moteur : grc-fiches.js ; plan :
   spec/grc-fiches/plan.md. IDs STABLES. */

(function () {
  const O = (v, fr, en) => ({ v: v, label: { fr: fr, en: en } });
  const L = (fr, en) => ({ fr: fr, en: en });

  const metrics = () => grcFicheSrc.metrics();
  const RAG = { green: L("Vert", "Green"), amber: L("Ambre", "Amber"), red: L("Rouge", "Red"), unknown: L("—", "—") };
  const rag = (m) => grcFicheL(RAG[typeof grcMetricRag === "function" ? grcMetricRag(m) : "unknown"] || RAG.unknown);
  const latest = (m) => {
    const x = typeof grcMetricLatest === "function" ? grcMetricLatest(m) : null;
    return x && x.value != null ? String(x.value) + (m.unit ? " " + m.unit : "") : "—";
  };

  function metricView(id, fr, en, ref, descFr, descEn, filter, emptyFr, emptyEn) {
    return {
      id: id, kind: "view", title: L(fr, en), ref: L(ref, ref), desc: L(descFr, descEn),
      table: () => ({
        columns: [L("Indicateur", "Indicator"), L("Type", "Type"), L("Dernière mesure", "Latest value"), L("Cible", "Target"), L("État", "Status"), L("Propriétaire", "Owner")],
        rows: metrics().filter(filter).map((m) => [m.name || "", String(m.type || "").toUpperCase(), latest(m),
          m.target == null ? "" : String(m.target), rag(m), m.owner || ""]),
        empty: L(emptyFr, emptyEn),
      }),
      manage: "registre",
    };
  }

  grcFicheRegister("indicateurs", {
    docTitle: L("Surveillance, mesure et rapports GRC", "GRC monitoring, measurement and reporting"),
    docRef: "ISO/IEC 27001:2022 clause 9.1 · ISO 22301:2019 clause 9.1",
    elements: [
      metricView("kpi", "KPI", "KPIs", "ISO 27001 cl. 9.1 · NIST GV.OV",
        "Indicateurs de performance : est-ce que les mesures de sécurité fonctionnent ? Exemple : taux de correctifs critiques appliqués sous 14 jours.",
        "Performance indicators: are the security measures working? Example: rate of critical patches applied within 14 days.",
        (m) => m.type === "kpi", "Aucun KPI — ajoute-les dans « Registre d’indicateurs ».", "No KPI — add them in \"Metrics register\"."),
      metricView("kri", "KRI", "KRIs", "ISO 27001 cl. 9.1 · NIST GV.RM",
        "Indicateurs de risque : est-ce que l’exposition augmente ? Exemple : nombre de risques critiques ouverts, ALE total.",
        "Risk indicators: is exposure increasing? Example: number of open critical risks, total ALE.",
        (m) => m.type === "kri", "Aucun KRI.", "No KRI."),
      {
        id: "tableaux-bord",
        essential: true,
        kind: "view",
        title: L("Tableaux de bord", "Dashboards"),
        ref: L("NIST GV.OV", "NIST GV.OV"),
        desc: L("Synthèse de l’état de tous les indicateurs (vert / ambre / rouge) pour le comité GRC et la direction.",
          "Summary of every indicator’s status (green / amber / red) for the GRC committee and management."),
        table: () => {
          const list = metrics();
          const by = { green: 0, amber: 0, red: 0, unknown: 0 };
          list.forEach((m) => { const r = typeof grcMetricRag === "function" ? grcMetricRag(m) : "unknown"; by[r] = (by[r] || 0) + 1; });
          const rows = list.length ? ["red", "amber", "green", "unknown"].map((k) => [grcFicheL(RAG[k]), String(by[k] || 0),
            list.filter((m) => (typeof grcMetricRag === "function" ? grcMetricRag(m) : "unknown") === k).map((m) => m.name).join(", ")]) : [];
          return { columns: [L("État", "Status"), L("Nombre", "Count"), L("Indicateurs", "Indicators")], rows: rows,
            empty: L("Aucun indicateur.", "No indicator.") };
        },
        count: () => metrics().length,
        manage: "registre",
      },
      {
        id: "rapports-executifs",
        example: { periode: L("T1 2027", "Q1 2027"), destinataires: L("Comité de direction", "Executive committee"), faits: L("MFA à 92 %, 2 incidents mineurs", "MFA at 92%, 2 minor incidents") },
        title: L("Rapports exécutifs", "Executive reports"),
        ref: L("ISO 27001 cl. 9.3 · NIST GV.OV", "ISO 27001 cl. 9.3 · NIST GV.OV"),
        desc: L("Le rapport périodique à la direction : faits saillants, tendances, décisions demandées. Une entrée par rapport. Exemple : T2 2026 — 2 incidents majeurs, revue d’accès complétée ; décision demandée : budget MFA.",
          "The periodic report to management: highlights, trends, decisions requested. One entry per report. Example: Q2 2026 — 2 major incidents, access review completed; decision requested: MFA budget."),
        header: ["periode", "destinataires"],
        fields: [
          { id: "periode", type: "text", required: true, suggest: "frequence", label: L("Période", "Period") },
          { id: "destinataires", type: "text", suggest: { vocab: "roles", from: ["role"] }, label: L("Destinataires", "Recipients") },
          { id: "faits", type: "textarea", label: L("Faits saillants", "Highlights") },
          { id: "decisions", type: "textarea", hint: L("Ce qu’on attend de la direction après ce rapport", "What is expected from management after this report"), label: L("Décisions demandées", "Decisions requested") },
          { id: "date", type: "text", label: L("Date de présentation (AAAA-MM-JJ)", "Presentation date (YYYY-MM-DD)") },
        ],
      },
      {
        id: "objectifs",
        example: { cible: "100 %", mesure: L("Taux de comptes à privilèges avec MFA", "Share of privileged accounts with MFA") },
        essential: true,
        title: L("Suivi des objectifs", "Objective tracking"),
        ref: L("ISO 27001 cl. 6.2 · 9.1", "ISO 27001 cl. 6.2 · 9.1"),
        desc: L("L’avancement des objectifs de sécurité fixés dans Gouvernance › SGSI : cible, mesure, échéance, état. Une entrée par point de suivi.",
          "Progress on the security objectives set in Governance › ISMS: target, measure, due date, status. One entry per checkpoint."),
        header: ["objectif", "etat"],
        fields: [
          { id: "objectif", type: "ref", linkTo: "objectif", required: true, label: L("Objectif (Gouvernance › SGSI)", "Objective (Governance › ISMS)"),
            source: () => grcFicheRefFrom(grcFicheEntries("gouvernance", "sgsi").filter((e) => e.aspect === "objectif"), (e) => e.enonce) },
          { id: "cible", type: "text", label: L("Cible", "Target") },
          { id: "mesure", type: "text", label: L("Mesure actuelle", "Current measure") },
          { id: "echeance", type: "text", label: L("Échéance (AAAA-MM-JJ)", "Due date (YYYY-MM-DD)") },
          { id: "etat", type: "select", label: L("État", "Status"), options: [
            O("entrain", "En bonne voie", "On track"), O("risque", "À risque", "At risk"), O("retard", "En retard", "Late"), O("atteint", "Atteint", "Achieved"),
          ] },
        ],
        links: [{ href: "gouvernance.html#fiche-sgsi", label: L("Gouvernance › SGSI", "Governance › ISMS") }],
      },
      metricView("indicateurs-sgsi", "Indicateurs SGSI", "ISMS indicators", "ISO 27001 cl. 9.1",
        "Les indicateurs rattachés au SGSI (domaine « SGSI » dans le registre).",
        "Indicators attached to the ISMS (\"ISMS\" domain in the register).",
        (m) => (m.domaine || "sgsi") === "sgsi", "Aucun indicateur SGSI.", "No ISMS indicator."),
      metricView("indicateurs-pca", "Indicateurs PCA", "BCP indicators", "ISO 22301 cl. 9.1",
        "Les indicateurs rattachés au PCA (domaine « PCA ») : plans testés, écarts RTO réels / cibles, revues à jour.",
        "Indicators attached to the BCP (\"BCP\" domain): plans tested, actual vs target RTO gaps, reviews up to date.",
        (m) => m.domaine === "pca", "Aucun indicateur PCA.", "No BCP indicator."),
      {
        id: "revues",
        kind: "link",
        title: L("Revues périodiques", "Periodic reviews"),
        ref: L("ISO 27001 cl. 9.3", "ISO 27001 cl. 9.3"),
        desc: L("Les revues où la direction examine les indicateurs et décide se consignent dans Gouvernance › Revues de direction.",
          "The reviews where management examines the indicators and decides are recorded in Governance › Management reviews."),
        href: "gouvernance.html#fiche-revues-direction",
        links: [{ label: L("Gouvernance › Revues de direction", "Governance › Management reviews") }],
        count: () => grcFicheEntries("gouvernance", "revues-direction").length,
      },
      {
        id: "registre",
        essential: true,
        kind: "register",
        title: L("Registre d’indicateurs", "Metrics register"),
        ref: L("ISO 27001 cl. 9.1", "ISO 27001 cl. 9.1"),
        desc: L("Chaque indicateur : type (KPI / KRI), domaine (SGSI / PCA), unité, cible, seuils, série de mesures et état.",
          "Each indicator: type (KPI / KRI), domain (ISMS / BCP), unit, target, thresholds, measurement series and status."),
        block: "#grcMetricsRegistry",
        count: () => metrics().length,
        reinit: () => initGrcMetricsRegistry(),
        table: () => ({
          columns: [L("Indicateur", "Indicator"), L("Type", "Type"), L("Domaine", "Domain"), L("Dernière mesure", "Latest"), L("État", "Status")],
          rows: metrics().map((m) => [m.name || "", String(m.type || "").toUpperCase(), String(m.domaine || "sgsi").toUpperCase(), latest(m), rag(m)]),
        }),
      },
    ],
  });
})();
