/* Freeform drag/resize for dashboard.html's panels (Shells, Réseau,
   Outils, Website, Couverture GRC, System log).

   A panel stays completely inside the original row/column flex layout
   (dashboard-panels.css) -- with every dynamic behavior that comes with
   it (Shells/Network sizing each other, Log/GRC's own natural/shrink
   sizing, the responsive :has() rules) -- until the moment the user
   actually drags its header or its resize grip. Only then does it
   "detach": switch to position:absolute at a rect captured from
   wherever it already, correctly, was on screen at that exact instant
   (not a precomputed default), relative to .network-shell. Nothing is
   ever measured or frozen ahead of time, so a panel nobody has touched
   behaves exactly as it did before this feature existed, in every
   window size and every Shells/collapse state -- only user-customized
   panels persist a layout at all.

   Stored per dashboard (see assets/script/dashboards.js) as fractions
   (0-100) of .network-shell's own size, so a saved layout scales instead
   of clipping if the window is resized afterwards. */

function dashLayoutKey(dashboardId) {
  return "/settings.html/dashboardLayout/" + dashboardId;
}

function loadDashLayout(dashboardId) {
  try {
    return JSON.parse(localStorage.getItem(dashLayoutKey(dashboardId)) || "{}");
  } catch (e) {
    return {};
  }
}

function saveDashLayout(dashboardId, layout) {
  localStorage.setItem(dashLayoutKey(dashboardId), JSON.stringify(layout));
}

