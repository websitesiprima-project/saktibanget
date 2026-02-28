# =====================================================
# Script untuk menjalankan migration add_progress_column_to_contracts.sql
# =====================================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  PLN SAKTI - Database Migration" -ForegroundColor Cyan
Write-Host "  Add Progress Column to Contracts" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (!(Test-Path ".env")) {
    if (Test-Path ".env.local") {
        Write-Host "Using .env.local file..." -ForegroundColor Yellow
        Get-Content ".env.local" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
            }
        }
    } else {
        Write-Host "ERROR: .env or .env.local file not found!" -ForegroundColor Red
        Write-Host "Please create .env file with your Supabase credentials." -ForegroundColor Yellow
        exit 1
    }
} else {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

$SUPABASE_URL = $env:NEXT_PUBLIC_SUPABASE_URL
$SUPABASE_SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if ([string]::IsNullOrEmpty($SUPABASE_URL) -or [string]::IsNullOrEmpty($SUPABASE_SERVICE_KEY)) {
    Write-Host "ERROR: Missing Supabase credentials!" -ForegroundColor Red
    Write-Host "Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file" -ForegroundColor Yellow
    exit 1
}

Write-Host "Reading SQL migration file..." -ForegroundColor Yellow
$sqlFile = "database/add_progress_column_to_contracts.sql"

if (!(Test-Path $sqlFile)) {
    Write-Host "ERROR: Migration file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

$sqlContent = Get-Content $sqlFile -Raw

Write-Host "Connecting to Supabase..." -ForegroundColor Yellow
Write-Host "URL: $SUPABASE_URL" -ForegroundColor Gray

# Extract project reference from URL
$projectRef = $SUPABASE_URL -replace 'https://', '' -replace '.supabase.co', ''

$apiUrl = "https://$projectRef.supabase.co/rest/v1/rpc/exec_sql"

# Create request body
$body = @{
    query = $sqlContent
} | ConvertTo-Json

# Execute SQL via Supabase REST API
try {
    Write-Host "Executing migration..." -ForegroundColor Yellow
    
    # Note: Supabase doesn't have a direct SQL execution endpoint via REST API
    # You need to use Supabase CLI or run it directly in Supabase SQL Editor
    
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  IMPORTANT: Manual Migration Required" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please run this SQL in your Supabase SQL Editor:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Go to: https://app.supabase.com/project/$projectRef/sql" -ForegroundColor White
    Write-Host "2. Copy the SQL from: $sqlFile" -ForegroundColor White
    Write-Host "3. Paste and run it in the SQL Editor" -ForegroundColor White
    Write-Host ""
    Write-Host "OR use Supabase CLI:" -ForegroundColor Cyan
    Write-Host "  supabase db push" -ForegroundColor White
    Write-Host ""
    
    # Open file in default editor
    $openFile = Read-Host "Do you want to open the SQL file now? (Y/N)"
    if ($openFile -eq "Y" -or $openFile -eq "y") {
        Start-Process $sqlFile
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  Migration Instructions Displayed" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
