// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  // One tile per entry in the Website category registry (see
  // assets/script/website-config.js, managed from Settings > Config
  // Website).
  function renderWebsitePanel() {
    const grid = document.getElementById("websitePanelGrid");
    grid.innerHTML = "";
    getWebsiteCategories().forEach((cat) => {
      const tile = document.createElement("div");
      tile.className = "tool-tile";
      tile.onclick = () => openWebsiteModal(cat.title, cat.links || []);
      const title = document.createElement("div");
      title.className = "tool-tile-title";
      title.textContent = cat.title;
      tile.appendChild(title);
      const sub = document.createElement("div");
      sub.className = "tool-tile-sub";
      sub.textContent = cat.sub || "";
      tile.appendChild(sub);
      grid.appendChild(tile);
    });
  }
  renderWebsitePanel();

  function openWebsiteModal(title, links) {
    document.getElementById("website-title").textContent = title;

    // Name alone (no visible URL) made it impossible to tell where a
    // link actually goes without hovering or clicking it -- the URL is
    // now shown as its own line under the name, not just left in the
    // href attribute.
    let html = '<ul class="website-link-list">';
    links.forEach(link => {
      html += `<li class="website-link-row"><a href="${link.url}" target="_blank" rel="noopener">` +
        `<span class="website-link-name">${link.name}</span>` +
        `<span class="website-link-url">${link.url}</span>` +
        `</a></li>`;
    });
    html += "</ul>";

    document.getElementById("website-content").innerHTML = html;
    document.getElementById("overlay").style.display = "block";
    document.getElementById("modal-website").style.display = "flex";
    window.top.postMessage({ type: "tool-modal-state", open: true }, "*");
  }

  function closeWebsiteModal() {
    document.getElementById("overlay").style.display = "none";
    document.getElementById("modal-website").style.display = "none";
    window.top.postMessage({ type: "tool-modal-state", open: false }, "*");
  }
