/* Déclaration d'applicabilité (DDA / SoA) sur le catalogue Annexe A
   (spec/grc-normes/ N1, tranche verticale CH0).

   - Une décision par contrôle du catalogue (grc-annexe-a.js, 93 entrées),
     stockée sous /grc/soa/registry (protégé par le coffre, inclus dans la
     sauvegarde complète) : { id: "A.x.y", applicable: "oui" | "non" | "",
     raison, justification, statut, implementedBy: [id contrôle],
     obligationIds, riskIds, updatedAt, updatedBy }.
   - Mise en œuvre = contrôles du registre (implementedBy) ; les contrôles
     du registre qui citent le contrôle (catalogueIds) comptent aussi.
   - Rendu par les éléments « soa » et « attributs » de la page Contrôles
     (grc-fiches-controles.js). Filtres : thème, attributs 27002, décision,
     texte. Exports : DDA Word / PDF / CSV.

   Aucun fetch(), aucune librairie tierce ; textContent / grkEscapeHtml. */

const GRC_SOA_STORE_KEY = "/grc/soa/registry";
const GRC_SOA_STATUSES = ["", "implemente", "partiel", "planifie", "non"];
const GRC_SOA_REASONS = ["", "risque", "legal", "contrat", "pratique"];

const _GRC_SOA_I18N = {
  "grc.soa.col.ref": { fr: "Réf.", en: "Ref." },
  "grc.soa.col.control": { fr: "Contrôle (libellé reformulé)", en: "Control (reworded label)" },
  "grc.soa.col.theme": { fr: "Thème", en: "Theme" },
  "grc.soa.col.applicable": { fr: "Applicable", en: "Applicable" },
  "grc.soa.col.reason": { fr: "Raison de l’inclusion", en: "Reason for inclusion" },
  "grc.soa.col.justification": { fr: "Justification", en: "Justification" },
  "grc.soa.col.status": { fr: "Mise en œuvre", en: "Implementation" },
  "grc.soa.col.implementedBy": { fr: "Contrôles du registre", en: "Register controls" },
  "grc.soa.col.types": { fr: "Type", en: "Type" },
  "grc.soa.col.props": { fr: "Propriétés", en: "Properties" },
  "grc.soa.col.concepts": { fr: "Concepts", en: "Concepts" },
  "grc.soa.col.capabilities": { fr: "Capacités", en: "Capabilities" },
  "grc.soa.col.domains": { fr: "Domaines", en: "Domains" },
  "grc.soa.app.": { fr: "— à décider —", en: "— to decide —" },
  "grc.soa.app.oui": { fr: "Oui", en: "Yes" },
  "grc.soa.app.non": { fr: "Non (exclu)", en: "No (excluded)" },
  "grc.soa.st.": { fr: "—", en: "—" },
  "grc.soa.st.implemente": { fr: "Mis en œuvre", en: "Implemented" },
  "grc.soa.st.partiel": { fr: "Partiel", en: "Partial" },
  "grc.soa.st.planifie": { fr: "Planifié", en: "Planned" },
  "grc.soa.st.non": { fr: "Non mis en œuvre", en: "Not implemented" },
  "grc.soa.rs.": { fr: "—", en: "—" },
  "grc.soa.rs.risque": { fr: "Traitement d’un risque", en: "Risk treatment" },
  "grc.soa.rs.legal": { fr: "Exigence légale", en: "Legal requirement" },
  "grc.soa.rs.contrat": { fr: "Exigence contractuelle", en: "Contractual requirement" },
  "grc.soa.rs.pratique": { fr: "Bonne pratique", en: "Good practice" },
  "grc.soa.filter.all": { fr: "Tous", en: "All" },
  "grc.soa.filter.theme": { fr: "Thème", en: "Theme" },
  "grc.soa.filter.attr": { fr: "Attribut", en: "Attribute" },
  "grc.soa.filter.decision": { fr: "Décision", en: "Decision" },
  "grc.soa.filter.search": { fr: "Rechercher", en: "Search" },
  "grc.soa.filter.undecided": { fr: "À décider", en: "To decide" },
  "grc.soa.filter.noImpl": { fr: "Applicables sans mise en œuvre", en: "Applicable, not implemented" },
  "grc.soa.summary": {
    fr: "{d}/{t} contrôles décidés · {a} applicables · {i} avec mise en œuvre · {x} exclus",
    en: "{d}/{t} controls decided · {a} applicable · {i} implemented · {x} excluded"
  },
  "grc.soa.shown": { fr: "{n} affiché(s)", en: "{n} shown" },
  "grc.soa.edit": { fr: "Décider", en: "Decide" },
  "grc.soa.save": { fr: "Enregistrer la décision", en: "Save decision" },
  "grc.soa.cancel": { fr: "Annuler", en: "Cancel" },
  "grc.soa.needJustif": { fr: "Une exclusion doit être justifiée.", en: "An exclusion must be justified." },
  "grc.soa.suggest": { fr: "Proposer depuis le registre ({n})", en: "Suggest from the register ({n})" },
  "grc.soa.suggestDone": { fr: "{n} contrôle(s) de l’Annexe A reliés aux contrôles du registre qui les citent.", en: "{n} Annex A control(s) linked to the register controls citing them." },
  "grc.soa.exportWord": { fr: "DDA Word", en: "SoA Word" },
  "grc.soa.exportPdf": { fr: "DDA PDF", en: "SoA PDF" },
  "grc.soa.exportCsv": { fr: "DDA CSV", en: "SoA CSV" },
  "grc.soa.docTitle": { fr: "Déclaration d’applicabilité", en: "Statement of Applicability" },
  "grc.soa.notice": {
    fr: "Libellés reformulés (pas le texte de la norme) ; consulter ISO/IEC 27001:2022 Annexe A pour l’intitulé officiel. Attributs 27002 saisis à titre indicatif, à valider.",
    en: "Reworded labels (not the standard's text); see ISO/IEC 27001:2022 Annex A for the official titles. 27002 attributes are indicative, to be validated."
  },
};
if (typeof I18N_DICT !== "undefined") Object.assign(I18N_DICT, _GRC_SOA_I18N);

