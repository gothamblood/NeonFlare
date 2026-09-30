/* grc-registry-kit.js — briques partagées des registres GRC « registre +
   panneau à onglets ». Extrait ce qui était dupliqué dans grc-incidents*.js
   (préfixe ir*) et grc-continuity*.js (préfixe cont*), pour que le coût
   marginal d'un nouveau domaine tombe de ~450 à ~150 lignes.

   Voir spec/grc-registry-upgrades/00-shared-kit.md + tasks.md (SK1..SK9).
   Chargé AVANT les modules de domaine (grc-x.js / grc-x-panel.js).

   Préfixe public : grk* (GRc-Kit). Fonctions pures / sans état de domaine.
   Le texte affiché passe par grcT() (grc-i18n.js). Les lectures/écritures
   de store passent par vaultGetItem/vaultSetItem (héritent du coffre).

   État (tasks.md) :
   - SK1 : utils + modèle (descripteur grkEnsure) + store.   <-- ICI
   - SK2 : shell panneau à onglets + helpers de liste.
   - SK3 : exports + cross-links.
   - SK4 : grkRegistry (liste + formulaire + encart + deep-link).
   - SK5..SK9 : CSS alias, migration IR + PCA, helper de test, mirror. */

/* ================================================================== *
 *  §2.1 — Utilitaires                                                 *
 * ================================================================== */

// id court, stable, sans collision pratique : "prefix-<b36 temps><rand>".
function grkId(prefix) {
  return String(prefix || "id") + "-" +
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// slug de nom de fichier : [a-z0-9-], sans accents, 60 max. `fallback`
// (défaut "item") si le résultat est vide.
function grkSlug(s, fallback) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || String(fallback || "item");
}

// datetime-local ou ISO -> ISO 8601 canonique ; null si vide/invalide.
function grkToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ISO -> "AAAA-MM-JJ HH:MM" en heure locale ; "—" si vide/invalide.
function grkFmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

// ISO -> valeur d'un <input type="datetime-local"> (heure locale).
function grkIsoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
    "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

// durée lisible entre deux instants ISO -- réutilise les clés i18n
// génériques grc.incidents.detail.duration* ("{value} h" / "{value} j").
// null si l'un est absent, invalide, ou si end < start.
function grkSpanLabel(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return null;
  const hours = Math.round((e - s) / 36000) / 100;
  return hours < 48
    ? grcT("grc.incidents.detail.durationHours").replace("{value}", hours)
    : grcT("grc.incidents.detail.durationDays").replace("{value}", Math.round(hours / 24));
}

// ISO + n mois -> ISO ; null si l'ISO d'entrée est invalide.
function grkAddMonths(iso, n) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + (Number(n) || 0));
  return d.toISOString();
}

// & < > échappés (garde null). Pas d'échappement d'attribut : usage
// = contenu texte de rapport autonome, pas d'injection dans un attribut.
function grkEscapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// nom de l'auteur courant si grcAuthorName() est chargé, sinon "".
function grkAuthorName() {
  try {
    return typeof grcAuthorName === "function" ? (grcAuthorName() || "") : "";
  } catch (e) {
    return "";
  }
}

// entier >= 0 arrondi, ou null si vide / non fini / négatif.
function grkNumOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

// Décimal saisi à la main (spec/grc-restructure/ Q) : accepte la virgule
// décimale et les espaces de milliers ("100 000,50"). null si vide, non
// numérique, ou hors [min, max] (bornes facultatives).
function grkDecimalOrNull(v, min, max) {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  return n;
}

