/* Documentation de l'organisation par élément (spec/grc-fiches/).

   Une page GRC (ex. Contexte organisationnel) décrit des ÉLÉMENTS à
   documenter (Mission et vision, Contexte interne, Parties prenantes…).
   Chaque élément est un petit registre : « + Ajouter » ouvre un
   formulaire aux champs prédéfinis pour CET élément, et l'utilisateur
   saisit autant d'entrées que nécessaire (ex. plusieurs énoncés de
   mission / vision, plusieurs enjeux internes, plusieurs parties
   prenantes). Ensemble, les entrées forment le document de
   l'organisation pour la page (export Word / PDF).

   La checklist de la page reste À PART : elle ne sert qu'au suivi
   d'avancement (%) et n'est pas touchée ici.

   - Définitions : un fichier par page (grc-fiches-<page>.js) qui appelle
     grcFicheRegister(page, def). Libellés { fr, en } enregistrés dans
     I18N_DICT sous "grc.fiche.<page>.<élément>.*" pour passer par grcT
     comme le reste du kit.
   - Stockage : un store grkStore par élément, clé
     "/grc/fiches/<page>/<élément>" (préfixe protégé par le coffre, voir
     vault.js ; inclus dans la sauvegarde complète des Paramètres).
   - Rendu : grkRegistry (grc-registry-kit.js) par élément, un onglet par
     élément (un seul visible, Précédent / Suivant) pour éviter le long
     défilement ; un seul écran de déverrouillage pour toute la zone.
   - Page identifiée par <body data-fiche-page="...">, montage dans
     #grcFichesRoot par inline/init-grc-fiches.js.

   Types d'éléments (`kind`, spec/grc-fiches/plan.md §1) :
     "form" (défaut)  registre à saisie multiple (fields) ; `view(host)`
                      optionnel rendu au-dessus du formulaire.
     "register"       registre EXISTANT de la page déplacé dans l'onglet
                      (`block` = sélecteur d'un élément du bloc, `count()`,
                      `reinit()` relancé après déverrouillage du coffre).
     "view"           lecture seule d'un registre existant (`render(host)`,
                      `count()`, `doc()` -> { columns, rows } pour l'export).
     "link"           renvoi vers l'endroit où l'élément est documenté
                      (`href`, `count()` facultatif).
   Champ `ref` (formulaires) : liste alimentée par `source()` ->
   [{ v, label }] (actifs, fournisseurs, documents…), rafraîchie à
   l'ouverture de l'onglet ; la valeur stockée est l'identifiant.
   Champ `refs` : même chose, plusieurs identifiants (tableau). Raccourci
   `linkTo: "<type>"` : options tirées du catalogue grc-links.js (chaîne,
   spec/grc-fiches/chaine.md). Types `date` (AAAA-MM-JJ, `due: true` pour
   une échéance suivie dans « À faire ») et `number`.
   Champ texte `suggest` (spec/grc-suggest/) : liste de suggestions
   (<datalist>), texte libre toujours permis. "<vocabulaire>" (grc-vocab.js :
   code enregistré, affiché dans la langue du site), { from: [types] }
   (entrées de la chaîne, ex. "role" = rôles et titulaires de Gouvernance)
   ou { vocab, from } (les deux).
   Champ `hint` ({ fr, en }) : piste affichée dans le champ vide ; à défaut,
   la valeur d'`example` de l'élément (« ex. … »).

   Options d'élément (UX, spec/grc-fiches/ux-plan.md) :
     essential   U0 — affiché par défaut ; les autres onglets sont sous
                 « Afficher tout » (sauf s'ils contiennent déjà des entrées).
     lead        U1 — accroche visible, `desc` passe sous « En savoir plus ».
     emptyHint   U1 — message d'état vide.
     example     U2 — { champ: valeur | { fr, en } } pour « Partir de l'exemple ».
     cross       U5 — [{ label, page, tab, list, values(ent) }] actions croisées.
     checklist   U3 — index des items de checklist reliés (sinon même ordre).
   Options de page : `groups` (U4), statut du document `_meta` (U7).

   Aucun fetch(), aucune librairie tierce ; tout texte saisi passe par
   textContent (rendu) ou grkEscapeHtml (exports). */

const GRC_FICHES_PREFIX = "/grc/fiches/";
const GRC_FICHE_DEFS = {};

// Libellé bilingue inline { fr, en } -> langue du site.
function grcFicheL(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  const en = typeof getSavedLang === "function" && getSavedLang() === "en";
  return (en ? v.en : v.fr) || v.fr || "";
}

function _grcFicheIsForm(el) {
  return !el.kind || el.kind === "form";
}

function grcFicheKeyPrefix(page, elemId) {
  return "grc.fiche." + page + "." + elemId;
}

function _grcFichePut(key, v) {
  if (typeof I18N_DICT === "undefined" || v == null) return;
  I18N_DICT[key] = typeof v === "string" ? { fr: v, en: v } : { fr: v.fr, en: v.en || v.fr };
}

// Champs date (U1) : libellés « (AAAA-MM-JJ) » et identifiants usuels.
const _GRC_FICHE_DATE_IDS = ["date", "echeance", "dateApprobation", "derniereMaj", "prochaineRevue", "dateRevue", "dateDebut", "dateFin"];
const _GRC_FICHE_DUE_IDS = ["echeance", "prochaineRevue", "dateRevue"];

function _grcFicheNormField(f) {
  const fr = f.label && typeof f.label === "object" ? f.label.fr || "" : String(f.label || "");
  if ((!f.type || f.type === "text") && (/AAAA-MM-JJ/.test(fr) || _GRC_FICHE_DATE_IDS.indexOf(f.id) !== -1)) {
    f.type = "date";
    if (f.label && typeof f.label === "object") {
      f.label = { fr: (f.label.fr || "").replace(/\s*\(AAAA-MM-JJ\)/, ""), en: (f.label.en || "").replace(/\s*\(YYYY-MM-DD\)/, "") };
    }
  }
  if (f.type === "date" && f.due == null && _GRC_FICHE_DUE_IDS.indexOf(f.id) !== -1) f.due = true;
  if (f.linkTo && !f.source) {
    const t = f.linkTo;
    f.source = () => (typeof grcLinksOptions === "function" ? grcLinksOptions(t) : []);
  }
  if (f.linkTo && !f.type) f.type = f.multi ? "refs" : "ref";
  if (f.suggest && (!f.type || f.type === "text")) {
    const sg = typeof f.suggest === "string" ? { vocab: f.suggest } : f.suggest;
    f._sgVocab = sg.vocab || null;
    f._sgFrom = Array.isArray(sg.from) ? sg.from : (sg.from ? [sg.from] : []);
  }
  return f;
}

/* ---------- suggestions (spec/grc-suggest/) ------------------------ */

// Noms proposés pour un type de la chaîne. "role" : rôle, titulaire et
// suppléant de Gouvernance › Rôles (personnes ET fonctions).
function _grcFicheSuggestFrom(type) {
  try {
    if (type === "role") {
      const out = [];
      const roleName = (v) => (typeof grcVocabDisplay === "function" ? grcVocabDisplay("roles", v) : String(v));
      grcFicheEntries("gouvernance", "roles").forEach((e) => {
        [e.role ? roleName(e.role) : "", e.titulaire, e.suppleant].forEach((v) => { if (v && String(v).trim()) out.push(String(v).trim()); });
      });
      return out;
    }
    return typeof grcLinksOptions === "function" ? grcLinksOptions(type).map((o) => grcFicheL(o.label)) : [];
  } catch (e) {
    return [];
  }
}

// Suggestions d'un champ : entrées de l'organisation d'abord, puis le vocabulaire.
function grcFicheSuggestions(f) {
  const own = [];
  (f._sgFrom || []).forEach((t) => { own.push.apply(own, _grcFicheSuggestFrom(t)); });
  const voc = f._sgVocab && typeof grcVocabLabels === "function" ? grcVocabLabels(f._sgVocab) : [];
  return own.concat(voc);
}

/* Indice affiché dans un champ vide (spec/grc-suggest/ §8) : `hint`
   ({ fr, en }, piste rédigée) sinon la valeur d'exemple de l'élément
   (U2, « Partir de l'exemple »), préfixée « ex. » et tronquée. Jamais sur
   un champ à suggestions, une liste ou une date. */
const _GRC_FICHE_PH_MAX = 90;

function _grcFichePlaceholder(el, f) {
  if (f._sgVocab || (f._sgFrom && f._sgFrom.length)) return "";
  if (f.type && ["text", "textarea", "number"].indexOf(f.type) === -1) return "";
  if (f.hint) return grcFicheL(f.hint);
  const ex = el.example ? el.example[f.id] : null;
  if (ex == null || ex === "" || Array.isArray(ex)) return "";
  let v = typeof ex === "object" ? grcFicheL(ex) : String(ex);
  v = v.replace(/\s+/g, " ").trim();
  if (!v) return "";
  if (v.length > _GRC_FICHE_PH_MAX) {
    const cut = v.slice(0, _GRC_FICHE_PH_MAX);
    v = cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).replace(/[\s,;:.–—-]+$/, "") + "…";
  }
  return grcT("grc.fiche.ui.examplePrefix") + v;
}

function _grcFicheVocabEncode(f, v) {
  return f._sgVocab && typeof grcVocabEncode === "function" ? grcVocabEncode(f._sgVocab, v) : v;
}

function _grcFicheVocabDisplay(f, v) {
  return f._sgVocab && typeof grcVocabDisplay === "function" ? grcVocabDisplay(f._sgVocab, v) : (v == null ? "" : String(v));
}

