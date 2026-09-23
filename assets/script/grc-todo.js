/* Panneau « À faire » (UX U6) — hub GRC et tableau de bord.

   Une seule liste, toutes pages confondues, dans cet ordre :
   1. entrées « à revoir » après un changement en amont (chaine.md CH6) ;
   2. ruptures de chaîne de gravité élevée (T1–T3, T8, T9) ;
   3. échéances dépassées puis à venir sous 30 jours (décision D5) :
      champs d'échéance des fiches (echeance, prochaineRevue, dateRevue),
      revues des plans de continuité, revues des documents, revues des
      risques, prochaine revue des documents de fiche (statut U7).
   Ne dépend pas des définitions de fiches : parcourt les clés
   /grc/fiches/<page>/<élément> (lecture via le coffre). */

const GRC_TODO_HORIZON_DAYS = 30;
const GRC_TODO_DUE_FIELDS = ["echeance", "prochaineRevue", "dateRevue"];
const GRC_TODO_HIGH = ["T1", "T2", "T3", "T8", "T9"];

const _GRC_TODO_I18N = {
  "grc.todo.title": { fr: "À faire", en: "To do" },
  "grc.todo.empty": { fr: "Rien d’urgent : aucune entrée à revoir, aucune rupture grave, aucune échéance sous 30 jours.", en: "Nothing urgent: no entry to review, no severe break, no due date within 30 days." },
  "grc.todo.review": { fr: "À revoir", en: "To review" },
  "grc.todo.break": { fr: "Rupture", en: "Break" },
  "grc.todo.overdue": { fr: "En retard", en: "Overdue" },
  "grc.todo.due": { fr: "Échéance", en: "Due" },
  "grc.todo.more": { fr: "… et {n} de plus", en: "… and {n} more" },
  "grc.todo.contReview": { fr: "Revue du plan de continuité", en: "Continuity plan review" },
  "grc.todo.docReview": { fr: "Revue du document", en: "Document review" },
  "grc.todo.riskReview": { fr: "Revue du risque", en: "Risk review" },
  "grc.todo.pageReview": { fr: "Revue de la documentation", en: "Documentation review" },
};
if (typeof I18N_DICT !== "undefined") Object.assign(I18N_DICT, _GRC_TODO_I18N);

function _todoDay(v) {
  if (!v) return null;
  const t = Date.parse(String(v).length === 10 ? v + "T00:00:00" : v);
  return isNaN(t) ? null : t;
}

function _todoFicheKeys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf("/grc/fiches/") !== 0) continue;
      const rest = k.slice("/grc/fiches/".length).split("/");
      if (rest.length !== 2 || rest[0].charAt(0) === "_") continue;
      out.push({ key: k, page: rest[0], el: rest[1] });
    }
  } catch (e) { /* stockage indisponible */ }
  return out;
}

function _todoPageFile(page) {
  const o = typeof GRC_PAGE_ORDER !== "undefined" ? GRC_PAGE_ORDER.find((x) => x.page === page) : null;
  if (o) return o.file;
  return typeof grcFichePageFile === "function" ? grcFichePageFile(page) : page + ".html";
}

function _todoLabel(e) {
  const skip = { id: 1, updatedAt: 1, updatedBy: 1, demo: 1 };
  const k = Object.keys(e).find((x) => !skip[x] && typeof e[x] === "string" && e[x].trim().length > 3 && !/^\d{4}-\d{2}-\d{2}/.test(e[x]) && !/^fiche-/.test(e[x]));
  const s = k ? e[k].trim() : e.id;
  return s.length > 90 ? s.slice(0, 87) + "…" : s;
}