function _soaL(v) {
  const en = typeof getSavedLang === "function" && getSavedLang() === "en";
  return v ? ((en ? v.en : v.fr) || v.fr || "") : "";
}

function grcSoaDecisions() {
  try {
    const raw = vaultGetItem(GRC_SOA_STORE_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => x && typeof x.id === "string") : [];
  } catch (e) {
    return [];
  }
}

function _grcSoaSave(list) {
  vaultSetItem(GRC_SOA_STORE_KEY, JSON.stringify(list));
}

function _soaClean(d) {
  const ids = (v) => (Array.isArray(v) ? v : []).filter((x) => typeof x === "string" && x).filter((x, i, a) => a.indexOf(x) === i);
  return {
    id: String(d.id),
    applicable: d.applicable === "oui" || d.applicable === "non" ? d.applicable : "",
    raison: GRC_SOA_REASONS.indexOf(d.raison) !== -1 ? d.raison : "",
    justification: String(d.justification || "").trim(),
    statut: GRC_SOA_STATUSES.indexOf(d.statut) !== -1 ? d.statut : "",
    implementedBy: ids(d.implementedBy),
    obligationIds: ids(d.obligationIds),
    riskIds: ids(d.riskIds),
  };
}

function grcSoaSetDecision(id, values) {
  const list = grcSoaDecisions();
  const idx = list.findIndex((x) => x.id === id);
  const prev = idx === -1 ? { id: id } : list[idx];
  const next = Object.assign({}, prev, _soaClean(Object.assign({}, prev, values, { id: id })), {
    updatedAt: new Date().toISOString(),
    updatedBy: typeof grcAuthorName === "function" ? grcAuthorName() : "",
  });
  if (idx === -1) list.push(next);
  else list[idx] = next;
  _grcSoaSave(list);
  if (typeof grcChainChanged === "function") grcChainChanged(GRC_SOA_STORE_KEY, next);
  return next;
}