function grcFicheRegister(page, def) {
  GRC_FICHE_DEFS[page] = def;
  def.elements.forEach((el) => { (el.fields || []).forEach(_grcFicheNormField); });
  // Chaîne : chaque élément formulaire est un type d'entité du catalogue
  // (« dépend de / utilisé par » sur toutes les entrées, chaine.md CH1).
  if (typeof GRC_LINK_TYPES !== "undefined" && typeof _ficheType === "function") {
    def.elements.filter(_grcFicheIsForm).forEach((el) => {
      const key = GRC_FICHES_PREFIX + page + "/" + el.id;
      const hf = (el.header || [el.fields[0].id])[0];
      const named = Object.keys(GRC_LINK_TYPES).find((t) => GRC_LINK_TYPES[t].key === key);
      const lbl = (e) => {
        const f = el.fields.find((x) => x.id === hf);
        return f ? _grcFicheValue(page, el, f, e[hf]) : "";
      };
      if (named) GRC_LINK_TYPES[named].label = (e) => lbl(e) || e.id;
      else GRC_LINK_TYPES["f:" + page + "/" + el.id] = _ficheType(page, el.id, hf, el.title, { label: (e) => lbl(e) || e.id });
    });
  }
  _grcFichePut("grc.fiche." + page + ".docTitle", def.docTitle);
  def.elements.forEach((el) => {
    const k = grcFicheKeyPrefix(page, el.id);
    _grcFichePut(k + ".title", el.title);
    _grcFichePut(k + ".desc", el.desc);
    _grcFichePut(k + ".ref", el.ref);
    _grcFichePut(k + ".add", el.add || { fr: "+ Ajouter", en: "+ Add" });
    _grcFichePut(k + ".formTitle", el.title);
    (el.fields || []).forEach((f) => {
      _grcFichePut(k + ".f." + f.id, f.label);
      (f.options || []).forEach((o) => _grcFichePut(k + ".f." + f.id + "." + o.v, o.label));
    });
    (el.links || []).forEach((l, j) => _grcFichePut(k + ".link" + j, l.label));
    _grcFichePut(k + ".lead", el.lead);
    _grcFichePut(k + ".emptyHint", el.emptyHint);
  });
  (def.groups || []).forEach((g) => _grcFichePut("grc.fiche." + page + ".group." + g.id, g.title));
}

const _GRC_FICHE_UI = {
  "grc.fiche.ui.title": { fr: "Documentation de l’organisation", en: "Organization documentation" },
  "grc.fiche.ui.hint": {
    fr: "Documente chaque élément avec « + Ajouter », dans l’ordre des onglets. La checklist plus bas sert uniquement au suivi d’avancement.",
    en: "Document each element with \"+ Add\", in tab order. The checklist further down is only for progress tracking."
  },
  "grc.fiche.ui.toc": { fr: "Éléments", en: "Elements" },
  "grc.fiche.ui.prev": { fr: "← Précédent", en: "← Previous" },
  "grc.fiche.ui.next": { fr: "Suivant →", en: "Next →" },
  "grc.fiche.ui.exportWord": { fr: "Exporter Word", en: "Export Word" },
  "grc.fiche.ui.exportPdf": { fr: "Exporter PDF", en: "Export PDF" },
  "grc.fiche.ui.exportJson": { fr: "Exporter JSON", en: "Export JSON" },
  "grc.fiche.ui.importJson": { fr: "Importer JSON", en: "Import JSON" },
  "grc.fiche.ui.reset": { fr: "Réinitialiser la documentation", en: "Reset documentation" },
  "grc.fiche.ui.confirmReset": {
    fr: "Effacer toutes les entrées de documentation de cette page ? Cette action est irréversible (exporte d’abord en JSON si besoin).",
    en: "Clear every documentation entry on this page? This cannot be undone (export to JSON first if needed)."
  },
  "grc.fiche.ui.confirmImport": {
    fr: "Importer ce fichier remplacera toutes les entrées de documentation de cette page. Continuer ?",
    en: "Importing this file will replace every documentation entry on this page. Continue?"
  },
  "grc.fiche.ui.badImport": { fr: "Fichier invalide pour cette page.", en: "Invalid file for this page." },
  "grc.fiche.ui.imported": { fr: "Documentation importée.", en: "Documentation imported." },
  "grc.fiche.ui.generatedOn": { fr: "Généré le", en: "Generated on" },
  "grc.fiche.ui.by": { fr: "par", en: "by" },
  "grc.fiche.ui.none": { fr: "Aucune entrée.", en: "No entry." },
  "grc.fiche.ui.seeAlso": { fr: "Voir aussi :", en: "See also:" },
  "grc.fiche.ui.updated": { fr: "Modifié le {date}", en: "Updated {date}" },
  "grc.fiche.ui.updatedBy": { fr: "Modifié le {date} par {by}", en: "Updated {date} by {by}" },
  "grc.fiche.ui.refNone": { fr: "— aucun —", en: "— none —" },
  "grc.fiche.ui.manage": { fr: "Gérer dans le registre", en: "Manage in the register" },
  "grc.fiche.ui.examplePrefix": { fr: "ex. ", en: "e.g. " },
  "grc.fiche.ui.goTo": { fr: "Ouvrir", en: "Open" },
  "grc.fiche.ui.refMissing": { fr: "(élément supprimé)", en: "(deleted item)" },
  "grc.fiche.ui.seeRegister": { fr: "Voir le registre de la page.", en: "See the page register." },
  "grc.fiche.ui.linkedTo": { fr: "Documenté dans :", en: "Documented in:" },
  "grc.fiche.ui.showAll": { fr: "Afficher tout ({n} de plus)", en: "Show all ({n} more)" },
  "grc.fiche.ui.showEssential": { fr: "Essentiel seulement", en: "Essentials only" },
  "grc.fiche.ui.more": { fr: "En savoir plus", en: "Learn more" },
  "grc.fiche.ui.emptyGeneric": { fr: "Aucune entrée pour l’instant : commence avec « + Ajouter » ou « Partir de l’exemple ».", en: "No entry yet: start with \"+ Add\" or \"Start from the example\"." },
  "grc.fiche.ui.nextStep": { fr: "Étape suivante : {page} →", en: "Next step: {page} →" },
  "grc.fiche.ui.prevStep": { fr: "← Étape précédente : {page}", en: "← Previous step: {page}" },
  "grc.fiche.ui.entries": { fr: "{n} entrée(s) →", en: "{n} entr(y/ies) →" },
  "grc.fiche.ui.toDocument": { fr: "à documenter →", en: "to document →" },
  "grc.fiche.ui.progress": { fr: "Documenté et relié : {p} % ({d}/{t})", en: "Documented and linked: {p}% ({d}/{t})" },
  "grc.fiche.ui.ruptures": { fr: "{n} rupture(s) de chaîne", en: "{n} chain break(s)" },
  "grc.fiche.ui.toRelink": { fr: "à relier", en: "to link" },
  "grc.fiche.ui.demoBanner": { fr: "Exemple FSociety chargé (données fictives).", en: "FSociety example loaded (fictional data)." },
  "grc.fiche.ui.demoTag": { fr: "Exemple FSociety actif", en: "FSociety example active" },
  "grc.fiche.ui.demoRemove": { fr: "Retirer l’exemple", en: "Remove the example" },
  "grc.fiche.ui.addAction": { fr: "+ Ajouter une action", en: "+ Add an action" },
  "grc.fiche.ui.openImprovement": { fr: "Ouvrir le registre d’amélioration (Gouvernance)", en: "Open the improvement register (Governance)" },
  "grc.fiche.meta.title": { fr: "Statut du document", en: "Document status" },
  "grc.fiche.meta.status": { fr: "Statut", en: "Status" },
  "grc.fiche.meta.s.brouillon": { fr: "Brouillon", en: "Draft" },
  "grc.fiche.meta.s.revue": { fr: "En revue", en: "In review" },
  "grc.fiche.meta.s.approuve": { fr: "Approuvé", en: "Approved" },
  "grc.fiche.meta.s.revision": { fr: "En révision", en: "Under revision" },
  "grc.fiche.meta.version": { fr: "Version", en: "Version" },
  "grc.fiche.meta.approver": { fr: "Approbateur", en: "Approver" },
  "grc.fiche.meta.approvedOn": { fr: "Approuvé le", en: "Approved on" },
  "grc.fiche.meta.nextReview": { fr: "Prochaine revue", en: "Next review" },
  "grc.fiche.meta.edit": { fr: "Modifier le statut", en: "Edit status" },
  "grc.fiche.meta.history": { fr: "Historique des approbations", en: "Approval history" },
  "grc.fiche.meta.revised": {
    fr: "Ce document était approuvé : la modification le repasse « En révision ». Fais-le réapprouver.",
    en: "This document was approved: the change puts it back \"Under revision\". Have it re-approved."
  },
  "grc.fiche.meta.limits": {
    fr: "Limites : approbation déclarative (aucune signature électronique), application locale sans serveur, bilans indicatifs — ne remplace pas un audit.",
    en: "Limits: declarative approval (no electronic signature), local app without a server, indicative reports — does not replace an audit."
  },
};
if (typeof I18N_DICT !== "undefined") Object.assign(I18N_DICT, _GRC_FICHE_UI);

/* ---------- accès aux registres existants (vues, champs ref) -------
   Lecture seule, dégradée : un registre dont le script n'est pas chargé
   sur la page renvoie []. */
