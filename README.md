# ChainShield 🛡️

> **"ChainShield: An Explainable Blockchain-Based Cryptocurrency Transaction and Smart Contract Risk Analysis System"**  
> *Individual MCA 3rd Semester Minor Project (Academic Year 2026)*

---

## 📌 Project Overview

**ChainShield** is an explainable, pre-execution cybersecurity layer for EVM-compatible blockchain networks. It evaluates wallet counterparties, smart contract bytecode, and candidate transaction payloads to detect security threats such as **honeypot transfer locks, unlimited token approvals, malicious drainers, and anomalous counterparty velocities** *before* any transaction signature is committed.

### The 4-Step Core Workflow
```
[ 1. ANALYZE ] ──▶ [ 2. SIMULATE ] ──▶ [ 3. EXPLAIN ] ──▶ [ 4. DECIDE ]
    │                      │                     │                   │
    ▼                      ▼                     ▼                   ▼
Scan address,          Dry-run tx on         Convert bytecode    User makes an
contract bytecode,     EVM node without      & simulation into   informed, safe
history & threat lists state commit          plain English       action
```

---

## ⚖️ Educational & Defensive Boundary Notice

- ChainShield is **NOT** a cryptocurrency exchange, trading platform, or financial advisor.
- ChainShield uses **NO real-money assets**; it operates strictly on local EVM sandbox networks (Hardhat, Chain ID 31337) and public testnets.
- The system never stores, requests, or transmits user private keys or seed phrases.

---

## 🛠️ Multi-Tier Technology Stack

| Layer | Technologies | Role in ChainShield |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide | Modern dark-mode cybersecurity dashboard and module shell |
| **Backend** | Spring Boot 3.3.4, Java 25 LTS, Spring Data JPA, Maven | Enterprise REST gateway, simulation coordinator & risk calculator |
| **Blockchain** | Solidity `^0.8.24`, Hardhat, OpenZeppelin v5 | Local EVM node (port 8545), test ERC-20, honeypot & drainer test vectors |
| **Analysis** | Python 3.14, FastAPI, Pydantic | Deterministic multi-factor scoring service (secondary heuristic engine) |
| **Database** | PostgreSQL 15+ / In-Memory H2, Flyway migrations | Normalized entity history, threat registry & assessment audit logs |

---

## 📁 Repository Structure

```
ChainShield/
├── frontend/        # React + TypeScript + Vite + Tailwind dashboard
├── backend/         # Spring Boot 3 enterprise REST service with Maven wrapper
├── blockchain/      # Solidity smart contracts & Hardhat local EVM sandbox
├── analysis/        # FastAPI deterministic risk scoring microservice
├── database/        # Flyway SQL migrations and seed datasets
├── docs/            # Academic MCA documentation suite (SRS, Architecture, etc.)
├── scripts/         # Automated full-stack verification and deployment scripts
└── tests/           # Multi-tier testing matrices and quality assurance logs
```

---

## 📋 Prerequisites

- **Node.js**: `v20+` (verified on `v24.21.0`) & **npm** `v10+`
- **Java JDK**: `17+` (verified on Oracle JDK `25.0.4.1 LTS`)
- **Python**: `3.10+` (verified on `3.14.7`)
- **Maven**: Pre-bundled via `./mvnw.cmd` (zero external Maven installation required)
- **Database**: H2 in-memory is configured by default for zero-friction local runs; PostgreSQL is supported via `SPRING_PROFILES_ACTIVE=dev-postgres`.

---

## 🚀 Step-by-Step Service Startup Instructions

### 1. Start the Local Blockchain Node (Hardhat)
In terminal 1:
```bash
cd blockchain
npx hardhat node
```
*Starts local EVM RPC at `http://127.0.0.1:8545` (Chain ID: `31337`).*

### 2. Deploy Local Test Smart Contracts
In terminal 2:
```bash
cd blockchain
npm run deploy:local
```
*Deploys `MockERC20`, `SafeVault`, `HoneypotToken`, and `DangerousApprovalSpender` and writes deployment metadata to `blockchain/deployed-addresses.json`.*

### 3. Start the Spring Boot Backend Service
In terminal 3:
```bash
cd backend
.\mvnw.cmd spring-boot:run
```
*Starts Spring Boot REST API at `http://localhost:8080`. Health check available at `http://localhost:8080/api/health`.*

### 4. Start the Python Analysis Microservice
In terminal 4:
```bash
cd analysis
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Starts FastAPI service at `http://127.0.0.1:8000`. OpenAPI docs available at `http://127.0.0.1:8000/docs`.*

### 5. Start the React Frontend Dashboard
In terminal 5:
```bash
cd frontend
npm run dev
```
*Starts Vite development server at `http://localhost:5173`.*

---

## 🧪 Automated Testing & Verification (113 Tests Across 4 Tiers)

