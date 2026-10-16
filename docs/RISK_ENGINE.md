# ChainShield: Explainable Risk Engine & Scoring Model

**Project:** ChainShield: An Explainable Blockchain-Based Cryptocurrency Transaction and Smart Contract Risk Analysis System  
**Academic Degree:** Master of Computer Applications (MCA)  
**Engine Type:** Transparent Rule-Based Heuristic Scoring Engine with Natural-Language Explainability

---

## 1. Mathematical Formulation

Unlike black-box neural networks where individual output decisions cannot be audited or formally defended in an academic review, ChainShield employs a **deterministic, weighted additive multi-factor scoring model**.

### 1.1 Composite Risk Formula

Let $I = \{i_1, i_2, \dots, i_n\}$ be the set of active threat indicators evaluated for a target entity (wallet, contract, or transaction).

Each indicator $i_k$ possesses:
- A base weight $W(i_k) \in [0, 50]$
- A severity multiplier $S(i_k)$:
  $$\begin{cases}
  S(\text{INFO}) = 0.2 \\
  S(\text{LOW}) = 0.5 \\
  S(\text{MEDIUM}) = 1.0 \\
  S(\text{HIGH}) = 1.5 \\
  S(\text{CRITICAL}) = 2.0
  \end{cases}$$

The raw cumulative score $R_{\text{raw}}$ is given by:
$$R_{\text{raw}} = \sum_{k=1}^{n} \left( W(i_k) \times S(i_k) \right)$$

Applying a confidence modifier $C \in [0.8, 1.2]$ based on data completeness (e.g. verified contract source vs raw bytecode), the final bounded risk score $R \in [0, 100]$ is:
$$R = \min\left(100, \left\lfloor R_{\text{raw}} \times C \right\rfloor\right)$$

---

## 2. Risk Categories & Severity Thresholds

| Score Range | Category | Color Representation | Actionable User Directive |
| :--- | :--- | :--- | :--- |
| **0 – 29** | **LOW RISK** | Emerald Green (`#10B981`) | Normal interaction safe. Standard hygiene recommended. |
| **30 – 59** | **MEDIUM RISK** | Amber Orange (`#F59E0B`) | Caution advised. Review unverified elements or permissions before signing. |
| **60 – 84** | **HIGH RISK** | Bright Coral (`#F97316`) | Elevated danger. Severe permission grants or suspicious counterparty detected. |
| **85 – 100** | **CRITICAL RISK** | Crimson Red (`#EF4444`) | Severe threat. Confirmed honeypot, known phishing drainer, or malicious transfer lock. DO NOT SIGN. |

---

## 3. Indicator Taxonomy

### 3.1 Wallet Risk Indicators (`IND-W`)

| Code | Title | Default Weight | Severity | Trigger Condition |
| :--- | :--- | :--- | :--- | :--- |
| `IND-W01` | Known Malicious Entity Match | 45 | `CRITICAL` | Target address matches local threat database (phishing, mixer, drainer). |
| `IND-W02` | Fresh High-Velocity Account | 20 | `MEDIUM` | Account age $< 7\text{ days}$ with transaction count $> 15$. |
| `IND-W03` | Abnormal High Value Outflow | 25 | `HIGH` | Rapid withdrawal of $> 80\%$ wallet balance within $< 1\text{ hour}$. |
| `IND-W04` | High Counterparty Churn | 15 | `LOW` | $> 90\%$ transactions with 1-time throwaway addresses. |
| `IND-W05` | Interaction with Sanctioned Mixer | 40 | `CRITICAL` | Direct historical deposit/withdrawal to/from privacy mixer. |

### 3.2 Smart Contract Risk Indicators (`IND-C`)