function _grcFicheCall(name, linkType) {
  try {
    const fn = typeof window !== "undefined" ? window[name] : null;
    // Registre non chargé sur la page (hub, tableau de bord) : lecture
    // directe du stockage via le catalogue de la chaîne.
    const out = typeof fn === "function" ? fn()
      : (linkType && typeof grcLinksCtx === "function" ? _grcFicheCtxList(linkType) : []);
    return Array.isArray(out) ? out.filter((x) => x && typeof x === "object") : [];
  } catch (e) {
    return [];
  }
}

function _grcFicheCtxList(type) {
  const def = _grcLinksResolveType(type);
  return def && def.key ? _grcLinksReadKey(def.key) : [];
}

// `href` / `links[].href` des définitions : relatifs au dossier grc/, préfixés
// pour les pages en sous-dossier (Sécurité opérationnelle, Continuité).
function grcFicheHref(h) {
  if (!h || /^([a-z][a-z0-9+.-]*:|\/|#|\.\.\/)/i.test(h)) return h || "#";
  return (typeof grcLinksBase === "function" ? grcLinksBase() : "") + h;
}

const grcFicheSrc = {
  assets: () => _grcFicheCall("getGrcAssets", "asset"),
  risks: () => _grcFicheCall("getGrcRisks", "risk"),
  treatmentPlans: () => _grcFicheCall("getGrcTreatmentPlans", "plan"),
  controls: () => _grcFicheCall("getGrcControls", "control"),
  incidents: () => _grcFicheCall("getGrcIncidents", "incident"),
  continuity: () => _grcFicheCall("getGrcContinuity", "continuity"),
  suppliers: () => _grcFicheCall("getGrcSuppliers", "supplier"),
  compliance: () => _grcFicheCall("getGrcCompliance", "obligation"),
  privacy: () => _grcFicheCall("getGrcPrivacy", "processing"),
  metrics: () => _grcFicheCall("getGrcMetrics", "metric"),
  documents: () => _grcFicheCall("getGrcDocuments", "document"),
};

// Options d'un champ `ref` : [{ v: id, label }] depuis une liste d'entités.
function grcFicheRefFrom(list, labelOf) {
  return (Array.isArray(list) ? list : []).filter((x) => x && x.id)
    .map((x) => ({ v: x.id, label: String(labelOf(x) || x.id) }));
}

function grcFicheFmtDate(iso) {
  if (!iso) return "";
  const t = Date.parse(iso);
  return isNaN(t) ? String(iso) : new Date(t).toISOString().slice(0, 10);
}

/* ---------- stockage ---------------------------------------------- */

function grcFicheStore(page, elemId) {
  return grkStore(GRC_FICHES_PREFIX + page + "/" + elemId);
}

// Normalise une entrée selon les champs de l'élément (chaînes ; select
// restreint à ses options, 1re option par défaut ; champs inconnus ignorés).
function grcFicheCleanEntry(el, src) {
  const e = src && typeof src === "object" ? src : {};
  const out = {};
  el.fields.forEach((f) => {
    const v = e[f.id];
    if (f.type === "select") {
      out[f.id] = (f.options || []).some((o) => o.v === v) ? v : (f.options && f.options[0] ? f.options[0].v : "");
    } else if (f.type === "ref") {
      out[f.id] = v == null ? "" : String(v);
    } else if (f.type === "refs") {
      const lv = f.legacy && v == null ? e[f.legacy] : v;
      const arr = Array.isArray(lv) ? lv : (lv ? [lv] : []);
      out[f.id] = arr.filter((x) => typeof x === "string" && x).filter((x, i, a) => a.indexOf(x) === i);
    } else if (f._sgVocab) {
      out[f.id] = _grcFicheVocabEncode(f, v == null ? "" : String(v).trim());
    } else {
      out[f.id] = v == null ? "" : String(v).trim();
    }
  });
  return out;
}

function grcFicheEntries(page, elemId) {
  const list = grcFicheStore(page, elemId).get();
  return Array.isArray(list) ? list.filter((x) => x && typeof x === "object") : [];
}

function _grcFicheRefOptions(f) {
  try {
    const list = typeof f.source === "function" ? f.source() : [];
    return Array.isArray(list) ? list.filter((o) => o && o.v) : [];
  } catch (e) {
    return [];
  }
}

function _grcFicheValue(page, el, f, v) {
  if (!f) return "";
  if (f.type === "ref" || f.type === "refs") {
    const ids = Array.isArray(v) ? v : (v ? [v] : []);
    if (!ids.length) return "";
    const opts = _grcFicheRefOptions(f);
    return ids.map((id) => {
      const o = opts.find((x) => x.v === id);
      return o ? grcFicheL(o.label) : grcT("grc.fiche.ui.refMissing");
    }).join(" · ");
  }
  if (f._sgVocab) return _grcFicheVocabDisplay(f, v);
  if (f.type !== "select") return v == null ? "" : String(v);
  return (f.options || []).some((o) => o.v === v) ? grcT(grcFicheKeyPrefix(page, el.id) + ".f." + f.id + "." + v) : (v || "");
}

/* ---------- registre d'un élément --------------------------------- */

function _grcFicheMountElement(page, el, host, onChange) {
  const k = grcFicheKeyPrefix(page, el.id);
  const store = grcFicheStore(page, el.id);
  const mountId = "grcFiche-" + el.id;
  const mount = document.createElement("div");
  mount.id = mountId;
  mount.className = "grc-fiche-registry";
  host.appendChild(mount);

  const listGlobal = grcFicheListGlobal(page, el.id);
  const headerFields = (el.header || [el.fields[0].id]).map((fid) => el.fields.find((x) => x.id === fid));
  const init = grkRegistry({
    mount: "#" + mountId,
    store: store,
    idAttr: "data-fiche-id",
    listGlobal: listGlobal,
    i18n: { add: k + ".add", titleAdd: k + ".formTitle", titleEdit: k + ".formTitle" },
    form: el.fields.map((f) => {
      let options;
      let type = f.type === "textarea" ? "textarea" : (f.type === "date" || f.type === "number" ? f.type : "text");
      if (f.type === "select") {
        options = f.options.map((o) => ({ value: o.v, label: k + ".f." + f.id + "." + o.v }));
        type = "select";
      } else if (f.type === "ref") {
        // Liste recalculée à chaque ouverture du formulaire ; les libellés
        // saisis ne sont pas traduits (seules les clés « grc. » le sont).
        options = () => [{ value: "", label: "grc.fiche.ui.refNone" }]
          .concat(_grcFicheRefOptions(f).map((o) => ({ value: o.v, label: grcFicheL(o.label) })));
        type = "select";
      } else if (f.type === "refs") {
        options = () => _grcFicheRefOptions(f).map((o) => ({ value: o.v, label: grcFicheL(o.label) }));
        type = "multi";
      }
      const spec = { id: f.id, label: k + ".f." + f.id, type: type, required: !!f.required, options: options };
      if (f._sgVocab || (f._sgFrom && f._sgFrom.length)) spec.suggest = () => grcFicheSuggestions(f);
      const ph = _grcFichePlaceholder(el, f);
      if (ph) spec.placeholder = ph;
      return spec;
    }),
    readForm: (ent) => {
      const v = {};
      el.fields.forEach((f) => {
        if (f.type === "refs") {
          const raw = ent[f.id] == null && f.legacy ? ent[f.legacy] : ent[f.id];
          v[f.id] = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        }
        else if (f._sgVocab) v[f.id] = _grcFicheVocabDisplay(f, ent[f.id]);
        else v[f.id] = ent[f.id] == null ? "" : ent[f.id];
      });
      return v;
    },
    submit: (values, editingId) => {
      const fields = grcFicheCleanEntry(el, values);
      fields.updatedAt = new Date().toISOString();
      fields.updatedBy = typeof grcAuthorName === "function" ? grcAuthorName() : "";
      const list = store.get();
      if (editingId) {
        const idx = list.findIndex((x) => x && x.id === editingId);
        if (idx !== -1) list[idx] = Object.assign({}, list[idx], fields);
      } else {
        list.push(Object.assign({ id: grkId("fiche") }, fields));
      }
      store.save(list);
      grcFicheTouched(page);
      onChange();
    },
    onDelete: () => { grcFicheTouched(page); onChange(); },
    example: el.example ? () => _grcFicheExampleValues(el) : null,
    autoFill: el.autoFill ? { label: grcFicheL(el.autoFill.label), values: el.autoFill.values } : null,
    actions: Array.isArray(el.cross) && el.cross.length ? (ent) => el.cross.map((c) => ({
      label: grcFicheL(c.label),
      run: () => grcFicheCrossOpen(c, typeof c.values === "function" ? c.values(ent) : {}),
    })) : null,
    header: (ent) => headerFields.map((f) => {
      const txt = _grcFicheValue(page, el, f, ent[f.id]);
      if (f.type === "select" || f.type === "ref" || f.type === "refs") return { badge: { cls: "grc-fiche-badge", text: txt } };
      return { text: txt.length > 120 ? txt.slice(0, 117) + "…" : txt };
    }).concat(_grcFicheMissingLinks(el, ent) ? [{ badge: { cls: "grc-fiche-badge grc-fiche-relink", text: grcT("grc.fiche.ui.toRelink") } }] : []),
    panel: (body, ent) => {
      const dl = document.createElement("dl");
      dl.className = "grc-fiche-detail";
      el.fields.forEach((f) => {
        const v = _grcFicheValue(page, el, f, ent[f.id]);
        if (!v) return;
        const dt = document.createElement("dt");
        dt.textContent = grcT(k + ".f." + f.id);
        const dd = document.createElement("dd");
        dd.textContent = v;
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      body.appendChild(dl);
      if (ent.updatedAt) {
        const p = document.createElement("p");
        p.className = "grc-fiche-stamp";
        const date = typeof grcFormatTimestamp === "function" ? grcFormatTimestamp(ent.updatedAt) : ent.updatedAt;
        p.textContent = ent.updatedBy
          ? grcT("grc.fiche.ui.updatedBy").replace("{date}", date).replace("{by}", ent.updatedBy)
          : grcT("grc.fiche.ui.updated").replace("{date}", date);
        body.appendChild(p);
      }
    },
    confirmName: (ent) => {
      const f = headerFields.find((x) => x.type !== "select" && x.type !== "ref" && x.type !== "refs") || headerFields[0];
      return _grcFicheValue(page, el, f, ent[f.id]).slice(0, 80);
    },
  });
  init();
}

function grcFicheListGlobal(page, elemId) {
  return "renderGrcFiche_" + page.replace(/[^a-zA-Z0-9]/g, "_") + "_" + elemId.replace(/[^a-zA-Z0-9]/g, "_");
}

// Lien obligatoire vide (D3 : « documenté » = entrée + liens obligatoires).
function _grcFicheMissingLinks(el, ent) {
  return el.fields.some((f) => (f.type === "ref" || f.type === "refs") && f.required &&
    !(Array.isArray(ent[f.id]) ? ent[f.id].length : ent[f.id]));
}

// Valeurs de l'exemple (U2) dans la langue du site. Un lien n'est
// pré-rempli que si sa cible existe (jamais de lien inventé).
function _grcFicheExampleValues(el) {
  const out = {};
  Object.keys(el.example || {}).forEach((fid) => {
    const f = el.fields.find((x) => x.id === fid);
    if (!f) return;
    const v = el.example[fid];
    if (f.type === "ref" || f.type === "refs") {
      const ids = (Array.isArray(v) ? v : [v]).filter((id) => _grcFicheRefOptions(f).some((o) => o.v === id));
      out[fid] = f.type === "refs" ? ids : (ids[0] || "");
    } else if (f.type === "select") {
      out[fid] = v;
    } else {
      out[fid] = grcFicheL(v);
    }
  });
  return out;
}

/* ---------- actions croisées (U5) ----------------------------------
   Ouvre le formulaire d'un autre élément / registre pré-rempli, sur la
   même page ou une autre (valeurs transmises par sessionStorage, reprises
   par grcFichesInit). cible = { page, tab, list } — `list` = listGlobal
   du registre (ex. "renderGrcRisks") ou d'un élément de fiche. */
const _GRC_FICHE_PENDING = "/grc/fiches-ui/pending-prefill";

function grcFicheCrossOpen(target, values) {
  const here = document.body && document.body.dataset.fichePage;
  if (target.page === here && typeof grcFichesShow === "function") {
    grcFichesShow(target.tab);
    const fn = window[target.list];
    if (fn && fn.openWith) fn.openWith(values);
    return;
  }
  try { sessionStorage.setItem(_GRC_FICHE_PENDING, JSON.stringify({ page: target.page, tab: target.tab, list: target.list, values: values })); } catch (e) { /* stockage indisponible */ }
  const t = typeof GRC_LINK_TYPES !== "undefined" ? Object.values(GRC_LINK_TYPES).find((d) => d.fiche && d.page === target.page) : null;
  const file = target.file || (t ? t.pageFile : (typeof grcFichePageFile === "function" ? grcFichePageFile(target.page) : target.page + ".html"));
  // Depuis le hub : ouvrir dans sa fenêtre (voir grcHubOpen).
  if (typeof grcHubOpen === "function" && grcHubOpen(file + "#fiche-" + target.tab)) return;
  location.href = (typeof grcLinksBase === "function" ? grcLinksBase() : "") + file + "#fiche-" + target.tab;
}

function _grcFicheConsumePending(page) {
  let p = null;
  try {
    p = JSON.parse(sessionStorage.getItem(_GRC_FICHE_PENDING) || "null");
    if (p && p.page === page) sessionStorage.removeItem(_GRC_FICHE_PENDING);
  } catch (e) { p = null; }
  if (!p || p.page !== page) return;
  setTimeout(() => {
    if (grcFichesShow) grcFichesShow(p.tab);
    const fn = window[p.list];
    if (fn && fn.openWith) fn.openWith(p.values || {});
  }, 0);
}

/* ---------- statut du document (U7) -------------------------------- */

function _grcFicheMetaKey(page) {
  return GRC_FICHES_PREFIX + page + "/_meta";
}

function grcFicheMeta(page) {
  try {
    const raw = vaultGetItem(_grcFicheMetaKey(page));
    const m = raw ? JSON.parse(raw) : null;
    if (m && typeof m === "object" && !Array.isArray(m)) return Object.assign({ status: "brouillon", history: [] }, m);
  } catch (e) { /* valeur illisible : défaut */ }
  return { status: "brouillon", version: "", approver: "", approvedOn: "", nextReview: "", history: [] };
}

function grcFicheSaveMeta(page, m) {
  vaultSetItem(_grcFicheMetaKey(page), JSON.stringify(m));
}

// Toute modification d'un document approuvé le repasse « en révision ».
function grcFicheTouched(page) {
  const m = grcFicheMeta(page);
  if (m.status !== "approuve") return;
  m.status = "revision";
  grcFicheSaveMeta(page, m);
  alert(grcT("grc.fiche.meta.revised"));
  const box = document.querySelector(".grc-fiche-meta");
  if (box && box._render) box._render();
}

function _grcFicheMetaBox(page, summaryBadge) {
  const box = document.createElement("div");
  box.className = "grc-fiche-meta";
  const render = () => {
    const m = grcFicheMeta(page);
    box.innerHTML = "";
    if (summaryBadge) {
      summaryBadge.className = "grc-fiche-badge grc-fiche-status grc-fiche-head-status grc-fiche-status-" + m.status;
      summaryBadge.textContent = grcT("grc.fiche.meta.s." + m.status);
    }
    const line = document.createElement("p");
    line.className = "grc-fiche-meta-line";
    const b = document.createElement("span");
    b.className = "grc-fiche-badge grc-fiche-status grc-fiche-status-" + m.status;
    b.textContent = grcT("grc.fiche.meta.s." + m.status);
    line.appendChild(document.createTextNode(grcT("grc.fiche.meta.title") + " : "));
    line.appendChild(b);
    const parts = [];
    if (m.version) parts.push(grcT("grc.fiche.meta.version") + " " + m.version);
    if (m.approver) parts.push(grcT("grc.fiche.meta.approver") + " : " + m.approver);
    if (m.approvedOn) parts.push(grcT("grc.fiche.meta.approvedOn") + " " + m.approvedOn);
    if (m.nextReview) parts.push(grcT("grc.fiche.meta.nextReview") + " : " + m.nextReview);
    if (parts.length) line.appendChild(document.createTextNode(" · " + parts.join(" · ")));
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "grc-registry-io-btn grc-fiche-meta-edit";
    edit.textContent = grcT("grc.fiche.meta.edit");
    line.appendChild(edit);
    box.appendChild(line);

    const form = document.createElement("form");
    form.className = "grc-registry-form grc-fiche-meta-form";
    form.hidden = true;
    const mk = (id, type, val, opts) => {
      const l = document.createElement("label");
      l.appendChild(document.createTextNode(grcT("grc.fiche.meta." + id) + " "));
      let c;
      if (opts) {
        c = document.createElement("select");
        opts.forEach((o) => {
          const op = document.createElement("option");
          op.value = o;
          op.textContent = grcT("grc.fiche.meta.s." + o);
          c.appendChild(op);
        });
      } else {
        c = document.createElement("input");
        c.type = type;
      }
      c.name = id;
      c.value = val || "";
      l.appendChild(c);
      form.appendChild(l);
    };
    mk("status", null, m.status, ["brouillon", "revue", "approuve", "revision"]);
    mk("version", "text", m.version);
    mk("approver", "text", m.approver);
    mk("approvedOn", "date", m.approvedOn);
    mk("nextReview", "date", m.nextReview);
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "grc-registry-add-btn";
    save.textContent = grcT("grc.common.btnSave");
    form.appendChild(save);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const next = Object.assign({}, m);
      ["status", "version", "approver", "approvedOn", "nextReview"].forEach((x) => { next[x] = String(f.get(x) || "").trim(); });
      if (next.status === "approuve" && m.status !== "approuve") {
        if (!next.approvedOn) next.approvedOn = new Date().toISOString().slice(0, 10);
        next.history = (m.history || []).concat([{ version: next.version, approver: next.approver, date: next.approvedOn }]);
      }
      grcFicheSaveMeta(page, next);
      render();
    });
    edit.addEventListener("click", () => { form.hidden = !form.hidden; });
    box.appendChild(form);

    if ((m.history || []).length) {
      const d = document.createElement("details");
      const sm = document.createElement("summary");
      sm.textContent = grcT("grc.fiche.meta.history") + " (" + m.history.length + ")";
      d.appendChild(sm);
      const ul = document.createElement("ul");
      m.history.forEach((h) => {
        const li = document.createElement("li");
        li.textContent = [h.date, h.version, h.approver].filter(Boolean).join(" · ");
        ul.appendChild(li);
      });
      d.appendChild(ul);
      box.appendChild(d);
    }
  };
  box._render = render;
  render();
  return box;
}

/* ---------- avancement (U3) ---------------------------------------
   « Documenté » (D3) : au moins une entrée et aucun lien obligatoire vide.
   Éléments pris en compte : formulaires et registres existants (les vues
   et renvois reflètent d'autres éléments). Utilisable hors de la page
   (hub) dès que le fichier de définitions est chargé. */
function grcFicheElementDone(page, el) {
  if (_grcFicheIsForm(el)) {
    const list = grcFicheEntries(page, el.id);
    return list.length > 0 && !list.some((e) => _grcFicheMissingLinks(el, e));
  }
  if (el.kind === "register") return (grcFicheCount(page, el) || 0) > 0;
  return null;
}

function grcFicheProgress(page) {
  const def = GRC_FICHE_DEFS[page];
  if (!def || def.plain) return null;
  let t = 0;
  let d = 0;
  def.elements.forEach((el) => {
    const r = grcFicheElementDone(page, el);
    if (r == null) return;
    t++;
    if (r) d++;
  });
  return { done: d, total: t, pct: t ? Math.round((d * 100) / t) : 0 };
}

/* ---------- document de l'organisation (exports) ------------------ */

function grcFicheDocumentBody(page) {
  const def = GRC_FICHE_DEFS[page];
  const esc = grkEscapeHtml;
  const lang = typeof getSavedLang === "function" && getSavedLang() === "en" ? "en-CA" : "fr-CA";
  const author = typeof grcAuthorName === "function" ? grcAuthorName() : "";
  let h = "<h1>" + esc(grcT("grc.fiche." + page + ".docTitle")) + "</h1>";
  if (def.docRef) h += "<p><em>" + esc(def.docRef) + "</em></p>";
  h += "<p>" + esc(grcT("grc.fiche.ui.generatedOn")) + " " + esc(new Date().toLocaleString(lang)) +
    (author ? " " + esc(grcT("grc.fiche.ui.by")) + " " + esc(author) : "") + "</p>";
  // Page de garde (U7) : statut, version, approbation, limites (I4).
  const m = grcFicheMeta(page);
  h += "<table border='1' cellspacing='0' cellpadding='4'><tbody>" +
    [["grc.fiche.meta.status", grcT("grc.fiche.meta.s." + m.status)], ["grc.fiche.meta.version", m.version],
      ["grc.fiche.meta.approver", m.approver], ["grc.fiche.meta.approvedOn", m.approvedOn], ["grc.fiche.meta.nextReview", m.nextReview]]
      .map((r) => "<tr><th>" + esc(grcT(r[0])) + "</th><td>" + esc(r[1] || "") + "</td></tr>").join("") + "</tbody></table>";
  h += "<p><small>" + esc(grcT("grc.fiche.meta.limits")) + "</small></p>";
  const table = (t) => {
    if (!t || !t.rows || !t.rows.length) return "<p><em>" + esc(grcT("grc.fiche.ui.none")) + "</em></p>";
    return "<table border='1' cellspacing='0' cellpadding='4'><thead><tr>" +
      t.columns.map((c) => "<th>" + esc(grcFicheL(c)) + "</th>").join("") + "</tr></thead><tbody>" +
      t.rows.map((r) => "<tr>" + r.map((c) => "<td>" + esc(c == null ? "" : c).replace(/\n/g, "<br>") + "</td>").join("") + "</tr>").join("") +
      "</tbody></table>";
  };
  def.elements.forEach((el, i) => {
    const k = grcFicheKeyPrefix(page, el.id);
    h += "<h2>" + (i + 1) + ". " + esc(grcT(k + ".title")) + "</h2>";
    if (el.ref) h += "<p><small>" + esc(grcT(k + ".ref")) + "</small></p>";
    if (el.kind === "link") {
      h += "<p>" + esc(grcT("grc.fiche.ui.linkedTo")) + " " + esc(grcT(k + ".link0")) + "</p>";
      return;
    }
    if (el.kind === "register" || el.kind === "view") {
      h += table(_grcFicheSafeTable(el));
      return;
    }
    if (el.table) h += table(_grcFicheSafeTable(el));
    h += table(_grcFicheFormTable(page, el));
  });
  return h;
}

function _grcFicheSafeTable(el) {
  try {
    return typeof el.table === "function" ? el.table() : null;
  } catch (e) {
    return null;
  }
}

function _grcFicheFormTable(page, el) {
  const k = grcFicheKeyPrefix(page, el.id);
  return {
    columns: el.fields.map((f) => grcT(k + ".f." + f.id)),
    rows: grcFicheEntries(page, el.id).map((ent) => el.fields.map((f) => _grcFicheValue(page, el, f, ent[f.id]))),
  };
}

// Nombre affiché sur l'onglet d'un élément.
function grcFicheCount(page, el) {
  try {
    if (typeof el.count === "function") return el.count();
    if (el.kind === "view" || el.kind === "register") {
      const t = _grcFicheSafeTable(el);
      return t && t.rows ? t.rows.length : 0;
    }
    if (el.kind === "link") return null;
    return grcFicheEntries(page, el.id).length;
  } catch (e) {
    return 0;
  }
}

/* Tableau en lecture seule (vues). t = { columns: [libellé], rows: [[texte]] }. */
function grcFicheRenderTable(host, t) {
  if (!t || !t.rows || !t.rows.length) {
    const p = document.createElement("p");
    p.className = "grc-fiche-hint grc-fiche-empty";
    p.textContent = t && t.empty ? grcFicheL(t.empty) : grcT("grc.fiche.ui.none");
    host.appendChild(p);
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "grc-fiche-table-wrap";
  const table = document.createElement("table");
  table.className = "grc-fiche-table";
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  t.columns.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = grcFicheL(c);
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  t.rows.forEach((r) => {
    const row = document.createElement("tr");
    r.forEach((c) => {
      const td = document.createElement("td");
      td.textContent = c == null ? "" : String(c);
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  host.appendChild(wrap);
}

// Documentation de toutes les pages dont les définitions sont chargées
// (hub GRC) et qui contiennent au moins une entrée ou un statut : ajoutée
// à l'export Word / PDF complet du hub (grcExportReportBody), en plus des
// exports propres à chaque page.
function grcFicheAllDocumentsBody() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) return "";
  const used = Object.keys(GRC_FICHE_DEFS).filter((page) => {
    if (GRC_FICHE_DEFS[page].plain) return false;
    let meta = null;
    try { meta = vaultGetItem(_grcFicheMetaKey(page)); } catch (e) { meta = null; }
    return meta || GRC_FICHE_DEFS[page].elements.some((el) => _grcFicheIsForm(el) && grcFicheEntries(page, el.id).length);
  });
  return used.map((page) => "<div style='page-break-before:always'></div>" + grcFicheDocumentBody(page)).join("");
}


function _grcFicheGated() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    alert(grcT("grc.common.vaultLockedExport"));
    return true;
  }
  return false;
}

function grcFicheExportWord(page) {
  if (_grcFicheGated()) return;
  const html =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>" + grkEscapeHtml(grcT("grc.fiche." + page + ".docTitle")) + "</title></head>" +
    "<body style='font-family:Calibri,Arial,sans-serif;'>" + grcFicheDocumentBody(page) + "</body></html>";
  triggerDownload(new Blob(["﻿", html], { type: "application/msword" }),
    "documentation-" + page + "-" + grkDateStamp() + ".doc");
}

function grcFicheExportPdf(page) {
  if (_grcFicheGated()) return;
  grkPrintWindow(grcFicheDocumentBody(page), grcT("grc.fiche." + page + ".docTitle"));
}

function grcFicheCollect(page) {
  const out = { schema: 1, page: page, elements: {} };
  GRC_FICHE_DEFS[page].elements.filter(_grcFicheIsForm).forEach((el) => { out.elements[el.id] = grcFicheEntries(page, el.id); });
  return out;
}

async function grcFicheExportJson(page) {
  if (_grcFicheGated()) return;
  const data = await vaultMaybeEncryptForExport(grcFicheCollect(page));
  exportJsonFile(data, "documentation-" + page + "-" + grkDateStamp() + ".json");
}

// Remplace la documentation de la page ; entrées normalisées, éléments
// inconnus ignorés, ids conservés (ou recréés).
async function grcFicheImportJson(page, file) {
  const raw = await readJsonFile(file);
  const data = await vaultMaybeDecryptImport(raw);
  if (!data || typeof data !== "object" || data.page !== page || !data.elements || typeof data.elements !== "object") {
    throw new Error(grcT("grc.fiche.ui.badImport"));
  }
  GRC_FICHE_DEFS[page].elements.filter(_grcFicheIsForm).forEach((el) => {
    const src = Array.isArray(data.elements[el.id]) ? data.elements[el.id] : [];
    grcFicheStore(page, el.id).save(src.filter((x) => x && typeof x === "object").map((x) => Object.assign(
      { id: typeof x.id === "string" && x.id ? x.id : grkId("fiche") },
      grcFicheCleanEntry(el, x),
      { updatedAt: typeof x.updatedAt === "string" ? x.updatedAt : null, updatedBy: typeof x.updatedBy === "string" ? x.updatedBy : "" }
    )));
  });
}

function grcFicheReset(page) {
  GRC_FICHE_DEFS[page].elements.filter(_grcFicheIsForm).forEach((el) => grcFicheStore(page, el.id).remove());
  vaultRemoveItem(_grcFicheMetaKey(page));
}

/* ---------- zone de documentation --------------------------------- */

function _grcFicheToolbar(page) {
  const bar = document.createElement("div");
  bar.className = "grc-toolbar grc-fiche-io";
  const mk = (key, fn, cls) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-toolbar-btn" + (cls ? " " + cls : "");
    b.textContent = grcT("grc.fiche.ui." + key);
    b.dataset.action = key;
    b.addEventListener("click", fn);
    bar.appendChild(b);
  };
  const file = document.createElement("input");
  file.type = "file";
  file.accept = ".json,application/json";
  file.style.display = "none";
  file.addEventListener("change", async () => {
    const f = file.files[0];
    file.value = "";
    if (!f || !confirm(grcT("grc.fiche.ui.confirmImport"))) return;
    try {
      await grcFicheImportJson(page, f);
      alert(grcT("grc.fiche.ui.imported"));
      location.reload();
    } catch (e) {
      alert((e && e.message) || grcT("grc.fiche.ui.badImport"));
    }
  });
  mk("exportWord", () => grcFicheExportWord(page));
  mk("exportPdf", () => grcFicheExportPdf(page));
  mk("exportJson", () => grcFicheExportJson(page));
  mk("importJson", () => file.click());
  mk("reset", () => {
    if (!confirm(grcT("grc.fiche.ui.confirmReset"))) return;
    grcFicheReset(page);
    location.reload();
  }, "grc-toolbar-btn-danger");
  bar.appendChild(file);
  return bar;
}

/* Point d'entrée (inline/init-grc-fiches.js). Rend la zone dans
   #grcFichesRoot : titre, barre d'export, onglets (compteur par élément),
   puis un panneau par élément selon son type. Coffre verrouillé : un seul
   écran de déverrouillage pour toute la zone, les registres existants
   de la page sont masqués jusqu'au déverrouillage puis réinitialisés. */
let _grcFichesWasGated = false;

// Élément ciblé par un hash, qu'il s'agisse d'un id DOM ou d'un
// data-*-id posé par grkRegistry (idAttr) sur les <li> d'un registre.
function _grcFicheHashTarget(raw) {
  let id = raw;
  try { id = decodeURIComponent(raw); } catch (e) { /* hash brut */ }
  const byId = document.getElementById(id);
  if (byId) return byId;
  const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, "");
  return document.querySelector('[data-asset-id="' + esc + '"], [data-risk-id="' + esc + '"], [data-control-id="' + esc + '"], ' +
    '[data-incident-id="' + esc + '"], [data-plan-id="' + esc + '"], [data-grk-id="' + esc + '"], [data-fiche-id="' + esc + '"]');
}
let _grcFichesListeners = false;

function _grcFicheBlockOf(el) {
  const node = el.block ? document.querySelector(el.block) : null;
  return node ? (node.closest(".grc-registry-block") || node) : null;
}

// Champs renommés (`legacy`, ex. directives controle -> controles) : la
// nouvelle valeur est écrite une fois, l'ancienne est conservée telle quelle.
function _grcFicheMigrateLegacy(page) {
  GRC_FICHE_DEFS[page].elements.filter(_grcFicheIsForm).forEach((el) => {
    const lf = el.fields.filter((f) => f.legacy);
    if (!lf.length) return;
    const list = grcFicheEntries(page, el.id);
    let changed = false;
    list.forEach((e) => lf.forEach((f) => {
      if (e[f.id] == null && e[f.legacy]) {
        e[f.id] = f.type === "refs" ? [String(e[f.legacy])] : e[f.legacy];
        changed = true;
      }
    }));
    if (changed) grcFicheStore(page, el.id).save(list);
  });
}

/* ---------- migrations de données (une fois, non destructives) ------
   Marqueur : /grc/fiches/_migrations (liste d'identifiants faits). */
const _GRC_FICHE_MIG_KEY = GRC_FICHES_PREFIX + "_migrations";
const GRC_FICHE_MIGRATIONS = [
  // grc-normes N7 : registre unique d'amélioration. Les actions de
  // Continuité › Amélioration continue sont copiées (même id) dans
  // Gouvernance › Amélioration ; l'ancienne clé est conservée intacte.
  { id: "n7-continuite-amelioration", run: () => {
    const src = grcFicheEntries("continuite", "amelioration");
    if (!src.length) return;
    const dst = grcFicheEntries("gouvernance", "amelioration");
    const have = {};
    dst.forEach((e) => { have[e.id] = 1; });
    src.forEach((e) => {
      if (have[e.id]) return;
      dst.push({
        id: e.id, nature: "amelioration", origine: "continuite",
        description: e.constat || "", action: e.action || "", responsable: e.responsable || "",
        echeance: e.echeance || "", statut: ["ouverte", "encours", "close"].indexOf(e.statut) !== -1 ? e.statut : "ouverte",
        causes: "", correction: "", verification: "",
        sourceContinuite: e.source || "", updatedAt: e.updatedAt || null, updatedBy: e.updatedBy || "",
      });
    });
    grcFicheStore("gouvernance", "amelioration").save(dst);
  } },
];

function grcFicheRunMigrations() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) return;
  let done = [];
  try { done = JSON.parse(vaultGetItem(_GRC_FICHE_MIG_KEY) || "[]"); } catch (e) { done = []; }
  if (!Array.isArray(done)) done = [];
  let changed = false;
  GRC_FICHE_MIGRATIONS.forEach((m) => {
    if (done.indexOf(m.id) !== -1) return;
    try { m.run(); done.push(m.id); changed = true; } catch (e) { /* réessayée au prochain chargement */ }
  });
  if (changed) vaultSetItem(_GRC_FICHE_MIG_KEY, JSON.stringify(done));
}

