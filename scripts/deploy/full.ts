import { AssetsDeployer } from "./assets";
import { SaucerSwapDeployer } from "./saucerswap";

async function main() {
  console.log("🚀 Starting full deployment...\n");
  
  // Deploy assets first
  console.log("📦 Deploying Assets Layer...");
  const assetsDeployer = new AssetsDeployer();
  await assetsDeployer.deployWHBAR();
  
  console.log("\n🔄 Deploying Application Layer...");
  // Deploy SaucerSwap
  const saucerSwapDeployer = new SaucerSwapDeployer();
  await saucerSwapDeployer.deployV1();
  
  console.log("\n✅ Full deployment completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});