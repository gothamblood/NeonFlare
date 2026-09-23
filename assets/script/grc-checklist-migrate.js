/* Checklist state migration for pages that moved or merged
   (spec/grc-restructure/ R1). Must load after vault.js and before
   grc-checklist.js runs initGrcChecklist()/renderGrcCoverage().

   A checklist's storage key is "/grc/checklist" + the page's absolute
   pathname (grcChecklistKeyFor), so moving a page means a new key. The
   site root differs per deployment (file:// = full disk path, http =
   "/"), so moves are matched on the path SUFFIX of every existing key
   instead of being derived from this page's own location -- which also
   lets the hub and the dashboard run it, not just the moved page.

   - Plain move: the stored value is copied as-is (ciphertext included --
     the vault doesn't bind entries to their key name), so it works even
     while the vault is locked.
   - Merge: the source's items are appended to the target's saved state
     with id "legacy:<tag>:<index>", which the target page's <li
     data-legacy="<tag>:<index>"> picks up (see grcChecklistMatchSaved).
     Needs plaintext, so it's deferred while the vault is locked and runs
     on the next call after unlock (initGrcChecklist calls it post-gate).

   - Split (GRC_CHECKLIST_SPLITS): the reverse of a merge -- some items
     of a page's saved state go back to a page of their own (renamed ids,
     "legacy:<tag>:N" -> "legacy:N"), with the "[<tag>] ..." part of the
     note. Needs plaintext too, so it's deferred while the vault is locked.

   Idempotent: a source key is removed once migrated; a split leaves
   nothing to move on its second run. No fetch(). */

const GRC_CHECKLIST_MOVES = [
  { from: "grc/architecture.html", to: "grc/securite/operationnelle/architecture.html" },
  { from: "grc/vulnerabilites.html", to: "grc/securite/operationnelle/vulnerabilites.html" },
  { from: "grc/iam.html", to: "grc/securite/operationnelle/iam.html" },
  { from: "grc/cloud.html", to: "grc/securite/operationnelle/cloud.html" },
  { from: "grc/devsecops.html", to: "grc/securite/operationnelle/devsecops.html" },
  // Sécurité physique : domaine de mesures (ISO 27001 A.7), sorti du hub GRC.
  { from: "grc/securite-physique.html", to: "grc/securite/operationnelle/securite-physique.html" },
  // RH et sensibilisation : domaine de mesures (ISO 27001 A.6), sorti du hub GRC.
  { from: "grc/ressources-humaines.html", to: "grc/securite/operationnelle/ressources-humaines.html" },
];

/* Protection des renseignements personnels : fusionnée dans Conformité le
   2026-09-22 (spec/grc-restructure/ §1.4), redevenue une page le 2026-09-23
   (spec/grc-hub-iso/ §2). Backups taken before the merge carry
   grc/vie-privee.html and are restored there as-is. `ids`: item id on the
   source page -> id on the target page. */
const GRC_CHECKLIST_SPLITS = [
  {
    from: "grc/conformite.html", to: "grc/vie-privee.html", tag: "vie-privee",
    ids: {
      "priv-why1": "why1", "priv-why2": "why2", "priv-why3": "why3",
      "loi25": "loi25", "registre-traitements": "registre-traitements", "consentement": "consentement",
      "efvp": "efvp", "renseignements": "renseignements", "conservation": "conservation",
      "destruction": "destruction", "violations": "violations", "droits": "droits",
    },
  },
];

function _grcMigrateVaultLocked() {
  return typeof vaultIsSetUp === "function" && vaultIsSetUp() &&
    typeof vaultIsUnlocked === "function" && !vaultIsUnlocked();
}

function _grcMigrateRead(key) {
  try {
    return JSON.parse(vaultGetItem(key) || "null");
  } catch (e) {
    return null;
  }
}

// Tags a merged source's items so the target page can find them again.
function grcChecklistTagLegacyItems(items, tag) {
  return (Array.isArray(items) ? items : []).map((it, i) => {
    const src = it && typeof it === "object" ? it : {};
    return Object.assign({}, src, { id: "legacy:" + tag + ":" + i });
  });
}

// Folds a merged source's state into the target's (target may be null).
function grcChecklistMergeState(target, source, tag) {
  const t = target && typeof target === "object" ? target : {};
  const s = source && typeof source === "object" ? source : {};
  const items = (Array.isArray(t.items) ? t.items : []).concat(grcChecklistTagLegacyItems(s.items, tag));
  const tc = typeof t.comment === "string" ? t.comment : "";
  const sc = typeof s.comment === "string" ? s.comment.trim() : "";
  const comment = sc ? (tc ? tc + "\n\n" : "") + "[" + tag + "] " + sc : tc;
  const newer = sc && (!t.commentAt || (s.commentAt && s.commentAt > t.commentAt));
  return {
    items,
    comment,
    commentAt: newer ? (s.commentAt || null) : (t.commentAt || null),
    commentBy: newer ? (s.commentBy || "") : (t.commentBy || ""),
  };
}

/* Maps an old page pathname to its new one: { path, mergeTag } or null
   when the path isn't affected. Used by the storage migration below and
   by importGrcData() for JSON backups taken before the restructure. */
