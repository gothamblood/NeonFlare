// Was project/topology.html's single big inline <script> (drag &
// drop, node rendering, links) -- externalized verbatim for CSP
// script-src (PlanDurcissement-Securite.txt P1). No onclick=""
// attributes depend on anything here (the only one on this page,
// the "Ouvrir le lien" modal button, was already wired via
// btn.onclick = ... in JS, not an HTML attribute -- see P3's
// noopener fix).
renderTopologyNodes(topologyConfig.nodes, ".topology-canvas");

const canvas = document.querySelector(".topology-canvas");

// Tag EVERY node, at any nesting depth, with a stable id -- mirrors
// assets/script/topology-config.js's collectNestedTopologyRefs() walk
// over the same topologyConfig.nodes tree, just walking the rendered
// DOM in parallel instead of the JSON: buildTopologyElement() (topology-
// loader.js) creates exactly one element per spec.children entry, in
// order, so a spec's children and its built element's children line up
// 1:1 at every level. Only TOP-LEVEL nodes get drag handlers further
// below (nested ones have no independent CSS position to detach from),
// but every depth is individually renamable/hideable from Settings.
const seedNodeEls = canvas.querySelectorAll(":scope > .node");

function tagTopologyNodeIds(specs, els, idPrefix) {
  specs.forEach((spec, i) => {
    const el = els[i];
    if (!el) return;
    const isNode = isTopologyNodeSpec(spec);
    const id = idPrefix === null ? "seedtopo-" + i : idPrefix + "." + i;
    if (isNode) el.dataset.topoId = id;
    if (spec.children) tagTopologyNodeIds(spec.children, Array.from(el.children), isNode ? id : idPrefix);
  });
}
tagTopologyNodeIds(topologyConfig.nodes, Array.from(seedNodeEls), null);

// Custom nodes (Settings > Config Topology) -- a box, optionally its
// own ".division-container" drop zone (node.container), and optionally
// nested inside another node's box (node.parentId: a seed id, if that
// seed node owns a ".division-container" -- eg. Proxmox -- or another
// custom container's id). Rebuilt from scratch on every call (dragging
// a node into/out of a box calls this again after
// setTopologyNodeParent changes where it belongs) -- so every custom
// element anywhere in the tree is torn down first, not just top-level
// ones.
function buildCustomTopologyNodeEl(node) {
  const el = document.createElement("div");
  el.className = "node" + (node.parentId ? " node-nested" : "");
  el.dataset.topoId = node.id;
  el.dataset.topoCustom = "1";
  if (node.url) el.dataset.url = node.url;
  if (node.meta) el.dataset.spec = node.meta;
  const row = document.createElement("div");
  row.className = "node-row";
  if (node.img) {
    const img = document.createElement("img");
    img.className = "node-img";
    img.src = node.img;
    row.appendChild(img);
  }
  const textWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "node-title";
  title.textContent = node.title;
  textWrap.appendChild(title);
  if (node.meta) {
    const meta = document.createElement("div");
    meta.className = "node-meta";
    meta.textContent = node.meta;
    textWrap.appendChild(meta);
  }
  row.appendChild(textWrap);
  el.appendChild(row);
  if (node.container) {
    const box = document.createElement("div");
    box.className = "division-container";
    el.appendChild(box);
  }
  return el;
}

// Finds the ".division-container" that topoId's node owns (its own
// direct child -- both seed containers like Proxmox and custom
// container nodes built above have it there), or the canvas itself for
// the free-floating root. Returns null if topoId doesn't currently
// resolve to a container-capable, still-existing node.
function findTopologyContainerEl(topoId) {
  if (!topoId) return canvas;
  const hostEl = canvas.querySelector(`[data-topo-id="${topoId}"]`);
  if (!hostEl) return null;
  return hostEl.querySelector(":scope > .division-container");
}