function initDashboardLayout(dashboardId) {
  const root = document.querySelector(".network-shell");
  if (!root) return;

  const layout = loadDashLayout(dashboardId);

  function applyRect(panel, rect) {
    panel.style.left = rect.left + "%";
    panel.style.top = rect.top + "%";
    panel.style.width = rect.width + "%";
    if (!panel.classList.contains("collapsed")) {
      panel.style.height = rect.height + "%";
    }
    panel.classList.add("dash-positioned");
  }

  function rectToPct(rect, rootRect) {
    return {
      left: ((rect.left - rootRect.left) / rootRect.width) * 100,
      top: ((rect.top - rootRect.top) / rootRect.height) * 100,
      width: (rect.width / rootRect.width) * 100,
      height: (rect.height / rootRect.height) * 100,
    };
  }

  // panel + whichever of its .dash-panel siblings are still in-flow (not
  // already detached) and actually visible right now -- a currently
  // hidden one (eg. Shells with no open terminal -- .hidden, or
  // .dash-section-off) has no real on-screen rect to capture (0×0);
  // including it would wrongly lock it there forever, so a shell opened
  // later would never regain its normal share of the row. It gets a
  // chance to detach at its real rect the next time a sibling leaves the
  // row while it's actually visible.
  function withInFlowSiblings(panel) {
    const group = [panel];
    const parent = panel.parentElement;
    if (parent) {
      Array.from(parent.children).forEach((sib) => {
        if (sib === panel || !sib.classList || !sib.classList.contains("dash-panel")) return;
        if (sib.classList.contains("dash-positioned")) return;
        if (sib.getBoundingClientRect().width === 0) return;
        group.push(sib);
      });
    }
    return group;
  }

  // Detaching a panel switches it to position: absolute, which pulls it
  // OUT of its parent's flex layout entirely. Its still-in-flow siblings
  // (eg. Shells, flex: 1 1 auto, sharing .dash-row-top with Network,
  // .dash-row-top's justify-content: flex-end packing whatever's left
  // against the row's end) then have one less box to share the row with,
  // and reflow into the gap the instant that happens -- growing to fill
  // it, or sliding to stay packed against the row's end, either of which
  // visibly covers/displaces the real shell terminal (drawn as an
  // overlay on top of this whole iframe). The only way a sibling truly
  // stays exactly where it was is to detach it too, at the same moment,
  // frozen at its own current rect (or its own saved one, from `layout`,
  // if it has one -- see the reload pass below).
  //
  // ownPct, given, is used for `panel` itself instead of its current
  // on-screen rect -- the reload pass below needs this (restore a
  // previously SAVED position, not whatever the panel's un-detached
  // in-flow box happens to look like right now); a live first-time drag
  // has no saved rect yet, so it omits this and its current box is used.
  //
  // Every rect below -- panel's own (when not given one) and every
  // sibling's -- is captured BEFORE anything is applied: all read from
  // the DOM first, while the row is still in its one, true, undisturbed
  // layout, and only once every rect that's needed is safely in hand
  // does applyRect() start detaching them. Doing this any other way
  // (detach the panel, THEN go measure its sibling) lets the first
  // detachment's reflow happen in between the two steps, so the
  // "current rect" captured for the sibling is already the wrong,
  // post-reflow one.
  function detachGroup(panel, ownPct) {
    if (panel.classList.contains("dash-positioned")) return;
    const rootRect = root.getBoundingClientRect();
    const group = withInFlowSiblings(panel);
    const toApply = group.map((p) => {
      if (p === panel && ownPct) return { p, pct: ownPct };
      if (layout[p.id]) return { p, pct: layout[p.id] };
      return { p, pct: rectToPct(p.getBoundingClientRect(), rootRect) };
    });
    toApply.forEach(({ p, pct }) => {
      layout[p.id] = pct;
      applyRect(p, pct);
    });
  }

  // First time THIS panel is dragged/resized: whatever its current,
  // still-in-flow rect is right now is by definition correct (it's
  // what's actually on screen), so that becomes the rect it detaches
  // to -- nothing jumps.
  function detach(panel) {
    detachGroup(panel, null);
  }

  // Already customized in an earlier visit: detach immediately, at the
  // saved rect, before any layout happens.
  document.querySelectorAll(".dash-panel").forEach((panel) => {
    if (layout[panel.id]) detachGroup(panel, layout[panel.id]);
  });

  // Covers the one case withInFlowSiblings() above deliberately leaves
  // out: Shells resized/dragged while it was HIDDEN (no shell open --
  // 0x0, so it wasn't pulled into that detach). Network ends up
  // "dash-positioned" alone, out of the flex row entirely; Shells is
  // still plain in-flow. The next "+ Shell" click un-hides it into a
  // .dash-row-top that -- as far as flexbox knows -- now contains only
  // Shells, so flex: 1 1 auto gives it the row's FULL width, painting
  // it directly over Network's now-unrelated frozen box.
  //
  // Called from dashboard-shells.js's applyShellsState() right as a
  // hidden Shells panel is revealed. Finds a sibling that's already
  // dash-positioned and, if there is one, freezes `panel` too -- not at
  // its (currently accurate, since Network hasn't moved) in-flow rect,
  // but at whatever of the row is left once that sibling's real,
  // current box is excluded, packed to the opposite edge (.dash-row-
  // top's own justify-content: flex-end always packs a lone detached
  // panel toward the row's end, so the leftover space is on the start
  // side). A plain in-flow panel with no detached sibling needs none of
  // this -- ordinary flexbox already places it correctly.
  function reconcileWithDetachedSibling(panel) {
    if (panel.classList.contains("dash-positioned")) return;
    const row = panel.closest(".dash-row-top");
    if (!row) return;
    const detachedSibling = Array.from(row.children).find(
      (sib) => sib !== panel && sib.classList && sib.classList.contains("dash-panel") && sib.classList.contains("dash-positioned")
    );
    if (!detachedSibling) return;

    const rootRect = root.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const sibRect = detachedSibling.getBoundingClientRect();
    const gapPx = 8; // .dash-row-top's own gap: 0.5rem
    const { minWidth } = panelMinSize(panel);

    const spaceBefore = sibRect.left - rowRect.left;
    const spaceAfter = rowRect.right - sibRect.right;
    const rect = spaceBefore >= spaceAfter
      ? { left: rowRect.left, top: rowRect.top, width: Math.max(minWidth, spaceBefore - gapPx), height: rowRect.height }
      : { left: sibRect.right + gapPx, top: rowRect.top, width: Math.max(minWidth, spaceAfter - gapPx), height: rowRect.height };

    detachGroup(panel, rectToPct(rect, rootRect));
  }
  window.dashLayoutReconcileWithDetachedSibling = reconcileWithDetachedSibling;

  function panelMinSize(panel) {
    return { minWidth: 220, minHeight: panel.classList.contains("collapsed") ? 0 : 120 };
  }

  // Panels can't be dragged above where the topbar ends -- computed
  // fresh per drag rather than cached, since collapsing a panel above
  // it or resizing the window can change the topbar's own height.
  function minTopPx() {
    const header = document.querySelector(".network-header");
    if (!header) return 0;
    return header.getBoundingClientRect().bottom - root.getBoundingClientRect().top;
  }

  let dragging = null;
  let resizing = null;

  // Told to the parent (index.html) so it can relay mousemove/mouseup
  // down to us while one of those two is in progress -- see below.
  function notifyDragActive(active) {
    if (window.top !== window.self) {
      window.top.postMessage({ type: "dash-drag-active", active }, "*");
    }
  }

  document.querySelectorAll(".dash-panel-header").forEach((header) => {
    header.addEventListener("mousedown", (e) => {
      if (e.target.closest(".dash-collapse-btn")) return;
      const panel = header.closest(".dash-panel");
      detach(panel);
      const rootRect = root.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      dragging = {
        panel,
        startX: e.clientX,
        startY: e.clientY,
        startLeftPx: panelRect.left - rootRect.left,
        startTopPx: panelRect.top - rootRect.top,
      };
      notifyDragActive(true);
      e.preventDefault();
    });
  });

  document.querySelectorAll(".dash-resize-handle").forEach((handle) => {
    handle.addEventListener("mousedown", (e) => {
      const panel = document.getElementById(handle.dataset.target);
      detach(panel);
      const panelRect = panel.getBoundingClientRect();
      resizing = {
        panel,
        startX: e.clientX,
        startY: e.clientY,
        startWidthPx: panelRect.width,
        startHeightPx: panelRect.height,
      };
      notifyDragActive(true);
      e.preventDefault();
      e.stopPropagation();
    });
  });

  function pxToPct(px, total) {
    return (px / total) * 100;
  }

  function handleMouseMove(clientX, clientY) {
    const rootRect = root.getBoundingClientRect();
    if (dragging) {
      const panel = dragging.panel;
      const { minWidth, minHeight } = panelMinSize(panel);
      let leftPx = dragging.startLeftPx + (clientX - dragging.startX);
      let topPx = dragging.startTopPx + (clientY - dragging.startY);
      leftPx = Math.max(0, Math.min(leftPx, rootRect.width - minWidth));
      topPx = Math.max(minTopPx(), Math.min(topPx, rootRect.height - minHeight));
      panel.style.left = pxToPct(leftPx, rootRect.width) + "%";
      panel.style.top = pxToPct(topPx, rootRect.height) + "%";
    } else if (resizing) {
      const panel = resizing.panel;
      const { minWidth, minHeight } = panelMinSize(panel);
      let widthPx = Math.max(minWidth, resizing.startWidthPx + (clientX - resizing.startX));
      widthPx = Math.min(widthPx, rootRect.width - panel.offsetLeft);
      panel.style.width = pxToPct(widthPx, rootRect.width) + "%";
      if (!panel.classList.contains("collapsed")) {
        let heightPx = Math.max(minHeight, resizing.startHeightPx + (clientY - resizing.startY));
        heightPx = Math.min(heightPx, rootRect.height - panel.offsetTop);
        panel.style.height = pxToPct(heightPx, rootRect.height) + "%";
      }
    }
  }

  window.addEventListener("mousemove", (e) => handleMouseMove(e.clientX, e.clientY));

  function commitPosition(panel) {
    const rootRect = root.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const saved = layout[panel.id] || {};
    layout[panel.id] = {
      left: pxToPct(panelRect.left - rootRect.left, rootRect.width),
      top: pxToPct(panelRect.top - rootRect.top, rootRect.height),
      width: saved.width,
      height: saved.height,
    };
    saveDashLayout(dashboardId, layout);
  }

  function commitSize(panel) {
    const rootRect = root.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const saved = layout[panel.id] || {};
    layout[panel.id] = {
      left: saved.left,
      top: saved.top,
      width: pxToPct(panelRect.width, rootRect.width),
      height: panel.classList.contains("collapsed") ? saved.height : pxToPct(panelRect.height, rootRect.height),
    };
    saveDashLayout(dashboardId, layout);
  }

  function handleMouseUp() {
    if (dragging) {
      commitPosition(dragging.panel);
      dragging = null;
      notifyDragActive(false);
    }
    if (resizing) {
      commitSize(resizing.panel);
      resizing = null;
      notifyDragActive(false);
    }
  }

  window.addEventListener("mouseup", handleMouseUp);

  // The real shell terminals are drawn by the PARENT document
  // (index.html/assets/script/shells-host.js) as an overlay sitting
  // visually on top of this iframe -- releasing the mouse over one fires
  // mouseup in THAT document, not this one, so our own listener above
  // never sees it and the drag/resize would otherwise never end. index.html
  // relays both events down (already converted to this iframe's own
  // coordinate space) while notifyDragActive(true) has told it one is in
  // progress.
  window.addEventListener("message", (e) => {
    if (!e.data) return;
    if (e.data.type === "top-mousemove") handleMouseMove(e.data.clientX, e.data.clientY);
    if (e.data.type === "top-mouseup") handleMouseUp();
  });

  window.dashLayoutReset = function () {
    localStorage.removeItem(dashLayoutKey(dashboardId));
    window.location.reload();
  };
}
