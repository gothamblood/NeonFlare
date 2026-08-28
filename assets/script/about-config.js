/* About/permit config override -- backs project/about.html and the
   Config About builder (project/settings.html). Same lazy-migration
   pattern as the other *-config.js registries: config/about.js (the
   aboutConfig global, hand-edited in the repo) stays the default until
   the user actually saves something from the Settings editor, at which
   point the full localStorage override becomes the only source of
   truth for every field (not merged field-by-field) -- same
   full-replace semantics as tools/website categories, so a partial
   save can't leave stale defaults mixed in with edited ones. */

const ABOUT_CONFIG_KEY = "/settings.html/aboutConfig";

function getRawAboutConfigOverride() {
  try {
    const raw = localStorage.getItem(ABOUT_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Links in the static config/about.js have no `id` (nothing needed one
// until the Settings editor had to address a single link to edit/
// remove) -- assigned here on read, on both the override and the
// default, so every caller sees ids without config/about.js itself
// needing to carry them.
function normalizeAboutConfig(cfg) {
  cfg.links = (cfg.links || []).map((link, i) => Object.assign({ id: link.id || "about-link-" + i + "-" + Date.now().toString(36) }, link));
  return cfg;
}

function getAboutConfig() {
  const override = getRawAboutConfigOverride();
  if (override) return normalizeAboutConfig(override);
  // A fresh deep copy, not the constant itself -- see tools-config.js's
  // getToolsCategories() for why (same mutation-safety reasoning).
  return normalizeAboutConfig(JSON.parse(JSON.stringify(aboutConfig)));
}

function saveAboutConfig(cfg) {
  localStorage.setItem(ABOUT_CONFIG_KEY, JSON.stringify(cfg));
}

function updateAboutBackground(path) {
  const cfg = getAboutConfig();
  cfg.background = path;
  saveAboutConfig(cfg);
}

function updateAboutPermit(changes) {
  const cfg = getAboutConfig();
  cfg.permit = Object.assign({}, cfg.permit, changes);
  saveAboutConfig(cfg);
}

function addAboutLink(link) {
  const cfg = getAboutConfig();
  const id = "about-link-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  cfg.links.push(Object.assign({ id }, link));
  saveAboutConfig(cfg);
  return id;
}

function updateAboutLink(id, changes) {
  const cfg = getAboutConfig();
  const idx = cfg.links.findIndex((l) => l.id === id);
  if (idx === -1) return;
  cfg.links[idx] = Object.assign({}, cfg.links[idx], changes);
  saveAboutConfig(cfg);
}

function removeAboutLink(id) {
  const cfg = getAboutConfig();
  cfg.links = cfg.links.filter((l) => l.id !== id);
  saveAboutConfig(cfg);
}

function exportAboutConfigAsJson() {
  exportJsonFile(getAboutConfig(), "about-config.json");
}

function importAboutConfigFromJson(file) {
  return readJsonFile(file).then((data) => {
    if (!data || typeof data !== "object" || !data.permit) {
      throw new Error("Format invalide : un objet { background, permit, links } est attendu.");
    }
    saveAboutConfig(data);
  });
}

function resetAboutConfig() {
  localStorage.removeItem(ABOUT_CONFIG_KEY);
}
