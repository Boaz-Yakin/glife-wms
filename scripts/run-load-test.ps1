# WMS Enterprise Load Test & SLA High-Availability Runner
param (
    [string]$TargetUrl = "http://localhost:3000",
    [string]$ApiKey = "wms_live_demo_glife_secret",
    [int]$DurationSeconds = 15,
    [int]$ConcurrentStores = 50,
    [int]$ConcurrentPda = 30
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 WMS Enterprise SLA 99.9% Concurrency & Load Test Suite" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target: $TargetUrl" -ForegroundColor Yellow
Write-Host "Duration: ${DurationSeconds}s | Stores: $ConcurrentStores VUs | PDAs: $ConcurrentPda VUs" -ForegroundColor Yellow
Write-Host ""

# Check if k6 is installed
$k6Installed = Get-Command "k6" -ErrorAction SilentlyContinue

if ($k6Installed) {
    Write-Host "[Mode] Native k6 detected. Running k6 load scenario..." -ForegroundColor Green
    $env:API_URL = $TargetUrl
    $env:API_KEY = $ApiKey
    & k6 run --env API_URL=$TargetUrl --env API_KEY=$ApiKey scripts/load-test-k6.js
} else {
    Write-Host "[Mode] k6 not found in PATH. Using high-performance Node.js load simulator..." -ForegroundColor Yellow
    $env:API_URL = $TargetUrl
    $env:API_KEY = $ApiKey
    $env:TEST_DURATION = "$DurationSeconds"
    $env:CONCURRENCY_STORES = "$ConcurrentStores"
    $env:CONCURRENCY_PDA = "$ConcurrentPda"
    & node scripts/run-load-simulation.js
}
