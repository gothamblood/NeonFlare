// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  // One tile per entry in the Tools category registry (see
  // assets/script/tools-config.js, managed from Settings > Config Tools)
  // -- the 10 built-ins point at their existing static tools/*.html page,
  // anything added via the builder points at tools/custom.html?catId=...
  function renderToolsPanel() {
    const grid = document.getElementById("toolsPanelGrid");
    grid.innerHTML = "";
    getToolsCategories().forEach((cat) => {
      const tile = document.createElement("div");
      tile.className = "tool-tile";
      tile.onclick = () => openToolModal(cat.id);
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
  renderToolsPanel();

  // getCategoryFn defaults to the Tools registry -- the DevSecOps panel
  // below passes getDevSecOpsCategory instead, reusing the same modal
  // (only one of these panels' modals is ever open at a time) since the
  // two registries are otherwise identical in shape (id/title/page).
  function openToolModal(catId, getCategoryFn) {
    const cat = (getCategoryFn || getToolsCategory)(catId);
    if (!cat) return;
    const frame = document.getElementById("modal-tool-frame");
    frame.style.height = "100px";
    document.getElementById("modal-tool-title").textContent = cat.title;
    frame.src = "../tools/" + cat.page;
    document.getElementById("overlay").style.display = "block";
    document.getElementById("modal-tool").style.display = "flex";
    // Lets index.html drop the persistent shells overlay behind #frame
    // while this is open -- see the "tool-modal-state" handler in
    // assets/script/shells-host.js.
    window.top.postMessage({ type: "tool-modal-state", open: true }, "*");
  }

  function closeToolModal() {
    document.getElementById("overlay").style.display = "none";
    document.getElementById("modal-tool").style.display = "none";
    document.getElementById("modal-tool-frame").src = "about:blank";
    window.top.postMessage({ type: "tool-modal-state", open: false }, "*");
  }

  // Embedded tools/*.html pages report their real content height so the
  // iframe can be sized exactly to it -- no dead space, no inner scrollbar.
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "tool-frame-height") {
      const frame = document.getElementById("modal-tool-frame");
      if (frame.contentWindow === e.source) {
        frame.style.height = e.data.height + "px";
      }
    }
  });
