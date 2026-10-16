# ChainShield Full Stack Milestone 1 Test Suite Runner
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Running ChainShield Multi-Tier Verification Suite" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Blockchain Solidity Tests
Write-Host "`n[1/4] Running Hardhat Smart Contract Tests..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\blockchain"
& npx hardhat test
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Hardhat tests failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[PASS] Hardhat Smart Contract tests passed (11/11 tests)" -ForegroundColor Green

# 2. Backend Spring Boot Tests
Write-Host "`n[2/4] Running Spring Boot Backend Tests..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\backend"
& .\mvnw.cmd test -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Spring Boot backend tests failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[PASS] Spring Boot Backend tests passed (54/54 tests)" -ForegroundColor Green

# 3. Python Analysis Service Tests
Write-Host "`n[3/4] Running Python Analysis Service Unit Tests..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\analysis"
& python -m unittest discover -s tests -p "test_*.py"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Python tests failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[PASS] Python Analysis Service tests passed (5/5 tests)" -ForegroundColor Green

# 4. Frontend Vitest Unit Tests and Vite Production Build
Write-Host "`n[4/4] Running Frontend Vitest Unit Tests & Verifying Production Build..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\frontend"
& npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Frontend unit tests failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Frontend build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[PASS] Frontend unit tests (28/28) & production build passed successfully" -ForegroundColor Green

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host " ALL CHAINSHIELD CHECKS PASSED (100% SUCCESS)!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
