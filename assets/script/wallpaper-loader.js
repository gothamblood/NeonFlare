/* Every page's own default background lives in its own config file
   (config/settings.js, config/about.js, config/tools/*.js, ...) and is
   passed in as `imagePath` -- unchanged behavior. Settings > Apparence
   > Background adds two overrides on top, most specific wins:
     1. per-page (or, for the Dashboard, per-dashboard-instance -- see
        below) -- PAGE_WALLPAPER_OVERRIDES_KEY, a flat {pageKey: file}
        map covering every page in assets/script/page-effects.js's own
        registry, PLUS one "dashboard:<id>" entry per dashboard someone
        has actually picked a background for (Settings > Interface,
        not Apparence -- a dashboard's background lives with its other
        per-dashboard settings, not in the flat page list).
     2. global -- WALLPAPER_OVERRIDE_KEY, the original single override,
        applied wherever no more specific one is set.
   Neither set: each page falls straight back to its own default
   exactly as before either of these existed. */

const WALLPAPER_OVERRIDE_KEY = "/settings.html/wallpaperOverride";
const PAGE_WALLPAPER_OVERRIDES_KEY = "/settings.html/pageWallpaperOverrides";

// Captured once, while this script itself is the one executing --
// document.currentScript would resolve to the wrong (calling) script if
// read lazily from inside applyWallpaper() below, since by the time
// that runs this is no longer the active script. Browsers always
// resolve a <script src> to a full absolute URL regardless of how many
// "../" it took to get here, so stripping this file's own path back
// off that URL gives the site root correctly from any page depth
// (project/, tools/, grc/securite/reseau/, ...).
const WALLPAPER_LOADER_BASE = (function () {
  const src = document.currentScript && document.currentScript.src;
  return src ? src.replace(/assets\/script\/wallpaper-loader\.js.*$/, "") : "";
})();

// Curated, not "every file in assets/images/" -- that folder also holds
// small per-node icons (pfsense.png, wifi.png, ...) that were never
// meant to be stretched full-bleed behind a page. Filenames only
// (resolved against WALLPAPER_LOADER_BASE + "assets/images/" above) so
// the same stored value works unchanged from every page depth.
// i18nKey is only ever read by project/settings.html (the one page that
// renders this list as a <select>) -- label stays as the French
// fallback for the many other pages that load this file just for
// getWallpaperOverride()/applyWallpaper() and never touch the array's
// display text at all.
const WALLPAPER_OVERRIDE_OPTIONS = [
  { file: "kali_xl_forest_sharp.png", label: "Kali -- Forêt (par défaut)", i18nKey: "settings.wallpaper.forestDefault" },
  { file: "kali_xl_city.png", label: "Kali -- Ville", i18nKey: "settings.wallpaper.city" },
  { file: "kali_xl.png", label: "Kali", i18nKey: "settings.wallpaper.kali" },
  { file: "kali_xl_sharp.png", label: "Kali (nette)", i18nKey: "settings.wallpaper.kaliSharp" },
  { file: "atlantis.png", label: "Atlantis", i18nKey: "settings.wallpaper.atlantis" },
  { file: "atlantis_sharp.png", label: "Atlantis (nette)", i18nKey: "settings.wallpaper.atlantisSharp" },
  { file: "atlantis2_sharp.png", label: "Atlantis 2 (nette)", i18nKey: "settings.wallpaper.atlantis2Sharp" },
  { file: "hacker.jpg", label: "Hacker", i18nKey: "settings.wallpaper.hacker" },
  { file: "Internet-cyberpunk.png", label: "Internet cyberpunk", i18nKey: "settings.wallpaper.cyberpunk" },
  { file: "neon-network-architecture-stockcake4k.jpg", label: "Architecture réseau néon", i18nKey: "settings.wallpaper.neonNetwork" },
];

function getWallpaperOverride() {
  try {
    return localStorage.getItem(WALLPAPER_OVERRIDE_KEY) || "";
  } catch (e) {
    return "";
  }
}

function setWallpaperOverride(file) {
  if (file) localStorage.setItem(WALLPAPER_OVERRIDE_KEY, file);
  else localStorage.removeItem(WALLPAPER_OVERRIDE_KEY);
}

function getPageWallpaperOverrides() {
  try {
    return JSON.parse(localStorage.getItem(PAGE_WALLPAPER_OVERRIDES_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

function getPageWallpaperOverride(pageKey) {
  return pageKey ? getPageWallpaperOverrides()[pageKey] || "" : "";
}

function setPageWallpaperOverride(pageKey, file) {
  const all = getPageWallpaperOverrides();
  if (file) all[pageKey] = file;
  else delete all[pageKey];
  localStorage.setItem(PAGE_WALLPAPER_OVERRIDES_KEY, JSON.stringify(all));
}

// pageKey identifies the CALLER for override lookup purposes only -- it
// has nothing to do with <body data-page-key> (assets/script/page-
// effects.js's vectors/stars registry): the Dashboard passes a
// per-instance "dashboard:<id>" here so each dashboard can have its own
// background, but reports the single static "dashboard" key on its
// <body> since vectors/stars aren't per-instance.
function applyWallpaper(imagePath, pageKey) {
  const el = document.querySelector(".wallpaper");
  if (!el) return;
  const override = getPageWallpaperOverride(pageKey) || getWallpaperOverride();
  const resolved = override ? WALLPAPER_LOADER_BASE + "assets/images/" + override : imagePath;
  if (resolved) el.style.background = `url('${resolved}') center/cover no-repeat`;
}