function renderCustomTopologyNodes() {
  canvas.querySelectorAll("[data-topo-custom]").forEach((el) => el.remove());
  const customNodes = getTopologyCustomNodes();

  function place(parentId) {
    const container = findTopologyContainerEl(parentId);
    if (!container) return;
    customNodes
      .filter((n) => (n.parentId || null) === parentId)
      .forEach((n) => {
        const el = buildCustomTopologyNodeEl(n);
        container.appendChild(el);
        place(n.id);
      });
  }

  // Free-floating nodes first (parentId null -- appended straight to
  // canvas, recursing into their own custom children as it goes), then
  // any nodes parented under a SEED container (Proxmox etc.) -- those
  // are separate roots place(null)'s own recursion never reaches, since
  // it only follows custom-to-custom parent links.
  place(null);
  const seedContainerIds = new Set();
  customNodes.forEach((n) => { if (n.parentId) seedContainerIds.add(n.parentId); });
  seedContainerIds.forEach((id) => {
    if (!customNodes.some((n) => n.id === id)) place(id);
  });
}

// Saved drag positions (either a seed node the user moved, or wherever
// a custom node was last dropped) -- applied after both are in the DOM
// so every id in the layout map resolves. Overrides the CSS class's
// top/left/transform (see the comment on applyTopologyDrag below for
// why transform needs clearing too).
function applyTopologyLayout() {
  const layout = getTopologyLayout();
  Object.keys(layout).forEach((topoId) => {
    const el = canvas.querySelector(`[data-topo-id="${topoId}"]`);
    if (!el) return;
    el.style.left = layout[topoId].left + "%";
    el.style.top = layout[topoId].top + "%";
    el.style.transform = "none";
  });
}

// Drag any top-level node to reposition it -- first drag on a seed node
// freezes wherever it already, correctly, was on screen (its CSS
// class's top/left/transform) as its new inline position, same
// lazy-detach reasoning as assets/script/dashboard-layout.js. Click vs.
// drag is decided entirely by this same mousedown/mousemove/mouseup
// state machine (openNodeModal() called directly below when the mouse
// never moved past the threshold) rather than the browser's own click
// synthesis -- that proved unreliable right after a *different*
// top-level node had just been dragged elsewhere on the same page.
let dragging = null;
let dropTargetEl = null;

// A nested custom node has no independent on-screen position (it lays
// out in-flow inside its box's grid, via .node-nested's position:
// relative) -- can't live-follow the cursor with left/top the way a
// top-level node does. So the FIRST drag of one detaches it straight
// onto the canvas, freezing its current on-screen spot as an inline
// left/top/transform:none (same lazy-freeze idea as a seed node's
// first drag), which flips it back to .node's default position:
// absolute (.node-nested removed) -- after that it's just a top-level
// node for the rest of this drag, reusing 100% of the existing
// mousemove math below. Where it actually ends up (back in a box, or
// staying free-floating here) is decided on mouseup.
function detachTopologyNodeToCanvas(node) {
  if (node.parentElement === canvas) return;
  const canvasRect = canvas.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  const leftPct = ((rect.left - canvasRect.left) / canvasRect.width) * 100;
  const topPct = ((rect.top - canvasRect.top) / canvasRect.height) * 100;
  node.classList.remove("node-nested");
  canvas.appendChild(node);
  node.style.left = leftPct + "%";
  node.style.top = topPct + "%";
  node.style.transform = "none";
}

// Topmost node-with-a-box under the cursor, excluding the node being
// dragged and anything inside it (dropping a box into its own child
// would create a containment cycle). Only custom nodes can be dropped
// at all, but the TARGET can be a seed container (eg. Proxmox) just as
// well as a custom one -- findTopologyContainerEl handles both the
// same way since both keep their drop zone as a direct ".division-
// container" child.
function findTopologyDropTargetId(clientX, clientY, draggedEl) {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (!el.classList || !el.classList.contains("node")) continue;
    if (el === draggedEl || draggedEl.contains(el)) continue;
    const topoId = el.dataset.topoId;
    if (!topoId) continue;
    if (el.querySelector(":scope > .division-container")) return topoId;
  }
  return null;
}

