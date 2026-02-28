# Script untuk setup Google Drive credentials dengan mudah (PowerShell)

Write-Host "🚀 Setup Google Drive Upload - SAKTI" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if client_secret file exists
$clientSecretFiles = Get-ChildItem -Path . -Recurse -Filter "client_secret_*.json" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($clientSecretFiles) {
    Write-Host "✅ Found Google client secret file:" -ForegroundColor Green
    Write-Host "   $($clientSecretFiles.FullName)" -ForegroundColor Gray
    Write-Host ""
    
    # Copy to credentials.json
    Copy-Item -Path $clientSecretFiles.FullName -Destination "credentials.json" -Force
    Write-Host "✅ Copied to credentials.json" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "❌ Client secret file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Please follow these steps:" -ForegroundColor Yellow
    Write-Host "   1. Go to Google Cloud Console" -ForegroundColor Gray
    Write-Host "   2. Enable Google Drive API" -ForegroundColor Gray
    Write-Host "   3. Create OAuth 2.0 credentials (Desktop app)" -ForegroundColor Gray
    Write-Host "   4. Download the JSON file" -ForegroundColor Gray
    Write-Host "   5. Place it in the project root" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Check if credentials.json exists
if (!(Test-Path "credentials.json")) {
    Write-Host "❌ credentials.json not found!" -ForegroundColor Red
    Write-Host "   Please download OAuth credentials from Google Cloud Console" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run: npm run setup-gdrive" -ForegroundColor Gray
Write-Host "   2. Follow the instructions to authorize" -ForegroundColor Gray
Write-Host "   3. Upload akan langsung ke Google Drive! 🎉" -ForegroundColor Green
Write-Host ""
