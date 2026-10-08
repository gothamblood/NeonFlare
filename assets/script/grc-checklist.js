/* Turns each GRC/security domain page's "content to cover" bullet lists
   into a personal tracking checklist (checkbox + free-text comment per
   page, persisted in localStorage) instead of static prose, plus an
   export/reset toolkit for the whole GRC area. Three parts:

   - initGrcChecklist() runs on each domain detail page (grc/*.html,
     grc/securite/* /*.html) -- adds the checkboxes, a progress bar, and
     a comment box, and (when opened inside the hub's modal iframe)
     tells the hub every time something changes so its card/summary can
     update live.
   - renderGrcCoverage() / renderGrcDashboardCoverage() /
     renderGrcHeaderCoverage() run on hub pages and the dashboard --
     read localStorage for each linked domain to show % and a "has
     notes" mark, no network request involved.
   - collectGrcExportData() + exportGrcAsJson/Word/Pdf() + resetGrcData()
     -- gather every section's state straight from localStorage and
     hand it to the browser's own download/print mechanisms.

   Deliberately no fetch() anywhere in this file: this site is also
   opened directly as file:// (no local server), where Chrome blocks
   fetching sibling files outright. A page's checklist -- item text
   included, not just which are checked -- is instead read back from
   what initGrcChecklist() itself saved the first time that page was
   opened (see the storage format note below). A domain that's never
   been opened simply has no saved data yet, so it reads as empty/0%
   everywhere, including exports. That's a real limitation (an unopened
   domain looks identical to an opened-but-empty one, and can't be
   exported in detail), but it's the tradeoff for working the same way
   under file:// and a real server.

   Storage format, one entry per page keyed by its own resolved
   pathname: { items: [{ text, checked }, ...], comment: "..." }. Item
   TEXT is cached here (not just which are checked) specifically so the
   hub/dashboard/export can show real content without ever fetching
   another page -- the detail page is the only one that ever reads the
   live DOM; everyone else reads this cached copy.

   Storage key is derived from the page's own resolved pathname, so the
   detail page (reading its own location.pathname) and the hub (resolving
   each link the same way) always agree on the same key without either
   one needing to know about the other's identifier scheme. */

const GRC_CHECKLIST_PREFIX = "/grc/checklist";

function grcChecklistKeyFor(pathname) {
  return GRC_CHECKLIST_PREFIX + pathname;
}

/* Change-log support (TODOSecurityStandpoint.txt #2): a checked box or a
   comment is stamped with when it changed and a free-text "who" -- NOT a
   verified identity, there's no authentication in this app, just
   whatever's typed into Settings > Checklist GRC > "Ton nom". Honestly a
   local modification log, not a tamper-proof audit trail: anyone with
   access to this browser's localStorage can edit it directly. Still
   real, incremental value for a solo practitioner or a small team
   passing JSON exports around -- see the field on every item/comment
   below and grcLastModifiedInfo(). */
function grcAuthorName() {
  const saved = (localStorage.getItem("/settings.html/grcAuthor") || "").trim();
  if (saved) return saved;
  // Falls back to config/grc-author.js's default until Settings > "Ton
  // nom" is actually filled in -- same seed-vs-localStorage pattern as
  // config/reseau.js. Guarded since not every page that loads this
  // script also loads that config file (eg. project/dashboard.html,
  // which never calls initGrcChecklist() so never reaches this line
  // anyway, but the guard costs nothing and avoids a ReferenceError if
  // that ever changes).
  return typeof grcAuthorConfig !== "undefined" ? (grcAuthorConfig.defaultName || "").trim() : "";
}

function grcFormatTimestamp(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("fr-CA");
  } catch (e) {
    return "";
  }
}

// Works on both the live in-page `state` object and an exported domain
// object (collectGrcExportData()) -- both carry the same
// items[].checkedAt/checkedBy + commentAt/commentBy shape. ISO 8601
// timestamps sort correctly as plain strings, no Date parsing needed to
// compare them.
function grcLastModifiedInfo(state) {
  let at = null;
  let by = "";
  (state.items || []).forEach((it) => {
    if (it.checkedAt && (!at || it.checkedAt > at)) {
      at = it.checkedAt;
      by = it.checkedBy || "";
    }
  });
  if (state.commentAt && (!at || state.commentAt > at)) {
    at = state.commentAt;
    by = state.commentBy || "";
  }
  return { at, by };
}

function grcModifiedLabel(at, by) {
  return grcT("grc.common.modifiedBy")
    .replace("{by}", by || grcT("grc.common.modifiedByAnonymous"))
    .replace("{date}", grcFormatTimestamp(at));
}

// Settings > Checklist GRC > "Afficher les pourcentages". Runs immediately
// on every page that loads this script (hub or detail) rather than
// waiting to be called explicitly, since it just needs a body class in
// place before the progress bars/badges below get built. Only grc.css
// defines the ".grc-hide-percentage" rules, so this is a harmless no-op
// on pages that don't load it (eg. the dashboard, which reuses some of
// the same class names for its own unrelated coverage widgets).
(function applyGrcPercentageSetting() {
  const hide = localStorage.getItem("/settings.html/grcShowPercentage") === "false";
  document.body.classList.toggle("grc-hide-percentage", hide);
})();

/* Pairs each <li> with its saved state (spec/grc-restructure/ R0).

   Historically state was paired by POSITION only (savedItems[i] -> i-th
   <li>), so inserting/reordering an item silently shifted every checkbox
   after it. Saved text can't be used instead: it's whatever language the
   page was last opened in (FR/EN).

   - A page whose <li>s carry no data-item-id keeps the positional pairing
     (unchanged behavior -- every page not yet restructured).
   - A page with data-item-id pairs by id. Saved items from before ids
     existed (no `id`) are reached through the <li>'s data-legacy tokens:
     "N" = that item's former position on this same page, "<page>:N" =
     former position on another page merged into this one (the migration
     in grc-checklist-migrate.js stores those as id "legacy:<page>:N"),
     "@<relative url>#N" = former position N on ANOTHER page that still
     exists but lost that item (eg. grc/continuite.html's items moved to
     its grc/continuite/*.html sub-pages) -- read from that page's
     legacySnapshot (below), or from its saved items while it hasn't
     been reopened since the restructure.
     A new item has no token and starts unchecked -- it never inherits a
     neighbour's checkbox.

   legacySnapshot: the first time a page with ids loads pre-id state, the
   original items are kept under saved.legacySnapshot (never exported,
   never rewritten) so "@" tokens on other pages can still resolve after
   this page has re-saved its state with ids. */