function startTopologyDrag(e) {
  // A nested custom node sits inside its container node, which carries
  // its own mousedown->startTopologyDrag handler too (wireCustomTopologyDrag
  // wires every [data-topo-custom] at any depth). Without this, the
  // event bubbles up and the ancestor's handler runs a second time,
  // overwriting `dragging` with the container -- so grabbing a child to
  // pull it out of a box actually grabs (and moves) the box instead.
  e.stopPropagation();
  const node = e.currentTarget;
  if (node.dataset.topoCustom === "1") detachTopologyNodeToCanvas(node);
  const canvasRect = canvas.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  dragging = {
    node,
    startX: e.clientX,
    startY: e.clientY,
    startLeftPx: rect.left - canvasRect.left,
    startTopPx: rect.top - canvasRect.top,
    moved: false,
  };
  e.preventDefault();
}

function wireSeedTopLevelTopologyDrag() {
  canvas.querySelectorAll(":scope > .node:not([data-topo-custom])").forEach((node) => {
    node.addEventListener("mousedown", startTopologyDrag);
  });
}
wireSeedTopLevelTopologyDrag();

// Every custom node gets drag wired, at any depth -- unlike seed nodes,
// nested ones ARE draggable here (that's the whole point: pulling one
// back out of, or into, a box). Re-run after every renderCustomTopologyNodes()
// rebuild since that tears down and recreates the elements.
function wireCustomTopologyDrag() {
  canvas.querySelectorAll("[data-topo-custom]").forEach((node) => {
    node.addEventListener("mousedown", startTopologyDrag);
  });
}

// Everything above this point that reads Network/Topology-config-vault
// keys (hidden seeds, title overrides, custom nodes, saved drag
// positions) is gated here instead of at each individual read -- one
// gate, run once, covers the lot; retried automatically once unlocked
// (see vault-ui.js's vaultGateOr()).
function renderProtectedTopologyBits() {
  const gate = document.getElementById("topologyVaultGate");
  if (vaultGateOr(gate, renderProtectedTopologyBits)) return;
  gate.innerHTML = "";

  // "Retiré" from Settings > Config Topology -- config/topology.js is a
  // static file so that can't mean actually deleting it, only hiding it
  // (any depth -- not just top-level, hence querying by id here instead
  // of only walking seedNodeEls).
  getHiddenSeedTopologyIds().forEach((id) => {
    const el = canvas.querySelector(`[data-topo-id="${id}"]`);
    if (el) el.style.display = "none";
  });

  // Renamed from Settings > Config Topology -- a display-only override,
  // config/topology.js's own text is never touched.
  const topologyTitleOverrides = getTopologyTitleOverrides();
  Object.keys(topologyTitleOverrides).forEach((id) => {
    const el = canvas.querySelector(`[data-topo-id="${id}"] .node-title`);
    if (el) el.textContent = topologyTitleOverrides[id];
  });

  renderCustomTopologyNodes();
  applyTopologyLayout();
  wireCustomTopologyDrag();
  renderCustomTopologyLinks();
  updateAllLinks();
  updateCustomLinks();
}
// Called further down (after `links`/`svg`/`linkLines` and the update
// functions are all declared, see the comment there), not here -- this
// function's own body reaches all of those transitively, and a few are
// `let`/`const` bindings that would otherwise still be in their
// temporal dead zone this early in the script.

