const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==================================================");
  console.log("ChainShield Local EVM Deployment");
  console.log("Network:", hre.network.name);
  console.log("==================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const testUserAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  // 1. Deploy Benign Mock ERC-20 Token
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const initialSupply = hre.ethers.parseEther("1000000");
  const mockToken = await MockERC20.deploy("ShieldToken", "SHLD", 18, initialSupply);
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log("✓ MockERC20 (ShieldToken) deployed at:", mockTokenAddress);

  // Mint initial test tokens to standard dev test user (Account #1)
  console.log("Funding test user", testUserAddress, "with 50,000 SHLD...");
  const fundTx = await mockToken.mint(testUserAddress, hre.ethers.parseEther("50000"));
  await fundTx.wait();
  console.log("✓ Test user funded with 50,000 SHLD");

  // 2. Deploy SafeVault
  const SafeVault = await hre.ethers.getContractFactory("SafeVault");
  const safeVault = await SafeVault.deploy(mockTokenAddress);
  await safeVault.waitForDeployment();
  const safeVaultAddress = await safeVault.getAddress();
  console.log("✓ SafeVault (Benign Demo) deployed at:", safeVaultAddress);

  // 3. Deploy HoneypotToken
  const HoneypotToken = await hre.ethers.getContractFactory("HoneypotToken");
  const honeypotSupply = hre.ethers.parseEther("10000000");
  const honeypot = await HoneypotToken.deploy("TrapToken", "TRAP", honeypotSupply);
  await honeypot.waitForDeployment();
  const honeypotAddress = await honeypot.getAddress();
  console.log("✓ HoneypotToken (Suspicious Demo) deployed at:", honeypotAddress);

  // Transfer 5,000 TRAP to test user from owner while trading is locked
  console.log("Distributing 5,000 TRAP tokens to test user", testUserAddress, "...");
  const trapTx = await honeypot.transfer(testUserAddress, hre.ethers.parseEther("5000"));
  await trapTx.wait();
  console.log("✓ Test user received 5,000 TRAP (transfers from non-owner are locked)");

  // 4. Deploy DangerousApprovalSpender
  const DangerousApprovalSpender = await hre.ethers.getContractFactory("DangerousApprovalSpender");
  const spender = await DangerousApprovalSpender.deploy();
  await spender.waitForDeployment();
  const spenderAddress = await spender.getAddress();
  console.log("✓ DangerousApprovalSpender (Suspicious Demo) deployed at:", spenderAddress);

  // Compile deployment registry payload
  const deploymentData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || 31337,
    deployer: deployer.address,
    testUser: testUserAddress,
    demoRecipient: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    timestamp: new Date().toISOString(),
    contracts: {
      MockERC20: {
        address: mockTokenAddress,
        name: "ShieldToken",
        symbol: "SHLD",
        decimals: 18,
        type: "BENIGN_ERC20",
        expectedRisk: "LOW",
        description: "Audited benign standard ERC-20 reference token."
      },
      SafeVault: {
        address: safeVaultAddress,
        name: "SafeVault",
        type: "BENIGN_VAULT",
        expectedRisk: "LOW",
        description: "Reentrancy-guarded escrow contract with transparent accounting."
      },
      HoneypotToken: {
        address: honeypotAddress,
        name: "TrapToken",
        symbol: "TRAP",
        decimals: 18,
        type: "MALICIOUS_HONEYPOT",
        expectedRisk: "CRITICAL",
        description: "Honeypot token with trading locked and unilateral owner controls."
      },
      DangerousApprovalSpender: {
        address: spenderAddress,
        name: "DangerousApprovalSpender",
        type: "MALICIOUS_APPROVAL_SPENDER",
        expectedRisk: "HIGH",
        description: "Contract designed to exploit unlimited token allowances and drain funds."
      }
    }
  };

  // Export to 1) blockchain root
  const blockchainPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(blockchainPath, JSON.stringify(deploymentData, null, 2));
  console.log("✓ Saved deployment registry to:", blockchainPath);

  // Export to 2) backend resources
  const backendDir = path.join(__dirname, "..", "..", "backend", "src", "main", "resources");
  if (fs.existsSync(backendDir)) {
    const backendPath = path.join(backendDir, "deployed-contracts.json");
    fs.writeFileSync(backendPath, JSON.stringify(deploymentData, null, 2));
    console.log("✓ Saved deployment registry to backend resources:", backendPath);
  }

  // Export to 3) frontend config
  const frontendConfigDir = path.join(__dirname, "..", "..", "frontend", "src", "config");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }
  const frontendPath = path.join(frontendConfigDir, "contracts.json");
  fs.writeFileSync(frontendPath, JSON.stringify(deploymentData, null, 2));
  console.log("✓ Saved deployment registry to frontend config:", frontendPath);

  console.log("==================================================");
  console.log("ChainShield Local EVM Deployment Complete!");
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
