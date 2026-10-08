/* Checklists de référence « Contenu à inclure » PAR TYPE de plan de
   continuité (spec/grc-continuity-plans-register/ P2, décision A1 : contenu
   PARTAGÉ PAR TYPE). Extraites des ex-sous-pages grc/continuite/<slug>.html
   (supprimées en P4). Les libellés passent par les clés i18n existantes
   grc.continuite.<slug>.c.<id>.{label,desc} (grc-i18n-components.js) : rien à
   retraduire. Les étiquettes de contrôle (ISO/NIST/CIS) sont neutres.

   L'état de cochage est stocké sous la MÊME clé que l'ancienne sous-page
   (chemin .../continuite/<slug>.html) : zéro migration, et la couverture du
   domaine (readDomainCoverage, grc-checklist.js) continue de compter ces
   items une fois par type. Ordre et identifiants STABLES.

   PCC réutilise le slug « pcm » (clés + état conservés). DRP partage « pri »
   (sous-cas). Aucun fetch(). */

const GRC_CONT_TYPE_CHECKLISTS = {
  pca: [
    { id: "politique", legacy: "@continuite.html#0", tags: "ISO 22301 cl. 5.2 · ISO A.5.29" },
    { id: "portee", tags: "ISO 22301 cl. 4.3" },
    { id: "objectifs", tags: "ISO 22301 cl. 6.2" },
    { id: "gouvernance", tags: "ISO 22301 cl. 5.3 · NIST GV.RR" },
    { id: "articulation", tags: "ISO 22301 cl. 8.4" },
    { id: "activation", tags: "ISO 22301 cl. 8.4.2" },
    { id: "ressources", tags: "ISO 22301 cl. 7.1" },
    { id: "approbation-revue", tags: "ISO 22301 cl. 9.3 · 10" },
  ],
  pco: [
    { id: "processus", tags: "ISO 22301 cl. 8.4.4" },
    { id: "mode-degrade", tags: "ISO 22301 cl. 8.3 · 8.4.4" },
    { id: "contournements", tags: "ISO 22301 cl. 8.4.4" },
    { id: "ressources-minimales", tags: "ISO 22301 cl. 8.3.2" },
    { id: "repli", tags: "ISO 22301 cl. 8.3 · ISO A.6.7" },
    { id: "roles", tags: "ISO 22301 cl. 8.4.2 · NIST GV.RR" },
    { id: "retour", tags: "ISO 22301 cl. 8.4.5" },
  ],
  pgc: [
    { id: "declenchement", tags: "ISO 22301 cl. 8.4.2 · NIST RS.MA" },
    { id: "ccd", tags: "ISO 22301 cl. 8.4.2 · NIST GV.RR" },
    { id: "cellules", tags: "ISO 22301 cl. 8.4.2" },
    { id: "spoc", tags: "ISO 22301 cl. 8.4.3 · NIST RS.CO" },
    { id: "main-courante", tags: "ISO 22301 cl. 8.4.2 · ISO A.5.28" },
    { id: "salle-crise", tags: "ISO 22301 cl. 8.4.2" },
    { id: "aide-decision", tags: "ISO 22301 cl. 8.4.2" },
    { id: "sortie", tags: "ISO 22301 cl. 8.4.5" },
    { id: "retex", tags: "ISO 22301 cl. 10 · NIST ID.IM" },
  ],
  pcm: [
    { id: "parties-prenantes", tags: "ISO 22301 cl. 8.4.3 · NIST RC.CO" },
    { id: "porte-parole", tags: "ISO 22301 cl. 8.4.3" },
    { id: "spoc", tags: "ISO 22301 cl. 8.4.3 · NIST RS.CO" },
    { id: "messages", tags: "ISO 22301 cl. 8.4.3" },
    { id: "canaux", tags: "ISO 22301 cl. 8.4.3 · NIST RC.CO" },
    { id: "notifications", tags: "ISO A.5.5 · A.5.34 · NIST RS.CO" },
    { id: "interne", tags: "ISO 22301 cl. 8.4.3" },
    { id: "veille", tags: "NIST RC.CO" },
    { id: "validation", tags: "ISO 22301 cl. 8.4.3" },
  ],
  pra: [
    { id: "priorisation", tags: "ISO 22301 cl. 8.4.5" },
    { id: "sequencement", tags: "ISO 22301 cl. 8.4.5" },
    { id: "procedures", legacy: "@continuite.html#4", tags: "ISO 22301 cl. 8.4.5 · NIST RC.RP" },
    { id: "ressources", tags: "ISO 22301 cl. 8.3.2" },
    { id: "validation-metier", tags: "ISO 22301 cl. 8.4.5" },
    { id: "retour-normal", tags: "ISO 22301 cl. 8.4.5 · NIST RC.CO" },
  ],
  psi: [
    { id: "moyens-secours", tags: "ISO A.5.30 · A.8.14 · NIST RC.RP" },
    { id: "bascule", tags: "ISO A.5.30 · NIST RC.RP" },
    { id: "mode-degrade-si", tags: "ISO A.5.30" },
    { id: "sauvegardes", tags: "ISO A.8.13 · NIST PR.DS · CIS 11" },
    { id: "mco", tags: "ISO A.5.30 · A.8.6 · NIST PR.PS" },
    { id: "tests-bascule", tags: "ISO A.5.30 · ISO 22301 cl. 8.5" },
    { id: "contrats", tags: "ISO A.5.20 · A.5.21 · NIST GV.SC" },
  ],
  pri: [
    { id: "ordre", tags: "ISO A.5.30 · NIST RC.RP" },
    { id: "restauration", tags: "ISO A.8.13 · NIST RC.RP · CIS 11" },
    { id: "integrite", tags: "ISO A.5.26 · NIST RC.RP · RS.AN" },
    { id: "reconstruction", tags: "ISO A.5.26 · NIST RC.RP" },
    { id: "bascule-retour", tags: "ISO A.5.30 · NIST RC.RP" },
    { id: "validation", tags: "ISO A.8.29 · NIST RC.RP · DE.CM" },
    { id: "documentation", tags: "ISO 22301 cl. 7.5 · NIST RC.RP" },
  ],
  // Nouveaux types (P3).
  pui: [
    { id: "alerte", tags: "ISO 22301 cl. 8.4.2" },
    { id: "evacuation", tags: "ISO 22301 cl. 8.4.2 · ISO A.7.11" },
    { id: "confinement", tags: "ISO 22301 cl. 8.4.2" },
    { id: "premiers-secours", tags: "ISO A.7.11 · NIST PR.IR" },
    { id: "coupure", tags: "ISO A.7.11 · A.7.12" },
    { id: "comptage", tags: "ISO 22301 cl. 8.4.2" },
    { id: "exercices", tags: "ISO 22301 cl. 8.5" },
  ],
  prh: [
    { id: "recensement", tags: "ISO 22301 cl. 8.3.2 · NIST GV.RR" },
    { id: "mobilisation", tags: "ISO 22301 cl. 8.4.2" },
    { id: "astreinte", tags: "ISO 22301 cl. 8.3.2" },
    { id: "remplacement", tags: "ISO 22301 cl. 8.3.2 · ISO A.6.1" },
    { id: "soutien-psy", tags: "ISO 22301 cl. 7.3" },
    { id: "droit-retrait", tags: "ISO A.6.4 · Loi SST" },
    { id: "paie-crise", tags: "ISO 22301 cl. 8.4.4" },
  ],
  prl: [
    { id: "sites", tags: "ISO 22301 cl. 8.4.4 · ISO A.7.11" },
    { id: "capacite", tags: "ISO 22301 cl. 8.3.2" },
    { id: "delai", tags: "ISO 22301 cl. 8.4.4" },
    { id: "equipements", tags: "ISO A.7.11 · A.8.1" },
    { id: "teletravail", tags: "ISO A.6.7" },
    { id: "acces", tags: "ISO A.7.1 · A.7.2" },
    { id: "contrats", tags: "ISO A.5.20 · A.5.21 · NIST GV.SC" },
  ],
  plog: [
    { id: "materiel-critique", tags: "ISO 22301 cl. 8.3.2" },
    { id: "stocks", tags: "ISO 22301 cl. 8.3.2" },
    { id: "fournisseurs", tags: "ISO A.5.20 · A.5.21 · NIST GV.SC" },
    { id: "transport", tags: "ISO 22301 cl. 8.3.2" },
    { id: "energie", tags: "ISO A.7.11 · A.7.12" },
    { id: "acheminement", tags: "ISO 22301 cl. 8.4.4" },
    { id: "inventaire", tags: "ISO A.5.9 · A.8.1" },
  ],
  pdep: [
    { id: "delegations", tags: "ISO 22301 cl. 7.1 · 8.4.2" },
    { id: "seuils", tags: "ISO 22301 cl. 7.1" },
    { id: "achat-urgence", tags: "ISO A.5.20 · A.5.23" },
    { id: "suivi", tags: "ISO 22301 cl. 7.5 · 9.1" },
    { id: "justificatifs", tags: "ISO 22301 cl. 7.5" },
    { id: "assurance", tags: "ISO 22301 cl. 8.3" },
    { id: "remboursement", tags: "ISO 22301 cl. 9.1" },
  ],
  prii: [
    { id: "detection", tags: "ISO 27035 · ISO A.5.24 · NIST DE.CM" },
    { id: "qualification", tags: "ISO 27035 · ISO A.5.25" },
    { id: "endiguement", tags: "ISO A.5.26 · NIST RS.MI" },
    { id: "eradication", tags: "ISO A.5.26 · NIST RS.MI" },
    { id: "preuves", tags: "ISO A.5.28 · NIST RS.AN" },
    { id: "communication", tags: "ISO A.5.5 · A.6.8 · NIST RS.CO" },
    { id: "lien-pri", tags: "ISO A.5.29 · A.5.30 · NIST RC.RP" },
  ],
};

