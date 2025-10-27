import { ethers } from "hardhat";
import { Deployer } from "../utils/deployer";

export class SaucerSwapDeployer extends Deployer {
  constructor() {
    super("SaucerSwap");
  }

  async deployV1() {
    this.logger.info("Starting SaucerSwap V1 deployment...");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    this.logger.info(`Deploying with account: ${deployer.address}`);
    this.logger.info(`Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} HBAR`);
    this.logger.info(`Network: ${network.name} (Chain ID: ${network.chainId})`);

    const deployments = {
      factory: null as any,
      router: null as any
    };

    let whbarAddress: string;
    try {
      const network = process.env.HARDHAT_NETWORK || "hederaTestnet";
      const assetsFilePath = `${process.cwd()}/deployments/assets-assets-${network}.json`;
      const assetsDeployment = JSON.parse(require("fs").readFileSync(assetsFilePath, "utf8"));
      whbarAddress = assetsDeployment.addresses.whbar;
      this.logger.info(`Using pre-deployed WHBAR at: ${whbarAddress}`);
    } catch (error) {
      throw new Error("WHBAR not found. Please deploy assets first using: npx hardhat run scripts/deploy/assets.ts");
    }

    this.logger.info("Deploying UniswapV2Factory...");
    const Factory = await ethers.getContractFactory("UniswapV2Factory");
    deployments.factory = await Factory.deploy(
      deployer.address,
      100, // 1 USD worth of tinycents
      200, // 2 USD worth of tinycents
      {
        gasLimit: 8000000
      }
    );
    await deployments.factory.waitForDeployment();
    this.logger.success(`Factory deployed to: ${await deployments.factory.getAddress()}`);

    this.logger.info("Deploying UniswapV2Router02...");
    const Router = await ethers.getContractFactory("UniswapV2Router02");
    deployments.router = await Router.deploy(
      await deployments.factory.getAddress(),
      whbarAddress,
      {
        gasLimit: 8000000
      }
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

  async deployV2() {
    this.logger.info("Starting SaucerSwap V2 deployment...");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    this.logger.info(`Deploying with account: ${deployer.address}`);
    this.logger.info(`Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} HBAR`);
    this.logger.info(`Network: ${network.name} (Chain ID: ${network.chainId})`);

    const deployments = {
      libraries: {} as any,
      factory: null as any,
      router: null as any
    };

    let whbarAddress: string;
    try {
      const network = process.env.HARDHAT_NETWORK || "hederaTestnet";
      const assetsFilePath = `${process.cwd()}/deployments/assets-assets-${network}.json`;
      const assetsDeployment = JSON.parse(require("fs").readFileSync(assetsFilePath, "utf8"));
      whbarAddress = assetsDeployment.addresses.whbar;
      this.logger.info(`Using pre-deployed WHBAR at: ${whbarAddress}`);
    } catch (error) {
      throw new Error("WHBAR not found. Please deploy assets first using: npx hardhat run scripts/deploy/assets.ts");
    }

    // Deploy required libraries first
    const librariesToDeploy = [
      "BitMath", "HbarConversion", "Oracle", "SwapMath", "TickMath",
      "SafeCast", "Tick", "TickBitmap", "Position", "FullMath", 
      "FixedPoint128", "TransferHelper", "AssociateHelper", "SqrtPriceMath"
    ];
    
    const libraryContracts: { [key: string]: string } = {
      "BitMath": "BitMath",
      "HbarConversion": "HbarConversion", 
      "Oracle": "Oracle",
      "SwapMath": "SwapMath",
      "TickMath": "TickMath",
      "SafeCast": "contracts/saucerswap-v2/libraries/SafeCast.sol:SafeCast",
      "Tick": "Tick",
      "TickBitmap": "TickBitmap",
      "Position": "Position",
      "FullMath": "FullMath",
      "FixedPoint128": "FixedPoint128",
      "TransferHelper": "contracts/saucerswap-v2/libraries/TransferHelper.sol:TransferHelper",
      "AssociateHelper": "AssociateHelper",
      "SqrtPriceMath": "SqrtPriceMath"
    };

    for (const libName of librariesToDeploy) {
      this.logger.info(`Deploying ${libName} library...`);
      const contractName = libraryContracts[libName] || libName;
      const LibFactory = await ethers.getContractFactory(contractName);
      const lib = await LibFactory.deploy();
      await lib.waitForDeployment();
      const libAddress = await lib.getAddress();
      deployments.libraries[libName] = libAddress;
      this.logger.success(`${libName} deployed to: ${libAddress}`);
    }

    this.logger.info("Deploying UniswapV3Factory...");
    const Factory = await ethers.getContractFactory("UniswapV3Factory", {
      libraries: {
        "contracts/saucerswap-v2/libraries/BitMath.sol:BitMath": deployments.libraries.BitMath,
        "contracts/saucerswap-v2/libraries/HbarConversion.sol:HbarConversion": deployments.libraries.HbarConversion,
        "contracts/saucerswap-v2/libraries/Oracle.sol:Oracle": deployments.libraries.Oracle,
        "contracts/saucerswap-v2/libraries/SwapMath.sol:SwapMath": deployments.libraries.SwapMath,
        "contracts/saucerswap-v2/libraries/TickMath.sol:TickMath": deployments.libraries.TickMath,
      }
    });
    deployments.factory = await Factory.deploy({
      gasLimit: 10000000
    });
    await deployments.factory.waitForDeployment();
    this.logger.success(`Factory deployed to: ${await deployments.factory.getAddress()}`);

    const addresses = {
      whbar: whbarAddress,
      libraries: deployments.libraries,
      factory: await deployments.factory.getAddress(),
    };

    await this.saveDeployment("v2", addresses);
    this.logger.success("SaucerSwap V2 deployment completed!");
    
    return { deployments, addresses };
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