/* Vue filtrée du registre unique d'amélioration (N7), pour les pages qui
   en affichaient une copie (Continuité, Incidents, Conformité). */
const _GRC_IMP_STATUS = { ouverte: { fr: "Ouverte", en: "Open" }, encours: { fr: "En cours", en: "In progress" }, close: { fr: "Close", en: "Closed" } };
const _GRC_IMP_NATURE = { nc: { fr: "Non-conformité", en: "Nonconformity" }, observation: { fr: "Observation", en: "Observation" }, amelioration: { fr: "Amélioration", en: "Improvement" } };

function grcFicheImprovementTable(origins) {
  const rows = grcFicheEntries("gouvernance", "amelioration").filter((e) => !origins || origins.indexOf(e.origine) !== -1);
  return {
    columns: [{ fr: "Constat / amélioration", en: "Finding / improvement" }, { fr: "Nature", en: "Nature" }, { fr: "Action", en: "Action" },
      { fr: "Responsable", en: "Owner" }, { fr: "Échéance", en: "Due date" }, { fr: "Statut", en: "Status" }],
    rows: rows.map((e) => [e.description || "", grcFicheL(_GRC_IMP_NATURE[e.nature]) || "", e.action || "", e.responsable || "", e.echeance || "", grcFicheL(_GRC_IMP_STATUS[e.statut]) || ""]),
    empty: { fr: "Aucune action pour cette source dans le registre d’amélioration.", en: "No action from this source in the improvement register." },
  };
}

