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
  return "Modifié par " + (by || "anonyme") + " le " + grcFormatTimestamp(at);
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

  const key = grcChecklistKeyFor(location.pathname);
  let saved;
  try {
    saved = JSON.parse(vaultGetItem(key) || "null");
  } catch (e) {
    saved = null;
  }
  const savedItems = saved && Array.isArray(saved.items) ? saved.items : null;
  const state = {
    items: items.map((li, i) => {
      const prev = savedItems && savedItems[i];
      return {
        text: li.textContent.trim(),
        checked: !!(prev && prev.checked),
        checkedAt: (prev && prev.checkedAt) || null,
        checkedBy: (prev && prev.checkedBy) || "",
      };
    }),
    comment: saved && typeof saved.comment === "string" ? saved.comment : "",
    commentAt: (saved && saved.commentAt) || null,
    commentBy: (saved && saved.commentBy) || "",
  };

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
    lastMod.textContent = info.at ? "Dernière modification : " + grcFormatTimestamp(info.at) + (info.by ? " par " + info.by : " (anonyme)") : "";
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
    '<h2 class="grc-comment-label">Notes</h2>' +
    '<textarea class="grc-comment-box" placeholder="Vos notes sur ce domaine…" rows="4"></textarea>';
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
    const { total, done, comment } = readDomainCoverageFromLink(domain.link);
    results[domain.link] = { total, done };
    const badge = badges[domain.link];
    if (badge) {
      if (total > 0) {
        const pct = Math.round((done / total) * 100);
        badge.className = "grc-coverage-badge " + grcCoverageStatus(pct);
        badge.textContent = pct + "%";
        badge.title = done + " / " + total + " cochés";
      } else {
        badge.className = "grc-coverage-badge empty";
        badge.textContent = "0%";
        badge.title = "Pas encore consulté";
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
    note.title = "Ce domaine a des notes";
    note.style.display = "none";
    card.appendChild(note);
    notes[domain.link] = note;

    loadDomain(domain);
  });

  window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "grc-checklist-change") return;
    const domain = enabled.find((d) => new URL(d.link, location.href).pathname === e.data.path);
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

    const enabled = section.domains.filter((d) => d.enabled !== false);
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
    section.domains
      .filter((d) => d.enabled !== false)
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
function grcVaultBlocks(actionLabel) {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    alert("Coffre verrouillé — déverrouille le chiffrement (Paramètres ▸ Chiffrement) avant " + actionLabel + ".");
    return true;
  }
  return false;
}

function collectGrcExportData(sections) {
  return sections.map((section) => ({
    title: section.title,
    domains: section.domains
      .filter((d) => d.enabled !== false)
      .map((d) => {
        const url = section.basePath + d.link;
        const cov = readDomainCoverageFromLink(url);
        return {
          title: d.title,
          description: d.description || "",
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

function grcExportFilename(ext) {
  const date = new Date().toISOString().slice(0, 10);
  return "grc-export-" + date + "." + ext;
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

async function exportGrcAsJson(sections) {
  if (grcVaultBlocks("d'exporter")) return;
  const data = await vaultMaybeEncryptForExport(collectGrcExportData(sections));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, grcExportFilename("json"));
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
async function saveGrcAsJson(sections) {
  if (grcVaultBlocks("d'exporter")) return;
  const data = await vaultMaybeEncryptForExport(collectGrcExportData(sections));
  const json = JSON.stringify(data, null, 2);
  const defaultName = grcExportFilename("json");

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
        const chosen = prompt("Nom du fichier :", defaultName);
        if (chosen === null) return;
        triggerDownload(new Blob([json], { type: "application/json" }), grcSanitizeFilename(chosen));
      });
    return;
  }

  const chosen = prompt("Nom du fichier :", defaultName);
  if (chosen === null) return; // cancelled
  triggerDownload(new Blob([json], { type: "application/json" }), grcSanitizeFilename(chosen));
}

function grcEscapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* Shared by the Word and PDF exports -- a self-contained HTML report,
   just styled differently by the caller (Word needs its own namespaced
   wrapper, PDF just prints the body as-is). */
function grcExportReportBody(sections) {
  const data = collectGrcExportData(sections);
  const generated = new Date().toLocaleString("fr-CA");
  let html = "<h1>Rapport GRC</h1><p>Généré le " + grcEscapeHtml(generated) + "</p>";

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
        html += "<p>Pas encore consulté.</p>";
      } else {
        const modInfo = grcLastModifiedInfo(domain);
        html += "<p>Couverture : " + done + " / " + total + " (" + pct + "%)</p>";
        if (modInfo.at) {
          html += "<p><em>" + grcEscapeHtml(grcModifiedLabel(modInfo.at, modInfo.by)) + "</em></p>";
        }
        html += "<ul>";
        domain.items.forEach((it) => {
          html += "<li>" + (it.checked ? "☑" : "☐") + " " + grcEscapeHtml(it.text) + "</li>";
        });
        html += "</ul>";
        if (domain.comment && domain.comment.trim()) {
          html += "<p><strong>Notes :</strong><br>" + grcEscapeHtml(domain.comment).replace(/\n/g, "<br>") + "</p>";
        }
      }
    });
  });

  return html;
}

