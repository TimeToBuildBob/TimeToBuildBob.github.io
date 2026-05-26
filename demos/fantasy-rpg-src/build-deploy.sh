#!/usr/bin/env bash
# Reproducible build + deploy for the factory-built fantasy-rpg Phaser game.
#
# Source of truth: this directory (version-controlled, demos/fantasy-rpg-src/).
# Deploy target:   sibling demos/fantasy-rpg/ (the published bundle).
#
# Usage:
#   ./build-deploy.sh build      # install deps, run tests, vite build -> ./dist (default)
#   ./build-deploy.sh deploy     # build, then sync ./dist -> ../fantasy-rpg/
#   ./build-deploy.sh            # same as `build`
#
# The deploy step takes a coordination work-claim on `game:fantasy-rpg:deploy`
# (when the `coordination` CLI is available) so concurrent agent sessions cannot
# race on the shared website working tree — the bf03 deploy-collision failure
# mode, ErikBjare/bob#801.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

DEPLOY_TARGET="${DEPLOY_TARGET:-$APP_DIR/../fantasy-rpg}"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
err() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; }

build() {
  if [ ! -d node_modules ]; then
    log "Installing dependencies (npm ci)"
    npm ci
  fi
  log "Running tests (vitest)"
  npm run test
  log "Building production bundle (vite, base=/demos/fantasy-rpg/)"
  npm run build
  log "Build complete: $APP_DIR/dist"
}

deploy() {
  build

  if [ ! -d "$DEPLOY_TARGET" ]; then
    err "deploy target does not exist: $DEPLOY_TARGET"
    exit 1
  fi

  # Serialize the website-tree write so concurrent game sessions don't collide.
  local session claimed
  session="game-deploy-$$-$(date +%s)"
  claimed=0
  if command -v coordination >/dev/null 2>&1; then
    if coordination work-claim "$session" "game:fantasy-rpg:deploy" --ttl 10 >/dev/null 2>&1; then
      claimed=1
    else
      err "deploy claim denied — another session is deploying. Aborting."
      exit 1
    fi
  else
    log "coordination CLI not found; deploying without a lock"
  fi

  log "Syncing dist/ -> $DEPLOY_TARGET"
  rsync -a --delete "$APP_DIR/dist/" "$DEPLOY_TARGET/"

  if [ "$claimed" = 1 ]; then
    coordination work-complete "$session" "game:fantasy-rpg:deploy" >/dev/null 2>&1 || true
  fi

  log "Deployed. Review and commit demos/fantasy-rpg/ to publish:"
  log "  git add demos/fantasy-rpg && git commit -m 'deploy(game): fantasy-rpg'"
}

case "${1:-build}" in
  build) build ;;
  deploy) deploy ;;
  *) err "unknown command: ${1:-}"; echo "usage: $0 [build|deploy]" >&2; exit 2 ;;
esac
