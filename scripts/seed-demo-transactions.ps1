# PowerShell script to seed deterministic demo transactions on local Hardhat EVM

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$blockchainDir = Join-Path $scriptDir "..\blockchain"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "ChainShield: Seeding Local EVM Demo Transactions" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Set-Location $blockchainDir

Write-Host "Executing Hardhat seed script..." -ForegroundColor Yellow
npx hardhat run scripts/seed-demo-transactions.js --network localhost

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Demo transactions seeded successfully on local Hardhat!" -ForegroundColor Green
} else {
    Write-Host "`n✗ Failed to seed demo transactions. Ensure Hardhat node is running (scripts\start-hardhat.ps1)." -ForegroundColor Red
}
