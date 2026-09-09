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
    .replace(/>/g, "&gt;");
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
                required?, options?:[{value,label}], } ]
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
          .then(() => renderList())
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
      label.appendChild(document.createTextNode(grcT(f.label) + " "));
      let ctl;
      if (f.type === "textarea") {
        ctl = document.createElement("textarea");
        ctl.rows = 2;
        label.appendChild(ctl);
      } else if (f.type === "select") {
        ctl = document.createElement("select");
        (f.options || []).forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.value;
          opt.textContent = /\./.test(o.label || "") ? grcT(o.label) : (o.label || o.value);
          ctl.appendChild(opt);
        });
        label.appendChild(ctl);
      } else if (f.type === "dur") {
        ctl = _grkDurControl();
        label.appendChild(ctl.node);
      } else {
        ctl = document.createElement("input");
        ctl.type = "text";
        if (f.required) ctl.required = true;
        label.appendChild(ctl);
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
      return (c.value || "").toString();
    }
    function writeCtl(id, v) {
      const c = controls[id];
      if (!c) return;
      if (c.set) c.set(v);
      else c.value = v == null ? "" : v;
    }
    function showForm(entity) {
      editingId = entity ? entity.id : null;
      formTitle.textContent = grcT(entity ? cfg.i18n.titleEdit : cfg.i18n.titleAdd);
      const vals = entity
        ? (cfg.readForm ? cfg.readForm(entity) : entity)
        : {};
      (cfg.form || []).forEach((f) => {
        if (entity) writeCtl(f.id, vals[f.id]);
        else if (f.type === "dur") controls[f.id].set(null);
        else controls[f.id].value = f.id === "owner" && !entity ? grkAuthorName() : "";
      });
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
    cancelBtn.addEventListener("click", hideForm);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const values = {};
      (cfg.form || []).forEach((f) => { values[f.id] = readCtl(f.id); });
      const req = (cfg.form || []).find((f) => f.required && !String(values[f.id] || "").trim());
      if (req) return;
      cfg.submit(values, editingId);
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
          if (!confirm(grcT("grc.common.confirmDelete").replace("{name}", nm))) return;
          cfg.store.save(cfg.store.get().filter((x) => x && x.id !== entity.id));
          if (expandedId === entity.id) expandedId = null;
          renderList();
        });
        acts.appendChild(editBtn);
        acts.appendChild(delBtn);
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