// Re-render + rewire after a reparent (or a nested node detaching back
// to the canvas) changed the custom-node tree -- links and positions
// need a fresh pass too since the DOM underneath them was rebuilt.
function refreshCustomTopologyNodes() {
  renderCustomTopologyNodes();
  // renderCustomTopologyNodes() rebuilds every custom element from
  // scratch with no inline position -- a free-floating node relies
  // entirely on the saved layout for its coords, so reapply it here
  // just like the initial renderProtectedTopologyBits() pass does.
  // Without this a node snaps back to .node's default spot the moment
  // it's dropped, even though its position was just saved.
  applyTopologyLayout();
  wireCustomTopologyDrag();
  renderCustomTopologyLinks();
  updateAllLinks();
  updateCustomLinks();
}

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - dragging.startX;
  const dy = e.clientY - dragging.startY;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragging.moved = true;
  if (!dragging.moved) return;
  const canvasRect = canvas.getBoundingClientRect();
  const leftPct = ((dragging.startLeftPx + dx) / canvasRect.width) * 100;
  const topPct = ((dragging.startTopPx + dy) / canvasRect.height) * 100;
  dragging.node.style.left = leftPct + "%";
  dragging.node.style.top = topPct + "%";
  dragging.node.style.transform = "none";
  updateAllLinks();
  updateCustomLinks();

  if (dragging.node.dataset.topoCustom === "1") {
    const targetId = findTopologyDropTargetId(e.clientX, e.clientY, dragging.node);
    const targetEl = targetId ? canvas.querySelector(`[data-topo-id="${targetId}"]`) : null;
    if (targetEl !== dropTargetEl) {
      if (dropTargetEl) dropTargetEl.classList.remove("topo-drop-target");
      if (targetEl) targetEl.classList.add("topo-drop-target");
      dropTargetEl = targetEl;
    }
  }
});

window.addEventListener("mouseup", (e) => {
  if (!dragging) return;
  if (dropTargetEl) { dropTargetEl.classList.remove("topo-drop-target"); dropTargetEl = null; }
  // Custom nodes can't be dragged while locked -- they're not even
  // rendered (see renderProtectedTopologyBits() below). A seed node can
  // still be dragged (it's always visible), but saveTopologyNodePosition()
  // writes to the vault -- skip the write with the position left as
  // dropped for this view only, rather than throwing from inside a
  // mouseup handler; it'll snap back to its saved spot on reload.
  if (dragging.moved && vaultShouldGate()) {
    dragging = null;
    return;
  }
  if (dragging.moved) {
    const node = dragging.node;
    if (node.dataset.topoCustom === "1") {
      const targetId = findTopologyDropTargetId(e.clientX, e.clientY, node);
      if (targetId) {
        setTopologyNodeParent(node.dataset.topoId, targetId);
      } else {
        setTopologyNodeParent(node.dataset.topoId, null);
        saveTopologyNodePosition(node.dataset.topoId, parseFloat(node.style.left), parseFloat(node.style.top));
      }
      refreshCustomTopologyNodes();
    } else {
      saveTopologyNodePosition(node.dataset.topoId, parseFloat(node.style.left), parseFloat(node.style.top));
    }
  } else {
    openNodeModal(dragging.node);
  }
  dragging = null;
});

const links = topologyConfig.links;

const svg = document.getElementById("linkLayer");

const linkLines = links.map(() => {
  const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
  l.classList.add("link-line");
  svg.appendChild(l);
  return l;
});

function updateAllLinks() {
  const canvasRect = canvas.getBoundingClientRect();

  links.forEach((pair, index) => {
    const [nodea, nodeb] = pair;
    const line = linkLines[index];

    const a = document.getElementById(nodea).getBoundingClientRect();
    const b = document.getElementById(nodeb).getBoundingClientRect();

    const ax = a.left + a.width / 2 - canvasRect.left;
    const ay = a.top + a.height / 2 - canvasRect.top;
    const bx = b.left + b.width / 2 - canvasRect.left;
    const by = b.top + b.height / 2 - canvasRect.top;

    line.setAttribute("x1", ax);
    line.setAttribute("y1", ay);
    line.setAttribute("x2", bx);
    line.setAttribute("y2", by);
  });
}

