# ChainShield: Demonstration & Viva Presentation Guide

**Project:** ChainShield: An Explainable Blockchain-Based Cryptocurrency Transaction and Smart Contract Risk Analysis System  
**Academic Degree:** Master of Computer Applications (MCA)  
**Audience:** Project Evaluators, University Examiners, Technical Reviewers  
**Status:** Milestone 7 Implemented & Verified (Unified Intelligence Experience)

---

> [!IMPORTANT]
> **ACADEMIC & PROTOTYPE SECURITY DISCLAIMER:**  
> *"ChainShield is a prototype security-analysis system. Its risk assessment is not a guarantee that a transaction or contract is safe or malicious."*

---

## 1. Demo Quickstart Checklist (Windows PowerShell)

Before beginning the project demonstration, ensure the following core subsystems are running:

### Step 1: Start the Local Hardhat EVM Node
In Terminal 1:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-hardhat.ps1
```
*Starts local Hardhat JSON-RPC node on `http://127.0.0.1:8545` (Chain ID: `31337`) with 20 pre-funded test accounts.*

### Step 2: Deploy Testbed Contracts
In Terminal 2:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-contracts.ps1
```
*Compiles contracts, deploys `MockERC20`, `SafeVault`, `DangerousApprovalSpender`, and `HoneypotToken`, pre-funds test wallet `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` with 50,000 SHLD and 5,000 TRAP, and exports address registries across backend and frontend.*

### Step 3: Start the Spring Boot Backend
In Terminal 3:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
*Starts enterprise REST backend on `http://localhost:8080`. Automatically discovers deployed contracts and binds `HardhatBlockchainProvider` to port 8545.*

### Step 4: Start the React Frontend Dashboard
In Terminal 4:
```powershell
cd frontend
npm run dev
```
*Launches Vite development server on `http://localhost:5173`.*

---

## 2. Web3 Browser Wallet (MetaMask) Setup

ChainShield uses a standard non-custodial browser wallet provider abstraction (EIP-1193). For full interactive signing demonstrations, configure MetaMask or any EVM-compatible browser wallet:

### 2.1 Add the Hardhat Local Demo Network to MetaMask
1. Open **MetaMask** $\rightarrow$ Click Network Dropdown $\rightarrow$ **"Add network"** $\rightarrow$ **"Add a network manually"**.
2. Enter the network configuration details:
   - **Network Name:** `Hardhat Localhost`
   - **New RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
3. Click **Save** and switch to `Hardhat Localhost`.

### 2.2 Import Local Test Account
Hardhat generates 20 deterministic test accounts pre-funded with 10,000 test ETH each. Import Account #1 into MetaMask for testing:
- **Address:** `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Private Key (Hardhat standard local dev key):**  
  `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
*(Note: Never use this private key on Ethereum Mainnet or any production network.)*

### 2.3 Headless / Simulator Fallback Mode
If evaluating on a browser without MetaMask installed or in a testing environment without extensions:
- ChainShield automatically enables **Simulator Demo Account Fallback Mode**.
- Test wallet `0x7099...79C8` is loaded automatically with a live 10,000 ETH balance and full simulation capabilities.
- Transaction preparation, calldata encoding, pre-execution simulation, explainable indicators, and review modals operate identically.

---

## 3. Core Architectural Principle: The 4-Step Pipeline

```
[ 1. PREPARE ] ──▶ [ 2. SIMULATE ] ──▶ [ 3. EXPLAIN & REVIEW ] ──▶ [ 4. USER DECIDES ]
      │                    │                       │                         │
      ▼                    ▼                       ▼                         ▼
Form Builder &       Read-only eth_call      Plain English risk       User explicitly
Calldata Generator   dry-run on Hardhat      breakdown & state        approves/rejects
(Zero Private Keys)  (Zero State Changes)    delta review modal       in browser wallet
```

