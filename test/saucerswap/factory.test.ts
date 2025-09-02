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
  let testTokenA: any;
  let testTokenB: any;
  let testTokenC: any;


  before(async function () {
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
    
    // Use existing WHBAR as one of the test tokens
    testTokenA = whbar;
    console.log(`Using existing WHBAR as testTokenA: ${await testTokenA.token()}`);
  });

  describe("Factory Deployment", function () {
    it("should have correct initial state", async function () {
      expect(await factory.feeToSetter()).to.equal(deployer.address);
      expect(await factory.feeTo()).to.equal(ethers.ZeroAddress);
      expect(await factory.allPairsLength()).to.equal(0);
      expect(await factory.pairCreateFee()).to.equal(0); // Now using fixed HBAR amounts
    });

    it("should have correct INIT_CODE_PAIR_HASH", async function () {
      const initCodeHash = await factory.INIT_CODE_PAIR_HASH();
      expect(initCodeHash).to.be.a('string');
      expect(initCodeHash).to.match(/^0x[a-fA-F0-9]{64}$/); // Valid 32-byte hex hash
    });
  });

  describe("Pair Creation", function () {
    it("should create pair successfully with sufficient fee", async function () {
      const tokenA = await testTokenA.token(); // Real HTS token
      const tokenB = await testTokenB.token(); // Real HTS token
      
      const tx = await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("60")
      });
      await tx.wait();

      const pairAddress = await factory.getPair(tokenA, tokenB);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);
      
      const reversePair = await factory.getPair(tokenB, tokenA);
      expect(reversePair).to.equal(pairAddress);

      expect(await factory.allPairsLength()).to.equal(1);
      expect(await factory.allPairs(0)).to.equal(pairAddress);
    });

    it("should fail with insufficient pair creation fee", async function () {
      const tokenA = await testTokenA.token(); // Real HTS token
      const tokenB = await testTokenB.token(); // Real HTS token
      
      await expect(
        factory.createPair(tokenA, tokenB, {
          value: ethers.parseEther("5") // Less than 10 HBAR minimum
        })
      ).to.be.revertedWith("UniswapV2: INSUFFICIENT_CREATION_FEE");
    });

    it("should fail to create pair with identical tokens", async function () {
      const tokenA = await testTokenA.token(); // Real HTS token
      
      await expect(
        factory.createPair(tokenA, tokenA, {
          value: ethers.parseEther("60")
        })
      ).to.be.revertedWith("UniswapV2: IDENTICAL_ADDRESSES");
    });

    it("should fail to create pair with zero address", async function () {
      const tokenB = await testTokenB.token(); // Real HTS token
      
      await expect(
        factory.createPair(ethers.ZeroAddress, tokenB, {
          value: ethers.parseEther("60")
        })
      ).to.be.revertedWith("UniswapV2: ZERO_ADDRESS");
    });

    it("should fail to create duplicate pair", async function () {
      const tokenA = await testTokenA.token(); // Real HTS token
      const tokenB = await testTokenB.token(); // Real HTS token
      
      await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("60")
      });

      await expect(
        factory.createPair(tokenA, tokenB, {
          value: ethers.parseEther("60")
        })
      ).to.be.revertedWith("UniswapV2: PAIR_EXISTS");
    });

    it("should create multiple pairs", async function () {
      const tokenA = await testTokenA.token(); // Real HTS token
      const tokenB = await testTokenB.token(); // Real HTS token  
      const tokenC = await testTokenC.token(); // Real HTS token

      await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("60")
      });

      await factory.createPair(tokenA, tokenC, {
        value: ethers.parseEther("60")
      });

      await factory.createPair(tokenB, tokenC, {
        value: ethers.parseEther("60")
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
      const tokenA = await testTokenA.token(); // Real HTS token
      const tokenB = await testTokenB.token(); // Real HTS token
      
      const tx = await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("60")
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
      const tokenA = await testTokenA.token(); // Real HTS token
      const tokenB = await testTokenB.token(); // Real HTS token
      
      const tx = await factory.createPair(tokenA, tokenB, {
        value: ethers.parseEther("60")
      });
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.lt(ethers.parseUnits("5000000", "wei"));
    });
  });
});