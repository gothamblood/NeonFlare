function renderCardGrid(config, gridSelector) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;

  config
    .filter(entry => entry.enabled !== false)
    .forEach(entry => {
      const card = document.createElement("div");
      card.className = "card";
      card.onclick = () => window.open(entry.url, "_blank");

      const img = document.createElement("img");
      img.src = entry.img;
      img.className = "card-img";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = entry.title;

      const sub = document.createElement("div");
      sub.className = "card-sub";
      sub.textContent = entry.sub;

      card.append(img, title, sub);
      grid.appendChild(card);
    });
}
