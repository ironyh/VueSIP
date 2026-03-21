#!/bin/bash
# VueSIP Health Monitoring Script
# Run via cron: */15 * * * * /home/irony/code/VueSIP/scripts/health-monitor-cron.sh
#
# Exits 0 on success, 1 on failure
# Outputs only on failure (cron-friendly)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${LOG_FILE:-/tmp/vuesip-health.log}"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK:-}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

notify_discord() {
    local message="$1"
    if [[ -n "$DISCORD_WEBHOOK" ]]; then
        curl -s -X POST "$DISCORD_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"content\": \"$message\"}" 2>/dev/null || true
    fi
}

cd "$PROJECT_DIR"

# Track overall health
HEALTHY=true
ERRORS=()

# 1. Run test suite
log "Running test suite..."
if ! npm test -- --run 2>&1 | tail -5 >> "$LOG_FILE"; then
    ERRORS+=("Tests failed")
    HEALTHY=false
fi

# 2. Check TypeScript compilation
log "Checking TypeScript..."
if ! npx tsc --noEmit 2>&1 | tail -5 >> "$LOG_FILE"; then
    ERRORS+=("TypeScript compilation errors")
    HEALTHY=false
fi

# 3. Build key templates
for template in pwa-softphone basic-softphone; do
    log "Building $template..."
    if ! cd "templates/$template" && npm run build >> "$LOG_FILE" 2>&1; then
        ERRORS+=("$template build failed")
        HEALTHY=false
    fi
    cd "$PROJECT_DIR"
done

# Report status
if $HEALTHY; then
    log "✅ VueSIP health check passed"
    exit 0
else
    log "❌ VueSIP health check FAILED: ${ERRORS[*]}"
    notify_discord "⚠️ VueSIP health check failed: ${ERRORS[*]}"
    exit 1
fi