function grcChecklistExternalLegacy(ref) {
  const hash = ref.lastIndexOf("#");
  if (hash <= 0) return null;
  const n = parseInt(ref.slice(hash + 1), 10);
  if (!Number.isInteger(n) || n < 0) return null;
  let other;
  try {
    other = JSON.parse(vaultGetItem(grcChecklistKeyFor(new URL(ref.slice(0, hash), location.href).pathname)) || "null");
  } catch (e) {
    return null;
  }
  if (!other) return null;
  let list = Array.isArray(other.legacySnapshot) ? other.legacySnapshot : null;
  if (!list && Array.isArray(other.items) && !other.items.some((it) => it && it.id)) list = other.items;
  return list && list[n] && typeof list[n] === "object" ? list[n] : null;
}

function grcChecklistMatchSaved(lis, savedItems) {
  const saved = Array.isArray(savedItems) ? savedItems : [];
  if (!lis.some((li) => li.dataset.itemId)) {
    return lis.map((li, i) => saved[i] || null);
  }
  const byId = {};
  const byLegacy = {};
  saved.forEach((it, k) => {
    if (!it || typeof it !== "object") return;
    if (typeof it.id !== "string" || !it.id) byLegacy[String(k)] = it;
    else if (it.id.indexOf("legacy:") === 0) byLegacy[it.id.slice(7)] = it;
    else byId[it.id] = it;
  });
  return lis.map((li) => {
    const id = li.dataset.itemId;
    if (id && byId[id]) return byId[id];
    const tokens = (li.dataset.legacy || "").split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      const hit = t.charAt(0) === "@" ? grcChecklistExternalLegacy(t.slice(1)) : byLegacy[t];
      if (hit) return hit;
    }
    return null;
  });
}

function initGrcChecklist() {
  const items = Array.from(document.querySelectorAll(".content-block ul li"));
  if (items.length === 0) return;

  // The "content to cover" list itself stays visible underneath (that
  // text is static, baked into the page) -- only the checked/note
  // *state* is encrypted, so an unlock right here on this page (see
  // vault-ui.js) is all it takes to get it back; unlocking elsewhere
  // wouldn't help, the derived key never leaves this tab.
  let gate = document.querySelector(".grc-vault-gate");
  if (!gate) {
    gate = document.createElement("div");
    gate.className = "grc-vault-gate";
    document.querySelector(".content-block").parentElement.insertBefore(gate, document.querySelector(".content-block"));
  }
  if (vaultGateOr(gate, initGrcChecklist)) return;
  gate.remove();
  if (typeof grcChecklistMigrate === "function") grcChecklistMigrate();

  const key = grcChecklistKeyFor(location.pathname);
  let saved;
  try {
    saved = JSON.parse(vaultGetItem(key) || "null");
  } catch (e) {
    saved = null;
  }
  const savedItems = saved && Array.isArray(saved.items) ? saved.items : null;
  const matched = grcChecklistMatchSaved(items, savedItems);
  const state = {
    items: items.map((li, i) => {
      const prev = matched[i];
      const out = {
        text: li.textContent.trim(),
        checked: !!(prev && prev.checked),
        checkedAt: (prev && prev.checkedAt) || null,
        checkedBy: (prev && prev.checkedBy) || "",
      };
      if (li.dataset.itemId) out.id = li.dataset.itemId;
      return out;
    }),
    comment: saved && typeof saved.comment === "string" ? saved.comment : "",
    commentAt: (saved && saved.commentAt) || null,
    commentBy: (saved && saved.commentBy) || "",
  };
  if (saved && Array.isArray(saved.legacySnapshot)) {
    state.legacySnapshot = saved.legacySnapshot;
  } else if (savedItems && items.some((li) => li.dataset.itemId) && savedItems.some((it) => it && !it.id)) {
    state.legacySnapshot = savedItems;
  }

  const bar = document.createElement("div");
  bar.className = "grc-progress";
  bar.innerHTML =
    '<div class="grc-progress-track"><div class="grc-progress-fill"></div></div>' +
    '<span class="grc-progress-label"></span>';
  const lastMod = document.createElement("div");
  lastMod.className = "grc-last-modified";
  const firstBlock = document.querySelector(".content-block");
  firstBlock.parentElement.insertBefore(bar, firstBlock);
  firstBlock.parentElement.insertBefore(lastMod, firstBlock);

  const fill = bar.querySelector(".grc-progress-fill");
  const label = bar.querySelector(".grc-progress-label");
  const embedded = window.self !== window.top;

  function persist() {
    vaultSetItem(key, JSON.stringify(state));
    const done = state.items.filter((it) => it.checked).length;
    const pct = Math.round((done / state.items.length) * 100);
    fill.style.width = pct + "%";
    label.textContent = done + " / " + state.items.length + " — " + pct + "%";
    bar.classList.toggle("complete", pct === 100);

    const info = grcLastModifiedInfo(state);
    lastMod.textContent = info.at
      ? (info.by
          ? grcT("grc.common.lastModifiedBy").replace("{date}", grcFormatTimestamp(info.at)).replace("{by}", info.by)
          : grcT("grc.common.lastModifiedAnonymous").replace("{date}", grcFormatTimestamp(info.at)))
      : "";
    lastMod.style.display = info.at ? "" : "none";

    // Let the hub (grc/index.html or a grc/securite/* index) know this
    // page's checklist changed, so it can refresh this card's badge and
    // the section's overall % without waiting for a full reload. Must be
    // window.parent, not window.top -- when opened through the real site
    // (index.html > #frame > grc/index.html > modal iframe > this page),
    // window.top is index.html itself, not the hub; the hub is always
    // this page's immediate parent, same convention as the existing
    // hub-frame-height message below.
    if (embedded) {
      window.parent.postMessage({ type: "grc-checklist-change", path: location.pathname }, "*");
    }
  }

  items.forEach((li, i) => {
    li.classList.add("grc-checklist-item");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "grc-item-checkbox";
    cb.checked = state.items[i].checked;
    if (state.items[i].checked) li.classList.add("checked");
    if (state.items[i].checkedAt) {
      li.title = grcModifiedLabel(state.items[i].checkedAt, state.items[i].checkedBy);
    }
    cb.addEventListener("change", () => {
      state.items[i].checked = cb.checked;
      state.items[i].checkedAt = new Date().toISOString();
      state.items[i].checkedBy = grcAuthorName();
      li.classList.toggle("checked", cb.checked);
      li.title = grcModifiedLabel(state.items[i].checkedAt, state.items[i].checkedBy);
      persist();
    });
    li.prepend(cb);
  });

  // Free-text notes, saved alongside the checklist. Lives at the end of
  // the last .content-block on the page so it reads as "your notes on
  // this domain" rather than interrupting the "content to cover" list.
  const blocks = document.querySelectorAll(".content-block");
  const lastBlock = blocks[blocks.length - 1];
  const commentWrap = document.createElement("div");
  commentWrap.className = "grc-comment";
  commentWrap.innerHTML =
    '<h2 class="grc-comment-label">' + grcT("grc.common.notesTitle") + '</h2>' +
    '<textarea class="grc-comment-box" placeholder="' + grcT("grc.common.notesPlaceholder") + '" rows="4"></textarea>';
  lastBlock.appendChild(commentWrap);

  const textarea = commentWrap.querySelector(".grc-comment-box");
  textarea.value = state.comment;
  textarea.addEventListener("input", () => {
    state.comment = textarea.value;
    state.commentAt = new Date().toISOString();
    state.commentBy = grcAuthorName();
    persist();
  });

  persist();
}

