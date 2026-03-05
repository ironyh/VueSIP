#!/bin/bash
# Build and test Telenurse Softphone for FreePBX

set -e

echo "🚀 Building Telenurse Softphone for FreePBX..."
echo ""

# Navigate to softphone directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Build
echo "🔨 Building..."
pnpm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "To test locally:"
echo "  pnpm run preview"
echo ""
echo "Then open: http://localhost:4173"
echo ""
echo "Pre-configured settings:"
echo "  WebSocket: wss://pbx.telenurse.se/ws"
echo "  Extensions: 1001-1005"
echo ""