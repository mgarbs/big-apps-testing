import { expect } from "chai";
import { ethers } from "hardhat";
import { AssetsDeployer } from "../../scripts/deploy/assets";
import { SaucerSwapDeployer } from "../../scripts/deploy/saucerswap";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import Utils from './../utils'

describe("SaucerSwap Factory", function () {
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let assetsDeployer: AssetsDeployer;
  let saucerSwapDeployer: SaucerSwapDeployer;
  let factory: any;
  let whbar: any;
  let addresses: any;
  let testToken: any; // TestToken contract for creating pairs with WHBAR
  let TestTokenFactory: any;

  async function predictPair(tokenA: string, tokenB: string) {
    const hash = await factory.INIT_CODE_PAIR_HASH();
    const salt = Utils.createSalt(tokenA, tokenB);
    return Utils.calculateCreate2Address(addresses.factory, salt, hash);
  }

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
    
    // Deploy TestToken for pairing with WHBAR
    console.log("Deploying TestToken...");
    TestTokenFactory = await ethers.getContractFactory("TokenCreateContract");
    testToken = await TestTokenFactory.deploy({ 
      value: ethers.parseEther("10.0"),
      gasLimit: 8000000
    });
    await testToken.waitForDeployment();
    console.log(`Create TestToken contract deployed at: ${await testToken.getAddress()}`);
    console.log(`TestToken HTS token: ${await testToken.token()}`);
    console.log(`WHBAR HTS token: ${await whbar.token()}`);
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
      const whbarToken = await whbar.token(); // WHBAR HTS token
      const testTokenAddr = await testToken.token(); // TestToken HTS token
      
      const create2Address = predictPair(whbarToken, testTokenAddr)
      await Utils.updateAccountKeysViaHapi([addresses.factory, create2Address])
      const tx = await factory.createPair(whbarToken, testTokenAddr, {
        value: ethers.parseEther("60.0"),
        gasLimit: 8000000
      });

      await tx.wait();
      const pairAddress = await factory.getPair(whbarToken, testTokenAddr);
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);
      expect(pairAddress).to.equal(create2Address)


      const reversePair = await factory.getPair(testTokenAddr, whbarToken);
      expect(reversePair).to.equal(pairAddress);

      expect(await factory.allPairsLength()).to.equal(1);
      expect(await factory.allPairs(0)).to.equal(pairAddress);
    });

    it("should fail with insufficient pair creation fee", async function () {
      const whbarToken = await whbar.token();
      const testToken3 = await TestTokenFactory.deploy({ 
        value: ethers.parseEther("10.0"),
        gasLimit: 8000000
      });
      await testToken3.waitForDeployment()
      const testToken3Address = await testToken3.token()

      await factory.setPairCreateFee(100000000 * 200)
      await expect(
        factory.createPair(whbarToken, testToken3Address, {
          value: ethers.parseEther("5") // Less than 10 HBAR minimum
        })
      ).to.be.revertedWith("Did not send enough msg.value");
    });

    it("should fail to create pair with identical tokens", async function () {
      const whbarToken = await whbar.token();
      
      await expect(
        factory.createPair(whbarToken, whbarToken, {
          value: ethers.parseEther("60")
        })
      ).to.be.revertedWith("UniswapV2: IDENTICAL_ADDRESSES");
    });

    it("should fail to create pair with zero address", async function () {
      const testTokenAddr = await testToken.token();
      
      await expect(
        factory.createPair(ethers.ZeroAddress, testTokenAddr, {
          value: ethers.parseEther("60")
        })
      ).to.be.revertedWith("UniswapV2: ZERO_ADDRESS");
    });

    it("should fail to create duplicate pair", async function () {
      const whbarToken = await whbar.token();
      const testTokenAddr = await testToken.token();

      await expect(
        factory.createPair(whbarToken, testTokenAddr, {
          value: ethers.parseEther("60")
        })
      ).to.be.revertedWith("UniswapV2: PAIR_EXISTS");
    });

    it("should create multiple pairs", async function () {
      const whbarToken = await whbar.token();
      const testTokenAddr = await testToken.token();
      
      // Deploy a third token for this test
      const TestTokenFactory = await ethers.getContractFactory("TokenCreateContract");
      const testTokenC = await TestTokenFactory.deploy({ 
        value: ethers.parseEther("10"),
        gasLimit: 3000000
      });
      await testTokenC.waitForDeployment();
      const tokenC = await testTokenC.token();

      const pair1Address = predictPair(whbarToken, testTokenAddr)
      const pair2Address = predictPair(whbarToken, tokenC)
      const pair3Address = predictPair(testTokenAddr, tokenC)
      await Utils.updateAccountKeysViaHapi([addresses.factory, pair1Address, pair2Address, pair3Address])

      await factory.createPair(whbarToken, testTokenAddr, {
        value: ethers.parseEther("60"),
        gasLimit: 8000000
      });

      await factory.createPair(whbarToken, tokenC, {
        value: ethers.parseEther("60"),
        gasLimit: 8000000
      });

      await factory.createPair(testTokenAddr, tokenC, {
        value: ethers.parseEther("60"),
        gasLimit: 8000000
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
      await new Promise(resolve => setTimeout(resolve, 3000));
      expect(await factory.feeTo()).to.equal(user1.address);
    });

    it("should allow fee setter to change fee setter", async function () {
      await factory.setFeeToSetter(user1.address);
      expect(await factory.feeToSetter()).to.equal(user1.address);
    });

    it("should prevent non-fee setter from setting feeTo", async function () {
      await expect(
        factory.connect(user2).setFeeTo(deployer.address)
      ).to.be.revertedWith("UniswapV2: FORBIDDEN");
    });

    it("should prevent non-fee setter from changing fee setter", async function () {
      await expect(
        factory.connect(user2).setFeeToSetter(deployer.address)
      ).to.be.revertedWith("UniswapV2: FORBIDDEN");
    });

    it("should allow new fee setter to operate after transfer", async function () {
      // Transfer fee setter role
      await factory.connect(user1).setFeeToSetter(user2.address);
      await new Promise(resolve => setTimeout(resolve, 3000));
      // New fee setter should be able to set feeTo
      await factory.connect(user2).setFeeTo(deployer.address);
      expect(await factory.feeTo()).to.equal(deployer.address);
      
      // Old fee setter should no longer have access
      await expect(
        factory.setFeeTo(user1.address)
      ).to.be.revertedWith("UniswapV2: FORBIDDEN");
    });
  });

  describe("Pair Address Calculation", function () {
    it("should calculate CREATE2 addresses correctly", async function () {
      const whbarToken = await whbar.token();
      const testToken2 = await TestTokenFactory.deploy({ 
        value: ethers.parseEther("10.0"),
        gasLimit: 8000000
      });
      await testToken2.waitForDeployment()
      const testToken2Address = await testToken2.token()
     
      const create2Address = predictPair(whbarToken, testToken2Address)
      await Utils.updateAccountKeysViaHapi([addresses.factory, create2Address])
      const predictedAddress = await factory.createPair.staticCall(whbarToken, testToken2Address, {
        value: ethers.parseEther("60"),
        gasLimit: 8000000
      });

     const tx = await factory.createPair(whbarToken, testToken2Address, {
        value: ethers.parseEther("60"),
        gasLimit: 8000000
      });
      await tx.wait()
      const pair = await factory.getPair(whbarToken, testToken2Address)
      await new Promise(resolve => setTimeout(resolve, 3000));

      await expect(tx)
        .to.emit(factory, "PairCreated")
        .withArgs(
          whbarToken,
          testToken2Address,
          pair,
          1
        );

      const actualAddress = await factory.getPair(whbarToken, testToken2Address);
      expect(actualAddress).to.equal(predictedAddress);
    });

    it("should return zero address for non-existent pair", async function () {
      // Use fake addresses for this test since it's just checking getPair logic
      const tokenA = "0x0000000000000000000000000000000000123456";
      const tokenB = "0x0000000000000000000000000000000000654321";
      
      const pairAddress = await factory.getPair(tokenA, tokenB);
      expect(pairAddress).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Gas Usage", function () {
    it("should track gas usage for pair creation", async function () {
      const whbarToken = await whbar.token();
      const testTokenAddr = await testToken.token();
      
      const tx = await factory.createPair(whbarToken, testTokenAddr, {
        value: ethers.parseEther("60")
      });
      const receipt = await tx.wait();
      
      expect(receipt.gasUsed).to.be.lt(ethers.parseUnits("5000000", "wei"));
    });
  });
});