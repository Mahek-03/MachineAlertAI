# MachineAlert AI - Automated PowerShell Smoke Test Script
$baseUrl = "http://127.0.0.1:8000"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting MachineAlert AI Automated Smoke Test (PowerShell)" -ForegroundColor Cyan
Write-Host " Target API: $baseUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Health
Write-Host -NoNewline "[1/5] Testing /health endpoint... "
try {
    $h = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    if ($h.status -eq "healthy") {
        Write-Host "PASS (Healthy)" -ForegroundColor Green
    } else {
        Write-Host "FAIL" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "FAIL ($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Model Info
Write-Host -NoNewline "[2/5] Testing /api/v1/model/info... "
try {
    $m = Invoke-RestMethod -Uri "$baseUrl/api/v1/model/info" -Method Get
    if ($m.accuracy -ge 0.94) {
        Write-Host "PASS (Accuracy: $($m.accuracy * 100)%)" -ForegroundColor Green
    } else {
        Write-Host "FAIL" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "FAIL ($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Nominal Prediction
Write-Host -NoNewline "[3/5] Testing /api/v1/predict with nominal telemetry... "
$payloadNorm = @{
    air_temperature = 298.1
    process_temperature = 308.6
    rotational_speed = 1551
    torque = 42.8
    tool_wear = 10
    type = "M"
} | ConvertTo-Json

try {
    $pNorm = Invoke-RestMethod -Uri "$baseUrl/api/v1/predict" -Method Post -Body $payloadNorm -ContentType "application/json"
    if ($pNorm.risk_level -eq "Normal") {
        Write-Host "PASS (Risk: Normal, $($pNorm.failure_probability)%)" -ForegroundColor Green
    } else {
        Write-Host "FAIL ($($pNorm.risk_level))" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "FAIL ($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Critical Failure Prediction
Write-Host -NoNewline "[4/5] Testing /api/v1/predict with critical wear... "
$payloadFail = @{
    air_temperature = 302.0
    process_temperature = 311.5
    rotational_speed = 1310
    torque = 68.0
    tool_wear = 235
    type = "L"
} | ConvertTo-Json

try {
    $pFail = Invoke-RestMethod -Uri "$baseUrl/api/v1/predict" -Method Post -Body $payloadFail -ContentType "application/json"
    if ($pFail.risk_level -in @("Medium Risk", "High Risk")) {
        Write-Host "PASS (Alert Triggered: $($pFail.risk_level), $($pFail.failure_probability)%)" -ForegroundColor Green
    } else {
        Write-Host "FAIL" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "FAIL ($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 5. Machines Registry
Write-Host -NoNewline "[5/5] Testing /api/v1/machines listing... "
try {
    $machs = Invoke-RestMethod -Uri "$baseUrl/api/v1/machines" -Method Get
    if ($machs.Count -ge 8) {
        Write-Host "PASS ($($machs.Count) assets registered)" -ForegroundColor Green
    } else {
        Write-Host "FAIL ($($machs.Count) machines)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "FAIL ($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " All API Smoke Tests PASSED successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
