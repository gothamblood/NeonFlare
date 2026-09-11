# Security Policy

NeonFlare is a static, client-only app: no backend, no database, no
account system. Everything a user creates lives in that browser's
`localStorage` on whatever origin serves the page (see [README.md
→ Architecture](README.md#architecture)). The one optional exception is
the **shell bridge** (`scripts/ttyd-shells.sh` + `scripts/shell-proxy.py`),
which gives the dashboard a real terminal on the host it runs on — see
[README.md → Shell terminals](README.md#shell-terminals-optional-backend)
for what that does and does not protect against.

This file covers how to report a security issue, and what's already
known/accepted so a report doesn't just restate it.

## Supported versions

There's no formal release/versioning scheme yet — only the current
`master` branch is supported. If you're running an older self-hosted
copy, update before reporting.

## In scope

- XSS or any other stored/reflected injection in a shipped page —
  including via a GRC register's JSON import, not just the UI forms.
- A CSP bypass on any shipped page (`script-src 'self'; object-src
  'none'; base-uri 'none'; frame-ancestors 'self'`, enforced as a real
  header by `nginx.conf` and by the `scripts/check-csp-inline.py` CI
  guard).
- A way to read or unlock the encryption vault's ciphertext without the
  passphrase, or to weaken its KDF/AEAD parameters
  (`assets/script/vault-crypto.js`).
- A way to reach the shell bridge's `ttyd` sockets, or to use
  `scripts/shell-proxy.py` without a valid session token, from an origin
  other than the dashboard's own.
- Path traversal or arbitrary command construction in the filesystem
  explorer's presets (`assets/script/fs-explorer.js`) beyond what the
  driven shell itself already allows the operator.
- Prototype pollution or similar via any JSON import path.
- A dev-only file (`Jenkinsfile`, `nginx.conf`, `scripts/`, dotfiles)
  reachable from a deployed image — `.dockerignore`, `nginx.conf`'s
  `deny` rules and `web.config`'s `hiddenSegments` are supposed to keep
  these out; if one leaks through, that's a bug.

## Out of scope / already accepted (documented residual risk)

These have already been looked at; a report repeating them without a
new angle will just get linked back here.

- **`localStorage` confidentiality = who can reach the page.** This is a
  client-only app with no auth of its own — anyone who can load the
  origin can read/write everything in it. Put access control (a reverse
  proxy with auth, a VPN, etc.) in front of your deployment if that
  matters to you; it's not something the app itself can enforce.
- **`localStorage` is keyed by origin, not by path.** Two instances
  served from the same host (e.g. `/prod/` and `/staging/`) share every
  key, including the vault. Deployment hygiene, not a code fix.
- **Once the vault is unlocked, plaintext and the (non-extractable)
  `CryptoKey` live in page memory for any script running on that origin**
  — same-origin XSS in an unlocked tab reads the clear text, same as any
  other client-side-encryption scheme. The vault protects data *at
  rest*; it does not turn an XSS into a no-op.
- **The shell bridge trusts its own origin.** `scripts/shell-proxy.py`'s
  token check stops *other* origins from driving the shell; it can't stop
  a same-origin XSS from doing the same thing the dashboard itself can.
  Run the shells only for hands-on-keyboard work, ideally from a
  dedicated browser profile, and stop them when done — the proxy also
  self-stops after `IDLE_TIMEOUT_SECONDS` idle (default 30 min).
- **The explorer's "amber" actions are explicit and logged, not
  sandboxed.** chmod / privesc / target-change require a one-time in-app
  authorisation and are echoed to the Journal, but nothing stops an
  operator (or a script acting as one) from issuing something destructive
  once authorised — that's the tool doing what it's told, not a bug.

## Reporting a vulnerability

Open an issue at
[github.com/gothamblood/NeonFlare](https://github.com/gothamblood/NeonFlare) —
or, if GitHub's private vulnerability reporting is enabled on that repo
(Security tab → "Report a vulnerability"), use that instead for anything
you'd rather not describe in public before a fix ships. If you go the
public-issue route, please describe impact and repro steps without
posting a ready-to-run exploit payload in the title/body.

Include: the page/file involved, the shipped version or commit, and
steps to reproduce. There's no formal SLA — this is a single-maintainer
project — but security reports get looked at before anything else.
