// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  const requestedDashboardId = new URLSearchParams(window.location.search).get("id") || "default";
  const currentDashboardId = getDashboards().some((d) => d.id === requestedDashboardId) ? requestedDashboardId : "default";

  document.querySelector(".category-title").textContent = getDashboard(currentDashboardId).name;

  function goToDashboard(id) {
    window.location.href = "dashboard.html" + (id === "default" ? "" : "?id=" + encodeURIComponent(id));
  }

  function renderDashboardMenu() {
    const menu = document.getElementById("dashboardMenu");
    menu.innerHTML = "";
    getDashboards().forEach((d) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dash-shell-menu-item";
      btn.textContent = (d.id === currentDashboardId ? "● " : "") + d.name;
      btn.onclick = () => goToDashboard(d.id);
      menu.appendChild(btn);
    });

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "dash-shell-menu-item";
    addBtn.textContent = "+ Add Dashboard";
    addBtn.onclick = () => {
      const name = prompt("Nom du nouveau dashboard :");
      if (!name || !name.trim()) return;
      goToDashboard(addDashboard(name.trim()));
    };
    menu.appendChild(addBtn);
  }

  renderDashboardMenu();

  (function initDashboardPicker() {
    const picker = document.getElementById("dashboardPicker");
    const btn = document.getElementById("btnDashboardMenu");
    const menu = document.getElementById("dashboardMenu");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Close any other open picker menu (eg. the "+ Shell" one) first --
      // see the matching comment in dashboard-shells.js's initShellPicker.
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
