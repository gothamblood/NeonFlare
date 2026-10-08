/* Hub GRC — compléments de la démarche (grc/index.html).

   - U3  : sur chaque carte, % documenté et relié + ruptures de la page ;
           « Prochaine étape conseillée » = première page de la démarche
           non documentée dont les prérequis amont existent.
   - B5  : carte 0 « Démarrer ici » (réduite dès 50 % documenté, D6).
   - B4  : vue compacte « Documents exigés ».
   - U6  : panneau « À faire ».
   - CH5 : panneau « Chaîne » (ruptures T1–T23, réparation en un clic,
           rapprochements des anciens textes).
   - U9  : recherche globale (documentation + registres).
   Tout est calculé localement, sans fetch() ; les définitions des fiches
   sont chargées sur le hub pour connaître les éléments de chaque page. */

const _GRC_HUB_I18N = {
  "grc.hub2.start.title": { fr: "0 · Démarrer ici", en: "0 · Start here" },
  "grc.hub2.start.desc": {
    fr: "Nouveau en GRC ? Suis la démarche pas à pas : diagnostic de départ, les 15 étapes dans l’ordre, les documents exigés par ISO 27001 et ISO 22301, et un exemple complet (FSociety).",
    en: "New to GRC? Follow the approach step by step: starting diagnostic, the 15 steps in order, the documents required by ISO 27001 and ISO 22301, and a complete example (FSociety)."
  },
  "grc.hub2.start.open": { fr: "Ouvrir « Démarrer ici »", en: "Open \"Start here\"" },
  "grc.hub2.next": { fr: "Prochaine étape conseillée : {page}", en: "Recommended next step: {page}" },
  "grc.hub2.nextDone": { fr: "Toutes les étapes sont documentées et reliées. Pense aux revues et au maintien.", en: "Every step is documented and linked. Keep up with reviews and maintenance." },
  "grc.hub2.pre": { fr: "Prérequis : {list}", en: "Prerequisites: {list}" },
  "grc.hub2.card": { fr: "Documenté et relié : {p} %", en: "Documented and linked: {p}%" },
  "grc.hub2.cardBreaks": { fr: "{n} rupture(s)", en: "{n} break(s)" },
  "grc.hub2.docs": { fr: "Voir les documents exigés", en: "See required documents" },
  "grc.hub2.chain": { fr: "Chaîne GRC (liens entre sections)", en: "GRC chain (links between sections)" },
  "grc.hub2.search": { fr: "Rechercher dans la documentation et les registres", en: "Search documentation and registers" },
  "grc.hub2.searchNone": { fr: "Aucun résultat.", en: "No result." },
  "grc.hub2.open": { fr: "Ouvrir", en: "Open" },
};
if (typeof I18N_DICT !== "undefined") Object.assign(I18N_DICT, _GRC_HUB_I18N);

// Avancement (U3) d'une page : définitions chargées -> grcFicheProgress.
function grcHubProgress(page) {
  if (typeof grcFicheProgress !== "function" || typeof GRC_FICHE_DEFS === "undefined" || !GRC_FICHE_DEFS[page]) return null;
  try { return grcFicheProgress(page); } catch (e) { return null; }
}

function grcHubNextStep() {
  const ctx = grcLinksCtx();
  for (const o of GRC_PAGE_ORDER) {
    const p = grcHubProgress(o.page);
    if (p && p.total && p.done === p.total) continue;
    return { step: o, missing: grcPageMissingPre(o.page, ctx) };
  }
  return null;
}