// Code de type -> slug de checklist/i18n. PCC => pcm ; DRP => pri (sous-cas).
// Les nouveaux types (PUI, PRH, PRL, PLOG, PDEP, PRII) seront ajoutés en P3.
const GRC_CONT_TYPE_CHECKLIST_SLUG = {
  PCA: "pca", PCO: "pco", PGC: "pgc", PCC: "pcm",
  PRA: "pra", PSI: "psi", PRI: "pri", DRP: "pri",
  PUI: "pui", PRH: "prh", PRL: "prl", PLOG: "plog", PDEP: "pdep", PRII: "prii",
};

/* Checklists des SECTIONS « remontées » sur continuite.html (décision C) :
   BIA et Tests & exercices. Même mécanique que les types (données + clé =
   ancien chemin de sous-page => zéro migration, couverture conservée), mais
   rendues comme sections de la page, pas dans le panneau d'un plan. */
const GRC_CONT_SECTION_CHECKLISTS = {
  "bia": [
    { id: "processus-critiques", tags: "ISO 22301 cl. 8.2.2 · NIST ID.AM" },
    { id: "criticite", tags: "ISO 22301 cl. 8.2.2" },
    { id: "dmia", tags: "ISO 22301 cl. 8.2.2 · ISO A.5.30" },
    { id: "mao", tags: "ISO 22301 cl. 8.2.2 · ISO A.5.20" },
    { id: "rto", legacy: "@continuite.html#2", tags: "ISO 22301 cl. 8.2.2 · ISO A.5.30 · NIST RC.RP" },
    { id: "rpo", legacy: "@continuite.html#2", tags: "ISO 22301 cl. 8.2.2 · ISO A.8.13 · CIS 11" },
    { id: "mbco", tags: "ISO 22301 cl. 8.2.2 · 8.3" },
    { id: "impacts", tags: "ISO 22301 cl. 8.2.2 · NIST ID.RA" },
    { id: "dependances", tags: "ISO 22301 cl. 8.2.2 · NIST ID.AM · GV.SC" },
    { id: "spof", tags: "ISO A.8.14 · NIST ID.RA" },
  ],
  "tests-exercices": [
    { id: "programme", tags: "ISO 22301 cl. 8.5 · ISO A.5.30" },
    { id: "ttx", legacy: "@continuite.html#5", tags: "ISO 22301 cl. 8.5 · NIST PR.IR · ID.IM" },
    { id: "simulations", tags: "ISO 22301 cl. 8.5" },
    { id: "bascules", tags: "ISO A.5.30 · A.8.13 · CIS 11" },
    { id: "exercice-complet", tags: "ISO 22301 cl. 8.5" },
    { id: "scenarios", tags: "ISO 22301 cl. 8.5" },
    { id: "evaluation", tags: "ISO 22301 cl. 8.5 · 9.1" },
    { id: "retex", tags: "ISO 22301 cl. 10 · NIST ID.IM" },
  ],
};

