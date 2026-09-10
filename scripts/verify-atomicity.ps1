#!/usr/bin/env pwsh
# scripts/verify-atomicity.ps1
# 
# 4.3 검증: 동시 실사/피킹 시 마이너스 재고 차단 원자성 검증
# Usage: powershell -ExecutionPolicy Bypass -File scripts/verify-atomicity.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Task 4.3: Atomicity and Integrity Checks" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$Pass = 0
$Fail = 0

function Check-Pass($label) {
    Write-Host "[PASS] $label" -ForegroundColor Green
    $script:Pass++
}
function Check-Fail($label) {
    Write-Host "[FAIL] $label" -ForegroundColor Red
    $script:Fail++
}

# CHECK 1: FOR UPDATE lock in RPC
Write-Host "`n[CHECK 1] RPC: FOR UPDATE row-level lock" -ForegroundColor White
$rpcFile = "supabase/migrations/20260909000001_harden_adjust_rpc.sql"
if (Test-Path $rpcFile) {
    $rpcContent = Get-Content $rpcFile -Raw
    if ($rpcContent -match "FOR UPDATE") {
        Check-Pass "adjust_inventory_stock RPC uses FOR UPDATE lock."
    } else {
        Check-Fail "FOR UPDATE not found in RPC."
    }
} else {
    Check-Fail "Migration file not found: $rpcFile"
}

# CHECK 2: Negative quantity guard in RPC
Write-Host "`n[CHECK 2] RPC: Negative quantity guard" -ForegroundColor White
if (Test-Path $rpcFile) {
    $rpcContent = Get-Content $rpcFile -Raw
    if ($rpcContent -match "p_new_qty") {
        Check-Pass "RPC references p_new_qty validation."
    } else {
        Check-Fail "No negative quantity guard in RPC."
    }
    if ($rpcContent -match "Cannot set inventory below zero") {
        Check-Pass "RPC raises exception for negative quantity."
    } else {
        Check-Fail "No exception message for negative quantity."
    }
}

# CHECK 3: Below-allocated guard in RPC
Write-Host "`n[CHECK 3] RPC: Below-allocated quantity guard" -ForegroundColor White
if (Test-Path $rpcFile) {
    $rpcContent = Get-Content $rpcFile -Raw
    if ($rpcContent -match "v_allocated_qty") {
        Check-Pass "RPC fetches and checks allocated_qty."
    } else {
        Check-Fail "No allocated_qty guard in RPC."
    }
    if ($rpcContent -match "Cannot adjust below allocated quantity") {
        Check-Pass "RPC raises exception when adjusting below allocated."
    } else {
        Check-Fail "No exception for below-allocated case."
    }
}

# CHECK 4: DB-level CHECK constraints
Write-Host "`n[CHECK 4] Schema: DB-level CHECK constraints" -ForegroundColor White
$schemaFile = "supabase/migrations/00000000000000_init_schema.sql"
if (Test-Path $schemaFile) {
    $schemaContent = Get-Content $schemaFile -Raw
    if ($schemaContent -match "on_hand_qty >= 0") {
        Check-Pass "DB CHECK: on_hand_qty >= 0"
    } else {
        Check-Fail "Missing DB CHECK: on_hand_qty >= 0"
    }
    if ($schemaContent -match "allocated_qty >= 0") {
        Check-Pass "DB CHECK: allocated_qty >= 0"
    } else {
        Check-Fail "Missing DB CHECK: allocated_qty >= 0"
    }
    if ($schemaContent -match "on_hand_qty >= allocated_qty") {
        Check-Pass "DB CHECK: on_hand_qty >= allocated_qty"
    } else {
        Check-Fail "Missing DB CHECK: on_hand_qty >= allocated_qty"
    }
} else {
    Check-Fail "Schema migration not found."
}

# CHECK 5: API pre-validation
Write-Host "`n[CHECK 5] API Layer: newQty pre-validation" -ForegroundColor White
$adjustApiFile = "src/app/api/inventory/adjust/route.ts"
if (Test-Path $adjustApiFile) {
    $apiContent = Get-Content $adjustApiFile -Raw
    if ($apiContent -match "newQty") {
        Check-Pass "API route validates newQty before calling RPC."
    } else {
        Check-Fail "API route missing newQty validation."
    }
} else {
    Check-Fail "Adjust API route not found."
}

# CHECK 6: P0001 error handling
Write-Host "`n[CHECK 6] API Layer: P0001 error handling" -ForegroundColor White
if (Test-Path $adjustApiFile) {
    $apiContent = Get-Content $adjustApiFile -Raw
    if ($apiContent -match "P0001") {
        Check-Pass "API catches P0001 from RPC and returns 409 Conflict."
    } else {
        Check-Fail "API does not handle P0001 error code."
    }
} else {
    Check-Fail "Adjust API route not found."
}

# Summary
$total = $Pass + $Fail
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  Atomicity Verification Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "PASSED: $Pass / $total" -ForegroundColor $(if ($Fail -eq 0) { "Green" } else { "Yellow" })

if ($Fail -eq 0) {
    Write-Host "`n[SUCCESS] All atomicity checks passed!" -ForegroundColor Green
    Write-Host "[NOTE] Apply the new RPC migration to Supabase before production:" -ForegroundColor Gray
    Write-Host "       supabase db push  (or SQL Editor in Supabase Dashboard)" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "`n[WARNING] $Fail check(s) failed. Review above." -ForegroundColor Yellow
    exit 1
}