// Montant formaté selon la langue du site ; "" si absent.
const GRK_CURRENCIES = ["CAD", "USD", "EUR"];
function grkFormatMoney(n, currency) {
  if (n == null || !Number.isFinite(n)) return "";
  const cur = GRK_CURRENCIES.indexOf(currency) !== -1 ? currency : "CAD";
  const lang = typeof getSavedLang === "function" ? getSavedLang() : "fr";
  try {
    return new Intl.NumberFormat(lang === "en" ? "en-CA" : "fr-CA",
      { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
  } catch (e) {
    return Math.round(n) + " " + cur;
  }
}

/* ================================================================== *
 *  §2.2 — Modèle : descripteur `grkEnsure`, store, mutation           *
 * ================================================================== */

/* Descripteur déclaratif : { champ: { type, default?, enum?, of?, sortBy? } }
   type ∈ "string" | "number" | "bool" | "iso" | "array" | "object".
     - string : v si typeof "string", sinon default ?? ""
     - number : Number(v) si fini, sinon default ?? null   (pas de garde
                de signe — un domaine qui veut >=0 arrondi utilise
                grkNumOrNull dans un post-traitement)
     - bool   : !!v            (default ?? false)
     - iso    : grkToIso(v)    (default ?? null)
     - array  : v.slice() si Array, sinon default ?? [].  `of` => chaque
                élément repassé dans grkEnsure(el, of).  `sortBy` => tri
                stable ascendant sur cette clé numérique.
     - object : grkEnsure(v||{}, of||{})   (sous-schema imbriqué)
   `enum` : après résolution, valeur hors-liste => default (ou enum[0]).

   Renvoie une COPIE. Ne sauve pas. Idempotent. Ne mute pas la source.
   Les champs absents du descripteur sont ABANDONNÉS (comme les
   EnsureShape manuels) — inclure explicitement `id` / `schema` si
   besoin de les conserver. Idem pour les sous-objets `of` d'une liste
   d'entités adressables : déclarer `id: { type: "string" }` dedans,
   sinon `grkEnsure` retire l'id de chaque élément. */
function grkEnsure(obj, schema) {
  const src = obj && typeof obj === "object" ? obj : {};
  const desc = schema && typeof schema === "object" ? schema : {};
  const out = {};
  Object.keys(desc).forEach((field) => {
    const d = desc[field] || {};
    const raw = src[field];
    let val;
    switch (d.type) {
      case "number": {
        const n = Number(raw);
        val = raw !== "" && raw != null && Number.isFinite(n)
          ? n : (d.default === undefined ? null : d.default);
        break;
      }
      case "bool":
        val = raw === undefined ? !!(d.default) : !!raw;
        break;
      case "iso":
        val = grkToIso(raw) || (d.default === undefined ? null : d.default);
        break;
      case "array": {
        let arr = Array.isArray(raw)
          ? raw.slice()
          : (Array.isArray(d.default) ? d.default.slice() : []);
        if (d.of) arr = arr.map((el) => grkEnsure(el, d.of));
        if (d.sortBy) {
          arr = arr
            .map((el, i) => [el, i])
            .sort((a, b) => (Number(a[0] && a[0][d.sortBy]) || 0) -
                            (Number(b[0] && b[0][d.sortBy]) || 0) || (a[1] - b[1]))
            .map((pair) => pair[0]);
        }
        val = arr;
        break;
      }
      case "object":
        val = grkEnsure(raw && typeof raw === "object" ? raw : {}, d.of || {});
        break;
      case "string":
      default:
        val = typeof raw === "string"
          ? raw : (d.default === undefined ? "" : d.default);
        break;
    }
    if (Array.isArray(d.enum) && d.enum.indexOf(val) === -1) {
      val = d.default === undefined ? d.enum[0] : d.default;
    }
    out[field] = val;
  });
  return out;
}

/* Thin wrapper autour de vaultGetItem/vaultSetItem/vaultRemoveItem.
   get() renvoie [] sur absence ou JSON pourri. */
function grkStore(key) {
  return {
    key: key,
    get() {
      try {
        const raw = vaultGetItem(key);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    save(value) {
      vaultSetItem(key, JSON.stringify(value));
    },
    remove() {
      vaultRemoveItem(key);
    },
  };
}

/* Mutation atomique : charge store.get(), trouve id, applique
   `ensure` (descripteur OU fonction obj->obj) en préservant l'id,
   passe l'entité à fn, sauve. Renvoie ce que fn renvoie (null si
   entité absente ou fn -> undefined). */
function grkMutate(store, id, ensure, fn) {
  const list = store.get();
  const idx = list.findIndex((e) => e && e.id === id);
  if (idx === -1) return null;
  let ensured;
  if (typeof ensure === "function") {
    ensured = ensure(list[idx]);
  } else {
    ensured = grkEnsure(list[idx], ensure || {});
  }
  ensured.id = list[idx].id;
  const out = fn(ensured);
  list[idx] = ensured;
  store.save(list);
  return out === undefined ? null : out;
}

/* ================================================================== *
 *  §2.4 — Shell panneau à onglets                                     *
 * ================================================================== */

const _grkActiveTab = Object.create(null);  // entityId -> clé d'onglet (module, non persistant)
const _grkPanelCfg = Object.create(null);   // entityId -> { tabs, ensure, store, idAttr }

/* grkPanel(container, entity, { tabs:[{key,i18n,render(root,ent)}],
   ensure, store, idAttr }) — vide container, monte .grk-panel : barre
   role=tablist + nav clavier ←/→, zone .grk-tabpanel. _syncTabs re-lit
   l'entité depuis `store` et lui applique `ensure` (descripteur OU
   fonction) avant chaque render. Renvoie le nœud .grk-panel. */
function grkPanel(container, entity, opts) {
  const o = opts || {};
  const tabs = o.tabs || [];
  const idAttr = o.idAttr || "data-grk-id";
  const eid = entity.id;

  container.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "grk-panel";
  panel.setAttribute(idAttr, eid);
  panel.dataset.grkId = eid;
  _grkPanelCfg[eid] = { tabs: tabs, ensure: o.ensure, store: o.store, idAttr: idAttr };

  const tabbar = document.createElement("div");
  tabbar.className = "grk-tabbar";
  tabbar.setAttribute("role", "tablist");
  const focusActive = () => {
    const on = panel.querySelector('.grk-tab[aria-selected="true"]');
    if (on) on.focus();
  };
  tabs.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grk-tab";
    btn.dataset.tab = t.key;
    btn.textContent = grcT(t.i18n);
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.tabIndex = -1;
    btn.addEventListener("click", () => {
      _grkActiveTab[eid] = t.key;
      _grkSyncTabs(panel);
      focusActive();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (i + dir + tabs.length) % tabs.length;
      _grkActiveTab[eid] = tabs[next].key;
      _grkSyncTabs(panel);
      focusActive();
    });
    tabbar.appendChild(btn);
  });
  panel.appendChild(tabbar);

  const content = document.createElement("div");
  content.className = "grk-tabpanel";
  content.setAttribute("role", "tabpanel");
  panel.appendChild(content);

  container.appendChild(panel);
  _grkSyncTabs(panel);
  return panel;
}

// Applique l'onglet actif ; re-lit l'entité depuis le store à chaque appel.
function _grkSyncTabs(panel) {
  const eid = panel.dataset.grkId;
  const cfg = _grkPanelCfg[eid];
  if (!cfg) return;
  const tabs = cfg.tabs;
  const active = _grkActiveTab[eid] || (tabs[0] && tabs[0].key);

  panel.querySelectorAll(".grk-tab").forEach((b) => {
    const on = b.dataset.tab === active;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  });

  const content = panel.querySelector(".grk-tabpanel");
  content.innerHTML = "";

  let ent = cfg.store ? (cfg.store.get() || []).find((e) => e && e.id === eid) : null;
  if (!ent) return;
  if (typeof cfg.ensure === "function") ent = cfg.ensure(ent);
  else if (cfg.ensure) ent = grkEnsure(ent, cfg.ensure);
  ent.id = eid;

  const tab = tabs.find((t) => t.key === active);
  if (tab && typeof tab.render === "function") tab.render(content, ent);
}

// Re-render de l'onglet courant du panneau qui contient `node`.
function grkRefresh(node) {
  const panel = node && node.closest ? node.closest(".grk-panel") : null;
  if (panel) _grkSyncTabs(panel);
}

/* ================================================================== *
 *  §2.5 — Helpers de liste (dans un `render` d'onglet)                *
 * ================================================================== */

function grkField(labelText, control) {
  const l = document.createElement("label");
  l.className = "grk-field";
  l.appendChild(document.createTextNode(labelText));
  l.appendChild(control);
  return l;
}

function grkSelect(options, current, toLabel) {
  const s = document.createElement("select");
  (options || []).forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = toLabel ? toLabel(opt) : opt;
    if (opt === current) o.selected = true;
    s.appendChild(o);
  });
  return s;
}

function grkDelBtn(onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "grk-inv-del";
  b.setAttribute("aria-label", grcT("grc.common.btnDelete"));
  b.textContent = "✕";
  b.addEventListener("click", onClick);
  return b;
}

function grkEmptyLine(i18nKey) {
  const p = document.createElement("p");
  p.className = "grk-inv-empty";
  p.textContent = grcT(i18nKey || "grc.common.kit.empty");
  return p;
}

function grkRow() {
  const d = document.createElement("div");
  d.className = "grk-inv-row";
  return d;
}

// <section.grk-inv-sec> + <h4> optionnel + <div.grk-inv-list> ; renvoie la liste.
function grkList(root, titleKey) {
  const sec = document.createElement("section");
  sec.className = "grk-inv-sec";
  if (titleKey) {
    const h4 = document.createElement("h4");
    h4.textContent = grcT(titleKey);
    sec.appendChild(h4);
  }
  const list = document.createElement("div");
  list.className = "grk-inv-list";
  sec.appendChild(list);
  root.appendChild(sec);
  return list;
}

// <form.grk-inv-add> ; onSubmit(formEl) au submit (preventDefault fait).
function grkAddForm(controls, onSubmit) {
  const form = document.createElement("form");
  form.className = "grk-inv-add";
  (controls || []).forEach((c) => form.appendChild(c));
  form.addEventListener("submit", (e) => { e.preventDefault(); onSubmit(form); });
  return form;
}

/* champ "valeur + unité (min/h/j)" <-> minutes */

const GRK_DURATION_UNITS = ["min", "h", "j"];
const _GRK_UNIT_MIN = { min: 1, h: 60, j: 1440 };

function grkPartsToMinutes(value, unit) {
  const v = Number(value);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * (_GRK_UNIT_MIN[unit] || 1));
}

// minutes -> { value, unit } dans l'unité entière la plus large.
function grkMinutesToParts(min) {
  if (min == null || !Number.isFinite(Number(min))) return { value: "", unit: "h" };
  const m = Math.round(Number(min));
  if (m !== 0 && m % 1440 === 0) return { value: m / 1440, unit: "j" };
  if (m !== 0 && m % 60 === 0) return { value: m / 60, unit: "h" };
  return { value: m, unit: "min" };
}

function grkFmtDuration(min) {
  if (min == null || !Number.isFinite(Number(min))) return "—";
  const m = Math.round(Number(min));
  if (m !== 0 && m % 1440 === 0) return m / 1440 + " " + grcT("grc.common.unit.j");
  if (m !== 0 && m % 60 === 0) return m / 60 + " " + grcT("grc.common.unit.h");
  return m + " " + grcT("grc.common.unit.min");
}

// grkDurField(label, minutes, onCommit) -> <label.grk-field> ; onCommit
// reçoit minutes|null au `change` du nombre ou de l'unité.
function grkDurField(labelText, minutes, onCommit) {
  const parts = grkMinutesToParts(minutes);
  const wrap = document.createElement("span");
  wrap.className = "grk-dur-input";
  const num = document.createElement("input");
  num.type = "number";
  num.min = "0";
  num.step = "1";
  num.value = parts.value === "" ? "" : parts.value;
  const unit = grkSelect(GRK_DURATION_UNITS, parts.unit, (u) => grcT("grc.common.unit." + u));
  const commit = () => {
    const v = num.value;
    onCommit(v === "" ? null : grkPartsToMinutes(v, unit.value));
  };
  num.addEventListener("change", commit);
  unit.addEventListener("change", commit);
  wrap.appendChild(num);
  wrap.appendChild(unit);
  return grkField(labelText, wrap);
}

