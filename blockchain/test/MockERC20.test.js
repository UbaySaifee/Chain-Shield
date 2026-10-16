const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockERC20 (Benign Baseline Token)", function () {
  let token;
  let owner, alice, bob;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("ShieldToken", "SHLD", 18, INITIAL_SUPPLY);
  });

  it("should deploy with standard benign attributes", async function () {
    expect(await token.name()).to.equal("ShieldToken");
    expect(await token.symbol()).to.equal("SHLD");
    expect(await token.decimals()).to.equal(18);
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
  });

  it("should allow regular transfers between users without restriction", async function () {
    const transferAmount = ethers.parseEther("500");
    await token.transfer(alice.address, transferAmount);
    expect(await token.balanceOf(alice.address)).to.equal(transferAmount);

    // Alice transfers to Bob
    await token.connect(alice).transfer(bob.address, ethers.parseEther("100"));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("100"));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("400"));
  });

  it("should update standard allowances correctly", async function () {
    const approveAmount = ethers.parseEther("1000");
    await token.connect(alice).approve(bob.address, approveAmount);
    expect(await token.allowance(alice.address, bob.address)).to.equal(approveAmount);
  });
});
