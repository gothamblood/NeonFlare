/* Topology editor data -- backs project/topology.html's freeform node
   dragging/adding and its Settings > Config Topology card.

   The existing diagram (config/topology.js) is a hand-tuned, deeply
   nested tree -- rewriting it into a generic per-node model isn't
   attempted here. Instead:
   - EVERY node in the tree, at any depth (WAN down to eg. the WinServer
     IIS box nested inside Proxmox inside Switch Nicgiga), gets a stable
     id -- "seedtopo-<i>" for a top-level one (i = its index in
     topologyConfig.nodes, which never reorders), "seedtopo-<i>.<j>.<...>"
     for one nested inside it (j = its own index among its immediate
     parent's children, same reasoning). Every one of these can be
     renamed (a display-only override, config/topology.js itself is
     never touched) and hidden/shown from Settings.
   - Seed nodes always lay out in-flow inside their parent's box and are
     never draggable/reparentable -- their structure is fixed. Only a
     TOP-LEVEL seed node can be dragged, and only to reposition (same
     lazy-freeze-on-first-drag pattern as assets/script/dashboard-
     layout.js: nothing about a drag is stored until the user actually
     moves one).
   - A node the user ADDS is a {title, meta, url, img, container,
     parentId} box, identified by a generated "topo-..." id, stored in
     full (not just an override) since it doesn't exist in
     config/topology.js at all. `container: true` gives it its own
     ".division-container" drop zone (like Proxmox's); `parentId`
     points at whichever node's box it's currently living in -- a seed
     id (any depth, if that seed node owns a ".division-container"), a
     custom container id, or null for free-floating on the canvas.
     Reparenting (topology.html's drag-and-drop, or the Settings
     picker) is the only way parentId changes -- see
     setTopologyNodeParent below.
   - Links between any two nodes (seed, any depth, or custom) are a
     separate, purely additive list -- the original topologyConfig.links
     pairs (which point at specific anchor points *inside* nodes, not
     at whole boxes) are untouched and not manageable here. */

const TOPOLOGY_CUSTOM_NODES_KEY = "/settings.html/topologyCustomNodes";
const TOPOLOGY_CUSTOM_LINKS_KEY = "/settings.html/topologyCustomLinks";
const TOPOLOGY_LAYOUT_KEY = "/settings.html/topologyLayout";

/* Parse a stored value, but only trust it if it's the shape the caller
   expects (array / plain object). A leftover {iv,ciphertext} envelope
   from a vault that can't decrypt the key any more otherwise reaches
   callers doing .forEach/.filter and throws (PlanDeTestSecurite
   1.10/5.3) -- fall back to the empty default instead. */
function topoParseArray(raw) {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}
function topoParseObject(raw) {
  try {
    const v = JSON.parse(raw || "{}");
    if (v && typeof v === "object" && !Array.isArray(v) && typeof v.ciphertext !== "string") return v;
    return {};
  } catch (e) {
    return {};
  }
}

function getTopologyCustomNodes() {
  return topoParseArray(vaultGetItem(TOPOLOGY_CUSTOM_NODES_KEY));
}

function saveTopologyCustomNodes(list) {
  vaultSetItem(TOPOLOGY_CUSTOM_NODES_KEY, JSON.stringify(list));
}

function addTopologyCustomNode(node) {
  const id = "topo-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const list = getTopologyCustomNodes();
  list.push(Object.assign({ id }, node));
  saveTopologyCustomNodes(list);
  return id;
}

function updateTopologyCustomNode(id, changes) {
  const list = getTopologyCustomNodes();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return;
  list[idx] = Object.assign({}, list[idx], changes);
  saveTopologyCustomNodes(list);
}