/* grkOrderedList(root, items, { render(item,i)->Node, onMove(id,dir),
   onRemove(id), emptyKey }) — items déjà triés (chacun { id }). Chaque
   ligne reçoit ↑ / ↓ (désactivés aux extrémités) + ✕. Après un
   déplacement / une suppression, grkRefresh re-render l'onglet
   (le domaine renumérote `order` dans son helper de store). */
function grkOrderedList(root, items, opts) {
  const o = opts || {};
  const arr = items || [];
  const list = document.createElement("div");
  list.className = "grk-ordered";
  arr.forEach((item, i) => {
    const node = o.render ? o.render(item, i) : grkRow();
    const acts = document.createElement("span");
    acts.className = "grk-order-acts";
    const mk = (glyph, dir, disabled, labelKey) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "grk-kmove";
      b.textContent = glyph;
      b.disabled = disabled;
      b.setAttribute("aria-label", grcT(labelKey));
      b.addEventListener("click", () => {
        if (o.onMove) o.onMove(item.id, dir);
        grkRefresh(b);
      });
      return b;
    };
    acts.appendChild(mk("↑", -1, i === 0, "grc.common.kit.moveUp"));
    acts.appendChild(mk("↓", 1, i === arr.length - 1, "grc.common.kit.moveDown"));
    if (o.onRemove) {
      acts.appendChild(grkDelBtn(() => { o.onRemove(item.id); grkRefresh(acts); }));
    }
    node.appendChild(acts);
    list.appendChild(node);
  });
  if (!arr.length) list.appendChild(grkEmptyLine(o.emptyKey));
  root.appendChild(list);
  return list;
}

/* ================================================================== *
 *  §2.6 — Exports (sans dépendance tierce, aucune requête réseau)     *
 * ================================================================== */

// true (+ alerte) si le coffre est configuré mais verrouillé sur cet
// onglet. À appeler en tête de chaque export.
function grkExportGated() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    alert(grcT("grc.common.vaultLockedExport"));
    return true;
  }
  return false;
}

// "AAAA-MM-JJ" (UTC) pour les noms de fichiers.
function grkDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

/* grkExportJson(scope, name) — chiffre si un coffre déverrouillé le
   demande (vaultMaybeEncryptForExport), puis télécharge. `scope` = une
   entité ou un tableau ; `name` = nom de fichier complet. Gate coffre. */
async function grkExportJson(scope, name) {
  if (grkExportGated()) return;
  const data = typeof vaultMaybeEncryptForExport === "function"
    ? await vaultMaybeEncryptForExport(scope)
    : scope;
  if (typeof exportJsonFile === "function") {
    exportJsonFile(data, name);
  } else {
    triggerDownload(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), name);
  }
}

/* grkExportWord(bodyHtml, name, titleText) — Blob application/msword
   (BOM + enveloppe HTML office). `bodyHtml` doit déjà être échappé
   (grkEscapeHtml). Gate coffre. */
function grkExportWord(bodyHtml, name, titleText) {
  if (grkExportGated()) return;
  const html =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
    "xmlns:w='urn:schemas-microsoft-com:office:word' " +
    "xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>" + grkEscapeHtml(titleText || "") + "</title></head>" +
    "<body style='font-family:Calibri,Arial,sans-serif;'>" + bodyHtml + "</body></html>";
  triggerDownload(new Blob(["\ufeff", html], { type: "application/msword" }), name);
}

/* grkPrintWindow(bodyHtml, title) — nouvel onglet + document.write +
   window.print() différé. alert si le pop-up est bloqué. Gate coffre.
   `bodyHtml` doit déjà être échappé. */
function grkPrintWindow(bodyHtml, title) {
  if (grkExportGated()) return;
  const win = window.open("", "_blank");
  if (!win) { alert(grcT("grc.common.popupBlocked")); return; }
  const html =
    "<!doctype html><html><head><meta charset='utf-8'><title>" +
    grkEscapeHtml(title || "") + "</title><style>" +
    "body{font-family:system-ui,Arial,sans-serif;color:#111;max-width:820px;margin:2rem auto;line-height:1.5;}" +
    "h1{margin-bottom:0;}h2{border-bottom:2px solid #333;margin-top:2rem;}h3{margin-bottom:0.2rem;}" +
    "table{border-collapse:collapse;width:100%;font-size:0.85em;}th{background:#eee;text-align:left;}td,th{border:1px solid #999;padding:4px;}" +
    "@media print{body{margin:0;}}" +
    "</style></head><body>" + bodyHtml +
    "<script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script>" +
    "</body></html>";
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// Neutralise l'injection de formule (Excel/Sheets) + échappe pour le CSV.
function grkCsvCell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[";\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/* grkExportCsv(rows, name) — `;`-CSV, BOM UTF-8, fins de ligne CRLF,
   chaque cellule passée dans grkCsvCell. `rows` = tableau de tableaux
   (1re ligne = en-tête). Gate coffre. */
function grkExportCsv(rows, name) {
  if (grkExportGated()) return;
  const csv = (rows || [])
    .map((r) => (r || []).map(grkCsvCell).join(";"))
    .join("\r\n") + "\r\n";
  triggerDownload(new Blob(["\ufeff", csv], { type: "text/csv" }), name);
}

/* grkExportButtons(root, hintKey, actions) — encart .grk-export-grid :
   une phrase d'aide + un bouton par action { i18n, fn }. Chaque bouton
   passe d'abord par grkExportGated() (défense en profondeur ; fn fait
   déjà sa propre garde). */
function grkExportButtons(root, hintKey, actions) {
  const sec = document.createElement("section");
  sec.className = "grk-sec";
  if (hintKey) {
    const hint = document.createElement("p");
    hint.className = "grk-hint";
    hint.textContent = grcT(hintKey);
    sec.appendChild(hint);
  }
  const grid = document.createElement("div");
  grid.className = "grk-export-grid";
  (actions || []).forEach((a) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grk-export-btn";
    b.textContent = grcT(a.i18n);
    b.addEventListener("click", () => {
      if (grkExportGated()) return;
      a.fn();
    });
    grid.appendChild(b);
  });
  sec.appendChild(grid);
  root.appendChild(sec);
  return sec;
}

/* ================================================================== *
 *  §2.7 — Cross-links vers les registres GRC voisins                  *
 * ================================================================== */

// Registres connus : clé logique -> { getter global, champ d'affichage }.
const _GRK_REGISTRIES = {
  assets:     { getter: "getGrcAssets",         field: "name" },
  suppliers:  { getter: "getGrcSuppliers",      field: "name" },
  risks:      { getter: "getGrcRisks",          field: "name" },
  controls:   { getter: "getGrcControls",       field: "name" },
  incidents:  { getter: "getGrcIncidents",      field: "title" },
  continuity: { getter: "getGrcContinuity",     field: "service" },
  pentest:    { getter: "getPentestEngagements", field: "name" },
};

/* grkLinkNames({ assets:true, suppliers:true, … }) — noms fusionnés
   (dédoublonnés, ordre d'insertion) des registres demandés ET présents
   sur la page (garde typeof + try/catch). [] si aucun. Sert à peupler
   un <datalist> de champ « référence croisée » — dégradé silencieux
   quand le registre voisin n'est pas chargé (cas file:// mono-page). */
function grkLinkNames(which) {
  const seen = Object.create(null);
  const out = [];
  Object.keys(which || {}).forEach((key) => {
    if (!which[key]) return;
    const reg = _GRK_REGISTRIES[key];
    if (!reg) return;
    try {
      const getter = window[reg.getter];
      if (typeof getter !== "function") return;
      (getter() || []).forEach((row) => {
        const name = row && row[reg.field];
        if (name && !seen[name]) { seen[name] = 1; out.push(name); }
      });
    } catch (e) { /* registre absent / illisible -> ignoré */ }
  });
  return out;
}

// "<hrefBase>#<id encodé>" pour un deep-link vers un autre registre.
function grkDeepLinkOpener(hrefBase, id) {
  return String(hrefBase || "") + "#" + encodeURIComponent(id == null ? "" : id);
}

/* ================================================================== *
 *  §2.3 — Registre : toolbar + liste accordéon + encart + deep-link   *
 * ================================================================== */
/* Réutilise les classes CSS génériques déjà stylées et partagées par
   les 4 registres GRC existants : .grc-registry-toolbar / -form /
   -form-row / -form-actions / -add-btn / -io-btn / -list / -item /
   -header / -body. Aucun CSS nouveau. */

function _grkBtn(cls, text) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = cls;
  b.textContent = text;
  return b;
}

