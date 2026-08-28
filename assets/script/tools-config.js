/* Tools category registry -- backs both the Dashboard's Outils panel
   (project/dashboard.html) and the Config Tools builder
   (project/tools-config.html). Same lazy-migration pattern as
   assets/script/dashboards.js: nothing is written to localStorage until
   the user actually adds/edits/removes a category, so a fresh install
   still shows exactly the original 10 built-in categories.

   The 10 built-ins point at the existing, hand-written command pages
   under tools/*.html -- untouched, still fully static, zero risk of
   regressing their content. Any category added via the builder instead
   points at tools/custom.html?catId=<id>, a generic viewer that reads
   its tool/command list from assets/script/tools-config.js's other
   half below (getToolsCommands() et al.) -- that's the only part of
   "Tools" that's actually editable per-command; the 10 built-ins are
   categories you can rename/remove/reorder, not rewrite in place. */

const TOOLS_CATEGORIES_KEY = "/settings.html/toolsCategories";

const DEFAULT_TOOLS_CATEGORIES = [
  { id: "recon", title: "Recon & Enumeration", sub: "Scanning, discovery, fingerprinting", page: "recon.html" },
  { id: "web", title: "Web Exploitation", sub: "Attacking web apps and APIs", page: "web.html" },
  { id: "linux", title: "Linux PrivEsc", sub: "Escalating privileges on Linux", page: "linux.html" },
  { id: "windows", title: "Windows PrivEsc", sub: "Escalating privileges on Windows", page: "windows.html" },
  { id: "ad", title: "Active Directory Attacks", sub: "Kerberos, LDAP, credentials", page: "ad.html" },
  { id: "lateral", title: "Lateral Movement", sub: "Pivoting across hosts", page: "lateral.html" },
  { id: "c2", title: "C2 Frameworks", sub: "Command & Control", page: "c2.html" },
  { id: "post", title: "Post-Exploitation", sub: "Cracking, dumping, persistence", page: "post.html" },
  { id: "osint", title: "OSINT", sub: "Metadata & intelligence", page: "osint.html" },
  { id: "autres", title: "Autres", sub: "Web shells, reverse shells, file search, git dumps", page: "misc.html" },
];

function getRawToolsCategories() {
  try {
    const raw = localStorage.getItem(TOOLS_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getToolsCategories() {
  const raw = getRawToolsCategories();
  if (raw) return raw;
  // A fresh copy, not the constant itself -- addToolsCategory() etc.
  // push/mutate whatever this returns, which would otherwise permanently
  // corrupt DEFAULT_TOOLS_CATEGORIES for the rest of the page's session
  // (invisible day-to-day since that first mutation also immediately
  // saves to localStorage, which every later call then reads instead --
  // it only resurfaces if that override is ever cleared again, eg. by
  // Rétablir, while this same page is still open).
  return DEFAULT_TOOLS_CATEGORIES.map((cat) => Object.assign({}, cat));
}

function saveToolsCategories(list) {
  localStorage.setItem(TOOLS_CATEGORIES_KEY, JSON.stringify(list));
}

function addToolsCategory(category) {
  const id = "tools-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const list = getToolsCategories();
  list.push(Object.assign({ id, page: "custom.html?catId=" + id }, category));
  saveToolsCategories(list);
  return id;
}

function updateToolsCategory(id, changes) {
  const list = getToolsCategories();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveToolsCategories(list);
}

function removeToolsCategory(id) {
  saveToolsCategories(getToolsCategories().filter((c) => c.id !== id));
  localStorage.removeItem(toolsCommandsKey(id));
}

function getToolsCategory(id) {
  return getToolsCategories().find((c) => c.id === id);
}

/* Per-category tool/command list -- only ever populated for categories
   created via the builder (tools/custom.html?catId=...); the 10
   built-ins render their own static HTML and never touch this. */

function toolsCommandsKey(catId) {
  return "/settings.html/toolsCommands/" + catId;
}

function getToolsCommands(catId) {
  try {
    return JSON.parse(localStorage.getItem(toolsCommandsKey(catId)) || "[]");
  } catch (e) {
    return [];
  }
}

function saveToolsCommands(catId, list) {
  localStorage.setItem(toolsCommandsKey(catId), JSON.stringify(list));
}

function addToolEntry(catId, entry) {
  const list = getToolsCommands(catId);
  const id = "tool-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  list.push(Object.assign({ id }, entry));
  saveToolsCommands(catId, list);
  return id;
}

function updateToolEntry(catId, id, changes) {
  const list = getToolsCommands(catId);
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveToolsCommands(catId, list);
}

function removeToolEntry(catId, id) {
  saveToolsCommands(catId, getToolsCommands(catId).filter((t) => t.id !== id));
}

// Round-trippable backup/restore of the live registry (categories +
// every custom category's own command list bundled into one file --
// assets/script/config-io.js has the shared download/read helpers).
function exportToolsConfigAsJson() {
  const categories = getToolsCategories();
  const commands = {};
  categories.forEach((cat) => {
    if ((cat.page || "").startsWith("custom.html")) commands[cat.id] = getToolsCommands(cat.id);
  });
  exportJsonFile({ categories, commands }, "tools-config.json");
}

function importToolsConfigFromJson(file) {
  return readJsonFile(file).then((data) => {
    if (!data || !Array.isArray(data.categories)) {
      throw new Error("Format invalide : { categories: [...], commands: {...} } attendu.");
    }
    saveToolsCategories(data.categories);
    Object.keys(data.commands || {}).forEach((catId) => saveToolsCommands(catId, data.commands[catId]));
  });
}

function resetToolsConfig() {
  getToolsCategories().forEach((cat) => localStorage.removeItem(toolsCommandsKey(cat.id)));
  localStorage.removeItem(TOOLS_CATEGORIES_KEY);
}
