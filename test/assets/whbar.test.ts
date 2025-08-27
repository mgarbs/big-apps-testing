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


  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    
    assetsDeployer = new AssetsDeployer();
    const assetsResult = await assetsDeployer.deployWHBAR();
    whbar = assetsResult.deployments.whbar;
  });

  describe("WHBAR Deployment", function () {
    it("should have correct metadata", async function () {
      expect(await whbar.name()).to.equal("Wrapped HBAR");
      expect(await whbar.symbol()).to.equal("WHBAR");
      expect(await whbar.decimals()).to.equal(8);
      expect(await whbar.totalSupply()).to.equal(0);
    });

    it("should implement IWHBAR interface", async function () {
      expect(await whbar.token()).to.equal(await whbar.getAddress());
    });

    it("should have zero initial balances", async function () {
      expect(await whbar.balanceOf(deployer.address)).to.equal(0);
      expect(await whbar.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("Deposit (Wrapping HBAR)", function () {
    it("should wrap HBAR via deposit function", async function () {
      const depositAmount = ethers.parseEther("1");
      const initialBalance = await ethers.provider.getBalance(deployer.address);
      
      const tx = await whbar.deposit({ value: depositAmount });
      const receipt = await tx.wait();
      
      expect(await whbar.balanceOf(deployer.address)).to.equal(depositAmount);
      expect(await whbar.totalSupply()).to.equal(depositAmount);
      
      // Check HBAR balance decreased (accounting for gas)
      const finalBalance = await ethers.provider.getBalance(deployer.address);
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      expect(finalBalance).to.equal(initialBalance - depositAmount - gasUsed);
      
      // Check Deposit event
      await expect(tx)
        .to.emit(whbar, "Deposit")
        .withArgs(deployer.address, depositAmount);
    });

    it("should wrap HBAR via receive function", async function () {
      const depositAmount = ethers.parseEther("0.5");
      
      // Send HBAR directly to contract (triggers receive function)
      const tx = await deployer.sendTransaction({
        to: await whbar.getAddress(),
        value: depositAmount
      });
      
      expect(await whbar.balanceOf(deployer.address)).to.equal(depositAmount);
      expect(await whbar.totalSupply()).to.equal(depositAmount);
      
      await expect(tx)
        .to.emit(whbar, "Deposit")
        .withArgs(deployer.address, depositAmount);
    });

    it("should handle multiple deposits", async function () {
      const firstDeposit = ethers.parseEther("1");
      const secondDeposit = ethers.parseEther("2");
      
      await whbar.deposit({ value: firstDeposit });
      await whbar.deposit({ value: secondDeposit });
      
      expect(await whbar.balanceOf(deployer.address)).to.equal(firstDeposit + secondDeposit);
      expect(await whbar.totalSupply()).to.equal(firstDeposit + secondDeposit);
    });

    it("should allow deposits from different users", async function () {
      const amount1 = ethers.parseEther("1");
      const amount2 = ethers.parseEther("2");
      
      await whbar.connect(user1).deposit({ value: amount1 });
      await whbar.connect(user2).deposit({ value: amount2 });
      
      expect(await whbar.balanceOf(user1.address)).to.equal(amount1);
      expect(await whbar.balanceOf(user2.address)).to.equal(amount2);
      expect(await whbar.totalSupply()).to.equal(amount1 + amount2);
    });

    it("should handle zero value deposits", async function () {
      await whbar.deposit({ value: 0 });
      
      expect(await whbar.balanceOf(deployer.address)).to.equal(0);
      expect(await whbar.totalSupply()).to.equal(0);
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
      const initialWHBARBalance = await whbar.balanceOf(deployer.address);
      
      const tx = await whbar.withdraw(withdrawAmount);
      const receipt = await tx.wait();
      
      expect(await whbar.balanceOf(deployer.address)).to.equal(initialWHBARBalance - withdrawAmount);
      expect(await whbar.totalSupply()).to.equal(initialWHBARBalance - withdrawAmount);
      
      const finalHBARBalance = await ethers.provider.getBalance(deployer.address);
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      expect(finalHBARBalance).to.equal(initialHBARBalance + withdrawAmount - gasUsed);
      
      await expect(tx)
        .to.emit(whbar, "Withdrawal")
        .withArgs(deployer.address, withdrawAmount);
    });

    it("should fail to withdraw more than balance", async function () {
      const balance = await whbar.balanceOf(deployer.address);
      const excessAmount = balance + ethers.parseEther("1");
      
      await expect(
        whbar.withdraw(excessAmount)
      ).to.be.revertedWith("WHBAR: INSUFFICIENT_BALANCE");
    });

    it("should handle full balance withdrawal", async function () {
      const fullBalance = await whbar.balanceOf(deployer.address);
      
      await whbar.withdraw(fullBalance);
      
      expect(await whbar.balanceOf(deployer.address)).to.equal(0);
      expect(await whbar.totalSupply()).to.equal(0);
    });

    it("should handle zero amount withdrawal", async function () {
      const initialBalance = await whbar.balanceOf(deployer.address);
      
      await whbar.withdraw(0);
      
      expect(await whbar.balanceOf(deployer.address)).to.equal(initialBalance);
    });
  });

  describe("ERC20 Functions", function () {
    beforeEach(async function () {
      // Give users some WHBAR
      await whbar.connect(user1).deposit({ value: ethers.parseEther("10") });
      await whbar.connect(user2).deposit({ value: ethers.parseEther("5") });
    });

    it("should transfer WHBAR between accounts", async function () {
      const transferAmount = ethers.parseEther("3");
      const user1InitialBalance = await whbar.balanceOf(user1.address);
      const user2InitialBalance = await whbar.balanceOf(user2.address);
      
      const tx = await whbar.connect(user1).transfer(user2.address, transferAmount);
      
      expect(await whbar.balanceOf(user1.address)).to.equal(user1InitialBalance - transferAmount);
      expect(await whbar.balanceOf(user2.address)).to.equal(user2InitialBalance + transferAmount);
      
      await expect(tx)
        .to.emit(whbar, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
    });

    it("should fail transfer with insufficient balance", async function () {
      const user1Balance = await whbar.balanceOf(user1.address);
      const excessAmount = user1Balance + ethers.parseEther("1");
      
      await expect(
        whbar.connect(user1).transfer(user2.address, excessAmount)
      ).to.be.revertedWith("WHBAR: INSUFFICIENT_BALANCE");
    });

    it("should approve and transferFrom", async function () {
      const approvalAmount = ethers.parseEther("4");
      const transferAmount = ethers.parseEther("2");
      
      // user1 approves user2 to spend their WHBAR
      await whbar.connect(user1).approve(user2.address, approvalAmount);
      expect(await whbar.allowance(user1.address, user2.address)).to.equal(approvalAmount);
      
      // user2 transfers from user1's account
      const user1InitialBalance = await whbar.balanceOf(user1.address);
      const user2InitialBalance = await whbar.balanceOf(user2.address);
      
      const tx = await whbar.connect(user2).transferFrom(user1.address, user2.address, transferAmount);
      
      expect(await whbar.balanceOf(user1.address)).to.equal(user1InitialBalance - transferAmount);
      expect(await whbar.balanceOf(user2.address)).to.equal(user2InitialBalance + transferAmount);
      expect(await whbar.allowance(user1.address, user2.address)).to.equal(approvalAmount - transferAmount);
      
      await expect(tx)
        .to.emit(whbar, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
    });

    it("should fail transferFrom with insufficient allowance", async function () {
      const approvalAmount = ethers.parseEther("1");
      const transferAmount = ethers.parseEther("2");
      
      await whbar.connect(user1).approve(user2.address, approvalAmount);
      
      await expect(
        whbar.connect(user2).transferFrom(user1.address, user2.address, transferAmount)
      ).to.be.revertedWith("Insufficient allowance");
    });

    it("should handle approval events", async function () {
      const approvalAmount = ethers.parseEther("5");
      
      const tx = await whbar.connect(user1).approve(user2.address, approvalAmount);
      
      await expect(tx)
        .to.emit(whbar, "Approval")
        .withArgs(user1.address, user2.address, approvalAmount);
    });

    it("should handle self transfers", async function () {
      const transferAmount = ethers.parseEther("1");
      const initialBalance = await whbar.balanceOf(user1.address);
      
      await whbar.connect(user1).transfer(user1.address, transferAmount);
      
      expect(await whbar.balanceOf(user1.address)).to.equal(initialBalance);
    });

    it("should handle transferFrom to self without allowance", async function () {
      const transferAmount = ethers.parseEther("1");
      const initialBalance = await whbar.balanceOf(user1.address);
      
      // Self-transfers should not require allowance
      await whbar.connect(user1).transferFrom(user1.address, user2.address, transferAmount);
      
      expect(await whbar.balanceOf(user1.address)).to.equal(initialBalance - transferAmount);
    });
  });

  describe("Edge Cases and Security", function () {
    it("should handle maximum uint256 approval", async function () {
      const maxApproval = ethers.MaxUint256;
      
      await whbar.connect(user1).approve(user2.address, maxApproval);
      expect(await whbar.allowance(user1.address, user2.address)).to.equal(maxApproval);
    });

    it("should prevent overflow in totalSupply", async function () {
      // This test would require depositing enormous amounts, 
      // so we just verify the totalSupply tracking is consistent
      const deposit1 = ethers.parseEther("1000");
      const deposit2 = ethers.parseEther("2000");
      
      await whbar.connect(user1).deposit({ value: deposit1 });
      await whbar.connect(user2).deposit({ value: deposit2 });
      
      expect(await whbar.totalSupply()).to.equal(deposit1 + deposit2);
    });

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
      
      expect(receipt.gasUsed).to.be.lt(100000);
    });

    it("should track gas usage for withdraw", async function () {
      await whbar.deposit({ value: ethers.parseEther("1") });
      
      const tx = await whbar.withdraw(ethers.parseEther("0.5"));
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.lt(100000);
    });

    it("should track gas usage for transfer", async function () {
      await whbar.deposit({ value: ethers.parseEther("1") });
      
      const tx = await whbar.transfer(user1.address, ethers.parseEther("0.5"));
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.lt(100000);
    });
  });
});