### Pre-Sign Simulation vs Post-Sign Execution Distinction
| Attribute | Pre-Sign Simulation (`eth_call`) | Post-Sign Execution (`eth_sendTransaction`) |
| :--- | :--- | :--- |
| **Blockchain State** | **Zero state change** (Isolated sandbox execution) | **Permanently written** to local Hardhat blockchain |
| **Cost** | 0 ETH (No gas fee deducted) | Deducts simulated gas from sender balance |
| **Private Key Required**| **NO** (Dry-run executed with sender override) | Wallet signs transaction securely inside extension |
| **Application Role** | Analyzes calldata, models token deltas, flags risks | Receives user's transaction hash and displays receipt |

---

## 4. Milestone 4 End-to-End Demonstration Scenarios

---

### SCENARIO A — CONNECT WALLET & LOCAL NETWORK VERIFICATION
- **Objective:** Verify non-custodial wallet connectivity, network badge, chain identification, balance query, and 1-click Wallet Analyzer integration.
- **Workflow:**
  1. Open the ChainShield dashboard at `http://localhost:5173`.
  2. Observe the header in the top-right corner:
     - Notice the green badge: **"LOCAL DEMO NETWORK (31337)"**.
     - If wallet is not connected, click **"Connect Wallet"**.
     - If MetaMask is installed, approve the standard `eth_requestAccounts` prompt.
  3. Once connected, observe:
     - Truncated address pill (e.g. `0x7099...79C8`).
     - Live native ETH balance (e.g. `10,000.00 ETH`).
     - Click **"Copy"** button to copy the EIP-55 address to clipboard.
  4. Navigate to **Wallet Analyzer** (`/wallets`):
     - Notice the blue alert banner detecting your active connected wallet:  
       `"Active Connected Wallet Detected: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"`
     - Click **"Analyze Connected Wallet"**.
     - Verify instant risk assessment (LOW RISK, 0/100, verified local testnet account).
- **Viva Talking Point:**
  > *"ChainShield queries safe public blockchain state—address, balance, and chain ID—without ever requesting or handling private keys or custodial access."*

---

### SCENARIO B — SAFE TOKEN TRANSFER (BUILD $\rightarrow$ SIMULATE $\rightarrow$ SIGN $\rightarrow$ RECEIPT)
- **Objective:** Demonstrate end-to-end safe ERC-20 transfer: visual form input, automatic ABI calldata generation, pre-execution state delta simulation, risk review, explicit user wallet signing, and post-signing mined transaction receipt.
- **Workflow:**
  1. Navigate to **Transaction Analyzer** (`/transactions`).
  2. In the **Transaction Preparation** section, select **Preset**: **"A: Safe Transfer"** (or use the interactive form):
     - **Operation:** `ERC-20 Transfer`
     - **Token Address:** `0x5FbDB2315678afecb367f032d93F642f64180aa3` (`MockERC20 / SHLD`)
     - **Recipient Address:** `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (`LOCAL DEMO RECIPIENT` / Hardhat Account #2, Wallet B)
     - **Amount:** `250.0`
     - Notice the **Generated Calldata Preview** updating in real time (`0xa9059cbb...`).
  3. Click **"Run Pre-Execution Simulation"**.
  4. Review the Pre-Sign Simulation Results:
     - **Simulation Status:** `SUCCESS` (Green)
     - **Decoded Call:** `transfer(address to, uint256 amount)`
     - **Token Balance Changes:** Sender (`-250.0 SHLD`), Recipient (`+250.0 SHLD`).
     - **Risk Score:** `LOW RISK (0/100)` — No critical threat indicators.
  5. Notice the primary action button: **"Continue to Wallet Review"**.
  6. Click **"Continue to Wallet Review"**:
     - The **Transaction Security Review Modal** appears.
     - Review the structured facts: Network (`LOCAL DEMO NETWORK 31337`), Operation (`transfer()`), Expected Effects, and Risk Breakdown.
     - Check the mandatory acknowledgment: *"I understand this transaction will be submitted to my connected wallet for explicit signing."*
     - Click **"Approve & Open Wallet"**.
  7. MetaMask opens with the transaction prompt. Click **Confirm** in your wallet.
  8. ChainShield captures the broadcasted transaction hash, waits for block confirmation on Hardhat, and renders the **Post-Signing Execution Receipt**:
     - **Status:** `CONFIRMED / MINED ON LOCAL BLOCKCHAIN`
     - **Transaction Hash:** (e.g. `0x4e8b...`)
     - **Block Number:** (e.g. `Block #12`)
     - **Gas Used:** (e.g. `51,240 gas`)
     - Notice the explicit banner: *"This transaction was broadcast and mined on the local Hardhat demo network. State changes are now permanently applied on-chain."*