function exportGrcAsWord(sections) {
  if (grcVaultBlocks("d'exporter")) return;
  const body = grcExportReportBody(sections);
  const html =
    "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>Rapport GRC</title></head>" +
    "<body style='font-family:Calibri,Arial,sans-serif;'>" + body + "</body></html>";
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  triggerDownload(blob, grcExportFilename("doc"));
}

function exportGrcAsPdf(sections) {
  if (grcVaultBlocks("d'exporter")) return;
  const body = grcExportReportBody(sections);
  const html =
    "<!doctype html><html><head><meta charset='utf-8'><title>Rapport GRC</title><style>" +
    "body{font-family:system-ui,Arial,sans-serif;color:#111;max-width:800px;margin:2rem auto;line-height:1.5;}" +
    "h1{margin-bottom:0;}h2{border-bottom:2px solid #333;margin-top:2rem;}h3{margin-bottom:0.2rem;}" +
    "ul{margin-top:0.3rem;}li{margin-bottom:0.15rem;}" +
    "@media print{body{margin:0;}}" +
    "</style></head><body>" + body +
    "<script>window.onload=()=>setTimeout(()=>window.print(),200);</script>" +
    "</body></html>";
  const win = window.open("", "_blank");
  if (!win) {
    alert("Le navigateur a bloqué l'ouverture d'un nouvel onglet pour l'export PDF -- autorise les pop-ups pour ce site et réessaie.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* Wipes every saved checklist/comment across the given sections, back to
   the exact state defined by the config files (nothing checked, no
   notes) -- ie. what a domain looks like the first time it's ever
   opened. Iterates real localStorage keys rather than each domain's
   expected key, so it also cleans up entries for domains since renamed
   or removed from a config. */
function resetGrcData(sections, onDone) {
  // NOT gated on the vault: vaultRemoveItem() doesn't need an unlock, and
  // clearing a registry you can't currently see back to its defaults is
  // an allowed operation (PlanDeTestSecurite 2.6) -- the caller's own
  // confirm() is the safeguard. Only import (wipe-then-fail, 0.1) and
  // export (silent-empty, 0.2) are actually broken while locked.
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf(GRC_CHECKLIST_PREFIX) === 0) keys.push(k);
  }
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
   never touches the network, so it works the same everywhere. */
function importGrcData(file, onDone, onError) {
  if (typeof vaultShouldGate === "function" && vaultShouldGate()) {
    // Stop before touching anything -- resetGrcData() below would wipe
    // first and the restore writes would then throw (PlanDeTestSecurite
    // 0.1). Surface it through onError like every other import failure.
    if (onError) onError("Coffre verrouillé — déverrouille le chiffrement (Paramètres ▸ Chiffrement) avant d'importer.");
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => {
    if (onError) onError("Impossible de lire le fichier.");
  };
  reader.onload = async () => {
    let raw;
    try {
      raw = JSON.parse(reader.result);
    } catch (e) {
      if (onError) onError("Ce fichier n'est pas un JSON valide.");
      return;
    }
    let data;
    try {
      data = await vaultMaybeDecryptImport(raw);
    } catch (e) {
      if (onError) onError(e.message || "Impossible de déchiffrer ce fichier.");
      return;
    }
    if (!Array.isArray(data)) {
      if (onError) onError("Format inattendu -- ce n'est pas un export GRC.");
      return;
    }

    let restored = 0;
    resetGrcData(null, () => {
      data.forEach((section) => {
        if (!section || !Array.isArray(section.domains)) return;
        section.domains.forEach((domain) => {
          if (!domain || !domain.path || !Array.isArray(domain.items)) return;
          if (!domain.visited) return; // never-reviewed domains have nothing to restore
          const key = grcChecklistKeyFor(domain.path);
          vaultSetItem(key, JSON.stringify({
            items: domain.items,
            comment: domain.comment || "",
            commentAt: domain.commentAt || null,
            commentBy: domain.commentBy || "",
          }));
          restored++;
        });
      });
      if (onDone) onDone(restored);
    });
  };
  reader.readAsText(file);
}
