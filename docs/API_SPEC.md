# ChainShield: REST API Specification

**Project:** ChainShield: An Explainable Blockchain-Based Cryptocurrency Transaction and Smart Contract Risk Analysis System  
**Version:** 1.0 (OpenAPI 3.0 Compatible)  
**Base URL:** `http://localhost:8080/api/v1`

---

## 1. Overview & Standard Conventions

- **Transport:** HTTP / HTTPS
- **Payload Format:** `application/json; charset=UTF-8`
- **Error Format:** RFC 7807 Problem Details for HTTP APIs
- **Address Formatting:** Hexadecimal Ethereum format with EIP-55 checksumming (`0x...`)

---

## 2. Endpoints Summary & Implementation Status

### 2.1 Implemented & Verified Endpoints (Milestones 1–7)

| Method | Endpoint | Spec Alias Endpoint | Description | Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | `/api/v1/health` | Service health status, system uptime, and runtime mode. | **Verified (M2)** |
| `GET` | `/api/v1/dashboard/stats` | - | Aggregated scan metrics, target breakdown, risk distributions, and recent feeds. | **Verified (M7)** |
| `POST` | `/api/wallet/analyze` | `/api/v1/analyze/wallet` | Explainable risk assessment for EVM wallet address. | **Verified (M2)** |
| `POST` | `/api/contract/analyze` | `/api/v1/analyze/contract` | Smart contract bytecode, permissions, and honeypot analysis. | **Verified (M2)** |
| `POST` | `/api/transaction/analyze`| `/api/v1/analyze/transaction`| Pre-execution transaction parameter and calldata risk evaluation. | **Verified (M2)** |
| `GET` | `/api/analyses` | `/api/v1/analyses` | Historical analysis audit trail list. | **Verified (M2)** |
| `GET` | `/api/analyses/{id}` | `/api/v1/analyses/{id}` | Detailed assessment record by UUID with contributing indicators. | **Verified (M2)** |
| `POST` | `/api/transaction/simulate` | `/api/v1/simulate` | Pre-execution `eth_call` dry-run, state effect deltas, and risk evaluation. | **Verified (M3)** |
| `GET` | `/api/blockchain/status` | - | Local Hardhat node status, chain ID, and current block height. | **Verified (M3)** |
| `GET` | `/api/blockchain/contracts` | - | Auto-discovered deployed testbed contracts and addresses. | **Verified (M3)** |
| `GET` | `/api/blockchain/receipt/{txHash}` | - | Local transaction confirmation status, block number, and execution receipt. | **Verified (M4)** |
| `POST` | `/api/reports/generate` | `/api/v1/reports/generate` | Generates a persistent security assessment report export. | **Verified (M5)** |
| `GET` | `/api/reports/{id}` | `/api/v1/reports/{id}` | Fetches an existing security assessment report by UUID. | **Verified (M5)** |
| `GET` | `/api/graph/{address}` | `/api/v1/graph/{address}` | Transaction relationship and counterparty graph topology (depth 1–3). | **Verified (M6)** |
| `POST` | `/api/graph/path` | `/api/v1/graph/path` | BFS shortest-path exploration between two EVM addresses. | **Verified (M6)** |
| `POST` | `/api/graph/seed-demo` | `/api/v1/graph/seed-demo` | Seeds deterministic demonstration graph topology. | **Verified (M6)** |
| `GET` | `/api/address/{address}/summary` | `/api/v1/address/{address}/summary` | Address summary, EVM classification (EOA/CONTRACT), and counterparty stats. | **Verified (M7)** |
| `GET` | `/api/transactions/history` | `/api/v1/transactions/history` | Historical pre-sign simulations and recorded on-chain transactions. | **Verified (M7)** |

> **IMPORTANT DISCLAIMER:**
> *ChainShield is a prototype security-analysis system. Its risk assessment is not a guarantee that a transaction or contract is safe or malicious.*