// Items de la checklist de référence d'un code de type (ou null si aucune).
function grcContTypeChecklist(code) {
  const slug = GRC_CONT_TYPE_CHECKLIST_SLUG[code];
  return slug && GRC_CONT_TYPE_CHECKLISTS[slug] ? { slug: slug, items: GRC_CONT_TYPE_CHECKLISTS[slug] } : null;
}

// Clé de stockage d'une checklist = ANCIEN chemin de sous-page, résolu contre
// la page courante (identique sous file:// et http) : conserve l'état existant
// et la lecture par readDomainCoverage. Vaut pour les types ET les sections.
function grcContTypeChecklistKey(slug) {
  const path = new URL("continuite/" + slug + ".html", location.href).pathname;
  return grcChecklistKeyFor(path);
}

// Reconstruit l'état d'une checklist (ordre/ids stables) depuis le stockage,
// textes re-dérivés dans la langue courante. Ne sauve pas.
function _grcContChecklistState(slug, items) {
  const key = grcContTypeChecklistKey(slug);
  let saved;
  try { saved = JSON.parse(vaultGetItem(key) || "null"); } catch (e) { saved = null; }
  const savedById = Object.create(null);
  if (saved && Array.isArray(saved.items)) {
    saved.items.forEach((it) => { if (it && it.id) savedById[it.id] = it; });
  }
  return {
    items: items.map((def) => {
      // État existant par id, sinon amorçage via un jeton '@page#N' (coche de
      // l'ancienne continuite.html monolithique, cf. grcChecklistExternalLegacy
      // -- même migration que les ex-sous-pages). Un item neuf démarre décoché.
      let prev = savedById[def.id];
      if (!prev && def.legacy && typeof grcChecklistExternalLegacy === "function") {
        String(def.legacy).split(/\s+/).filter(Boolean).forEach((tk) => {
          if (!prev && tk.charAt(0) === "@") prev = grcChecklistExternalLegacy(tk.slice(1)) || prev;
        });
      }
      const label = grcT("grc.continuite." + slug + ".c." + def.id + ".label");
      const desc = grcT("grc.continuite." + slug + ".c." + def.id + ".desc");
      return {
        id: def.id,
        text: (label + " : " + desc).trim(),
        checked: !!(prev && prev.checked),
        checkedAt: (prev && prev.checkedAt) || null,
        checkedBy: (prev && prev.checkedBy) || "",
      };
    }),
    comment: saved && typeof saved.comment === "string" ? saved.comment : "",
    commentAt: (saved && saved.commentAt) || null,
    commentBy: (saved && saved.commentBy) || "",
  };
}

