// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  // One tile per entry in the DevSecOps category registry (see
  // assets/script/devsecops-config.js, managed from Settings > Config
  // DevSecOps) -- the 5 built-ins point at their own static tools/*.html
  // page, anything added via the builder points at
  // tools/devsecops-custom.html?catId=...
  function renderDevSecOpsPanel() {
    const grid = document.getElementById("devsecopsPanelGrid");
    grid.innerHTML = "";
    getDevSecOpsCategories().forEach((cat) => {
      const tile = document.createElement("div");
      tile.className = "tool-tile";
      tile.onclick = () => openToolModal(cat.id, getDevSecOpsCategory);
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
  renderDevSecOpsPanel();
