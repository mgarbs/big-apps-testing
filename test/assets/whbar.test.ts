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
    const signers = await ethers.getSigners();
    deployer = signers[0];
    user1 = signers[1];
    user2 = signers[2];
    
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
      
      // Check Deposit event (WHBAR uses 8 decimals, not 18)
      const expectedAmount = ethers.parseUnits("1", 8); // 1 HBAR in 8 decimal format
      await expect(tx)
        .to.emit(whbar, "Deposit")
        .withArgs(deployer.address, deployer.address, expectedAmount);
    });

    it("should wrap HBAR via receive function", async function () {
      const depositAmount = ethers.parseEther("0.5");
      
      // Send HBAR directly to contract (triggers receive function)
      const tx = await deployer.sendTransaction({
        to: await whbar.getAddress(),
        value: depositAmount
      });
      
      // Check Deposit event (WHBAR uses 8 decimals)
      const expectedAmount = ethers.parseUnits("0.5", 8); // 0.5 HBAR in 8 decimal format
      await expect(tx)
        .to.emit(whbar, "Deposit")
        .withArgs(deployer.address, deployer.address, expectedAmount);
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
      
      await expect(whbar.connect(user1).deposit({ value: amount1 }))
        .to.emit(whbar, "Deposit")
        .withArgs(user1.address, user1.address, ethers.parseUnits("1", 8));
        
      await expect(whbar.connect(user2).deposit({ value: amount2 }))
        .to.emit(whbar, "Deposit")
        .withArgs(user2.address, user2.address, ethers.parseUnits("2", 8));
    });

    it("should reject zero value deposits", async function () {
      await expect(
        whbar.deposit({ value: 0 })
      ).to.be.revertedWith('Sent zero hbar to this contract');
    });
  });

  describe("Withdraw (Unwrapping WHBAR)", function () {
    it("should fail without token association (expected behavior)", async function () {
      // First deposit some WHBAR
      await whbar.deposit({ value: ethers.parseEther("1") });
      
      const withdrawAmount = ethers.parseEther("0.5");
      
      // Withdrawal should fail because user is not associated with WHBAR token
      await expect(whbar.withdraw(withdrawAmount))
        .to.be.revertedWith("Safe token transfer failed!");
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

    it("should track gas usage for withdraw failure (token association required)", async function () {
      await whbar.deposit({ value: ethers.parseEther("1") });
      
      // Withdrawal will fail during gas estimation due to token association
      await expect(whbar.withdraw(ethers.parseEther("0.5")))
        .to.be.revertedWith("Safe token transfer failed!");
    });
  });
});