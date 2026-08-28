function renderGrcDomains(domains, gridSelector) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;

  domains
    .filter(domain => domain.enabled !== false)
    .forEach(domain => {
      const link = document.createElement("div");
      link.className = "card card-link";
      link.dataset.link = domain.link;
      link.onclick = () => openModal(domain.link, domain.title);

      const header = document.createElement("div");
      header.className = "card-header";

      const icon = document.createElement("div");
      icon.className = "card-icon";
      icon.textContent = domain.icon;

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = domain.title;

      header.append(icon, title);

      const body = document.createElement("div");
      body.className = "card-body";
      body.textContent = domain.description;

      link.append(header, body);
      grid.appendChild(link);
    });
}