function grcChecklistRemapPath(pathname) {
  if (typeof pathname !== "string") return null;
  for (const m of GRC_CHECKLIST_MOVES) {
    const suffix = "/" + m.from;
    if (pathname.length >= suffix.length && pathname.slice(-suffix.length) === suffix) {
      return { path: pathname.slice(0, -suffix.length) + "/" + m.to, mergeTag: m.mergeTag || null };
    }
  }
  return null;
}

/* Splits one page's saved state: { source, target } (target merged into
   `current`, the target page's existing state, which wins on the same id)
   or null when the source holds nothing that belongs to the target. */
function grcChecklistSplitState(source, current, split) {
  const s = source && typeof source === "object" ? source : {};
  const items = Array.isArray(s.items) ? s.items : [];
  const legacyPrefix = "legacy:" + split.tag + ":";
  const keep = [];
  const moved = [];
  items.forEach((it) => {
    const id = it && typeof it === "object" && typeof it.id === "string" ? it.id : "";
    if (id && Object.prototype.hasOwnProperty.call(split.ids, id)) moved.push(Object.assign({}, it, { id: split.ids[id] }));
    else if (id.indexOf(legacyPrefix) === 0) moved.push(Object.assign({}, it, { id: "legacy:" + id.slice(legacyPrefix.length) }));
    else keep.push(it);
  });
  // The merge appended "[<tag>] <note>" to the source's note (see
  // grcChecklistMergeState) -- that part goes back with the items.
  const comment = typeof s.comment === "string" ? s.comment : "";
  const marker = "[" + split.tag + "] ";
  const at = comment.indexOf(marker);
  const movedComment = at === -1 ? "" : comment.slice(at + marker.length).trim();
  const keptComment = at === -1 ? comment : comment.slice(0, at).replace(/\s+$/, "");
  if (!moved.length && !movedComment) return null;

  const t = current && typeof current === "object" ? current : {};
  const tItems = Array.isArray(t.items) ? t.items : [];
  const have = {};
  tItems.forEach((it) => { if (it && it.id) have[it.id] = 1; });
  const tc = typeof t.comment === "string" ? t.comment : "";
  const target = {
    items: tItems.concat(moved.filter((it) => !have[it.id])),
    comment: movedComment && tc.indexOf(movedComment) === -1 ? (tc ? tc + "\n\n" : "") + movedComment : tc,
    commentAt: t.commentAt || (movedComment ? s.commentAt || null : null),
    commentBy: t.commentBy || (movedComment ? s.commentBy || "" : ""),
  };
  const out = Object.assign({}, s, { items: keep, comment: keptComment });
  return { source: out, target: target };
}

// Splits every stored key matching a GRC_CHECKLIST_SPLITS source. Returns
// the number of keys split; 0 while the vault is locked.
function grcChecklistRunSplits(keys, locked) {
  if (locked) return 0;
  let n = 0;
  keys.forEach((fromKey) => {
    const path = fromKey.slice(GRC_CHECKLIST_PREFIX.length);
    GRC_CHECKLIST_SPLITS.forEach((sp) => {
      const suffix = "/" + sp.from;
      if (path.length < suffix.length || path.slice(-suffix.length) !== suffix) return;
      const toKey = GRC_CHECKLIST_PREFIX + path.slice(0, -suffix.length) + "/" + sp.to;
      try {
        const res = grcChecklistSplitState(_grcMigrateRead(fromKey), _grcMigrateRead(toKey), sp);
        if (!res) return;
        vaultSetItem(toKey, JSON.stringify(res.target));
        vaultSetItem(fromKey, JSON.stringify(res.source));
        n++;
      } catch (e) {
        console.error("GRC checklist split failed for", fromKey, e);
      }
    });
  });
  return n;
}

function grcChecklistMigrate() {
  if (typeof GRC_CHECKLIST_PREFIX === "undefined") return 0;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf(GRC_CHECKLIST_PREFIX) === 0) keys.push(k);
  }
  const locked = _grcMigrateVaultLocked();
  let moved = 0;
  keys.forEach((fromKey) => {
    const mapped = grcChecklistRemapPath(fromKey.slice(GRC_CHECKLIST_PREFIX.length));
    if (!mapped) return;
    const toKey = GRC_CHECKLIST_PREFIX + mapped.path;
    try {
      if (!mapped.mergeTag) {
        if (localStorage.getItem(toKey) === null) {
          const plain = locked ? null : vaultGetItem(fromKey);
          if (plain !== null) vaultSetItem(toKey, plain);
          else localStorage.setItem(toKey, localStorage.getItem(fromKey));
        }
        vaultRemoveItem(fromKey);
        moved++;
        return;
      }
      if (locked) return; // merge needs plaintext -- retried after unlock
      const merged = grcChecklistMergeState(_grcMigrateRead(toKey), _grcMigrateRead(fromKey), mapped.mergeTag);
      vaultSetItem(toKey, JSON.stringify(merged));
      vaultRemoveItem(fromKey);
      moved++;
    } catch (e) {
      console.error("GRC checklist migration failed for", fromKey, e);
    }
  });
  const after = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf(GRC_CHECKLIST_PREFIX) === 0) after.push(k);
  }
  return moved + grcChecklistRunSplits(after, locked);
}