function removeTopologyCustomNode(id) {
  // Children lose their box, not themselves -- reparented to the root
  // rather than deleted along with it.
  const remaining = getTopologyCustomNodes()
    .filter((n) => n.id !== id)
    .map((n) => (n.parentId === id ? Object.assign({}, n, { parentId: null }) : n));
  saveTopologyCustomNodes(remaining);
  saveTopologyLayout(withoutKey(getTopologyLayout(), id));
  saveTopologyCustomLinks(getTopologyCustomLinks().filter((l) => l.a !== id && l.b !== id));
}

// Moves a custom node into another node's box (seed or custom, any
// container-capable target), or back out to the free-floating top
// level when parentId is null/falsy. Refuses a move that would nest a
// node inside itself or one of its own descendants. Clears any saved
// freeform position for it -- once nested it lays out in the box's
// grid, not at a stored left/top; topology.html re-saves one for it if
// it's later dragged back out.
function setTopologyNodeParent(id, parentId) {
  const list = getTopologyCustomNodes();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const target = parentId || null;
  if (target) {
    let cur = target;
    const seen = new Set();
    while (cur) {
      if (cur === id) return;
      if (seen.has(cur)) break;
      seen.add(cur);
      const parentNode = list.find((n) => n.id === cur);
      cur = parentNode ? (parentNode.parentId || null) : null;
    }
  }
  list[idx] = Object.assign({}, list[idx], { parentId: target });
  saveTopologyCustomNodes(list);
  saveTopologyLayout(withoutKey(getTopologyLayout(), id));
}

function getTopologyCustomLinks() {
  return topoParseArray(vaultGetItem(TOPOLOGY_CUSTOM_LINKS_KEY));
}

function saveTopologyCustomLinks(list) {
  vaultSetItem(TOPOLOGY_CUSTOM_LINKS_KEY, JSON.stringify(list));
}

function addTopologyCustomLink(a, b) {
  if (!a || !b || a === b) return;
  const list = getTopologyCustomLinks();
  if (list.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) return;
  const id = "topolink-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  list.push({ id, a, b });
  saveTopologyCustomLinks(list);
}

function removeTopologyCustomLink(id) {
  saveTopologyCustomLinks(getTopologyCustomLinks().filter((l) => l.id !== id));
}

function getTopologyLayout() {
  return topoParseObject(vaultGetItem(TOPOLOGY_LAYOUT_KEY));
}

function saveTopologyLayout(layout) {
  vaultSetItem(TOPOLOGY_LAYOUT_KEY, JSON.stringify(layout));
}

function saveTopologyNodePosition(topoId, leftPct, topPct) {
  const layout = getTopologyLayout();
  layout[topoId] = { left: leftPct, top: topPct };
  saveTopologyLayout(layout);
}

function withoutKey(obj, key) {
  const copy = Object.assign({}, obj);
  delete copy[key];
  return copy;
}

// First { class containing "node-title" } found in a topologyConfig.js
// node spec's subtree -- topology.html's own recursive tag/children
// schema, walked read-only just to get a human label for dropdowns/lists.
function extractTopologyTitle(spec) {
  if (!spec) return null;
  if (spec.class && spec.class.split(" ").includes("node-title") && spec.text) return spec.text;
  if (spec.children) {
    for (const child of spec.children) {
      const found = extractTopologyTitle(child);
      if (found) return found;
    }
  }
  return null;
}

function isTopologyNodeSpec(spec) {
  return !!(spec.class && spec.class.split(" ").includes("node"));
}

// True when a node spec has its OWN ".division-container" child (eg.
// node-Proxmox, node-wifi-Main) -- ie. it's a box other nodes can be
// dropped into. Stops descending at the first nested node boundary so
// a container that belongs to a *descendant* node isn't attributed to
// this one (Proxmox's own division-container isn't SwitchNicgiga's).
function specOwnsDivisionContainer(spec) {
  return (spec.children || []).some((child) => {
    if (child.class && child.class.split(" ").includes("division-container")) return true;
    if (isTopologyNodeSpec(child)) return false;
    return specOwnsDivisionContainer(child);
  });
}

