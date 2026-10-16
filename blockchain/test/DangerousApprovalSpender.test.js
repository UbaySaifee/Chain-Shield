const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DangerousApprovalSpender (Deliberately Suspicious Approval Abuse Demo)", function () {
  let token, spender;
  let owner, victim, attackerTreasury;
  const INITIAL_SUPPLY = ethers.parseEther("500000");

  beforeEach(async function () {
    [owner, victim, attackerTreasury] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("ShieldToken", "SHLD", 18, INITIAL_SUPPLY);

    const DangerousApprovalSpender = await ethers.getContractFactory("DangerousApprovalSpender");
    spender = await DangerousApprovalSpender.deploy();
    await spender.setTreasury(attackerTreasury.address);

    // Victim holds 5,000 tokens
    await token.transfer(victim.address, ethers.parseEther("5000"));
  });

  it("should fail to drain if victim has not granted approval", async function () {
    const tokenAddress = await token.getAddress();
    await expect(
      spender.drainVictim(tokenAddress, victim.address)
    ).to.be.revertedWith("No allowance granted to this contract");
  });

  it("should exploit an unlimited approval grant to siphon victim tokens", async function () {
    const tokenAddress = await token.getAddress();
    const spenderAddress = await spender.getAddress();

    // Victim unwittingly grants unlimited allowance (Max Uint256)
    const MAX_UINT = ethers.MaxUint256;
    await token.connect(victim).approve(spenderAddress, MAX_UINT);
    expect(await token.allowance(victim.address, spenderAddress)).to.equal(MAX_UINT);

    // Spender drains victim balance to attacker treasury
    const victimBalanceBefore = await token.balanceOf(victim.address);
    expect(victimBalanceBefore).to.equal(ethers.parseEther("5000"));

    await expect(spender.drainVictim(tokenAddress, victim.address))
      .to.emit(spender, "ApprovalExploited")
      .withArgs(tokenAddress, victim.address, attackerTreasury.address, ethers.parseEther("5000"));

    // Victim now holds 0 tokens; treasury holds 5,000 tokens
    expect(await token.balanceOf(victim.address)).to.equal(0);
    expect(await token.balanceOf(attackerTreasury.address)).to.equal(ethers.parseEther("5000"));
  });
});