// Contrôle "valeur + unité" pour un champ de formulaire (lecture au
// submit, pas de commit live). -> { node, get() -> minutes|null, set(min) }
function _grkDurControl() {
  const wrap = document.createElement("span");
  wrap.className = "grc-cont-dur-input grk-dur-input";
  const num = document.createElement("input");
  num.type = "number";
  num.min = "0";
  num.step = "1";
  const unit = grkSelect(GRK_DURATION_UNITS, "h", (u) => grcT("grc.common.unit." + u));
  wrap.appendChild(num);
  wrap.appendChild(unit);
  return {
    node: wrap,
    input: num,
    get() {
      return num.value === "" ? null : grkPartsToMinutes(num.value, unit.value);
    },
    set(min) {
      const p = grkMinutesToParts(min);
      num.value = p.value === "" ? "" : p.value;
      unit.value = p.unit;
    },
  };
}

/* grkRegistry(cfg) -> fonction d'init (à appeler quand le DOM du mount
   existe). Installe aussi window[cfg.listGlobal] = renderList.

   cfg :
     mount       (sel)   conteneur du registre                      [requis]
     summary     (sel)   conteneur de l'encart                      [option]
     store               grkStore                                   [requis]
     schema              descripteur grkEnsure (appliqué en lecture)[option]
     idAttr      (str)   attribut d'id sur les <li>  (déf "data-grk-id")
     listGlobal  (str)   nom de la fn globale de re-render          [requis]
     i18n : { add, save?, cancel?, export?, import?, titleAdd, titleEdit }
     form : [ { id, label(cléi18n), type:"text|textarea|select|dur",
                required?, options?:[{value,label}],
                suggest?:[str] | () => [str]  (texte : liste déroulante
                          maison + texte libre, _grkCombo),
                placeholder?:str  (texte, zone de texte, nombre) } ]
     readForm(entity)      -> { fieldId: value }  (déf : entity[fieldId])
     submit(values, editingId)                    écrit dans le store
     header(entity)        -> [ Node | {text} | {badge:{cls,text}} ]
     panel(body, entity)                          corps déplié       [option]
     summarise(entities)   -> { chips:[str], gaps?:str } | null      [option]
     importFn(file)        -> Promise             [option -> bouton import]
     exportFn()                                   [option ; déf : JSON du store]
     filter(entity) -> bool  (option) restreint la liste affichée ;
                             store + encart restent sur l'ensemble
                             (utile pour un store multi-`kind`)
     deepLink    (bool)  #<id> déplie + scrolle le <li>
     confirmName(entity)   -> str  (nom pour le confirm de suppression)
*/
function _grkFillOptions(sel, options) {
  const list = typeof options === "function" ? (options() || []) : (options || []);
  const keep = sel.multiple ? Array.from(sel.selectedOptions).map((o) => o.value) : [sel.value];
  sel.innerHTML = "";
  list.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = /^grc\./.test(o.label || "") ? grcT(o.label) : (o.label || o.value);
    sel.appendChild(opt);
  });
  Array.from(sel.options).forEach((o) => { if (keep.indexOf(o.value) !== -1) o.selected = true; });
}

/* AV1 : après un « + Ajouter » (grcLinksAddNew ouvre la cible dans un nouvel
   onglet), l'élément y est créé ; au retour sur cet onglet-ci (focus / redevenu
   visible) on recharge les options du select — _grkFillOptions conserve la
   sélection en cours — pour que le nouvel élément soit immédiatement choisissable.
   Le handler se retire seul dès que le select quitte le DOM (formulaire fermé). */
function _grkRefreshOptionsOnReturn(sel, options) {
  const refresh = () => {
    if (!document.body.contains(sel)) {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      return;
    }
    if (document.hidden) return;
    _grkFillOptions(sel, options);
  };
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
}

/* Suggestions d'un champ texte (spec/grc-suggest/) : liste déroulante
   maison (combobox ARIA), le texte libre reste permis. Pas de <datalist>
   natif : il masque les autres choix dès que le champ est rempli
   (Chromium), ne s'ouvre qu'en tapant (Firefox) et ne suit pas le thème.
   - clic sur le champ ou sur ▾ : TOUTE la liste, valeur actuelle surlignée ;
   - frappe : filtre (casse et accents ignorés) ;
   - ↑ ↓ Entrée Échap au clavier ; Tab ferme sans rien choisir.
   `suggest` = liste de chaînes ou fonction qui la renvoie (recalculée à
   chaque ouverture du formulaire). Aucun HTML injecté (textContent). */
let _grkComboSeq = 0;

function _grkComboNorm(s) {
  return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function _grkCombo(suggest) {
  const id = "grk-combo-" + (++_grkComboSeq);
  const wrap = document.createElement("div");
  wrap.className = "grk-combo";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "grk-suggest";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = grcT("grc.common.suggestPlaceholder");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", id);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "grk-combo-toggle";
  btn.tabIndex = -1;
  btn.setAttribute("aria-label", grcT("grc.common.suggestToggle"));
  btn.textContent = "▾";
  const list = document.createElement("ul");
  list.className = "grk-combo-list";
  list.id = id;
  list.setAttribute("role", "listbox");
  list.hidden = true;
  wrap.appendChild(input);
  wrap.appendChild(btn);
  wrap.appendChild(list);

  let items = [];
  let shown = [];
  let active = -1;

  function refresh() {
    let raw = [];
    try { raw = typeof suggest === "function" ? (suggest() || []) : (suggest || []); } catch (e) { raw = []; }
    const seen = Object.create(null);
    items = [];
    raw.forEach((v) => {
      const t = v == null ? "" : String(v).trim();
      if (!t || seen[t]) return;
      seen[t] = 1;
      items.push(t);
    });
  }
  function setActive(i) {
    active = i;
    Array.from(list.children).forEach((li, k) => {
      li.classList.toggle("is-active", k === i);
      li.setAttribute("aria-selected", k === i ? "true" : "false");
    });
    if (i >= 0 && list.children[i]) {
      input.setAttribute("aria-activedescendant", list.children[i].id);
      if (list.children[i].scrollIntoView) list.children[i].scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }
  function open(filter) {
    const q = filter ? _grkComboNorm(input.value) : "";
    shown = q ? items.filter((t) => _grkComboNorm(t).indexOf(q) !== -1) : items.slice();
    list.innerHTML = "";
    if (!shown.length) { close(); return; }
    const cur = _grkComboNorm(input.value);
    let hit = -1;
    shown.forEach((t, k) => {
      const li = document.createElement("li");
      li.id = id + "-" + k;
      li.setAttribute("role", "option");
      li.textContent = t;
      if (_grkComboNorm(t) === cur) { li.classList.add("is-current"); hit = k; }
      // mousedown (pas click) : le champ garde le focus.
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(t); });
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    setActive(hit);
  }
  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    setActive(-1);
  }
  function choose(t) {
    input.value = t;
    close();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }
  input.addEventListener("mousedown", () => { if (list.hidden) open(false); else close(); });
  input.addEventListener("input", (e) => { if (e.isTrusted) open(true); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) { open(false); if (active === -1) setActive(0); return; }
      const n = shown.length;
      setActive(e.key === "ArrowDown" ? (active + 1) % n : (active <= 0 ? n - 1 : active - 1));
    } else if (e.key === "Enter" && !list.hidden && active >= 0) {
      e.preventDefault();
      choose(shown[active]);
    } else if (e.key === "Escape" && !list.hidden) {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close();
    }
  });
  input.addEventListener("blur", () => close());
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (list.hidden) { input.focus(); open(false); } else close();
  });
  // Un clic sur le libellé ne doit pas ouvrir/fermer la liste deux fois.
  btn.addEventListener("click", (e) => e.preventDefault());

  input._grkCombo = { refresh: refresh, close: close };
  return { node: wrap, input: input };
}

