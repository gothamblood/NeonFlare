/* Central registry for the two ambient visual effects that used to be
   hardcoded per page -- the GRC hub's "vectors" (drifting connected-dot
   canvas, assets/script/network-background.js) and the tools/dashboard
   pages' "stars" (floating embers, assets/script/particles.js) -- plus
   the background-image override this already shared a Settings tab
   with (see wallpaper-loader.js). Same lazy-migration shape as every
   other *-config.js here: nothing written to localStorage until the
   user actually flips a toggle, so a fresh install shows exactly
   whatever each page always showed (DEFAULT_VECTOR_PAGES / DEFAULT_
   STAR_PAGES below, one Set entry per page that already had it before
   this settings existed).

   Every page below reports its own identity via <body data-page-key="...">
   -- assets/script/page-effects-loader.js reads that once, applies
   whichever of vectors/stars are on for it, and needs nothing else
   page-specific. Background stays wired per-page (each page's own
   config file supplies ITS OWN default path -- there's no way to
   centralize that part), see wallpaper-loader.js's applyWallpaper(). */

const PAGE_EFFECTS_KEY = "/settings.html/pageEffects";

// group: only used to organize the Settings > Apparence list.
// bg: true only for pages with a .wallpaper div of their own -- GRC
// pages use a plain CSS gradient instead (see assets/css/grc.css) and
// aren't part of the background-override system.
const PAGE_EFFECTS_REGISTRY = [
  { group: "Pages principales", key: "about", label: "About", bg: true },
  { group: "Pages principales", key: "settings", label: "Settings", bg: true },
  { group: "Pages principales", key: "pentest", label: "Findings", bg: true },
  { group: "Pages principales", key: "neonflare-technology", label: "NeonFlare Technology", bg: true },
  { group: "Pages principales", key: "dashboard", label: "Dashboard (vecteurs/étoiles -- fond par dashboard, voir Interface)", bg: false },

  { group: "GRC", key: "grc-hub", label: "GRC -- Hub", bg: false },
  { group: "GRC", key: "grc-api", label: "GRC -- Sécurité API", bg: false },
  { group: "GRC", key: "grc-database", label: "GRC -- Sécurité Base de données", bg: false },
  { group: "GRC", key: "grc-reseau", label: "GRC -- Sécurité Réseau", bg: false },
  { group: "GRC", key: "grc-webapp", label: "GRC -- Sécurité WebApp", bg: false },

  { group: "Outils", key: "tools-recon", label: "Recon & Enumeration", bg: true },
  { group: "Outils", key: "tools-web", label: "Web Exploitation", bg: true },
  { group: "Outils", key: "tools-linux", label: "Linux PrivEsc", bg: true },
  { group: "Outils", key: "tools-windows", label: "Windows PrivEsc", bg: true },
  { group: "Outils", key: "tools-ad", label: "Active Directory Attacks", bg: true },
  { group: "Outils", key: "tools-lateral", label: "Lateral Movement", bg: true },
  { group: "Outils", key: "tools-c2", label: "C2 Frameworks", bg: true },
  { group: "Outils", key: "tools-post", label: "Post-Exploitation", bg: true },
  { group: "Outils", key: "tools-osint", label: "OSINT", bg: true },
  { group: "Outils", key: "tools-misc", label: "Autres", bg: true },
  { group: "Outils", key: "tools-custom", label: "Catégories personnalisées", bg: true },

  { group: "DevSecOps", key: "devsecops-docker", label: "Docker", bg: true },
  { group: "DevSecOps", key: "devsecops-kubernetes", label: "Kubernetes", bg: true },
  { group: "DevSecOps", key: "devsecops-terraform", label: "Terraform", bg: true },
  { group: "DevSecOps", key: "devsecops-aws", label: "AWS CLI", bg: true },
  { group: "DevSecOps", key: "devsecops-azure", label: "Azure CLI", bg: true },
  { group: "DevSecOps", key: "devsecops-custom", label: "Catégories personnalisées", bg: true },
];

const DEFAULT_VECTOR_PAGES = new Set(["grc-hub", "grc-api", "grc-database", "grc-reseau", "grc-webapp"]);

const DEFAULT_STAR_PAGES = new Set([
  "dashboard", "neonflare-technology",
  "tools-recon", "tools-web", "tools-linux", "tools-windows", "tools-ad",
  "tools-lateral", "tools-c2", "tools-post", "tools-osint", "tools-misc", "tools-custom",
  "devsecops-docker", "devsecops-kubernetes", "devsecops-terraform", "devsecops-aws", "devsecops-azure", "devsecops-custom",
]);

function getRawPageEffects() {
  try {
    return JSON.parse(localStorage.getItem(PAGE_EFFECTS_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

function savePageEffects(all) {
  localStorage.setItem(PAGE_EFFECTS_KEY, JSON.stringify(all));
}

// undefined in storage means "use this page's own built-in default"
// (DEFAULT_VECTOR_PAGES / DEFAULT_STAR_PAGES) throughout -- only an
// explicit true/false ever overrides that.
function getPageEffect(pageKey, kind) {
  const all = getRawPageEffects();
  const stored = all[pageKey] && all[pageKey][kind];
  if (typeof stored === "boolean") return stored;
  return kind === "vectors" ? DEFAULT_VECTOR_PAGES.has(pageKey) : DEFAULT_STAR_PAGES.has(pageKey);
}

function setPageEffect(pageKey, kind, value) {
  const all = getRawPageEffects();
  all[pageKey] = Object.assign({}, all[pageKey], { [kind]: value });
  savePageEffects(all);
}

function resetPageEffects() {
  localStorage.removeItem(PAGE_EFFECTS_KEY);
}
