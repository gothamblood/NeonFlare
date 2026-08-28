/* Shared unlock-gate UI, used by every page that touches vault-protected
   data (Network, Topology, GRC -- see vault.js). One small pattern
   repeated everywhere instead of each page inventing its own: a call
   site that's about to read/render/write protected data checks
   vaultShouldGate() first, and if true renders an unlock form via
   vaultRenderUnlockForm() INSTEAD of doing that read/render/write, then
   retries once the passphrase is confirmed correct.

   Deliberately NOT a substitute for actually calling vaultUnlock() at
   the vault.js layer -- this is presentation only. vaultSetItem()'s own
   "throw if locked" guard (vault.js) still stands as the real backstop
   if some call site ever skips the gate by mistake. */

// True if this page needs to show a lock gate right now: the vault is
// configured (feature on + passphrase set) but this tab hasn't unlocked
// it yet. False in every other case, including "feature off" and
// "never set up" -- both of those just behave like there's no vault.
function vaultShouldGate() {
  return typeof vaultIsSetUp === "function" && vaultIsSetUp() && !vaultIsUnlocked();
}

/* Renders a self-contained passphrase form into `container` (its prior
   content is discarded). On a correct passphrase, calls onUnlock() --
   normally the same render function the caller was about to run, so it
   simply runs again and this time finds vaultShouldGate() false. On a
   wrong one, shows an inline error and leaves the form up to retry. */
function vaultRenderUnlockForm(container, onUnlock) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "nf-note nf-note-warn vault-unlock-gate";
  wrap.innerHTML =
    '<p class="vault-unlock-msg">🔒 Cette section est chiffrée -- entre le mot de passe du coffre pour l\'afficher ou la modifier.</p>' +
    '<form class="vault-unlock-form" autocomplete="off">' +
    // Discourage the browser / password managers from offering to store
    // this passphrase: the whole point of the feature is that it lives
    // only in the user's head (PlanDeTestSecurite 0.4). autocomplete="off"
    // is imperfect on password fields, hence the extra manager-specific
    // opt-out hints and the non-standard field name.
    '<input type="password" class="vault-unlock-pass" name="nf-vault-passphrase" placeholder="Mot de passe du coffre" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" required>' +
    '<button type="submit" class="dash-btn">Déverrouiller</button>' +
    "</form>" +
    '<p class="vault-unlock-error" style="display:none"></p>';
  container.appendChild(wrap);

  const form = wrap.querySelector(".vault-unlock-form");
  const passInput = wrap.querySelector(".vault-unlock-pass");
  const errorEl = wrap.querySelector(".vault-unlock-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    errorEl.style.display = "none";
    try {
      const ok = await vaultUnlock(passInput.value);
      if (!ok) {
        errorEl.textContent = "Mot de passe incorrect.";
        errorEl.style.display = "";
        submitBtn.disabled = false;
        return;
      }
    } catch (e2) {
      errorEl.textContent = "Erreur de déchiffrement -- réessaie.";
      errorEl.style.display = "";
      submitBtn.disabled = false;
      return;
    }
    onUnlock();
  });
}

/* Convenience wrapper for the common case: "if locked, show the gate and
   stop; otherwise proceed normally." Returns true when it rendered a
   gate (caller should return immediately without touching protected
   data), false when there was nothing to gate (caller proceeds as
   usual, container untouched). */
function vaultGateOr(container, onUnlock) {
  if (!vaultShouldGate()) return false;
  vaultRenderUnlockForm(container, onUnlock);
  return true;
}
