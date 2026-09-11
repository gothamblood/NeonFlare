// Was an inline <script> on project/dashboard.html -- externalized
// for CSP script-src (PlanDurcissement-Securite.txt P1).

  (function initTabLink() {
    const picker = document.getElementById("tabLinkPicker");
    const btn = document.getElementById("btnTabLink");
    const menu = document.getElementById("tabLinkMenu");
    if (!picker || !btn || !menu) return;

    const embedded = window.self !== window.top;
    let state = { peers: [], enabled: false, targetId: null };

    function query() {
      if (embedded) window.top.postMessage({ type: "tablink-query" }, "*");
    }
    function setState(enabled, targetId) {
      if (embedded) window.top.postMessage({ type: "tablink-set", enabled, targetId }, "*");
    }

    function targetLabel() {
      const p = state.peers.find((x) => x.tabId === state.targetId);
      return p ? p.label : null;
    }

    function render() {
      const name = targetLabel();
      const active = state.enabled && !!name;
      btn.textContent = active ? "🔗 → " + name : "🔗 Link";
      btn.classList.toggle("tl-on", active);

      menu.innerHTML = "";

      const toggle = document.createElement("label");
      toggle.className = "dash-panels-menu-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = state.enabled;
      cb.addEventListener("click", (e) => e.stopPropagation());
      cb.addEventListener("change", () => {
        const t = state.targetId || (state.peers[0] && state.peers[0].tabId) || null;
        setState(cb.checked, t);
      });
      toggle.appendChild(cb);
      toggle.appendChild(document.createTextNode("Actif"));
      menu.appendChild(toggle);

      if (state.peers.length === 0) {
        const empty = document.createElement("div");
        empty.className = "dash-shell-menu-item";
        empty.style.opacity = "0.6";
        empty.style.cursor = "default";
        empty.textContent = "Aucun autre onglet ouvert";
        menu.appendChild(empty);
      } else {
        state.peers.forEach((p) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "dash-shell-menu-item";
          item.textContent = (p.tabId === state.targetId ? "● " : "") + p.label;
          item.addEventListener("click", () => setState(true, p.tabId));
          menu.appendChild(item);
        });
      }
    }

    window.addEventListener("message", (e) => {
      if (!e.data) return;
      if (e.data.type === "tablink-state") {
        state = {
          peers: Array.isArray(e.data.peers) ? e.data.peers : [],
          enabled: !!e.data.enabled,
          targetId: e.data.targetId || null,
        };
        render();
      } else if (e.data.type === "tablink-activity") {
        btn.classList.add("tl-pulse");
        clearTimeout(btn._tlPulseTimer);
        btn._tlPulseTimer = setTimeout(() => btn.classList.remove("tl-pulse"), 300);
      }
    });

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".dash-shell-menu.open").forEach((m) => {
        if (m !== menu) m.classList.remove("open");
      });
      menu.classList.toggle("open");
      notifyShellMenuState();
      query();
    });
    document.addEventListener("click", (e) => {
      if (!picker.contains(e.target)) {
        menu.classList.remove("open");
        notifyShellMenuState();
      }
    });

    render();
    query();
    setInterval(query, 2000);
  })();
