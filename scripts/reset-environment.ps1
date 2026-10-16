# ChainShield - Reset & Redeploy Local Blockchain Environment
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Resetting ChainShield Local Blockchain Cache & Build" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\..\blockchain"

Write-Host "Cleaning Hardhat artifacts and cache..." -ForegroundColor Yellow
npx hardhat clean

Write-Host "Compiling Solidity smart contracts..." -ForegroundColor Yellow
npx hardhat compile

Write-Host "Running smart contract unit tests..." -ForegroundColor Yellow
npx hardhat test

Write-Host "`nReady for deployment! Run .\scripts\deploy-contracts.ps1 while Hardhat node is running." -ForegroundColor Green
