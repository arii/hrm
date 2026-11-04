#!/bin/bash
# scripts/verify-isolated.sh — run an isolated dev server for verification.
#
# Never touches live: a disposable worktree (own .next, no token file, no
# .env.local), test-only env (dummy Spotify creds), and a dedicated port.
# The live dev server on :3000 keeps running untouched.
#
# Usage:
#   scripts/verify-isolated.sh [start [port]]   # default port 3100
#   scripts/verify-isolated.sh stop [port]
set -euo pipefail

PORT="${2:-3100}"
WORKTREE="/tmp/hrm-iso"
ENV_FILE="/tmp/hrm-iso.env"
LOG_FILE="/tmp/hrm-iso.log"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

die() {
  echo "❌ $*" >&2
  exit 1
}

# PIDs of the isolated server: processes rooted in the worktree running server.ts.
iso_pids() {
  for p in $(ls /proc | grep -E '^[0-9]+$'); do
    if [ "$(readlink "/proc/$p/cwd" 2>/dev/null)" = "$WORKTREE" ] &&
      grep -q "server\.ts" "/proc/$p/cmdline" 2>/dev/null; then
      echo "$p"
    fi
  done
}

cmd_stop() {
  mapfile -t pids < <(iso_pids)
  if [ "${#pids[@]}" -gt 0 ]; then kill "${pids[@]}" 2>/dev/null || true; fi
  sleep 2
  mapfile -t pids < <(iso_pids)
  if [ "${#pids[@]}" -gt 0 ]; then kill -9 "${pids[@]}" 2>/dev/null || true; fi
  sleep 1
  if (ss -tln 2>/dev/null || netstat -tln 2>/dev/null) | grep -q ":${PORT} "; then
    die "port ${PORT} still bound after stop (ss -tlnp | grep ${PORT})"
  fi
  echo "🛑 isolated server on :${PORT} stopped"
}

cmd_start() {
  if [ -n "$(cd "$REPO_ROOT" && git status --porcelain | grep -v '^??')" ]; then
    die "tracked files modified — commit first so the worktree matches HEAD"
  fi
  if (ss -tln 2>/dev/null || netstat -tln 2>/dev/null) | grep -q ":${PORT} "; then
    die "port ${PORT} already in use"
  fi

  # Fresh disposable worktree at HEAD (no .env.local, no token file there).
  git -C "$REPO_ROOT" worktree remove --force "$WORKTREE" 2>/dev/null || true
  git -C "$REPO_ROOT" worktree add --detach "$WORKTREE" HEAD >/dev/null
  rm -f "$WORKTREE"/.env "$WORKTREE"/.env.local "$WORKTREE"/.env.production \
    "$WORKTREE"/.env.development "$WORKTREE"/.env.development.local
  # Real install: Turbopack rejects a symlinked node_modules.
  pnpm --dir "$WORKTREE" install --prefer-offline >/dev/null

  # Test-only env (mirrors the Playwright webServer block; nothing live).
  cat >"$ENV_FILE" <<EOF
NODE_ENV=development
PORT=${PORT}
HOST=127.0.0.1
NEXTAUTH_SECRET=test-secret-isolated-verify-0123456789abcdef
NEXTAUTH_URL=http://127.0.0.1:${PORT}
SPOTIFY_CLIENT_ID=test_client_id
SPOTIFY_CLIENT_SECRET=test_client_secret
SPOTIFY_DEBUG=false
ALLOW_DEBUG_RESET=true
TESTING=true
NEXT_PUBLIC_TESTING=true
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
NEXT_PUBLIC_USE_NATIVE_TABLE=true
NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS=8
GOOGLE_DOC_WORKOUT_URL=https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
GOOGLE_DOC_IFRAME_URL=https://docs.google.com/spreadsheets/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true
WEBSOCKET_WATCHDOG_INTERVAL=5000
RATE_LIMIT_WINDOW_MS=60000
SPOTIFY_API_MAX_REQUESTS=30
INTERNAL_API_MAX_REQUESTS=100
GENERAL_API_MAX_REQUESTS=200
WS_MAX_CONNECTIONS=20
TRUST_PROXY_HOPS=1
SPOTIFY_POLLING_INTERVAL_MS=5000
SPOTIFY_DEVICE_POLLING_INTERVAL_MS=10000
EOF

  # Safety: refuse to start if live secrets leaked into the worktree.
  if [ -f "$WORKTREE/logs/spotify_tokens.json" ]; then
    die "live token file present in worktree — refusing to start"
  fi

  : >"$LOG_FILE"
  setsid -f sh -c "cd '$WORKTREE' && set -a && . '$ENV_FILE' && set +a && pnpm exec tsx --env-file='$ENV_FILE' server.ts 2>&1 | pnpm exec pino-pretty" \
    </dev/null >>"$LOG_FILE" 2>&1

  echo "⏳ waiting for isolated server on :${PORT} ..."
  for _ in $(seq 1 60); do
    if curl -s -m 3 -o /dev/null "http://127.0.0.1:${PORT}/api/health/simple"; then
      echo "✅ isolated server ready: http://127.0.0.1:${PORT} (log: ${LOG_FILE})"
      echo "   stop with: scripts/verify-isolated.sh stop ${PORT}"
      return 0
    fi
    sleep 3
  done
  echo "--- log tail ---" >&2
  tail -n 20 "$LOG_FILE" >&2
  die "isolated server did not become healthy"
}

case "${1:-start}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  *) die "usage: $0 [start|stop] [port]" ;;
esac
