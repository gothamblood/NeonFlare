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
// `label` is the French fallback ; `i18nKey` (added 2026-09-11, same
// sweep as dashboard.html's own panel titles) is preferred via
// dashSectionLabel() below wherever this list is displayed.
const DASHBOARD_SECTIONS = [
  { key: "panelShells", label: "Shells", i18nKey: "dash.panel.shells" },
  { key: "panelFs", label: "Explorateur", i18nKey: "dash.panel.explorer" },
  { key: "panelNetwork", label: "Réseau", i18nKey: "dash.panel.network" },
  { key: "panelTools", label: "Outils", i18nKey: "dash.panel.tools" },
  { key: "panelDevSecOps", label: "DevSecOps", i18nKey: "dash.panel.devsecops" },
  { key: "panelWebsite", label: "Website", i18nKey: "dash.panel.website" },
  { key: "panelLog", label: "System log", i18nKey: "dash.panel.systemLog" },
  { key: "panelGrc", label: "Couverture GRC (panneau)", i18nKey: "dash.panel.grcPanel" },
  { key: "grcHeaderStatus", label: "Couverture GRC (en-tête)", i18nKey: "dash.panel.grcHeader" },
  { key: "panelUpcomingReviews", label: "Prochaines revues", i18nKey: "dash.panel.upcomingReviews" },
];

// Guarded on `grcT` (dashboards.js is loaded on index.html, dashboard.html
// and settings.html -- all three already load i18n.js too, but this
// keeps the fallback explicit rather than assuming it).
function dashSectionLabel(section) {
  return (section.i18nKey && typeof grcT === "function") ? grcT(section.i18nKey) : section.label;
}

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

/* Tableaux de bord préconstruits d'un NOUVEL utilisateur (2026-09-23).
   Un nouveau venu reçoit 4 tableaux au lieu d'un seul :
     Dashboard           Réseau + System log              (id "default")
     Système d'attaque   Shells (un Bash déjà ouvert) + Outils
     File Explorer       Explorateur
     GRC & Website       Couverture GRC (panneau, en-tête), Prochaines
                         revues, Website
   Tout panneau non cité (ex. DevSecOps) est masqué, et reste activable
   par « ☰ Panneaux » ou Paramètres > Sections du Dashboard.

   « Nouveau » = visite guidée jamais terminée ET aucun tableau ni aucun
   choix de panneaux enregistré : un utilisateur existant garde
   exactement sa configuration (son tableau par défaut garde le seed
   historique DEFAULT_DASHBOARD_HIDDEN_SECTIONS ci-dessus). Les tableaux
   sont ÉCRITS dès le premier chargement (pas calculés à la volée) : ils
   survivent ainsi à la fin de la visite guidée, qui pose
   ONBOARDING_DONE_KEY, et se renomment / suppriment comme les autres. */
const NEW_USER_DASHBOARDS = [
  { id: "default", name: "Dashboard", visible: ["panelNetwork", "panelLog"] },
  { id: "seed-attaque", name: "Système d’attaque", visible: ["panelShells", "panelTools"] },
  { id: "seed-explorer", name: "File Explorer", visible: ["panelFs"] },
  { id: "seed-grc-website", name: "GRC & Website", visible: ["panelGrc", "grcHeaderStatus", "panelUpcomingReviews", "panelWebsite"] },
];
const _NEW_USER_ONBOARDING_KEY = "/settings.html/onboardingDone";
const NEW_USER_OPEN_SHELLS_KEY = "/index.html/openShells"; // = shells-host.js OPEN_SHELLS_STORAGE_KEY

function isNewDashboardUser() {
  try {
    return localStorage.getItem(_NEW_USER_ONBOARDING_KEY) === null &&
      localStorage.getItem(DASHBOARDS_KEY) === null &&
      localStorage.getItem(hiddenSectionsKey("default")) === null;
  } catch (e) {
    return false;
  }
}

function seedNewUserDashboards() {
  if (!isNewDashboardUser()) return false;
  const all = DASHBOARD_SECTIONS.map((s) => s.key);
  try {
    NEW_USER_DASHBOARDS.forEach((d) => {
      const hidden = all.filter((k) => d.visible.indexOf(k) === -1);
      localStorage.setItem(hiddenSectionsKey(d.id), JSON.stringify(hidden));
    });
    // Le tableau "default" garde son nom intégré (traduit dans la barre
    // latérale) : seuls les trois autres entrent dans le registre.
    saveExtraDashboards(NEW_USER_DASHBOARDS.filter((d) => d.id !== "default").map((d) => ({ id: d.id, name: d.name })));
    // Un Bash déjà ouvert (slot 1) : shells-host.js le restaure au
    // chargement (restoreOpenShells) et il s'affiche dans « Système
    // d'attaque », le seul tableau qui montre Shells. Si ttyd n'est pas
    // lancé, shells-host.js affiche un avertissement temporaire.
    if (localStorage.getItem(NEW_USER_OPEN_SHELLS_KEY) === null) {
      localStorage.setItem(NEW_USER_OPEN_SHELLS_KEY, JSON.stringify([{ type: "bash", slot: 1, title: "" }]));
    }
  } catch (e) {
    return false; // stockage bloqué : on reste sur le tableau unique historique
  }
  return true;
}

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

// Chargé par index.html, dashboard.html et settings.html : le premier
// chargement d'un nouvel utilisateur crée ses tableaux préconstruits.
seedNewUserDashboards();
