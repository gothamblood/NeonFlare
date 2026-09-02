/* Shells panel chrome for dashboard.html -- the real terminals live in
   the parent frame (index.html / assets/script/shells-host.js) so they
   keep running when this page is navigated away from. This script just
   relays "+Shell" clicks up, mirrors active/inactive state down, and
   continuously reports where the placeholder sits so the parent's
   overlay can track it. */

function reportReady() {
  window.top.postMessage({ type: "dashboard-shells-ready" }, "*");
}

function applyShellsState(active) {
  const panel = document.getElementById("panelShells");
  if (!panel) return;
  if (!active) {
    panel.classList.add("hidden");
  } else {
    panel.classList.remove("hidden");
    panel.classList.remove("collapsed");
    const btn = panel.querySelector(".dash-collapse-btn");
    if (btn) btn.textContent = "–";
    // Network may have been manually resized while this panel was
    // hidden (0x0, so dashboard-layout.js's own detach-group logic
    // never froze this one alongside it) -- give it a rect that
    // doesn't overlap Network's now-unrelated frozen box instead of
    // falling back to flexbox's "only child in the row" full width.
    // No-op whenever Network was never touched -- see the function's
    // own comment in dashboard-layout.js.
    if (window.dashLayoutReconcileWithDetachedSibling) window.dashLayoutReconcileWithDetachedSibling(panel);
  }
  reportRect();
}

function isShellAreaVisible() {
  const panel = document.getElementById("panelShells");
  // Collapsed is NOT excluded here: per .dash-row-top > .dash-panel-shells
  // .collapsed in dashboard-panels.css, collapsed narrows the shell windows
  // to one stacked column rather than hiding them -- they're still
  // genuinely on screen, so the overlay must keep tracking #shellArea's
  // rect, or it freezes at whatever position/size it had right before
  // collapsing (which can be wildly wrong after further layout changes,
  // eg. a window resize) instead of following the now-narrow panel.
  //
  // offsetParent is null for display:none (and detached) elements -- catches
  // the panel being hidden by any means (eg. Settings > Sections du
  // Dashboard hiding it via inline style, or shells-host.js's own .hidden
  // when no shell is open).
  return !!panel && !panel.classList.contains("hidden") && panel.offsetParent !== null;
}

function reportRect() {
  const shellArea = document.getElementById("shellArea");
  if (!shellArea) return;
  const visible = isShellAreaVisible();
  const rect = visible ? shellArea.getBoundingClientRect() : null;
  window.top.postMessage({
    type: "shells-rect",
    visible,
    rect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
  }, "*");
}

function togglePanel(targetId) {
  const panel = document.getElementById(targetId);
  if (!panel) return;
  panel.classList.toggle("collapsed");
  const btn = panel.querySelector(".dash-collapse-btn");
  if (btn) btn.textContent = panel.classList.contains("collapsed") ? "+" : "–";
  // Any panel toggling can reflow the shells panel's own size/position
  // (see the :has() rules in dashboard-panels.css), not just its own.
  reportRect();
}

// The real shell terminals are drawn by the PARENT document (index.html)
// as an overlay tracking #frame's rect -- they're not inside this iframe
// at all, so no z-index set in here can ever put a dropdown above them;
// that's a separate stacking layer entirely. index.html already has a
// mechanism for exactly this (dropping the overlay behind #frame while a
// modal is open, see shells-host.js's updateOverlayForeground) -- reused
// here under its own flag so it doesn't get tangled with modalOpen.
function notifyShellMenuState() {
  const anyOpen = !!document.querySelector(".dash-shell-menu.open");
  window.top.postMessage({ type: "dashboard-menu-state", open: anyOpen }, "*");
}

function initShellPicker() {
  const picker = document.getElementById("shellPicker");
  const addBtn = document.getElementById("btnAddShell");
  const menu = document.getElementById("shellMenu");
  if (!picker || !addBtn || !menu) return;

  addBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Close any other open picker menu (eg. the Dashboards switcher) first
    // -- each picker's own stopPropagation() above stops its click from
    // ever reaching the OTHER picker's "click outside" listener below, so
    // without this, opening one while the other is already open left both
    // open at once, overlapping.
    document.querySelectorAll(".dash-shell-menu.open").forEach((m) => {
      if (m !== menu) m.classList.remove("open");
    });
    menu.classList.toggle("open");
    notifyShellMenuState();
  });

  menu.querySelectorAll(".dash-shell-menu-item").forEach((item) => {
    item.addEventListener("click", () => {
      window.top.postMessage({ type: "shell-request-add", shellType: item.dataset.shell }, "*");
      menu.classList.remove("open");
      notifyShellMenuState();
    });
  });

  document.addEventListener("click", (e) => {
    if (!picker.contains(e.target)) {
      menu.classList.remove("open");
      notifyShellMenuState();
    }
  });
}

function initDashboardPanels() {
  initShellPicker();

  document.querySelectorAll(".dash-collapse-btn").forEach((btn) => {
    btn.addEventListener("click", () => togglePanel(btn.dataset.target));
  });

  window.addEventListener("message", (e) => {
    if (e.source !== window.top || !e.data) return;
    if (e.data.type === "shells-state") applyShellsState(e.data.active);
  });

  reportReady();
  reportRect();
  // Sidebar toggling, sibling panels collapsing, and window resizes can
  // all move or resize #shellArea -- polling is simpler and more robust
  // than trying to wire a listener for every possible cause.
  setInterval(reportRect, 60);
  window.addEventListener("resize", reportRect);
}
