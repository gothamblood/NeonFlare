/* Guided tour: a spotlight + tooltip drawn in index.html (the top
   window, so it can draw over #frame regardless of what page is
   loaded there), stepping through the real Dashboard and Settings UI
   instead of a floating modal disconnected from what it's describing.
   A step with a target navigates #frame to that step's page if it
   isn't already there, then asks that page for the target's on-screen
   rect over postMessage (see assets/script/onboarding-target.js,
   shared by every page the tour can point at) since it's a separate
   document. */

const ONBOARDING_DONE_KEY = "/settings.html/onboardingDone";

// page -> the URL fragment used to tell whether #frame is already on
// it (same names as index.html's loadPage()/PAGE_ALIASES).
const ONBOARDING_PAGE_URLS = {
  dashboard: "dashboard.html",
  settings: "settings.html",
  grc: "grc/index.html",
  pentest: "pentest.html",
};

// Every visible string is an assets/script/i18n.js key, not raw text --
// see onbT()/onbGoToStep() below, which keep them in sync with Settings >
// Langue the same way the rest of the site's chrome does.
const ONBOARDING_STEPS = [
  {
    titleKey: "onboarding.welcome.title",
    textKey: "onboarding.welcome.text",
    target: null,
  },
  {
    titleKey: "nav.network",
    textKey: "onboarding.network.text",
    page: "dashboard",
    target: "panelNetwork",
  },
  {
    titleKey: "nav.tools",
    textKey: "onboarding.tools.text",
    page: "dashboard",
    target: "panelTools",
  },
  {
    titleKey: "onboarding.grcPanel.title",
    textKey: "onboarding.grcPanel.text",
    page: "dashboard",
    target: "panelGrc",
  },
  {
    titleKey: "nav.grcFull",
    textKey: "onboarding.grcHub.text",
    page: "grc",
    target: "grc-grid",
    scrollAlign: "start",
  },
  {
    titleKey: "onboarding.pentest.title",
    textKey: "onboarding.pentest.text",
    page: "pentest",
    target: "pentestCardsContainer",
    scrollAlign: "start",
  },
  {
    titleKey: "onboarding.settingsStep.title",
    textKey: "onboarding.settingsStep.text",
    page: "settings",
    target: "settingsCardsContainer",
    scrollAlign: "start",
  },
  {
    titleKey: "onboarding.done.title",
    textKey: "onboarding.done.text",
    target: null,
  },
];

let onbEl = null;
let onbActive = false;
let onbStepIndex = 0;
let onbRequestToken = 0;

// Reads assets/script/i18n.js's own dictionary directly (rather than
// data-i18n + the global applyI18n()) for text that has to be resolved
// immediately -- eg. an aria-label, which applyI18n() doesn't touch.
function onbT(key) {
  const entry = I18N_DICT[key];
  return (entry && entry[getSavedLang()]) || (entry && entry.fr) || key;
}

// Re-applies the current language to the tour's own DOM: the sidebar's
// "lang-change" broadcast already calls the site-wide applyI18n(), which
// picks up every data-i18n element including ours -- this just covers
// the one attribute (aria-label) that helper doesn't touch.
function onbApplyLang() {
  if (!onbEl) return;
  onbEl.tooltip.querySelector(".onb-close").setAttribute("aria-label", onbT("onboarding.close"));
}

