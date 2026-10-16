# ChainShield: System Requirements Specification (SRS)

**Project:** ChainShield: An Explainable Blockchain-Based Cryptocurrency Transaction and Smart Contract Risk Analysis System  
**Academic Degree:** Master of Computer Applications (MCA)  
**Document Revision:** 1.0 (Initial Baseline)

---

## 1. Introduction

This document details the functional and non-functional requirements for the ChainShield application. It defines the explicit features, system constraints, user interactions, and operational boundaries necessary to deliver an academic prototype demonstrating blockchain threat intelligence and explainable risk analysis.

---

## 2. User Roles and Actors

| Actor | Description | Key Responsibilities |
| :--- | :--- | :--- |
| **End User / Web3 User** | Individual interacting with EVM wallets, decentralized apps, and smart contracts. | Inputs addresses, reviews transaction simulations, views risk score breakdowns, and generates security audit reports. |
| **Security Analyst / Researcher** | Technical user assessing honeypots, drainers, and malicious token contracts. | Analyzes transaction graph topologies, inspects bytecode indicators, and verifies test contract threat vectors. |
| **Academic Evaluator / Examiner** | Faculty reviewing the MCA minor project prototype. | Evaluates code quality, tests reproducible attack scenarios, checks test coverage, and inspects architecture artifacts. |
| **Local EVM Node (System Actor)** | Hardhat/EVM test network node executing `eth_call` and state queries. | Provides realistic blockchain responses, dry-run simulation traces, and balance/allowance states. |

---

## 3. Functional Requirements

### 3.1 Module 1: Cyber Security & Web3 Dashboard
- **FR-1.1:** System shall display overall security metrics (total addresses scanned, high-risk flags detected, simulated transactions, and recent threat alerts).
- **FR-1.2:** System shall render recent analysis history with quick-access links to previous audits.
- **FR-1.3:** System shall show risk distribution charts (e.g., breakdown by risk tier: Low, Medium, High, Critical).
- **FR-1.4:** Dashboard shall clearly label demo/simulated blockchain metrics to avoid deceptive claims.

### 3.2 Module 2: Wallet Risk Analyzer
- **FR-2.1:** System shall accept any standard 42-character hexadecimal EVM wallet address (`0x[a-fA-F0-9]{40}`) with EIP-55 checksum validation.
- **FR-2.2:** System shall retrieve or synthesize wallet profile metrics:
  - Account age / first active block timestamp.
  - Historical transaction count.
  - Number of unique contract counterparties.
  - Frequency of interaction with flagged/suspicious addresses (mixers, known drainers).
- **FR-2.3:** System shall compute a deterministic wallet risk score (0–100) and assign a severity tier.
- **FR-2.4:** System shall output a plain-language summary of detected wallet risk factors with evidentiary details.

### 3.3 Module 3: Smart Contract Risk Analyzer
- **FR-3.1:** System shall accept an EVM contract address and verify whether bytecode is deployed at that address (`eth_getCode`).
- **FR-3.2:** System shall analyze contract characteristics:
  - Source verification status (verified source vs. raw unverified bytecode).
  - Admin/Owner privileges (presence of centralized `onlyOwner` mint, burn, blacklist, or pause capabilities).
  - Dangerous function signatures (e.g., `selfdestruct`, unconstrained `delegatecall`, hidden transfer fees).
  - Token approval patterns (checks if contract requests high/unlimited allowances).
- **FR-3.3:** System shall flag honeypot patterns (e.g., contracts allowing token purchases but reverting sell transactions).
- **FR-3.4:** System shall generate an itemized list of contract indicators with plain-language risk explanations.

### 3.4 Module 4: Transaction Analyzer
- **FR-4.1:** System shall allow users to input a proposed transaction payload (sender, receiver, ETH value, calldata hex, gas limit).
- **FR-4.2:** System shall decode common ERC-20/EVM function selectors from calldata (e.g., `approve(address,uint256)`, `transfer(address,uint256)`, `transferFrom(address,address,uint256)`).
- **FR-4.3:** System shall flag if the transaction targets an unverified contract or an address tagged as high risk.
- **FR-4.4:** System shall clearly identify token approval requests and calculate whether the requested allowance is unlimited (`2^256 - 1` or `type(uint256).max`).

### 3.5 Module 5: Safe Transaction Simulation
- **FR-5.1:** System shall dry-run the candidate transaction against a local EVM node using safe simulation primitives (such as `eth_call` with state overrides or Hardhat snapshot fork execution).
- **FR-5.2:** System shall determine whether the transaction succeeds or reverts, capturing the revert reason string if failed.
- **FR-5.3:** System shall calculate projected state changes without committing any real state to the blockchain:
  - Net native token (ETH) delta for sender and receiver.
  - Net ERC-20 token balance changes.
  - Net token allowance increases/decreases.
- **FR-5.4:** System shall warn the user with high-visibility alerts if the simulation projects dangerous side-effects (e.g., complete wallet token approval to an untrusted contract).
- **FR-5.5:** System shall NEVER broadcast or sign real transactions on mainnet.

