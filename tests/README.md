# ChainShield Multi-Tier Test Suite Summary

This directory documents and coordinates tests across all subsystems of ChainShield:

| Subsystem | Location | Test Framework | Execution Command | Milestone 1 Status |
| :--- | :--- | :--- | :--- | :--- |
| **Smart Contracts** | `blockchain/test/` | Hardhat, Ethers.js, Chai | `cd blockchain && npx hardhat test` | ✅ 11/11 Passed |
| **Enterprise Backend** | `backend/src/test/` | JUnit 5, Spring MockMvc, H2 | `cd backend && .\mvnw.cmd test` | ✅ 3/3 Passed |
| **Analysis Engine** | `analysis/tests/` | Python unittest / pytest | `cd analysis && python -m unittest` | ✅ 5/5 Passed |
| **Web Frontend** | `frontend/src/` | TypeScript `tsc -b`, Vite | `cd frontend && npm run build` | ✅ Built in 1.52s |

### Running All Verification Tests
To run all tests across all four tiers in sequence on Windows PowerShell:
```powershell
.\scripts\run-all-tests.ps1
```