function grcCoverageStatus(pct) {
  if (pct >= 100) return "complete";
  if (pct > 0) return "partial";
  return "empty";
}

/* Reads one domain page's saved checklist straight from localStorage --
   no network request, so it works identically under file:// and a real
   server. resolvedPath must already be the page's absolute pathname
   (see readDomainCoverageFromLink() below for the common case of
   resolving a relative link first). */
function readDomainCoverage(resolvedPath) {
  const key = grcChecklistKeyFor(resolvedPath);
  let saved;
  try {
    saved = JSON.parse(vaultGetItem(key) || "null");
  } catch (e) {
    saved = null;
  }
  const items = saved && Array.isArray(saved.items) ? saved.items : [];
  const comment = saved && typeof saved.comment === "string" ? saved.comment : "";
  return {
    total: items.length,
    done: items.filter((it) => it.checked).length,
    comment: comment,
    commentAt: (saved && saved.commentAt) || null,
    commentBy: (saved && saved.commentBy) || "",
    items: items,
    visited: !!saved,
  };
}

/* link: a domain's bare filename (as used in the hub configs), resolved
   against this document's own location -- or, from the dashboard, against
   basePath + link (pass the already-joined relative URL as `link`). */
function readDomainCoverageFromLink(link) {
  const resolvedPath = new URL(link, location.href).pathname;
  return readDomainCoverage(resolvedPath);
}

/* Sub-pages of a domain (spec/grc-restructure/ C1) -- eg. grc/continuite.html
   and its grc/continuite/*.html. A child config registers itself on
   window.GRC_DOMAIN_CHILDREN[<parent link>] = { path, domains } (see
   grc/continuite/index.js); pages that don't load it simply see no
   children, same as before. Children count toward their parent's card
   and are exported / reset / imported as domains of the same section,
   their link made relative to the section ("continuite/bia.html"). */
function grcDomainChildren(domain) {
  const reg = typeof window !== "undefined" && window.GRC_DOMAIN_CHILDREN;
  const entry = reg && domain && reg[domain.link];
  if (!entry || !Array.isArray(entry.domains)) return [];
  return entry.domains
    .filter((c) => c.enabled !== false)
    .map((c) => Object.assign({}, c, { link: entry.path + c.link, parentLink: domain.link }));
}

function grcExpandDomains(domains) {
  const out = [];
  domains.filter((d) => d.enabled !== false).forEach((d) => {
    out.push(d);
    grcDomainChildren(d).forEach((c) => out.push(c));
  });
  return out;
}

/* domains: the same array passed to renderGrcDomains(). gridSelector must
   be the same grid renderGrcDomains() rendered into -- this reads the
   cards it already built (matched via data-link) rather than building
   its own. summarySelector, if given, gets one overall coverage line.
   The % badge sits inside each card, top-right (see .grc-coverage-badge
   in grc.css) -- .card-link is position:relative so it doesn't collide
   with the icon/title, which are top-left. A small note mark joins it
   when that domain has a saved comment.

   Listens for grc-checklist-change messages from the modal iframe (see
   initGrcChecklist() above) and refreshes just the affected card plus
   the overall summary, so ticking a box updates this page live instead
   of only after the next reload. */
