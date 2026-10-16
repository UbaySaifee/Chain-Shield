# ChainShield: Blockchain Architecture & Smart Contract Design

**Project:** ChainShield: An Explainable Blockchain-Based Cryptocurrency Transaction and Smart Contract Risk Analysis System  
**Academic Degree:** Master of Computer Applications (MCA)  
**Blockchain Framework:** Solidity `^0.8.24` / Hardhat Development Network  
**RPC Endpoint:** `http://127.0.0.1:8545` (Chain ID: `31337`)  
**Status:** Milestone 5 Implemented & Verified

> **IMPORTANT DISCLAIMER:**  
> *"ChainShield is a prototype security-analysis system. Its risk assessment is not a guarantee that a transaction or contract is safe or malicious."*


---

## 1. Local EVM Development Environment

To ensure reproducible, zero-cost, and secure demonstration of blockchain threat vectors, ChainShield leverages an isolated local Hardhat node.

### 1.1 Local Hardhat Node Configuration
- **Port:** `8545`
- **Network Name:** `localhost` / `hardhat`
- **Chain ID:** `31337`
- **Default Accounts:** 20 pre-funded test accounts with 10,000 test ETH each.
- **State Persistence:** Deterministic mnemonic (`test test test test test test test test test test test junk`) ensuring consistent deployment addresses and account keys.
- **Zero Real Funds:** Operates exclusively offline on simulated EVM state without real cryptocurrency.

### 1.2 Windows Management Scripts
ChainShield includes automated PowerShell scripts in the root `scripts/` directory for Windows environments:
- **`.\scripts\start-hardhat.ps1`**: Starts the local Hardhat JSON-RPC node on `http://127.0.0.1:8545`.
- **`.\scripts\deploy-contracts.ps1`**: Compiles contracts and deploys the testbed suite to the local node.
- **`.\scripts\reset-environment.ps1`**: Cleans artifacts/cache, recompiles Solidity, and executes all 11 contract tests.

---

## 2. Test Smart Contracts Suite

ChainShield provides four custom smart contracts deployed to the local testbed to demonstrate benign vs threat behaviors:

```
blockchain/contracts/
├── MockERC20.sol                  (Standard OpenZeppelin ERC-20: "ShieldToken" / "SHLD")
├── SafeVault.sol                  (Clean escrow vault with verified deposit/withdraw)
├── DangerousApprovalSpender.sol   (Allowance exploit contract that drains tokens on approval)
└── HoneypotToken.sol              (Honeypot token where owner toggles trading locks & blacklists)
```

### 2.1 Contract Specifications & Demonstration Roles

#### A. `MockERC20.sol` (Benign Reference Token)
- **Address (deterministic):** `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Purpose:** Represents a standard ERC-20 utility token (`"ShieldToken"`, symbol `"SHLD"` with 18 decimals).
- **Features:** Standard OpenZeppelin `ERC20` implementation with `mint`, `burn`, `approve`, `transfer`, and `transferFrom`.
- **Pre-Funded Balance:** Deployed script automatically funds the primary test wallet (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) with 50,000 SHLD.
- **Risk Profile:** **LOW RISK (Score: 0 - 15)**.

#### B. `SafeVault.sol` (Benign Secure Escrow Vault)
- **Address (deterministic):** `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Purpose:** A decentralized escrow vault where users deposit and withdraw ERC-20 tokens safely.
- **Features:** Accounting with `deposit(uint256)` and `withdraw(uint256)`, verified events, non-reentrant state transitions, zero arbitrary minting.
- **Risk Profile:** **LOW RISK (Score: 0 - 10)**.

#### C. `DangerousApprovalSpender.sol` (Allowance Exploit Archetype)
- **Address (deterministic):** `0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0`
- **Purpose:** Simulates a malicious dApp / router designed to exploit unlimited ERC-20 allowances.
- **Attack Vector:** Once a victim grants approval (e.g. `type(uint256).max`), the spender calls `transferFrom` to siphon victim tokens into an attacker-controlled treasury (`drainTokens(address token, address victim)`).
- **Risk Profile:** **HIGH / CRITICAL RISK (Score: 75 - 85)**. Triggering `IND-T01` and `IND-T02`.

#### D. `HoneypotToken.sol` (Honeypot Scam Archetype)
- **Address (deterministic):** `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`
- **Purpose:** Implements a token that allows purchases or owner transfers, but intentionally reverts non-owner transfers when trading is locked or when an address is blacklisted.
- **Mechanism:** Internal `tradeLocked` boolean (set to `true` upon deployment) and `_isBlacklisted` mapping. Reverts with `"HoneypotToken: Trading is locked by owner"`.
- **Pre-Funded Balance:** Funded with 5,000 TRAP to test wallet `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`.
- **Risk Profile:** **CRITICAL RISK (Score: 90 - 100)**. Triggering `IND-C03` and `IND-T03`.