function grkRegistry(cfg) {
  const idAttr = cfg.idAttr || "data-grk-id";
  const ensure = (e) => (cfg.schema ? grkEnsure(e, cfg.schema) : e);

  function init() {
    const container = document.querySelector(cfg.mount);
    if (!container) return init;
    if (typeof vaultGateOr === "function" && vaultGateOr(container, init)) return init;

    let editingId = null;
    let expandedId = null;
    container.innerHTML = "";

    /* -- toolbar -- */
    const toolbar = document.createElement("div");
    toolbar.className = "grc-registry-toolbar";
    const addBtn = _grkBtn("grc-registry-add-btn", grcT(cfg.i18n.add));
    toolbar.appendChild(addBtn);

    let importFile = null;
    if (cfg.exportFn || cfg.i18n.export || cfg.importFn) {
      const exportBtn = _grkBtn("grc-registry-io-btn", grcT(cfg.i18n.export || "grc.common.btnExport"));
      exportBtn.addEventListener("click", () => {
        if (cfg.exportFn) cfg.exportFn();
        else grkExportJson(cfg.store.get(), (cfg.listGlobal || "registry") + "-" + grkDateStamp() + ".json");
      });
      toolbar.appendChild(exportBtn);
    }
    if (cfg.importFn) {
      const importBtn = _grkBtn("grc-registry-io-btn", grcT(cfg.i18n.import || "grc.common.btnImport"));
      importFile = document.createElement("input");
      importFile.type = "file";
      importFile.accept = "application/json";
      importFile.style.display = "none";
      importBtn.addEventListener("click", () => importFile.click());
      importFile.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        Promise.resolve(cfg.importFn(file))
          .then(() => {
            renderList();
            // Liens vérifiés à l'import (chaine.md I2).
            if (typeof grcLinksImportReport === "function" && cfg.store) grcLinksImportReport(cfg.store.key);
          })
          .catch((err) => alert((err && err.message) || grcT("grc.common.invalidJsonFile")))
          .finally(() => { e.target.value = ""; });
      });
      toolbar.appendChild(importBtn);
      toolbar.appendChild(importFile);
    }
    container.appendChild(toolbar);

    /* -- formulaire (déclaratif) -- */
    const form = document.createElement("form");
    form.className = "grc-registry-form";
    form.style.display = "none";
    const formTitle = document.createElement("h3");
    form.appendChild(formTitle);

    const controls = {};   // fieldId -> input/select | _grkDurControl
    (cfg.form || []).forEach((f) => {
      const label = document.createElement("label");
      if (f.required) {
        // Champ obligatoire signalé AVANT l'enregistrement (UX, spec/grc-suggest/) ;
        // libellé et « * » dans un même élément (le <label> est une colonne flex).
        const txt = document.createElement("span");
        txt.className = "grk-label-text";
        txt.appendChild(document.createTextNode(grcT(f.label) + " "));
        const req = document.createElement("span");
        req.className = "grk-required";
        req.textContent = "*";
        req.title = grcT("grc.common.requiredField");
        req.setAttribute("aria-hidden", "true");
        txt.appendChild(req);
        label.appendChild(txt);
      } else {
        label.appendChild(document.createTextNode(grcT(f.label) + " "));
      }
      let ctl;
      if (f.type === "textarea") {
        ctl = document.createElement("textarea");
        ctl.rows = 2;
        // Obligatoire signalé par le navigateur (sinon l'envoi échouait sans message).
        if (f.required) ctl.required = true;
        label.appendChild(ctl);
      } else if (f.type === "select" || f.type === "multi") {
        // "multi" (spec/grc-fiches/chaine.md M1) : plusieurs liens, valeur
        // = tableau d'identifiants. `options` peut être une fonction
        // (listes de liens) : recalculée à chaque ouverture du formulaire.
        ctl = document.createElement("select");
        if (f.type === "multi") {
          ctl.multiple = true;
          ctl.size = 5;
          ctl.className = "grk-multi";
        }
        _grkFillOptions(ctl, f.options);
        label.appendChild(ctl);
        if (f.type === "multi") {
          const hint = document.createElement("span");
          hint.className = "grk-hint grk-multi-hint";
          hint.textContent = grcT("grc.common.multiHint");
          label.appendChild(hint);
        }
        // AV1 : bouton « + Ajouter » pour créer la cible du lien à la volée
        // (nouvel onglet), quand le type est créable (pas l'Annexe A statique
        // ni un constat d'audit virtuel).
        if (f.linkTo && typeof grcLinksAddNew === "function" &&
            typeof grcLinksOpenTarget === "function" && grcLinksOpenTarget(f.linkTo)) {
          const addBtn = _grkBtn("grk-link-add", "+ " + grcT("grc.links.addNew"));
          addBtn.title = grcT("grc.links.addNewTitle");
          addBtn.addEventListener("click", () => grcLinksAddNew(f.linkTo));
          label.appendChild(addBtn);
          _grkRefreshOptionsOnReturn(ctl, f.options);
        }
      } else if (f.type === "dur") {
        ctl = _grkDurControl();
        label.appendChild(ctl.node);
      } else if (f.suggest && (!f.type || f.type === "text")) {
        const combo = _grkCombo(f.suggest);
        ctl = combo.input;
        // Nom accessible = le libellé seul (le <label> contient aussi ▾ et la liste).
        ctl.setAttribute("aria-label", grcT(f.label));
        if (f.required) ctl.required = true;
        label.appendChild(combo.node);
      } else {
        ctl = document.createElement("input");
        // "date" (UX U1) : AAAA-MM-JJ ; "number" : saisie numérique.
        ctl.type = f.type === "date" || f.type === "number" ? f.type : "text";
        if (f.type === "number") ctl.step = "any";
        if (f.required) ctl.required = true;
        label.appendChild(ctl);
      }
      // Indice ou exemple (UX, spec/grc-suggest/ §8) : jamais sur un champ à
      // suggestions (il garde « Choisir dans la liste ou écrire… »).
      if (f.placeholder && !f.suggest && (ctl.tagName === "TEXTAREA" || ctl.type === "text" || ctl.type === "number")) {
        ctl.placeholder = f.placeholder;
      }
      controls[f.id] = ctl;
      form.appendChild(label);
    });

    const actions = document.createElement("div");
    actions.className = "grc-registry-form-actions";
    const saveBtn = _grkBtn("grc-registry-add-btn", grcT(cfg.i18n.save || "grc.common.btnSave"));
    saveBtn.type = "submit";
    const cancelBtn = _grkBtn("grc-registry-io-btn", grcT(cfg.i18n.cancel || "grc.common.btnCancel"));
    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    form.appendChild(actions);
    container.appendChild(form);

    const list = document.createElement("ul");
    list.className = "grc-registry-list";
    container.appendChild(list);

    /* -- form show/hide -- */
    function readCtl(id) {
      const c = controls[id];
      if (!c) return "";
      if (c.get) return c.get();                 // _grkDurControl
      if (c.multiple) return Array.from(c.selectedOptions).map((o) => o.value).filter(Boolean);
      return (c.value || "").toString();
    }
    function writeCtl(id, v) {
      const c = controls[id];
      if (!c) return;
      if (c.set) c.set(v);
      else if (c.multiple) {
        const vals = Array.isArray(v) ? v : (v ? [v] : []);
        Array.from(c.options).forEach((o) => { o.selected = vals.indexOf(o.value) !== -1; });
      } else {
        // Date existante non conforme : restée modifiable en texte (U1).
        // Le calendrier thémé (grkDatePicker) est déjà un champ texte.
        const want = (cfg.form || []).find((f) => f.id === id);
        if (want && want.type === "date" && !c._grkDate) {
          c.type = v && !/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? "text" : "date";
        }
        c.value = v == null ? "" : v;
      }
    }
    function showForm(entity) {
      editingId = entity ? entity.id : null;
      formTitle.textContent = grcT(entity ? cfg.i18n.titleEdit : cfg.i18n.titleAdd);
      const vals = entity
        ? (cfg.readForm ? cfg.readForm(entity) : entity)
        : {};
      (cfg.form || []).forEach((f) => {
        if (typeof f.options === "function") _grkFillOptions(controls[f.id], f.options);
        if (controls[f.id]._grkCombo) { controls[f.id]._grkCombo.refresh(); controls[f.id]._grkCombo.close(); }
        const pre = !entity && cfg.prefill ? cfg.prefill() : null;
        if (entity) writeCtl(f.id, vals[f.id]);
        else if (pre && f.id in pre) writeCtl(f.id, pre[f.id]);
        else if (f.type === "dur") controls[f.id].set(null);
        else if (f.type === "multi") writeCtl(f.id, []);
        else if (f.type === "date") writeCtl(f.id, "");
        else controls[f.id].value = f.id === "owner" && !entity ? grkAuthorName() : "";
      });
      cfg.prefill = null;
      form.style.display = "";
      addBtn.style.display = "none";
      if (formTitle.scrollIntoView) formTitle.scrollIntoView({ block: "center" });
    }
    function hideForm() {
      editingId = null;
      form.reset();
      form.style.display = "none";
      addBtn.style.display = "";
    }

    addBtn.addEventListener("click", () => showForm(null));
    // « Partir de l'exemple » (UX U2) : formulaire pré-rempli, rien
    // n'est enregistré sans validation.
    if (typeof cfg.example === "function") {
      const exBtn = _grkBtn("grc-registry-io-btn grc-example-btn", grcT("grc.common.fromExample"));
      exBtn.addEventListener("click", () => { cfg.prefill = () => cfg.example() || {}; showForm(null); });
      addBtn.insertAdjacentElement("afterend", exBtn);
    }
    // Pré-remplissage calculé (ex. « Préparer automatiquement » la revue
    // de direction, grc-normes N8) : { label, values() }.
    if (cfg.autoFill && typeof cfg.autoFill.values === "function") {
      const auBtn = _grkBtn("grc-registry-io-btn grc-autofill-btn", cfg.autoFill.label);
      auBtn.addEventListener("click", () => { cfg.prefill = () => cfg.autoFill.values() || {}; showForm(null); });
      addBtn.insertAdjacentElement("afterend", auBtn);
    }
    cancelBtn.addEventListener("click", hideForm);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const values = {};
      (cfg.form || []).forEach((f) => { values[f.id] = readCtl(f.id); });
      const req = (cfg.form || []).find((f) => f.required &&
        (Array.isArray(values[f.id]) ? !values[f.id].length : !String(values[f.id] || "").trim()));
      if (req) return;
      const wasEditing = editingId;
      cfg.submit(values, editingId);
      // Propagation (chaine.md CH6) : ce qui dépend de l'entrée modifiée
      // passe « à revoir » ; l'entrée elle-même est réputée revue.
      if (typeof grcChainChanged === "function" && cfg.store && cfg.store.key) {
        const saved = wasEditing ? cfg.store.get().find((x) => x && x.id === wasEditing) : null;
        if (saved) grcChainChanged(cfg.store.key, saved);
      }
      hideForm();
      renderList();
    });

    /* -- liste accordéon -- */
    function buildItem(entity) {
      const li = document.createElement("li");
      li.className = "grc-registry-item" + (entity.id === expandedId ? " open" : "");
      li.setAttribute(idAttr, entity.id);

      const header = document.createElement("div");
      header.className = "grc-registry-header";
      (cfg.header ? cfg.header(entity) : [{ text: entity.id }]).forEach((cell) => {
        if (cell instanceof Node) { header.appendChild(cell); return; }
        const span = document.createElement("span");
        if (cell && cell.badge) {
          span.className = "grc-cont-crit " + (cell.badge.cls || "");
          span.textContent = cell.badge.text || "";
        } else {
          span.textContent = (cell && cell.text) || "";
        }
        header.appendChild(span);
      });
      if (typeof grcChainFlag === "function" && cfg.store && cfg.store.key) {
        const flag = grcChainFlag(cfg.store.key, entity);
        if (flag) {
          const r = document.createElement("span");
          r.className = "grc-cont-crit grc-chain-review";
          r.textContent = grcT("grc.common.toReview");
          r.title = flag.cause || "";
          header.appendChild(r);
        }
      }
      const chev = document.createElement("span");
      chev.className = "chevron";
      chev.textContent = "▸";
      header.appendChild(chev);
      header.addEventListener("click", () => {
        expandedId = expandedId === entity.id ? null : entity.id;
        renderList();
      });
      li.appendChild(header);

      if (entity.id === expandedId) {
        const body = document.createElement("div");
        body.className = "grc-registry-body";
        if (cfg.panel) cfg.panel(body, entity);
        // Chaîne GRC (spec/grc-fiches/chaine.md M2) : « Dépend de » /
        // « Utilisé par », calculés depuis le catalogue grc-links.js.
        if (typeof grcLinksDepsBlock === "function" && cfg.store && cfg.store.key) {
          const deps = grcLinksDepsBlock(cfg.store.key, entity);
          if (deps) body.appendChild(deps);
        }

        const acts = document.createElement("div");
        acts.className = "grc-ir-actions grc-cont-actions";
        const editBtn = _grkBtn("grc-registry-add-btn grc-ir-toggle", grcT("grc.common.btnEdit"));
        editBtn.addEventListener("click", () => {
          const fresh = cfg.store.get().find((x) => x && x.id === entity.id);
          showForm(ensure(fresh || entity));
        });
        const delBtn = _grkBtn("grc-registry-io-btn grc-ir-toggle", grcT("grc.common.btnDelete"));
        delBtn.addEventListener("click", () => {
          const nm = cfg.confirmName ? cfg.confirmName(entity) : (entity.id || "");
          // Suppression protégée (chaine.md I1) : liste ce qui en dépend.
          const guard = typeof grcLinksDeleteWarning === "function" && cfg.store ? grcLinksDeleteWarning(cfg.store.key, entity) : "";
          if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", nm) + guard)) return;
          cfg.store.save(cfg.store.get().filter((x) => x && x.id !== entity.id));
          if (expandedId === entity.id) expandedId = null;
          if (typeof cfg.onDelete === "function") cfg.onDelete(entity);
          renderList();
        });
        acts.appendChild(editBtn);
        acts.appendChild(delBtn);
        // Actions croisées (UX U5) : [{ label, run }] propres au registre.
        if (typeof cfg.actions === "function") {
          (cfg.actions(entity) || []).forEach((a) => {
            const b = _grkBtn("grc-registry-io-btn grc-cross-action", a.label);
            b.addEventListener("click", () => a.run(entity));
            acts.appendChild(b);
          });
        }
        body.appendChild(acts);
        li.appendChild(body);
      }
      return li;
    }

    function renderSummary() {
      if (!cfg.summary || !cfg.summarise) return;
      const el = document.querySelector(cfg.summary);
      if (!el) return;
      el.innerHTML = "";
      const s = cfg.summarise((cfg.store.get() || []).map(ensure));
      if (!s) return;
      const wrap = document.createElement("div");
      wrap.className = "grc-cont-summary";
      const chips = document.createElement("div");
      chips.className = "grc-cont-summary-chips";
      (s.chips || []).forEach((t) => {
        const c = document.createElement("span");
        c.className = "grc-cont-chip";
        c.textContent = t;
        chips.appendChild(c);
      });
      wrap.appendChild(chips);
      if (s.gaps) {
        const g = document.createElement("p");
        g.className = "grc-cont-summary-gaps";
        g.textContent = s.gaps;
        wrap.appendChild(g);
      }
      el.appendChild(wrap);
    }

    // `cfg.filter(entity)` (option) restreint la LISTE affichée ; le
    // store et l'encart (`summarise`) restent sur l'ensemble.
    function _visibleEntities() {
      const all = (cfg.store.get() || []).map(ensure);
      return cfg.filter ? all.filter((e) => cfg.filter(e)) : all;
    }

    function renderList() {
      list.innerHTML = "";
      _visibleEntities().forEach((e) => list.appendChild(buildItem(e)));
      renderSummary();
    }
    window[cfg.listGlobal] = renderList;
    // Ouverture du formulaire pré-rempli (UX U2 / U5) : window[listGlobal].prefill({ champ: valeur }).
    renderList.openWith = (values) => { cfg.prefill = () => values || {}; showForm(null); };

    /* -- deep-link -- */
    function applyDeepLink() {
      if (!cfg.deepLink) return;
      const raw = (location.hash || "").replace(/^#/, "");
      if (!raw) return;
      let id;
      try { id = decodeURIComponent(raw); } catch (e) { id = raw; }
      if (!_visibleEntities().some((x) => x && x.id === id)) return;
      if (expandedId !== id) { expandedId = id; renderList(); }
      const sel = "[" + idAttr + '="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]';
      const li = list.querySelector(sel);
      if (li && li.scrollIntoView) li.scrollIntoView({ block: "center" });
    }
    if (cfg.deepLink) window.addEventListener("hashchange", applyDeepLink);

    renderList();
    applyDeepLink();
    return init;
  }

  return init;
}

