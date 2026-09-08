// Traduit une carte de hub (titre/description) si grc-i18n.js définit une
// entrée grc[.securite.<section>].<slug>.hubCard.{title,desc} pour ce
// domaine -- sinon retombe sur le texte du config JS tel quel (couvre les
// pages qui n'ont pas encore leur propre traduction). N'appelle jamais
// grcT() sur une clé absente : grcT() renverrait la clé elle-même comme
// texte affiché, pire que de rester en français.
function grcLoaderText(key, fallback) {
  return (typeof I18N_DICT !== "undefined" && I18N_DICT[key]) ? grcT(key) : fallback;
}

function renderGrcDomains(domains, gridSelector, keyPrefix) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;
  const prefix = keyPrefix || "grc";

  domains
    .filter(domain => domain.enabled !== false)
    .forEach(domain => {
      const slug = domain.link.replace(/\.html$/, "");
      const titleText = grcLoaderText(prefix + "." + slug + ".hubCard.title", domain.title);
      const descText = grcLoaderText(prefix + "." + slug + ".hubCard.desc", domain.description);

      const link = document.createElement("div");
      link.className = "card card-link";
      link.dataset.link = domain.link;
      link.onclick = () => openModal(domain.link, titleText);

      const header = document.createElement("div");
      header.className = "card-header";

      const icon = document.createElement("div");
      icon.className = "card-icon";
      icon.textContent = domain.icon;

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = titleText;

      header.append(icon, title);

      const body = document.createElement("div");
      body.className = "card-body";
      body.textContent = descText;

      link.append(header, body);
      grid.appendChild(link);
    });
}