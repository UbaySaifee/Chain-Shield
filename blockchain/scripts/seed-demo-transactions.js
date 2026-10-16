const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==================================================");
  console.log("ChainShield Local EVM Demo Transaction Seeder");
  console.log("Network:", hre.network.name);
  console.log("==================================================");

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0]; // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  const walletA = signers[1];  // 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Test User)
  const walletB = signers[2];  // 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Counterparty)
  const walletC = signers[3];  // 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (Tertiary)

  console.log("Deployer:", deployer.address);
  console.log("Wallet A (Test User):", walletA.address);
  console.log("Wallet B (Counterparty):", walletB.address);
  console.log("Wallet C (Tertiary):", walletC.address);

  // Load contract addresses
  let mockTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  let safeVaultAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0";
  let honeypotAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  let spenderAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const deployedPath = path.join(__dirname, "..", "deployed-addresses.json");
  if (fs.existsSync(deployedPath)) {
    const deployment = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
    if (deployment.contracts) {
      if (deployment.contracts.MockERC20) mockTokenAddress = deployment.contracts.MockERC20.address;
      if (deployment.contracts.SafeVault) safeVaultAddress = deployment.contracts.SafeVault.address;
      if (deployment.contracts.HoneypotToken) honeypotAddress = deployment.contracts.HoneypotToken.address;
      if (deployment.contracts.DangerousApprovalSpender) spenderAddress = deployment.contracts.DangerousApprovalSpender.address;
    }
  }

  const MockERC20 = await hre.ethers.getContractAt("MockERC20", mockTokenAddress);
  const SafeVault = await hre.ethers.getContractAt("SafeVault", safeVaultAddress);

  console.log("\n--- Step 1: Native ETH Transfers ---");
  // 1. Deployer -> Wallet B (10 ETH)
  console.log("1. Deployer sending 10 ETH to Wallet B...");
  const tx1 = await deployer.sendTransaction({
    to: walletB.address,
    value: hre.ethers.parseEther("10.0")
  });
  await tx1.wait();
  console.log("   ✓ Tx Hash:", tx1.hash);

  // 2. Wallet A -> Wallet B (2 ETH)
  console.log("2. Wallet A sending 2 ETH to Wallet B...");
  const tx2 = await walletA.sendTransaction({
    to: walletB.address,
    value: hre.ethers.parseEther("2.0")
  });
  await tx2.wait();
  console.log("   ✓ Tx Hash:", tx2.hash);

  // 3. Wallet B -> Wallet C (1 ETH)
  console.log("3. Wallet B sending 1 ETH to Wallet C...");
  const tx3 = await walletB.sendTransaction({
    to: walletC.address,
    value: hre.ethers.parseEther("1.0")
  });
  await tx3.wait();
  console.log("   ✓ Tx Hash:", tx3.hash);

  console.log("\n--- Step 2: ERC-20 & Vault Contract Interactions ---");
  // 4. Ensure Wallet A has SHLD
  const balA = await MockERC20.balanceOf(walletA.address);
  if (balA < hre.ethers.parseEther("1000")) {
    console.log("Minting 10,000 SHLD to Wallet A...");
    const mintTx = await MockERC20.connect(deployer).mint(walletA.address, hre.ethers.parseEther("10000"));
    await mintTx.wait();
  }

  // 5. Wallet A approves SafeVault to spend 1,000 SHLD
  console.log("4. Wallet A approving SafeVault for 1,000 SHLD...");
  const approveVaultTx = await MockERC20.connect(walletA).approve(safeVaultAddress, hre.ethers.parseEther("1000"));
  await approveVaultTx.wait();
  console.log("   ✓ Tx Hash:", approveVaultTx.hash);

  // 6. Wallet A deposits 500 SHLD into SafeVault
  console.log("5. Wallet A depositing 500 SHLD into SafeVault...");
  const depositTx = await SafeVault.connect(walletA).deposit(hre.ethers.parseEther("500"));
  await depositTx.wait();
  console.log("   ✓ Tx Hash:", depositTx.hash);

  // 7. Wallet A transfers 250 SHLD to Wallet B
  console.log("6. Wallet A transferring 250 SHLD to Wallet B...");
  const transferABTx = await MockERC20.connect(walletA).transfer(walletB.address, hre.ethers.parseEther("250"));
  await transferABTx.wait();
  console.log("   ✓ Tx Hash:", transferABTx.hash);

  console.log("\n--- Step 3: Suspicious Approval Demonstration ---");
  // 8. Wallet B approves DangerousApprovalSpender for unlimited tokens (MAX_UINT256)
  console.log("7. Wallet B approving DangerousApprovalSpender for unlimited MAX_UINT256 allowance...");
  const approveDrainTx = await MockERC20.connect(walletB).approve(spenderAddress, hre.ethers.MaxUint256);
  await approveDrainTx.wait();
  console.log("   ✓ Tx Hash:", approveDrainTx.hash);

  // 9. Wallet B transfers 50 SHLD to Wallet C
  console.log("8. Wallet B transferring 50 SHLD to Wallet C...");
  const transferBCTx = await MockERC20.connect(walletB).transfer(walletC.address, hre.ethers.parseEther("50"));
  await transferBCTx.wait();
  console.log("   ✓ Tx Hash:", transferBCTx.hash);

  // 10. Wallet C transfers 10 SHLD back to Wallet B
  console.log("9. Wallet C transferring 10 SHLD back to Wallet B...");
  const transferCBTx = await MockERC20.connect(walletC).transfer(walletB.address, hre.ethers.parseEther("10"));
  await transferCBTx.wait();
  console.log("   ✓ Tx Hash:", transferCBTx.hash);

  console.log("\n==================================================");
  console.log("✓ All deterministic demo transactions successfully mined!");
  console.log("Topology created:");
  console.log("  Deployer -> Wallet B (Native ETH)");
  console.log("  Wallet A -> Wallet B (Native ETH + ERC-20 SHLD)");
  console.log("  Wallet A -> SafeVault (Approval + Deposit)");
  console.log("  Wallet B -> DangerousApprovalSpender (Unlimited Approval)");
  console.log("  Wallet B -> Wallet C (Native ETH + ERC-20 SHLD)");
  console.log("  Wallet C -> Wallet B (ERC-20 SHLD)");
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