/* Cœur de rendu d'une checklist (type OU section) dans un conteneur.
   Data-driven (pas de DOM de page), mais MÊME forme d'état et MÊME clé que
   initGrcChecklist() -> couverture et sauvegardes compatibles. Coche
   manuelle (décision D1). leadKey = texte d'intro (ou null). */
function _grcContRenderChecklist(container, slug, items, leadKey) {
  const key = grcContTypeChecklistKey(slug);
  const state = _grcContChecklistState(slug, items);

  if (leadKey) {
    const head = document.createElement("p");
    head.className = "grc-ir-hint";
    head.textContent = grcT(leadKey);
    container.appendChild(head);
  }

  const bar = document.createElement("div");
  bar.className = "grc-progress";
  bar.innerHTML =
    '<div class="grc-progress-track"><div class="grc-progress-fill"></div></div>' +
    '<span class="grc-progress-label"></span>';
  container.appendChild(bar);
  const fill = bar.querySelector(".grc-progress-fill");
  const label = bar.querySelector(".grc-progress-label");

  const ul = document.createElement("ul");
  ul.className = "grc-cont-checklist content-block-list";
  container.appendChild(ul);

  const embedded = window.self !== window.top;
  function persist() {
    vaultSetItem(key, JSON.stringify(state));
    const done = state.items.filter((it) => it.checked).length;
    const pct = state.items.length ? Math.round((done / state.items.length) * 100) : 0;
    fill.style.width = pct + "%";
    label.textContent = done + " / " + state.items.length + " — " + pct + "%";
    bar.classList.toggle("complete", pct === 100);
    // Prévenir le hub (même convention que initGrcChecklist) pour rafraîchir
    // le % de la carte Continuité sans rechargement.
    if (embedded) {
      try {
        window.parent.postMessage({ type: "grc-checklist-change",
          path: new URL("continuite/" + slug + ".html", location.href).pathname }, "*");
      } catch (e) { /* cross-origin indisponible */ }
    }
  }

  items.forEach((def, i) => {
    const li = document.createElement("li");
    li.className = "grc-checklist-item";
    li.dataset.itemId = def.id;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "grc-item-checkbox";
    cb.checked = state.items[i].checked;
    if (state.items[i].checked) li.classList.add("checked");
    if (state.items[i].checkedAt) li.title = grcModifiedLabel(state.items[i].checkedAt, state.items[i].checkedBy);
    cb.addEventListener("change", () => {
      state.items[i].checked = cb.checked;
      state.items[i].checkedAt = new Date().toISOString();
      state.items[i].checkedBy = grcAuthorName();
      li.classList.toggle("checked", cb.checked);
      li.title = grcModifiedLabel(state.items[i].checkedAt, state.items[i].checkedBy);
      persist();
    });
    li.appendChild(cb);
    const strong = document.createElement("strong");
    strong.textContent = grcT("grc.continuite." + slug + ".c." + def.id + ".label");
    li.appendChild(strong);
    li.appendChild(document.createTextNode(" : "));
    const span = document.createElement("span");
    span.textContent = grcT("grc.continuite." + slug + ".c." + def.id + ".desc");
    li.appendChild(span);
    if (def.tags) {
      li.appendChild(document.createTextNode(" "));
      const t = document.createElement("span");
      t.className = "grc-control-tags";
      t.textContent = def.tags;
      li.appendChild(t);
    }
    ul.appendChild(li);
  });

  persist();
}