- **Viva Talking Point:**
  > *"ChainShield implements a strict two-phase separation: users first inspect simulated balance changes in an explainable review modal; only after explicit confirmation does the browser wallet handle signing. The application never broadcasts transactions autonomously."*

---

### SCENARIO C — LARGE / UNLIMITED TOKEN APPROVAL DETECTION
- **Objective:** Demonstrate that dangerous token approvals to untrusted spenders are intercepted and explained before the user signs.
- **Workflow:**
  1. In the **Transaction Analyzer**, select **Preset**: **"B: Unlimited Approval"** (or use the interactive form):
     - **Operation:** `ERC-20 Approve`
     - **Token Address:** `0x5FbDB2315678afecb367f032d93F642f64180aa3` (`MockERC20`)
     - **Spender Address:** `0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0` (`DangerousApprovalSpender`)
     - **Toggle:** Check **"Unlimited Approval (MAX_UINT256)"**.
  2. Click **"Run Pre-Execution Simulation"**.
  3. Review the Pre-Sign Simulation Results:
     - **Simulation Status:** `SUCCESS` (The EVM call itself does not revert).
     - **Decoded Call:** `approve(spender, uint256 amount)` flagged as `UNLIMITED (1.15792e+77 tokens)`.
     - **Projected Allowance Change:** Allowance increased from `0` to `MAX_UINT256`.
     - **Risk Score:** `HIGH RISK (77/100)`.
     - **Indicators:**
       - `IND-T01`: Unlimited Token Approval Requested
       - `IND-T02`: Approval Granted to Suspected Drainer / Malicious Spender
     - **Human-Readable Advice:** *"Review approved token allowances and consider setting an exact required amount instead of MAX_UINT."*
  4. Click **"Continue to Wallet Review"**:
     - The **Security Review Modal** displays prominent amber warning banners:  
       `"HIGH RISK: Unlimited allowance granted to a flagged spender."`
     - The user is fully informed of the financial implications before deciding whether to sign.
- **Viva Talking Point:**
  > *"A standard wallet merely asks 'Approve access to your tokens?' without highlighting that the approval amount is unlimited and the spender is a known drainer. ChainShield explains the true blast radius before the signature prompt appears."*

---

### SCENARIO D — REVERTING TRANSACTION (HONEYPOT TRANSFER LOCK INTERCEPTION)
- **Objective:** Show how ChainShield prevents wasted gas and catches honeypot scams by strictly disabling wallet signing when pre-execution simulation reverts.
- **Workflow:**
  1. In the **Transaction Analyzer**, select **Preset**: **"D: Honeypot Revert"**:
     - **To (Token):** `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` (`HoneypotToken / TRAP`)
     - **Calldata:** `transfer(...)`
  2. Click **"Run Pre-Execution Simulation"**.
  3. Review the Results:
     - **Simulation Status:** `REVERTED` (Bright Red)
     - **Revert Reason:** `"HoneypotToken: Trading is locked by owner"`
     - **Risk Score:** `CRITICAL RISK (90 - 100/100)`
     - **Indicators:**
       - `IND-T03`: Simulation Revert / Execution Failure
       - `IND-C03`: Trading Disabled or Transfer Blacklist Present
  4. Notice the Action Button:
     - The **"Continue to Wallet Review"** button is **disabled** with clear messaging:  
       `"Signing Disabled: Transaction will fail on-chain"`.
- **Viva Talking Point:**
  > *"By running an isolated eth_call dry-run, ChainShield intercepts the transaction revert beforehand and blocks the signing prompt, preventing the user from wasting gas fees on a malicious contract."*

---