| Code | Title | Default Weight | Severity | Trigger Condition |
| :--- | :--- | :--- | :--- | :--- |
| `IND-C01` | Unverified Source Bytecode | 15 | `MEDIUM` | Contract has deployed bytecode but no published verified source code. |
| `IND-C02` | Centralized Mint/Burn Control | 25 | `HIGH` | Contract exposes owner-only arbitrary mint or token burning functions. |
| `IND-C03` | Honeypot Sell / Trading Restriction | 50 | `CRITICAL` | Non-owner transfers or sales revert unconditionally while trading is locked. |
| `IND-C04` | Arbitrary Account Blacklist Capability | 25 | `HIGH` | Owner can unilaterally blacklist addresses from transferring or receiving tokens. |
| `IND-C05` | Self-Destruct Capable | 30 | `HIGH` | Bytecode contains `0xFF` (`SELFDESTRUCT`) opcode. |
| `IND-C06` | Upgradeable Proxy Pattern Detected | 15 | `MEDIUM` | Contract bytecode utilizes delegatecall or EIP-1967 proxy slots with mutable implementation. |
| `IND-C07` | Administrative Ownership Authority | 10 | `LOW` | Contract designates an administrative owner key with authority over privileged methods. |
| `IND-C08` | Arbitrary Balance Extraction Function | 40 | `CRITICAL` | Contract contains unconstrained methods designed to siphon third-party token balances. |
| `IND-C09` | Contract Bytecode Not Deployed | 0 | `LOW` | Target address is an un-deployed account or Externally Owned Account (EOA). |
| `IND-C10` | Owner-Controlled Pause Capability | 15 | `MEDIUM` | Owner can unilaterally halt transfers or token operations via pause mechanisms. |


### 3.3 Transaction & Simulation Risk Indicators (`IND-T`)

| Code | Title | Default Weight | Severity | Trigger Condition |
| :--- | :--- | :--- | :--- | :--- |
| `IND-T01` | Unlimited Token Approval | 35 | `HIGH` | Calldata sets ERC-20 allowance to `type(uint256).max` or excessive value. |
| `IND-T02` | Unverified Spender Target | 25 | `MEDIUM` | Spender granted token approval has unverified or low-reputation code. |
| `IND-T03` | Simulation Revert / Execution Failure | 40 | `HIGH` | `eth_call` dry-run fails with explicit revert or out-of-gas error. |
| `IND-T04` | Calldata Obfuscation / Non-standard ABI | 20 | `MEDIUM` | Calldata contains parameters mismatched with standard ERC signatures. |
| `IND-T05` | Drainer Signature Pattern | 45 | `CRITICAL` | Calldata prompts transfer of native ETH or all token allowances without return value. |

---

## 4. Natural Language Explanation Generation

ChainShield rejects ambiguous error codes in favor of **Human-in-the-Loop Explainability**. The engine maps triggered indicator vectors into natural language components:

```
[EXECUTIVE SUMMARY]
  "CRITICAL RISK: Contract displays honeypot properties and high centralized ownership controls."

[FACTOR-BY-FACTOR DECOMPOSITION]
  1. Indicator: IND-C03 (Honeypot Sell Restriction)
     - What it means: The contract code contains an intentional lock on selling or transferring tokens.
     - Evidence: Simulated dry-run of 'transfer()' reverted with 'TRANSFER_PAUSED'.
     - Impact: You can buy these tokens, but you will never be able to sell or swap them back.

  2. Indicator: IND-T01 (Unlimited Token Approval)
     - What it means: The proposed transaction authorizes an external smart contract to spend 100% of your tokens.
     - Evidence: Requested allowance is 115792089237316195423570985008687907853269984665640564039457584007913129639935.
     - Impact: If this contract is exploited or malicious, your entire token reserve can be drained at any moment.

[ACTIONABLE RECOMMENDATIONS]
  - Reject this approval transaction immediately.
  - If token swap is genuinely needed, specify only the exact required quantity (e.g. 50 SHLD).
```

---

## 5. Machine Learning Secondary Enhancement (Planned Milestone 4/5)

While the deterministic rule engine serves as the primary security layer, an optional Python secondary module is planned for future milestones:
1. **Feature Vectorization:** Transforms wallet transaction frequencies, gas usage ratios, and counterparty graphs into a normalized feature vector.
2. **Anomaly / Outlier Detection:** Uses an Isolation Forest or DBSCAN clustering algorithm to detect statistical outliers among newly deployed contracts.
3. **Strict Boundary:** The ML model only provides an advisory "Anomaly Score" modifier ($\pm 10\text{ points}$) and never overrides verified deterministic indicators.

---

## 6. Milestone 2 Implementation & Verification

