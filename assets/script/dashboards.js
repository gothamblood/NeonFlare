/* Multi-dashboard registry, shared between project/dashboard.html (the
   dashboard switcher) and project/settings.html (one "Sections du
   Dashboard" card per dashboard) -- no backend, everything lives in
   localStorage like the rest of the site's config.

   The "default" dashboard doesn't need an entry in the registry to
   exist (so a fresh localStorage still shows exactly the one dashboard
   that existed before this feature) -- getDashboards() falls back to
   DEFAULT_DASHBOARD's name when there's no "default" entry. Renaming it
   just adds one, same as any other dashboard. Its hidden sections stay
   under the original, unprefixed key so upgrading doesn't reset
   anyone's existing toggles. */

const DASHBOARDS_KEY = "/settings.html/dashboards";
const DEFAULT_DASHBOARD = { id: "default", name: "Dashboard" };

// Single source of truth for which panels/widgets "Sections du Dashboard"
// (Settings) and the in-dashboard "☰ Panneaux" picker (dashboard.html)
// both toggle -- `key` must match the panel's own `id` (or, for
// grcHeaderStatus, the header widget's id) so setDashboardSectionVisible()
// below can add/remove .dash-section-off on the right element either way.
const DASHBOARD_SECTIONS = [
  { key: "panelShells", label: "Shells" },
  { key: "panelFs", label: "Explorateur" },
  { key: "panelNetwork", label: "Réseau" },
  { key: "panelTools", label: "Outils" },
  { key: "panelDevSecOps", label: "DevSecOps" },
  { key: "panelWebsite", label: "Website" },
  { key: "panelLog", label: "System log" },
  { key: "panelGrc", label: "Couverture GRC (panneau)" },
  { key: "grcHeaderStatus", label: "Couverture GRC (en-tête)" },
  { key: "panelUpcomingReviews", label: "Prochaines revues" },
];

function getRawExtraDashboards() {
  try {
    return JSON.parse(localStorage.getItem(DASHBOARDS_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function getDashboards() {
  const raw = getRawExtraDashboards();
  const defaultOverride = raw.find((d) => d.id === "default");
  const others = raw.filter((d) => d.id !== "default");
  return [defaultOverride ? { id: "default", name: defaultOverride.name } : DEFAULT_DASHBOARD, ...others];
}

function saveExtraDashboards(list) {
  localStorage.setItem(DASHBOARDS_KEY, JSON.stringify(list));
}

// Both dashboard.html (its own "☰ Dashboards" switcher) and settings.html
// (the per-dashboard cards) can add/remove/rename dashboards while
// embedded in index.html's iframe -- the sidebar's own list of
// dashboards only reads this registry on load, so it needs telling
// whenever it changes.
function notifyDashboardsChanged() {
  if (window.top !== window.self) {
    window.top.postMessage({ type: "dashboards-change" }, "*");
  }
}

function addDashboard(name) {
  const id = "dash-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const raw = getRawExtraDashboards();
  raw.push({ id, name });
  saveExtraDashboards(raw);
  notifyDashboardsChanged();
  return id;
}

function removeDashboard(id) {
  if (id === "default") return;
  const raw = getRawExtraDashboards().filter((d) => d.id !== id);
  saveExtraDashboards(raw);
  localStorage.removeItem(hiddenSectionsKey(id));
  notifyDashboardsChanged();
}

function renameDashboard(id, name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  const raw = getRawExtraDashboards().filter((d) => d.id !== id);
  raw.push({ id, name: trimmed });
  saveExtraDashboards(raw);
  notifyDashboardsChanged();
}

function getDashboard(id) {
  return getDashboards().find((d) => d.id === id) || DEFAULT_DASHBOARD;
}

function hiddenSectionsKey(dashboardId) {
  return dashboardId === "default"
    ? "/settings.html/hiddenDashboardSections"
    : "/settings.html/hiddenDashboardSections/" + dashboardId;
}

// A brand-new "default" dashboard (nothing saved yet -- the getItem
// below is genuinely null, not just an empty array) starts with only
// Shells + Tools visible, so a first-time user isn't greeted by every
// panel at once. Shells manages its own show/hide separately (empty vs.
// has an open terminal, see dash-panel-shells.hidden in dashboard.html)
// so it doesn't need listing here -- only the panels that DASHBOARD_
// SECTIONS actually toggles need to start hidden. Any other dashboard
// (created later via Multi-Dashboard) still starts with everything
// visible, same as before. The instant a user touches any toggle for
// "default", this seed is gone for good -- the saved array becomes the
// only source of truth from then on, same lazy-migration pattern as the
// rest of this file.
const DEFAULT_DASHBOARD_HIDDEN_SECTIONS = ["panelFs", "panelNetwork", "panelDevSecOps", "panelWebsite", "panelLog", "panelGrc", "grcHeaderStatus", "panelUpcomingReviews"];

function getHiddenDashboardSections(dashboardId) {
  try {
    const raw = localStorage.getItem(hiddenSectionsKey(dashboardId));
    if (raw === null) return dashboardId === "default" ? DEFAULT_DASHBOARD_HIDDEN_SECTIONS : [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function setDashboardSectionVisible(dashboardId, key, visible) {
  let hidden = getHiddenDashboardSections(dashboardId);
  hidden = hidden.filter((k) => k !== key);
  if (!visible) hidden.push(key);
  localStorage.setItem(hiddenSectionsKey(dashboardId), JSON.stringify(hidden));
}