function grcFicheImprovementView(origins, prefill) {
  return {
    kind: "view",
    count: () => grcFicheImprovementTable(origins).rows.length,
    table: () => grcFicheImprovementTable(origins),
    render: (host) => {
      grcFicheRenderTable(host, grcFicheImprovementTable(origins));
      const b = document.createElement("button");
      b.type = "button";
      b.className = "grc-registry-add-btn grc-fiche-imp-add";
      b.textContent = grcT("grc.fiche.ui.addAction");
      b.addEventListener("click", () => grcFicheCrossOpen({ page: "gouvernance", tab: "amelioration", list: grcFicheListGlobal("gouvernance", "amelioration") }, Object.assign({ origine: origins[0] }, prefill || {})));
      host.appendChild(b);
      const a = document.createElement("a");
      a.className = "grc-fiche-imp-link";
      a.href = (typeof grcLinksBase === "function" ? grcLinksBase() : "") + "gouvernance.html#fiche-amelioration";
      a.textContent = grcT("grc.fiche.ui.openImprovement");
      host.appendChild(document.createTextNode(" "));
      host.appendChild(a);
    },
  };
}

// Affichage progressif (U0) : préférence par page, sinon globale
// (Paramètres). Confort local : absente ou illisible -> essentiel.
function grcFicheShowAllPref(page) {
  try {
    const v = localStorage.getItem("/grc/fiches-ui/" + page + "/all");
    if (v === "1" || v === "0") return v === "1";
    return localStorage.getItem("/grc/fiches-ui/all") === "1";
  } catch (e) {
    return false;
  }
}

