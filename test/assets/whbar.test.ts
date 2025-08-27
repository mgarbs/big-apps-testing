import { expect } from "chai";
import { ethers } from "hardhat";
import { AssetsDeployer } from "../../scripts/deploy/assets";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("WHBAR (Wrapped HBAR)", function () {
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let assetsDeployer: AssetsDeployer;
  let whbar: any;


  before(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    
    assetsDeployer = new AssetsDeployer();
    const assetsResult = await assetsDeployer.deployWHBAR();
    whbar = assetsResult.deployments.whbar;
  });

  describe("WHBAR Deployment", function () {
    it("should have HTS token address", async function () {
      const tokenAddress = await whbar.token();
      expect(tokenAddress).to.not.equal(ethers.ZeroAddress);
      expect(tokenAddress).to.not.equal(await whbar.getAddress());
    });

    it("should implement IWHBAR interface", async function () {
      const tokenAddress = await whbar.token();
      expect(tokenAddress).to.be.a("string");
    });
  });

  describe("Deposit (Wrapping HBAR)", function () {
    it("should wrap HBAR via deposit function", async function () {
      const depositAmount = ethers.parseEther("1");
      const initialBalance = await ethers.provider.getBalance(deployer.address);
      
      const tx = await whbar.deposit({ value: depositAmount });
      const receipt = await tx.wait();
      
      // Check HBAR balance decreased (accounting for gas)
      const finalBalance = await ethers.provider.getBalance(deployer.address);
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      expect(finalBalance).to.equal(initialBalance - depositAmount - gasUsed);
      
      // Check Deposit event (now has src and dst parameters)
      await expect(tx)
        .to.emit(whbar, "Deposit")
        .withArgs(deployer.address, deployer.address, depositAmount);
    });

    it("should wrap HBAR via receive function", async function () {
      const depositAmount = ethers.parseEther("0.5");
      
      // Send HBAR directly to contract (triggers receive function)
      const tx = await deployer.sendTransaction({
        to: await whbar.getAddress(),
        value: depositAmount
      });
      
      await expect(tx)
        .to.emit(whbar, "Deposit")
        .withArgs(deployer.address, deployer.address, depositAmount);
    });

    it("should handle multiple deposits", async function () {
      const firstDeposit = ethers.parseEther("1");
      const secondDeposit = ethers.parseEther("2");
      
      await whbar.deposit({ value: firstDeposit });
      await whbar.deposit({ value: secondDeposit });
      
      // Success verified by no revert
    });

    it("should allow deposits from different users", async function () {
      const amount1 = ethers.parseEther("1");
      const amount2 = ethers.parseEther("2");
      
      await whbar.connect(user1).deposit({ value: amount1 });
      await whbar.connect(user2).deposit({ value: amount2 });
      
      // Success verified by no revert
    });

    it("should reject zero value deposits", async function () {
      await expect(
        whbar.deposit({ value: 0 })
      ).to.be.revertedWith('Sent zero hbar to this contract');
    });
  });

  describe("Withdraw (Unwrapping WHBAR)", function () {
    beforeEach(async function () {
      // Deposit some WHBAR first
      await whbar.deposit({ value: ethers.parseEther("5") });
    });

    it("should unwrap WHBAR to HBAR", async function () {
      const withdrawAmount = ethers.parseEther("2");
      const initialHBARBalance = await ethers.provider.getBalance(deployer.address);
      
      const tx = await whbar.withdraw(withdrawAmount);
      const receipt = await tx.wait();
      
      const finalHBARBalance = await ethers.provider.getBalance(deployer.address);
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      expect(finalHBARBalance).to.equal(initialHBARBalance + withdrawAmount - gasUsed);
      
      await expect(tx)
        .to.emit(whbar, "Withdrawal")
        .withArgs(deployer.address, deployer.address, withdrawAmount);
    });

    it("should handle zero amount withdrawal rejection", async function () {
      await expect(
        whbar.withdraw(0)
      ).to.be.revertedWith('Attempted to withdraw zero hbar');
    });
  });

  describe("Edge Cases and Security", function () {
    it("should handle contract receiving HBAR", async function () {
      const contractBalance = await ethers.provider.getBalance(await whbar.getAddress());
      const depositAmount = ethers.parseEther("1");
      
      await whbar.deposit({ value: depositAmount });
      
      const newContractBalance = await ethers.provider.getBalance(await whbar.getAddress());
      expect(newContractBalance).to.equal(contractBalance + depositAmount);
    });
  });

  describe("Gas Usage", function () {
    it("should track gas usage for deposit", async function () {
      const tx = await whbar.deposit({ value: ethers.parseEther("1") });
      const receipt = await tx.wait();
      
      // HTS operations will use more gas than ERC-20
      expect(receipt.gasUsed).to.be.lt(1000000);
    });

    it("should track gas usage for withdraw", async function () {
      await whbar.deposit({ value: ethers.parseEther("1") });
      
      const tx = await whbar.withdraw(ethers.parseEther("0.5"));
      const receipt = await tx.wait();
      
      // HTS operations will use more gas than ERC-20
      expect(receipt.gasUsed).to.be.lt(1000000);
    });
  });
});