---

## 3. Detailed Endpoint Specifications

### 3.1 Dashboard Statistics
`GET /dashboard/stats` (Alias: `GET /api/v1/dashboard/stats`)

**Description:** Aggregates security audit metrics, risk category counts, target breakdown, and recent simulation/transaction feeds directly from the database.

**Response (`200 OK`):**
```json
{
  "totalScannedEntities": 142,
  "highRiskDetectedCount": 38,
  "simulationsExecuted": 89,
  "activeThreatIndicatorsCount": 16,
  "riskDistribution": {
    "LOW": 62,
    "MEDIUM": 42,
    "HIGH": 26,
    "CRITICAL": 12
  },
  "walletAnalysesCount": 78,
  "contractAnalysesCount": 42,
  "transactionAnalysesCount": 22,
  "recentAssessments": [
    {
      "id": "a98e2c04-f52e-4b61-9c88-e214cb831d10",
      "targetAddress": "0x71C8450000000000000000000000000000000001",
      "targetType": "CONTRACT",
      "overallScore": 88,
      "riskCategory": "CRITICAL",
      "primaryWarning": "Honeypot transfer lock detected",
      "timestamp": "2026-09-26T11:20:00Z",
      "keyIndicators": ["CONTRACT-DRAIN-001", "HONEYPOT-LOCK-001"]
    }
  ],
  "recentSimulations": [
    {
      "id": "e45f9a12-88b1-4c44-b021-39c28e932b71",
      "fromAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "toAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "simulationStatus": "SUCCESS",
      "gasUsed": 45120,
      "revertReason": null,
      "simulatedAt": "2026-09-26T11:25:00Z"
    }
  ],
  "recentTransactions": [
    {
      "txHash": "0x89abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      "fromAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "toAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "valueEth": 0.5,
      "blockNumber": 42,
      "confirmed": true,
      "timestamp": "2026-09-26T11:26:00Z"
    }
  ],
  "recentAddresses": ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0x5FbDB2315678afecb367f032d93F642f64180aa3"],
  "recentIndicators": ["CONTRACT-DRAIN-001", "HONEYPOT-LOCK-001"]
}
```

---

### 3.2 Health Check Endpoint
`GET /api/health`

**Response (`200 OK`):**
```json
{
  "status": "UP",
  "service": "chainshield-backend",
  "timestamp": "2026-09-26T17:30:00Z",
  "version": "1.0.0",
  "database": "H2_IN_MEMORY (Profile: dev-h2 / Flyway v2)",
  "riskEngine": "DETERMINISTIC_HEURISTIC_V1",
  "dataProvider": "LOCAL_HARDHAT_DEMO_DATASET"
}
```

---

### 3.3 Wallet Risk Analysis
`POST /api/wallet/analyze` *(Spec alias: `POST /api/v1/analyze/wallet`)*

**Request Body:**
```json
{
  "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "chainId": 31337
}
```

**Response (`200 OK`):**
```json
{
  "id": "7f8b9e12-3456-4789-a012-3456789abcde",
  "targetAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "targetType": "WALLET",
  "score": 0,
  "severity": "LOW",
  "summary": "LOW RISK (Score: 0/100): No critical threat indicators detected. Account exhibits normal history on local devnet.",
  "disclaimer": "PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. Does not guarantee 100% exploit detection or financial safety.",
  "indicators": [],
  "recommendations": [
    "Address exhibits low risk on the local test network.",
    "Always verify destination addresses before initiating high-value transfers."
  ],
  "metadata": {
    "accountAgeDays": 45,
    "transactionCount": 12,
    "counterpartyCount": 5,
    "dataSource": "LOCAL_HARDHAT_DEMO_DATASET"
  },
  "timestamp": "2026-09-26T17:35:00Z"
}
```

---

### 3.4 Smart Contract Risk Analysis
`POST /api/contract/analyze` *(Spec alias: `POST /api/v1/analyze/contract`)*