### 6.1 Implemented Engine Architecture
In Milestone 2, the deterministic risk engine is implemented in Java as `com.chainshield.service.risk.DeterministicRiskEngine`:
- **Formula:** $R = \min(100, \sum (w_i \times s_i))$ where base weights $w_i \in [10, 50]$ and severity multipliers are $s_{\text{LOW}} = 0.8$, $s_{\text{MEDIUM}} = 1.0$, $s_{\text{HIGH}} = 1.3$, $s_{\text{CRITICAL}} = 2.0$.
- **Categorization:**
  - `0 - 29`: `LOW`
  - `30 - 59`: `MEDIUM`
  - `60 - 84`: `HIGH`
  - `85 - 100`: `CRITICAL`
- **Isolation:** Decoupled in a standalone Spring component without direct RPC or database dependencies, allowing easy mocking, testing, and future ML pipeline extension.

### 6.2 Local Synthetic Threat Intelligence Dataset
To ensure complete offline reproducibility without commercial API keys, a local threat dataset is cataloged and seeded in `V2__seed_threat_data.sql`:
- **`0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc`**: Simulated Mixer counterparty test vector.
- **`0x90f79bf6eb2c4f870365e785982e1f101e93b906`**: Simulated Phishing Drainer test vector.
- **`0x5fbdb2315678afecb367f032d93f642f64180aa3`**: Local Hardhat test Honeypot contract.
- **`0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`**: Local Hardhat dangerous approval spender.
- **`0x70997970c51812dc3a010c7d01b50e0d17dc79c8`**: Local Hardhat benign reference wallet.

> **ACADEMIC BOUNDARY NOTICE**: The demo threat entries are synthetic test vectors designed strictly for local testbed evaluation and simulation demonstrations. They must not be construed as real-world confirmed malicious addresses unless corroborated by authoritative threat feeds.

### 6.3 Mandatory Prototype Disclaimer
Every response emitted by the risk engine and REST API includes the explicit disclaimer:
`"PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. Does not guarantee 100% exploit detection or financial safety."`
ChainShield never promises perfect detection, absolute immunity, or investment guarantees.

---

## 7. Milestone 3 Simulation-Specific Risk Integration

In Milestone 3, the `DeterministicRiskEngine` is extended with `evaluateSimulatedTransaction(...)` to map pre-execution dry-run outcomes into explainable threat indicators:

### 7.1 Evaluated Indicators & Contribution Weights

| Indicator Code | Title | Trigger Condition | Severity | Weight Contribution |
| :--- | :--- | :--- | :--- | :--- |
| `IND-T01` | Unlimited Token Approval Requested | `isUnlimitedApproval == true` in decoded calldata or allowance delta $\ge 10^{24}$ | `HIGH` | +45 |
| `IND-T02` | Approval to Suspected Drainer | Spender address matches `DangerousApprovalSpender` or flagged drainer registry | `CRITICAL` | +32 |
| `IND-T03` | Simulation Revert / Execution Failure | `eth_call` status == `REVERTED` | `HIGH` | +52 |
| `IND-C03` | Trading Disabled / Honeypot Lock | Revert reason contains `"locked"`, `"paused"`, or `"blacklist"` | `CRITICAL` | +50 |

### 7.2 Human-in-the-Loop Explanations & Actionable Directives
- **For Unlimited Approvals (`IND-T01`):**  
  *Explanation:* "Simulation dry-run succeeded, but this transaction requests maximum token spending permission for spender [address]."  
  *Directive:* "Review approved token allowances and consider setting an exact required amount instead of MAX_UINT."
- **For Drainer Counterparties (`IND-T02`):**  
  *Explanation:* "Spender [address] is flagged as a Dangerous Approval Spender or Phishing Drainer."  
  *Directive:* "CRITICAL: Do NOT grant token approvals to unverified or flagged drainer contracts."
- **For Honeypots & Reverting Transactions (`IND-T03` / `IND-C03`):**  
  *Explanation:* "Pre-execution simulation REVERTED on the local EVM. Revert reason: [reason]. If executed on-chain, this transaction will fail and burn gas fees."  
  *Directive:* "Do not broadcast this transaction. Inspect contract permissions and ensure trade is not locked."

