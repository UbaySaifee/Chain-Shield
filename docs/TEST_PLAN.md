# ChainShield: Test Plan & Quality Assurance Strategy

**Project:** ChainShield: An Explainable Blockchain-Based Cryptocurrency Transaction and Smart Contract Risk Analysis System  
**Academic Degree:** Master of Computer Applications (MCA)  
**Document Revision:** 1.0

---

## 1. Testing Strategy Overview

To meet academic standards and ensure reliable live project demonstration during the MCA viva examination, ChainShield implements a multi-layered testing pyramid:

```
          / \
         / E2E \       - End-to-End Simulation & Viva Demonstration Scenarios
        /───────\
       / Integr. \     - Spring Boot @SpringBootTest, Database Migrations, EVM JSON-RPC
      /───────────\
     /    Unit     \   - Java Services, Solidity Smart Contract Tests, React Components
    /───────────────\
```

---

## 2. Test Suites by Layer

### 2.1 Backend Unit & Integration Tests (Spring Boot / JUnit 5)
- **Frameworks:** JUnit 5, Mockito, AssertJ, Spring MockMvc.
- **Coverage Target:** $\ge 80\%$ on risk calculation and simulation parsing logic.
- **Key Test Classes:**
  1. `RiskEngineServiceTest`:
     - Verifies correct mathematical scoring across combinations of indicators.
     - Confirms score clipping at 100 and floor at 0.
     - Tests categorization thresholds (LOW, MEDIUM, HIGH, CRITICAL).
  2. `CalldataDecoderServiceTest`:
     - Verifies 4-byte selector extraction for `approve()`, `transfer()`, `transferFrom()`.
     - Validates handling of malformed or truncated calldata.
  3. `SimulationServiceTest`:
     - Validates parsing of EVM execution results and balance deltas.
     - Tests decoding of standard EVM revert strings (`Error(string)`).
  4. `AddressValidatorTest`:
     - Tests valid EIP-55 checksum addresses, lowercase hex, and rejects invalid non-hex inputs.

### 2.2 Blockchain & Smart Contract Tests (Hardhat / Chai)
- **Frameworks:** Hardhat test runner, Ethers.js v6, Chai assertions.
- **Key Test Scenarios (`blockchain/test/`):**
  1. `MockERC20.test.js`:
     - Verifies standard transfer and approval behaviors.
     - Confirms allowance updates match standard ERC-20 expectations.
  2. `HoneypotToken.test.js`:
     - Verifies tokens can be bought by test accounts.
     - Confirms selling/transferring tokens by non-owner reverts with `'TRANSFER_PAUSED'`.
     - Verifies that simulation engine reliably flags the honeypot lock.
  3. `DangerousApprovalSpender.test.js`:
     - Verifies that approving the contract allows it to invoke `transferFrom`.
     - Confirms simulation engine detects unlimited approval grants.
  4. `FakeAirdropDrainer.test.js`:
     - Verifies that malicious reward claim attempts siphon ETH or trigger unauthorized calls.

### 2.3 Frontend Tests & Build Validation (React / Vitest)
- **Frameworks:** Vitest, React Testing Library, ESLint, TypeScript compiler (`tsc --noEmit`).
- **Key Test Scenarios (`frontend/src/`):**
  - Address input validation and error feedback.
  - Risk gauge rendering with correct color coding.
  - Explanation card expansion and recommendation list display.
  - Type-safety verification across all API client interfaces.

---

## 3. Academic Evaluation Metrics

For the MCA project defense, the risk engine will be benchmarked against a ground-truth dataset of 40 sample contracts and transactions (20 benign, 20 malicious):

$$\text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}, \quad F_1\text{-Score} = \frac{2 \times \text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$

Target benchmarks for ChainShield prototype:
- **Detection Recall (Malicious Contracts/Tx):** $\ge 95\%$
- **False Positive Rate:** $\le 5\%$
- **Average Analysis Latency:** $\le 1.2\text{ seconds}$
