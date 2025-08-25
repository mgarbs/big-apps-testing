import { expect } from "chai";
import { ethers } from "hardhat";
import { SaucerSwapDeployer } from "../../scripts/deploy/saucerswap";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SaucerSwap V1 (Uniswap V2)", function () {
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let saucerSwapDeployer: SaucerSwapDeployer;
  let deployments: any;
  let addresses: any;

  // Test HTS token addresses (using testnet format)
  const TEST_TOKEN_A = "0x0000000000000000000000000000000000123456";
  const TEST_TOKEN_B = "0x0000000000000000000000000000000000654321";

  beforeEach(async function () {
    [deployer, user1] = await ethers.getSigners();
    saucerSwapDeployer = new SaucerSwapDeployer();
  });

  describe("V1 Deployment", function () {
    
    beforeEach(async function () {
      const result = await saucerSwapDeployer.deployV1();
      deployments = result.deployments;
      addresses = result.addresses;
    });

    it("should deploy Factory with correct parameters", async function () {
      expect(addresses.factory).to.be.properAddress;
      
      const feeToSetter = await deployments.factory.feeToSetter();
      expect(feeToSetter).to.equal(deployer.address);
      
      const pairCreateFee = await deployments.factory.pairCreateFee();
      expect(pairCreateFee).to.equal(ethers.parseEther("1"));
    });

    it("should deploy Router with correct Factory and WHBAR addresses", async function () {
      expect(addresses.router).to.be.properAddress;
      
      const factoryAddress = await deployments.router.factory();
      const whbarAddress = await deployments.router.WHBAR();
      
      expect(factoryAddress).to.equal(addresses.factory);
      expect(whbarAddress).to.equal(addresses.whbar);
    });
  });

  describe("V1 Factory Operations", function () {
    
    beforeEach(async function () {
      const result = await saucerSwapDeployer.deployV1();
      deployments = result.deployments;
      addresses = result.addresses;
    });

    it("should create trading pairs successfully", async function () {
      const tx = await deployments.factory.createPair(TEST_TOKEN_A, TEST_TOKEN_B, {
        value: ethers.parseEther("1")
      });
      await tx.wait();
      
      const pairAddress = await deployments.factory.getPair(TEST_TOKEN_A, TEST_TOKEN_B);
      expect(pairAddress).to.not.equal("0x0000000000000000000000000000000000000000");
      
      const allPairsLength = await deployments.factory.allPairsLength();
      expect(allPairsLength).to.equal(1);
    });

    it("should handle insufficient pair creation fee", async function () {
      await expect(
        deployments.factory.createPair(TEST_TOKEN_A, TEST_TOKEN_B, {
          value: ethers.parseEther("0.5")
        })
      ).to.be.reverted;
    });
  });
});

// TODO: SaucerSwap V2 (Uniswap V3) Tests
describe.skip("SaucerSwap V2 (Uniswap V3) - TODO", function () {
  // TODO: Implement V2 tests using Uniswap V3 patterns when V2 deployment is ready
  
  describe.skip("V2 Factory and Pool Creation", function () {
    // TODO: Test UniswapV3Factory
    // TODO: Test pool creation with different fee tiers
  });

  describe.skip("V2 Router and Swapping", function () {
    // TODO: Test SwapRouter
    // TODO: Test concentrated liquidity
  });
});