function _hubEl(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function _hubDecorateCards() {
  const byPage = {};
  if (typeof grcLinksRuptures === "function" && typeof _grcLinksTypePage === "function") {
    grcLinksRuptures().forEach((r) => {
      if (!r.items.length) return;
      const pg = _grcLinksTypePage(GRC_RUPTURES.find((x) => x.code === r.code).type);
      if (pg) byPage[pg] = (byPage[pg] || 0) + r.items.length;
    });
  }
  document.querySelectorAll("#grc-grid .card-link").forEach((card) => {
    const o = GRC_PAGE_ORDER.find((x) => x.file === card.dataset.link);
    if (!o || card.querySelector(".grc-card-doc")) return;
    const p = grcHubProgress(o.page);
    const line = _hubEl("div", "grc-card-doc");
    if (p) line.appendChild(_hubEl("span", "grc-card-doc-pct", grcT("grc.hub2.card").replace("{p}", p.pct)));
    if (byPage[o.page]) {
      line.appendChild(document.createTextNode(" "));
      line.appendChild(_hubEl("span", "grc-fiche-badge grc-chain-count", grcT("grc.hub2.cardBreaks").replace("{n}", byPage[o.page])));
    }
    card.appendChild(line);
  });
}

function _hubAverage() {
  const vals = GRC_PAGE_ORDER.map((o) => grcHubProgress(o.page)).filter(Boolean);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((n, p) => n + p.pct, 0) / vals.length);
}

function _hubStartCard(host) {
  const avg = _hubAverage();
  const card = _hubEl("div", "grc-start-card" + (avg >= 50 ? " is-compact" : ""));
  card.appendChild(_hubEl("h2", "grc-start-title", grcT("grc.hub2.start.title")));
  if (avg < 50) card.appendChild(_hubEl("p", "grc-start-desc", grcT("grc.hub2.start.desc")));
  const a = _hubEl("a", "grc-registry-add-btn grc-start-open", grcT("grc.hub2.start.open"));
  a.href = "demarrer.html";
  a.dataset.title = grcT("grc.demarrer.title");
  card.appendChild(a);
  host.appendChild(card);
}

function _hubNext(host) {
  const n = grcHubNextStep();
  const box = _hubEl("p", "grc-next-step");
  if (!n) {
    box.textContent = grcT("grc.hub2.nextDone");
  } else {
    const a = _hubEl("a", "", grcT("grc.hub2.next").replace("{page}", grcLinksT(n.step.title)));
    a.href = n.step.file;
    box.appendChild(a);
    if (n.missing.length) box.appendChild(_hubEl("span", "grc-next-pre", " — " + grcT("grc.hub2.pre").replace("{list}", n.missing.join(", "))));
  }
  host.appendChild(box);
}

function _hubDocs(host) {
  if (typeof grcExigencesSummary !== "function") return;
  const s = grcExigencesSummary();
  const p = _hubEl("p", "grc-ex-compact", grcT("grc.ex.summary").replace("{r}", s.ready).replace("{t}", s.total).replace("{b}", s.breaks) + " · ");
  const a = _hubEl("a", "", grcT("grc.hub2.docs"));
  a.href = "demarrer.html#fiche-documents";
  p.appendChild(a);
  host.appendChild(p);
}

function _hubPanel(host, titleKey, cls, render, open) {
  const d = _hubEl("details", "grc-hub-panel " + cls);
  if (open) d.open = true;
  d.appendChild(_hubEl("summary", "", grcT(titleKey)));
  const body = _hubEl("div", "grc-hub-panel-body");
  d.appendChild(body);
  let done = false;
  const go = () => { if (!done) { done = true; render(body); } };
  if (open) go();
  d.addEventListener("toggle", () => { if (d.open) go(); });
  host.appendChild(d);
}

/* ---------- U9 : recherche globale -------------------------------- */

function grcHubSearch(q) {
  const needle = String(q || "").trim().toLowerCase();
  if (needle.length < 2) return [];
  const ctx = grcLinksCtx();
  const out = [];
  const types = Object.keys(GRC_LINK_TYPES).filter((t) => !GRC_LINK_TYPES[t].virtual || t === "finding");
  const seen = {};
  types.forEach((t) => {
    const def = GRC_LINK_TYPES[t];
    ctx.list(t).forEach((e) => {
      const k = t + ":" + e.id;
      if (seen[k]) return;
      const txt = Object.keys(e).map((f) => (typeof e[f] === "string" ? e[f] : "")).join(" ").toLowerCase();
      if (txt.indexOf(needle) === -1) return;
      seen[k] = 1;
      out.push({ type: t, typeName: grcLinksT(def.name), label: String(def.label(e) || e.id), href: grcLinksHref(t, e.id) });
    });
  });
  return out.slice(0, 60);
}