Analyzes EVM contract bytecode, metadata, exposed ABI functions, administrative ownership privileges, behavioral capabilities, and proxy forwarders.

**Request Body:**
```json
{
  "contractAddress": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  "chainId": 31337
}
```

**Response (`200 OK` - `ContractAnalysisResponse`):**
```json
{
  "id": "9b12de34-5678-4901-b234-56789abcdef0",
  "targetAddress": "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
  "targetType": "CONTRACT",
  "score": 95,
  "severity": "CRITICAL",
  "summary": "CRITICAL RISK (Score: 95/100): High-severity threats detected. Interaction not recommended.",
  "disclaimer": "PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. Does not guarantee 100% exploit detection or financial safety.",
  "indicators": [
    {
      "code": "IND-C03",
      "category": "HONEYPOT_BEHAVIOR",
      "title": "Trading Disabled or Transfer Blacklist Present",
      "severity": "CRITICAL",
      "appliedWeight": 100,
      "explanation": "Contract has trading paused or a restrictive blacklist function that prevents token selling/transfers.",
      "evidence": "Trading disabled flag: true; Blacklist present: true"
    },
    {
      "code": "IND-W01",
      "category": "KNOWN_THREAT",
      "title": "Known Threat Feed Match",
      "severity": "CRITICAL",
      "appliedWeight": 40,
      "explanation": "Address matched active threat indicator in local intelligence database.",
      "evidence": "Threat Category: HONEYPOT_TOKEN (Source: LOCAL_DEMO)"
    }
  ],
  "recommendations": [
    "DANGER: Contract demonstrates honeypot or drainer patterns. Do not interact.",
    "Refrain from sending funds or approving tokens to this contract."
  ],
  "metadata": {
    "contractName": "TrapToken",
    "bytecodeSize": 2480,
    "isVerified": true,
    "dataSource": "LOCAL_HARDHAT_DEMO_DATASET"
  },
  "timestamp": "2026-09-26T20:25:00Z",
  "address": "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
  "network": "LOCAL_DEMO_NETWORK (Chain ID: 31337)",
  "accountType": "CONTRACT",
  "isContract": true,
  "accountClassification": "CONTRACT",
  "codeExists": true,
  "contractMetadata": {
    "name": "TrapToken",
    "symbol": "TRAP",
    "decimals": 18,
    "totalSupplyFormatted": "1,000,000.0 TRAP",
    "isErc20": true,
    "bytecodeSizeBytes": 2480,
    "sourceStatus": "LOCAL_VERIFIED",
    "isBytecodePresent": true,
    "deployedBytecodeSnippet": "0x608060405234801561001057600080fd5b506004... [truncated]",
    "compilerVersion": "v0.8.20",
    "license": "MIT",
    "contractName": "TrapToken",
    "sourceVerified": true
  },
  "ownershipInfo": {
    "hasOwner": true,
    "ownerAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "privilegeType": "OWNABLE_V2",
    "callableFunctions": ["transferOwnership", "renounceOwnership", "setBlacklisted", "setTradingOpen"],
    "whyItMatters": "Owner retains authority to restrict token trading, blacklist user balances, and halt liquidations.",
    "ownerDetected": true
  },
  "adminInfo": {
    "hasAdmin": true,
    "adminAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "accessControlDetected": false,
    "rolesSummary": ["DEFAULT_ADMIN_OWNER"],
    "details": "Single administrative keypair controls all privileged state changes."
  },
  "proxyInfo": {
    "proxyDetected": "NO",
    "implementationAddress": "None / Unknown",
    "adminAddress": "None / Unknown",
    "upgradeabilityDetected": "Not detected",
    "proxyType": "None",
    "isHeuristicIndicator": false
  },
  "abiInfo": {
    "abiAvailable": true,
    "contractName": "TrapToken",
    "functionsCount": 14,
    "eventsCount": 4,
    "functions": [
      {
        "name": "transfer",
        "signature": "transfer(address,uint256)",
        "stateMutability": "nonpayable",
        "isPrivileged": false,
        "category": "TOKEN_TRANSFER"
      },
      {
        "name": "setBlacklisted",
        "signature": "setBlacklisted(address,bool)",
        "stateMutability": "nonpayable",
        "isPrivileged": true,
        "category": "ADMIN_PRIVILEGE"
      }
    ],
    "events": [
      { "name": "Transfer", "signature": "Transfer(address,address,uint256)" }
    ],
    "detectedInterfaces": ["ERC20", "Ownable"]
  },
  "detectedCapabilities": [
    {
      "name": "TOKEN_STANDARD_ERC20",
      "description": "Implements standard ERC-20 token interface methods.",
      "severity": "LOW",
      "detectedEvidence": "transfer, approve, allowance, balanceOf present"
    },
    {
      "name": "BLACKLIST_CAPABILITY",
      "description": "Exposes owner methods to arbitrarily freeze specific accounts from sending or receiving tokens.",
      "severity": "CRITICAL",
      "detectedEvidence": "setBlacklisted(address,bool)"
    },
    {
      "name": "OWNERSHIP_CONTROL",
      "description": "Centralized administrative owner controls critical operational functions.",
      "severity": "MEDIUM",
      "detectedEvidence": "owner() address verified"
    }
  ],
  "limitations": "ChainShield performs heuristic static analysis, read-only simulation, and cataloged threat matching on local EVM state. It does not perform formal verification or trace unindexed private storage slots across dynamic multi-contract protocols. Its risk assessment is an educational evaluation and not an absolute guarantee that a contract is safe or malicious."
}
```


