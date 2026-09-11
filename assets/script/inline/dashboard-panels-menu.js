// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  function renderPanelsMenu() {
    const menu = document.getElementById("panelsMenu");
    menu.innerHTML = "";
    const hidden = getHiddenDashboardSections(currentDashboardId);
    DASHBOARD_SECTIONS.forEach((section) => {
      const key = section.key;
      const row = document.createElement("label");
      row.className = "dash-panels-menu-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !hidden.includes(key);
      cb.addEventListener("click", (e) => e.stopPropagation());
      cb.addEventListener("change", () => {
        setDashboardSectionVisible(currentDashboardId, key, cb.checked);
        const el = document.getElementById(key);
        if (el) el.classList.toggle("dash-section-off", !cb.checked);
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(dashSectionLabel(section)));
      menu.appendChild(row);
    });
  }

  renderPanelsMenu();

  (function initPanelsPicker() {
    const picker = document.getElementById("panelsPicker");
    const btn = document.getElementById("btnPanelsMenu");
    const menu = document.getElementById("panelsMenu");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".dash-shell-menu.open").forEach((m) => {
        if (m !== menu) m.classList.remove("open");
      });
      menu.classList.toggle("open");
      notifyShellMenuState();
    });
    document.addEventListener("click", (e) => {
      if (!picker.contains(e.target)) {
        menu.classList.remove("open");
        notifyShellMenuState();
      }
    });
  })();
