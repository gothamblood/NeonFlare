/* DevSecOps category registry -- backs the Dashboard's DevSecOps panel
   (project/dashboard.html) and the Config DevSecOps builder
   (project/settings.html). Same lazy-migration pattern as
   assets/script/tools-config.js (which this mirrors 1:1, separate
   localStorage key and separate static pages so the two registries
   never collide): nothing is written to localStorage until the user
   actually adds/edits/removes a category, so a fresh install still
   shows exactly the 5 built-in categories.

   The 5 built-ins point at hand-written command pages under
   tools/*.html (docker.html, kubernetes.html, terraform.html, aws.html,
   azure.html) -- same "click a command, it lands in an embedded
   terminal" behavior as the pentest Tools panel, just for cloud/infra
   CLIs instead of recon/exploitation ones. Any category added via the
   builder instead points at tools/devsecops-custom.html?catId=<id>, a
   generic viewer mirroring tools/custom.html. */

const DEVSECOPS_CATEGORIES_KEY = "/settings.html/devsecopsCategories";

const DEFAULT_DEVSECOPS_CATEGORIES = [
  { id: "docker", title: "Docker", sub: "Images, conteneurs, registries", page: "docker.html" },
  { id: "kubernetes", title: "Kubernetes", sub: "kubectl, pods, RBAC, secrets", page: "kubernetes.html" },
  { id: "terraform", title: "Terraform", sub: "IaC : plan, apply, state", page: "terraform.html" },
  { id: "aws", title: "AWS CLI", sub: "IAM, S3, EC2, logs d'audit", page: "aws.html" },
  { id: "azure", title: "Azure CLI", sub: "RBAC, storage, VMs, Key Vault", page: "azure.html" },
];

function getRawDevSecOpsCategories() {
  try {
    const raw = localStorage.getItem(DEVSECOPS_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getDevSecOpsCategories() {
  const raw = getRawDevSecOpsCategories();
  if (raw) return raw;
  // A fresh copy, not the constant itself -- see tools-config.js's
  // getToolsCategories() for why (same mutation-safety reasoning).
  return DEFAULT_DEVSECOPS_CATEGORIES.map((cat) => Object.assign({}, cat));
}

function saveDevSecOpsCategories(list) {
  localStorage.setItem(DEVSECOPS_CATEGORIES_KEY, JSON.stringify(list));
}

function addDevSecOpsCategory(category) {
  const id = "devsecops-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const list = getDevSecOpsCategories();
  list.push(Object.assign({ id, page: "devsecops-custom.html?catId=" + id }, category));
  saveDevSecOpsCategories(list);
  return id;
}

function updateDevSecOpsCategory(id, changes) {
  const list = getDevSecOpsCategories();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveDevSecOpsCategories(list);
}

function removeDevSecOpsCategory(id) {
  saveDevSecOpsCategories(getDevSecOpsCategories().filter((c) => c.id !== id));
  localStorage.removeItem(devsecopsCommandsKey(id));
}

function getDevSecOpsCategory(id) {
  return getDevSecOpsCategories().find((c) => c.id === id);
}

/* Per-category tool/command list -- only ever populated for categories
   created via the builder (tools/devsecops-custom.html?catId=...); the
   5 built-ins render their own static HTML and never touch this. */

function devsecopsCommandsKey(catId) {
  return "/settings.html/devsecopsCommands/" + catId;
}

function getDevSecOpsCommands(catId) {
  try {
    return JSON.parse(localStorage.getItem(devsecopsCommandsKey(catId)) || "[]");
  } catch (e) {
    return [];
  }
}

function saveDevSecOpsCommands(catId, list) {
  localStorage.setItem(devsecopsCommandsKey(catId), JSON.stringify(list));
}

function addDevSecOpsEntry(catId, entry) {
  const list = getDevSecOpsCommands(catId);
  const id = "devsecopstool-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  list.push(Object.assign({ id }, entry));
  saveDevSecOpsCommands(catId, list);
  return id;
}

function updateDevSecOpsEntry(catId, id, changes) {
  const list = getDevSecOpsCommands(catId);
  const idx = list.findIndex((t) => t.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveDevSecOpsCommands(catId, list);
}

function removeDevSecOpsEntry(catId, id) {
  saveDevSecOpsCommands(catId, getDevSecOpsCommands(catId).filter((t) => t.id !== id));
}

// Round-trippable backup/restore of the live registry (categories +
// every custom category's own command list bundled into one file --
// assets/script/config-io.js has the shared download/read helpers).
function exportDevSecOpsConfigAsJson() {
  const categories = getDevSecOpsCategories();
  const commands = {};
  categories.forEach((cat) => {
    if ((cat.page || "").startsWith("devsecops-custom.html")) commands[cat.id] = getDevSecOpsCommands(cat.id);
  });
  exportJsonFile({ categories, commands }, "devsecops-config.json");
}

function importDevSecOpsConfigFromJson(file) {
  return readJsonFile(file).then((data) => {
    if (!data || !Array.isArray(data.categories)) {
      throw new Error("Format invalide : { categories: [...], commands: {...} } attendu.");
    }
    saveDevSecOpsCategories(data.categories);
    Object.keys(data.commands || {}).forEach((catId) => saveDevSecOpsCommands(catId, data.commands[catId]));
  });
}

function resetDevSecOpsConfig() {
  getDevSecOpsCategories().forEach((cat) => localStorage.removeItem(devsecopsCommandsKey(cat.id)));
  localStorage.removeItem(DEVSECOPS_CATEGORIES_KEY);
}
