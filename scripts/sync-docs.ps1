# scripts/sync-docs.ps1
# Documentation consistency validation script for Windows PowerShell
# Usage: powershell -ExecutionPolicy Bypass -File scripts/sync-docs.ps1

$ErrorActionPreference = "Continue"
$WarningsCount = 0

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Documentation Consistency Validation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# -------------------------------------------------------------------
# CHECK 1: PRD required sections
# -------------------------------------------------------------------
Write-Host "`n[CHECK 1] Validating PRD (docs/01_PRD.md)..." -ForegroundColor White

$prdFile = "docs/01_PRD.md"
if (-not (Test-Path $prdFile)) {
    Write-Host "[WARN] PRD file missing: $prdFile" -ForegroundColor Yellow
    $WarningsCount++
} else {
    $prdContent = Get-Content $prdFile -Raw
    $sections = @("Problem Statement", "Target Users", "Core Features", "Out of Scope", "Success Metrics")
    foreach ($sec in $sections) {
        if ($prdContent -match $sec) {
            Write-Host "  [PASS] Section: $sec" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Missing section: $sec" -ForegroundColor Yellow
            $WarningsCount++
        }
    }
    
    $placeholderMatches = [regex]::Matches($prdContent, "\{예:")
    if ($placeholderMatches.Count -gt 5) {
        Write-Host "  [WARN] PRD has $($placeholderMatches.Count) placeholder items to fill in." -ForegroundColor Yellow
        $WarningsCount++
    }
}

# -------------------------------------------------------------------
# CHECK 2: ADR validation
# -------------------------------------------------------------------
Write-Host "`n[CHECK 2] Validating ADR (docs/02_ADR.md)..." -ForegroundColor White

$adrFile = "docs/02_ADR.md"
if (-not (Test-Path $adrFile)) {
    Write-Host "[WARN] ADR file missing: $adrFile" -ForegroundColor Yellow
    $WarningsCount++
} else {
    $adrContent = Get-Content $adrFile -Raw
    $adrMatches = [regex]::Matches($adrContent, "(?m)^## ADR-")
    Write-Host "  [INFO] Found $($adrMatches.Count) ADR item(s)." -ForegroundColor Gray
    
    $placeholderAdrs = [regex]::Matches($adrContent, "\{결정 사항\}")
    if ($placeholderAdrs.Count -gt 0) {
        Write-Host "  [WARN] ADR has $($placeholderAdrs.Count) unfilled placeholder item(s)." -ForegroundColor Yellow
        $WarningsCount++
    } else {
        Write-Host "  [PASS] ADR format valid." -ForegroundColor Green
    }
}

# -------------------------------------------------------------------
# CHECK 3: TRD status tracking
# -------------------------------------------------------------------
Write-Host "`n[CHECK 3] Checking TRD status (docs/03_TRD.md)..." -ForegroundColor White

$trdFile = "docs/03_TRD.md"
if (-not (Test-Path $trdFile)) {
    Write-Host "[WARN] TRD file missing: $trdFile" -ForegroundColor Yellow
    $WarningsCount++
} else {
    $trdContent = Get-Content $trdFile -Raw
    $proposedCount = [regex]::Matches($trdContent, "Status.*Proposed").Count
    $inProgressCount = [regex]::Matches($trdContent, "Status.*In Progress").Count
    $doneCount = [regex]::Matches($trdContent, "Status.*Done").Count
    
    Write-Host "  [INFO] Proposed: $proposedCount | In Progress: $inProgressCount | Done: $doneCount" -ForegroundColor Gray
    
    if ($inProgressCount -gt 3) {
        Write-Host "  [WARN] Too many features in 'In Progress' state simultaneously (Recommended WIP <= 3)." -ForegroundColor Yellow
        $WarningsCount++
    }
}

# -------------------------------------------------------------------
# CHECK 4: task.md tracking
# -------------------------------------------------------------------
Write-Host "`n[CHECK 4] Checking task.md tracker..." -ForegroundColor White

$taskFile = "task.md"
if (-not (Test-Path $taskFile)) {
    Write-Host "  [WARN] task.md missing." -ForegroundColor Yellow
    $WarningsCount++
} else {
    $taskContent = Get-Content $taskFile -Raw
    $todoCount = [regex]::Matches($taskContent, "\[ \]").Count
    $inProgCount = [regex]::Matches($taskContent, "\[/\]").Count
    $doneTCount = [regex]::Matches($taskContent, "\[x\]").Count
    
    Write-Host "  [INFO] Todo: $todoCount | In Progress: $inProgCount | Done: $doneTCount" -ForegroundColor Gray
}

# -------------------------------------------------------------------
# CHECK 5: .knowledge folder checks
# -------------------------------------------------------------------
Write-Host "`n[CHECK 5] Checking .knowledge/ base..." -ForegroundColor White

$knowledgeFiles = Get-ChildItem -Path ".knowledge" -Recurse -Include *.md -ErrorAction SilentlyContinue
$knowledgeCount = if ($knowledgeFiles) { $knowledgeFiles.Count } else { 0 }
Write-Host "  [INFO] Knowledge documents: $knowledgeCount item(s)." -ForegroundColor Gray

if ($knowledgeCount -lt 2) {
    Write-Host "  [WARN] .knowledge base is empty or sparse. Consider adding patterns/gotchas." -ForegroundColor Yellow
    $WarningsCount++
} else {
    Write-Host "  [PASS] Knowledge base established." -ForegroundColor Green
}

# -------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  Sync Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($WarningsCount -gt 0) {
    Write-Host "[NOTICE] $WarningsCount notice(s)/warning(s) detected." -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] All documents are synchronized and valid!" -ForegroundColor Green
}

Write-Host "`nDocumentation sync validation completed." -ForegroundColor Green
exit 0