---

## 3. Multi-Tier Deployment Registry

To eliminate hardcoded addresses and prevent frontend/backend drift, `blockchain/scripts/deploy.js` exports identical deployment metadata to three locations upon deployment:
1. `blockchain/deployed-addresses.json` (Local Hardhat reference)
2. `backend/src/main/resources/deployed-contracts.json` (Java backend auto-discovery)
3. `frontend/src/config/contracts.json` (React UI component preset configuration)

### Registry JSON Format:
```json
{
  "chainId": 31337,
  "network": "localhost",
  "deployedAt": "2026-09-26T19:00:00Z",
  "testAccount": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "contracts": {
    "MockERC20": {
      "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "symbol": "SHLD",
      "type": "ERC20_TOKEN",
      "abiPath": "artifacts/contracts/MockERC20.sol/MockERC20.json"
    },
    "SafeVault": {
      "address": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "type": "BENIGN_VAULT"
    },
    "DangerousApprovalSpender": {
      "address": "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0",
      "type": "DANGEROUS_SPENDER"
    },
    "HoneypotToken": {
      "address": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      "symbol": "TRAP",
      "type": "HONEYPOT_TOKEN"
    }
  }
}
```

---

## 4. Backend Blockchain Provider & Simulation Engine

### 4.1 EvmRpcClient & Provider Architecture
The backend communicates with the Hardhat EVM via `com.chainshield.blockchain.client.EvmRpcClient`:
- Built using Java's high-performance standard `java.net.http.HttpClient` with Jackson JSON mapping.
- **Zero Heavy Web3 Dependencies:** Direct JSON-RPC 2.0 requests ensure 100% compatibility with Spring Boot 3.3.4 and Java 25.
- **Methods Supported:**
  - `eth_chainId`: Detects connected network ID (`31337`).
  - `eth_blockNumber`: Fetches current latest block height.
  - `eth_getBalance`: Queries native ETH balance.
  - `eth_getCode`: Checks if target address contains smart contract bytecode.
  - `eth_call`: Read-only execution dry-run (simulation).
  - `eth_estimateGas`: Gas consumption calculation for candidate payload.
- **Fault-Tolerant Fallback:** `HardhatBlockchainProvider` acts as the `@Primary` provider; if the Hardhat node is offline, it seamlessly delegates to `DemoBlockchainDataProvider` with informative status warnings.

### 4.2 Pre-Execution `eth_call` Simulation Flow
```
Candidate Transaction (from, to, value, data)
               │
               ▼
   [Calldata Decoding]
   Extracts selector, method signature, formatted amounts, spender/recipient
               │
               ▼
   [Pre-State Snapshot Reads]
   - ETH balance of 'from' and 'to'
   - If ERC-20: balanceOf(from), balanceOf(to), allowance(from, spender)
               │
               ▼
   [Execute eth_call on Hardhat Node]
   Dry-runs execution without broadcasting or state commit
         ├─► SUCCEEDS:
         │   - Gas estimate recorded via eth_estimateGas
         │   - Calculate projected state deltas (allowance changes, balance movements)
         │
         └─► REVERTS:
             - Decodes revert reason via standard ABI error decoders
             - Errors matched: Error(string) (0x08c379a0), Panic(uint256) (0x4e487b71)
             - State changes set to zero
               │
               ▼
   [Risk Engine Evaluation]
   Checks for unlimited approval (IND-T01), drainer spender (IND-T02), revert failure (IND-T03)
               │
               ▼
   [Structured Simulation Response]
```

---

## 5. Supported State Delta / Effect Analysis

ChainShield implements a practical, robust supported-subset state delta analyzer (`com.chainshield.simulation.StateEffectAnalyzer`):

### Supported Effect Types:
1. **ERC-20 Token Balance Changes:**
   - Detects `transfer` and `transferFrom` operations.
   - Calculates exact previous balance vs projected balance in decimal-formatted tokens (e.g. `500.0 SHLD`).
2. **ERC-20 Token Allowance Changes:**
   - Detects `approve` operations.
   - Computes previous allowance vs projected allowance.
   - Flags unlimited allowance if value equals $2^{256} - 1$ (`1.1579e+77` tokens) or $> 10^{24}$ wei.
3. **Native ETH Balance Deltas:**
   - Tracks outgoing transaction `valueWei` and projected gas cost ($Gas \times GasPrice$).