---

### 3.5 Transaction Risk Analysis
`POST /api/transaction/analyze` *(Spec alias: `POST /api/v1/analyze/transaction`)*

**Request Body:**
```json
{
  "fromAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "toAddress": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  "valueWei": "0",
  "calldata": "0x095ea7b3000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "chainId": 31337
}
```

**Response (`200 OK`):**
```json
{
  "id": "e4f5a6b7-c8d9-4012-e345-6789abcdef01",
  "targetAddress": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  "targetType": "TRANSACTION",
  "score": 52,
  "severity": "MEDIUM",
  "summary": "MEDIUM RISK (Score: 52/100): Moderate risk factors identified. Review contributing indicators carefully.",
  "disclaimer": "PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. Does not guarantee 100% exploit detection or financial safety.",
  "indicators": [
    {
      "code": "IND-T01",
      "category": "DANGEROUS_PERMISSIONS",
      "title": "Unlimited Token Approval Requested",
      "severity": "HIGH",
      "appliedWeight": 52,
      "contextExplanation": "Transaction requests unlimited (MAX_UINT256) allowance for spender 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512.",
      "evidenceData": "Spender: 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512; Method: approve(address,uint256)"
    }
  ],
  "recommendations": [
    "Review approved token allowances and consider setting an exact required amount instead of MAX_UINT."
  ],
  "metadata": {
    "methodSelector": "0x095ea7b3",
    "methodSignature": "approve(address,uint256)",
    "isUnlimitedApproval": true,
    "spender": "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
    "dataSource": "LOCAL_HARDHAT_DEMO_DATASET"
  },
  "timestamp": "2026-09-26T17:35:20Z"
}
```

---

### 3.6 Analysis History Audit Trail
`GET /api/analyses` *(Spec alias: `GET /api/v1/analyses`)*

**Response (`200 OK`):**
```json
[
  {
    "id": "9b12de34-5678-4901-b234-56789abcdef0",
    "targetAddress": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    "targetType": "CONTRACT",
    "score": 100,
    "severity": "CRITICAL",
    "summary": "CRITICAL RISK (Score: 100/100): High-severity threats detected. Interaction not recommended.",
    "timestamp": "2026-09-26T17:35:10Z"
  }
]
```