### SCENARIO E — WRONG NETWORK HANDLING & SWITCHING
- **Objective:** Demonstrate safe network validation without silent network alterations.
- **Workflow:**
  1. In MetaMask, switch to **Ethereum Mainnet** or **Sepolia Testnet**.
  2. Notice the ChainShield header updates immediately:
     - Red badge: **"UNSUPPORTED NETWORK (Chain ID: 1)"** (or `11155111`).
     - A clear warning button appears: **"Switch to Hardhat"**.
  3. In the Transaction Analyzer, a prominent amber notification appears warning the user that live execution is restricted to the local demo network (Chain ID 31337).
  4. Click **"Switch to Hardhat"**:
     - ChainShield triggers `wallet_switchEthereumChain` for `0x7a69` (31337).
     - MetaMask prompts the user to confirm the network switch.
     - Once confirmed, the header badge turns green: **"LOCAL DEMO NETWORK (31337)"**.
- **Viva Talking Point:**
  > *"ChainShield strictly adheres to non-custodial safety: it never silently switches networks in the background and always requires the user's explicit consent."*

---

---

## 5. Milestone 5 Smart Contract Security Analyzer Demonstration Scenarios

Navigate to **Smart Contract Risk Analyzer** (`/contracts`).

---

### SCENARIO A — SAFE DEMO CONTRACT (`SafeVault` / `MockERC20`)
- **Objective:** Demonstrate analysis of an audited benign escrow vault with transparent accounting.
- **Workflow:**
  1. Click the preset button: **"SafeVault (Escrow)"** (Address: `0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0`).
  2. Click **"Analyze Contract"**.
  3. Review the 9-Section Report:
     - **Contract Overview:** Classified as `CONTRACT`, `Code Deployed (1,420 bytes)`, `Local Verified Source`.
     - **Risk Score:** `LOW RISK (5/100)`.
     - **Capabilities:** `ESCROW_VAULT` (Deposit and withdrawal accounting methods), `OWNERSHIP_CONTROL`.
     - **Ownership & Access Control:** Centralized owner present (`0xf39Fd6...`), standard non-proxy architecture.
     - **Technical Details:** ABI functions `deposit()`, `withdraw(uint256)`, events `Deposit`, `Withdraw`.
- **Viva Talking Point:**
  > *"ChainShield detects standard OpenZeppelin patterns, verified accounting methods, and absence of transfer locks or drainer mechanisms, resulting in a LOW risk rating."*

---

### SCENARIO B — DANGEROUS APPROVAL SPENDER (`DangerousApprovalSpender`)
- **Objective:** Demonstrate detection of an unconstrained balance siphoning drainer pattern.
- **Workflow:**
  1. Click the preset button: **"DangerousApprovalSpender"** (Address: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`).
  2. Click **"Analyze Contract"**.
  3. Review the Findings:
     - **Risk Score:** `HIGH / CRITICAL RISK (60-85/100)`.
     - **Capabilities Detected:** `EXTERNAL_ASSET_SIPHON` (Severity: CRITICAL).
     - **Itemized Indicators:**  
       - `IND-C08`: Arbitrary Balance Extraction Function (+40)
       - `IND-W01`: Cataloged Threat Feed Match (+35)
     - **Actionable Guidance:** *"DO NOT grant token approval or allowance to this address. Revoke existing allowances immediately."*
- **Viva Talking Point:**
  > *"ChainShield identifies the siphonTokens method signature and cross-references local threat intelligence to warn users before granting token allowances."*

---

### SCENARIO C — HONEYPOT DEMO CONTRACT (`HoneypotToken`)
- **Objective:** Demonstrate detection of transfer locks and owner blacklisting mechanisms.
- **Workflow:**
  1. Click the preset button: **"HoneypotToken (TrapToken)"** (Address: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`).
  2. Click **"Analyze Contract"**.
  3. Review the Findings:
     - **Risk Score:** `CRITICAL RISK (95/100)`.
     - **Capabilities:** `TOKEN_STANDARD_ERC20`, `BLACKLIST_CAPABILITY` (CRITICAL), `OWNERSHIP_CONTROL`.
     - **Indicators:**
       - `IND-C03`: Honeypot Trading Lock Mechanism (+50)
       - `IND-C04`: Arbitrary Account Blacklist Capability (+25)
       - `IND-W01`: Threat Feed Match (+40)
     - **Actionable Guidance:** *"DO NOT purchase, swap, or send funds to this smart contract. Tokens are non-transferable."*
