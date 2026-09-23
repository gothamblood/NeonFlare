/* Démarrer ici (grc/demarrer.html) — grc-debutant B5 · B6, UX U8.

   Onglets (moteur grc-fiches.js, page « outil » sans statut ni export) :
     demarche     les 15 étapes dans l'ordre de la chaîne : ce qu'on y fait,
                  ce qu'on obtient, prérequis, participants, durée indicative
                  (PME de 11 à 50 personnes, D4), état et ruptures ;
     diagnostic   questions de départ -> entrées PROPOSÉES dans le Contexte
                  (et un objectif de Gouvernance), marquées `diag` pour être
                  mises à jour si le diagnostic est refait (D7) ; feuille de
                  route générée ;
     documents    documents exigés (grc-exigences.js) ;
     exemple      organisation exemple FSociety (grc-demo.js) ;
     modeles      modèles de départ par profil (grc-demo.js, U8).
   Stockage du diagnostic : /grc/fiches/demarrer/diagnostic (coffre). */

(function () {
  const L = (fr, en) => ({ fr: fr, en: en });
  const T = (v) => grcFicheL(v);

  const STEPS = {
    "contexte-organisationnel": { what: L("Décrire l’organisation : mission, enjeux, parties prenantes, portée, processus.", "Describe the organization: mission, stakes, interested parties, scope, processes."), get: L("Contexte et portée du SGSI", "Context and ISMS scope"), who: L("Direction, RSSI", "Management, CISO"), time: L("2 à 3 jours", "2 to 3 days") },
    "gouvernance": { what: L("Organiser qui décide : rôles, comités, objectifs, critères d’acceptation, revues.", "Organize who decides: roles, committees, objectives, acceptance criteria, reviews."), get: L("Rôles, objectifs, critères", "Roles, objectives, criteria"), who: L("Direction, RSSI", "Management, CISO"), time: L("2 jours", "2 days") },
    "actifs": { what: L("Inventorier et classer les actifs, avec leurs propriétaires.", "Inventory and classify assets, with their owners."), get: L("Inventaire des actifs", "Asset inventory"), who: L("TI, propriétaires", "IT, owners"), time: L("3 à 5 jours", "3 to 5 days") },
    "analyse-risques": { what: L("Identifier, coter et évaluer les risques sur les actifs.", "Identify, rate and evaluate risks on assets."), get: L("Registre des risques", "Risk register"), who: L("RSSI, métiers, TI", "CISO, business, IT"), time: L("3 à 5 jours", "3 to 5 days") },
    "traitement-risques": { what: L("Décider du traitement de chaque risque et planifier les actions.", "Decide how each risk is treated and plan actions."), get: L("Plans de traitement", "Treatment plans"), who: L("Propriétaires des risques", "Risk owners"), time: L("2 jours", "2 days") },
    "controles": { what: L("Choisir les contrôles et décider de l’applicabilité des 93 contrôles de l’Annexe A.", "Select controls and decide the applicability of the 93 Annex A controls."), get: L("Registre des contrôles et DDA", "Control register and SoA"), who: L("RSSI, TI", "CISO, IT"), time: L("3 à 4 jours", "3 to 4 days") },
    "directives": { what: L("Écrire les politiques qui fixent les règles.", "Write the policies that set the rules."), get: L("Politiques de sécurité", "Security policies"), who: L("RSSI, direction", "CISO, management"), time: L("3 à 5 jours", "3 to 5 days") },
    "procedures": { what: L("Décrire comment les règles s’appliquent, étape par étape.", "Describe how the rules apply, step by step."), get: L("Procédures opérationnelles", "Operating procedures"), who: L("TI, opérations", "IT, operations"), time: L("3 à 5 jours", "3 to 5 days") },
    "incidents": { what: L("Préparer la détection, la réponse et l’apprentissage.", "Prepare detection, response and learning."), get: L("Processus de gestion des incidents", "Incident management process"), who: L("TI, RSSI", "IT, CISO"), time: L("2 jours", "2 days") },
    "continuite": { what: L("Analyser l’impact d’une interruption et préparer la reprise.", "Analyse the impact of disruption and prepare recovery."), get: L("BIA et plans de continuité", "BIA and continuity plans"), who: L("Direction, métiers, TI", "Management, business, IT"), time: L("4 à 6 jours", "4 to 6 days") },
    "documentation": { what: L("Tenir les documents à jour, approuvés et conservés.", "Keep documents current, approved and retained."), get: L("Registre documentaire", "Document register"), who: L("RSSI", "CISO"), time: L("1 jour", "1 day") },
    "conformite": { what: L("Suivre les obligations, auditer et corriger les écarts.", "Track obligations, audit and correct gaps."), get: L("Registre de conformité, programme d’audit", "Compliance register, audit programme"), who: L("RSSI, juridique", "CISO, legal"), time: L("2 à 3 jours", "2 to 3 days") },
    "fournisseurs": { what: L("Évaluer et encadrer les fournisseurs critiques.", "Assess and manage critical suppliers."), get: L("Registre des fournisseurs", "Supplier register"), who: L("Approvisionnement, RSSI", "Procurement, CISO"), time: L("2 jours", "2 days") },
    "vie-privee": { what: L("Protéger les renseignements personnels : traitements, consentements, EFVP, conservation, violations, droits.", "Protect personal information: processing, consents, PIAs, retention, breaches, rights."), get: L("Registre des traitements, registre des violations", "Record of processing, breach register"), who: L("RPRP, juridique, RSSI", "Privacy officer, legal, CISO"), time: L("2 à 3 jours", "2 to 3 days") },
    "indicateurs": { what: L("Mesurer l’efficacité et rendre compte à la direction.", "Measure effectiveness and report to management."), get: L("Indicateurs et tableaux de bord", "Indicators and dashboards"), who: L("RSSI, direction", "CISO, management"), time: L("1 à 2 jours", "1 to 2 days") },
  };

  /* ---------- La démarche ------------------------------------------ */

  function renderDemarche(host) {
    host.innerHTML = "";
    const ctx = grcLinksCtx();
    const rupt = {};
    grcLinksRuptures().forEach((r) => {
      if (!r.items.length) return;
      const pg = _grcLinksTypePage(GRC_RUPTURES.find((x) => x.code === r.code).type);
      if (pg) rupt[pg] = (rupt[pg] || 0) + r.items.length;
    });
    const next = typeof grcHubNextStep === "function" ? grcHubNextStep() : null;
    const intro = document.createElement("p");
    intro.className = "grc-fiche-hint";
    intro.textContent = T(L("Un SGSI (système de management de la sécurité de l’information) est l’ensemble des règles et pratiques qui protègent l’information de l’organisation ; un PCA prépare la poursuite des activités en cas de crise. Commence par le diagnostic, puis suis les étapes dans l’ordre : chacune s’appuie sur la précédente.",
      "An ISMS (information security management system) is the set of rules and practices that protect the organization’s information; a BCP prepares business continuity in a crisis. Start with the diagnostic, then follow the steps in order: each builds on the previous one."));
    host.appendChild(intro);
    const tw = document.createElement("div");
    tw.className = "grc-fiche-table-wrap";
    const t = document.createElement("table");
    t.className = "grc-fiche-table grc-demarche-table";
    const head = ["#", T(L("Étape", "Step")), T(L("Ce qu’on y fait", "What you do")), T(L("Ce qu’on obtient", "What you get")), T(L("Prérequis", "Prerequisites")),
      T(L("Qui participe", "Who takes part")), T(L("Durée indicative", "Indicative time")), T(L("État", "Status")), ""];
    const tr0 = document.createElement("tr");
    head.forEach((h) => { const th = document.createElement("th"); th.textContent = h; tr0.appendChild(th); });
    const thead = document.createElement("thead");
    thead.appendChild(tr0);
    t.appendChild(thead);
    const tb = document.createElement("tbody");
    GRC_PAGE_ORDER.forEach((o, i) => {
      const s = STEPS[o.page] || {};
      const p = typeof grcFicheProgress === "function" && GRC_FICHE_DEFS[o.page] ? grcFicheProgress(o.page) : null;
      const miss = grcPageMissingPre(o.page, ctx);
      let state = T(L("non commencée", "not started"));
      if (p && p.done === p.total && p.total) state = T(L("documentée et reliée", "documented and linked"));
      else if (p && p.done) state = T(L("en cours", "in progress")) + " (" + p.pct + " %)";
      if (rupt[o.page]) state += " · " + rupt[o.page] + " " + T(L("rupture(s)", "break(s)"));
      const tr = document.createElement("tr");
      tr.dataset.page = o.page;
      if (next && next.step.page === o.page) tr.className = "is-next";
      // Prérequis : nom du type amont, marqué ⚠ s'il n'existe encore aucune entrée.
      const pre = o.pre.map((x) => {
        const n = grcLinksT((_grcLinksResolveType(x) || {}).name) || x;
        return miss.indexOf(n) !== -1 ? "⚠ " + n + " " + T(L("(à faire)", "(to do)")) : "✓ " + n;
      }).join(", ");
      [String(i + 1), grcLinksT(o.title), T(s.what), T(s.get), pre || "—",
        T(s.who), T(s.time), state].forEach((v) => { const td = document.createElement("td"); td.textContent = v; tr.appendChild(td); });
      const td = document.createElement("td");
      const a = document.createElement("a");
      a.href = o.file;
      a.className = "grc-registry-io-btn";
      a.textContent = T(L("Ouvrir", "Open"));
      td.appendChild(a);
      tr.appendChild(td);
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    tw.appendChild(t);
    host.appendChild(tw);
    // Les domaines de mesures (ISO 27001 A.6 personnes, A.7 physique…) ne
    // sont pas des étapes de la démarche : ils vivent dans Sécurité opérationnelle.
    const ops = document.createElement("p");
    ops.className = "grc-fiche-hint grc-demarche-ops";
    ops.textContent = T(L("Les mesures de sécurité se documentent dans Sécurité opérationnelle, en parallèle des étapes : architecture, vulnérabilités, IAM, ressources humaines et sensibilisation (A.6), sécurité physique (A.7), cloud et DevSecOps.",
      "Security measures are documented under Operational Security, alongside the steps: architecture, vulnerabilities, IAM, people and awareness (A.6), physical security (A.7), cloud and DevSecOps."));
    host.appendChild(ops);
  }

  /* ---------- Diagnostic (B6) --------------------------------------- */

  const O = (v, fr, en) => ({ v: v, label: L(fr, en) });
  const YN = [O("", "—", "—"), O("oui", "Oui", "Yes"), O("non", "Non", "No")];
  const QUESTIONS = [
    { id: "taille", theme: L("Organisation", "Organization"), q: L("Taille de l’organisation", "Organization size"), options: [O("", "—", "—"), O("1-10", "1 à 10 personnes", "1 to 10 people"), O("11-50", "11 à 50", "11 to 50"), O("51-250", "51 à 250", "51 to 250"), O("250+", "Plus de 250", "More than 250")] },
    { id: "secteur", theme: L("Organisation", "Organization"), q: L("Secteur d’activité", "Industry"), options: [O("", "—", "—"), O("services", "Services professionnels", "Professional services"), O("sante", "Santé", "Health"), O("manufacturier", "Manufacturier", "Manufacturing"), O("obnl", "OBNL / public", "Non-profit / public"), O("autre", "Autre", "Other")] },
    { id: "sites", theme: L("Organisation", "Organization"), q: L("Nombre de sites", "Number of sites"), options: [O("", "—", "—"), O("1", "1", "1"), O("2-5", "2 à 5", "2 to 5"), O("6+", "6 ou plus", "6 or more")] },
    { id: "ti", theme: L("Organisation", "Organization"), q: L("Vos TI sont-elles externalisées ?", "Is your IT outsourced?"), options: [O("", "—", "—"), O("interne", "Internes", "In-house"), O("mixte", "Mixtes", "Mixed"), O("externe", "Externalisées", "Outsourced")] },
    { id: "iso27001", theme: L("Objectif", "Goal"), q: L("Certification ISO 27001 visée ?", "Aiming for ISO 27001 certification?"), options: YN },
    { id: "iso22301", theme: L("Objectif", "Goal"), q: L("Certification ISO 22301 (continuité) visée ?", "Aiming for ISO 22301 (continuity) certification?"), options: YN },
    { id: "client", theme: L("Objectif", "Goal"), q: L("Un client exige-t-il des garanties de sécurité ?", "Does a customer require security assurances?"), options: YN },
    { id: "loi25", theme: L("Objectif", "Goal"), q: L("Traitez-vous des renseignements personnels (Loi 25) ?", "Do you process personal information (Bill 25)?"), options: YN },
    { id: "politique", theme: L("Existant", "Existing"), q: L("Une politique de sécurité écrite existe-t-elle ?", "Is there a written security policy?"), options: YN },
    { id: "inventaire", theme: L("Existant", "Existing"), q: L("Un inventaire des actifs existe-t-il ?", "Is there an asset inventory?"), options: YN },
    { id: "sauvegardes", theme: L("Existant", "Existing"), q: L("Les sauvegardes sont-elles testées ?", "Are backups tested?"), options: YN },
    { id: "mfa", theme: L("Existant", "Existing"), q: L("L’authentification multifacteur (MFA) est-elle en place ?", "Is multi-factor authentication (MFA) in place?"), options: YN },
    { id: "pca", theme: L("Existant", "Existing"), q: L("Un plan de continuité existe-t-il ?", "Is there a continuity plan?"), options: YN },
    { id: "responsable", theme: L("Existant", "Existing"), q: L("Un responsable de la sécurité est-il désigné ?", "Is a security officer appointed?"), options: YN },
  ];
  const DIAG_KEY = "/grc/fiches/demarrer/diagnostic";

  function diagRead() {
    try {
      const v = JSON.parse(vaultGetItem(DIAG_KEY) || "[]");
      return Array.isArray(v) && v[0] && typeof v[0] === "object" ? v[0] : { answers: {} };
    } catch (e) {
      return { answers: {} };
    }
  }

  // Entrées proposées dans le Contexte / Gouvernance (P8) : { page, el, diag, entry }.
  function diagProposals(a) {
    const out = [];
    const add = (page, el, id, entry) => out.push({ page: page, el: el, diag: id, entry: entry });
    const tailles = { "1-10": L("1 à 10 personnes", "1 to 10 people"), "11-50": L("11 à 50 personnes", "11 to 50 people"), "51-250": L("51 à 250 personnes", "51 to 250 people"), "250+": L("plus de 250 personnes", "more than 250 people") };
    if (a.taille) add("contexte-organisationnel", "contexte-interne", "taille", { facteur: "gouvernance", nature: "force", constat: T(L("Taille : ", "Size: ")) + T(tailles[a.taille]), source: T(L("Diagnostic de départ", "Starting diagnostic")) });
    if (a.sites) add("contexte-organisationnel", "contexte-interne", "sites", { facteur: "processus", nature: a.sites === "1" ? "force" : "faiblesse", constat: T(L("Nombre de sites : ", "Number of sites: ")) + a.sites, source: T(L("Diagnostic de départ", "Starting diagnostic")) });
    if (a.ti === "externe" || a.ti === "mixte") add("contexte-organisationnel", "contexte-externe", "ti", { facteur: "fournisseurs", nature: "menace", constat: T(L("Les TI sont en tout ou partie confiées à des fournisseurs : dépendance et exigences contractuelles à encadrer.", "IT is fully or partly entrusted to suppliers: dependency and contractual requirements to manage.")), source: T(L("Diagnostic de départ", "Starting diagnostic")) });
    if (a.loi25 === "oui") {
      add("contexte-organisationnel", "contexte-externe", "loi25", { facteur: "legal", nature: "menace", constat: T(L("La Loi 25 encadre les renseignements personnels : responsable désigné, registre des incidents, EFVP.", "Bill 25 governs personal information: appointed officer, incident register, PIA.")), source: T(L("Diagnostic de départ", "Starting diagnostic")) });
      add("contexte-organisationnel", "exigences-pp", "loi25", { exigence: T(L("Protéger les renseignements personnels et déclarer les incidents de confidentialité", "Protect personal information and report privacy incidents")), partie: T(L("Commission d’accès à l’information", "Commission d’accès à l’information")), source: "legale", reference: T(L("Loi 25", "Bill 25")) });
    }
    if (a.client === "oui") add("contexte-organisationnel", "exigences-pp", "client", { exigence: T(L("Démontrer la sécurité de nos services à nos clients", "Demonstrate the security of our services to customers")), partie: T(L("Clients", "Customers")), source: "contractuelle" });
    if (a.iso27001 === "oui") add("gouvernance", "sgsi", "iso27001", { aspect: "objectif", enonce: T(L("Obtenir la certification ISO 27001", "Achieve ISO 27001 certification")), statut: "planifie" });
    if (a.iso22301 === "oui") add("gouvernance", "sgsi", "iso22301", { aspect: "objectif", enonce: T(L("Obtenir la certification ISO 22301", "Achieve ISO 22301 certification")), statut: "planifie" });
    if (a.responsable === "non") add("contexte-organisationnel", "contexte-interne", "responsable", { facteur: "gouvernance", nature: "faiblesse", constat: T(L("Aucun responsable de la sécurité n’est désigné.", "No security officer is appointed.")), source: T(L("Diagnostic de départ", "Starting diagnostic")) });
    if (a.mfa === "non") add("contexte-organisationnel", "contexte-interne", "mfa", { facteur: "si", nature: "faiblesse", constat: T(L("L’authentification multifacteur n’est pas en place.", "Multi-factor authentication is not in place.")), source: T(L("Diagnostic de départ", "Starting diagnostic")) });
    if (a.sauvegardes === "non") add("contexte-organisationnel", "contexte-interne", "sauvegardes", { facteur: "si", nature: "faiblesse", constat: T(L("Les sauvegardes ne sont pas testées.", "Backups are not tested.")), source: T(L("Diagnostic de départ", "Starting diagnostic")) });
    return out;
  }

  // Écrit / met à jour les entrées `diag` ; celles saisies à la main ne
  // sont jamais touchées. Une entrée mise à jour propage « à revoir ».
  function diagApply(a) {
    const props = diagProposals(a);
    const byKey = {};
    props.forEach((p) => { (byKey[p.page + "/" + p.el] = byKey[p.page + "/" + p.el] || []).push(p); });
    let n = 0;
    Object.keys(byKey).forEach((k) => {
      const [page, el] = [k.slice(0, k.indexOf("/")), k.slice(k.indexOf("/") + 1)];
      const store = grcFicheStore(page, el);
      const def = GRC_FICHE_DEFS[page] && GRC_FICHE_DEFS[page].elements.find((x) => x.id === el);
      const list = grcFicheEntries(page, el);
      byKey[k].forEach((p) => {
        const clean = def ? grcFicheCleanEntry(def, p.entry) : p.entry;
        const idx = list.findIndex((e) => e.diag === p.diag);
        const stamp = { updatedAt: new Date().toISOString(), updatedBy: typeof grcAuthorName === "function" ? grcAuthorName() : "", diag: p.diag };
        if (idx === -1) list.push(Object.assign({ id: grkId("fiche") }, clean, stamp));
        else {
          list[idx] = Object.assign({}, list[idx], clean, stamp);
          if (typeof grcChainChanged === "function") grcChainChanged(store.key, list[idx]);
        }
        n++;
      });
      store.save(list);
    });
    return n;
  }

  function diagRoadmap(a) {
    const has = (k) => a[k] === "oui";
    const size = a.taille === "51-250" || a.taille === "250+" ? 1.5 : (a.taille === "1-10" ? 0.6 : 1);
    return GRC_PAGE_ORDER.map((o) => {
      let prio = "afaire";
      if ((o.page === "directives" && has("politique")) || (o.page === "actifs" && has("inventaire")) || (o.page === "continuite" && has("pca"))) prio = "adocumenter";
      if (o.page === "conformite" && has("client")) prio = "priorite";
      if (o.page === "vie-privee" && has("loi25")) prio = "priorite";
      if (o.page === "controles" && (has("iso27001") || has("client"))) prio = "priorite";
      if (o.page === "continuite" && has("iso22301")) prio = "priorite";
      if (o.page === "contexte-organisationnel" || o.page === "gouvernance") prio = "priorite";
      return { step: o, prio: prio, factor: size };
    });
  }

  const PRIO = { priorite: L("à faire en priorité", "priority"), afaire: L("à compléter", "to complete"), adocumenter: L("déjà en place (à documenter)", "already in place (to document)") };

  function renderDiagnostic(host) {
    host.innerHTML = "";
    const cur = diagRead();
    const form = document.createElement("form");
    form.className = "grc-registry-form grc-diag-form";
    let theme = null;
    QUESTIONS.forEach((q) => {
      if (!theme || theme.fr !== q.theme.fr) {
        theme = q.theme;
        const h = document.createElement("h4");
        h.textContent = T(theme);
        form.appendChild(h);
      }
      const l = document.createElement("label");
      l.appendChild(document.createTextNode(T(q.q) + " "));
      const s = document.createElement("select");
      s.name = q.id;
      q.options.forEach((o) => {
        const op = document.createElement("option");
        op.value = o.v;
        op.textContent = T(o.label);
        s.appendChild(op);
      });
      s.value = (cur.answers || {})[q.id] || "";
      l.appendChild(s);
      form.appendChild(l);
    });
    const btn = document.createElement("button");
    btn.type = "submit";
    btn.className = "grc-registry-add-btn grc-diag-apply";
    btn.textContent = T(L("Enregistrer et proposer dans le Contexte", "Save and propose in the Context"));
    form.appendChild(btn);
    const res = document.createElement("div");
    res.className = "grc-diag-result";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const answers = {};
      QUESTIONS.forEach((q) => { answers[q.id] = form.elements[q.id].value; });
      vaultSetItem(DIAG_KEY, JSON.stringify([{ id: "diagnostic", answers: answers, updatedAt: new Date().toISOString() }]));
      const n = diagApply(answers);
      const p = document.createElement("p");
      p.className = "grc-diag-done";
      p.textContent = T(L("Diagnostic enregistré : ", "Diagnostic saved: ")) + n + T(L(" entrée(s) proposée(s) ou mise(s) à jour dans le Contexte et la Gouvernance (modifiables).", " entr(y/ies) proposed or updated in the Context and Governance (editable)."));
      res.innerHTML = "";
      res.appendChild(p);
      renderRoadmap(res, answers);
    });
    host.appendChild(form);
    host.appendChild(res);
    if (cur.answers && Object.keys(cur.answers).length) renderRoadmap(res, cur.answers);
  }

  function renderRoadmap(host, answers) {
    const h = document.createElement("h4");
    h.textContent = T(L("Feuille de route", "Roadmap"));
    host.appendChild(h);
    const ol = document.createElement("ol");
    ol.className = "grc-diag-roadmap";
    diagRoadmap(answers).forEach((r) => {
      const li = document.createElement("li");
      li.className = "grc-diag-" + r.prio;
      const a = document.createElement("a");
      a.href = r.step.file;
      a.textContent = grcLinksT(r.step.title);
      li.appendChild(a);
      const s = STEPS[r.step.page];
      li.appendChild(document.createTextNode(" — " + T(PRIO[r.prio]) + (s ? " · " + T(s.time) + (r.factor !== 1 ? " (× " + r.factor + ")" : "") : "")));
      ol.appendChild(li);
    });
    host.appendChild(ol);
    const ex = document.createElement("button");
    ex.type = "button";
    ex.className = "grc-registry-io-btn grc-diag-export";
    ex.textContent = T(L("Exporter la feuille de route (PDF)", "Export the roadmap (PDF)"));
    ex.addEventListener("click", () => grkPrintWindow("<h1>" + grkEscapeHtml(T(L("Feuille de route GRC", "GRC roadmap"))) + "</h1>" + ol.outerHTML, T(L("Feuille de route GRC", "GRC roadmap"))));
    host.appendChild(ex);
  }

  grcFicheRegister("demarrer", {
    plain: true,
    docTitle: L("Démarrer ici", "Start here"),
    hint: L("Nouveau en GRC ? Fais le diagnostic, puis suis la démarche. Les documents exigés montrent ce qui manque avant un audit.", "New to GRC? Take the diagnostic, then follow the approach. Required documents show what is missing before an audit."),
    elements: [
      { id: "demarche", kind: "view", title: L("La démarche", "The approach"), desc: L("Les 15 étapes dans l’ordre de la chaîne, avec leur état.", "The 15 steps in chain order, with their status."), render: renderDemarche, count: () => GRC_PAGE_ORDER.length,
        table: () => ({ columns: [L("Étape", "Step")], rows: GRC_PAGE_ORDER.map((o) => [grcLinksT(o.title)]) }) },
      { id: "diagnostic", kind: "view", title: L("Diagnostic de départ", "Starting diagnostic"), desc: L("Quelques questions ; tes réponses deviennent des entrées proposées dans le Contexte (modifiables) et une feuille de route.", "A few questions; your answers become proposed entries in the Context (editable) and a roadmap."),
        render: renderDiagnostic, count: () => Object.keys(diagRead().answers || {}).filter((k) => diagRead().answers[k]).length },
      { id: "documents", kind: "view", title: L("Documents exigés", "Required documents"), desc: L("Ce qu’ISO 27001 et ISO 22301 demandent de documenter, où le faire ici, et l’état actuel.", "What ISO 27001 and ISO 22301 require to be documented, where to do it here, and the current status."),
        render: (h) => grcExigencesRender(h), count: () => grcExigencesSummary().ready },
      { id: "exemple", kind: "view", title: L("Organisation exemple", "Example organization"), desc: L("Charge l’exemple fictif FSociety pour voir une chaîne complète, puis retire-le.", "Load the fictional FSociety example to see a complete chain, then remove it."),
        render: (h) => grcDemoRender(h), count: () => (grcDemoLoaded() ? 1 : 0) },
      { id: "modeles", kind: "view", title: L("Modèles de départ", "Starter templates"), desc: L("Pré-remplir les éléments courants selon ton profil d’organisation ; entrées marquées « modèle » jusqu’à leur modification.", "Pre-fill common elements for your organization profile; entries marked \"template\" until edited."),
        render: (h) => grcTemplatesRender(h), count: () => grcTemplatesCount() },
    ],
  });
})();
