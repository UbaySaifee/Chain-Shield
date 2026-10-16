const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SafeVault (Deliberately Safe Demo Contract)", function () {
  let token, vault;
  let owner, alice;
  const INITIAL_SUPPLY = ethers.parseEther("100000");

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("ShieldToken", "SHLD", 18, INITIAL_SUPPLY);

    const SafeVault = await ethers.getContractFactory("SafeVault");
    vault = await SafeVault.deploy(await token.getAddress());

    // Give Alice 1,000 tokens
    await token.transfer(alice.address, ethers.parseEther("1000"));
  });

  it("should allow safe deposits after token approval", async function () {
    const depositAmount = ethers.parseEther("250");
    const vaultAddress = await vault.getAddress();

    // Alice approves and deposits
    await token.connect(alice).approve(vaultAddress, depositAmount);
    await expect(vault.connect(alice).deposit(depositAmount))
      .to.emit(vault, "Deposited")
      .withArgs(alice.address, depositAmount);

    expect(await vault.balanceOf(alice.address)).to.equal(depositAmount);
    expect(await token.balanceOf(vaultAddress)).to.equal(depositAmount);
  });

  it("should allow safe withdrawals up to deposited balance", async function () {
    const depositAmount = ethers.parseEther("500");
    const vaultAddress = await vault.getAddress();

    await token.connect(alice).approve(vaultAddress, depositAmount);
    await vault.connect(alice).deposit(depositAmount);

    const withdrawAmount = ethers.parseEther("200");
    await expect(vault.connect(alice).withdraw(withdrawAmount))
      .to.emit(vault, "Withdrawn")
      .withArgs(alice.address, withdrawAmount);

    expect(await vault.balanceOf(alice.address)).to.equal(ethers.parseEther("300"));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("700"));
  });

  it("should revert if user attempts to withdraw more than deposited", async function () {
    await expect(
      vault.connect(alice).withdraw(ethers.parseEther("10"))
    ).to.be.revertedWith("Insufficient deposited balance");
  });
});
