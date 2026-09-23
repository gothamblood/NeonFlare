// Grille des sous-sections de grc/continuite.html (spec/grc-restructure/ C2).
// Cartes-liens simples (navigation dans le même cadre -- la page est
// déjà ouverte dans la modale du hub), avec le % de couverture lu dans
// le stockage comme sur les hubs. Doit charger après grc/continuite/index.js,
// les fichiers grc-i18n* et grc-checklist.js.
(function renderContinuiteSubsections() {
  const text = (key, fallback) => (typeof I18N_DICT !== "undefined" && I18N_DICT[key] ? grcT(key) : fallback);
  const grid = document.getElementById("continuite-sub-grid");
  if (!grid || typeof continuiteIndexConfig === "undefined") return;
  continuiteIndexConfig.domains.filter((d) => d.enabled !== false).forEach((d) => {
    const slug = d.link.replace(/\.html$/, "");
    const a = document.createElement("a");
    a.className = "card card-link";
    a.href = "continuite/" + d.link;

    const header = document.createElement("div");
    header.className = "card-header";
    const icon = document.createElement("div");
    icon.className = "card-icon";
    icon.textContent = d.icon;
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = text("grc.continuite." + slug + ".hubCard.title", d.title);
    header.appendChild(icon);
    header.appendChild(title);

    const desc = document.createElement("div");
    desc.className = "card-body";
    desc.textContent = text("grc.continuite." + slug + ".hubCard.desc", d.description);

    const cov = readDomainCoverageFromLink("continuite/" + d.link);
    const pct = cov.total > 0 ? Math.round((cov.done / cov.total) * 100) : 0;
    const badge = document.createElement("div");
    badge.className = "grc-coverage-badge " + (cov.total > 0 ? grcCoverageStatus(pct) : "empty");
    badge.textContent = pct + "%";

    a.appendChild(header);
    a.appendChild(desc);
    a.appendChild(badge);
    grid.appendChild(a);
  });
})();