function _hubSearch(host) {
  const box = _hubEl("div", "grc-hub-search");
  const input = document.createElement("input");
  input.type = "search";
  input.className = "grc-hub-search-input";
  input.placeholder = grcT("grc.hub2.search");
  input.setAttribute("aria-label", grcT("grc.hub2.search"));
  const res = _hubEl("ul", "grc-hub-search-results");
  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      res.innerHTML = "";
      if (input.value.trim().length < 2) return;
      if (typeof vaultShouldGate === "function" && vaultShouldGate()) return;
      const r = grcHubSearch(input.value);
      if (!r.length) { res.appendChild(_hubEl("li", "grc-fiche-hint", grcT("grc.hub2.searchNone"))); return; }
      r.forEach((x) => {
        const li = _hubEl("li", "grc-hub-search-item");
        li.appendChild(_hubEl("span", "grc-links-type", x.typeName));
        li.appendChild(document.createTextNode(" "));
        const a = _hubEl("a", "", x.label);
        a.href = x.href;
        li.appendChild(a);
        res.appendChild(li);
      });
    }, 150);
  });
  box.appendChild(input);
  box.appendChild(res);
  host.appendChild(box);
}

/* ---------- Réinitialisation complète (bouton « Réinitialiser » du hub) ---
   La checklist est effacée par resetGrcData() (grc-checklist.js) ; ceci
   efface le reste de la GRC : documentation par élément et statuts
   (/grc/fiches/), registres (/grc/<domaine>/registry), DDA, entrées « à
   revoir », exemple FSociety. Les préférences d'affichage (/grc/fiches-ui/)
   et la checklist (traitée à part) ne sont pas touchées ici. Non soumis
   au coffre : vaultRemoveItem() n'exige pas de déverrouillage (même règle
   que resetGrcData). */
function grcResetAllData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || k.indexOf("/grc/") !== 0) continue;
    if (k.indexOf("/grc/checklist") === 0 || k.indexOf("/grc/fiches-ui/") === 0) continue;
    if (k.indexOf("/grc/fiches/") === 0 || /^\/grc\/[^/]+\/registry$/.test(k) || k.indexOf("/grc/chain/") === 0) keys.push(k);
  }
  keys.forEach((k) => (typeof vaultRemoveItem === "function" ? vaultRemoveItem(k) : localStorage.removeItem(k)));
  return keys.length;
}

// Les liens du hub (Démarrer ici, prochaine étape, documents exigés,
// recherche, À faire, chaîne) s'ouvrent dans la fenêtre du hub, comme les
// cartes de domaine (hub-modal.js) : naviguer le hub lui-même sortirait la
// page de son cadre (menu latéral, mise en page « embedded »).
function grcHubOpen(href, title) {
  if (typeof openModal !== "function" || !href || /^(https?:|#|\.\.\/)/.test(href)) return false;
  openModal(href.replace(/^\.\//, ""), title || "");
  return true;
}

let _grcHubClicks = false;

function grcHubInit() {
  const host = document.getElementById("grc-hub-guide");
  if (!host) return;
  if (!_grcHubClicks) {
    _grcHubClicks = true;
    host.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || !host.contains(a)) return;
      if (grcHubOpen(a.getAttribute("href"), a.dataset.title || a.textContent.trim())) e.preventDefault();
    });
  }
  host.innerHTML = "";
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    _hubStartCard(host);
    return;
  }
  if (typeof grcFicheRunMigrations === "function") grcFicheRunMigrations();
  _hubStartCard(host);
  _hubNext(host);
  _hubDocs(host);
  _hubSearch(host);
  if (typeof grcTodoRender === "function") _hubPanel(host, "grc.todo.title", "grc-hub-todo", (b) => grcTodoRender(b), true);
  if (typeof grcLinksRenderChain === "function") _hubPanel(host, "grc.hub2.chain", "grc-hub-chain", (b) => grcLinksRenderChain(b, { collapsed: true }), false);
  _hubDecorateCards();
}
