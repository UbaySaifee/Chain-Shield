# ChainShield: Project Overview

**Full Project Title:**  
*ChainShield: An Explainable Blockchain-Based Cryptocurrency Transaction and Smart Contract Risk Analysis System*

**Academic Context:**  
Individual Master of Computer Applications (MCA) 3rd Semester Minor Project  
Academic Year: 2026

---

## 1. Executive Summary

As decentralized finance (DeFi) and Web3 applications continue to expand, end-users, developers, and security auditors are confronted with severe security challenges:
- Phishing dApps and malicious drainers that steal wallet assets upon approval.
- Opaque smart contracts containing malicious backdoors, honeypot transfer restrictions, or hidden mint functions.
- Irreversible transaction finality on Ethereum Virtual Machine (EVM) blockchains, where a single signature error permanently compromises funds.
- Cryptic blockchain transaction hex data and complex bytecode that ordinary cryptocurrency users cannot interpret.

**ChainShield** addresses this critical gap by acting as a proactive, pre-execution security layer. Rather than analyzing transactions *post-mortem* (after funds are already stolen), ChainShield evaluates the target wallet address, smart contract bytecode/ABI, and proposed transaction payload **before** the user signs or commits the transaction.

By combining deterministic rule-based threat heuristics, simulated EVM dry-runs (`eth_call` state evaluation), and natural-language explainability, ChainShield translates low-level blockchain mechanics into transparent, human-readable risk assessments.

---

## 2. Core Philosophy & Workflow

ChainShield is built on a four-step user-centric security workflow:

```
[ 1. ANALYZE ] ──▶ [ 2. SIMULATE ] ──▶ [ 3. EXPLAIN ] ──▶ [ 4. DECIDE ]
    │                      │                     │                   │
    ▼                      ▼                     ▼                   ▼
Scan address,          Dry-run tx on         Convert bytecode    User makes an
contract bytecode,     EVM node without      & simulation into   informed, safe
history & threat lists state commit          plain English       action
```

1. **Analyze:** Inspect address reputation, transaction history, bytecode patterns, administrative controls, and threat intelligence feeds.
2. **Simulate:** Safely execute the candidate transaction in an isolated local EVM sandbox to project state changes (balance debits, token allowance modifications, contract internal calls) without spending real gas or committing irreversible state.
3. **Explain:** Break down findings into a transparent numeric risk score (0–100), risk tier (LOW, MEDIUM, HIGH, CRITICAL), highlighted security indicators, and plain-English explanatory rationales.
4. **Let the User Decide:** Provide actionable recommendations (e.g., "Limit approval to exact amount", "Reject interaction: honeypot detected"), empowering the user to make the final choice without custodial interference.

---

## 3. Explicit Project Boundaries

To maintain rigorous academic focus and adhere to ethical cybersecurity standards:

| What ChainShield IS | What ChainShield IS NOT |
| :--- | :--- |
| **A Pre-Execution Security Analyzer** | **NOT** a cryptocurrency exchange or swap aggregator |
| **An Explainable Risk Assessment Engine** | **NOT** an automated trading bot or yield optimizer |
| **A Safe EVM Transaction Simulator** | **NOT** a financial, investment, or legal advisory system |
| **A Local Testnet / Devnet Research Tool** | **NOT** a real-money custodial wallet or payment processor |
| **Transparent Rule-Based Threat Detector** | **NOT** a black-box claim of 100% exploit prevention |

> [!IMPORTANT]
> ChainShield strictly operates on local EVM development networks (Hardhat/Anvil) and public testnets (e.g., Sepolia). No real-world funds, private keys, or seed phrases are ever stored, requested, or handled by the system.

---

## 4. Key Target Users & Stakeholders

1. **Everyday Web3 Users:** Individuals seeking reassurance before interacting with a newly deployed decentralized exchange, NFT mint, or token airdrop.
2. **Security Researchers & Students:** Analysts studying common EVM vulnerability archetypes (honeypots, unlimited allowances, unchecked delegatecalls, reentrancy).
3. **Academic Evaluators & Examiners:** Faculty reviewing MCA-level software engineering, secure coding principles, full-stack architecture, and decentralized systems integration.

---

## 5. Academic Significance (MCA Minor Project Criteria)

The ChainShield project satisfies core Master of Computer Applications curricula objectives:
- **System Architecture & Integration:** Multi-tier system integrating a modern Single Page Application (React/TypeScript), enterprise backend (Spring Boot/Java), relational persistence (PostgreSQL with Flyway migrations), local EVM smart contracts (Solidity/Hardhat), and optional Python analytical tooling.
- **Defensive Cybersecurity Engineering:** Implementation of rule-based threat classification, signature inspection, calldata decoding, and secure API practices.
- **Explainable Artificial Intelligence / Heuristic Modeling:** Transitioning from opaque binary classifications to explainable score-factor decompositions that justify why an entity is flagged.
- **Software Engineering Rigor:** Comprehensive documentation, database normalization, OpenAPI specification, automated testing (unit, integration, contract tests), and reproducible local environment setups.
