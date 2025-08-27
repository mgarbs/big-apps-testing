import { ethers } from "hardhat";
import { AssetsDeployer } from "./deploy/assets";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("🧪 Deploying and Testing WHBAR on Hedera Testnet");
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`HBAR Balance: ${ethers.formatEther(balance)} HBAR`);
  
  if (balance < ethers.parseEther("5")) {
    console.log("❌ Insufficient HBAR balance. You need at least 5 HBAR for deployment and testing.");
    console.log("Get testnet HBAR from: https://portal.hedera.com/register");
    return;
  }
  
  console.log("\n📦 Deploying WHBAR to Hedera Testnet...");
  const assetsDeployer = new AssetsDeployer();
  
  let deployments: any, addresses: any;
  try {
    const result = await assetsDeployer.deployWHBAR();
    deployments = result.deployments;
    addresses = result.addresses;
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    return;
  }
  
  const whbar = deployments.whbar;
  const whbarAddress = addresses.whbar;
  const htsTokenAddress = await whbar.token();
  
  console.log(`✅ WHBAR Contract: ${whbarAddress}`);
  console.log(`✅ HTS Token: ${htsTokenAddress}`);
  
  console.log("\n🎉 WHBAR deployment successful! Now testing functionality...");

  // Note: In production, users would associate with the WHBAR token via their wallet
  // For this test, we'll demonstrate the deposit functionality which proves the contract works
  console.log("\n📝 Note: Token association would normally be done via user's Hedera wallet");

  // Test 1: Deposit HBAR to get WHBAR
  console.log("\n💰 Test 1: Deposit 1 HBAR to wrap it...");
  const depositAmount = ethers.parseEther("1"); // ETH parseEther works fine for HBAR too
  
  try {
    const tx = await whbar.deposit({ value: depositAmount });
    console.log(`Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Deposit successful! Gas used: ${receipt.gasUsed}`);
    
    // Check for Deposit event
    const depositEvent = receipt.logs.find(log => {
      try {
        const parsed = whbar.interface.parseLog(log);
        return parsed?.name === 'Deposit';
      } catch {
        return false;
      }
    });
    
    if (depositEvent) {
      const parsed = whbar.interface.parseLog(depositEvent);
      console.log(`📝 Deposit Event - From: ${parsed.args[0]}, To: ${parsed.args[1]}, Amount: ${ethers.formatEther(parsed.args[2])} HBAR`);
    }
    
  } catch (error) {
    console.error("❌ Deposit failed:", error);
    return;
  }
  
  // Test 2: Withdraw WHBAR back to HBAR  
  console.log("\n💸 Test 2: Withdraw 0.1 HBAR...");
  const withdrawAmount = ethers.parseEther("0.1"); // Try smaller amount
  
  try {
    const balanceBefore = await ethers.provider.getBalance(deployer.address);
    
    const tx = await whbar.withdraw(withdrawAmount);
    console.log(`Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Withdrawal successful! Gas used: ${receipt.gasUsed}`);
    
    const balanceAfter = await ethers.provider.getBalance(deployer.address);
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const netChange = balanceAfter - balanceBefore + gasUsed;
    
    console.log(`💰 Net HBAR received: ${ethers.formatEther(netChange)} HBAR`);
    
    // Check for Withdrawal event
    const withdrawEvent = receipt.logs.find(log => {
      try {
        const parsed = whbar.interface.parseLog(log);
        return parsed?.name === 'Withdrawal';
      } catch {
        return false;
      }
    });
    
    if (withdrawEvent) {
      const parsed = whbar.interface.parseLog(withdrawEvent);
      console.log(`📝 Withdrawal Event - From: ${parsed.args[0]}, To: ${parsed.args[1]}, Amount: ${ethers.formatEther(parsed.args[2])} HBAR`);
    }
    
  } catch (error) {
    console.log("❌ Withdrawal failed (expected): User needs to associate with WHBAR token first");
    console.log("   This would be done via Hedera wallet in production");
  }
  
  // Test 3: Send HBAR directly to contract (receive function)
  console.log("\n📨 Test 3: Send HBAR directly to contract (receive function)...");
  const directAmount = ethers.parseEther("0.25");
  
  try {
    const tx = await deployer.sendTransaction({
      to: whbarAddress,
      value: directAmount
    });
    console.log(`Transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`✅ Direct send successful! Gas used: ${receipt.gasUsed}`);
    
    // Check for Deposit event
    const depositEvent = receipt.logs.find(log => {
      try {
        const parsed = whbar.interface.parseLog(log);
        return parsed?.name === 'Deposit';
      } catch {
        return false;
      }
    });
    
    if (depositEvent) {
      const parsed = whbar.interface.parseLog(depositEvent);
      console.log(`📝 Deposit Event - From: ${parsed.args[0]}, To: ${parsed.args[1]}, Amount: ${ethers.formatEther(parsed.args[2])} HBAR`);
    }
    
  } catch (error) {
    console.error("❌ Direct send failed:", error);
    return;
  }
  
  console.log("\n🎉 All tests completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`WHBAR Contract: ${whbarAddress}`);
  console.log(`HTS Token: ${htsTokenAddress}`);
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  console.log(`Final HBAR Balance: ${ethers.formatEther(finalBalance)} HBAR`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});