---

### 3.7 Detailed Analysis Record by ID
`GET /api/analyses/{id}` *(Spec alias: `GET /api/v1/analyses/{id}`)*

**Response (`200 OK`):** Returns the full `RiskAssessmentResponse` matching the target UUID, including all linked assessment indicators from `assessment_indicators` join table.
**Response (`404 NOT FOUND`):** Returns RFC 7807 Error details when the UUID is not present.

---

---

### 3.8 Safe Pre-Execution Transaction Simulation
`POST /api/transaction/simulate` *(Spec alias: `POST /api/v1/simulate`)*

**Description:** Performs an unsigned `eth_call` dry-run against the local Hardhat EVM (or simulated fallback), decodes transaction calldata, calculates projected token balance and allowance deltas, and evaluates simulation-specific risk indicators.

**Request Body:**
```json
{
  "from": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "valueWei": "0",
  "data": "0x095ea7b30000000000000000000000009fe46736679d2d9a65f0992f2272de9f3c7fa6e0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "chainId": 31337
}
```

**Response (`200 OK` - Success with Risk Assessment):**
```json
{
  "simulationStatus": "SUCCESS",
  "gasEstimated": 46210,
  "revertReason": null,
  "decodedCall": {
    "targetAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "methodSelector": "0x095ea7b3",
    "functionName": "approve",
    "functionSignature": "approve(address spender, uint256 amount)",
    "formattedExplanation": "Approve spender 0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0 to spend UNLIMITED (1.15792e+77 tokens)",
    "parameters": {
      "spender": "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0",
      "amount": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "amountFormatted": "UNLIMITED (1.15792e+77 tokens)"
    },
    "isUnlimitedApproval": true
  },
  "projectedStateChanges": {
    "nativeBalanceDeltaEth": "0.0 ETH (Gas fee ~0.00092 ETH)",
    "tokenBalanceChanges": [],
    "allowanceChanges": [
      {
        "tokenAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        "tokenSymbol": "SHLD",
        "owner": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "spender": "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0",
        "previousAllowance": "0",
        "projectedAllowance": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        "isUnlimited": true
      }
    ],
    "projectedEvents": [
      "Approval(0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0, 115792089237316195423570985008687907853269984665640564039457584007913129639935)"
    ]
  },
  "riskAssessment": {
    "score": 77,
    "severity": "HIGH",
    "summary": "HIGH RISK (Score: 77/100): High-severity threats detected. Proceed with caution.",
    "indicators": [
      {
        "code": "IND-T01",
        "category": "DANGEROUS_PERMISSIONS",
        "title": "Unlimited Token Approval Requested",
        "severity": "HIGH",
        "appliedWeight": 45,
        "contextExplanation": "Transaction requests maximum/unlimited allowance for spender 0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0.",
        "evidenceData": "Spender: 0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0"
      },
      {
        "code": "IND-T02",
        "category": "DANGEROUS_PERMISSIONS",
        "title": "Approval Granted to Suspected Drainer / Malicious Spender",
        "severity": "CRITICAL",
        "appliedWeight": 32,
        "contextExplanation": "Spender address 0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0 is flagged as a Dangerous Approval Spender or Phishing Drainer.",
        "evidenceData": "Flagged Spender: 0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0"
      }
    ],
    "recommendations": [
      "CRITICAL: Do NOT grant token approvals to unverified or flagged drainer contracts.",
      "Review approved token allowances and consider setting an exact required amount instead of MAX_UINT."
    ]
  },
  "humanExplanation": "HIGH RISK: Simulation dry-run succeeded, but this transaction grants UNLIMITED token spending approval to a flagged dangerous spender.",
  "recommendations": [
    "CRITICAL: Do NOT grant token approvals to unverified or flagged drainer contracts.",
    "Review approved token allowances and consider setting an exact required amount instead of MAX_UINT."
  ],
  "networkInfo": "LOCAL_HARDHAT_DEMO_NETWORK (Chain ID: 31337)"
}
```