function _grcFicheSetShowAll(page, on) {
  try { localStorage.setItem("/grc/fiches-ui/" + page + "/all", on ? "1" : "0"); } catch (e) { /* stockage indisponible */ }
}

// Onglets visibles : tous si la page ne marque aucun élément essentiel ;
// sinon essentiels + ceux qui contiennent déjà des entrées (on ne cache
// jamais une saisie) + l'onglet actif.
function grcFicheVisibleElements(page, showAll, active) {
  const def = GRC_FICHE_DEFS[page];
  const marked = def.elements.some((el) => el.essential);
  if (showAll || !marked) return def.elements.slice();
  return def.elements.filter((el) => el.essential || el.id === active || (grcFicheCount(page, el) || 0) > 0);
}

function grcFichesInit() {
  const page = document.body && document.body.dataset.fichePage;
  const def = page && GRC_FICHE_DEFS[page];
  const root = document.getElementById("grcFichesRoot");
  if (!def || !root) return;
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    def.elements.forEach((el) => {
      const b = _grcFicheBlockOf(el);
      if (b) b.style.display = "none";
    });
    _grcFichesWasGated = true;
    vaultGateOr(root, grcFichesInit);
    return;
  }
  root.innerHTML = "";
  _grcFicheMigrateLegacy(page);
  grcFicheRunMigrations();

  // En-tête repliable (réduit par défaut) : titre, statut du document et
  // avancement dans la ligne de résumé ; consigne et édition du statut
  // dépliées à la demande. Barre d'exports / réinitialisation juste
  // au-dessus (hors repli).
  const plain = !!def.plain;
  const head = document.createElement(plain ? "div" : "details");
  head.className = "grc-fiche-head" + (plain ? "" : " grc-fiche-head-fold");
  const headKey = "/grc/fiches-ui/head-open";
  let sumBox = head;
  if (!plain) {
    try { head.open = localStorage.getItem(headKey) === "1"; } catch (e) { head.open = false; }
    head.addEventListener("toggle", () => {
      try { localStorage.setItem(headKey, head.open ? "1" : "0"); } catch (e) { /* stockage indisponible */ }
    });
    sumBox = document.createElement("summary");
    sumBox.className = "grc-fiche-head-summary";
    head.appendChild(sumBox);
  }
  const h = document.createElement("h2");
  // « Documentation de l’organisation » décrit l'organisation elle-même :
  // réservé au Contexte organisationnel. Ailleurs, la zone porte le titre
  // du document de la page (même titre que l'export Word / PDF).
  h.textContent = page === "contexte-organisationnel" ? grcT("grc.fiche.ui.title") : grcT("grc.fiche." + page + ".docTitle");
  sumBox.appendChild(h);
  const headStatus = document.createElement("span");
  headStatus.className = "grc-fiche-badge grc-fiche-status grc-fiche-head-status";
  const status = document.createElement("span");
  status.className = "grc-fiche-progress";
  if (!plain) {
    sumBox.appendChild(headStatus);
    sumBox.appendChild(status);
  }
  const hint = document.createElement("p");
  hint.className = "grc-fiche-hint";
  hint.textContent = grcT("grc.fiche.ui.hint");
  head.appendChild(hint);
  if (!plain) {
    head.appendChild(_grcFicheMetaBox(page, headStatus));
  } else {
    // Page « outil » (ex. Démarrer ici) : le titre de la page (h1) suffit.
    h.remove();
    hint.textContent = def.hint ? grcFicheL(def.hint) : "";
  }
  // Exemple FSociety chargé (grc-demo.js, grc-debutant B7) : bandeau + retrait.
  let demo = null;
  try { demo = JSON.parse(vaultGetItem(GRC_FICHES_PREFIX + "_demo") || "null"); } catch (e) { demo = null; }
  if (demo && page !== "demarrer") {
    // Visible même en-tête replié : l'exemple actif se repère d'un coup d'œil.
    if (!plain) {
      const tag = document.createElement("span");
      tag.className = "grc-fiche-badge grc-demo-tag";
      tag.textContent = grcT("grc.fiche.ui.demoTag");
      tag.title = grcT("grc.fiche.ui.demoBanner");
      sumBox.appendChild(tag);
    }
    const b = document.createElement("p");
    b.className = "grc-demo-banner";
    b.textContent = grcT("grc.fiche.ui.demoBanner") + " ";
    const a = document.createElement("a");
    a.href = (typeof grcLinksBase === "function" ? grcLinksBase() : "") + "demarrer.html#fiche-exemple";
    a.textContent = grcT("grc.fiche.ui.demoRemove");
    b.appendChild(a);
    head.appendChild(b);
  }

  // Groupes d'onglets (U4) puis onglets du groupe actif.
  const groups = Array.isArray(def.groups) && def.groups.length ? def.groups : null;
  const groupRow = document.createElement("div");
  groupRow.className = "grc-fiche-groups";
  groupRow.setAttribute("role", "tablist");
  const toc = document.createElement("div");
  toc.className = "grc-fiche-toc";
  toc.setAttribute("role", "tablist");
  toc.setAttribute("aria-label", grcT("grc.fiche.ui.toc"));
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "grc-registry-io-btn grc-fiche-showall";
  // Exports et réinitialisation de la page : au-dessus de l'en-tête
  // repliable, toujours visibles (pas dans le repli).
  if (!plain) {
    const bar = _grcFicheToolbar(page);
    if (!def.elements.some(_grcFicheIsForm)) {
      bar.querySelectorAll('[data-action="exportJson"], [data-action="importJson"], [data-action="reset"]').forEach((b) => b.remove());
    }
    root.appendChild(bar);
  }
  root.appendChild(head);
  if (groups) root.appendChild(groupRow);
  root.appendChild(toc);
  root.appendChild(toggle);

  const tabKey = "/grc/fiches-ui/" + page + "/tab";
  const hashId = (location.hash || "").replace(/^#fiche-/, "");
  let active = def.elements.some((el) => el.id === hashId) ? hashId : null;
  const deepTarget = !active && location.hash.length > 1 ? _grcFicheHashTarget(location.hash.slice(1)) : null;
  if (!active) {
    try { active = sessionStorage.getItem(tabKey); } catch (e) { active = null; }
  }
  if (!def.elements.some((el) => el.id === active)) active = def.elements[0].id;
  let showAll = grcFicheShowAllPref(page);

  const groupOf = (id) => (groups ? groups.find((g) => g.elements.indexOf(id) !== -1) : null);
  const bodies = {};
  const navs = {};
  const empties = {};

  function renderBody(el) {
    const host = bodies[el.id];
    if (!host) return;
    const k = grcFicheKeyPrefix(page, el.id);
    if (el.kind === "register") {
      if (!host.dataset.moved) {
        const b = _grcFicheBlockOf(el);
        if (b) {
          b.style.display = "";
          b.classList.add("grc-fiche-moved");
          host.appendChild(b);
          host.dataset.moved = "1";
          if (_grcFichesWasGated && typeof el.reinit === "function") el.reinit();
        }
      }
      return;
    }
    host.innerHTML = "";
    if (el.kind === "link") {
      const p = document.createElement("p");
      p.className = "grc-fiche-linkcard";
      const a = document.createElement("a");
      a.href = grcFicheHref(el.href);
      a.className = "grc-registry-add-btn";
      a.textContent = grcT("grc.fiche.ui.goTo") + " : " + grcT(k + ".link0");
      p.appendChild(a);
      host.appendChild(p);
      return;
    }
    if (el.kind === "view" || el.table || el.render) {
      if (typeof el.render === "function") el.render(host);
      else grcFicheRenderTable(host, _grcFicheSafeTable(el));
      if (el.manage) {
        const m = document.createElement("button");
        m.type = "button";
        m.className = "grc-registry-io-btn grc-fiche-manage";
        m.textContent = grcT("grc.fiche.ui.manage");
        m.addEventListener("click", () => {
          if (def.elements.some((x) => x.id === el.manage)) show(el.manage);
          else location.href = el.manage;
        });
        host.appendChild(m);
      }
    }
    if (_grcFicheIsForm(el)) _grcFicheMountElement(page, el, host, refresh);
  }

  function refreshEmpty(el) {
    const p = empties[el.id];
    if (!p) return;
    p.hidden = !_grcFicheIsForm(el) || grcFicheEntries(page, el.id).length > 0;
  }

  function refresh() {
    renderToc();
    renderProgress();
    def.elements.forEach(refreshEmpty);
    renderChecklistLinks();
  }

  // Checklist reliée (U3) : la coche reste manuelle (D1) ; l'indicateur
  // ouvre l'onglet de l'élément correspondant (même identifiant, ou
  // `checklist` explicite dans la définition).
  function renderChecklistLinks() {
    document.querySelectorAll(".content-block li[data-item-id]").forEach((li) => {
      const id = li.dataset.itemId;
      const el = def.elements.find((x) => x.checklist === id) || def.elements.find((x) => x.id === id && !def.elements.some((y) => y.checklist === id));
      let tag = li.querySelector(".grc-check-doc");
      if (!el) { if (tag) tag.remove(); return; }
      if (!tag) {
        tag = document.createElement("a");
        tag.className = "grc-check-doc";
        tag.href = "#fiche-" + el.id;
        tag.addEventListener("click", (e) => {
          e.preventDefault();
          show(el.id);
          root.scrollIntoView({ block: "start" });
        });
        li.appendChild(tag);
      }
      const n = grcFicheCount(page, el);
      tag.classList.toggle("is-empty", !n);
      tag.textContent = n == null ? grcT("grc.fiche.ui.goTo") + " →" : (n ? grcT("grc.fiche.ui.entries").replace("{n}", n) : grcT("grc.fiche.ui.toDocument"));
    });
  }

  function renderProgress() {
    const pr = grcFicheProgress(page);
    status.textContent = "";
    if (pr && pr.total) {
      status.textContent = grcT("grc.fiche.ui.progress").replace("{p}", pr.pct).replace("{d}", pr.done).replace("{t}", pr.total);
    }
    if (typeof grcLinksPageRuptures === "function") {
      const n = grcLinksPageRuptures(page).length;
      if (n) {
        const r = document.createElement("span");
        r.className = "grc-fiche-badge grc-chain-count";
        r.textContent = grcT("grc.fiche.ui.ruptures").replace("{n}", n);
        status.appendChild(document.createTextNode(" "));
        status.appendChild(r);
      }
    }
  }

  function visible() {
    return grcFicheVisibleElements(page, showAll, active);
  }

  function renderNav(el) {
    const nav = navs[el.id];
    if (!nav) return;
    nav.innerHTML = "";
    const vis = visible().filter((x) => !groups || groupOf(x.id) === groupOf(el.id));
    const i = vis.findIndex((x) => x.id === el.id);
    const mk = (cls, text, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "grc-registry-io-btn " + cls;
      b.textContent = text;
      b.addEventListener("click", fn);
      nav.appendChild(b);
    };
    const order = typeof GRC_PAGE_ORDER !== "undefined" ? GRC_PAGE_ORDER : [];
    const pi = order.findIndex((o) => o.page === page);
    const hop = (o) => { location.href = (typeof grcLinksBase === "function" ? grcLinksBase() : "") + o.file; };
    if (i > 0) mk("grc-fiche-nav-prev", grcT("grc.fiche.ui.prev") + " " + grcT(grcFicheKeyPrefix(page, vis[i - 1].id) + ".title"), () => { show(vis[i - 1].id); toc.scrollIntoView({ block: "nearest" }); });
    else if (pi > 0) mk("grc-fiche-nav-prevstep", grcT("grc.fiche.ui.prevStep").replace("{page}", grcLinksT(order[pi - 1].title)), () => hop(order[pi - 1]));
    if (i !== -1 && i < vis.length - 1) mk("grc-fiche-nav-next", grcT("grc.fiche.ui.next") + " " + grcT(grcFicheKeyPrefix(page, vis[i + 1].id) + ".title"), () => { show(vis[i + 1].id); toc.scrollIntoView({ block: "nearest" }); });
    else if (pi !== -1 && pi < order.length - 1) mk("grc-fiche-nav-nextstep", grcT("grc.fiche.ui.nextStep").replace("{page}", grcLinksT(order[pi + 1].title)), () => hop(order[pi + 1]));
  }

  function show(id, focus) {
    active = id;
    try { sessionStorage.setItem(tabKey, id); } catch (e) { /* stockage indisponible */ }
    def.elements.forEach((el) => {
      const sec = document.getElementById("fiche-" + el.id);
      if (sec) sec.hidden = el.id !== id;
    });
    const el = def.elements.find((x) => x.id === id);
    // Vues et listes de références recalculées à chaque ouverture : les
    // registres des autres onglets ont pu changer entre-temps.
    const hasRef = el.fields && el.fields.some((f) => f.type === "ref" || f.type === "refs");
    if (el.kind === "view" || el.kind === "link" || el.table || el.render || hasRef || !bodies[id].dataset.done) {
      renderBody(el);
      bodies[id].dataset.done = "1";
    }
    renderNav(el);
    refreshEmpty(el);
    renderToc();
    if (focus) {
      const btn = toc.querySelector('[data-element="' + id + '"]');
      if (btn) btn.focus();
    }
  }

  function renderGroups() {
    if (!groups) return;
    groupRow.innerHTML = "";
    const cur = groupOf(active);
    groups.forEach((g) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "grc-fiche-group";
      b.dataset.group = g.id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", g === cur ? "true" : "false");
      b.classList.toggle("is-active", g === cur);
      b.textContent = grcT("grc.fiche." + page + ".group." + g.id);
      b.addEventListener("click", () => {
        if (g === cur) return;
        const vis = visible().filter((x) => g.elements.indexOf(x.id) !== -1);
        show((vis[0] || def.elements.find((x) => x.id === g.elements[0])).id);
      });
      groupRow.appendChild(b);
    });
  }

  function renderToc() {
    toc.innerHTML = "";
    const all = def.elements;
    const vis = visible();
    const cur = groupOf(active);
    const shown = vis.filter((el) => !groups || groupOf(el.id) === cur);
    shown.forEach((el, j) => {
      const i = all.indexOf(el);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "grc-fiche-toc-item grc-fiche-kind-" + (el.kind || "form") + (el.essential ? " is-essential" : "");
      b.dataset.element = el.id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", el.id === active ? "true" : "false");
      b.setAttribute("aria-controls", "fiche-" + el.id);
      b.tabIndex = el.id === active ? 0 : -1;
      b.classList.toggle("is-active", el.id === active);
      const n = grcFicheCount(page, el);
      b.classList.toggle("is-filled", n > 0);
      const t = document.createElement("span");
      t.textContent = (i + 1) + ". " + grcT(grcFicheKeyPrefix(page, el.id) + ".title");
      const c = document.createElement("span");
      c.className = "grc-fiche-toc-count";
      c.textContent = n == null ? "→" : String(n);
      b.appendChild(t);
      b.appendChild(c);
      b.addEventListener("click", () => show(el.id));
      b.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const k2 = (j + (e.key === "ArrowRight" ? 1 : -1) + shown.length) % shown.length;
        show(shown[k2].id, true);
      });
      toc.appendChild(b);
    });
    const hidden = all.length - vis.length;
    const marked = all.some((el) => el.essential);
    toggle.hidden = !marked || (!showAll && hidden === 0);
    toggle.textContent = showAll ? grcT("grc.fiche.ui.showEssential") : grcT("grc.fiche.ui.showAll").replace("{n}", hidden);
    renderGroups();
  }

  toggle.addEventListener("click", () => {
    showAll = !showAll;
    _grcFicheSetShowAll(page, showAll);
    renderToc();
    const el = def.elements.find((x) => x.id === active);
    if (el) renderNav(el);
  });

  def.elements.forEach((el, i) => {
    const k = grcFicheKeyPrefix(page, el.id);
    const sec = document.createElement("section");
    sec.className = "grc-registry-block grc-fiche-element";
    sec.id = "fiche-" + el.id;
    sec.setAttribute("role", "tabpanel");
    const t = document.createElement("h3");
    t.textContent = (i + 1) + ". " + grcT(k + ".title");
    sec.appendChild(t);
    if (el.ref) {
      const r = document.createElement("p");
      r.className = "grc-fiche-ref";
      r.textContent = grcT(k + ".ref");
      sec.appendChild(r);
    }
    // Accroche visible, détail repliable (U1).
    if (el.lead) {
      const l = document.createElement("p");
      l.className = "grc-fiche-hint grc-fiche-lead";
      l.textContent = grcT(k + ".lead");
      sec.appendChild(l);
    }
    if (el.desc) {
      const d = document.createElement("p");
      d.className = "grc-fiche-hint";
      d.textContent = grcT(k + ".desc");
      if (el.lead) {
        const det = document.createElement("details");
        det.className = "grc-fiche-more";
        const sm = document.createElement("summary");
        sm.textContent = grcT("grc.fiche.ui.more");
        det.appendChild(sm);
        det.appendChild(d);
        sec.appendChild(det);
      } else sec.appendChild(d);
    }
    if (el.kind !== "link" && Array.isArray(el.links) && el.links.length) {
      const p = document.createElement("p");
      p.className = "grc-fiche-links";
      p.appendChild(document.createTextNode(grcT("grc.fiche.ui.seeAlso") + " "));
      el.links.forEach((l, j) => {
        if (j) p.appendChild(document.createTextNode(" · "));
        const a = document.createElement("a");
        a.href = grcFicheHref(l.href);
        a.textContent = grcT(k + ".link" + j);
        p.appendChild(a);
      });
      sec.appendChild(p);
    }
    if (_grcFicheIsForm(el)) {
      const e = document.createElement("p");
      e.className = "grc-fiche-hint grc-fiche-empty";
      e.textContent = el.emptyHint ? grcT(k + ".emptyHint") : grcT("grc.fiche.ui.emptyGeneric");
      e.hidden = true;
      sec.appendChild(e);
      empties[el.id] = e;
    }
    const body = document.createElement("div");
    body.className = "grc-fiche-body";
    sec.appendChild(body);
    bodies[el.id] = body;
    const nav = document.createElement("div");
    nav.className = "grc-fiche-nav";
    sec.appendChild(nav);
    navs[el.id] = nav;
    root.appendChild(sec);
  });

  def.elements.filter((el) => el.kind === "register").forEach((el) => { renderBody(el); bodies[el.id].dataset.done = "1"; });
  if (deepTarget) {
    const holder = def.elements.find((el) => bodies[el.id] && bodies[el.id].contains(deepTarget));
    if (holder) active = holder.id;
  }
  show(active);
  renderProgress();
  renderChecklistLinks();
  grcFichesShow = show;
  _grcFicheConsumePending(page);

  if (!_grcFichesListeners) {
    _grcFichesListeners = true;
    window.addEventListener("hashchange", () => {
      const id = (location.hash || "").replace(/^#fiche-/, "");
      if (def.elements.some((el) => el.id === id) && grcFichesShow) grcFichesShow(id);
    });
    // Les registres existants ne rappellent rien après ajout / suppression :
    // compteurs et avancement rafraîchis après tout clic ou envoi.
    root.addEventListener("click", () => setTimeout(() => { renderToc(); renderProgress(); renderChecklistLinks(); }, 0));
    root.addEventListener("submit", () => setTimeout(() => { renderToc(); renderProgress(); renderChecklistLinks(); }, 0));
  }
}

// Ouvre l'onglet d'un élément (disponible après grcFichesInit).
let grcFichesShow = null;

// Ouvre le premier onglet « registre existant » de la page (s'il y en a) :
// utilisé par le harnais de tests (ProjetTest/harness.py) pour interagir
// avec les registres, désormais rangés dans un onglet.
function grcFichesShowRegister() {
  const page = document.body && document.body.dataset.fichePage;
  const def = page && GRC_FICHE_DEFS[page];
  const reg = def && def.elements.find((el) => el.kind === "register");
  if (reg && grcFichesShow) grcFichesShow(reg.id);
  return !!reg;
}
