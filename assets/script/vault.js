/* Session/storage layer for the optional encryption feature -- built on
   assets/script/vault-crypto.js. Everything here is designed so a
   deployment with config/encryption.js's "enabled" left false behaves
   exactly as before: vaultGetItem/vaultSetItem/vaultRemoveItem fall
   straight through to plain localStorage the instant the feature isn't
   both enabled AND actually set up.

   Protected keys (Network, Topology, GRC -- the registries that reveal
   real infrastructure, per TODOSecurityStandpoint.txt #3) are decrypted
   once into an in-memory cache on unlock, not on every read: the
   expensive step (PBKDF2 key derivation) only ever runs once per
   unlock, everything after that is a cheap AES-GCM call reusing the
   same derived key. The key itself is held as a non-extractable
   CryptoKey (see vault-crypto.js) and only ever lives in memory for
   this one tab -- reloading the page always re-locks, on purpose. */

const VAULT_META_KEY = "/settings.html/vaultMeta";
const VAULT_CANARY_VALUE = "neonflare-vault-v1";

const VAULT_PROTECTED_EXACT_KEYS = [
  "/settings.html/networkNodes",
  "/settings.html/topologyCustomNodes",
  "/settings.html/topologyCustomLinks",
  "/settings.html/topologyLayout",
  "/settings.html/topologyHiddenSeed",
  "/settings.html/topologyTitleOverrides",
  "/grc/actifs/registry",
  "/grc/analyse-risques/registry",
  "/grc/incidents/registry",
  "/grc/controles/registry",
  "/grc/continuity/registry",
  "/grc/fournisseurs/registry",
  "/grc/vulns/registry",
  "/grc/privacy/registry",
  "/grc/compliance/registry",
  "/grc/access-reviews/registry",
  "/grc/metrics/registry",
  "/grc/documents/registry",
  "/pentest/engagements",
];
const VAULT_PROTECTED_PREFIX = "/grc/checklist";

let vaultKey = null; // CryptoKey, non-extractable -- null while locked
let vaultUnlocked = false;
let vaultCache = {}; // protected localStorage key -> decrypted string value

function vaultIsProtectedKey(key) {
  return VAULT_PROTECTED_EXACT_KEYS.indexOf(key) !== -1 || key.indexOf(VAULT_PROTECTED_PREFIX) === 0;
}

function vaultIsFeatureEnabled() {
  return typeof encryptionConfig !== "undefined" && encryptionConfig.enabled === true;
}

function vaultGetMeta() {
  try {
    return JSON.parse(localStorage.getItem(VAULT_META_KEY) || "null");
  } catch (e) {
    return null;
  }
}

function vaultIsSetUp() {
  return vaultIsFeatureEnabled() && !!vaultGetMeta();
}

function vaultIsUnlocked() {
  return vaultUnlocked;
}

// Every protected key actually present in localStorage right now --
// key *names* are never encrypted, only their values, so this plain
// enumeration still works whether the vault is set up or not.
function vaultProtectedKeysInStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && vaultIsProtectedKey(k)) keys.push(k);
  }
  return keys;
}

/* First-time setup: derives a fresh key under a new random salt,
   re-encrypts whatever plaintext protected data already exists (the
   "migration" every point in TODOSecurityStandpoint.txt's encryption
   section assumed would be needed), stores the vault's metadata + a
   canary value used to recognize a correct passphrase on future
   unlocks, and leaves the vault unlocked (you just set the passphrase,
   no reason to immediately demand it back). Returns nothing; throws on
   a WebCrypto failure (extremely unlikely -- not on a wrong password,
   there's no "wrong" password yet at setup time). */