---

### 3.9 Blockchain Status
`GET /api/blockchain/status`

**Response (`200 OK`):**
```json
{
  "connected": true,
  "nodeUrl": "http://127.0.0.1:8545",
  "chainId": 31337,
  "blockNumber": 4,
  "activeProvider": "Hardhat EVM Local Provider"
}
```

---

### 3.10 Deployed Testbed Contracts
`GET /api/blockchain/contracts`

**Response (`200 OK`):**
```json
{
  "contracts": {
    "MockERC20": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "SafeVault": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "DangerousApprovalSpender": "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0",
    "HoneypotToken": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  },
  "testAccount": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "chainId": 31337,
  "network": "localhost"
}
```

---

### 3.11 Transaction Execution Receipt
`GET /api/blockchain/receipt/{txHash}`

**Description:** Retrieves post-signing confirmation status, block number, gas used, and receipt details for an explicitly signed and broadcasted local demo transaction.

**Path Parameters:**
- `txHash` (string, required): 32-byte hex transaction hash prefixed with `0x`.

**Response (`200 OK` - Confirmed Transaction):**
```json
{
  "transactionHash": "0x5a1f2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
  "blockNumber": 12,
  "status": "CONFIRMED",
  "statusCode": "0x1",
  "from": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "to": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "gasUsed": 51240,
  "effectiveGasPrice": "1000000000",
  "logsCount": 1,
  "network": "LOCAL_HARDHAT_DEMO_NETWORK (Chain ID: 31337)"
}
```

**Response (`404 NOT FOUND` - Transaction Pending or Not Mined):**
```json
{
  "type": "https://chainshield.local/errors/receipt-not-found",
  "title": "Transaction Receipt Not Found",
  "status": 404,
  "detail": "No mined receipt located for transaction hash 0x5a1f2b... on local chain 31337.",
  "instance": "/api/blockchain/receipt/0x5a1f2b..."
}
```


### 3.12 Address Intelligence Summary
`GET /api/address/{address}/summary` (Alias: `GET /api/v1/address/{address}/summary`)

**Description:** Retrieves deep address intelligence including account classification (EOA vs Contract), native balances, historical transaction counts, contract interaction counts, token transfer counts, unique counterparties, first/last seen timestamps, related contracts, and evidence-grounded threat indicators.

**Path Parameters:**
- `address` (string, required): 42-character EVM address.

**Query Parameters:**
- `chainId` (integer, optional, default: 31337): EVM network chain ID.

**Response (`200 OK`):**
```json
{
  "address": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "accountType": "EOA",
  "isContract": false,
  "nativeBalanceEth": "9998.4520 ETH",
  "transactionCount": 15,
  "contractInteractionCount": 6,
  "tokenTransferCount": 4,
  "uniqueCounterpartiesCount": 3,
  "firstSeenAt": "2026-09-26T18:30:00Z",
  "lastActiveAt": "2026-09-26T20:15:00Z",
  "riskScore": 15,
  "riskSeverity": "LOW",
  "summary": "LOW RISK: Standard address on the local EVM environment with no active threat indicators.",
  "indicators": [],
  "relatedContracts": ["0x5fbdb2315678afecb367f032d93f642f64180aa3", "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0"],
  "relatedAddresses": ["0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc"],
  "dataAvailability": "COMPLETE_LOCAL",
  "network": "LOCAL_DEMO_NETWORK (Chain ID: 31337)",
  "disclaimer": "PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. Does not guarantee 100% exploit detection or financial safety."
}
```

---

### 3.13 Forensic Transaction Relationship Graph
`GET /api/address/{address}/graph` (Alias: `GET /api/v1/address/{address}/graph`)