function renderGrcCoverage(domains, gridSelector, summarySelector) {
  if (typeof grcChecklistMigrate === "function") grcChecklistMigrate();
  const grid = document.querySelector(gridSelector);
  if (!grid) return;

  const enabled = domains.filter((d) => d.enabled !== false);
  const results = {}; // domain.link -> { total, done }
  const badges = {}; // domain.link -> badge element
  const notes = {}; // domain.link -> note-mark element

  function updateSummary() {
    if (!summarySelector) return;
    const summary = document.querySelector(summarySelector);
    if (!summary) return;
    const vals = Object.values(results);
    const totalItems = vals.reduce((sum, r) => sum + r.total, 0);
    const totalDone = vals.reduce((sum, r) => sum + r.done, 0);
    const globalPct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;
    if (!summary.firstChild) {
      summary.innerHTML =
        '<div class="grc-progress-track"><div class="grc-progress-fill"></div></div>' +
        '<span class="grc-progress-label"></span>';
    }
    summary.querySelector(".grc-progress-fill").style.width = globalPct + "%";
    summary.querySelector(".grc-progress-label").textContent =
      totalDone + " / " + totalItems + " points couverts — " + globalPct + "%";
  }

  function loadDomain(domain) {
    let { total, done, comment } = readDomainCoverageFromLink(domain.link);
    grcDomainChildren(domain).forEach((c) => {
      const cov = readDomainCoverageFromLink(c.link);
      total += cov.total;
      done += cov.done;
      if (!(comment && comment.trim())) comment = cov.comment;
    });
    results[domain.link] = { total, done };
    const badge = badges[domain.link];
    if (badge) {
      if (total > 0) {
        const pct = Math.round((done / total) * 100);
        badge.className = "grc-coverage-badge " + grcCoverageStatus(pct);
        badge.textContent = pct + "%";
        badge.title = grcT("grc.common.checkedCount").replace("{done}", done).replace("{total}", total);
      } else {
        badge.className = "grc-coverage-badge empty";
        badge.textContent = "0%";
        badge.title = grcT("grc.common.notVisited");
      }
    }
    const note = notes[domain.link];
    if (note) note.style.display = comment && comment.trim() ? "" : "none";
    updateSummary();
  }

  enabled.forEach((domain) => {
    const card = grid.querySelector('[data-link="' + domain.link + '"]');
    if (!card) return;

    const badge = document.createElement("div");
    badge.className = "grc-coverage-badge empty";
    badge.textContent = "0%";
    card.appendChild(badge);
    badges[domain.link] = badge;

    const note = document.createElement("div");
    note.className = "grc-note-mark";
    note.textContent = "✎"; // pencil
    note.title = grcT("grc.common.hasNotes");
    note.style.display = "none";
    card.appendChild(note);
    notes[domain.link] = note;

    loadDomain(domain);
  });

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "grc-checklist-change") return;
    const domain = enabled.find((d) =>
      [d].concat(grcDomainChildren(d)).some((x) => new URL(x.link, location.href).pathname === e.data.path));
    if (domain) loadDomain(domain);
  });
}

/* Dashboard panel: one row per GRC section (the main GRC hub plus the 4
   security sub-hubs), each showing that section's own global % --
   i.e. the same figure renderGrcCoverage()'s summary bar shows on the
   hub itself, just all 5 gathered in one place.

   sections: [{ title, domains, basePath }], where basePath is the path
   from THIS page (the dashboard) to the section's own directory (eg.
   "../grc/", "../grc/securite/api/") -- domain.link is only ever a bare
   filename relative to its own hub, so the dashboard has to supply that
   prefix itself to resolve the same URL the hub would. */
function renderGrcDashboardCoverage(sections, containerSelector) {
  if (typeof grcChecklistMigrate === "function") grcChecklistMigrate();
  const container = document.querySelector(containerSelector);
  if (!container) return;
  container.innerHTML = "";

  sections.forEach((section) => {
    const row = document.createElement("div");
    row.className = "grc-dash-row";
    row.innerHTML =
      '<span class="grc-dash-row-label">' + section.title + "</span>" +
      '<div class="grc-progress-track"><div class="grc-progress-fill"></div></div>' +
      '<span class="grc-progress-label">0%</span>';
    container.appendChild(row);

    const enabled = grcExpandDomains(section.domains);
    let totalItems = 0;
    let totalDone = 0;
    enabled.forEach((d) => {
      const { total, done } = readDomainCoverageFromLink(section.basePath + d.link);
      totalItems += total;
      totalDone += done;
    });
    const pct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;
    row.querySelector(".grc-progress-fill").style.width = pct + "%";
    row.querySelector(".grc-progress-label").textContent =
      totalDone + " / " + totalItems + " — " + pct + "%";
  });
}

/* Single aggregate figure across every section combined (same `sections`
   shape as renderGrcDashboardCoverage() above) -- for the compact header
   widget next to the Nodes status box, where there's only room for one
   number rather than a row per section. */
function renderGrcHeaderCoverage(sections, fillSelector, countSelector) {
  const fill = document.querySelector(fillSelector);
  const count = document.querySelector(countSelector);
  if (!fill || !count) return;

  let totalItems = 0;
  let totalDone = 0;
  sections.forEach((section) => {
    grcExpandDomains(section.domains)
      .forEach((d) => {
        const { total, done } = readDomainCoverageFromLink(section.basePath + d.link);
        totalItems += total;
        totalDone += done;
      });
  });

  const pct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;
  fill.style.width = pct + "%";
  count.textContent = totalDone + " / " + totalItems + " — " + pct + "%";
}

/* ============================================================
   EXPORT / RESET -- gathers every section's saved state straight from
   localStorage (see readDomainCoverageFromLink() above) into one plain
   object, then hands it to the browser's own download/print mechanisms.
   No third-party libraries: JSON is a Blob download, Word is an HTML
   payload Word already knows how to open as a .doc, PDF is a printable
   HTML page handed to window.print() so the browser's own "Save as PDF"
   does the real work.
   ============================================================ */