/* ================================================================== *
 *  Sélecteur de date thémé (spec/grc-suggest/ §9)                     *
 * ================================================================== */
/* Remplace le calendrier natif de <input type="date"> (format et couleurs
   imposés par le navigateur, illisible sur le thème sombre) par un
   calendrier aux couleurs du thème (--accent), FR / EN.

   - La valeur reste "AAAA-MM-JJ" : aucun code appelant ne change.
   - Saisie au clavier toujours permise : "2027-3-5", "5/3/2027" (FR :
     J/M/A ; EN : M/J/A) sont normalisés en AAAA-MM-JJ au changement.
   - Une date invalide saisie à la main est refusée (message du champ) et
     l'événement "change" n'atteint pas le code de la page : rien de faux
     n'est enregistré (comme un <input type="date"> natif).
   - Une valeur existante non conforme (U1) reste telle quelle tant
     qu'on n'y touche pas.
   - Calendrier : clic sur le champ ou sur l'icône ; ↑ ↓ ← → jour/semaine,
     Page préc./suiv. mois (Maj : année), Début/Fin semaine, Entrée
     choisit, Échap ferme ; « Aujourd'hui » / « Effacer ».
   - Attaché au <body> en position fixe : jamais coupé par un conteneur
     overflow:hidden (accordéons des registres).
   Branché automatiquement sur tout input[type=date] des pages qui
   chargent la feuille grc-datepicker.css (drapeau --grk-datepicker). */