Run the entire multi-tier test suite with a single PowerShell command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-all-tests.ps1
```

### Individual Subsystem Tests
- **Frontend Unit & Integration Tests (Vitest):**
  ```bash
  cd frontend && npm test
  ```
  *(41 passing tests: verifying global search address classification, severity thresholds, evidence panel schema mapping, pre-sign simulation distinctions, cross-module navigation routing, and graph topological analysis)*
- **Frontend Production Build Verification:**
  ```bash
  cd frontend && npm run build
  ```
  *(TypeScript strict typecheck `tsc -b` and Vite production bundle generated without errors in ~500ms)*
- **Blockchain Smart Contracts (Hardhat):**
  ```bash
  cd blockchain && npx hardhat test
  ```
  *(11 passing tests: verifying standard ERC-20, safe vault escrow, honeypot lock, and approval exploit)*
- **Backend Service (Spring Boot 3 + JUnit 5):**
  ```bash
  cd backend && .\mvnw.cmd test
  ```
  *(56 passing tests: verifying Flyway v2 schema, entity repositories, deterministic risk engine, calldata decoder, demo provider, graph controllers, dashboard statistics, address summary, and transaction history endpoints)*
- **Python Analysis Service (unittest):**
  ```bash
  cd analysis && python -m unittest discover -s tests -p "test_*.py"
  ```
  *(5 passing tests: verifying deterministic scoring formula, score clipping, and health schema)*

---

## 🦊 Web3 Browser Wallet (MetaMask) Configuration

ChainShield integrates seamlessly with MetaMask or any EVM-compatible browser wallet:

1. **Network Name:** `Hardhat Localhost`
2. **RPC URL:** `http://127.0.0.1:8545`
3. **Chain ID:** `31337`
4. **Currency Symbol:** `ETH`
5. **Local Test Account #1 (Hardhat Standard Key):**
   - Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
   - Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
   *(Local testnet only — zero real funds)*

*Note: If no browser wallet is installed, ChainShield automatically operates in **Simulator Fallback Mode**, permitting full simulation and security reviews without extensions.*

---

> [!IMPORTANT]
> **ACADEMIC & PROTOTYPE SECURITY DISCLAIMER:**  
> *"ChainShield is a prototype security-analysis system. Its risk assessment is not a guarantee that a transaction or contract is safe or malicious."*

---

## 🔍 Milestone 3, 4 & 5 Implemented API Verification

Once the backend and Hardhat node are running, you can test the simulation, contract analysis, and risk evaluation endpoints directly via PowerShell:

### 1. Smart Contract Risk Analysis (HoneypotToken TrapToken)
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/contract/analyze -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"contractAddress": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9", "chainId": 31337}' | ConvertTo-Json -Depth 6
```

### 2. Smart Contract Risk Analysis (DangerousApprovalSpender)
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/contract/analyze -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"contractAddress": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707", "chainId": 31337}' | ConvertTo-Json -Depth 6
```

### 3. Smart Contract Risk Analysis (Benign SafeVault)
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/contract/analyze -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"contractAddress": "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0", "chainId": 31337}' | ConvertTo-Json -Depth 6
```

### 4. Smart Contract Risk Analysis (EOA Address Classification)
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/contract/analyze -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"contractAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "chainId": 31337}' | ConvertTo-Json -Depth 6
```

### 5. Contract Analysis History Retrieval (Filtered)
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/analyses?type=CONTRACT" -Method GET | ConvertTo-Json -Depth 3
```

### 6. Pre-Execution Transaction Simulation (Unlimited Approval)
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/transaction/simulate -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"from": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3", "valueWei": "0", "data": "0x095ea7b30000000000000000000000009fe46736679d2d9a65f0992f2272de9f3c7fa6e0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", "chainId": 31337}' | ConvertTo-Json -Depth 6
```

### 7. Hardhat Blockchain Connection Status
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/blockchain/status -Method GET | ConvertTo-Json
```

### 8. Address Intelligence Summary (Milestone 6)
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/address/0x70997970C51812dc3A010C7d01b50e0d17dc79C8/summary -Method GET | ConvertTo-Json -Depth 5
```

### 9. Forensic Transaction Relationship Graph (Milestone 6)
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/address/0x70997970C51812dc3A010C7d01b50e0d17dc79C8/graph?depth=2&nodeType=ALL&edgeType=ALL" -Method GET | ConvertTo-Json -Depth 6
```

### 10. On-Chain Path Explorer (Milestone 6)
```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/graph/path -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"sourceAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "targetAddress": "0x90F79bf6EB2c4f870365E785982E1f101E93b906", "maxDepth": 3}' | ConvertTo-Json -Depth 6
```

### 11. Transaction & Simulation Audit History (Milestone 7)
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/transactions/history?limit=20" -Method GET | ConvertTo-Json -Depth 4
```


---

## 📖 Academic Documentation Reference

All design and requirements documentation is maintained under [`docs/`](./docs/):
- [`docs/PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) — Problem statement and workflow philosophy
- [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) — Functional and non-functional requirements (SRS)
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Multi-tier architecture and sequence diagrams
- [`docs/API_SPEC.md`](./docs/API_SPEC.md) — OpenAPI 3.0 REST endpoint specifications
- [`docs/DATABASE_DESIGN.md`](./docs/DATABASE_DESIGN.md) — Normalized schemas and ER relationships
- [`docs/BLOCKCHAIN_DESIGN.md`](./docs/BLOCKCHAIN_DESIGN.md) — Hardhat sandbox and custom contract test vectors
- [`docs/RISK_ENGINE.md`](./docs/RISK_ENGINE.md) — Mathematical additive scoring model and taxonomy
- [`docs/TEST_PLAN.md`](./docs/TEST_PLAN.md) — Testing pyramid and MCA evaluation metrics
- [`docs/DEMO_GUIDE.md`](./docs/DEMO_GUIDE.md) — Step-by-step viva presentation script
- [`docs/DEVELOPMENT_ROADMAP.md`](./docs/DEVELOPMENT_ROADMAP.md) — Milestone roadmap
