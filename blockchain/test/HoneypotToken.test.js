const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HoneypotToken (Deliberately Suspicious Demo-Risk Contract)", function () {
  let honeypot;
  let owner, victim, accomplice;
  const INITIAL_SUPPLY = ethers.parseEther("10000000");

  beforeEach(async function () {
    [owner, victim, accomplice] = await ethers.getSigners();
    const HoneypotToken = await ethers.getContractFactory("HoneypotToken");
    honeypot = await HoneypotToken.deploy("TrapToken", "TRAP", INITIAL_SUPPLY);

    // Owner transfers tokens to victim (e.g. simulating a token purchase or airdrop)
    await honeypot.transfer(victim.address, ethers.parseEther("10000"));
  });

  it("should permit victim to receive tokens but block transfers/sales (Honeypot lock)", async function () {
    expect(await honeypot.balanceOf(victim.address)).to.equal(ethers.parseEther("10000"));
    expect(await honeypot.tradingLocked()).to.be.true;

    // Victim attempts to transfer or sell tokens to an accomplice/DEX
    await expect(
      honeypot.connect(victim).transfer(accomplice.address, ethers.parseEther("500"))
    ).to.be.revertedWith("HONEYPOT_DETECTED: Transfer locked by contract administrator");
  });

  it("should allow owner to move tokens even when trading is locked", async function () {
    const ownerSendAmount = ethers.parseEther("1000");
    await expect(honeypot.transfer(accomplice.address, ownerSendAmount)).to.not.be.reverted;
    expect(await honeypot.balanceOf(accomplice.address)).to.equal(ownerSendAmount);
  });

  it("should allow transfers if owner explicitly unlocks trading", async function () {
    await honeypot.setTradingLocked(false);
    expect(await honeypot.tradingLocked()).to.be.false;

    await expect(
      honeypot.connect(victim).transfer(accomplice.address, ethers.parseEther("500"))
    ).to.not.be.reverted;

    expect(await honeypot.balanceOf(accomplice.address)).to.equal(ethers.parseEther("500"));
  });
});
