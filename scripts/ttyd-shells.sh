#!/usr/bin/env bash
# Starts/stops the ttyd instances backing the dashboard's shell panels
# (dashboard.html, "+ Shell" dropdown). One instance per slot.
#
# Each ttyd listens on a PRIVATE UNIX socket ($PID_DIR/sock/), not a TCP
# port -- so the browser cannot reach it directly. A small local token
# proxy (scripts/shell-proxy.py) publishes 127.0.0.1:768x in its place and
# only forwards a request when it carries the random session token minted
# by this script's `start`. The token is handed to the page through the
# generated config/shell-session.js and added to the terminal iframe URL
# and to every short-lived WebSocket URL. This is the root fix for the
# cross-origin RCE described in PlanDeTestSecurite-ShellBridge.txt (0.1);
# see PlanCorrectif-ShellBridge-0.1.txt for the design.
#
# Three shell types, each with its own port range so the dashboard can
# pick which one to open. The dashboard itself has no cap on how many
# shells you can open of a given type -- it just walks up that type's
# port range. How many are actually usable is however many ttyd
# instances are running here.
#
# Each slot's shell runs inside a tmux session (new-session -A: attach
# if it already exists) instead of being ttyd's direct child. ttyd
# normally spawns a brand new process per WebSocket connection, so
# without tmux, the "copy to shell" dashboard feature -- which injects
# a command over its own short-lived WebSocket connection -- would land
# in an invisible shell nobody is looking at instead of the one shown
# in the browser. Wrapping in tmux makes every connection to a given
# slot (the browser's iframe, and that one-shot injection) attach to
# the same shared session. See assets/script/shells-host.js.
#
# Usage:
#   scripts/ttyd-shells.sh start [count]   # default 6 per shell type
#   scripts/ttyd-shells.sh stop
#   scripts/ttyd-shells.sh status
#
# IDLE_TIMEOUT_SECONDS=1800 (env, default shown) makes the proxy call
# `stop` on its own once no byte has been relayed on any route for that
# long -- the token gate closes the cross-origin hole, but a shell left
# running unattended for hours is still more exposure than one running for
# minutes. Set to 0 to disable (shells then only stop when you run `stop`).

set -euo pipefail

declare -A BASE_PORT=( [bash]=7681 [zsh]=7691 [pwsh]=7701 )
declare -A SHELL_CMD=( [bash]=bash [zsh]=zsh [pwsh]=pwsh )
DEFAULT_SLOTS=6
: "${IDLE_TIMEOUT_SECONDS:=1800}"
PID_DIR="${XDG_RUNTIME_DIR:-/tmp}/dashboard-ttyd"
TMUX_PREFIX="dashboard-shell"
TMUX_CONF="$PID_DIR/tmux.conf"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SOCK_DIR="$PID_DIR/sock"
TOKEN_FILE="$PID_DIR/token"
PROXY_PID_FILE="$PID_DIR/shell-proxy.pid"
PROXY_SCRIPT="$SCRIPT_DIR/shell-proxy.py"
SESSION_JS="$REPO_ROOT/config/shell-session.js"

mkdir -p "$PID_DIR"

port_for_slot() { echo $(( ${BASE_PORT[$1]} + $2 - 1 )); }
pid_file_for_slot() { echo "$PID_DIR/shell-$1-$2.pid"; }
tmux_session_for_slot() { echo "$TMUX_PREFIX-$1-$2"; }
sock_for_slot() { echo "$SOCK_DIR/shell-$1-$2.sock"; }

gen_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    od -An -tx1 -N32 /dev/urandom | tr -d ' \n'
  fi
}

# Rewrite the single canonical `var TOKEN = "..."` line in
# config/shell-session.js. $1 empty -> revoke.
set_session_token() {
  [ -f "$SESSION_JS" ] || return 0
  sed -i.bak -E 's#^([[:space:]]*var TOKEN = )"[^"]*";#\1"'"$1"'";#' "$SESSION_JS"
  rm -f "$SESSION_JS.bak"
}

proxy_running() {
  [ -f "$PROXY_PID_FILE" ] && kill -0 "$(cat "$PROXY_PID_FILE")" 2>/dev/null
}

