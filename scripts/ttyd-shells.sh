#!/usr/bin/env bash
# Starts/stops the ttyd instances backing the dashboard's shell panels
# (dashboard.html, "+ Shell" dropdown). One instance per slot, bound
# to loopback only -- never reachable from the network, even if this
# site is also served publicly.
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
# port (the browser's iframe, and that one-shot injection) attach to
# the same shared session. See assets/script/shells-host.js.
#
# Usage:
#   scripts/ttyd-shells.sh start [count]   # default 6 per shell type
#   scripts/ttyd-shells.sh stop
#   scripts/ttyd-shells.sh status

set -euo pipefail

declare -A BASE_PORT=( [bash]=7681 [zsh]=7691 [pwsh]=7701 )
declare -A SHELL_CMD=( [bash]=bash [zsh]=zsh [pwsh]=pwsh )
DEFAULT_SLOTS=6
PID_DIR="${XDG_RUNTIME_DIR:-/tmp}/dashboard-ttyd"
TMUX_PREFIX="dashboard-shell"
TMUX_CONF="$PID_DIR/tmux.conf"

mkdir -p "$PID_DIR"

port_for_slot() { echo $(( ${BASE_PORT[$1]} + $2 - 1 )); }
pid_file_for_slot() { echo "$PID_DIR/shell-$1-$2.pid"; }
tmux_session_for_slot() { echo "$TMUX_PREFIX-$1-$2"; }

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
  echo "set-option -g window-size largest" >"$TMUX_CONF"

  for type in "${!BASE_PORT[@]}"; do
    if ! command -v "${SHELL_CMD[$type]}" >/dev/null 2>&1; then
      echo "skipping $type: ${SHELL_CMD[$type]} not installed"
      continue
    fi
    for slot in $(seq 1 "$slots"); do
      port=$(port_for_slot "$type" "$slot")
      pid_file=$(pid_file_for_slot "$type" "$slot")
      session=$(tmux_session_for_slot "$type" "$slot")

      if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "$type $slot already running on 127.0.0.1:$port (pid $(cat "$pid_file"))"
        continue
      fi

      ttyd -p "$port" -i lo -W -T xterm-256color \
        tmux -f "$TMUX_CONF" new-session -A -s "$session" "${SHELL_CMD[$type]}" \
        >"$PID_DIR/shell-$type-$slot.log" 2>&1 &
      echo $! > "$pid_file"
      echo "$type $slot started on 127.0.0.1:$port (pid $!, tmux session $session)"
    done
  done
}

stop() {
  for type in "${!BASE_PORT[@]}"; do
    for slot in $(known_slots "$type"); do
      pid_file=$(pid_file_for_slot "$type" "$slot")
      session=$(tmux_session_for_slot "$type" "$slot")
      if [ -f "$pid_file" ]; then
        pid="$(cat "$pid_file")"
        if kill -0 "$pid" 2>/dev/null; then
          kill "$pid"
          echo "$type $slot (pid $pid) stopped"
        fi
        rm -f "$pid_file"
      fi
      # Killing ttyd's own process only detaches its tmux client -- the
      # shell keeps running inside the session (that's the point, so a
      # reconnect resumes it), so it needs killing separately here.
      tmux kill-session -t "$session" 2>/dev/null || true
    done
  done
}

status() {
  local any=0
  for type in "${!BASE_PORT[@]}"; do
    for slot in $(known_slots "$type"); do
      any=1
      port=$(port_for_slot "$type" "$slot")
      pid_file=$(pid_file_for_slot "$type" "$slot")
      if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "$type $slot: running on 127.0.0.1:$port (pid $(cat "$pid_file"))"
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