// Onglet « Checklist » du panneau d'un plan : checklist de référence du TYPE.
function grcContRenderTypeChecklist(container, code) {
  container.innerHTML = "";
  const cl = grcContTypeChecklist(code);
  if (!cl) {
    const p = document.createElement("p");
    p.className = "grc-ir-hint";
    p.textContent = grcT(code ? "grc.continuite.checklist.none" : "grc.continuite.checklist.needType");
    container.appendChild(p);
    return;
  }
  if (typeof vaultShouldGate === "function" && vaultShouldGate() &&
      typeof vaultGateOr === "function" && vaultGateOr(container, () => grcContRenderTypeChecklist(container, code))) {
    return;
  }
  _grcContRenderChecklist(container, cl.slug, cl.items, "grc.continuite.checklist.lead");
}

// Section « remontée » sur continuite.html (BIA, Tests & exercices).
function grcContRenderSectionChecklist(container, slug) {
  const items = GRC_CONT_SECTION_CHECKLISTS[slug];
  if (!container || !items) return;
  container.innerHTML = "";
  if (typeof vaultShouldGate === "function" && vaultShouldGate() &&
      typeof vaultGateOr === "function" && vaultGateOr(container, () => grcContRenderSectionChecklist(container, slug))) {
    return;
  }
  _grcContRenderChecklist(container, slug, items, null);
}

/* Re-persiste toutes les checklists (types + sections) ayant déjà un état,
   dans la langue courante, SANS DOM. Appelé au chargement de continuite.html :
   garde le cache d'export à jour après un changement de langue, sans avoir à
   rouvrir chaque onglet (remplace la visite en iframe des ex-sous-pages). */
function grcContRepersistAll() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) return;
  const all = Object.assign({}, GRC_CONT_TYPE_CHECKLISTS, GRC_CONT_SECTION_CHECKLISTS);
  Object.keys(all).forEach((slug) => {
    const key = grcContTypeChecklistKey(slug);
    let saved = null;
    try { saved = vaultGetItem(key); } catch (e) { saved = null; }
    if (!saved) return; // jamais visitée -> rien à rafraîchir
    try { vaultSetItem(key, JSON.stringify(_grcContChecklistState(slug, all[slug]))); } catch (e) { /* ignore */ }
  });
}