- **Viva Talking Point:**
  > *"ChainShield does not make unsupported blanket claims; it flags specific observed indicators—transfer lock state, blacklist methods, and threat feed records—with verifiable on-chain evidence."*

---

### SCENARIO D — EOA ADDRESS ANALYSIS
- **Objective:** Verify proper classification of non-contract addresses.
- **Workflow:**
  1. Click preset button: **"User Account (EOA)"** (Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
  2. Click **"Analyze Contract"**.
  3. Review the Findings:
     - **Account Classification:** `EOA` (Externally Owned Account).
     - **Bytecode Status:** `No Code (EOA)` (0 bytes).
     - **Risk Score:** `LOW RISK (0/100)`.
     - **Guidance:** *"Address is an individual wallet account (EOA). No smart contract bytecode exists. Use the Wallet Risk Analyzer for counterparty forensics."*
- **Viva Talking Point:**
  > *"When an address contains no deployed bytecode, ChainShield clearly classifies it as an EOA rather than fabricating contract methods or false positives."*

---

### SCENARIO E — INVALID ADDRESS VALIDATION
- **Objective:** Verify front-end and back-end validation without unnecessary RPC calls.
- **Workflow:**
  1. Enter an invalid string into the address field: `0xinvalid123`.
  2. Click **"Analyze Contract"**.
  3. Observe immediate validation error:  
     `"Invalid EVM address: Address must be 42 characters starting with '0x'."`
- **Viva Talking Point:**
  > *"Strict input validation prevents malformed RPC queries and protects against invalid state processing."*

---

## 6. Milestone 6 Demonstration: Transaction Graph & Address Intelligence

Milestone 6 provides an interactive forensic graph dashboard to explore multi-hop on-chain relationships, trace token flows, and inspect evidence-based indicators.

### 6.1 Seeding the Deterministic Demonstration Topology
Before demonstrating the graph, run the deterministic seeding script to generate on-chain transactions on local Hardhat:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-demo-transactions.ps1
```
This executes real transactions on Hardhat:
- `Deployer` funds `Wallet A` and `Wallet B` with native ETH.
- `Wallet A` transfers 2.0 ETH to `Wallet B`.
- `Wallet B` transfers 1.0 ETH to `Wallet C`.
- `Wallet A` approves and deposits 500 SHLD into `SafeVault`.
- `Wallet A` transfers 250 SHLD to `Wallet B`.
- `Wallet B` grants unlimited `MAX_UINT256` allowance to `DangerousApprovalSpender`.
- `Wallet B` transfers 50 SHLD to `Wallet C`.
- `Wallet C` transfers 10 SHLD back to `Wallet B`.

### 6.2 Step-by-Step Viva Demonstration Walkthrough

#### Step 1: Open Transaction Graph
1. In the sidebar, click **"Transaction Graph"**.
2. Notice the search bar, demo node preset pills, depth controls, node/edge filters, and forensic analytics metrics.

#### Step 2: Center Graph on Wallet A
1. Click the preset button: **"Wallet A (User)"** (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
2. Observe the interactive SVG graph:
   - **Center Node:** Glowing cyan ring indicates the center search entity.
   - **Concentric Radial Rings:** Directly connected counterparties (Wallet B, SafeVault) placed on Ring 1; multi-hop accounts (Wallet C, Spender) on Ring 2.
   - **Color-Coded Directed Edges:**
     - Cyan lines: Native ETH transfers (`2.0 ETH`).
     - Green lines: ERC-20 token movements (`250 SHLD`).
     - Purple dashed lines: Contract interactions (`deposit()`, `approve()`).

#### Step 3: Inspect Selected Node & Threat Overlay
1. Click on **DangerousApprovalSpender** in the graph canvas.
2. In the right-hand **Inspector Panel**:
   - Classification displays `CONTRACT` with badge.
   - Evidence-based threat indicator is shown: `IND-THREAT-01` (Threat Registry Match).
   - Click **"Inspect in Contract Analyzer →"** to seamlessly navigate to contract bytecode forensics.
3. Click on **Wallet A**:
   - Shows live 10,000 ETH balance and transaction count.
   - Displays `LOW RISK` badge.
   - **Key Viva Talking Point:** *"ChainShield does not engage in guilt-by-association. Interacting with Wallet B, who later interacted with a dangerous spender, does NOT falsely flag Wallet A as malicious. Indicators must remain strictly evidence-based."*

#### Step 4: Inspect Selected Edge
1. Click on the green line connecting **Wallet A** and **Wallet B**.
2. The Inspector Panel updates to show:
   - Relationship: `TOKEN_TRANSFER`
   - Transaction Hash with 1-click copy button
   - Amount: `250.0 SHLD`
   - From: `0x7099...` $\rightarrow$ To: `0x3c44...`
   - Block Number and Network: `LOCAL_DEMO_NETWORK`

#### Step 5: Test Graph Filters & Depth
1. Change **Depth** to `1`: Graph shrinks to only direct neighbors (Wallet B, SafeVault).
2. Change **Depth** to `2`: Graph expands to multi-hop entities (Wallet C, Spender).
3. Click **"Wallets Only"**: Contracts (SafeVault, Spender) are filtered out, displaying only wallet-to-wallet flows.
4. Click **"Tokens Only"**: Displays only ERC-20 token transfer edges.

#### Step 6: Explore On-Chain Path
1. Click **"Explore Path"** in the top-right corner.
2. Enter:
   - Source: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Wallet A)
   - Target: `0x90F79bf6EB2c4f870365E785982E1f101E93b906` (Wallet C)
   - Max Hops: `3`
3. Click **"Trace"**:
   - Path found: **2 Hops**
   - Hop chain rendered: `Wallet A` $\xrightarrow{\text{SENT_NATIVE / TOKEN_TRANSFER}}$ `Wallet B` $\xrightarrow{\text{SENT_NATIVE / TOKEN_TRANSFER}}$ `Wallet C`
   - Disclaimer clearly presented: *"An observed path reflects recorded historical transaction sequence. It does not demonstrate collusion, common ownership, or malicious coordination between entities."*

---

## 7. Milestone 7: Unified End-to-End Intelligence Demonstration

Milestone 7 transforms ChainShield from individual modules into a coherent, interconnected security intelligence platform.

### 7.1 The Complete 16-Step Evaluation Workflow

```
[ Dashboard ] ──▶ [ Global Search ] ──▶ [ Address Investigation ] ──▶ [ Forensic Graph ]
      │                                            │                          │
      ▼                                            ▼                          ▼
[ Network Status ]                        [ Security & Evidence ]       [ Node Selection ]
                                                   │                          │
                                                   ▼                          ▼
                                          [ Contract Analysis ] ──▶ [ Prepare Candidate Tx ]
                                                                              │
                                                                              ▼
[ Verified History ] ◀── [ User Decision / Sign ] ◀── [ Pre-Sign Modal ] ◀── [ Dry-Run Simulation ]
```

1. **Start Hardhat Local EVM Node**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\start-hardhat.ps1
   ```
2. **Deploy Testbed Contracts**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-contracts.ps1
   ```
3. **Seed Deterministic Demo Blockchain Activity**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\seed-demo-data.ps1
   ```
4. **Start Spring Boot Enterprise Backend**:
   ```powershell
   cd backend ; .\mvnw.cmd spring-boot:run
   ```
5. **Start Python Secondary Risk Service** (Optional):
   ```powershell
   cd analysis ; uvicorn app.main:app --port 8000
   ```
6. **Start Vite React Frontend**:
   ```powershell
   cd frontend ; npm run dev
   ```
7. **Access Dashboard Command Center**:
   - Navigate to `http://localhost:5173/`.
   - Inspect **Environment Status Bar**:
     - Backend: `CONNECTED (8080)`
     - Blockchain Node: `CONNECTED (Block #...)`
     - Network ID: `LOCAL DEV (31337)`
     - Web3 Wallet: `CONNECTED / DISCONNECTED`
   - Review **Security Overview Metrics**:
     - Total Scanned Entities, High-Risk Detections, Simulations Executed, and Active Threat Indicators.
   - Inspect **Risk Severity Distribution**:
     - Visual breakdown of actual database-stored assessments (LOW, MEDIUM, HIGH, CRITICAL).
   - Inspect **Recent Real-Time Feeds**:
     - Recent Analyses, Local-Demo Transactions, Pre-Execution Simulations, and Flagged Addresses.
8. **Execute Global Search**:
   - In the dashboard search bar, enter `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (or click `Wallet A` preset).
   - The address is automatically validated and classified as `EOA (Externally Owned Account)`.
   - Click **"Investigate Address"** or press Enter.
9. **Explore the Unified Investigation View**:
   - The view consolidates 5 dedicated forensic tabs:
     - **Overview**: Native ETH balance, transaction count, risk evaluation callout, counterparty preview.
     - **Security**: Visual `RiskScoreCard`, explainable summary, limitations disclaimer, and `EvidencePanel`.
     - **Transactions**: Itemized on-chain transactions and counterparty flows.
     - **Contract Details**: (Active when inspecting smart contracts: bytecode presence, compiler version, ownership).
     - **Graph**: Embedded interactive relationship topology.
10. **Evidence-First Security Panel**:
    - Each triggered indicator displays:
      - **Rule ID**: Deterministic detection rule (e.g. `IND-W01`, `IND-T01`).
      - **Title & Severity**: Colored risk badge (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
      - **Applied Weight**: Numerical contribution (e.g. `+40 pts`).
      - **Evidence**: Concrete observed value (e.g. method signature, address).
      - **Why it matters**: Plain-language risk explanation.
      - **Data Source**: Clearly labeled as `LOCAL_BLOCKCHAIN`, `LOCAL_SIMULATION`, or `BYTECODE_ANALYSIS`.
      - **Limitations**: Explicit disclaimer that observation alone does not establish malicious intent.
11. **Pivot to Forensic Transaction Graph**:
    - Click **"Explore in Transaction Graph"** button.
    - Graph centers on target address with interactive radial layout.
    - Use Pan & Zoom controls, depth selector (1, 2, 3 hops), and node/edge filters.
    - Click on contract node `HoneypotToken` (`0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`).
    - In Inspector Panel, review indicators, then click **"Inspect in Contract Analyzer →"**.
12. **Perform Smart Contract Forensics**:
    - Contract analyzer automatically scans Honeypot bytecode.
    - Observes `setTradingOpen` lock and `setBlacklisted` owner privileges.
    - Evaluates cumulative risk score: `95/100 (CRITICAL)`.
    - Click **"Prepare Transaction"** in cross-module actions.
13. **Prepare Candidate Transaction**:
    - Guided Transaction Builder populates destination contract `0xCf7E...` and calldata.
    - Toggle between Guided Builder and Direct Calldata modes.
14. **Run Pre-Execution Safe Simulation**:
    - Click **"Run Pre-Execution Simulation"**.
    - Backend coordinates read-only `eth_call` dry-run on Hardhat (0 ETH gas spent, zero state changes).
    - Detects explicit EVM revert: `HoneypotToken: Trading is locked by owner`.
    - Critical warning banner explains that funds would be permanently lost.
15. **Explicit Security Review Modal**:
    - When testing Scenario B (Unlimited Approval) or Scenario A (Safe Transfer), click **"Continue to Wallet"**.
    - Modal highlights the strict difference:
      - `PRE-SIGN SIMULATION`: No blockchain state changed.
      - `POST-SIGN TRANSACTION`: User explicitly approves state alteration.
    - User must check the mandatory acknowledgment checkbox before the signing button activates.
16. **Audit Trail & Persisted History**:
    - Navigate to **"Audit & History"** (`/reports`).
    - **Analysis History Tab**: Filter by `WALLET`, `CONTRACT`, `TRANSACTION` or search by address.
    - **Transaction History Tab**: View unified feed of on-chain mined transactions and pre-sign dry-runs.
    - Click **"Export Audit Trail"** to download JSON compliance record or **"Print Report"**.

---

## 8. Resetting the Local Environment

If at any point during testing the local node state needs to be refreshed:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\reset-environment.ps1
```
This cleans compiled artifacts, recompiles the Solidity contracts, and runs the contract tests to ensure a clean slate.