// Contrôles du registre (lecture directe) qui mettent en œuvre un contrôle
// du catalogue : implementedBy de la décision + catalogueIds des contrôles.
function _grcSoaControls() {
  return typeof grcLinksCtx === "function" ? grcLinksCtx().list("control") : [];
}

function grcSoaImplementers(annexId, decision, controls) {
  const out = (decision && decision.implementedBy ? decision.implementedBy.slice() : []);
  (controls || _grcSoaControls()).forEach((c) => {
    if (Array.isArray(c.catalogueIds) && c.catalogueIds.indexOf(annexId) !== -1 && out.indexOf(c.id) === -1) out.push(c.id);
  });
  return out;
}

// Rapprochement assisté : contrôles du registre dont isoRef cite un
// contrôle du catalogue, pas encore reliés.
function grcSoaSuggestions() {
  const out = [];
  const dec = grcSoaDecisions();
  _grcSoaControls().forEach((c) => {
    if (typeof grcAnnexMatch !== "function") return;
    grcAnnexMatch(c.isoRef).forEach((aid) => {
      const d = dec.find((x) => x.id === aid);
      if (grcSoaImplementers(aid, d).indexOf(c.id) === -1) out.push({ annex: aid, control: c.id });
    });
  });
  return out;
}

function grcSoaApplySuggestions() {
  const sug = grcSoaSuggestions();
  const touched = {};
  sug.forEach((s) => {
    const d = grcSoaDecisions().find((x) => x.id === s.annex) || { id: s.annex };
    const impl = (d.implementedBy || []).concat([s.control]);
    grcSoaSetDecision(s.annex, {
      implementedBy: impl,
      applicable: d.applicable || "oui",
      raison: d.raison || "risque",
    });
    touched[s.annex] = 1;
  });
  return Object.keys(touched).length;
}

function grcSoaSummary() {
  const dec = grcSoaDecisions();
  const controls = _grcSoaControls();
  const cat = typeof GRC_ANNEX_A !== "undefined" ? GRC_ANNEX_A : [];
  let d = 0, a = 0, i = 0, x = 0;
  cat.forEach((c) => {
    const k = dec.find((z) => z.id === c.id);
    if (!k || !k.applicable) return;
    d++;
    if (k.applicable === "non") { x++; return; }
    a++;
    if (grcSoaImplementers(c.id, k, controls).length) i++;
  });
  return { decided: d, total: cat.length, applicable: a, implemented: i, excluded: x };
}

/* ---------- lignes (affichage et exports) --------------------------- */

function _soaAttrText(c) {
  const t = { P: _soaL({ fr: "Préventif", en: "Preventive" }), D: _soaL({ fr: "Détectif", en: "Detective" }), C: _soaL({ fr: "Correctif", en: "Corrective" }) };
  const p = { C: _soaL({ fr: "Confidentialité", en: "Confidentiality" }), I: _soaL({ fr: "Intégrité", en: "Integrity" }), A: _soaL({ fr: "Disponibilité", en: "Availability" }) };
  const cc = typeof GRC_ANNEX_CONCEPTS !== "undefined" ? GRC_ANNEX_CONCEPTS : {};
  const cap = typeof GRC_ANNEX_CAPABILITIES !== "undefined" ? GRC_ANNEX_CAPABILITIES : {};
  const dm = typeof GRC_ANNEX_DOMAINS !== "undefined" ? GRC_ANNEX_DOMAINS : {};
  return {
    types: c.attrs.types.map((x) => t[x] || x).join(", "),
    props: c.attrs.props.map((x) => p[x] || x).join(", "),
    concepts: c.attrs.concepts.map((x) => _soaL(cc[x]) || x).join(", "),
    capabilities: c.attrs.capabilities.map((x) => _soaL(cap[x]) || x).join(", "),
    domains: c.attrs.domains.map((x) => _soaL(dm[x]) || x).join(", "),
  };
}

