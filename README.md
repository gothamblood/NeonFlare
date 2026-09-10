# NeonFlare

**A self-hostable operations dashboard for security work** — GRC checklists,
a pentest findings tracker, a tool/command library with click-to-terminal, a
drag-and-drop network map, live shell panels, and a filesystem explorer that
drives them, wrapped in a cyberpunk UI.

It's a **static site**: plain HTML/CSS/JS, no build step, no database. Every
piece of state you create lives in your browser's `localStorage`; nothing is
sent anywhere. Drop it on any web server — or open it straight from disk.

> Full title: *NeonFlare: Rise of GothamBlood*. MIT-licensed.

Official website: [neonflare.ca](https://neonflare.ca)
Source code: [github.com/gothamblood/NeonFlare](https://github.com/gothamblood/NeonFlare)

---

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Multiple named dashboards, each with its own panel layout (drag/resize): network panel, **live shell terminals** (ttyd + tmux, see below), and the **filesystem explorer**. "Copy to shell" on any command in the Tools pages types it straight into a terminal. Panels can be hidden per dashboard (`☰ Panneaux`). |
| **Filesystem explorer** | A dashboard panel ("Explorateur") that drives **one shell pane at a time** — a local shell or a reverse shell you caught in it. Read-only navigation: OS probe, directory listing, breadcrumb, hidden-files toggle, permission grid, text-file preview. Per-target **bookmarks** ("Intéressants"). **Énum presets** — SUID / SGID binaries, capabilities, world-writable dirs, cron, `sudo -l`, `id`/groups, `user.txt`/`root.txt`/`flag.txt` — run on the target; path results are clickable and auto-bookmarked. **GTFOBins / LOLBAS** pills on known privesc binaries. **Amber actions** (chmod, privesc, change target) require a one-time in-app authorisation, then run in the driven pane. Every command it issues is shown verbatim in the panel's own "Journal des commandes" and as a one-liner in the shared System log. Off by default — enable via `☰ Panneaux` or Settings → Sections du Dashboard. |
| **Linked tabs** | A `🔗 Link` toggle in the dashboard toolbar routes this browser tab's "Shell" actions into *another* open tab — pick commands in one window, run them in the terminal of another. |
| **GRC** | 58 checklist pages across five hubs — Governance/Risk/Compliance, Network, API, WebApp and Database security — with coverage %, a per-item change-log (timestamp + author), plus asset / risk / control / incident registers. Incidents open into an **IR workspace** (interactive timeline, investigation notes / hypotheses / IOCs, tasks kanban, case-file export as JSON + Word/PDF + IOC list). **BCP/DRP register** on the Continuity page: BIA (MTD/RTO/RPO with a consistency alert), dependencies, redundancy, an ordered recovery procedure, a test log, and a full case-file export plus a one-page recovery card. **Vendor register** on the Suppliers page: third-party risk scoring, contract clauses with a contract-expiry alert, certification tracking with expiry badges, an onboarding/offboarding checklist and periodic review, incident cross-links, plus vendor report / one-page sheet / register CSV exports. **Vulnerability tracker** on the Vulnerabilities page: end-to-end lifecycle with a CVSS-derived severity and SLA due date, an SLA-breach alert, a status-change timeline, affected-asset / incident / risk cross-links, a risk-acceptance block with an expiry alert, and severity-sorted Word/PDF report plus register CSV exports. **Privacy register** on the Privacy page (Québec Law 25): a ROPA of processing activities — legal basis, cross-border transfers with a missing-safeguard alert, retention with an expiry alert, a DPIA score (sensitivity × volume × exposure) with a required-not-done alert, periodic review — plus a data-subject-request log with an automatic 30-day deadline and an overdue alert; ROPA Word/CSV, DSR log CSV and one-page acknowledgement exports. **Compliance register** on the Compliance page: obligations (law / standard / contract) with an applicability flag (SoA), a compliance status and a periodic assessment with an overdue alert, plus audits carrying findings — each a non-conformity with a severity, a corrective action with an overdue alert and a verification state; compliance-rate summary, SoA Word/CSV, compliance report and per-audit report exports. **Access-recertification register** on the IAM page: review campaigns with a per-line keep/revoke/reduce decision, a bulk paste-parser, a progress bar, an overdue-deadline alert and a sign-off that requires every line decided and then locks them (re-open logged), plus a JML (joiner/mover/leaver) log with a "leaver not deprovisioned > 7 days" alert; campaign report and lines CSV exports. **Metrics register** on the Metrics page: KPIs/KRIs each with a target, amber/red thresholds and a direction, a measurement series drawn as a vanilla SVG sparkline (target line + threshold bands), a RAG status, a trend vs. the previous measurement and a measurement-overdue alert; the summary is a small RAG dashboard, plus periodic report, definitions CSV, series CSV and JSON exports. **Risk-treatment plan** on the Risk-analysis page: each risk can be given an optional structured plan (100% backward-compatible) — a strategy (avoid/mitigate/transfer/accept) with rationale, an ordered action plan with owners/due-dates and an overdue alert, a residual score (likelihood × impact) with the inherent→residual reduction, linked controls, and a risk-acceptance block (required when the strategy is *accept* or the residual is non-zero) with a review-due alert; a treatment summary above the register plus a treatment CSV export. **Document register** shared across the Procedures / Directives / Documentation / Governance pages (one store, each page filtered by document type): editorial lifecycle (draft → in-review → approved → published → under-revision → retired), a free-form version with a "new version" button that bumps it and appends a version-log entry, an approver (feeding an authority register), a periodic review with an overdue alert, a stale-draft alert (never approved for 90+ days), covered controls and document-to-document relations; the Governance page also shows a read-only authority table (document → approver), plus document-summary Word/CSV, authority-register CSV and JSON exports. |
| **Findings** | A lightweight pentest engagement + findings tracker, with an explicit mapping to GRC controls. |
| **Topology** | Drag-and-drop network diagram editor with nestable "container" nodes; layout persists per browser. |
| **Tools** | Curated command references (recon, OSINT, web, AD, lateral movement, post-exploitation, linux, windows, AWS, Azure, Terraform, docker, kubernetes, C2, misc, …) with placeholder substitution (`<IP>`, `<wordlist>`), copy-to-clipboard and copy-to-shell. Two "custom" pages for your own commands. |
| **Settings** | Themes — Standard / Neon Terminal / Blade Runner / Black ICE / **custom colour picker**; per-page background & particle effects; sidebar page visibility; shell opacity; language (FR / EN); dashboards manager; full config export/import as one JSON file, with per-register reset. |
| **Encryption vault** *(optional)* | Passphrase-derived AES-GCM (WebCrypto) encryption at rest for the Network / Topology / GRC registers. Off by default; the passphrase is never stored. Locked sections show an unlock gate; reloading re-locks. |
| **Onboarding** | A short guided tour on first load, re-launchable from Settings. |

---

## Architecture

Everything runs in the browser. There is no backend and no account — every
register is read from and written to a **single browser's `localStorage`**, and
the site works opened straight from disk (`file://`).

```
BROWSER                                  │ loopback 127.0.0.1  │  HOST MACHINE
  index.html  (shell, postMessage)       │                     │  (shell bridge — optional)
  Dashboard ─── iframe (HTTP) ───────┐   │  shell-proxy.py      │   scripts/ttyd-shells.sh
  FS Explorer / "copy to shell" ─────┼───┼─▶ 127.0.0.1:768x ────┼──▶  ttyd ×N  (private UNIX socket)
        (short WebSocket)            │   │  ?session=<token>    │      → tmux  (shared session / slot)
  config/shell-session.js  (token)  ─┘   │  or 403              │      → bash · zsh · pwsh
  localStorage (config, checklists, log) │                     │
  encrypted vault (opt-in, AES-GCM)      │                     │
served from file://  or  nginx / Docker  │                     │
```

The shell bridge is started by `scripts/ttyd-shells.sh` and is entirely
optional. Each `ttyd` runs on a private UNIX socket; `scripts/shell-proxy.py`
publishes `127.0.0.1:768x` in its place and only forwards a request that
carries the session token minted at `start` (the Dashboard adds it from the
generated `config/shell-session.js`) — a page in another tab has no token and
gets a `403`. The token is revoked at `stop`. Still, prefer a dedicated
browser profile and stop the shells when done.

---

## Running it

### Locally (no server)

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000        # then http://localhost:8000
```

`file://` works too — there are no cross-page `fetch()` calls anywhere.

### Docker

```bash
docker build -t neonflare .
docker run -d --name neonflare --restart unless-stopped -p 8080:80 neonflare
# http://localhost:8080
```

The image is `nginx:alpine` + this folder. `.dockerignore` and the `nginx.conf`
`deny` rules keep internal files (`Jenkinsfile`, `web.config`, `nginx.conf`,
`scripts/`, dotfiles) out of / unreachable from the served webroot.

### Behind your own nginx

`nginx.conf` is a complete `server {}` block, ready to drop straight into
`conf.d/` — or copy the hardening rules out of it (security headers, short
cache lifetime, internal-file `deny` blocks) into a server block you already
manage. It listens on `*:80` with `server_name _;`, a catch-all default; if
your nginx already has its own default server for port 80 (a fresh
Debian/Ubuntu install ships one at `sites-enabled/default`), disable that one
first, or `nginx -s reload` fails with "duplicate default server".

### IIS

Copy the folder into the site root; `web.config` carries the equivalent cache
rule, plus `hiddenSegments` rules matching `nginx.conf`'s `deny` blocks
(`Jenkinsfile`, `nginx.conf`, `scripts/`, dotfiles).

### CI

[`Jenkinsfile`](Jenkinsfile) is a declarative pipeline: build the image, push
it to a registry, then `docker rm -f` any previous container and `docker run`
the fresh image straight on the build node (no Kubernetes for the running
site). It is wired for this repo's own setup — a Gitea registry and a
`localrepo` container on port 80; change the `environment` block and the
container name for yours.

---

## Shell terminals (optional backend)

The dashboard's shell panels — and everything the filesystem explorer does —
are [ttyd](https://github.com/tsl0922/ttyd) instances wrapped in `tmux`,
started by a helper script. Each `ttyd` runs on a **private UNIX socket**;
`scripts/shell-proxy.py` (also started by the helper) publishes
`127.0.0.1:768x` and only forwards requests carrying the session token minted
at `start` — see the Architecture section above.

```bash
# needs: ttyd, tmux, python3  (and zsh / pwsh if you want those shell types)

# Debian / Ubuntu / Kali
sudo apt install tmux

# ttyd: package name varies by distro, or grab a binary from
# https://github.com/tsl0922/ttyd/releases
sudo wget -O /usr/local/bin/ttyd https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64
sudo chmod +x /usr/local/bin/ttyd

scripts/ttyd-shells.sh start [count]   # default 6 per type
scripts/ttyd-shells.sh status
scripts/ttyd-shells.sh stop
```

Ports (the proxy's): bash `7681+`, zsh `7691+`, PowerShell `7701+` (one per
slot). Without this running, everything else works — the shell panels and the
explorer just have nothing to connect to. tmux is what lets "copy to shell" and the
explorer's automatic commands land in the terminal you're actually looking
at; see the comments in
[`assets/script/shells-host.js`](assets/script/shells-host.js) and
[`assets/script/fs-explorer.js`](assets/script/fs-explorer.js).

---

## Configuration & data

- **`config/*.js`** and **`config/tools/*.js`** are *seed* files — starting
  values only. The moment you change something in the UI, `localStorage`
  becomes the single source of truth and the seed file is ignored.
- Everything you build — dashboards, panel layouts, network nodes, topology,
  tool commands, GRC answers and notes, findings, explorer bookmarks, theme,
  language — is **per-browser**, in `localStorage`. Nothing leaves the
  machine.
- **Settings → Assistant & réinitialisation** exports/imports the whole lot
  as a single JSON file (encrypted if the vault is unlocked), and can reset
  any register individually.

---

## Project layout

```
index.html              app shell (sidebar + iframe router; theme/lang sync)
project/                dashboard, topology, findings, about, settings, neonflare-technology, dragons
grc/                    GRC hub + 58 checklist pages (grc/securite/{reseau,api,webapp,database})
tools/                  command-reference pages
config/                 seed data (config/tools/ = per-tool background)
assets/
  css/  script/  images/
  cheatsheet/           extra reference docs linked from tool pages
scripts/                ttyd-shells.sh (ttyd/tmux shell backend) + shell-proxy.py (token gate)
Dockerfile  nginx.conf  web.config  Jenkinsfile   deployment
```

---

## Notes

- No CSP is set — the app leans on inline `<script>` blocks on nearly every
  page (theme/language boot code). See the comment in `nginx.conf`.
- The shell backend gives whoever can reach the dashboard a real terminal on
  the host, and the filesystem explorer will issue commands into it. Keep the
  site itself access-controlled whenever the ttyd helper is running, even
  though ttyd only listens on loopback. Loopback is not a boundary against
  other software on the same machine: `ttyd` runs writable with no
  credential and no origin check, so **any page open in the same browser
  can reach `127.0.0.1:768x` and drive a shell** while one is running. Until
  that is fixed at the root, run the shells only during hands-on-keyboard
  work (`scripts/ttyd-shells.sh stop` as soon as you're done) and ideally
  from a browser profile dedicated to this tool.
- The explorer's "amber" actions (chmod, privesc, target change) are the only
  ones that modify the target; they run only after an explicit one-time
  in-app authorisation and are always echoed to the Journal.
- The GRC "register + tabbed panel" domains (Incidents / IR workspace,
  Continuity BCP/DRP, and the ones being added) share
  `assets/script/grc-registry-kit.js` — a dependency-free toolkit (schema
  helper, tabbed panel shell, list widgets, vault-gated JSON/Word/PDF/CSV
  exports). Loaded before each domain's own script. See
  `spec/grc-registry-upgrades/`.

## Disclaimer

This tool is provided for educational and authorised security-testing
purposes only. Only use it against systems you own or have explicit written
permission to test. The author (GothamBlood) assumes no responsibility and
disclaims all liability for any misuse, damage, or legal consequences
resulting from the use of this software. You are solely responsible for
ensuring your use complies with applicable laws and regulations.

## License

MIT — see [`LICENSE`](LICENSE).
