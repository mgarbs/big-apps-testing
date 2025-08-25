import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { Logger } from "./logger";

export abstract class Deployer {
  protected logger: Logger;
  protected appName: string;
  protected deploymentsDir: string;

  constructor(appName: string) {
    this.appName = appName;
    this.logger = new Logger(appName);
    this.deploymentsDir = join(process.cwd(), "deployments");
    
    if (!existsSync(this.deploymentsDir)) {
      mkdirSync(this.deploymentsDir, { recursive: true });
    }
  }

  protected async saveDeployment(version: string, addresses: Record<string, string>) {
    const network = process.env.HARDHAT_NETWORK || "hardhat";
    const timestamp = new Date().toISOString();
    
    const deployment = {
      network,
      version,
      timestamp,
      addresses,
      app: this.appName
    };

    const filename = `${this.appName.toLowerCase()}-${version}-${network}.json`;
    const filepath = join(this.deploymentsDir, filename);
    
    writeFileSync(filepath, JSON.stringify(deployment, null, 2));
    this.logger.info(`Deployment saved to: ${filepath}`);
  }

  protected async loadDeployment(version: string): Promise<any> {
    const network = process.env.HARDHAT_NETWORK || "hardhat";
    const filename = `${this.appName.toLowerCase()}-${version}-${network}.json`;
    const filepath = join(this.deploymentsDir, filename);
    
    if (!existsSync(filepath)) {
      throw new Error(`Deployment file not found: ${filepath}`);
    }
    
    const deployment = JSON.parse(readFileSync(filepath, "utf8"));
    return deployment.addresses;
  }
}