**Description:** Builds a bounded, multi-hop topological graph centered on an EVM address, returning classified nodes, directed edges, and forensic analytics metrics.

**Path Parameters:**
- `address` (string, required): Central EVM address.

**Query Parameters:**
- `depth` (integer, optional, default: 1, range: 1..3): Graph exploration depth.
- `nodeType` (string, optional, default: `ALL`, options: `ALL`, `WALLETS`, `CONTRACTS`): Filter nodes by classification.
- `edgeType` (string, optional, default: `ALL`, options: `ALL`, `NATIVE`, `TOKEN`, `CONTRACT_CALL`): Filter edges by relationship type.
- `chainId` (integer, optional, default: 31337): EVM chain ID.

**Response (`200 OK`):**
```json
{
  "centerAddress": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "depth": 2,
  "nodes": [
    {
      "id": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      "label": "Wallet A (Test User)",
      "type": "WALLET",
      "isContract": false,
      "balanceEth": "9998.4520 ETH",
      "txCount": 15,
      "riskScore": 15,
      "riskSeverity": "LOW",
      "hasIndicator": false,
      "indicators": [],
      "metadata": { "isCenter": true, "classification": "EOA" }
    },
    {
      "id": "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707",
      "label": "DangerousApprovalSpender",
      "type": "CONTRACT",
      "isContract": true,
      "balanceEth": "0.0000 ETH",
      "txCount": 5,
      "riskScore": 85,
      "riskSeverity": "HIGH",
      "hasIndicator": true,
      "indicators": [
        {
          "code": "IND-THREAT-01",
          "title": "Threat Registry Match",
          "severity": "HIGH",
          "evidence": "Contract designed to exploit unlimited token allowances.",
          "source": "LOCAL_DEMO"
        }
      ],
      "metadata": { "isCenter": false, "classification": "CONTRACT" }
    }
  ],
  "edges": [
    {
      "id": "1",
      "from": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      "to": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      "relationshipType": "SENT_NATIVE",
      "txHash": "0x5b9c2d3e4f...",
      "blockNumber": 2,
      "timestamp": "2026-09-26T20:15:00Z",
      "valueEth": 2.0,
      "tokenContract": null,
      "tokenSymbol": "ETH",
      "tokenAmount": null,
      "functionName": "transfer",
      "network": "LOCAL_DEMO_NETWORK"
    }
  ],
  "analytics": {
    "totalNodes": 5,
    "totalEdges": 7,
    "walletCount": 3,
    "contractCount": 2,
    "directCounterparties": 2,
    "inDegree": 1,
    "outDegree": 3,
    "nativeTransfersCount": 3,
    "tokenTransfersCount": 2,
    "contractInteractionsCount": 2
  },
  "disclaimer": "PROTOTYPE FORENSIC GRAPH: Observed edges represent historical on-chain transactions or events. A relationship between addresses does not imply fraud, shared ownership, or conspiracy. Risk evaluations are individual, evidence-grounded assessments on local testbed data.",
  "network": "LOCAL_DEMO_NETWORK (Chain ID: 31337)"
}
```

---

### 3.14 On-Chain Path Explorer
`POST /api/graph/path` (Alias: `POST /api/v1/graph/path`)

**Description:** Performs Breadth-First Search (BFS) shortest-path discovery to trace historical transaction relationships between two EVM addresses up to a bounded depth limit.

**Request Body:**
```json
{
  "sourceAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "targetAddress": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "maxDepth": 3
}
```

**Response (`200 OK` - Path Discovered):**
```json
{
  "sourceAddress": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "targetAddress": "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
  "pathFound": true,
  "hops": 2,
  "nodes": [...],
  "edges": [...],
  "explanation": "Observed on-chain transaction path of 2 hop(s) discovered between 0x7099... and 0x90f7... in local recorded transactions.",
  "disclaimer": "PROTOTYPE PATH TRACER: An observed path reflects recorded historical transaction sequence. It does not demonstrate collusion, common ownership, or malicious coordination between entities."
}
```

