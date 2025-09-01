import { ethers } from "hardhat";
import { Deployer } from "../utils/deployer";

export class AssetsDeployer extends Deployer {
  constructor() {
    super("Assets");
  }

  async deployWHBAR() {
    this.logger.info("Starting WHBAR deployment...");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    this.logger.info(`Deploying with account: ${deployer.address}`);
    this.logger.info(`Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} HBAR`);
    this.logger.info(`Network: ${network.name} (Chain ID: ${network.chainId})`);

    this.logger.info("Deploying WHBAR...");
    const WHBAR = await ethers.getContractFactory("WHBAR");
    const whbar = await WHBAR.deploy({ 
      value: ethers.parseEther("30.0"),
      gasLimit: 8000000
    });
    await whbar.waitForDeployment();
    const whbarAddress = await whbar.getAddress();
    this.logger.success(`WHBAR deployed to: ${whbarAddress}`);
    
    // Get the HTS token address that was created
    const htsTokenAddress = await whbar.token();
    this.logger.success(`HTS Token created at: ${htsTokenAddress}`);

    const addresses = {
      whbar: whbarAddress
    };

    await this.saveDeployment("assets", addresses);
    this.logger.success("Assets deployment completed!");
    
    return { 
      deployments: { whbar },
      addresses 
    };
  }
}

async function main() {
  const deployer = new AssetsDeployer();
  await deployer.deployWHBAR();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}