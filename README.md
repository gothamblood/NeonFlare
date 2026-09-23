<p align="center">
  <img src="assets/images/dragon4_logo.png" width="200" alt="NeonFlare">
</p>

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
| **Dashboard** | Multiple named dashboards, each with its own panel layout (drag/resize): network panel, **live shell terminals** (ttyd + tmux, see below), and the **filesystem explorer**. "Copy to shell" on any command in the Tools pages types it straight into a terminal. Panels can be hidden per dashboard (`☰ Panneaux`). A first-time user starts with four ready-made dashboards: **Dashboard** (network + system log), **Système d’attaque** (shells, with a Bash already open, + tools), **File Explorer** and **GRC & Website** (GRC coverage panel and header, upcoming reviews, Website); the guided tour opens the right one at each step, and existing setups are left untouched. The network status HUD (gauge + "NODES ONLINE") only shows on dashboards that display the Network panel; a node marked `soon` (e.g. GothamTech.ca, not online yet) is shown greyed as "coming soon", never checked nor counted. A fresh Network panel lists NeonFlare.ca, the GothamBlood GitHub and GothamTech.ca. If a terminal is shown while the ttyd scripts aren't running, a self-dismissing notice says to run `scripts/ttyd-shells.sh start`; once it is up, the terminals reconnect on their own (no reload needed). |
| **Filesystem explorer** | A dashboard panel ("Explorateur") that drives **one shell pane at a time** — a local shell or a reverse shell you caught in it. Read-only navigation: OS probe, directory listing, breadcrumb, hidden-files toggle, permission grid, text-file preview. Per-target **bookmarks** ("Intéressants"). **Énum presets** — SUID / SGID binaries, capabilities, world-writable dirs, cron, `sudo -l`, `id`/groups, `user.txt`/`root.txt`/`flag.txt` — run on the target; path results are clickable and auto-bookmarked. **GTFOBins / LOLBAS** pills on known privesc binaries. **Amber actions** (chmod, privesc, change target) require a one-time in-app authorisation, then run in the driven pane. Every command it issues is shown verbatim in the panel's own "Journal des commandes" and as a one-liner in the shared System log. Off by default — enable via `☰ Panneaux` or Settings → Sections du Dashboard. While its panel isn't visible (hidden on the current dashboard, or collapsed) it stays idle: no OS probe, nothing typed into any shell; it starts the moment the panel is shown. |
| **Linked tabs** | A `🔗 Link` toggle in the dashboard toolbar routes this browser tab's "Shell" actions into *another* open tab — pick commands in one window, run them in the terminal of another. |
| **GRC** | 64 checklist pages across six hubs — Governance/Risk/Compliance (the 15 ISO 27001 management domains: organizational context, governance, asset management, risk assessment, risk treatment, security controls, policies and directives, operating procedures, incident management, business continuity, document management, compliance management, supplier management, personal information protection, GRC performance and indicators; Continuity is split into 9 sub-sections: BIA, BCP, PCO, PGC, PCM, PRA, PSI, PRI, tests & exercises), Network, API, WebApp, Database and **Operational security** (7 measure domains: architecture, vulnerabilities, IAM, people & awareness, physical security, cloud, DevSecOps) — with coverage %, a per-item change-log (timestamp + author), stable item ids (adding or reordering items never shifts checked boxes; moved/merged pages and older JSON backups are migrated automatically, old URLs redirect), plus asset / risk / control / incident registers. Assets carry a monetary value (AV) and an "intellectual" type; risks also record the feared event and consequences; controls accept a "physical" type and an SoA justification; metrics carry an ISMS / BCP domain; risks get an optional **quantitative view** (SLE = AV × EF, ARO shown as "once every N years", ALE = SLE × ARO, AV defaulting to the linked assets' value, total ALE in the summary). Every page of the GRC hub (15 domains) also carries an **organization documentation** area (`spec/grc-fiches/`): one tab per element of the page (only one shown at a time, entry count on each tab, Previous / Next to follow the order), each with beginner guidance and an example. Elements come in four kinds: a **form** — "+ Add" opens predefined fields for that element, as many entries as needed (e.g. mission & vision statements, interested parties, committees, risk appetite, policy articles, procedure steps, incident playbooks, SLAs); the page's **existing register** moved into its tab (assets, risks, treatment plans, controls, incidents + IR workspace, BCP/DRP, documents, compliance, privacy, suppliers, metrics — unchanged data and exports); a read-only **view** of a register (asset / risk owners, resources by asset type, P × I matrix and risk map, plans by strategy, residual risk and ROSI, formal acceptances, SoA with justification, controls by framework and type, risk ↔ control matrix, compliance obligations by standard, audits, findings and corrective actions, consents, PIAs, retention, supplier clauses and critical dependencies, KPI / KRI / RAG dashboard); or a **link** to where the element is documented. Form fields can reference entries of other registers (controls, suppliers, incidents, processes, ISMS objectives). About 110 text fields offer **suggestion lists** (autocomplete: frequencies, deadlines, retention periods, channels, classification, audiences, standard roles plus the roles and holders entered under Governance, assets, suppliers…) while still accepting free text — a built-in drop-down (▾, same look in every browser) shows the whole list on click even when the field is already filled, filters as you type and works with the keyboard; a standard term is stored as a code and shown in the site language (FR/EN). Required fields are marked with *, and an empty field shows an example in grey italics ("e.g. …", taken from the element's example). Every date field in GRC and Settings has a **themed date picker** (follows the accent colour and the 4 themes, FR/EN, keyboard-friendly); typing stays possible (YYYY-MM-DD, or DD/MM/YYYY in French / MM/DD/YYYY in English, is normalised) and an invalid date is refused with a message instead of being saved. A Word/PDF export produces the page's document (e.g. "Context of the organization"), plus JSON export/import; vault-encrypted (one unlock screen per page) and included in the full backup. The page's checklist stays separate, for progress tracking only. **GRC chain** (`spec/grc-fiches/chaine.md`): sections are linked by real ids — register forms get link selectors (asset ↔ processes / suppliers / scope, risk ↔ assets / stakes / threats / risk sources / scenario, treatment plan ↔ controls and treated risks, control ↔ risks / obligations / Annex A controls, incident ↔ assets / risks / controls, obligation ↔ controls / source requirement, document ↔ controls, metric ↔ risk / objective / control, BCP ↔ covered process and linked dependencies) and every entry shows **"depends on / used by"**. Deleting something others depend on warns first, imports keep and flag dangling links, and editing an entry flags everything downstream **"to review"**. A **chain panel** on the GRC hub lists 21 break rules (e.g. high-priority stake without risk, risk to treat without plan, applicable Annex A control without implementation, vital process without continuity plan) with one-click repair (the target form opens pre-filled and linked). **Statement of Applicability** over the 93 ISO/IEC 27001:2022 Annex A controls (reworded labels + reference, never the standard's text; indicative ISO/IEC 27002 attributes with filters; Word / PDF / CSV export). **Beginner path**: a "Start here" page (the 15 steps in chain order with prerequisites, participants and indicative effort; a starting diagnostic whose answers are proposed as Context entries; the ISO 27001 / ISO 22301 required-documents checklist with a computed status; a fictional FSociety example with zero chain breaks, removable; starter templates by organization profile), two new domains under Operational security (**People & awareness**, ISO 27001 A.6, and **Physical security**, A.7), essential-first tabs with "Show all", "Start from the example" on every form, a per-page **document status** (draft → in review → approved, back to "under revision" on any change), a checklist linked to its tabs, next-step navigation between pages, cross-actions (e.g. stake → create risk), a **"To do" panel** (hub + dashboard: items to review, severe breaks, due dates) and a global search. ISO additions: system changes (27001 6.3), ISMS resources, a **single improvement / corrective-action register** (other pages show filtered views; existing Continuity actions migrated without loss), a structured management review with auto-prepared inputs, an internal audit programme, risk sources / scenarios / opportunities / rating scales / consultation / threat intelligence, a **time-based BIA** with a suggested MTPD, per-plan documentation on the 9 Continuity sub-pages (continuity policy and objectives, call tree, crisis log, message templates, recovery order…), supplier continuity capabilities, security in projects, and light linked documentation on the 38 technical hub pages. Limits: approvals are declarative, the app is local, readiness figures are indicative — not a substitute for an audit. Incidents open into an **IR workspace** (interactive timeline, investigation notes / hypotheses / IOCs, tasks kanban, case-file export as JSON + Word/PDF + IOC list). **BCP/DRP register** on the Continuity page: BIA (MTPD/MAO/RTO/RPO/MBCO with RTO ≤ MAO ≤ MTPD and RPO ≤ RTO consistency alerts), dependencies with SPOF flagging, a SPOC and a crisis decision cell (CCD) per plan, redundancy, an ordered recovery procedure, a test log, and a full case-file export plus a one-page recovery card. **Vendor register** on the Suppliers page: third-party risk scoring, contract clauses with a contract-expiry alert, certification tracking with expiry badges, an onboarding/offboarding checklist and periodic review, incident cross-links, plus vendor report / one-page sheet / register CSV exports. **Vulnerability tracker** on the Vulnerabilities page (Operational security): end-to-end lifecycle with a CVSS-derived severity and SLA due date, an SLA-breach alert, a status-change timeline, affected-asset / incident / risk cross-links, a risk-acceptance block with an expiry alert, and severity-sorted Word/PDF report plus register CSV exports. **Privacy register** on the Personal information protection page (Québec Law 25): a ROPA of processing activities — legal basis, cross-border transfers with a missing-safeguard alert, retention with an expiry alert, a DPIA score (sensitivity × volume × exposure) with a required-not-done alert, periodic review — plus a data-subject-request log with an automatic 30-day deadline and an overdue alert; ROPA Word/CSV, DSR log CSV and one-page acknowledgement exports. Each processing activity also carries structured data categories (sensitivity/volume/source), a consent log (type, obtained/expiry/withdrawal, proof), recipient↔vendor cross-links, a retention destruction method and planned-deletion date, and a formal PIA approval workflow (draft/in-progress/approved, with a pending-approval alert). A third register on the same page tracks **confidentiality breaches** (Law 25): affected-individual count, severity, CAI-notification and individuals-notified tracking with a high-severity/not-notified alert, corrective measures, linked processing activities and an optional link to a security incident; breach Word/CSV exports. The asset register can flag an asset as holding personal data and link it to the processing activities that depend on it. Settings carries a privacy-officer (RPRP) card (name, contact, delegate, appointment date). **Compliance register** on the Compliance management page: obligations (law / standard / contract) with an applicability flag (SoA), a compliance status and a periodic assessment with an overdue alert, plus audits carrying findings — each a non-conformity with a severity, a corrective action with an overdue alert and a verification state; compliance-rate summary, SoA Word/CSV, compliance report and per-audit report exports. **Access-recertification register** on the IAM page (Operational security): review campaigns with a per-line keep/revoke/reduce decision, a bulk paste-parser, a progress bar, an overdue-deadline alert and a sign-off that requires every line decided and then locks them (re-open logged), plus a JML (joiner/mover/leaver) log with a "leaver not deprovisioned > 7 days" alert; campaign report and lines CSV exports. **Metrics register** on the Metrics page: KPIs/KRIs each with a target, amber/red thresholds and a direction, a measurement series drawn as a vanilla SVG sparkline (target line + threshold bands), a RAG status, a trend vs. the previous measurement and a measurement-overdue alert; the summary is a small RAG dashboard, plus periodic report, definitions CSV, series CSV and JSON exports. **Risk-treatment plan** — a standalone, shareable register on the Risk-treatment page (`grc-treatment-plans.js`): a plan holds a strategy (avoid/mitigate/transfer/accept) with rationale, an ordered action plan with owners/due-dates and an overdue alert, and linked controls. It's many-to-many: a plan can be attached to **multiple risks at once** (one MFA rollout can cover several risks), and a single risk can in turn cumulate **several plans** (e.g. MFA + network segmentation on the same risk) — create a new plan inline or link an existing one, from the Risk-analysis page, as many times as needed. Residual score (likelihood × impact, inherent→residual reduction) and the risk-acceptance block (required when the linked plan's strategy is *accept* or the residual is non-zero, with a review-due alert) stay per-risk even when the plan is shared. A quantitative residual (EF / ARO after controls, annual control cost) gives the residual ALE, the ALE reduction and the ROSI, with an alert when the residual ALE exceeds the initial one. Legacy risks with the old embedded plan are migrated into the shared register automatically on first load, nothing lost. A treatment summary above the risk register plus a treatment CSV export. **Document register** shared across the Procedures / Directives / Documentation / Governance pages (one store, each page filtered by document type): editorial lifecycle (draft → in-review → approved → published → under-revision → retired), a free-form version with a "new version" button that bumps it and appends a version-log entry, an approver (feeding an authority register), a periodic review with an overdue alert, a stale-draft alert (never approved for 90+ days), covered controls and document-to-document relations; the Governance page also shows a read-only authority table (document → approver), plus document-summary Word/CSV, authority-register CSV and JSON exports. A seventh sidebar entry under GRC, **External resources**, links out to curated third-party references (SANS policy templates, vendor contract clauses, incident-response retainer examples), official Québec Law 25 sources (CAI guides, the confidentiality-incident notification form, the law's text on Légis Québec), and the official portals for the main security frameworks (ISO, NIST Cybersecurity Framework, CIS Controls v8) — clearly labelled free vs. reference-only vs. official source, with a not-legal-advice disclaimer. |
| **Findings** | A lightweight pentest engagement + findings tracker, with an explicit mapping to GRC controls. |
| **Topology** | Drag-and-drop network diagram editor with nestable "container" nodes; layout persists per browser. |
| **Tools** | Curated command references (recon, OSINT, web, AD, lateral movement, post-exploitation, linux, windows, AWS, Azure, Terraform, docker, kubernetes, C2, misc, …) with placeholder substitution (`<IP>`, `<wordlist>`), copy-to-clipboard and copy-to-shell. Two "custom" pages for your own commands. |
| **Settings** | Themes — Standard / Neon Terminal / Blade Runner / Black ICE / **custom colour picker**; per-page background & particle effects; sidebar page visibility (including a per-section toggle for each of the 7 GRC submenu entries); shell opacity (75 % by default); **branding** (Registries → Config Branding); language (FR / EN); dashboards manager; full config export/import as one JSON file, with per-register reset. |
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
- **`config/branding.js`** — the identity shown by the interface (signature,
  browser-tab title and icon, network-status header, Topology subtitle, About
  links title, "… Tech" menu label). Defaults to GothamBlood; edit this one
  file to make a deployment your own — or, per browser, from **Settings →
  Registries → Config Branding** (field by field: an emptied field falls back
  to the file's value; included in the full backup and per-register reset).
  Text only (never HTML), relative logo path only; a missing or empty field
  keeps the original text.
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
grc/                    GRC hub + 61 checklist pages (grc/continuite/, grc/securite/{reseau,api,webapp,database,operationnelle})
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

- All 83 pages now ship a strict CSP —
  `script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'`
  (duplicated as a real header in `nginx.conf` since `frame-ancestors` has no
  effect in a `<meta>`) — after externalizing every inline `<script>` block
  and `on*=""` handler into `assets/script/inline/`. `project/settings.html`
  (2800+ lines, 54 handlers — the biggest single page on the site) was the
  last holdout and is now converted too. A CI guard
  (`scripts/check-csp-inline.py`, wired into the Jenkinsfile) now fails the
  build if a bare `<script>` or an `on*=""` handler reappears in any
  delivered page. See the comment in `nginx.conf`.
- The shell backend gives whoever can reach the dashboard a real terminal on
  the host, and the filesystem explorer will issue commands into it. `ttyd`
  itself listens on a private UNIX socket, unreachable from the browser;
  `scripts/shell-proxy.py` is the only thing exposed on `127.0.0.1:768x` and
  it 403s anything without the session token minted at `start`. Still, the
  token gate only stops *other origins* from driving the shell — any script
  running on the dashboard's *own* origin (a missed XSS sink) can. So run
  the shells only during hands-on-keyboard work, ideally from a browser
  profile dedicated to this tool, and stop them when done
  (`scripts/ttyd-shells.sh stop`). The proxy also auto-stops everything on
  its own after `IDLE_TIMEOUT_SECONDS` (default 1800 = 30 min, `0` disables)
  with no traffic relayed on any route.
- The explorer's "amber" actions (chmod, privesc, target change) are the only
  ones that modify the target; they run only after an explicit one-time
  in-app authorisation and are always echoed to the Journal.
- The GRC "register + tabbed panel" domains (Incidents / IR workspace,
  Continuity BCP/DRP, and the ones being added) share
  `assets/script/grc-registry-kit.js` — a dependency-free toolkit (schema
  helper, tabbed panel shell, list widgets, vault-gated JSON/Word/PDF/CSV
  exports). Loaded before each domain's own script. See
  `spec/grc-registry-upgrades/`. The GRC layout (Operational security
  section, Compliance + privacy merge, Continuity sub-pages, stable checklist
  item ids + migration, quantitative risk / continuity fields) is described in
  `spec/grc-restructure/`.

## Disclaimer

This tool is provided for educational and authorised security-testing
purposes only. Only use it against systems you own or have explicit written
permission to test. The author (GothamBlood) assumes no responsibility and
disclaims all liability for any misuse, damage, or legal consequences
resulting from the use of this software. You are solely responsible for
ensuring your use complies with applicable laws and regulations.

## License

MIT — see [`LICENSE`](LICENSE).
