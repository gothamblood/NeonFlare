/* Pure crypto primitives for the optional encryption feature -- native
   SubtleCrypto only, zero dependency, matching the rest of this
   project's philosophy. See assets/script/vault.js for the higher-level
   session/storage logic built on top of this.

   Scheme: PBKDF2-HMAC-SHA256 (passphrase -> AES-256-GCM key), the key
   derived as extractable:false so no code path -- this app's own,
   or anything injected via XSS -- can ever read the raw key bytes
   back out, only ask the browser's crypto engine to use it. See
   TODOSecurityStandpoint.txt #3 for the honest scope of what that
   does and doesn't protect against.

   Three strength tiers, chosen as PBKDF2 iteration counts (the only
   lever available without pulling in an external KDF like Argon2id,
   which would mean a WASM dependency this project deliberately
   doesn't have). VAULT_LEVELS.standard matches OWASP's current
   Password Storage Cheat Sheet baseline for PBKDF2-HMAC-SHA256. */
const VAULT_LEVELS = {
  light: { label: "Léger", iterations: 210000 },
  standard: { label: "Standard", iterations: 600000 },
  strong: { label: "Renforcé", iterations: 1500000 },
};

const VAULT_ALGORITHM = "AES-GCM";
const VAULT_KDF = "PBKDF2-SHA256";
const VAULT_ENVELOPE_VERSION = 1;

function vaultRandomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function vaultBytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function vaultBase64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* Derives a non-extractable AES-GCM key straight from the passphrase --
   the passphrase itself necessarily passes through JS as a string (the
   input field's value) for this one call, there's no way around that,
   but the derived key it produces can never be exported again once
   this returns. */
async function vaultDeriveKey(passphrase, saltBytes, iterations) {
  const passKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    passKey,
    { name: VAULT_ALGORITHM, length: 256 },
    false, // extractable
    ["encrypt", "decrypt"]
  );
}

/* Raw AES-GCM encrypt/decrypt of one value under an already-derived key
   -- cheap (sub-millisecond for the small JSON blobs this app stores),
   unlike key derivation which only needs to happen once per unlock.
   Individual localStorage entries only need {iv, ciphertext}; the
   shared salt/iterations/level live once in the vault's own metadata
   record (see vault.js) rather than repeated on every key. */
async function vaultEncryptRaw(key, value) {
  const iv = vaultRandomBytes(12);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: VAULT_ALGORITHM, iv }, key, plaintext);
  return { iv: vaultBytesToBase64(iv), ciphertext: vaultBytesToBase64(new Uint8Array(ciphertext)) };
}

/* Reverses vaultEncryptRaw() -- throws (AES-GCM's built-in
   authentication tag check fails) on a wrong key or corrupted data,
   same as any AEAD cipher; callers use that to tell "wrong password"
   apart from "no data yet". */
async function vaultDecryptRaw(key, ivB64, ciphertextB64) {
  const iv = vaultBase64ToBytes(ivB64);
  const ciphertext = vaultBase64ToBytes(ciphertextB64);
  const plaintext = await crypto.subtle.decrypt({ name: VAULT_ALGORITHM, iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/* Self-describing envelope for anything that leaves the browser
   (JSON exports) -- level/iterations/salt travel alongside the
   ciphertext (not secret, just tells a future decrypt attempt how to
   redo the KDF) so an exported file is independently decryptable
   without also having to remember which level/vault it came from. */
async function vaultEncryptForExport(key, saltBytes, iterations, value) {
  const { iv, ciphertext } = await vaultEncryptRaw(key, value);
  return {
    encrypted: true,
    version: VAULT_ENVELOPE_VERSION,
    algorithm: VAULT_ALGORITHM,
    kdf: VAULT_KDF,
    iterations,
    salt: vaultBytesToBase64(saltBytes),
    iv,
    ciphertext,
  };
}

function vaultIsEnvelope(value) {
  return !!value && typeof value === "object" && value.encrypted === true && typeof value.ciphertext === "string";
}
