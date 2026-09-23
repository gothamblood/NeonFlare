/* Identité affichée (marque) -- config/branding.js (brandingConfig, édité à
   la main) donne les valeurs par défaut ; la carte « Config Branding » des
   Paramètres enregistre une surcharge dans localStorage, champ par champ :
   un champ vidé dans Paramètres revient à la valeur du fichier. (Différent
   des autres registres, qui remplacent l'objet entier : ici chaque champ
   est indépendant et « vide » veut dire « valeur par défaut ».)

   Application : chaque élément marqué data-brand="<champ>" reçoit la valeur
   (texte seulement, jamais du HTML). Un champ sans valeur laisse le texte
   d'origine du HTML en place, donc un fichier de config manquant ne casse
   rien. Le favicon suit `logo` (chemin relatif depuis la racine du site,
   préfixé selon la page ; toute URL avec schéma est ignorée). Un
   enregistrement dans un autre onglet (Paramètres) est appliqué tout de
   suite via l'événement `storage`. */

const BRANDING_CONFIG_KEY = "/settings.html/brandingConfig";
const BRANDING_FIELDS = ["name", "icon", "logo", "pageTitle", "networkStatusTitle", "topologySubtitle", "linksTitle", "techMenuLabel"];
const BRANDING_MAX_LEN = 120;

function _brandingClean(obj) {
  const out = {};
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
  BRANDING_FIELDS.forEach((k) => {
    if (typeof obj[k] === "string" && obj[k].trim()) out[k] = obj[k].trim().slice(0, BRANDING_MAX_LEN);
  });
  return out;
}

function getBrandingDefaults() {
  return _brandingClean(typeof brandingConfig === "object" ? brandingConfig : null);
}

function getRawBrandingOverride() {
  try {
    const raw = localStorage.getItem(BRANDING_CONFIG_KEY);
    return raw ? _brandingClean(JSON.parse(raw)) : null;
  } catch (e) {
    return null;
  }
}

function getBrandingConfig() {
  return Object.assign(getBrandingDefaults(), getRawBrandingOverride() || {});
}

// Seuls les champs non vides ET différents du défaut sont gardés : la
// surcharge reste minimale, et un champ vidé retombe sur config/branding.js.
function saveBrandingConfig(values) {
  const defaults = getBrandingDefaults();
  const clean = _brandingClean(values);
  const override = {};
  Object.keys(clean).forEach((k) => {
    if (clean[k] !== defaults[k]) override[k] = clean[k];
  });
  if (Object.keys(override).length) localStorage.setItem(BRANDING_CONFIG_KEY, JSON.stringify(override));
  else localStorage.removeItem(BRANDING_CONFIG_KEY);
}

function resetBrandingConfig() {
  localStorage.removeItem(BRANDING_CONFIG_KEY);
}

function exportBrandingConfigAsJson() {
  exportJsonFile(getBrandingConfig(), "branding-config.json");
}

function importBrandingConfigFromJson(file) {
  return readJsonFile(file).then((data) => {
    if (!data || typeof data !== "object" || Array.isArray(data) || !Object.keys(_brandingClean(data)).length) {
      throw new Error("Format invalide : un objet { name, icon, logo, pageTitle, … } est attendu.");
    }
    saveBrandingConfig(data);
  });
}

function brandingLogoIsSafe(logo) {
  return !!logo && !/^[a-z][a-z0-9+.-]*:/i.test(logo) && logo.indexOf("//") !== 0 && logo.indexOf("\\") === -1;
}

function applyBranding() {
  const cfg = getBrandingConfig();
  document.querySelectorAll("[data-brand]").forEach((el) => {
    const v = cfg[el.getAttribute("data-brand")];
    if (!v) return;
    if (el.tagName === "TITLE") document.title = v;
    else el.textContent = v;
  });
  const icon = document.querySelector("link[rel='icon'][data-brand-logo]");
  if (icon && brandingLogoIsSafe(cfg.logo)) {
    icon.setAttribute("href", (icon.getAttribute("data-brand-logo") || "") + cfg.logo.replace(/^\.?\//, ""));
  }
}

(function () {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyBranding);
  else applyBranding();
  window.addEventListener("storage", (e) => {
    if (e.key === BRANDING_CONFIG_KEY || e.key === null) applyBranding();
  });
})();