function grcSoaRows() {
  const dec = grcSoaDecisions();
  const controls = _grcSoaControls();
  const name = (id) => { const c = controls.find((x) => x.id === id); return c ? c.name || id : grcT("grc.fiche.ui.refMissing"); };
  return (typeof GRC_ANNEX_A !== "undefined" ? GRC_ANNEX_A : []).map((c) => {
    const d = dec.find((x) => x.id === c.id) || { id: c.id };
    const impl = grcSoaImplementers(c.id, d, controls);
    return { c: c, d: d, impl: impl, implNames: impl.map(name) };
  });
}

// Tableau pour l'export du document de la page (grcFicheDocumentBody).
function grcSoaTable() {
  return {
    columns: ["grc.soa.col.ref", "grc.soa.col.control", "grc.soa.col.applicable", "grc.soa.col.reason", "grc.soa.col.justification", "grc.soa.col.status", "grc.soa.col.implementedBy"].map(grcT),
    rows: grcSoaRows().map((r) => [r.c.id, _soaL(r.c.label), grcT("grc.soa.app." + (r.d.applicable || "")),
      grcT("grc.soa.rs." + (r.d.raison || "")), r.d.justification || "", grcT("grc.soa.st." + (r.d.statut || "")), r.implNames.join(" · ")]),
  };
}

function grcSoaAttrTable() {
  return {
    columns: ["grc.soa.col.ref", "grc.soa.col.control", "grc.soa.col.types", "grc.soa.col.props", "grc.soa.col.concepts", "grc.soa.col.capabilities", "grc.soa.col.domains"].map(grcT),
    rows: grcSoaRows().map((r) => {
      const a = _soaAttrText(r.c);
      return [r.c.id, _soaL(r.c.label), a.types, a.props, a.concepts, a.capabilities, a.domains];
    }),
  };
}

/* ---------- exports officiels ---------------------------------------- */

function _grcSoaDocHtml() {
  const esc = grkEscapeHtml;
  const t = grcSoaTable();
  const s = grcSoaSummary();
  const lang = typeof getSavedLang === "function" && getSavedLang() === "en" ? "en-CA" : "fr-CA";
  return "<h1>" + esc(grcT("grc.soa.docTitle")) + "</h1><p><em>" + esc(GRC_ANNEX_VERSION) + " — " + esc(new Date().toLocaleString(lang)) + "</em></p>" +
    "<p>" + esc(grcT("grc.soa.summary").replace("{d}", s.decided).replace("{t}", s.total).replace("{a}", s.applicable).replace("{i}", s.implemented).replace("{x}", s.excluded)) + "</p>" +
    "<table border='1' cellspacing='0' cellpadding='4'><thead><tr>" + t.columns.map((c) => "<th>" + esc(c) + "</th>").join("") + "</tr></thead><tbody>" +
    t.rows.map((r) => "<tr>" + r.map((c) => "<td>" + esc(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table>" +
    "<p><small>" + esc(grcT("grc.soa.notice")) + "</small></p>" +
    (typeof I18N_DICT !== "undefined" && I18N_DICT["grc.fiche.meta.limits"] ? "<p><small>" + esc(grcT("grc.fiche.meta.limits")) + "</small></p>" : "");
}

function _grcSoaGated() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    alert(grcT("grc.common.vaultLockedExport"));
    return true;
  }
  return false;
}

function grcSoaExportWord() {
  if (_grcSoaGated()) return;
  const html = "<html><head><meta charset='utf-8'><title>" + grkEscapeHtml(grcT("grc.soa.docTitle")) + "</title></head><body style='font-family:Calibri,Arial,sans-serif;'>" + _grcSoaDocHtml() + "</body></html>";
  triggerDownload(new Blob(["﻿", html], { type: "application/msword" }), "dda-soa-" + grkDateStamp() + ".doc");
}

function grcSoaExportPdf() {
  if (_grcSoaGated()) return;
  grkPrintWindow(_grcSoaDocHtml(), grcT("grc.soa.docTitle"));
}

function grcSoaExportCsv() {
  if (_grcSoaGated()) return;
  const t = grcSoaTable();
  // Neutralise les formules (=, +, -, @) à l'ouverture dans un tableur.
  const cell = (v) => {
    let s = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = [t.columns].concat(t.rows).map((r) => r.map(cell).join(";")).join("\r\n");
  triggerDownload(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }), "dda-soa-" + grkDateStamp() + ".csv");
}