// [{ kind: "review" | "break" | "overdue" | "due", label, detail, href, when }]
function grcTodoItems() {
  const out = [];
  const base = typeof grcLinksBase === "function" ? grcLinksBase() : "";
  const ctx = typeof grcLinksCtx === "function" ? grcLinksCtx() : null;
  if (ctx && typeof grcChainReviewList === "function") {
    grcChainReviewList(ctx).forEach((r) => out.push({ kind: "review", label: r.label, detail: r.cause, href: r.href }));
  }
  if (typeof grcLinksRuptures === "function") {
    grcLinksRuptures(GRC_TODO_HIGH).forEach((r) => r.items.forEach((it) => out.push({ kind: "break", label: it.label, detail: r.code + " · " + r.label, href: it.href })));
  }
  const now = Date.now();
  const limit = now + GRC_TODO_HORIZON_DAYS * 864e5;
  const push = (when, label, detail, href) => {
    if (when == null || when > limit) return;
    out.push({ kind: when < now - 864e5 ? "overdue" : "due", label: label, detail: detail, href: href, when: when });
  };
  _todoFicheKeys().forEach((f) => {
    let list = [];
    try { list = JSON.parse(vaultGetItem(f.key) || "[]"); } catch (e) { list = []; }
    if (!Array.isArray(list)) return;
    list.forEach((e) => {
      if (!e || typeof e !== "object" || e.statut === "close" || e.statut === "atteint" || e.statut === "realisee") return;
      GRC_TODO_DUE_FIELDS.forEach((fid) => push(_todoDay(e[fid]), _todoLabel(e), grcT("grc.todo.due") + " " + e[fid], base + _todoPageFile(f.page) + "#fiche-" + f.el));
    });
  });
  // Prochaine revue des documents de fiche (U7)
  (typeof GRC_PAGE_ORDER !== "undefined" ? GRC_PAGE_ORDER : []).forEach((o) => {
    try {
      const m = JSON.parse(vaultGetItem("/grc/fiches/" + o.page + "/_meta") || "null");
      if (m && m.nextReview) push(_todoDay(m.nextReview), grcT("grc.todo.pageReview") + " — " + grcLinksT(o.title), m.nextReview, base + o.file);
    } catch (e) { /* ignoré */ }
  });
  if (ctx) {
    ctx.list("continuity").forEach((p) => {
      const d = p.review && p.review.nextDueAt;
      push(_todoDay(d), grcT("grc.todo.contReview") + " — " + (p.service || ""), (d || "").slice(0, 10), base + "continuite.html#" + encodeURIComponent(p.id));
    });
    ctx.list("document").forEach((d) => {
      const n = d.review && d.review.nextDueAt;
      push(_todoDay(n), grcT("grc.todo.docReview") + " — " + (d.title || ""), (n || "").slice(0, 10), base + "documentation.html#" + encodeURIComponent(d.id));
    });
    ctx.list("risk").forEach((r) => {
      push(_todoDay(r.reviewDate), grcT("grc.todo.riskReview") + " — " + (r.name || ""), r.reviewDate || "", base + "analyse-risques.html#" + encodeURIComponent(r.id));
    });
  }
  const rank = { review: 0, break: 1, overdue: 2, due: 3 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (a.when || 0) - (b.when || 0));
}

function grcTodoRender(host, opts) {
  const o = opts || {};
  host.innerHTML = "";
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    if (typeof vaultGateOr === "function") vaultGateOr(host, () => grcTodoRender(host, opts));
    return;
  }
  const items = grcTodoItems();
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "grc-fiche-hint grc-todo-empty";
    p.textContent = grcT("grc.todo.empty");
    host.appendChild(p);
    return;
  }
  const ul = document.createElement("ul");
  ul.className = "grc-todo-list";
  const max = o.max || 12;
  items.slice(0, max).forEach((it) => {
    const li = document.createElement("li");
    li.className = "grc-todo-item grc-todo-" + it.kind;
    const tag = document.createElement("span");
    tag.className = "grc-fiche-badge grc-todo-tag";
    tag.textContent = grcT("grc.todo." + it.kind);
    const a = document.createElement("a");
    a.href = it.href;
    a.textContent = it.label;
    li.appendChild(tag);
    li.appendChild(document.createTextNode(" "));
    li.appendChild(a);
    if (it.detail) {
      const d = document.createElement("span");
      d.className = "grc-todo-detail";
      d.textContent = " — " + it.detail;
      li.appendChild(d);
    }
    ul.appendChild(li);
  });
  host.appendChild(ul);
  if (items.length > max) {
    const p = document.createElement("p");
    p.className = "grc-fiche-hint";
    p.textContent = grcT("grc.todo.more").replace("{n}", items.length - max);
    host.appendChild(p);
  }
}