/* Shared guard for the GRC export entry points below (and mirrored
   inline at the top of importGrcData). When the vault is set up but this
   tab hasn't unlocked it, reading a protected key returns null and
   writing one throws -- so without this an export silently produces a
   syntactically-valid but EMPTY file (PlanDeTestSecurite 0.2), and an
   import wipes existing data via resetGrcData() then throws uncaught on
   the first restore write, with no onDone/onError ever firing (0.1 --
   silent data loss). The hub's toolbar (grc/index.html) never gated
   these the way Settings gates its Config Network/Topology cards.
   resetGrcData() is deliberately NOT guarded (see 2.6). Returns true
   when the caller must stop; a no-op (false) whenever the feature is
   off or not yet set up. */
function grcVaultBlocks() {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    alert(grcT("grc.common.vaultLockedExport"));
    return true;
  }
  return false;
}

function collectGrcExportData(sections) {
  return sections.map((section) => ({
    title: section.title,
    domains: grcExpandDomains(section.domains)
      .map((d) => {
        const url = section.basePath + d.link;
        const cov = readDomainCoverageFromLink(url);
        // Same lookup grc-loader.js's cards use (grcLoaderText(), defined
        // there -- this function only ever runs from pages that also load
        // grc-loader.js): falls back to the raw config text untranslated
        // when no dict entry exists yet, exactly like the on-screen cards.
        // "continuite/bia.html" -> "continuite.bia" (sub-page keys).
        const slug = d.link.replace(/\.html$/, "").replace(/\//g, ".");
        const prefix = section.keyPrefix || "grc";
        const title = typeof grcLoaderText === "function"
          ? grcLoaderText(prefix + "." + slug + ".hubCard.title", d.title)
          : d.title;
        const description = typeof grcLoaderText === "function"
          ? grcLoaderText(prefix + "." + slug + ".hubCard.desc", d.description || "")
          : (d.description || "");
        return {
          title,
          description,
          // Resolved absolute pathname (eg. "/grc/actifs.html"), same as
          // grcChecklistKeyFor() uses as its storage key -- importGrcData()
          // needs this to write each domain's data back to the right key
          // regardless of which page the import happens on.
          path: new URL(url, location.href).pathname,
          visited: cov.visited,
          items: cov.items,
          comment: cov.comment,
          commentAt: cov.commentAt,
          commentBy: cov.commentBy,
        };
      }),
  }));
}

/* ------------------------------------------------------------------ *
 *  Sauvegarde GRC complète (2026-09-29)                              *
 *                                                                    *
 *  L'export/import du hub ne portait QUE sur la checklist (cases +   *
 *  commentaires), jamais sur les registres (Actifs, Risques,         *
 *  Incidents, Fournisseurs, Vulnérabilités, Contrôles, Conformité,   *
 *  Continuité, Indicateurs, Documents, Vie privée, Plans de          *
 *  traitement, Revues d'accès, Pentest) ni sur les fiches / SoA /    *
 *  chaîne / RPRP. Résultat : "j'exporte depuis le hub, je réimporte, *
 *  mes données de registres ne reviennent pas" -- elles n'étaient    *
 *  jamais dans le fichier. Le seul export complet vivait dans        *
 *  Réglages > "Exporter toute la configuration".                     *
 *                                                                    *
 *  On lit/écrit les registres par leur CLÉ localStorage directement  *
 *  (grcCollectDataBundle / grcIsBackupDataKey) plutôt que via les    *
 *  getters/setters grc-assets.js & co : ces modules ne sont PAS      *
 *  chargés sur grc/index.html. Même approche que la sauvegarde       *
 *  "toute la configuration" des Réglages, qui restaure elle aussi    *
 *  la checklist et les fiches par clé.                               *
 * ------------------------------------------------------------------ */

/* true si `k` est une clé de données GRC à embarquer dans une
   sauvegarde complète -- tout ce qui vit sous /grc/ SAUF la checklist
   (elle a son propre mécanisme scopé par section), plus le registre
   pentest et les clés GRC rangées sous /settings.html/ (nom du
   change-log, responsable de la protection des renseignements). Sert
   AUSSI de liste blanche à l'import : un fichier importé ne peut donc
   écrire que ces clés, jamais une clé localStorage arbitraire (même
   garde que le bloc grcChecklist/grcFiches de inline/settings.js). */
function grcIsBackupDataKey(k) {
  if (typeof k !== "string") return false;
  if (k.indexOf(GRC_CHECKLIST_PREFIX) === 0) return false; // géré par la checklist
  return (
    k.indexOf("/grc/") === 0 ||
    k === "/pentest/engagements" ||
    k.indexOf("/settings.html/grc") === 0 ||
    k.indexOf("/settings.html/rprp") === 0
  );
}

/* { "<clé>": "<JSON brut>" } pour toute clé grcIsBackupDataKey() qui a
   une valeur. Les clés absentes/vides sont omises : à l'import une clé
   absente = "on laisse tel quel", jamais "on efface" (même contrat que
   l'import "toute la configuration"). */
function grcCollectDataBundle() {
  const bundle = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!grcIsBackupDataKey(k)) continue;
    const v = vaultGetItem(k);
    if (typeof v === "string") bundle[k] = v;
  }
  return bundle;
}

/* Charge utile d'un export JSON du hub. En mode complet (opts.full,
   càd le hub GRC principal), on enveloppe la checklist AVEC les
   registres dans un objet ; sinon on garde le tableau nu historique
   (sous-hubs de sécurité, et compatibilité des anciens fichiers à la
   relecture -- importGrcData() accepte toujours les deux formes). */
function grcBuildExportPayload(sections, opts) {
  const checklist = collectGrcExportData(sections);
  if (opts && opts.full) {
    return { grcFullBackup: 1, checklist: checklist, data: grcCollectDataBundle() };
  }
  return checklist;
}

/* Every domain that has ANY saved checklist state, as {url, path} --
   url is section.basePath + link (what an iframe src= or new URL(link,
   location.href) expects), path is the already-resolved absolute
   pathname used as the vaultGetItem() cache key. Domains never opened
   have nothing to refresh (they'd still read as unvisited either way). */
