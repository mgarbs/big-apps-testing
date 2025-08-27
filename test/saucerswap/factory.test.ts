import { expect } from "chai";
import { ethers } from "hardhat";
import { AssetsDeployer } from "../../scripts/deploy/assets";
import { SaucerSwapDeployer } from "../../scripts/deploy/saucerswap";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SaucerSwap Factory", function () {
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let assetsDeployer: AssetsDeployer;
  let saucerSwapDeployer: SaucerSwapDeployer;
  let factory: any;
  let whbar: any;
  let addresses: any;


  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    
    // Deploy assets layer first
    assetsDeployer = new AssetsDeployer();
    const assetsResult = await assetsDeployer.deployWHBAR();
    whbar = assetsResult.deployments.whbar;
    
    // Deploy SaucerSwap
    saucerSwapDeployer = new SaucerSwapDeployer();
    const result = await saucerSwapDeployer.deployV1();
    factory = result.deployments.factory;
    addresses = result.addresses;
  });

  describe("Factory Deployment", function () {
    it("should have correct initial state", async function () {
      expect(await factory.feeToSetter()).to.equal(deployer.address);
      expect(await factory.feeTo()).to.equal(ethers.ZeroAddress);
      expect(await factory.allPairsLength()).to.equal(0);
      expect(await factory.pairCreateFee()).to.equal(ethers.parseEther("1"));
    });

    it("should have correct INIT_CODE_PAIR_HASH", async function () {
      const initCodeHash = await factory.INIT_CODE_PAIR_HASH();
      expect(initCodeHash).to.be.properHex(66); // 0x + 64 chars
    });
  });

  describe("Pair Creation", function () {
    it("should create pair successfully with sufficient fee", async function () {
      const tokenA = "0x0000000000000000000000000000000000123456";
      const tokenB = "0x0000000000000000000000000000000000654321";
      
      const tx = await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("1")
      });
      const receipt = await tx.wait();

      const pairAddress = await factory.getPair(tokenA, tokenB);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);
      
      const reversePair = await factory.getPair(tokenB, tokenA);
      expect(reversePair).to.equal(pairAddress);

      expect(await factory.allPairsLength()).to.equal(1);
      expect(await factory.allPairs(0)).to.equal(pairAddress);
    });

    it("should fail with insufficient pair creation fee", async function () {
      const tokenA = "0x0000000000000000000000000000000000123456";
      const tokenB = "0x0000000000000000000000000000000000654321";
      
      await expect(
        factory.createPair(tokenA, tokenB, {
          value: ethers.parseEther("0.5")
        })
      ).to.be.reverted;
    });

    it("should fail to create pair with identical tokens", async function () {
      const tokenA = "0x0000000000000000000000000000000000123456";
      
      await expect(
        factory.createPair(tokenA, tokenA, {
          value: ethers.parseEther("1")
        })
      ).to.be.revertedWith("UniswapV2: IDENTICAL_ADDRESSES");
    });

    it("should fail to create pair with zero address", async function () {
      const tokenB = "0x0000000000000000000000000000000000654321";
      
      await expect(
        factory.createPair(ethers.ZeroAddress, tokenB, {
          value: ethers.parseEther("1")
        })
      ).to.be.revertedWith("UniswapV2: ZERO_ADDRESS");
    });

    it("should fail to create duplicate pair", async function () {
      const tokenA = "0x0000000000000000000000000000000000123456";
      const tokenB = "0x0000000000000000000000000000000000654321";
      
      await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("1")
      });

      await expect(
        factory.createPair(tokenA, tokenB, {
          value: ethers.parseEther("1")
        })
      ).to.be.revertedWith("UniswapV2: PAIR_EXISTS");
    });

    it("should create multiple pairs", async function () {
      const tokenA = "0x0000000000000000000000000000000000123456";
      const tokenB = "0x0000000000000000000000000000000000654321";
      const tokenC = "0x0000000000000000000000000000000000111111";

      await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("1")
      });

      await factory.createPair(tokenA, tokenC, {
        value: ethers.parseEther("1")
      });

      await factory.createPair(tokenB, tokenC, {
        value: ethers.parseEther("1")
      });

      expect(await factory.allPairsLength()).to.equal(3);
      
      const pair1 = await factory.allPairs(0);
      const pair2 = await factory.allPairs(1);
      const pair3 = await factory.allPairs(2);
      
      expect(pair1).to.not.equal(pair2);
      expect(pair2).to.not.equal(pair3);
      expect(pair1).to.not.equal(pair3);
    });
  });

  describe("Fee Management", function () {
    it("should allow fee setter to set feeTo", async function () {
      await factory.setFeeTo(user1.address);
      expect(await factory.feeTo()).to.equal(user1.address);
    });

    it("should allow fee setter to change fee setter", async function () {
      await factory.setFeeToSetter(user1.address);
      expect(await factory.feeToSetter()).to.equal(user1.address);
    });

    it("should prevent non-fee setter from setting feeTo", async function () {
      await expect(
        factory.connect(user1).setFeeTo(user2.address)
      ).to.be.revertedWith("UniswapV2: FORBIDDEN");
    });

    it("should prevent non-fee setter from changing fee setter", async function () {
      await expect(
        factory.connect(user1).setFeeToSetter(user2.address)
      ).to.be.revertedWith("UniswapV2: FORBIDDEN");
    });

    it("should allow new fee setter to operate after transfer", async function () {
      // Transfer fee setter role
      await factory.setFeeToSetter(user1.address);
      
      // New fee setter should be able to set feeTo
      await factory.connect(user1).setFeeTo(user2.address);
      expect(await factory.feeTo()).to.equal(user2.address);
      
      // Old fee setter should no longer have access
      await expect(
        factory.setFeeTo(deployer.address)
      ).to.be.revertedWith("UniswapV2: FORBIDDEN");
    });
  });

  describe("Pair Address Calculation", function () {
    it("should calculate CREATE2 addresses correctly", async function () {
      const tokenA = "0x0000000000000000000000000000000000123456";
      const tokenB = "0x0000000000000000000000000000000000654321";
      
      const predictedAddress = await factory.createPair.staticCall(tokenA, tokenB, {
        value: ethers.parseEther("1")
      });

      await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("1")
      });

      const actualAddress = await factory.getPair(tokenA, tokenB);
      expect(actualAddress).to.equal(predictedAddress);
    });

    it("should return zero address for non-existent pair", async function () {
      const tokenA = "0x0000000000000000000000000000000000123456";
      const tokenB = "0x0000000000000000000000000000000000654321";
      
      const pairAddress = await factory.getPair(tokenA, tokenB);
      expect(pairAddress).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Factory Events", function () {
    it("should emit PairCreated event with correct parameters", async function () {
      const tokenA = "0x0000000000000000000000000000000000123456";
      const tokenB = "0x0000000000000000000000000000000000654321";
      
      const tx = await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("1")
      });

      await expect(tx)
        .to.emit(factory, "PairCreated")
        .withArgs(
          tokenA < tokenB ? tokenA : tokenB,
          tokenA < tokenB ? tokenB : tokenA,
          await factory.getPair(tokenA, tokenB),
          1
        );
    });
  });

  describe("Gas Usage", function () {
    it("should track gas usage for pair creation", async function () {
      const tx = await factory.createPair("0x0000000000000000000000000000000000123456", "0x0000000000000000000000000000000000654321", {
        value: ethers.parseEther("1")
      });
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.lt(ethers.parseUnits("5000000", "wei"));
    });
  });
});