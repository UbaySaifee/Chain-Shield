# ChainShield - Deploy Contracts to Local Hardhat Node
# Exports deployment registry to blockchain, backend, and frontend
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Deploying ChainShield Test Contracts to Local Node" -ForegroundColor Cyan
Write-Host " Target: http://127.0.0.1:8545 (localhost)" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\..\blockchain"
npx hardhat run scripts/deploy.js --network localhost

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Deployment successful! Registry files exported." -ForegroundColor Green
} else {
    Write-Host "`n✗ Deployment failed. Is the Hardhat node running on port 8545?" -ForegroundColor Red
    exit 1
}
