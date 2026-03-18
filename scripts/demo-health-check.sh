#!/bin/bash
# VueSIP Demo Health Monitor
# Checks live demos and local dev servers
# Usage: ./scripts/demo-health-check.sh [--local] [--notify WEBHOOK_URL]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Demo endpoints to check
DEMOS=(
  "softphone.vuesip.com:Softphone PWA"
  "basic-softphone.vuesip.com:Basic Softphone"
  "ivr.vuesip.com:IVR Tester"
  "video.vuesip.com:Video Room"
  "callcenter.vuesip.com:Call Center"
)

# Local ports to check
LOCAL_PORTS=(
  "3000:Minimal"
  "3001:Basic Softphone"
  "3002:PWA Softphone"
  "3003:Video Room"
  "3004:Call Center"
  "3005:IVR Tester"
)

CHECK_LOCAL=false
NOTIFY_URL=""
FAILED=0
PASSED=0
RESULTS=""
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --local) CHECK_LOCAL=true; shift ;;
    --notify) NOTIFY_URL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Health check function
check_endpoint() {
  local url="$1"
  local name="$2"
  local timeout="${3:-10}"
  
  if curl -sf --max-time "$timeout" "$url" > /dev/null 2>&1; then
    echo "✅ $name: OK"
    ((PASSED++))
    RESULTS+="✅ $name: OK\n"
    return 0
  else
    echo "❌ $name: FAILED"
    ((FAILED++))
    RESULTS+="❌ $name: FAILED\n"
    return 1
  fi
}

echo "🏥 VueSIP Demo Health Check"
echo "Time: $(date)"
echo "================================"

# Check live demos
echo ""
echo "🌐 Live Demos (Production)"
echo "--------------------------"
for demo in "${DEMOS[@]}"; do
  IFS=':' read -r host name <<< "$demo"
  check_endpoint "https://$host" "$name"
done

# Check local dev servers if requested
if [[ "$CHECK_LOCAL" == true ]]; then
  echo ""
  echo "🔧 Local Dev Servers"
  echo "--------------------"
  for port_info in "${LOCAL_PORTS[@]}"; do
    IFS=':' read -r port name <<< "$port_info"
    check_endpoint "http://localhost:$port" "$name (localhost:$port)" 3
  done
fi

# Summary
echo ""
echo "================================"
echo "📊 Summary: $PASSED passed, $FAILED failed"

# Send notification if configured and there are failures
if [[ -n "$NOTIFY_URL" && $FAILED -gt 0 ]]; then
  PAYLOAD=$(cat <<EOF
{
  "content": "🚨 VueSIP Demo Health Alert",
  "embeds": [{
    "title": "$FAILED demo(s) failing",
    "description": "$(echo -e "$RESULTS" | sed 's/"/\\"/g')",
    "color": 15158332,
    "timestamp": "$TIMESTAMP"
  }]
}
EOF
)
  curl -sf -X POST -H "Content-Type: application/json" -d "$PAYLOAD" "$NOTIFY_URL" > /dev/null 2>&1 || true
fi

exit $FAILED