/* ---------- interface ------------------------------------------------ */

const _grcSoaUi = { theme: "", attr: "", decision: "", q: "", open: null };

function _soaSelect(options, value, onChange, cls) {
  const s = document.createElement("select");
  if (cls) s.className = cls;
  options.forEach((o) => {
    const op = document.createElement("option");
    op.value = o.v;
    op.textContent = o.label;
    s.appendChild(op);
  });
  s.value = value;
  s.addEventListener("change", () => onChange(s.value));
  return s;
}

function _soaAttrOptions() {
  const out = [{ v: "", label: grcT("grc.soa.filter.all") }];
  const add = (prefix, map, group) => Object.keys(map).forEach((k) => out.push({ v: prefix + ":" + k, label: group + " — " + _soaL(map[k]) }));
  add("t", { P: { fr: "Préventif", en: "Preventive" }, D: { fr: "Détectif", en: "Detective" }, C: { fr: "Correctif", en: "Corrective" } }, grcT("grc.soa.col.types"));
  add("p", { C: { fr: "Confidentialité", en: "Confidentiality" }, I: { fr: "Intégrité", en: "Integrity" }, A: { fr: "Disponibilité", en: "Availability" } }, grcT("grc.soa.col.props"));
  if (typeof GRC_ANNEX_CONCEPTS !== "undefined") add("c", GRC_ANNEX_CONCEPTS, grcT("grc.soa.col.concepts"));
  if (typeof GRC_ANNEX_CAPABILITIES !== "undefined") add("cap", GRC_ANNEX_CAPABILITIES, grcT("grc.soa.col.capabilities"));
  if (typeof GRC_ANNEX_DOMAINS !== "undefined") add("d", GRC_ANNEX_DOMAINS, grcT("grc.soa.col.domains"));
  return out;
}

function _soaMatches(r) {
  const u = _grcSoaUi;
  if (u.theme && r.c.theme !== u.theme) return false;
  if (u.attr) {
    const [k, v] = u.attr.split(":");
    const map = { t: "types", p: "props", c: "concepts", cap: "capabilities", d: "domains" };
    if ((r.c.attrs[map[k]] || []).indexOf(v) === -1) return false;
  }
  if (u.decision === "undecided" && r.d.applicable) return false;
  if (u.decision === "oui" && r.d.applicable !== "oui") return false;
  if (u.decision === "non" && r.d.applicable !== "non") return false;
  if (u.decision === "noimpl" && !(r.d.applicable === "oui" && !r.impl.length)) return false;
  if (u.q) {
    const q = u.q.toLowerCase();
    if ((r.c.id + " " + r.c.label.fr + " " + r.c.label.en + " " + (r.d.justification || "")).toLowerCase().indexOf(q) === -1) return false;
  }
  return true;
}

