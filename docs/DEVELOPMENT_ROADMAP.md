# ChainShield: Incremental Development Roadmap

**Project:** ChainShield: An Explainable Blockchain-Based Cryptocurrency Transaction and Smart Contract Risk Analysis System  
**Academic Degree:** Master of Computer Applications (MCA)  
**Execution Model:** Phased, Test-Driven Incremental Implementation

---

## 1. Phased Development Breakdown

```
Phase 1: Environment & Scaffolding (Current Phase)
  └── Tool verification, workspace layout, baseline documentation & wrapper setup
Phase 2: Blockchain Subsystem (Hardhat & Solidity)
  └── Hardhat configuration, OpenZeppelin contracts, mock exploit contracts & test suites
Phase 3: Backend Core & Risk Engine (Spring Boot & DB)
  └── Spring Boot 3 app, Flyway migrations, PostgreSQL/H2, calldata decoder, risk evaluators
Phase 4: Frontend Dashboard & Web3 UI (React & Tailwind)
  └── Modern cybersecurity UI, dashboard cards, risk gauges, address inputs & Recharts
Phase 5: Simulation & Graph Forensics (Full Integration)
  └── eth_call EVM integration, projected state deltas, interactive topology graph
Phase 6: Verification, Test Suites & Viva Packaging
  └── Unit/integration tests, end-to-end smoke verification, demo scripts, report export
```

---

## 2. Phase Details & Deliverables

### Phase 1: Environment, Scaffolding & Initial Documentation (Current)
- [x] Inspect existing host tooling (Node v24, npm v11, Java 25, Python 3.14, Git, winget).
- [x] Author formal MCA project documentation in `docs/`:
  - `PROJECT_OVERVIEW.md`
  - `REQUIREMENTS.md`
  - `ARCHITECTURE.md`
  - `API_SPEC.md`
  - `DATABASE_DESIGN.md`
  - `BLOCKCHAIN_DESIGN.md`
  - `RISK_ENGINE.md`
  - `TEST_PLAN.md`
  - `DEMO_GUIDE.md`
  - `DEVELOPMENT_ROADMAP.md`
- [ ] Establish root monorepo structure with `.gitignore`, `README.md`, and environment templates.

---

### Phase 2: Blockchain Subsystem (Hardhat, Contracts & EVM Sandbox)
- **Directory:** `blockchain/`
- **Deliverables:**
  - Hardhat project setup with `package.json`, `hardhat.config.js`.
  - Solidity `^0.8.24` contracts:
    - `contracts/benign/MockERC20.sol`
    - `contracts/benign/SafeVault.sol`
    - `contracts/malicious/DangerousApprovalSpender.sol`
    - `contracts/malicious/HoneypotToken.sol`
    - `contracts/malicious/FakeAirdropDrainer.sol`
  - Deployment script `scripts/deploy.js` with deterministic deployment logs.
  - Automated contract unit tests verifying exploit signatures and benign behaviors.
- **Verification:** `npx hardhat test` passing 100%.

---

### Phase 3: Backend REST Service & Explainable Risk Engine
- **Directory:** `backend/`
- **Deliverables:**
  - Spring Boot 3 enterprise application with Maven wrapper (`./mvnw`).
  - Database schema & Flyway migrations (`db/migration/V1`, `V2`, `V3`).
  - Dual database profile: `dev-postgres` (PostgreSQL) and `dev-h2` (In-memory fallback for zero-blocker startup).
  - Web3j / EVM JSON-RPC client service for communicating with Hardhat node on port `8545`.
  - Core domain models & JPA repositories.
  - Calldata Decoder (extracting selectors, spender addresses, amounts, and approvals).
  - Deterministic Risk Engine service with weighted scoring formula and natural-language generator.
  - REST Controllers conforming to `docs/API_SPEC.md`.
- **Verification:** `./mvnw clean test` passing with $\ge 80\%$ service layer coverage.

---

### Phase 4: Frontend Modern Cybersecurity Dashboard
- **Directory:** `frontend/`
- **Deliverables:**
  - React 18 + Vite + TypeScript application.
  - Tailwind CSS with bespoke dark cybersecurity theme (obsidian, slate, cyan, emerald, amber, crimson).
  - Navigation sidebar and header with network status indicator (Connected to Hardhat / Local EVM).
  - Module 1: Dashboard with statistical KPI cards, risk distribution charts, and recent scans.
  - Module 2: Wallet Risk Analyzer view with address validation and indicator cards.
  - Module 3: Smart Contract Risk Analyzer view with bytecode status and honeypot warnings.
  - Module 4: Transaction Analyzer view with decoded calldata inspector.
  - Responsive, accessible layouts with copy buttons, loading skeletons, and error handling.
- **Verification:** `npm run build` succeeds without type errors; clean rendering in browser.

---

### Phase 5: Transaction Simulation, Forensics Graph & Reports
- **Directory:** `frontend/` & `backend/`
- **Deliverables:**
  - Module 5: Transaction Simulator with pre/post state delta breakdown and dangerous approval alerts.
  - Module 7: Interactive Transaction Graph visualization (Wallet $\leftrightarrow$ Contract $\leftrightarrow$ Mixer).
  - Module 8: Security Assessment Report viewer with printable formatting.
- **Verification:** End-to-end simulation against deployed `DangerousApprovalSpender` and `HoneypotToken`.

---

### Phase 6: End-to-End Verification, Documentation Polish & Viva Packaging
- **Deliverables:**
  - End-to-end smoke test script (`scripts/smoke_test.ps1` / `scripts/smoke_test.sh`).
  - MCA minor project presentation slides summary and Viva demo script.
  - Root `README.md` with 1-click startup instructions.

---

## 3. Proposed Exact First Implementation Milestone

**Milestone 1: Project Scaffolding & Blockchain Subsystem**
1. Initialize the monorepo directories:
   ```
   ChainShield/
     frontend/
     backend/
     blockchain/
     analysis/
     database/
     docs/
     scripts/
   ```
2. Create root `.gitignore`, root `README.md`, and top-level environment configuration.
3. Scaffold `blockchain/` with Hardhat, compile the 5 test contracts (`MockERC20`, `SafeVault`, `DangerousApprovalSpender`, `HoneypotToken`, `FakeAirdropDrainer`), and execute automated Hardhat tests to verify that exploit vectors trigger as expected.
4. Scaffold `backend/` with Spring Boot 3 structure, Maven wrapper (`mvnw`), and verify that `./mvnw test` builds cleanly.
