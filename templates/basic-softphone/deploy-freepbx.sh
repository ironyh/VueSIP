#!/bin/bash
# Deploy FreePBX Custom Softphone
# Usage: ./deploy-freepbx.sh [target-host]

set -e

TARGET_HOST="${1:-softphone.vuesip.com}"
DEPLOY_DIR="/var/www/softphone"
LOCAL_BUILD="./dist-freepbx"

echo "🚀 Deploying FreePBX Custom Softphone"
echo "   Target: $TARGET_HOST"
echo "   Source: $LOCAL_BUILD"
echo ""

# Check if build exists
if [ ! -d "$LOCAL_BUILD" ]; then
    echo "❌ Build directory not found: $LOCAL_BUILD"
    echo "   Run: pnpm run build:freepbx"
    exit 1
fi

# Deploy via rsync (requires SSH access)
echo "📤 Uploading files..."
rsync -avz --delete "$LOCAL_BUILD/" "root@$TARGET_HOST:$DEPLOY_DIR/"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your softphone at:"
echo "   https://$TARGET_HOST"
echo ""
echo "📋 Pre-configured settings:"
echo "   WebSocket: wss://pbx.telenurse.se/ws"
echo "   Extensions: 1001-1005"
echo ""