async function vaultSetup(passphrase, levelKey) {
  const level = VAULT_LEVELS[levelKey] || VAULT_LEVELS.standard;
  const salt = vaultRandomBytes(16);
  const key = await vaultDeriveKey(passphrase, salt, level.iterations);
  const canary = await vaultEncryptRaw(key, VAULT_CANARY_VALUE);

  // Phase 1 -- encrypt every existing plaintext entry in memory only.
  // Nothing on disk changes yet, so a failure here (a WebCrypto error)
  // leaves the vault un-set-up and the data byte-for-byte as it was.
  const existingKeys = vaultProtectedKeysInStorage();
  const staged = [];
  for (const k of existingKeys) {
    const plain = localStorage.getItem(k);
    // eslint-disable-next-line no-await-in-loop -- small, one-time
    // migration pass, sequential is simpler to reason about than
    // Promise.all here and this only ever runs once at setup.
    const envelope = await vaultEncryptRaw(key, plain);
    staged.push({ key: k, plain, ciphertextJson: JSON.stringify({ iv: envelope.iv, ciphertext: envelope.ciphertext }) });
  }

  // Phase 2 -- commit. This block is fully synchronous, so the browser
  // can't interrupt it partway; either it completes or (rollback) it
  // undoes itself. Write the metadata FIRST so a mid-loop *throw*
  // (typically a localStorage QuotaExceededError -- the {iv,ciphertext}
  // wrapper runs ~35-50% bigger than the plaintext) can be rolled back
  // cleanly: we never leave a half-encrypted store with no metadata to
  // decrypt it (PlanDeTestSecurite 0.3 -- was silent permanent data
  // loss). The only unrecoverable-by-code case left is the tab being
  // hard-killed (crash / power loss) inside this microsecond window,
  // which would leave a few entries still plaintext: vaultUnlock() skips
  // non-envelope values, so those would read as empty until the vault is
  // disabled -- data still on disk, not silently gone.
  const rewritten = [];
  try {
    localStorage.setItem(VAULT_META_KEY, JSON.stringify({
      level: levelKey,
      iterations: level.iterations,
      salt: vaultBytesToBase64(salt),
      canaryIv: canary.iv,
      canaryCiphertext: canary.ciphertext,
    }));
    for (const item of staged) {
      localStorage.setItem(item.key, item.ciphertextJson);
      rewritten.push(item);
    }
  } catch (e) {
    // Restore plaintext for whatever we already swapped (plaintext is
    // smaller than the envelope it replaces, so this frees space and
    // won't itself hit the quota), then drop the metadata.
    for (const item of rewritten) localStorage.setItem(item.key, item.plain);
    localStorage.removeItem(VAULT_META_KEY);
    throw e;
  }

  vaultKey = key;
  vaultCache = {};
  staged.forEach((item) => { vaultCache[item.key] = item.plain; });
  vaultUnlocked = true;
}

/* Re-derives the key from the stored salt/iterations and the given
   passphrase, then decrypts the canary to tell a correct passphrase
   apart from a wrong one before trusting it with anything real. On
   success, decrypts every protected entry once into vaultCache. */
async function vaultUnlock(passphrase) {
  const meta = vaultGetMeta();
  if (!meta) return false;

  const salt = vaultBase64ToBytes(meta.salt);
  const key = await vaultDeriveKey(passphrase, salt, meta.iterations);

  try {
    const canary = await vaultDecryptRaw(key, meta.canaryIv, meta.canaryCiphertext);
    if (canary !== VAULT_CANARY_VALUE) return false;
  } catch (e) {
    return false; // AES-GCM auth tag rejected -- wrong passphrase
  }

  const cache = {};
  for (const k of vaultProtectedKeysInStorage()) {
    const raw = localStorage.getItem(k);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      continue;
    }
    if (!vaultIsEnvelope(parsed) && !(parsed && parsed.iv && parsed.ciphertext)) continue;
    try {
      // eslint-disable-next-line no-await-in-loop -- one-time pass on
      // unlock, same reasoning as vaultSetup() above.
      cache[k] = await vaultDecryptRaw(key, parsed.iv, parsed.ciphertext);
    } catch (e) {
      // Corrupted entry for this one key -- skip it rather than fail
      // the whole unlock; readers see it as simply absent.
    }
  }

  vaultKey = key;
  vaultCache = cache;
  vaultUnlocked = true;
  return true;
}

// Drops the derived key and cached plaintext from memory. Nothing on
// disk changes -- it was already encrypted the whole time this
// session had it unlocked, this just forgets the key. Reloading the
// page has the exact same effect (module state doesn't survive it).
function vaultLock() {
  vaultKey = null;
  vaultCache = {};
  vaultUnlocked = false;
}