stop_proxy() {
  if [ -f "$PROXY_PID_FILE" ]; then
    local pid; pid="$(cat "$PROXY_PID_FILE")"
    kill "$pid" 2>/dev/null || true
    rm -f "$PROXY_PID_FILE"
  fi
}

# (Re)start the token proxy with a route for every live slot.
start_proxy() {
  local token="$1"
  local routes=() type slot port sock pidf
  for type in "${!BASE_PORT[@]}"; do
    for slot in $(known_slots "$type"); do
      pidf=$(pid_file_for_slot "$type" "$slot")
      [ -f "$pidf" ] && kill -0 "$(cat "$pidf")" 2>/dev/null || continue
      port=$(port_for_slot "$type" "$slot")
      sock=$(sock_for_slot "$type" "$slot")
      routes+=( "--route=$port=$sock" )
    done
  done
  [ ${#routes[@]} -gt 0 ] || return 0

  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required for the shell token proxy -- install it and retry." >&2
    exit 1
  fi

  local idle_args=() idle_note=""
  if [ "$IDLE_TIMEOUT_SECONDS" -gt 0 ] 2>/dev/null; then
    idle_args=( --idle-timeout "$IDLE_TIMEOUT_SECONDS"
                --idle-stop-cmd "\"$SCRIPT_DIR/ttyd-shells.sh\" stop" )
    idle_note=", idle-timeout ${IDLE_TIMEOUT_SECONDS}s"
  fi

  stop_proxy
  ( umask 077; printf '%s' "$token" > "$TOKEN_FILE" )
  python3 "$PROXY_SCRIPT" --token-file "$TOKEN_FILE" "${routes[@]}" "${idle_args[@]}" \
    >"$PID_DIR/shell-proxy.log" 2>&1 &
  echo $! > "$PROXY_PID_FILE"
  echo "token proxy started on 127.0.0.1:768x (pid $!, ${#routes[@]} routes$idle_note)"
}

# For stop/status: every slot that has ever been started (a pid file
# exists for it), not just DEFAULT_SLOTS -- so a later `start 10`
# still gets fully stopped by a plain `stop`.
known_slots() {
  local type="$1"
  for f in "$PID_DIR"/shell-"$type"-*.pid; do
    [ -e "$f" ] || continue
    basename "$f" | sed -E "s/shell-$type-([0-9]+)\.pid/\1/"
  done | sort -n
}

start() {
  local slots="${1:-$DEFAULT_SLOTS}"

  if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux is required (shells run inside a tmux session so the" >&2
    echo "\"copy to shell\" dashboard feature can attach and inject a" >&2
    echo "command instead of spawning a hidden shell) -- install it and retry." >&2
    exit 1
  fi
  # Applied via a config file passed to every "tmux new-session" call
  # below (rather than a one-off "tmux set-option -g" run here) because
  # no session exists yet at this point -- a tmux server started just to
  # set a global option, with nothing else keeping it alive, exits
  # immediately (exit-empty is on by default), so the option would be
  # lost by the time a shell is actually opened and a real server
  # starts. -f only takes effect for whichever call happens to be the
  # one that starts the server, but it's harmless to pass on every call
  # (a config file is a no-op against an already-running server).
  #
  # The option itself: server-wide, so a short-lived injection
  # connection (small/default terminal size) can never shrink the pane
  # actually shown in the browser -- without it, tmux's default
  # "latest" window-size mode resizes to whichever client was most
  # recently active, including a one-shot connection that's gone half
  # a second later.
  # mouse on: without it tmux ignores the scroll wheel entirely (its
  # default), so the browser terminal looks like it has no scrollback
  # at all -- reported as "can't scroll up" (2026-09-11). With it,
  # xterm.js/ttyd forwards wheel events as mouse escape sequences that
  # tmux turns into copy-mode scrolling on its own; no client-side
  # change needed. Minor trade-off: dragging to select text in the pane
  # now needs Shift+drag (mouse mode intercepts a plain drag as a tmux
  # pane/scroll gesture instead of a plain terminal text selection) --
  # standard tmux behavior, not specific to this setup.
  {
    echo "set-option -g window-size largest"
    echo "set-option -g mouse on"
  } >"$TMUX_CONF"

  # One session token per `start`. If a proxy from an earlier `start` is
  # still up, reuse its token so shells already open in the browser keep
  # working; otherwise mint a fresh one.
  local token
  if proxy_running && [ -s "$TOKEN_FILE" ]; then
    token="$(cat "$TOKEN_FILE")"
  else
    token="$(gen_token)"
  fi
  set_session_token "$token"
  mkdir -p "$SOCK_DIR"

  for type in "${!BASE_PORT[@]}"; do
    if ! command -v "${SHELL_CMD[$type]}" >/dev/null 2>&1; then
      echo "skipping $type: ${SHELL_CMD[$type]} not installed"
      continue
    fi
    for slot in $(seq 1 "$slots"); do
      port=$(port_for_slot "$type" "$slot")
      pid_file=$(pid_file_for_slot "$type" "$slot")
      session=$(tmux_session_for_slot "$type" "$slot")
      sock=$(sock_for_slot "$type" "$slot")

      if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "$type $slot already running behind 127.0.0.1:$port (pid $(cat "$pid_file"))"
        continue
      fi

      # ttyd listens on a PRIVATE UNIX socket (not -p/-i lo): the browser
      # cannot reach it, only shell-proxy.py can. That socket lives under
      # $XDG_RUNTIME_DIR (mode 0700), so it's already reachable by this
      # user alone -- no ttyd-level credential is needed, and passing one
      # via `-c` would only leak it on the command line (visible in `ps` /
      # /proc/<pid>/cmdline to other local users -- Sweep3 §7.2a). The
      # proxy's ?session token stays the sole gate on the browser side.
      rm -f "$sock"
      ttyd -i "$sock" -W -T xterm-256color \
        tmux -f "$TMUX_CONF" new-session -A -s "$session" "${SHELL_CMD[$type]}" \
        >"$PID_DIR/shell-$type-$slot.log" 2>&1 &
      echo $! > "$pid_file"
      echo "$type $slot started behind 127.0.0.1:$port (pid $!, tmux session $session)"
    done
  done

  start_proxy "$token"
}

stop() {
  stop_proxy
  set_session_token ""          # revoke the token even for still-open tabs
  rm -f "$TOKEN_FILE"

  for type in "${!BASE_PORT[@]}"; do
    for slot in $(known_slots "$type"); do
      pid_file=$(pid_file_for_slot "$type" "$slot")
      session=$(tmux_session_for_slot "$type" "$slot")
      sock=$(sock_for_slot "$type" "$slot")
      if [ -f "$pid_file" ]; then
        pid="$(cat "$pid_file")"
        if kill -0 "$pid" 2>/dev/null; then
          kill "$pid"
          echo "$type $slot (pid $pid) stopped"
        fi
        rm -f "$pid_file"
      fi
      rm -f "$sock"
      # Killing ttyd's own process only detaches its tmux client -- the
      # shell keeps running inside the session (that's the point, so a
      # reconnect resumes it), so it needs killing separately here.
      tmux kill-session -t "$session" 2>/dev/null || true
    done
  done
  rmdir "$SOCK_DIR" 2>/dev/null || true
}

status() {
  if proxy_running; then
    echo "token proxy: running (pid $(cat "$PROXY_PID_FILE"))"
  else
    echo "token proxy: stopped"
  fi
  if [ -s "$TOKEN_FILE" ]; then
    echo "session token: active ($TOKEN_FILE)"
  else
    echo "session token: none"
  fi

  local any=0
  for type in "${!BASE_PORT[@]}"; do
    for slot in $(known_slots "$type"); do
      any=1
      port=$(port_for_slot "$type" "$slot")
      pid_file=$(pid_file_for_slot "$type" "$slot")
      if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "$type $slot: running behind 127.0.0.1:$port (pid $(cat "$pid_file"))"
      else
        echo "$type $slot: stopped"
      fi
    done
  done
  [ "$any" -eq 1 ] || echo "no shells started yet"
}

case "${1:-}" in
  start) start "${2:-}" ;;
  stop) stop ;;
  status) status ;;
  *)
    echo "Usage: $0 {start [count]|stop|status}" >&2
    exit 1
    ;;
esac
