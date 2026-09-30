#!/usr/bin/env bash
# Point d'entrée WSL (Windows) des shells embarqués du Dashboard.
#
# Ne réimplémente RIEN : fait les vérifications propres à WSL, puis
# délègue à ../ttyd-shells.sh, qui reste la seule source de vérité
# (socket UNIX privée, jeton de session, révocation, arrêt sur
# inactivité). Mêmes commandes, passées telles quelles :
#
#   scripts/wsl/ttyd-shells.sh start [count]
#   scripts/wsl/ttyd-shells.sh status
#   scripts/wsl/ttyd-shells.sh stop
#
# Depuis Windows : scripts\wsl\start-shells.cmd (double-clic).

set -euo pipefail

WSL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(dirname "$WSL_DIR")"
REPO_ROOT="$(dirname "$SCRIPTS_DIR")"
MAIN="$SCRIPTS_DIR/ttyd-shells.sh"

warn() { printf '[wsl] %s\n' "$*" >&2; }
die() { warn "$*"; exit 1; }

# 1) Sous WSL ? (osrelease : "...microsoft-standard-WSL2" en WSL2,
#    "...-Microsoft" en WSL1)
osrel="$(cat /proc/sys/kernel/osrelease 2>/dev/null || true)"
case "$osrel" in
  *WSL2*) ;;
  *[Mm]icrosoft*) warn "WSL1 détecté -- WSL2 recommandé (PowerShell : wsl --set-version kali-linux 2)." ;;
  *) warn "Pas sous WSL : sous Linux, utilise directement scripts/ttyd-shells.sh." ;;
esac

# 2) Script principal en CRLF (clone Windows fait avant .gitattributes) :
#    bash échouerait avec des erreurs illisibles ($'\r': command not found).
if grep -q $'\r' "$MAIN"; then
  die "scripts/ttyd-shells.sh a des fins de ligne Windows (CRLF). Corrige avec :
      sed -i 's/\\r\$//' scripts/ttyd-shells.sh scripts/wsl/ttyd-shells.sh
    ou reclone le dépôt (le .gitattributes garde désormais les .sh en LF)."
fi

# 3) XDG_RUNTIME_DIR : ttyd-shells.sh y range ses sockets privées et compte
#    sur son mode 0700. Sous WSL sans systemd, la variable pointe souvent
#    vers /run/user/<uid> qui n'existe pas -> repli sur un dossier 0700 à
#    nous (jamais /tmp partagé). Déterministe : start, status et stop
#    retombent sur le même dossier.
if [ -z "${XDG_RUNTIME_DIR:-}" ] || [ ! -d "$XDG_RUNTIME_DIR" ] || [ ! -w "$XDG_RUNTIME_DIR" ]; then
  fallback="/tmp/neonflare-runtime-$(id -u)"
  mkdir -p -m 700 "$fallback"
  [ -O "$fallback" ] || die "$fallback existe mais n'appartient pas à $(id -un) -- supprime-le et relance."
  chmod 700 "$fallback"
  export XDG_RUNTIME_DIR="$fallback"
fi

# 4) Dépendances + conseils (start seulement : stop/status doivent marcher
#    même si une dépendance a disparu entre-temps).
if [ "${1:-}" = "start" ]; then
  missing=()
  for bin in ttyd tmux python3; do
    command -v "$bin" >/dev/null 2>&1 || missing+=("$bin")
  done
  if [ ${#missing[@]} -gt 0 ]; then
    die "manquant : ${missing[*]} -- installe avec :
      sudo apt update && sudo apt install -y ${missing[*]}"
  fi
  # ttyd < 1.7 ne connaît pas -W (terminal en écriture) utilisé par le
  # script principal : le terminal s'ouvrirait en lecture seule ou pas du tout.
  ver="$(ttyd --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -n1 || true)"
  case "$ver" in
    0.*|1.[0-6]) die "ttyd $ver trop ancien (1.7+ requis). Binaire récent :
      sudo wget -O /usr/local/bin/ttyd https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64
      sudo chmod +x /usr/local/bin/ttyd" ;;
  esac
  case "$REPO_ROOT" in
    /mnt/[a-z]/*) warn "dépôt sur un disque Windows ($REPO_ROOT) : fonctionne, mais plus lent qu'un clone sous ~." ;;
  esac
fi

"$MAIN" "$@"

if [ "${1:-}" = "start" ]; then
  win_path=""
  command -v wslpath >/dev/null 2>&1 && win_path="$(wslpath -w "$REPO_ROOT" 2>/dev/null || true)"
  warn "ouvre le site depuis Windows :
      Chrome / Edge : ${win_path:-$REPO_ROOT}\\index.html
      Firefox       : dans WSL, à la racine du dépôt : python3 -m http.server 8000 --bind 127.0.0.1
                      puis http://127.0.0.1:8000"
fi
