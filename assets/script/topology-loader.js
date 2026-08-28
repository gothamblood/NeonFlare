function buildTopologyElement(spec) {
  const el = document.createElement(spec.tag);

  if (spec.class) el.className = spec.class;
  if (spec.id) el.id = spec.id;
  if (spec.tag === "img" && spec.src) el.src = spec.src;

  if (spec.data) {
    Object.entries(spec.data).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }

  if (spec.text) el.textContent = spec.text;

  if (spec.children) {
    spec.children.forEach(child => el.appendChild(buildTopologyElement(child)));
  }

  return el;
}

function renderTopologyNodes(nodes, canvasSelector) {
  const canvas = document.querySelector(canvasSelector);
  if (!canvas) return;

  nodes.forEach(spec => canvas.appendChild(buildTopologyElement(spec)));
}