4. **Projected Event Logs:**
   - Simulates emitted events (`Transfer(from, to, value)`, `Approval(owner, spender, value)`).

### Limitations & Academic Boundaries:
- **No Full-EVM State Tracing:** ChainShield does not claim to trace every private contract internal storage slot (`sstore`) across unindexed proxy delegates. Instead, it inspects deterministic, observable external state changes (ERC-20 balances, allowances, native balances).
- **Offline Local Boundary:** Operates on local Hardhat state; does not simulate mainnet or testnet reentrancy across complex multi-contract DeFi flash-loan protocols.

---

## 6. Optional Fork Mode Support

ChainShield's `blockchain/hardhat.config.js` supports an optional EVM mainnet/testnet fork mode configured strictly via environment variables:
```javascript
// hardhat.config.js
networks: {
  hardhat: {
    chainId: 31337,
    forking: process.env.EVM_FORK_URL ? {
      url: process.env.EVM_FORK_URL,
      blockNumber: process.env.EVM_FORK_BLOCK ? parseInt(process.env.EVM_FORK_BLOCK) : undefined
    } : undefined
  }
}
```
- **Default:** Disabled. Local Hardhat node is the primary standalone path.
- **Safety:** Read-only simulation even when fork mode is active; no transactions are broadcast and no real private keys are ever utilized.

---

## 7. Web3 Wallet Provider Integration & Non-Custodial Architecture (Milestone 4)

In Milestone 4, ChainShield introduces user-controlled Web3 wallet connectivity and transaction preparation while preserving strict non-custodial boundaries.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    NON-CUSTODIAL WALLET ARCHITECTURE                         │
│                                                                              │
│  Browser Wallet (MetaMask / EIP-1193)                                        │
│  ┌────────────────────────────────────────────────────────┐                  │
│  │ Private Keys & Seed Phrases (Kept 100% inside wallet)  │                  │
│  └──────────────────────────┬─────────────────────────────┘                  │
│                             │ Public State Only (address, chainId, balance)  │
│                             ▼                                                │
│  ChainShield Frontend (React WalletContext + Ethers.js v6)                   │
│  ┌────────────────────────────────────────────────────────┐                  │
│  │ 1. Connects via window.ethereum (EIP-1193)             │                  │
│  │ 2. Identifies Chain ID (31337 = LOCAL DEMO NETWORK)    │                  │
│  │ 3. Prepares transaction via Form / ABI Encoder         │                  │
│  │ 4. Submits payload to Backend Simulation Engine        │                  │
│  └──────────────────────────┬─────────────────────────────┘                  │
│                             │ POST /api/transaction/simulate                 │
│                             ▼                                                │
│  ChainShield Backend (Explainable Simulation Engine)                         │
│  ┌────────────────────────────────────────────────────────┐                  │
│  │ Runs read-only eth_call on Hardhat EVM (Port 8545)     │                  │
│  │ Decodes state deltas, evaluates threat indicators      │                  │
│  └──────────────────────────┬─────────────────────────────┘                  │
│                             │ Returns Risk Score, Indicators & State Deltas  │
│                             ▼                                                │
│  Transaction Security Review Modal                                           │
│  ┌────────────────────────────────────────────────────────┐                  │
│  │ Displays explainable facts, risks, and projected delta │                  │
│  │ Requires explicit user acknowledgment to proceed       │                  │
│  └──────────────────────────┬─────────────────────────────┘                  │
│                             │ User clicks "Approve & Open Wallet"            │
│                             ▼                                                │
│  Browser Wallet Prompts User (eth_sendTransaction)                           │
│  ┌────────────────────────────────────────────────────────┐                  │
│  │ User explicitly signs and broadcasts on local Hardhat  │                  │
│  └──────────────────────────┬─────────────────────────────┘                  │
│                             │ Returns Transaction Hash (0x...)               │
│                             ▼                                                │
│  Post-Sign Execution Receipt                                                 │
│  Displays Mined Block Number, Status, Gas Used (eth_getTransactionReceipt)   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Non-Custodial Principles
1. **Zero Private Key Access:** ChainShield never requests, stores, displays, transmits, or logs private keys or seed phrases.
2. **Standard EIP-1193 Delegation:** All cryptographic signing is delegated to the user's browser wallet extension (MetaMask, Brave Wallet, Coinbase Wallet).
3. **No Autonomous Broadcasting:** Transactions are never broadcasted automatically; every execution requires two manual user actions:
   - Acknowledgment in the ChainShield Security Review Modal.
   - Explicit confirmation in the connected browser wallet.