// Appends every custom node parented (directly or transitively) under
// parentId, in DFS order, continuing the depth count from the caller.
// placedCustom guards against a broken/cyclic parentId chain looping
// forever -- each custom node is only ever placed once.
function collectCustomTopologyChildren(parentId, depth, customNodes, out, placedCustom) {
  customNodes.forEach((n) => {
    if ((n.parentId || null) !== parentId) return;
    if (placedCustom.has(n.id)) return;
    placedCustom.add(n.id);
    out.push({ id: n.id, title: n.title, seed: false, depth, isContainer: !!n.container, parentId: parentId || null });
    collectCustomTopologyChildren(n.id, depth + 1, customNodes, out, placedCustom);
  });
}

// Walks EVERY descendant of a node spec (not just its immediate
// children) and appends a {id, title, depth} entry for each nested
// node found -- id continues the parent's own "seedtopo-..." id with a
// ".<childIndex>" segment per level, so it stays stable across reloads
// without needing config/topology.js to carry ids of its own. Any
// custom node dropped into one of these (its parentId pointing at the
// nested id) is spliced in right after it, same DFS-order reasoning.
function collectNestedTopologyRefs(spec, idPrefix, depth, overrides, out, customNodes, placedCustom) {
  (spec.children || []).forEach((child, i) => {
    const childId = idPrefix + "." + i;
    if (isTopologyNodeSpec(child)) {
      out.push({
        id: childId,
        title: overrides[childId] || extractTopologyTitle(child) || childId,
        seed: true,
        depth: depth + 1,
        isContainer: specOwnsDivisionContainer(child),
        parentId: idPrefix,
      });
      collectNestedTopologyRefs(child, childId, depth + 1, overrides, out, customNodes, placedCustom);
      collectCustomTopologyChildren(childId, depth + 2, customNodes, out, placedCustom);
    } else {
      collectNestedTopologyRefs(child, idPrefix, depth, overrides, out, customNodes, placedCustom);
    }
  });
}

// Every node (seed, any depth, + custom, any depth) as
// {id, title, seed, depth, isContainer, parentId} -- for the Config
// Topology card's node list, the "boîte parente" picker, and the
// link-picker dropdowns. Requires config/topology.js (topologyConfig)
// to already be loaded. includeHidden: the node list needs hidden ones
// too (so they can be shown again); the link pickers don't want to
// offer linking to something currently invisible, so they leave it at
// the default.
function getAllTopologyNodeRefs(includeHidden) {
  const hidden = getHiddenSeedTopologyIds();
  const overrides = getTopologyTitleOverrides();
  const customNodes = getTopologyCustomNodes();
  const placedCustom = new Set();
  const out = [];

  (typeof topologyConfig !== "undefined" ? topologyConfig.nodes : []).forEach((spec, i) => {
    const id = "seedtopo-" + i;
    out.push({ id, title: overrides[id] || extractTopologyTitle(spec) || "Nœud " + (i + 1), seed: true, depth: 0, isContainer: specOwnsDivisionContainer(spec), parentId: null });
    collectNestedTopologyRefs(spec, id, 0, overrides, out, customNodes, placedCustom);
    collectCustomTopologyChildren(id, 1, customNodes, out, placedCustom);
  });

  // Custom nodes with no parent, or whose declared parent was removed
  // (or forms a cycle), surface at the top level instead of vanishing.
  customNodes.forEach((n) => {
    if (placedCustom.has(n.id)) return;
    placedCustom.add(n.id);
    out.push({ id: n.id, title: n.title, seed: false, depth: 0, isContainer: !!n.container, parentId: null });
    collectCustomTopologyChildren(n.id, 1, customNodes, out, placedCustom);
  });

  return includeHidden ? out : out.filter((n) => (n.seed ? !hidden.includes(n.id) : true));
}

// Every id nested (at any depth) under topoId, per the current
// getAllTopologyNodeRefs() tree -- used to keep the "boîte parente"
// picker from offering a node's own descendants (would create a
// containment cycle).
function getTopologyDescendantIds(topoId, allRefs) {
  const out = [];
  const stack = [topoId];
  while (stack.length) {
    const pid = stack.pop();
    allRefs.forEach((r) => {
      if (r.parentId === pid) {
        out.push(r.id);
        stack.push(r.id);
      }
    });
  }
  return out;
}

