# ChainShield - Start Local Hardhat EVM Node
# Port: 8545 | Chain ID: 31337
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Starting ChainShield Local Hardhat EVM Node" -ForegroundColor Cyan
Write-Host " RPC Endpoint: http://127.0.0.1:8545 (Chain ID: 31337)" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\..\blockchain"
npx hardhat node