4. **Pre-Sign Simulation vs Post-Sign Execution:**
   - **Pre-sign simulation** (`eth_call`) executes without state mutation, costing 0 gas.
   - **Post-sign execution** (`eth_sendTransaction`) writes to the local Hardhat state and produces an on-chain mined receipt.

### 7.2 Local Network Enforcement (Chain ID 31337)
- ChainShield validates that the active wallet chain matches `31337` (`0x7a69`).
- When connected to an unsupported network (e.g. Ethereum Mainnet, Sepolia):
  - A prominent red warning badge is displayed in the header.
  - An explicit **"Switch to Hardhat"** button triggers `wallet_switchEthereumChain` / `wallet_addEthereumChain`.
  - The application *never* silently alters the user's network.

### 7.3 Simulator Fallback Mode
For environments where browser wallet extensions are unavailable (e.g. automated grading scripts, headless browsers, university presentation PCs):
- ChainShield provides a graceful **Simulator Demo Account** fallback (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
- Allows full interactive evaluation of transaction preparation, simulation, calldata inspection, and security reviews without requiring an installed wallet extension.

---

## 8. Blockchain Transaction Graph & Address Intelligence Architecture (Milestone 6)

Milestone 6 introduces a normalized transaction graph and forensic address intelligence system operating on local Hardhat blockchain data and database records.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   TRANSACTION GRAPH FORENSIC PIPELINE                       │
│                                                                             │
│  Central Address Query (0x...)                                              │
│  ┌───────────────────────────┐                                              │
│  │ 1. Address Classification │ ──► EOA vs Contract Bytecode Check           │
│  │ 2. Live EVM State Query   │ ──► Balance (ETH) & Transaction Count (Nonce)│
│  └─────────────┬─────────────┘                                              │
│                ▼                                                            │
│  Bounded BFS Graph Builder                                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Traversal limits: Depth 1–3, Max Nodes: 50, Max Edges: 100            │  │
│  │ Cycle detection: Visited set tracks addresses to prevent infinite loops│  │
│  │ Relationship filters: Native Transfers, Token Transfers, Calls        │  │
│  │ Node filters: All Entities, Wallets Only, Contracts Only              │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      ▼                                      │
│  Normalized Graph Model                                                     │
│  ┌───────────────────────────────────┴───────────────────────────────────┐  │
│  │ Nodes: WALLET (EOA), CONTRACT (Bytecode present)                      │  │
│  │ Edges: SENT_NATIVE, RECEIVED_NATIVE, TOKEN_TRANSFER, CONTRACT_CALL    │  │
│  │ Analytics: In/Out Degree, Counterparties, Volume, Node/Edge Counts    │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      ▼                                      │
│  Evidence-Based Threat Indicator Overlay                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Concrete Rule Match: Known Threat Registry or Prior Risk Assessment   │  │
│  │ CRITICAL RULE: A transaction connection alone does NOT mark a node as │  │
│  │ fraudulent. Guilt by association is strictly avoided in forensics.    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Event & Calldata Extraction
- **ERC-20 Token Transfers:** Decoded from logs matching Topic 0 `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`. Captures `from`, `to`, `tokenContract`, formatted decimal amount, transaction hash, and block number.
- **Contract Calls:** Calldata decoded using `CalldataDecoder`, displaying method selector, signature, parameter values, and human interpretation.
- **Malformed & Non-ERC20 Handling:** Logs that do not adhere to 3-topic ERC-20 standards or unverified contracts are gracefully handled without crashing the pipeline.

### 8.2 Deterministic Demo Data Generator
A reproducible on-chain script (`blockchain/scripts/seed-demo-transactions.js` and `scripts/seed-demo-transactions.ps1`) establishes a multi-hop demonstration topology:
1. `Deployer` funds `Wallet A` and `Wallet B` with native ETH.
2. `Wallet A` sends 2 ETH to `Wallet B`.
3. `Wallet B` sends 1 ETH to `Wallet C`.
4. `Wallet A` approves `SafeVault` and deposits 500 SHLD.
5. `Wallet A` transfers 250 SHLD to `Wallet B`.
6. `Wallet B` grants unlimited `MAX_UINT256` allowance to `DangerousApprovalSpender`.
7. `Wallet B` transfers 50 SHLD to `Wallet C`.
8. `Wallet C` transfers 10 SHLD back to `Wallet B`.

### 8.3 Path Explorer
Implements BFS shortest-path exploration between any two addresses, returning the exact sequence of hops, edge types, values, and transaction hashes within a bounded search depth (up to 4 hops).



