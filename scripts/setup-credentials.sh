#!/bin/bash

# Script untuk setup Google Drive credentials dengan mudah

echo "🚀 Setup Google Drive Upload - SAKTI"
echo "===================================="
echo ""

# Check if client_secret file exists
CLIENT_SECRET=$(find . -maxdepth 3 -name "client_secret_*.json" 2>/dev/null | head -n 1)

if [ -n "$CLIENT_SECRET" ]; then
    echo "✅ Found Google client secret file:"
    echo "   $CLIENT_SECRET"
    echo ""
    
    # Copy to credentials.json
    cp "$CLIENT_SECRET" credentials.json
    echo "✅ Copied to credentials.json"
    echo ""
else
    echo "❌ Client secret file not found!"
    echo ""
    echo "📝 Please follow these steps:"
    echo "   1. Go to Google Cloud Console"
    echo "   2. Enable Google Drive API"
    echo "   3. Create OAuth 2.0 credentials (Desktop app)"
    echo "   4. Download the JSON file"
    echo "   5. Place it in the project root"
    echo ""
    exit 1
fi

# Check if credentials.json exists
if [ ! -f "credentials.json" ]; then
    echo "❌ credentials.json not found!"
    echo "   Please download OAuth credentials from Google Cloud Console"
    exit 1
fi

echo "📋 Next steps:"
echo "   1. Run: npm run setup-gdrive"
echo "   2. Follow the instructions to authorize"
echo "   3. Upload akan langsung ke Google Drive! 🎉"
echo ""