---

### 3.15 Reset Demo Graph Topology
`POST /api/graph/seed-demo` (Alias: `POST /api/v1/graph/seed-demo`)

**Description:** Re-seeds the deterministic Milestone 6 demonstration graph topology in the local database.

**Response (`200 OK`):**
```json
{
  "status": "SUCCESS",
  "message": "Deterministic Milestone 6 demonstration graph topology re-seeded successfully."
}
```

---

### 3.17 Unified Address Summary & EVM Classification
`GET /api/address/{address}/summary` (Alias: `GET /api/v1/address/{address}/summary`)

**Description:** Inspects on-chain bytecode, native balance, transaction counts, and historical counterparty topology to produce a unified account summary with EVM classification (`EOA`, `CONTRACT`, or `UNKNOWN`).

**Parameters:**
- `address` (path, required): Hexadecimal 40-character EVM address (`0x...`).

**Response (`200 OK`):**
```json
{
  "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "accountType": "EOA",
  "isContract": false,
  "nativeBalanceEth": "9998.452100",
  "transactionCount": 14,
  "contractInteractionCount": 6,
  "tokenTransferCount": 4,
  "uniqueCounterpartiesCount": 5,
  "firstSeenAt": "2026-09-26T10:00:00Z",
  "lastActiveAt": "2026-09-26T11:20:00Z",
  "riskScore": 15,
  "riskSeverity": "LOW",
  "summary": "External Owned Account (EOA) with moderate activity across local testbed contracts.",
  "indicators": [],
  "relatedContracts": ["0x5FbDB2315678afecb367f032d93F642f64180aa3"],
  "relatedAddresses": ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
  "dataAvailability": "LOCAL_BLOCKCHAIN",
  "network": "LOCAL_DEMO_NETWORK (Chain ID: 31337)",
  "disclaimer": "PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. Does not guarantee 100% exploit detection or financial safety."
}
```

---

### 3.18 Transaction & Simulation Audit History
`GET /api/transactions/history` (Alias: `GET /api/v1/transactions/history`)

**Description:** Returns a unified chronological audit trail of recorded pre-sign simulation dry-runs and confirmed local on-chain transactions.

**Parameters:**
- `limit` (query, optional, default: 50): Maximum number of records to return.

**Response (`200 OK`):**
```json
{
  "total": 2,
  "records": [
    {
      "id": "e45f9a12-88b1-4c44-b021-39c28e932b71",
      "timestamp": "2026-09-26T11:25:00Z",
      "type": "SIMULATION",
      "sender": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      "receiver": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
      "functionName": "approve(address,uint256)",
      "simulationResult": "SUCCESS",
      "riskScore": 45,
      "riskLevel": "MEDIUM",
      "txHash": null,
      "source": "LOCAL_SIMULATION"
    },
    {
      "id": "0x89abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      "timestamp": "2026-09-26T11:26:00Z",
      "type": "TRANSACTION",
      "sender": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      "receiver": "0x5fbdb2315678afecb367f032d93f642f64180aa3",
      "functionName": "transfer(address,uint256)",
      "simulationResult": "CONFIRMED",
      "riskScore": 10,
      "riskLevel": "LOW",
      "txHash": "0x89abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      "source": "LOCAL_BLOCKCHAIN"
    }
  ]
}
```

---

### 3.19 Error Response Structure (RFC 7807)

```json
{
  "type": "https://chainshield.local/errors/invalid-address",
  "title": "Invalid EVM Address Format",
  "status": 400,
  "detail": "Provided address '0x1234' does not conform to the 40-hex-character EVM specification.",
  "instance": "/api/v1/analyze/wallet",
  "timestamp": "2026-09-26T11:35:00Z"
}
```


