// entry.titleI18n/subI18n are optional -- only project/neonflare-technology.html's
// fixed (non-user-editable) card list carries them so far; reseau.js-style
// user-added cards have neither, so they fall back to their own plain
// title/sub exactly as before. Guarded on `grcT` too (config-loader.js is
// shared/generic; nothing stops a future caller from wiring it up on a
// page that doesn't load i18n.js).
function _cardGridText(entry, plainField, i18nField) {
  const key = entry[i18nField];
  return (key && typeof grcT === "function") ? grcT(key) : entry[plainField];
}

function renderCardGrid(config, gridSelector) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;

  config
    .filter(entry => entry.enabled !== false)
    .forEach(entry => {
      const card = document.createElement("div");
      card.className = "card";
      card.onclick = () => window.open(entry.url, "_blank", "noopener");

      const img = document.createElement("img");
      img.src = entry.img;
      img.className = "card-img";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = _cardGridText(entry, "title", "titleI18n");

      const sub = document.createElement("div");
      sub.className = "card-sub";
      sub.textContent = _cardGridText(entry, "sub", "subI18n");

      card.append(img, title, sub);
      grid.appendChild(card);
    });
}