function grcCollectRefreshTargets(sections) {
  const targets = [];
  const seen = Object.create(null);
  sections.forEach((section) => {
    grcExpandDomains(section.domains)
      .forEach((d) => {
        // La checklist vit sous la clé de `d.link` ; mais certains enfants
        // n'ont plus de page propre (ex. plans de continuité : stubs de
        // redirection) et déclarent `refreshVia` -> on charge CETTE page-là
        // (qui re-persiste leur état), pas le stub. spec/grc-continuity-plans-register/.
        const path = new URL(section.basePath + d.link, location.href).pathname;
        if (!vaultGetItem(grcChecklistKeyFor(path))) return;
        const url = section.basePath + (d.refreshVia || d.link);
        if (seen[url]) return;
        seen[url] = 1;
        targets.push({ url, path });
      });
  });
  return targets;
}

/* Bug fixed 2026-09-08: switching the site language and immediately
   exporting the full GRC report showed checklist items still in
   whatever language each domain page had last actually been opened in
   -- collectGrcExportData() only ever READS the cache (see its own
   comment), it never re-derives the item text itself, and
   initGrcChecklist() (the only thing that re-reads a domain's own DOM
   and re-persists) only runs when that specific page loads.

   Fix: before building the export, re-visit every domain that has saved
   state in a hidden, off-screen iframe -- same "load a sibling page in
   an iframe" trick already used by the hub's own openModal() (works
   under file://, where fetch() doesn't -- see this file's header
   comment). Each domain's initGrcChecklist() runs synchronously inline
   on load, re-reading its own (now correctly-translated) DOM text and
   re-persisting it, before that iframe's load event fires -- so by the
   time onDone() runs, every visited domain's cache matches the
   CURRENTLY selected language. One iframe reused sequentially rather
   than dozens in parallel: simpler, and each page's script must finish
   before its own persist() runs anyway, so parallel loading wouldn't
   actually save wall-clock time here. */
function grcRefreshDomainCaches(targets, onDone) {
  if (targets.length === 0) {
    onDone();
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;";
  document.body.appendChild(iframe);

  let i = 0;
  iframe.onload = () => {
    i++;
    if (i >= targets.length) {
      iframe.remove();
      onDone();
    } else {
      iframe.src = targets[i].url;
    }
  };
  iframe.src = targets[0].url;
}

function grcExportFilename(ext, prefix) {
  const date = new Date().toISOString().slice(0, 10);
  return (prefix || "grc-export") + "-" + date + "." + ext;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportGrcAsJson(sections, filenamePrefix, opts) {
  if (grcVaultBlocks()) return;
  const data = await vaultMaybeEncryptForExport(grcBuildExportPayload(sections, opts));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, grcExportFilename("json", filenamePrefix));
}

function grcSanitizeFilename(name) {
  // Strip path separators (no picking a different folder this way,
  // only a name) and anything else that'd choke a filesystem.
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "").trim();
  return cleaned || grcExportFilename("json");
}

/* "Enregistrer sous..." -- lets you pick the file NAME either way; where
   it lands depends on what the browser supports:
   - Chrome/Edge (File System Access API present): a real OS Save dialog,
     you also pick the folder.
   - Everywhere else (Firefox, Safari, or Chrome with the API disabled by
     policy -- showSaveFilePicker is far from universal): prompt() for a
     name, then a normal download using that name. The browser still
     decides the folder (its own download location, or its own "ask
     every time" setting if you've turned that on) -- a page can't pick
     a folder on its own without that API, there's no way around that
     part outside of it.
   Only wired up for JSON -- that's the round-trippable format (see
   importGrcData()), the one worth actually naming/placing yourself. */
async function saveGrcAsJson(sections, filenamePrefix, opts) {
  if (grcVaultBlocks()) return;
  const data = await vaultMaybeEncryptForExport(grcBuildExportPayload(sections, opts));
  const json = JSON.stringify(data, null, 2);
  const defaultName = grcExportFilename("json", filenamePrefix);

  if (window.showSaveFilePicker) {
    window
      .showSaveFilePicker({
        suggestedName: defaultName,
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      })
      .then((handle) => handle.createWritable())
      .then((writable) => writable.write(json).then(() => writable.close()))
      .catch((err) => {
        if (err && err.name === "AbortError") return; // user cancelled the picker
        // Picker exists but failed for some other reason -- still let
        // them name it rather than silently giving up.
        const chosen = prompt(grcT("grc.common.filenamePrompt"), defaultName);
        if (chosen === null) return;
        triggerDownload(new Blob([json], { type: "application/json" }), grcSanitizeFilename(chosen));
      });
    return;
  }

  const chosen = prompt(grcT("grc.common.filenamePrompt"), defaultName);
  if (chosen === null) return; // cancelled
  triggerDownload(new Blob([json], { type: "application/json" }), grcSanitizeFilename(chosen));
}

function grcEscapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Shared by the Word and PDF exports -- a self-contained HTML report,
   just styled differently by the caller (Word needs its own namespaced
   wrapper, PDF just prints the body as-is). */