// Custom links (Settings > Config Topology) -- purely additive, drawn
// in the same SVG layer but tracked separately from the original
// topologyConfig.links pairs above (those point at specific anchor
// points *inside* nodes; these connect whole top-level node boxes by
// their data-topo-id).
let customLinkLines = [];

function renderCustomTopologyLinks() {
  customLinkLines.forEach((l) => l.remove());
  customLinkLines = getTopologyCustomLinks().map(() => {
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.classList.add("link-line");
    svg.appendChild(l);
    return l;
  });
}

function updateCustomLinks() {
  const canvasRect = canvas.getBoundingClientRect();
  const customLinks = getTopologyCustomLinks();
  customLinks.forEach((link, index) => {
    const line = customLinkLines[index];
    if (!line) return;
    const elA = canvas.querySelector(`[data-topo-id="${link.a}"]`);
    const elB = canvas.querySelector(`[data-topo-id="${link.b}"]`);
    if (!elA || !elB) return;
    const a = elA.getBoundingClientRect();
    const b = elB.getBoundingClientRect();
    line.setAttribute("x1", a.left + a.width / 2 - canvasRect.left);
    line.setAttribute("y1", a.top + a.height / 2 - canvasRect.top);
    line.setAttribute("x2", b.left + b.width / 2 - canvasRect.left);
    line.setAttribute("y2", b.top + b.height / 2 - canvasRect.top);
  });
}

updateAllLinks();
updateCustomLinks();
window.addEventListener("resize", () => { updateAllLinks(); updateCustomLinks(); });
window.addEventListener("scroll", () => { updateAllLinks(); updateCustomLinks(); });

// See the comment left where this used to be called, right after it
// was defined -- everything it depends on (including a couple of
// `let`/`const` bindings below it in the file) is only now fully in
// place.
renderProtectedTopologyBits();



  // Load saved theme on page start
  (function() {
    const savedTheme = localStorage.getItem("/settings.html") || "standard";
    document.body.className = "theme-" + savedTheme;

    // Let the parent shell (encapsulation.html) sync its sidebar theme --
    // the parent doesn't read storage directly, see settings.html.
    if (window.self !== window.top) {
      window.top.postMessage({ type: "theme-change", theme: savedTheme }, "*");
    }
  })();


  function openNodeModal(node) {
    const title = node.dataset.title || node.querySelector('.node-title')?.innerText;
    const spec = node.dataset.spec || "Aucune spécification";
    const url = node.dataset.url || null;

    document.getElementById("modalTitle").innerText = title;
    document.getElementById("modalSpec").innerText = spec;

    const btn = document.getElementById("modalUrlBtn");
    if (url) {
      btn.style.display = "block";
      btn.onclick = () => window.open(url, "_blank", "noopener");
    } else {
      btn.style.display = "none";
    }

    document.getElementById("nodeModal").style.display = "flex";
  }

  // Top-level nodes (data-topoId set -- WAN, pfSense, etc., see
  // startTopologyDrag above) open the modal from the drag state machine
  // itself instead (a plain click there is just "mouseup without ever
  // exceeding the drag threshold") -- relying on the browser's own
  // click synthesis after a mousedown/mousemove/mouseup sequence proved
  // unreliable once a *different* node had just been dragged in the
  // same page. Nested nodes (no data-topoId, eg. a device inside the
  // Wi-Fi box) were never draggable and keep this original click path
  // untouched.
  document.querySelectorAll('.node').forEach(node => {
    if (node.dataset.topoId) return;
    node.addEventListener('click', () => openNodeModal(node));
  });

document.querySelector(".modal-close").onclick = () => {
  document.getElementById("nodeModal").style.display = "none";
};

document.getElementById("nodeModal").onclick = (e) => {
  if (e.target.id === "nodeModal") {
    document.getElementById("nodeModal").style.display = "none";
  }
};



