/* Network node registry -- backs both the Dashboard's Réseau panel
   (project/dashboard.html, via assets/script/network-dashboard.js) and
   the Config Network builder (project/network-config.html).

   Same lazy-migration pattern as assets/script/dashboards.js: nothing is
   written to localStorage until the user actually adds/edits/removes a
   node. Until then, getNetworkNodes() just returns config/reseau.js's
   static `cards` array (seeded with stable ids) so a fresh install shows
   exactly what it always did. The very first edit snapshots that full
   list into localStorage -- from then on localStorage is the only
   source of truth, config/reseau.js is no longer read at all. */

const NETWORK_NODES_KEY = "/settings.html/networkNodes";

function getRawNetworkNodes() {
  try {
    const raw = vaultGetItem(NETWORK_NODES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    // Anything that isn't an array here means the stored value isn't a
    // node list -- typically a leftover {iv,ciphertext} envelope from a
    // vault that can no longer decrypt it (PlanDeTestSecurite 1.10/5.3).
    // Fall back to the seed config rather than handing a bare object to
    // callers that expect an array (dashboard did `.cards.filter`).
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

function getNetworkNodes() {
  const raw = getRawNetworkNodes();
  if (raw) return raw;
  return reseauConfig.cards.map((card, i) => Object.assign({ id: "seed-" + i }, card));
}

function saveNetworkNodes(nodes) {
  vaultSetItem(NETWORK_NODES_KEY, JSON.stringify(nodes));
}

function addNetworkNode(node) {
  const nodes = getNetworkNodes();
  const id = "node-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  nodes.push(Object.assign({ id }, node));
  saveNetworkNodes(nodes);
  return id;
}

function updateNetworkNode(id, changes) {
  const nodes = getNetworkNodes();
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx === -1) return;
  nodes[idx] = Object.assign({}, nodes[idx], changes);
  saveNetworkNodes(nodes);
}

function removeNetworkNode(id) {
  saveNetworkNodes(getNetworkNodes().filter((n) => n.id !== id));
}

// All distinct categories in use, in first-seen order -- powers the
// builder's "pick an existing category, or type a new one" control.
function getNetworkCategories() {
  const seen = [];
  getNetworkNodes().forEach((n) => {
    const cat = n.category || "Autres";
    if (!seen.includes(cat)) seen.push(cat);
  });
  return seen;
}

// Downscales an uploaded image to a small square PNG data URI (nodes
// render at 20-48px, see .card-img/.node-card .card-img) so a handful
// of custom icons doesn't eat noticeably into localStorage's ~5-10MB
// budget. Resolves the original data URI back if it's not decodable as
// an image (lets a plain paste-a-URL fallback still work upstream).
function resizeIconFile(file, maxSize) {
  maxSize = maxSize || 96;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Round-trippable backup/restore of the live registry (assets/script/
// config-io.js has the shared download/read helpers) -- separate from
// exportNetworkConfigAsJs() below, which produces a drop-in replacement
// for the repo's static config/reseau.js instead.
async function exportNetworkNodesAsJson() {
  const data = await vaultMaybeEncryptForExport(getNetworkNodes());
  exportJsonFile(data, "network-nodes.json");
}

async function importNetworkNodesFromJson(file) {
  const raw = await readJsonFile(file);
  const nodes = await vaultMaybeDecryptImport(raw);
  if (!Array.isArray(nodes)) throw new Error("Format invalide : un tableau de nœuds est attendu.");
  saveNetworkNodes(nodes);
}

function resetNetworkNodes() {
  vaultRemoveItem(NETWORK_NODES_KEY);
}

// Optional escape hatch for anyone who wants the live (localStorage)
// registry committed back as the repo's static config/reseau.js --
// same shape config-loader.js/network-dashboard.js already expect, so
// dropping the download over the real file needs no other change.
function exportNetworkConfigAsJs() {
  const nodes = getNetworkNodes().map((n) => {
    const card = {};
    if (n.url) card.url = n.url;
    if (n.img) card.img = n.img;
    card.title = n.title || "";
    card.sub = n.sub || "";
    card.category = n.category || "Autres";
    if (n.enabled === false) card.enabled = false;
    return card;
  });
  const js = "const reseauConfig = " + JSON.stringify({ background: reseauConfig.background, cards: nodes }, null, 2) + ";\n";
  triggerDownload(new Blob([js], { type: "text/javascript" }), "reseau.js");
}