function grcExportReportBody(sections) {
  const data = collectGrcExportData(sections);
  const generated = new Date().toLocaleString("fr-CA");
  let html = "<h1>" + grcT("grc.common.fullReportTitle") + "</h1><p>" + grcT("grc.common.generatedOn") + " " + grcEscapeHtml(generated) + "</p>";

  data.forEach((section) => {
    html += "<h2>" + grcEscapeHtml(section.title) + "</h2>";
    section.domains.forEach((domain) => {
      const total = domain.items.length;
      const done = domain.items.filter((it) => it.checked).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      html += "<h3>" + grcEscapeHtml(domain.title) + "</h3>";
      if (domain.description) {
        html += "<p><em>" + grcEscapeHtml(domain.description) + "</em></p>";
      }
      if (!domain.visited) {
        html += "<p>" + grcT("grc.common.notVisitedSentence") + "</p>";
      } else {
        const modInfo = grcLastModifiedInfo(domain);
        html += "<p>" + grcT("grc.common.coverage").replace("{done}", done).replace("{total}", total).replace("{pct}", pct) + "</p>";
        if (modInfo.at) {
          html += "<p><em>" + grcEscapeHtml(grcModifiedLabel(modInfo.at, modInfo.by)) + "</em></p>";
        }
        html += "<ul>";
        domain.items.forEach((it) => {
          html += "<li>" + (it.checked ? "☑" : "☐") + " " + grcEscapeHtml(it.text) + "</li>";
        });
        html += "</ul>";
        if (domain.comment && domain.comment.trim()) {
          html += "<p><strong>" + grcT("grc.common.notesLabel") + "</strong><br>" + grcEscapeHtml(domain.comment).replace(/\n/g, "<br>") + "</p>";
        }
      }
    });
  });

  // Documentation par élément de chaque page (grc-fiches.js) : jointe au
  // rapport complet du hub (chaque page garde aussi ses propres exports).
  if (typeof grcFicheAllDocumentsBody === "function") html += grcFicheAllDocumentsBody();
  return html;
}

function exportGrcAsWord(sections, filenamePrefix) {
  if (grcVaultBlocks()) return;
  grcRefreshDomainCaches(grcCollectRefreshTargets(sections), () => {
    const body = grcExportReportBody(sections);
    const html =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>" + grcT("grc.common.fullReportTitle") + "</title></head>" +
      "<body style='font-family:Calibri,Arial,sans-serif;'>" + body + "</body></html>";
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    triggerDownload(blob, grcExportFilename("doc", filenamePrefix));
  });
}

function exportGrcAsPdf(sections) {
  if (grcVaultBlocks()) return;
  // window.open() must fire synchronously in this click handler, before
  // any async refresh work below -- otherwise the browser no longer sees
  // it as a direct result of the user's gesture and blocks it as a
  // pop-up. The refresh writes into this already-open, still-blank tab
  // once it's done instead.
  const win = window.open("", "_blank");
  if (!win) {
    alert(grcT("grc.common.popupBlocked"));
    return;
  }
  grcRefreshDomainCaches(grcCollectRefreshTargets(sections), () => {
    const body = grcExportReportBody(sections);
    const html =
      "<!doctype html><html><head><meta charset='utf-8'><title>" + grcT("grc.common.fullReportTitle") + "</title><style>" +
      "body{font-family:system-ui,Arial,sans-serif;color:#111;max-width:800px;margin:2rem auto;line-height:1.5;}" +
      "h1{margin-bottom:0;}h2{border-bottom:2px solid #333;margin-top:2rem;}h3{margin-bottom:0.2rem;}" +
      "ul{margin-top:0.3rem;}li{margin-bottom:0.15rem;}" +
      "@media print{body{margin:0;}}" +
      "</style></head><body>" + body +
      "<script>window.onload=()=>setTimeout(()=>window.print(),200);</script>" +
      "</body></html>";
    win.document.open();
    win.document.write(html);
    win.document.close();
  });
}

/* Wipes saved checklist/comment data back to the exact state defined by
   the config files (nothing checked, no notes) -- ie. what a domain
   looks like the first time it's ever opened.

   Two modes, chosen by whether `sections` is given:
   - `sections` omitted/null: wipe EVERY "/grc/checklist..." key in
     localStorage, site-wide, no config needed -- the original behavior,
     still used by Settings' centralized "reset everything" buttons
     (project/settings.html), which don't have any GRC config loaded and
     deliberately want "truly everything, including orphaned entries for
     domains since renamed/removed from a config" -- not just what's
     currently declared.
   - `sections` given: scoped -- only wipes domains actually IN those
     sections, deriving each one's exact storage key the same way
     collectGrcExportData()/grcCollectRefreshTargets() do (basePath +
     link, resolved to an absolute pathname).

   Bug fixed 2026-09-08: before this two-mode split, `sections` was
   accepted but silently ignored -- always wipe-everything, regardless of
   what was passed in. Harmless while the only sections-aware caller (the
   main GRC hub's "Réinitialiser") always passed every section anyway,
   but the moment a per-section hub (grc/securite/<x>/index.html) wired
   its own scoped "Réinitialiser" button, that button would have silently
   wiped every OTHER section's data too. */
function resetGrcData(sections, onDone) {
  // NOT gated on the vault: vaultRemoveItem() doesn't need an unlock, and
  // clearing a registry you can't currently see back to its defaults is
  // an allowed operation (PlanDeTestSecurite 2.6) -- the caller's own
  // confirm() is the safeguard. Only import (wipe-then-fail, 0.1) and
  // export (silent-empty, 0.2) are actually broken while locked.
  if (!sections) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(GRC_CHECKLIST_PREFIX) === 0) keys.push(k);
    }
    keys.forEach((k) => vaultRemoveItem(k));
    if (typeof onDone === "function") onDone(keys.length);
    return;
  }

  const keys = [];
  sections.forEach((section) => {
    grcExpandDomains(section.domains)
      .forEach((d) => {
        const url = section.basePath + d.link;
        const path = new URL(url, location.href).pathname;
        keys.push(grcChecklistKeyFor(path));
      });
  });
  keys.forEach((k) => vaultRemoveItem(k));
  if (typeof onDone === "function") onDone(keys.length);
}

/* Restores checklist + comment state from a previously exported JSON
   file (see exportGrcAsJson() -- Word/PDF don't round-trip, they're
   read-only reports). Full replace, not a merge: existing GRC data is
   wiped first so the site ends up exactly matching the file, same as a
   restore-from-backup would. `file` is a File from an <input
   type="file">; reading a locally-picked file this way is unrelated to
   the fetch()-under-file:// restriction elsewhere in this file -- it
   never touches the network, so it works the same everywhere.

   `sections` scopes BOTH the reset-first step and the restore itself
   (see resetGrcData()'s 2026-09-08 fix) -- an import triggered from a
   per-section hub can only wipe/write domains within that section, even
   if the picked file happens to contain a full site export (eg.
   importing an "everything" backup from a scoped page). Pass
   grcAllSections for a real full-site restore. */