function onbBuildDom() {
  if (onbEl) return onbEl;

  const style = document.createElement("style");
  style.textContent = `
    .onb-dim {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.65);
      z-index: 997;
      display: none;
    }
    .onb-spotlight {
      position: fixed;
      border-radius: 12px;
      border: 2px solid var(--accent);
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.65), 0 0 24px var(--accent-glow);
      transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease;
      z-index: 997;
      pointer-events: none;
      display: none;
    }
    .onb-tooltip {
      position: fixed;
      z-index: 998;
      width: 320px;
      max-width: calc(100vw - 2rem);
      background: #11182a;
      border: 1px solid var(--accent);
      border-radius: 12px;
      padding: 1.1rem 1.3rem;
      box-shadow: 0 8px 20px rgba(0,0,0,0.7);
      color: #f5f5f5;
      font-family: system-ui, sans-serif;
      transition: top 0.3s ease, left 0.3s ease;
      display: none;
    }
    .onb-tooltip.onb-centered {
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    .onb-close {
      position: absolute;
      top: 0.5rem; right: 0.7rem;
      background: none; border: none;
      color: #8892a8; font-size: 1.1rem;
      cursor: pointer; line-height: 1;
    }
    .onb-close:hover { color: var(--accent); }
    .onb-dots {
      display: flex; gap: 0.5rem;
      margin-bottom: 0.9rem;
    }
    .onb-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
    }
    .onb-dot.active { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
    .onb-tooltip h2 { margin: 0 0 0.5rem; font-size: 1.05rem; }
    .onb-tooltip p { margin: 0 0 1rem; font-size: 0.85rem; line-height: 1.5; color: #c7cdda; }
    .onb-actions {
      display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;
    }
    .onb-actions-right { display: flex; gap: 0.5rem; }
    .onb-btn {
      font-family: inherit;
      font-size: 0.75rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--accent);
      background: rgba(8, 10, 16, 0.65);
      border: 1px solid var(--accent);
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease;
    }
    .onb-btn:hover { background: var(--accent-glow); box-shadow: 0 0 12px var(--accent-glow); }
    .onb-skip {
      background: none; border: none; color: #8892a8;
      font-size: 0.72rem; text-decoration: underline; cursor: pointer; padding: 0;
    }
    .onb-skip:hover { color: var(--accent); }
  `;
  document.head.appendChild(style);

  const dim = document.createElement("div");
  dim.className = "onb-dim";
  dim.onclick = onbFinish;

  const spotlight = document.createElement("div");
  spotlight.className = "onb-spotlight";

  const tooltip = document.createElement("div");
  tooltip.className = "onb-tooltip";
  tooltip.innerHTML = `
    <button type="button" class="onb-close" aria-label="${onbT("onboarding.close")}">×</button>
    <div class="onb-dots"></div>
    <h2 class="onb-title" data-i18n=""></h2>
    <p class="onb-text" data-i18n=""></p>
    <div class="onb-actions">
      <button type="button" class="onb-skip" data-i18n="onboarding.skip">Passer la visite</button>
      <div class="onb-actions-right">
        <button type="button" class="onb-btn onb-prev" data-i18n="onboarding.prev">← Précédent</button>
        <button type="button" class="onb-btn onb-next" data-i18n="onboarding.next">Suivant →</button>
      </div>
    </div>
  `;

  document.body.appendChild(dim);
  document.body.appendChild(spotlight);
  document.body.appendChild(tooltip);

  const dots = tooltip.querySelector(".onb-dots");
  ONBOARDING_STEPS.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "onb-dot";
    dots.appendChild(dot);
  });

  tooltip.querySelector(".onb-close").onclick = onbFinish;
  tooltip.querySelector(".onb-skip").onclick = onbFinish;
  tooltip.querySelector(".onb-prev").onclick = () => onbGoToStep(onbStepIndex - 1);
  tooltip.querySelector(".onb-next").onclick = () => {
    if (onbStepIndex === ONBOARDING_STEPS.length - 1) onbFinish();
    else onbGoToStep(onbStepIndex + 1);
  };

  onbEl = { dim, spotlight, tooltip };
  return onbEl;
}

function onbStart() {
  onbBuildDom();
  onbActive = true;
  onbGoToStep(0);
}

function onbMaybeAutoStart() {
  if (!localStorage.getItem(ONBOARDING_DONE_KEY)) onbStart();
}

function onbFinish() {
  onbActive = false;
  localStorage.setItem(ONBOARDING_DONE_KEY, "1");
  if (!onbEl) return;
  onbEl.dim.style.display = "none";
  onbEl.spotlight.style.display = "none";
  onbEl.tooltip.style.display = "none";
}

function onbGoToStep(index) {
  if (index < 0 || index >= ONBOARDING_STEPS.length) return;
  onbStepIndex = index;
  const step = ONBOARDING_STEPS[index];
  const { tooltip } = onbBuildDom();

  const isLast = index === ONBOARDING_STEPS.length - 1;
  tooltip.querySelectorAll(".onb-dot").forEach((dot, i) => dot.classList.toggle("active", i === index));
  tooltip.querySelector(".onb-title").setAttribute("data-i18n", step.titleKey);
  tooltip.querySelector(".onb-text").setAttribute("data-i18n", step.textKey);
  tooltip.querySelector(".onb-next").setAttribute("data-i18n", isLast ? "onboarding.finish" : "onboarding.next");
  applyI18n(getSavedLang());
  tooltip.querySelector(".onb-prev").style.visibility = index === 0 ? "hidden" : "visible";
  tooltip.querySelector(".onb-skip").style.visibility = isLast ? "hidden" : "visible";

  if (!step.target) {
    onbShowCentered();
    return;
  }
  onbRequestPanelRect(step.target, step.page, step.scrollAlign);
}

