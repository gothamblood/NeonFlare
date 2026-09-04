# NeonFlare

**A self-hostable operations dashboard for security work** — GRC checklists,
a pentest findings tracker, a tool/command library with click-to-terminal, a
drag-and-drop network map, and live shell panels, wrapped in a cyberpunk UI.

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
| **Dashboard** | Multiple named dashboards, each with its own panel layout (drag/resize), network panel, and **live shell terminals** (ttyd + tmux, see below). "Copy to shell" on any command in the Tools pages types it straight into a terminal. |
| **Linked tabs** | A `🔗 Link` toggle in the dashboard toolbar routes this browser tab's "Shell" actions into *another* open tab — pick commands in one window, run them in the terminal of another. |
| **GRC** | 58 checklist pages across five hubs — Governance/Risk/Compliance, Network, API, WebApp and Database security — with coverage %, a per-item change-log (timestamp + author), plus asset / risk / incident registers. |
| **Findings** | A lightweight pentest engagement + findings tracker. |
| **Topology** | Drag-and-drop network diagram editor with nestable "container" nodes; layout persists per browser. |
| **Tools** | Curated command references (recon, web, AD, linux, windows, cloud, k8s, docker, C2, …) with placeholder substitution (`<IP>`, `<wordlist>`), copy-to-clipboard and copy-to-shell. Two "custom" pages for your own commands. |
| **Settings** | Themes — Standard / Neon Terminal / Blade Runner / Black ICE / **Custom colour picker**; per-page background & particle effects; sidebar page visibility; shell opacity; language (FR / EN); dashboards manager; full config export/import as one JSON file. |
| **Encryption vault** *(optional)* | Passphrase-derived AES-GCM (WebCrypto) encryption at rest for the Network / Topology / GRC registers. Off by default; the passphrase is never stored. |
| **Onboarding** | A short guided tour on first load, re-launchable from Settings. |

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

Point a server block at the folder and copy in the hardening rules from
[`nginx.conf`](nginx.conf) (security headers, short cache lifetime, and the
internal-file `deny` blocks). `web.config` carries the equivalent cache rule
for IIS.

### CI

[`Jenkinsfile`](Jenkinsfile) is a declarative-pipeline example — build the
image, push it to a registry, `docker run` it on the build node. Fill in the
`environment` block (`REGISTRY`, `IMAGE_NAME`, `REGISTRY_CREDENTIALS`,
`DEPLOY_NAME`, `HOST_PORT`) for your setup.

---

## Shell terminals (optional backend)

The dashboard's shell panels are [ttyd](https://github.com/tsl0922/ttyd)
instances wrapped in `tmux`, started by a helper script. They bind to
**loopback only** and are never exposed by the site itself.

```bash
# needs: ttyd, tmux  (and zsh / pwsh if you want those shell types)
scripts/ttyd-shells.sh start [count]   # default 6 per type
scripts/ttyd-shells.sh status
scripts/ttyd-shells.sh stop
```

Ports: bash `7681+`, zsh `7691+`, PowerShell `7701+` (one per slot). Without
this running, everything else works — the shell panels just have nothing to
connect to. tmux is what lets "copy to shell" land in the terminal you're
actually looking at; see the comments in
[`assets/script/shells-host.js`](assets/script/shells-host.js).

---

## Configuration & data

- **`config/*.js`** and **`config/tools/*.js`** are *seed* files — starting
  values only (mostly just a background image; the network / topology / about
  seeds ship empty). The moment you change something in the UI, `localStorage`
  becomes the single source of truth and the seed file is ignored.
- Everything you build — dashboards, panel layouts, network nodes, topology,
  tool commands, GRC answers and notes, findings, theme, language — is
  **per-browser**, in `localStorage`. Nothing leaves the machine.
- **Settings → Assistant & réinitialisation** exports/imports the whole lot as
  a single JSON file (encrypted if the vault is unlocked), and can reset any
  register individually.

---

## Project layout

```
index.html              app shell (sidebar + iframe router; theme/lang sync)
project/                dashboard, topology, findings, about, settings, neonflare-technology
grc/                    GRC hub + 58 checklist pages (grc/securite/{reseau,api,webapp,database})
tools/                  command-reference pages
config/                 seed data (config/tools/ = per-tool background)
assets/
  css/  script/  images/
  cheatsheet/           extra reference docs linked from tool pages
scripts/ttyd-shells.sh  starts the ttyd/tmux shell backend
Dockerfile  nginx.conf  web.config  Jenkinsfile   deployment
```

---

## Notes

- No CSP is set — the app leans on inline `<script>` blocks on nearly every
  page (theme/language boot code). See the comment in `nginx.conf`.
- The shell backend gives whoever can reach the dashboard a real terminal on
  the host. Keep the site itself access-controlled if the ttyd helper is
  running, even though ttyd only listens on loopback.

## Disclaimer

This tool is provided for educational and authorised security-testing
purposes only. Only use it against systems you own or have explicit written
permission to test. The author (GothamBlood) assumes no responsibility and
disclaims all liability for any misuse, damage, or legal consequences
resulting from the use of this software. You are solely responsible for
ensuring your use complies with applicable laws and regulations.

## License

MIT — see [`LICENSE`](LICENSE).