// A seed (config/topology.js) node can't be removed from that static
// file -- "supprimer" it from Settings just hides it (and its links)
// instead, same end result from the user's point of view; it can be
// shown again later, unlike a real delete.
const TOPOLOGY_HIDDEN_SEED_KEY = "/settings.html/topologyHiddenSeed";
const TOPOLOGY_TITLE_OVERRIDES_KEY = "/settings.html/topologyTitleOverrides";

function getHiddenSeedTopologyIds() {
  return topoParseArray(vaultGetItem(TOPOLOGY_HIDDEN_SEED_KEY));
}

function setSeedTopologyHidden(topoId, hidden) {
  let ids = getHiddenSeedTopologyIds();
  ids = ids.filter((id) => id !== topoId);
  if (hidden) {
    ids.push(topoId);
    saveTopologyLayout(withoutKey(getTopologyLayout(), topoId));
    saveTopologyCustomLinks(getTopologyCustomLinks().filter((l) => l.a !== topoId && l.b !== topoId));
  }
  vaultSetItem(TOPOLOGY_HIDDEN_SEED_KEY, JSON.stringify(ids));
}

function getTopologyTitleOverrides() {
  return topoParseObject(vaultGetItem(TOPOLOGY_TITLE_OVERRIDES_KEY));
}

function setTopologyTitleOverride(topoId, title) {
  const overrides = getTopologyTitleOverrides();
  const trimmed = (title || "").trim();
  if (trimmed) overrides[topoId] = trimmed;
  else delete overrides[topoId];
  vaultSetItem(TOPOLOGY_TITLE_OVERRIDES_KEY, JSON.stringify(overrides));
}

// Round-trippable backup/restore of everything this file stores
// (assets/script/config-io.js has the shared download/read helpers) --
// custom nodes/links plus which seed nodes are hidden and where
// anything's been dragged to, all bundled into one file.
async function exportTopologyConfigAsJson() {
  const data = await vaultMaybeEncryptForExport({
    customNodes: getTopologyCustomNodes(),
    customLinks: getTopologyCustomLinks(),
    hiddenSeed: getHiddenSeedTopologyIds(),
    layout: getTopologyLayout(),
    titleOverrides: getTopologyTitleOverrides(),
  });
  exportJsonFile(data, "topology-config.json");
}

async function importTopologyConfigFromJson(file) {
  const raw = await readJsonFile(file);
  const data = await vaultMaybeDecryptImport(raw);
  if (!data || typeof data !== "object") throw new Error("Format invalide.");
  saveTopologyCustomNodes(Array.isArray(data.customNodes) ? data.customNodes : []);
  saveTopologyCustomLinks(Array.isArray(data.customLinks) ? data.customLinks : []);
  vaultSetItem(TOPOLOGY_HIDDEN_SEED_KEY, JSON.stringify(Array.isArray(data.hiddenSeed) ? data.hiddenSeed : []));
  saveTopologyLayout(data.layout && typeof data.layout === "object" ? data.layout : {});
  vaultSetItem(TOPOLOGY_TITLE_OVERRIDES_KEY, JSON.stringify(data.titleOverrides && typeof data.titleOverrides === "object" ? data.titleOverrides : {}));
}

function resetTopologyConfig() {
  vaultRemoveItem(TOPOLOGY_CUSTOM_NODES_KEY);
  vaultRemoveItem(TOPOLOGY_CUSTOM_LINKS_KEY);
  vaultRemoveItem(TOPOLOGY_HIDDEN_SEED_KEY);
  vaultRemoveItem(TOPOLOGY_LAYOUT_KEY);
  vaultRemoveItem(TOPOLOGY_TITLE_OVERRIDES_KEY);
}