function _grkDateLang() {
  return typeof getSavedLang === "function" && getSavedLang() === "en" ? "en" : "fr";
}

function _grkPad2(n) {
  return String(n).padStart(2, "0");
}

function _grkIsoOf(y, m, d) {
  return y + "-" + _grkPad2(m + 1) + "-" + _grkPad2(d);
}

// Texte saisi -> "AAAA-MM-JJ", "" (vide) ou null (invalide).
function grkParseDate(text) {
  const t = String(text == null ? "" : text).trim();
  if (!t) return "";
  let y, m, d, g;
  if ((g = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t))) {
    y = +g[1]; m = +g[2]; d = +g[3];
  } else if ((g = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t))) {
    y = +g[3];
    if (_grkDateLang() === "en") { m = +g[1]; d = +g[2]; } else { d = +g[1]; m = +g[2]; }
  } else {
    return null;
  }
  if (y < 1900 || y > 2200) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return _grkIsoOf(y, m - 1, d);
}

let _grkCal = null; // calendrier ouvert : { input, pop, view, focus, cleanup }

function _grkCalIcon() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  [["rect", { x: 3, y: 5, width: 18, height: 16, rx: 2 }], ["line", { x1: 3, y1: 10, x2: 21, y2: 10 }],
    ["line", { x1: 8, y1: 3, x2: 8, y2: 7 }], ["line", { x1: 16, y1: 3, x2: 16, y2: 7 }]].forEach(([tag, attrs]) => {
    const el = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    svg.appendChild(el);
  });
  return svg;
}

function grkDatePicker(input) {
  if (!input || input._grkDate) return;
  input._grkDate = true;
  input.type = "text";
  input.classList.add("grk-date-input");
  input.autocomplete = "off";
  input.spellcheck = false;
  input.inputMode = "numeric";
  if (!input.placeholder) input.placeholder = grcT("grc.common.datePlaceholder");
  input.setAttribute("aria-haspopup", "dialog");

  const wrap = document.createElement("span");
  wrap.className = "grk-date";
  if (input.parentNode) input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "grk-date-btn";
  btn.setAttribute("aria-label", grcT("grc.common.dateOpen"));
  btn.title = grcT("grc.common.dateOpen");
  btn.appendChild(_grkCalIcon());
  wrap.appendChild(btn);

  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (_grkCal && _grkCal.input === input) _grkCalClose(true);
    else _grkCalOpen(input, true);
  });
  input.addEventListener("click", () => { if (!_grkCal || _grkCal.input !== input) _grkCalOpen(input, false); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && (e.altKey || !_grkCal || _grkCal.input !== input)) {
      e.preventDefault();
      _grkCalOpen(input, true);
    } else if (e.key === "Escape" && _grkCal && _grkCal.input === input) {
      e.preventDefault();
      e.stopPropagation();
      _grkCalClose(false);
    } else if (e.key === "Tab" && _grkCal && _grkCal.input === input) {
      _grkCalClose(false);
    }
  });
  // Message sous le champ (pas de reportValidity() : il ramène le focus
  // sur la date et empêche d'aller remplir un autre champ).
  const err = document.createElement("span");
  err.className = "grk-date-error";
  err.setAttribute("role", "alert");
  err.hidden = true;
  const setError = (msg) => {
    input.setCustomValidity(msg);
    input.classList.toggle("is-invalid", !!msg);
    err.textContent = msg;
    err.hidden = !msg;
  };
  wrap.appendChild(err);
  input.addEventListener("input", () => setError(""));
  // Capture sur le conteneur : passe AVANT les écouteurs "change" posés
  // par la page sur le champ lui-même.
  wrap.addEventListener("change", (e) => {
    if (e.target !== input) return;
    const iso = grkParseDate(input.value);
    if (iso === null) {
      setError(grcT("grc.common.dateInvalid"));
      e.stopImmediatePropagation();
      return;
    }
    if (iso !== input.value) input.value = iso;
    setError("");
  }, true);
}

function _grkCalClose(refocus) {
  if (!_grkCal) return;
  const c = _grkCal;
  _grkCal = null;
  c.cleanup();
  c.pop.remove();
  c.input.setAttribute("aria-expanded", "false");
  if (refocus) c.input.focus();
}