### 3.6 Module 6: Explainable Deterministic Risk Engine
- **FR-6.1:** System shall utilize a weighted, configurable rule-based scoring engine where each triggered indicator contributes a documented point weight.
- **FR-6.2:** System shall classify the composite risk score into standard risk tiers:
  - `0 - 29`: **LOW RISK** (Standard benign interactions).
  - `30 - 59`: **MEDIUM RISK** (Caution advised; unverified elements or newly deployed contracts).
  - `60 - 84`: **HIGH RISK** (Suspicious permissions, excessive allowances, or high-risk counterparty).
  - `85 - 100`: **CRITICAL RISK** (Confirmed honeypot, drainer signature, blacklisted threat match).
- **FR-6.3:** System shall provide natural-language reasoning for every triggered indicator, explaining:
  1. What the indicator detected.
  2. Why it represents a security risk to the user.
  3. What action the user should take.

### 3.7 Module 7: Blockchain Transaction Graph
- **FR-7.1:** System shall generate an interactive topological graph of analyzed entities showing relationships:
  - `Wallet -> Wallet` (direct transfers).
  - `Wallet -> Contract` (invocations / approvals).
  - `Contract -> Wallet` (rewards / drains / returns).
- **FR-7.2:** Graph nodes shall be color-coded according to risk tier.
- **FR-7.3:** Users shall be able to click on nodes or edges to view address details, risk scores, and transfer volumes.

### 3.8 Module 8: Security Assessment Reports
- **FR-8.1:** System shall generate a comprehensive security assessment report for any completed analysis.
- **FR-8.2:** Report shall contain target address, timestamp, risk score, severity badge, itemized indicator table, simulation outcomes, and actionable safety recommendations.
- **FR-8.3:** System shall support exporting or printing the structured report in clean, printer-friendly formatting (with future PDF generation support).

---

## 4. Non-Functional Requirements (NFR)

| ID | Category | Requirement Description |
| :--- | :--- | :--- |
| **NFR-1** | **Performance & Latency** | Risk assessment API responses shall complete within $\le 1.5\text{ seconds}$ on local EVM data and $\le 3\text{ seconds}$ when performing transaction simulation. |
| **NFR-2** | **Explainability** | Every numerical risk score must be accompanied by an itemized mathematical breakdown and human-readable justification. No opaque black-box scores are permitted. |
| **NFR-3** | **Offline-First & Local Portability** | The entire system must function autonomously in a local environment using a local Hardhat EVM node and seed databases without requiring paid third-party API subscriptions. |
| **NFR-4** | **Security & Non-Custodial Integrity** | Zero private keys or mnemonic seed phrases shall ever be ingested, logged, or stored by the backend. Web3 wallet interaction (MetaMask) is strictly read/simulate or sign on local devnet upon explicit user confirmation. |
| **NFR-5** | **Data Integrity** | All database schema changes shall be managed through structured migrations (Flyway). Relational foreign keys and unique constraints will enforce referential integrity. |
| **NFR-6** | **UI Usability & Aesthetics** | Modern cybersecurity aesthetic (dark/light theme with slate tones, glassmorphism accents, responsive grid, accessible typography, zero juvenile or generic styling). |

---

## 5. System Use Cases

### UC-1: Analyze a Suspicious Token Contract
1. **Primary Actor:** End User.
2. **Precondition:** User discovers a new token address from a social media airdrop and wants to verify its safety before interacting.
3. **Main Success Scenario:**
   1. User navigates to the Smart Contract Analyzer and enters `0x...`.
   2. System validates address format and queries the local/testnet node for bytecode.
   3. Backend checks bytecode against threat intelligence signatures (honeypot tax, transfer locks, unverified code).
   4. Risk Engine computes a score of `88/100 (CRITICAL RISK)` due to hidden sell fee and owner blacklist permissions.
   5. System renders an explainable breakdown: "This contract contains a transfer lock preventing non-owners from selling tokens (Honeypot pattern)."
   6. User reviews the clear warning and decides not to interact with the contract.

### UC-2: Simulate a High-Risk Token Approval Transaction
1. **Primary Actor:** End User.
2. **Precondition:** A third-party dApp prompts the user to approve a token interaction.
3. **Main Success Scenario:**
   1. User pastes transaction parameters into ChainShield Transaction Simulator.
   2. System parses calldata and extracts method `approve(spender, 115792089237316195423570985008687907853269984665640564039457584007913129639935)`.
   3. System simulates transaction on local EVM node and detects an unlimited allowance grant.
   4. Risk Engine assigns a `HIGH RISK (75/100)` score for unlimited spending power to an unverified spender.
   5. System explains: "This transaction grants the spender permission to withdraw your entire balance of Token X indefinitely."
   6. User adjusts their allowance to the exact intended transaction amount or cancels the interaction.

---

## 6. Assumptions and Limitations

1. **EVM Compatibility:** ChainShield is optimized for EVM-compatible blockchains (Ethereum, Polygon, Arbitrum, local Hardhat). Non-EVM chains (Solana, Bitcoin) are outside the project scope.
2. **Bytecode Heuristics:** Bytecode static analysis is heuristic. Advanced obfuscation or polymorphic contracts may require dynamic simulation for accurate detection.
3. **Prototype Disclaimer:** All risk assessments are probabilistic and security-assistive; the software explicitly displays disclaimers that it does not guarantee 100% exploit immunity.