function onbShowCentered() {
  const { dim, spotlight, tooltip } = onbEl;
  dim.style.display = "block";
  spotlight.style.display = "none";
  tooltip.style.display = "block";
  tooltip.classList.add("onb-centered");
  tooltip.style.top = "";
  tooltip.style.left = "";
}

function onbSetSpotlightRect(rect) {
  const { dim, spotlight, tooltip } = onbEl;
  const pad = 8;
  const edge = 4;

  // Clamp to the viewport -- a target taller/wider than the screen (eg.
  // the full Settings card grid, scrolled to its center) would otherwise
  // draw a box that runs off every edge instead of reading as a highlight.
  let top = rect.top - pad;
  let left = rect.left - pad;
  let width = rect.width + pad * 2;
  let height = rect.height + pad * 2;
  if (top < edge) { height -= edge - top; top = edge; }
  if (left < edge) { width -= edge - left; left = edge; }
  height = Math.min(height, window.innerHeight - edge - top);
  width = Math.min(width, window.innerWidth - edge - left);

  dim.style.display = "none";
  spotlight.style.display = "block";
  spotlight.style.top = top + "px";
  spotlight.style.left = left + "px";
  spotlight.style.width = Math.max(width, 20) + "px";
  spotlight.style.height = Math.max(height, 20) + "px";

  tooltip.classList.remove("onb-centered");
  tooltip.style.display = "block";
  const tw = tooltip.offsetWidth || 320;
  const th = tooltip.offsetHeight || 160;
  const margin = 16;
  // Positioned off the (clamped) box actually drawn above, not the raw
  // rect -- keeps the tooltip anchored to what's visibly highlighted.
  let tooltipTop = top + height + margin;
  if (tooltipTop + th > window.innerHeight - margin) {
    tooltipTop = top - th - margin;
    if (tooltipTop < margin) tooltipTop = Math.max(margin, window.innerHeight - th - margin);
  }
  let tooltipLeft = left + width / 2 - tw / 2;
  tooltipLeft = Math.min(Math.max(tooltipLeft, margin), window.innerWidth - tw - margin);
  tooltip.style.top = tooltipTop + "px";
  tooltip.style.left = tooltipLeft + "px";
}

/* Navigates #frame to the given page if it isn't already there, then
   asks that page for the target's rect. Token guards against a reply
   arriving after the user already moved to a different step (eg.
   clicking Next twice fast) -- only the latest request's response is
   applied. */
function onbRequestPanelRect(panelId, page, scrollAlign) {
  const frame = document.getElementById("frame");
  const token = ++onbRequestToken;

  const ask = () => {
    frame.contentWindow.postMessage({ type: "onb-request-rect", panelId, token, scrollAlign }, "*");
  };

  if (!frame.src.includes(ONBOARDING_PAGE_URLS[page])) {
    frame.addEventListener("load", function handler() {
      frame.removeEventListener("load", handler);
      if (token === onbRequestToken) ask();
    });
    loadPage(page);
  } else {
    ask();
  }
}

window.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "onb-rect" || e.data.token !== onbRequestToken || !onbActive) return;
  if (e.data.rect) {
    const frame = document.getElementById("frame");
    const frameRect = frame.getBoundingClientRect();
    onbSetSpotlightRect({
      top: frameRect.top + e.data.rect.top,
      left: frameRect.left + e.data.rect.left,
      width: e.data.rect.width,
      height: e.data.rect.height,
    });
  } else {
    // Panel not found or hidden (eg. turned off in Settings > Sections
    // du Dashboard) -- fall back to the centered card rather than
    // pointing at nothing.
    onbShowCentered();
  }
});

let onbResizeTimer = null;
window.addEventListener("resize", () => {
  if (!onbActive) return;
  clearTimeout(onbResizeTimer);
  onbResizeTimer = setTimeout(() => {
    const step = ONBOARDING_STEPS[onbStepIndex];
    if (step && step.target) onbRequestPanelRect(step.target, step.page, step.scrollAlign);
  }, 150);
});
