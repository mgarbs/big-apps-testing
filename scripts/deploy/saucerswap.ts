import { ethers } from "hardhat";
import { Deployer } from "../utils/deployer";

export class SaucerSwapDeployer extends Deployer {
  constructor() {
    super("SaucerSwap");
  }

  async deployV1() {
    this.logger.info("Starting SaucerSwap V1 deployment...");
    
    const [deployer] = await ethers.getSigners();
    this.logger.info(`Deploying with account: ${deployer.address}`);
    this.logger.info(`Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} HBAR`);

    const deployments = {
      factory: null as any,
      router: null as any
    };

    // Use existing WHBAR (same address on testnet and previewnet)
    this.logger.info("Using existing WHBAR...");
    const whbarAddress = "0x0000000000000000000000000000000000003ad1"; // 0.0.15057
    this.logger.success(`Using existing WHBAR at: ${whbarAddress}`);

    // Deploy Factory
    this.logger.info("Deploying UniswapV2Factory...");
    const Factory = await ethers.getContractFactory("UniswapV2Factory");
    deployments.factory = await Factory.deploy(
      deployer.address,       // _feeToSetter
      ethers.parseEther("1"), // _pairCreateFee (1 HBAR)
      ethers.parseEther("10") // _tokenCreateFee (10 HBAR)
    );
    await deployments.factory.waitForDeployment();
    this.logger.success(`Factory deployed to: ${await deployments.factory.getAddress()}`);

    // Deploy Router
    this.logger.info("Deploying UniswapV2Router02...");
    const Router = await ethers.getContractFactory("UniswapV2Router02");
    deployments.router = await Router.deploy(
      await deployments.factory.getAddress(),
      whbarAddress
    );
    await deployments.router.waitForDeployment();
    this.logger.success(`Router deployed to: ${await deployments.router.getAddress()}`);

    const addresses = {
      whbar: whbarAddress,
      factory: await deployments.factory.getAddress(),
      router: await deployments.router.getAddress()
    };

    await this.saveDeployment("v1", addresses);
    this.logger.success("SaucerSwap V1 deployment completed!");
    
    return { deployments, addresses };
  }

  // TODO: V2 deployment - will be added later
  async deployV2() {
    this.logger.info("SaucerSwap V2 deployment not yet implemented");
    throw new Error("V2 deployment not implemented - use V1 for now");
  }
}

async function main() {
  const deployer = new SaucerSwapDeployer();
  
  const version = process.env.VERSION || "v1";
  
  if (version === "v1") {
    await deployer.deployV1();
  } else if (version === "v2") {
    await deployer.deployV2();
  } else {
    console.error("Invalid version. Use v1 or v2");
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}