function importGrcData(file, sections, onDone, onError, opts) {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    // Stop before touching anything -- resetGrcData() below would wipe
    // first and the restore writes would then throw (PlanDeTestSecurite
    // 0.1). Surface it through onError like every other import failure.
    if (onError) onError(grcT("grc.common.vaultLockedImport"));
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => {
    if (onError) onError(grcT("grc.common.cannotReadFile"));
  };
  reader.onload = async () => {
    let raw;
    try {
      raw = JSON.parse(reader.result);
    } catch (e) {
      if (onError) onError(grcT("grc.common.notValidJson"));
      return;
    }
    let payload;
    try {
      payload = await vaultMaybeDecryptImport(raw);
    } catch (e) {
      if (onError) onError(e.message || grcT("grc.common.cannotDecrypt"));
      return;
    }

    // Deux formes acceptées :
    //  - un tableau nu = ancien export checklist seule (reste lisible).
    //  - { checklist:[...], data:{clé:JSON} } = sauvegarde GRC complète
    //    (registres inclus), produite par le hub principal depuis
    //    2026-09-29 (grcBuildExportPayload).
    let data;
    let dataBundle = null;
    if (Array.isArray(payload)) {
      data = payload;
    } else if (payload && typeof payload === "object" && Array.isArray(payload.checklist)) {
      data = payload.checklist;
      // Les registres ne sont restaurés qu'en import PLEINE PORTÉE (le
      // hub GRC principal passe opts.full) : un sous-hub de sécurité
      // reste scopé à sa seule section même si le fichier contient tout,
      // exactement comme la checklist ci-dessous (garde de portée 2026-09-08).
      if (opts && opts.full && payload.data && typeof payload.data === "object") {
        dataBundle = payload.data;
      }
    } else {
      if (onError) onError(grcT("grc.common.unexpectedFormat"));
      return;
    }

    const allowedPaths = new Set();
    sections.forEach((section) => {
      grcExpandDomains(section.domains)
        .forEach((d) => {
          const url = section.basePath + d.link;
          allowedPaths.add(new URL(url, location.href).pathname);
        });
    });

    let restored = 0;
    let restoredData = 0;
    resetGrcData(sections, () => {
      // Registres + fiches + SoA + chaîne + RPRP d'une sauvegarde complète
      // D'ABORD et ISOLÉMENT : c'est la donnée la plus précieuse ; elle ne doit
      // jamais être sautée si la restauration de la checklist ou une migration
      // lève une exception (d'où le try/catch séparé, par clé). Réécrits par
      // clé (les modules grc-assets.js & co ne sont pas chargés sur le hub --
      // on écrit le JSON brut, comme l'import "toute la configuration" des
      // Réglages). resetGrcData() n'a effacé que les clés de checklist, donc
      // une clé absente du fichier reste telle quelle plutôt que d'être vidée.
      if (dataBundle) {
        Object.keys(dataBundle).forEach((k) => {
          try {
            if (grcIsBackupDataKey(k) && typeof dataBundle[k] === "string") {
              vaultSetItem(k, dataBundle[k]);
              restoredData++;
            }
          } catch (e) { console.error("GRC import : clé de données non restaurée", k, e); }
        });
      }

      // Checklist (cases + commentaires) ENSUITE, tolérante aux erreurs : un
      // échec de remap/migration ne doit ni perdre les registres ci-dessus ni
      // empêcher le rechargement.
      try {
        // Two passes: merged-in domains (GRC_CHECKLIST_MOVES mergeTag) last,
        // so the plain write of their target page can't overwrite what they added.
        [false, true].forEach((mergePass) => data.forEach((section) => {
          if (!section || !Array.isArray(section.domains)) return;
          section.domains.forEach((domain) => {
            if (!domain || !domain.path || !Array.isArray(domain.items)) return;
            if (!domain.visited) return; // never-reviewed domains have nothing to restore
            // Backups taken before spec/grc-restructure/ or spec/grc-hub-iso/
            // carry the old paths (pages moved to Sécurité opérationnelle).
            const remap = typeof grcChecklistRemapPath === "function" ? grcChecklistRemapPath(domain.path) : null;
            if (!!(remap && remap.mergeTag) !== mergePass) return;
            const path = remap ? remap.path : domain.path;
            if (!allowedPaths.has(path)) return; // out of scope for this import
            const key = grcChecklistKeyFor(path);
            let state = {
              items: domain.items,
              comment: domain.comment || "",
              commentAt: domain.commentAt || null,
              commentBy: domain.commentBy || "",
            };
            if (remap && remap.mergeTag) {
              let current = null;
              try { current = JSON.parse(vaultGetItem(key) || "null"); } catch (e) { current = null; }
              state = grcChecklistMergeState(current, state, remap.mergeTag);
            }
            vaultSetItem(key, JSON.stringify(state));
            restored++;
          });
        }));
        // Backups taken while vie-privee.html was merged into conformite.html
        // (2026-09-22 → 09-23): give its items back to their own page.
        if (typeof grcChecklistMigrate === "function") grcChecklistMigrate();
      } catch (e) { console.error("GRC import : restauration checklist partielle", e); }
    });

    // resetGrcData() a exécuté son callback de façon SYNCHRONE ci-dessus (tous
    // les vaultSetItem sont partis). Avec un coffre actif, la persistance du
    // chiffré est ASYNCHRONE : on l'attend AVANT que onDone ne déclenche
    // location.reload(), sinon le reload interrompt le chiffrement et les
    // registres/fiches ne sont jamais écrits dans localStorage (bug 2026-09-29).
    if (typeof vaultFlush === "function") {
      try { await vaultFlush(); } catch (e) { /* on recharge quand même */ }
    }
    if (onDone) onDone(restored, restoredData);
  };
  reader.readAsText(file);
}
