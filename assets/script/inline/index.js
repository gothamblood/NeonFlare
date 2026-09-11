// Was index.html's single big inline <script> (sidebar/router/theme-
// sync boot code) -- externalized verbatim for CSP script-src
// (PlanDurcissement-Securite.txt P1), plus the onclick="" wiring
// (P1.2) appended at the end.

    const frame = document.getElementById("frame");
    const sidebar = document.getElementById("sidebar");
    const content = document.getElementById("content");
    const toggleBtn = document.getElementById("toggleBtn");

    /* Theme (kept in sync with the theme picked in settings.html).
       Read directly from localStorage for the initial paint -- same as
       applyI18n(getSavedLang()) below -- so the sidebar doesn't flash
       back to the default theme on every refresh while waiting for the
       loaded page to report it via postMessage (still needed for a live
       update when the theme is changed without a reload). */
    function applyTheme(theme) {
      document.body.classList.remove("theme-standard", "theme-terminal", "theme-blade", "theme-tron", "theme-custom");
      document.body.classList.add("theme-" + (theme || "standard"));
      // "custom" carries no CSS rules of its own -- theme-accent.js
      // paints --accent (and shades) inline on <body> from the colour
      // saved in localStorage, and clears them for the other themes.
      if (typeof window.applyCustomAccent === "function") window.applyCustomAccent();
    }

    applyTheme(localStorage.getItem("/settings.html"));
    applyI18n(getSavedLang());

    /* Sidebar tagline (Settings > Apparence > Background): free text
       overriding .sidebar-edge's default data-i18n phrase, one override
       per language -- {fr: "...", en: "..."}, either key optional.
       A language with no override leaves data-i18n in place so
       applyI18n() above (and on every future lang-change) keeps
       painting that language's built-in phrase -- same "leave the
       attribute off once customized" trick renderDashboardNavItems()
       below already uses for a renamed dashboard, so a custom tagline
       can't get clobbered back by a later applyI18n() call. Read
       directly from localStorage for the initial paint (same reasoning
       as theme/lang above); kept live via postMessage while Settings is
       open. */
    const SIDEBAR_TAGLINE_KEY = "/settings.html/sidebarTagline";
    function getSidebarTaglineOverrides() {
      try {
        const parsed = JSON.parse(localStorage.getItem(SIDEBAR_TAGLINE_KEY) || "{}");
        return (parsed && typeof parsed === "object") ? parsed : {};
      } catch (e) {
        return {};
      }
    }
    function applySidebarTagline(lang, overrides) {
      const el = document.querySelector(".sidebar-edge");
      if (!el) return;
      const lg = lang || getSavedLang();
      const custom = (overrides || getSidebarTaglineOverrides())[lg];
      if (custom) {
        el.removeAttribute("data-i18n");
        el.textContent = custom;
      } else {
        el.setAttribute("data-i18n", "sidebar.tagline");
        applyI18n(lg);
      }
    }
    applySidebarTagline();

    /* Sidebar link visibility, toggled per-page in settings.html.
       Read directly from localStorage on load (same reasoning as the
       theme above), then kept live via postMessage while Settings is
       open. Hides the link only -- it doesn't block direct access to
       the page itself. */
    function getHiddenPages() {
      try {
        return JSON.parse(localStorage.getItem("/settings.html/hiddenPages") || "[]");
      } catch (e) {
        return [];
      }
    }

    function applyPageVisibility(hidden) {
      document.querySelectorAll("[data-nav]").forEach((el) => {
        el.style.display = hidden.includes(el.getAttribute("data-nav")) ? "none" : "";
      });
    }

    applyPageVisibility(getHiddenPages());

    /* One sidebar link per entry in the dashboard registry (see
       assets/script/dashboards.js) -- all share data-nav="dashboard" so
       the single "Dashboard" row in Settings > Pages visibles still
       controls them as a group. Re-run whenever dashboard.html's own
       switcher or settings.html's cards add/remove a dashboard, since
       this only reads the registry once up front otherwise. */
    function renderDashboardNavItems() {
      const container = document.getElementById("dashboardNavItems");
      container.innerHTML = "";
      getDashboards().forEach((d) => {
        const item = document.createElement("div");
        item.className = "menu-item";
        item.setAttribute("data-nav", "dashboard");
        // Only translate the default dashboard's label while it's still
        // its built-in name -- applyI18n() below would otherwise clobber
        // a custom rename right back to "Dashboard"/"Tableau de bord".
        if (d.id === "default" && d.name === DEFAULT_DASHBOARD.name) {
          item.setAttribute("data-i18n", "nav.dashboard");
        }
        item.textContent = d.name;
        item.onclick = () => loadPage("dashboard", d.id);
        container.appendChild(item);
      });
      applyI18n(getSavedLang());
      applyPageVisibility(getHiddenPages());
    }

    renderDashboardNavItems();

    window.addEventListener("message", (e) => {
      if (e.data && e.data.type === "theme-change") {
        applyTheme(e.data.theme);
      }
      if (e.data && e.data.type === "lang-change") {
        applyI18n(e.data.lang);
        onbApplyLang();
        applySidebarTagline(e.data.lang);
      }
      if (e.data && e.data.type === "sidebar-tagline-change") {
        applySidebarTagline(getSavedLang(), e.data.overrides);
      }
      if (e.data && e.data.type === "visibility-change") {
        applyPageVisibility(e.data.hidden);
      }
      if (e.data && e.data.type === "dashboards-change") {
        renderDashboardNavItems();
      }
      if (e.data && e.data.type === "dash-drag-active") {
        dashDragActive = e.data.active;
      }
      if (e.data && e.data.type === "open-onboarding-wizard") {
        onbStart();
      }
    });

    /* Onboarding tour (assets/script/onboarding-wizard.js): auto-starts
       once, on the very first load (no flag in localStorage yet).
       Re-launchable anytime after that from Settings, which posts
       "open-onboarding-wizard" up to this window since the tour is
       drawn here, not inside #frame. */
    onbMaybeAutoStart();

    // Dragging/resizing a dashboard panel (assets/script/dashboard-
    // layout.js) tracks the mouse via its OWN window's mousemove/mouseup
    // -- but the real shell terminals are drawn by shells-host.js as an
    // overlay in THIS document, sitting visually on top of the iframe
    // (see its own comments on always rendering above #frame). Releasing
    // the mouse over a terminal fires mouseup here, not in the iframe,
    // so dashboard-layout.js never saw it and the drag got stuck
    // following the mouse forever. Relay both events down (in the
    // iframe's own coordinate space) only while a drag is actually
    // active, so dashboard-layout.js's own listeners can end it exactly
    // like a same-document mouseup would have.
    let dashDragActive = false;
    function relayToDashboardFrame(type, e) {
      if (!dashDragActive) return;
      const rect = frame.getBoundingClientRect();
      frame.contentWindow.postMessage({
        type,
        clientX: e.clientX - rect.left,
        clientY: e.clientY - rect.top,
      }, "*");
    }
    window.addEventListener("mousemove", (e) => relayToDashboardFrame("top-mousemove", e));
    window.addEventListener("mouseup", (e) => relayToDashboardFrame("top-mouseup", e));

    // Fallback for the message above: on some browsers a same-origin
    // file:// iframe's postMessage to window.top doesn't reliably reach
    // this listener. Poll the raw registry instead -- cheap (one string
    // compare a second) and catches every add/rename/remove regardless
    // of whether the message got through.
    let lastDashboardsSnapshot = localStorage.getItem(DASHBOARDS_KEY);
    setInterval(() => {
      const current = localStorage.getItem(DASHBOARDS_KEY);
      if (current !== lastDashboardsSnapshot) {
        lastDashboardsSnapshot = current;
        renderDashboardNavItems();
      }
    }, 1000);

    /* Sidebar toggle */
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      content.classList.toggle("shifted");
    });

    // #content's margin-left transition (0.3s, see .content.shifted)
    // moves #frame -- and with it, whatever dashboard panel the guided
    // tour (assets/script/onboarding-wizard.js) is currently pointing
    // at. Re-request that panel's rect once the transition settles.
    content.addEventListener("transitionend", (e) => {
      if (e.propertyName !== "margin-left" || !onbActive) return;
      const step = ONBOARDING_STEPS[onbStepIndex];
      if (step && step.target) onbRequestPanelRect(step.target, step.page, step.scrollAlign);
    });

    /* Router */
    // Pages that live in their own folder (with their own index.html hub)
    // get an alias so ?page=grc / loadPage('grc') still resolve correctly.
    const PAGE_ALIASES = {
      dashboard: "project/dashboard",
      topology: "project/topology",
      pentest: "project/pentest",
      "GothamBlood-tech": "project/neonflare-technology",
      settings: "project/settings",
      about: "project/about",
      grc: "grc/index",
      "securite-reseau": "grc/securite/reseau/index",
      "securite-api": "grc/securite/api/index",
      "securite-webapp": "grc/securite/webapp/index",
      "securite-database": "grc/securite/database/index",
    };

    function resolvePage(page) {
      return PAGE_ALIASES[page] || page;
    }

    function toggleSubmenu(e, id) {
      e.stopPropagation();
      document.getElementById(id).classList.toggle("open");
      e.currentTarget.classList.toggle("open");
    }

    function loadPage(page, dashboardId) {
      // Hide the shells overlay right away instead of waiting on the
      // stale-rect fallback in shells-host.js (up to ~750ms) -- the
      // outgoing page stops reporting its rect the instant it's
      // navigated away from, but that safety net is only meant to
      // catch a crashed/frozen page, not routine navigation.
      hideOverlay();
      const isNonDefaultDashboard = page === "dashboard" && dashboardId && dashboardId !== "default";
      const idSuffix = isNonDefaultDashboard ? "&id=" + encodeURIComponent(dashboardId) : "";
      frame.src = resolvePage(page) + ".html" + (isNonDefaultDashboard ? "?id=" + encodeURIComponent(dashboardId) : "");
      history.pushState(null, "", "?page=" + page + idSuffix);
    }

    function initPage() {
      const params = new URLSearchParams(window.location.search);
      const page = params.get("page");
      const dashboardId = params.get("id");

      if (!page) {
        frame.src = "project/dashboard.html";
      } else if (page === "dashboard" && dashboardId && dashboardId !== "default") {
        frame.src = resolvePage(page) + ".html?id=" + encodeURIComponent(dashboardId);
      } else {
        frame.src = resolvePage(page) + ".html";
      }
    }

    window.onpopstate = initPage;

    initPage();


// Was 12 onclick="" attributes on the sidebar menu items -- converted to
// data-load-page/data-submenu-toggle + delegated listeners
// (PlanDurcissement-Securite.txt P1.2).
document.querySelectorAll("[data-load-page]").forEach((el) => {
  el.addEventListener("click", () => loadPage(el.dataset.loadPage));
});
document.querySelectorAll("[data-submenu-toggle]").forEach((el) => {
  el.addEventListener("click", (e) => toggleSubmenu(e, el.dataset.submenuToggle));
});
