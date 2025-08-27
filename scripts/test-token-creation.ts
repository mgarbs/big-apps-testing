import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("🧪 Testing HTS Token Creation");
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`HBAR Balance: ${ethers.formatEther(balance)} HBAR`);
  
  console.log("\n📦 Deploying test contract...");
  const TestTokenCreation = await ethers.getContractFactory("TestTokenCreation");
  const testContract = await TestTokenCreation.deploy();
  await testContract.waitForDeployment();
  const contractAddress = await testContract.getAddress();
  console.log(`✅ Test contract deployed to: ${contractAddress}`);
  
  console.log("\n🔨 Testing token creation...");
  try {
    const tx = await testContract.createSimpleToken({ 
      value: ethers.parseEther("5.0"),
      gasLimit: 3000000
    });
    console.log(`Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction mined in block ${receipt.blockNumber}`);
    
    const responseCode = await testContract.lastResponseCode();
    console.log(`Response code: ${responseCode}`);
    
    const tokenAddress = await testContract.createdToken();
    if (tokenAddress !== ethers.ZeroAddress) {
      console.log(`✅ Token created at: ${tokenAddress}`);
    } else {
      console.log(`❌ Token creation failed with response code: ${responseCode}`);
    }
    
  } catch (error: any) {
    console.error("❌ Token creation failed:", error.message);
    if (error.receipt) {
      console.log(`Transaction hash: ${error.receipt.hash}`);
      console.log(`Block: ${error.receipt.blockNumber}`);
      console.log(`Gas used: ${error.receipt.gasUsed}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});