// mode : "soa" (décisions) | "attrs" (attributs 27002).
function grcSoaRender(host, mode) {
  host.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "grc-soa";
  host.appendChild(wrap);
  const rerender = () => grcSoaRender(host, mode);

  const s = grcSoaSummary();
  const sum = document.createElement("p");
  sum.className = "grc-soa-summary";
  sum.textContent = grcT("grc.soa.summary").replace("{d}", s.decided).replace("{t}", s.total).replace("{a}", s.applicable).replace("{i}", s.implemented).replace("{x}", s.excluded);
  wrap.appendChild(sum);

  const note = document.createElement("p");
  note.className = "grc-fiche-hint grc-soa-notice";
  note.textContent = grcT("grc.soa.notice");
  wrap.appendChild(note);

  // Barre : filtres + exports
  const bar = document.createElement("div");
  bar.className = "grc-soa-bar";
  const lab = (key, node) => {
    const l = document.createElement("label");
    l.appendChild(document.createTextNode(grcT(key) + " "));
    l.appendChild(node);
    bar.appendChild(l);
  };
  lab("grc.soa.filter.theme", _soaSelect([{ v: "", label: grcT("grc.soa.filter.all") }].concat(Object.keys(GRC_ANNEX_THEMES).map((k) => ({ v: k, label: "A." + k + " " + _soaL(GRC_ANNEX_THEMES[k]) }))),
    _grcSoaUi.theme, (v) => { _grcSoaUi.theme = v; rerender(); }, "grc-soa-theme"));
  lab("grc.soa.filter.attr", _soaSelect(_soaAttrOptions(), _grcSoaUi.attr, (v) => { _grcSoaUi.attr = v; rerender(); }, "grc-soa-attr"));
  if (mode === "soa") {
    lab("grc.soa.filter.decision", _soaSelect([
      { v: "", label: grcT("grc.soa.filter.all") }, { v: "undecided", label: grcT("grc.soa.filter.undecided") },
      { v: "oui", label: grcT("grc.soa.app.oui") }, { v: "non", label: grcT("grc.soa.app.non") },
      { v: "noimpl", label: grcT("grc.soa.filter.noImpl") },
    ], _grcSoaUi.decision, (v) => { _grcSoaUi.decision = v; rerender(); }, "grc-soa-decision"));
  }
  const q = document.createElement("input");
  q.type = "search";
  q.className = "grc-soa-q";
  q.value = _grcSoaUi.q;
  q.addEventListener("change", () => { _grcSoaUi.q = q.value.trim(); rerender(); });
  lab("grc.soa.filter.search", q);
  wrap.appendChild(bar);

  const io = document.createElement("div");
  io.className = "grc-toolbar grc-soa-io";
  const btn = (key, fn, cls) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grc-registry-io-btn" + (cls ? " " + cls : "");
    b.textContent = key;
    b.addEventListener("click", fn);
    io.appendChild(b);
    return b;
  };
  if (mode === "soa") {
    const sug = grcSoaSuggestions();
    if (sug.length) {
      btn(grcT("grc.soa.suggest").replace("{n}", sug.length), () => {
        const n = grcSoaApplySuggestions();
        alert(grcT("grc.soa.suggestDone").replace("{n}", n));
        rerender();
      }, "grc-soa-suggest");
    }
  }
  btn(grcT("grc.soa.exportWord"), grcSoaExportWord);
  btn(grcT("grc.soa.exportPdf"), grcSoaExportPdf);
  btn(grcT("grc.soa.exportCsv"), grcSoaExportCsv);
  wrap.appendChild(io);

  const rows = grcSoaRows().filter(_soaMatches);
  const shown = document.createElement("p");
  shown.className = "grc-fiche-hint grc-soa-shown";
  shown.textContent = grcT("grc.soa.shown").replace("{n}", rows.length);
  wrap.appendChild(shown);

  const tw = document.createElement("div");
  tw.className = "grc-fiche-table-wrap";
  const table = document.createElement("table");
  table.className = "grc-fiche-table grc-soa-table";
  const cols = mode === "soa"
    ? ["ref", "control", "applicable", "justification", "status", "implementedBy", ""]
    : ["ref", "control", "types", "props", "concepts", "capabilities", "domains"];
  const thead = document.createElement("thead");
  const htr = document.createElement("tr");
  cols.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = c ? grcT("grc.soa.col." + c) : "";
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.dataset.annex = r.c.id;
    if (mode === "soa") {
      tr.className = "grc-soa-row" + (r.d.applicable ? " is-decided" : " is-undecided");
      const a = _soaAttrText(r.c);
      [r.c.id, _soaL(r.c.label), grcT("grc.soa.app." + (r.d.applicable || "")), r.d.justification || "",
        grcT("grc.soa.st." + (r.d.statut || "")), r.implNames.join(" · ")].forEach((v, i) => {
        const td = document.createElement("td");
        td.textContent = v;
        if (i === 1) td.title = a.types + " · " + a.props;
        tr.appendChild(td);
      });
      const td = document.createElement("td");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "grc-registry-io-btn grc-soa-edit";
      b.textContent = grcT("grc.soa.edit");
      b.addEventListener("click", () => { _grcSoaUi.open = _grcSoaUi.open === r.c.id ? null : r.c.id; rerender(); });
      td.appendChild(b);
      tr.appendChild(td);
      tbody.appendChild(tr);
      if (_grcSoaUi.open === r.c.id) tbody.appendChild(_grcSoaEditor(r, cols.length, rerender));
    } else {
      const a = _soaAttrText(r.c);
      [r.c.id, _soaL(r.c.label), a.types, a.props, a.concepts, a.capabilities, a.domains].forEach((v) => {
        const td = document.createElement("td");
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  });
  table.appendChild(tbody);
  tw.appendChild(table);
  wrap.appendChild(tw);
}