/* Turns the feature back off: verifies the passphrase (independently
   of whatever's currently unlocked, same as vaultUnlock -- no "trust
   me, I'm already in" shortcut for an action this destructive),
   writes every protected entry back out as plain JSON, then removes
   the vault metadata entirely. From then on vaultIsSetUp() is false
   and every vault* function is a plain localStorage passthrough
   again, exactly like a fresh deployment with the config flag off. */
async function vaultDisable(passphrase) {
  const ok = await vaultUnlock(passphrase);
  if (!ok) return false;

  Object.keys(vaultCache).forEach((k) => {
    localStorage.setItem(k, vaultCache[k]);
  });

  localStorage.removeItem(VAULT_META_KEY);
  vaultKey = null;
  vaultCache = {};
  vaultUnlocked = false;
  return true;
}

async function vaultPersistEncrypted(key, value) {
  const { iv, ciphertext } = await vaultEncryptRaw(vaultKey, value);
  localStorage.setItem(key, JSON.stringify({ iv, ciphertext }));
}

/* Drop-in replacements for localStorage.getItem/setItem/removeItem,
   used by network-config.js/topology-config.js/grc-checklist.js in
   place of the real thing for their protected keys. Synchronous on
   purpose (see vaultCache above) so none of those call sites -- or
   their own callers, threaded through dashboard.html/settings.html/
   topology.html/every GRC page -- need to become async just to read a
   value that was already decrypted once at unlock. */
function vaultGetItem(key) {
  if (!vaultIsProtectedKey(key) || !vaultIsSetUp()) return localStorage.getItem(key);
  if (!vaultUnlocked) return null;
  return Object.prototype.hasOwnProperty.call(vaultCache, key) ? vaultCache[key] : null;
}

function vaultSetItem(key, value) {
  if (!vaultIsProtectedKey(key) || !vaultIsSetUp()) {
    localStorage.setItem(key, value);
    return;
  }
  if (!vaultUnlocked) {
    // The UI is expected to gate writes behind an unlock screen for
    // protected sections -- this is a loud last-resort guard against a
    // bug doing so anyway, not a normal path. Failing loudly beats
    // silently discarding a write or (worse) writing plaintext.
    throw new Error("Vault is locked -- can't write " + key);
  }
  vaultCache[key] = value;
  vaultPersistEncrypted(key, value).catch((e) => console.error("Vault: failed to persist", key, e));
}

function vaultRemoveItem(key) {
  if (!vaultIsProtectedKey(key) || !vaultIsSetUp()) {
    localStorage.removeItem(key);
    return;
  }
  delete vaultCache[key];
  localStorage.removeItem(key);
}

/* Wraps a plain JS value into a portable encrypted envelope for a JSON
   export, or returns it untouched if the vault isn't active -- used by
   the Network/Topology/GRC export functions so "every export is
   encrypted once the feature is on" doesn't need its own opt-in
   per export button. Requires the vault to be unlocked (the data being
   exported only exists in decrypted form in memory to begin with). */
async function vaultMaybeEncryptForExport(value) {
  if (!vaultIsSetUp() || !vaultUnlocked) return value;
  const meta = vaultGetMeta();
  const salt = vaultBase64ToBytes(meta.salt);
  return vaultEncryptForExport(vaultKey, salt, meta.iterations, value);
}

/* Reverses vaultMaybeEncryptForExport() for an imported file -- prompts
   for that file's own passphrase (its embedded salt/iterations, which
   may not match whatever vault is currently unlocked -- eg. restoring
   an older backup) and returns the decrypted value, or throws with a
   message safe to show the user directly. Passing a plain (non
   -encrypted) value through untouched keeps every existing import
   function working unchanged when the vault isn't involved at all. */
async function vaultMaybeDecryptImport(value) {
  if (!vaultIsEnvelope(value)) return value;
  const passphrase = prompt("Ce fichier est chiffré -- mot de passe :");
  if (passphrase === null) throw new Error("Import annulé.");
  const salt = vaultBase64ToBytes(value.salt);
  const key = await vaultDeriveKey(passphrase, salt, value.iterations);
  try {
    return await vaultDecryptRaw(key, value.iv, value.ciphertext);
  } catch (e) {
    throw new Error("Mot de passe incorrect pour ce fichier.");
  }
}
