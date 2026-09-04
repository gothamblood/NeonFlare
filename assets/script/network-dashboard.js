/* Loads the dragon hologram mascots (dragons.html) into the given slot.
   Kept as a fetched fragment rather than inline markup so the same
   pair of dragons can be reused on other pages later without
   duplicating their HTML everywhere. */
function loadDragons(slotSelector) {
  const slot = document.querySelector(slotSelector);
  if (!slot) return;
  fetch("./dragons.html")
    .then((res) => res.text())
    .then((html) => { slot.insertAdjacentHTML("afterbegin", html); })
    .catch(() => {});
}

/* Reachability check without a backend: fire a no-cors fetch and see
   whether the network layer completes it. We never read the response
   (opaque under no-cors), so this can't tell "200" from "404" -- it
   only distinguishes "something answered" from "DNS/refused/timeout/
   blocked". That's also why it reads as offline for https targets with
   a self-signed cert the browser hasn't trusted yet, and for http
   targets when this page itself is served over https (mixed content). */
function checkReachable(url, timeoutMs) {
  timeoutMs = timeoutMs || 3000;
  return new Promise((resolve) => {
    if (!url) { resolve({ ok: false, ms: null }); return; }
    const controller = new AbortController();
    const start = performance.now();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    fetch(url, { mode: "no-cors", cache: "no-store", signal: controller.signal })
      .then(() => {
        clearTimeout(timer);
        resolve({ ok: true, ms: Math.round(performance.now() - start) });
      })
      .catch(() => {
        clearTimeout(timer);
        resolve({ ok: false, ms: null });
      });
  });
}

function buildNodeCard(entry) {
  const card = document.createElement("div");
  card.className = "card node-card";
  card.onclick = () => window.open(entry.url, "_blank");

  const status = document.createElement("div");
  status.className = "node-status checking";
  card.appendChild(status);

  const img = document.createElement("img");
  img.src = entry.img;
  img.className = "card-img";
  card.appendChild(img);

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = entry.title;
  card.appendChild(title);

  const sub = document.createElement("div");
  sub.className = "card-sub";
  sub.textContent = entry.sub;
  card.appendChild(sub);

  const latency = document.createElement("div");
  latency.className = "node-latency";
  latency.textContent = "checking...";
  card.appendChild(latency);

  card._status = status;
  card._latency = latency;
  return card;
}

function updateGauge(gaugeSelector, online, total) {
  const gauge = document.querySelector(gaugeSelector);
  if (!gauge) return;
  const valueCircle = gauge.querySelector(".value");
  const label = gauge.querySelector(".hud-gauge-label");
  const r = valueCircle.r.baseVal.value;
  const circumference = 2 * Math.PI * r;
  const ratio = total > 0 ? online / total : 0;
  valueCircle.style.strokeDasharray = circumference;
  valueCircle.style.strokeDashoffset = circumference * (1 - ratio);
  if (label) label.textContent = total > 0 ? Math.round(ratio * 100) + "%" : "--";
}

/* Thin forwarder to the shared System log service (assets/script/
   system-log.js), which now owns the rendering, the line caps and the
   panel it draws into. Kept here (rather than updating every call site)
   so the network checks below stay untouched; every line it emits is
   tagged source "net". Falls back to a no-op if system-log.js somehow
   didn't load, so a network check can never throw here. */
function logLine(logSelector, text, kind) {
  if (window.systemLog) {
    window.systemLog.push({ selector: logSelector, text: text, level: kind || "info", source: "net" });
  }
}

function startClock(clockSelector) {
  const el = document.querySelector(clockSelector);
  if (!el) return;
  const tick = () => { el.textContent = new Date().toLocaleTimeString(); };
  tick();
  setInterval(tick, 1000);
}

function runNetworkChecks(entries, cards, gaugeSelector, logSelector, statusMap) {
  entries.forEach((entry, i) => {
    checkReachable(entry.url).then((result) => {
      statusMap[entry.url] = result;
      const card = cards[i];
      card._status.className = "node-status " + (result.ok ? "online" : "offline");
      card._latency.textContent = result.ok ? (result.ms + " ms") : "unreachable";
      logLine(
        logSelector,
        entry.title + " (" + entry.sub + ") — " + (result.ok ? "ONLINE, " + result.ms + "ms" : "UNREACHABLE"),
        result.ok ? "ok" : "fail"
      );

      const online = Object.values(statusMap).filter((r) => r && r.ok).length;
      updateGauge(gaugeSelector, online, entries.length);
      const countEl = document.querySelector(".status-group .hud-status-count");
      if (countEl) countEl.textContent = online + " / " + entries.length + " NODES ONLINE";
    });
  });
}

function groupByCategory(entries) {
  const order = [];
  const byCategory = {};
  entries.forEach((entry) => {
    const cat = entry.category || "Autres";
    if (!byCategory[cat]) {
      byCategory[cat] = [];
      order.push(cat);
    }
    byCategory[cat].push(entry);
  });
  return order.map((cat) => ({ category: cat, entries: byCategory[cat] }));
}

function initNetworkDashboard(config, opts) {
  const grid = document.querySelector(opts.gridSelector);
  const entries = config.cards.filter((c) => c.enabled !== false);

  // Rebuilt in category order so it stays index-aligned with `cards` below.
  const orderedEntries = [];
  const cards = [];

  groupByCategory(entries).forEach((group) => {
    const section = document.createElement("div");
    section.className = "node-category";

    const title = document.createElement("div");
    title.className = "node-category-title";
    title.textContent = group.category;
    section.appendChild(title);

    const catGrid = document.createElement("div");
    catGrid.className = "node-category-grid";
    group.entries.forEach((entry) => {
      const card = buildNodeCard(entry);
      catGrid.appendChild(card);
      orderedEntries.push(entry);
      cards.push(card);
    });
    section.appendChild(catGrid);
    grid.appendChild(section);
  });

  const countEl = document.querySelector(".status-group .hud-status-count");
  if (countEl) countEl.textContent = "0 / " + orderedEntries.length + " NODES ONLINE";
  updateGauge(opts.gaugeSelector, 0, orderedEntries.length);
  logLine(opts.logSelector, "NODE REGISTRY LOADED — " + orderedEntries.length + " NODES", "pending");
  startClock(opts.clockSelector);

  const statusMap = {};
  const check = () => runNetworkChecks(orderedEntries, cards, opts.gaugeSelector, opts.logSelector, statusMap);

  check();
  setInterval(check, opts.intervalMs || 45000);
}
