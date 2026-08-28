/* Same "drifting node network" canvas effect as the showcase site's own
   PagePrincipal/js/background.js (TodoGRC.txt #17: bring it into the
   app's GRC hub pages too) -- reimplemented here rather than shared
   since the two sites are otherwise fully independent stylesheets/
   script folders (see PagePrincipal/css/style.css's own header
   comment). Reads the current theme's --accent CSS variable instead of
   a hardcoded color, so it re-tints automatically across this app's
   Standard/Neon Terminal/Blade Runner/Black ICE themes.

   Called explicitly by assets/script/page-effects-loader.js (Settings >
   Apparence's per-page "Vecteurs" toggle) rather than self-starting on
   DOMContentLoaded -- this file is now loaded on demand, only for a
   page that has the effect turned on. */
function grcInitNetworkBackground() {
  const canvas = document.createElement("canvas");
  canvas.className = "grc-network-canvas";
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LINK_DIST = 150;
  let w, h, nodes, dpr, rgb;

  function hexToRgb(hex) {
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec((hex || "").trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [72, 219, 251];
  }

  // Read once at startup rather than every frame -- a theme switch only
  // takes effect on next load anyway (see js/main.js's theme handling),
  // same as the rest of this app's per-theme styling.
  function readAccent() {
    rgb = hexToRgb(getComputedStyle(document.body).getPropertyValue("--accent"));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initNodes() {
    const count = Math.max(20, Math.min(55, Math.floor((w * h) / 26000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    }));
  }

  function drawFrame() {
    ctx.clearRect(0, 0, w, h);

    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x <= 0 || n.x >= w) n.vx *= -1;
      if (n.y <= 0 || n.y >= h) n.vy *= -1;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= LINK_DIST) continue;
        ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.14 * (1 - dist / LINK_DIST)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.45)`;
      ctx.fill();
    });
  }

  function tick() {
    drawFrame();
    requestAnimationFrame(tick);
  }

  readAccent();
  resize();
  initNodes();
  window.addEventListener("resize", () => { resize(); initNodes(); });

  if (reduceMotion) {
    drawFrame();
  } else {
    tick();
  }
}