function _grcSoaEditor(r, span, rerender) {
  const tr = document.createElement("tr");
  tr.className = "grc-soa-editor-row";
  const td = document.createElement("td");
  td.colSpan = span;
  const form = document.createElement("form");
  form.className = "grc-registry-form grc-soa-editor";
  const field = (key, node) => {
    const l = document.createElement("label");
    l.appendChild(document.createTextNode(grcT(key) + " "));
    l.appendChild(node);
    form.appendChild(l);
    return node;
  };
  const sel = (vals, prefix, cur, name) => {
    const s = document.createElement("select");
    s.name = name;
    vals.forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = grcT(prefix + v);
      s.appendChild(o);
    });
    s.value = cur || "";
    return s;
  };
  const multi = (type, cur, name) => {
    const s = document.createElement("select");
    s.multiple = true;
    s.size = 5;
    s.name = name;
    s.className = "grk-multi";
    (typeof grcLinksOptions === "function" ? grcLinksOptions(type) : []).forEach((o) => {
      const op = document.createElement("option");
      op.value = o.v;
      op.textContent = o.label;
      op.selected = (cur || []).indexOf(o.v) !== -1;
      s.appendChild(op);
    });
    return s;
  };
  const app = field("grc.soa.col.applicable", sel(["", "oui", "non"], "grc.soa.app.", r.d.applicable, "applicable"));
  const rs = field("grc.soa.col.reason", sel(GRC_SOA_REASONS, "grc.soa.rs.", r.d.raison, "raison"));
  const just = field("grc.soa.col.justification", document.createElement("textarea"));
  just.name = "justification";
  just.rows = 2;
  just.value = r.d.justification || "";
  const st = field("grc.soa.col.status", sel(GRC_SOA_STATUSES, "grc.soa.st.", r.d.statut, "statut"));
  const impl = field("grc.soa.col.implementedBy", multi("control", r.d.implementedBy, "implementedBy"));
  const obl = field("grc.links.f.control.obligationIds", multi("obligation", r.d.obligationIds, "obligationIds"));
  const rk = field("grc.links.f.control.riskIds", multi("risk", r.d.riskIds, "riskIds"));
  const err = document.createElement("p");
  err.className = "grk-hint grc-soa-err";
  err.hidden = true;
  form.appendChild(err);
  const actions = document.createElement("div");
  actions.className = "grc-registry-form-actions";
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "grc-registry-add-btn";
  save.textContent = grcT("grc.soa.save");
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "grc-registry-io-btn";
  cancel.textContent = grcT("grc.soa.cancel");
  cancel.addEventListener("click", () => { _grcSoaUi.open = null; rerender(); });
  actions.appendChild(save);
  actions.appendChild(cancel);
  form.appendChild(actions);
  const picked = (s) => Array.from(s.selectedOptions).map((o) => o.value);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (app.value === "non" && !just.value.trim()) {
      err.textContent = grcT("grc.soa.needJustif");
      err.hidden = false;
      return;
    }
    grcSoaSetDecision(r.c.id, {
      applicable: app.value, raison: rs.value, justification: just.value, statut: st.value,
      implementedBy: picked(impl), obligationIds: picked(obl), riskIds: picked(rk),
    });
    _grcSoaUi.open = null;
    rerender();
  });
  td.appendChild(form);
  tr.appendChild(td);
  return tr;
}