function _grkCalOpen(input, focusGrid) {
  _grkCalClose(false);
  const lang = _grkDateLang();
  const locale = lang === "en" ? "en-CA" : "fr-CA";
  const weekStart = lang === "en" ? 0 : 1;
  const today = new Date();
  const todayIso = _grkIsoOf(today.getFullYear(), today.getMonth(), today.getDate());
  const selIso = grkParseDate(input.value) || "";
  const base = selIso ? new Date(+selIso.slice(0, 4), +selIso.slice(5, 7) - 1, +selIso.slice(8, 10)) : today;

  const pop = document.createElement("div");
  pop.className = "grk-cal";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", grcT("grc.common.dateDialog"));
  const head = document.createElement("div");
  head.className = "grk-cal-head";
  const mkNav = (txt, key, delta) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grk-cal-nav";
    b.textContent = txt;
    b.setAttribute("aria-label", grcT(key));
    b.addEventListener("click", () => move(0, delta.m, delta.y, true));
    return b;
  };
  const title = document.createElement("span");
  title.className = "grk-cal-title";
  title.setAttribute("aria-live", "polite");
  head.appendChild(mkNav("«", "grc.common.datePrevYear", { m: 0, y: -1 }));
  head.appendChild(mkNav("‹", "grc.common.datePrevMonth", { m: -1, y: 0 }));
  head.appendChild(title);
  head.appendChild(mkNav("›", "grc.common.dateNextMonth", { m: 1, y: 0 }));
  head.appendChild(mkNav("»", "grc.common.dateNextYear", { m: 0, y: 1 }));
  const grid = document.createElement("table");
  grid.className = "grk-cal-grid";
  grid.setAttribute("role", "grid");
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  const wd = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const wdLong = new Intl.DateTimeFormat(locale, { weekday: "long" });
  for (let i = 0; i < 7; i++) {
    const day = new Date(2024, 0, 7 + ((weekStart + i) % 7)); // 2024-01-07 = dimanche
    const th = document.createElement("th");
    th.setAttribute("scope", "col");
    th.setAttribute("abbr", wdLong.format(day));
    th.textContent = wd.format(day);
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  grid.appendChild(thead);
  const tbody = document.createElement("tbody");
  grid.appendChild(tbody);
  const foot = document.createElement("div");
  foot.className = "grk-cal-foot";
  const bToday = document.createElement("button");
  bToday.type = "button";
  bToday.className = "grk-cal-action";
  bToday.textContent = grcT("grc.common.dateToday");
  bToday.addEventListener("click", () => pick(todayIso));
  const bClear = document.createElement("button");
  bClear.type = "button";
  bClear.className = "grk-cal-action";
  bClear.textContent = grcT("grc.common.dateClear");
  bClear.addEventListener("click", () => pick(""));
  foot.appendChild(bToday);
  foot.appendChild(bClear);
  pop.appendChild(head);
  pop.appendChild(grid);
  pop.appendChild(foot);

  const state = { y: base.getFullYear(), m: base.getMonth(), d: base.getDate() };
  const monthFmt = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function render(focusDay) {
    const t = monthFmt.format(new Date(state.y, state.m, 1));
    title.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    tbody.innerHTML = "";
    const first = new Date(state.y, state.m, 1);
    const offset = (first.getDay() - weekStart + 7) % 7;
    const start = new Date(state.y, state.m, 1 - offset);
    const focusIso = _grkIsoOf(state.y, state.m, state.d);
    for (let r = 0; r < 6; r++) {
      const tr = document.createElement("tr");
      for (let c = 0; c < 7; c++) {
        const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + r * 7 + c);
        const iso = _grkIsoOf(dt.getFullYear(), dt.getMonth(), dt.getDate());
        const td = document.createElement("td");
        td.setAttribute("role", "gridcell");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "grk-cal-day";
        b.textContent = String(dt.getDate());
        b.dataset.iso = iso;
        b.setAttribute("aria-label", dayFmt.format(dt));
        b.tabIndex = iso === focusIso ? 0 : -1;
        if (dt.getMonth() !== state.m) b.classList.add("is-other");
        if (iso === todayIso) { b.classList.add("is-today"); b.setAttribute("aria-current", "date"); }
        if (iso === selIso) { b.classList.add("is-selected"); td.setAttribute("aria-selected", "true"); }
        b.addEventListener("click", () => pick(iso));
        td.appendChild(b);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    if (focusDay) {
      const f = tbody.querySelector('button[data-iso="' + focusIso + '"]');
      if (f) f.focus();
    }
  }
  function move(days, months, years, keepFocusInHead) {
    const dt = new Date(state.y + (years || 0), state.m + (months || 0), 1);
    const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    const next = new Date(dt.getFullYear(), dt.getMonth(), Math.min(state.d, last) + (days || 0));
    state.y = next.getFullYear();
    state.m = next.getMonth();
    state.d = next.getDate();
    render(!keepFocusInHead);
  }
  function pick(iso) {
    input.value = iso;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    _grkCalClose(true);
  }
  function position() {
    const r = input.parentNode.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) { _grkCalClose(false); return; }
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    let top = r.bottom + 4;
    if (top + h > window.innerHeight - 8 && r.top - h - 4 > 8) top = r.top - h - 4;
    pop.style.left = left + "px";
    pop.style.top = top + "px";
  }

  pop.addEventListener("keydown", (e) => {
    const onDay = e.target.classList && e.target.classList.contains("grk-cal-day");
    const k = e.key;
    if (k === "Escape") { e.preventDefault(); e.stopPropagation(); _grkCalClose(true); return; }
    if (!onDay) return;
    const map = { ArrowLeft: [-1, 0, 0], ArrowRight: [1, 0, 0], ArrowUp: [-7, 0, 0], ArrowDown: [7, 0, 0],
      PageUp: [0, e.shiftKey ? 0 : -1, e.shiftKey ? -1 : 0], PageDown: [0, e.shiftKey ? 0 : 1, e.shiftKey ? 1 : 0] };
    if (map[k]) { e.preventDefault(); move(map[k][0], map[k][1], map[k][2]); return; }
    if (k === "Home" || k === "End") {
      e.preventDefault();
      const dow = (new Date(state.y, state.m, state.d).getDay() - weekStart + 7) % 7;
      move(k === "Home" ? -dow : 6 - dow, 0, 0);
      return;
    }
    if (k === "Enter" || k === " ") { e.preventDefault(); pick(e.target.dataset.iso); }
  });
  // Un clic hors du calendrier et du champ ferme ; un défilement le replace.
  const outside = (e) => { if (!pop.contains(e.target) && !input.parentNode.contains(e.target)) _grkCalClose(false); };
  const onMove = () => position();
  const onFocusOut = (e) => {
    const to = e.relatedTarget;
    if (to && !pop.contains(to) && to !== input) _grkCalClose(false);
  };
  document.addEventListener("mousedown", outside, true);
  window.addEventListener("scroll", onMove, true);
  window.addEventListener("resize", onMove);
  pop.addEventListener("focusout", onFocusOut);

  document.body.appendChild(pop);
  _grkCal = {
    input: input, pop: pop,
    cleanup: () => {
      document.removeEventListener("mousedown", outside, true);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    },
  };
  input.setAttribute("aria-expanded", "true");
  render(focusGrid);
  position();
}

// Branche le calendrier sur tous les input[type=date], présents et à venir.
function grkAutoDatePickers() {
  if (typeof document === "undefined" || !document.documentElement) return;
  let flag = "";
  try { flag = getComputedStyle(document.documentElement).getPropertyValue("--grk-datepicker").trim(); } catch (e) { flag = ""; }
  if (flag !== "1") return;
  const scan = (root) => {
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches('input[type="date"]')) grkDatePicker(root);
    if (root.querySelectorAll) root.querySelectorAll('input[type="date"]').forEach(grkDatePicker);
  };
  scan(document.body);
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(scan)))
    .observe(document.body, { childList: true, subtree: true });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", grkAutoDatePickers);
  else grkAutoDatePickers();
}
