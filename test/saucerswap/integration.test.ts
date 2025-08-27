import { expect } from "chai";
import { ethers } from "hardhat";
import { AssetsDeployer } from "../../scripts/deploy/assets";
import { SaucerSwapDeployer } from "../../scripts/deploy/saucerswap";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// ERC20 token for testing
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)", 
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

const TEST_ERC20_BYTECODE = "0x608060405234801561001057600080fd5b506040516108013803806108018339818101604052810190610032919061010f565b8360039080519060200190610048929190610062565b5082600490805190602001906100619291906100625b828001906001019080831161006857509160009081526020600052604090209061017d565b8160056000620000726001600560009054906101000a90910201610196565b61019690919063ffffffff16565b60058190555080600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055505050505061029a565b6000808284019050838110156101005760405162461bcd60e51b815260206004820152601b60248201527f536166654d6174683a206164646974696f6e206f766572666c6f770000000000604482015260640160405180910390fd5b8091505092915050565b8051906020019080838360005b8381101561012a5780820151818401526020810190506101205b5050505090500191505060405180910390f35b6000815190506101648161026d565b92915050565b60006020828403121561017c57600080fd5b600061018a84828501610155565b91505092915050565b60008160001c9050919050565b600082821115610216575060405162461bcd60e51b815260206004820152601e60248201527f536166654d6174683a207375627472616374696f6e206f766572666c6f770000604482015260640160405180910390fd5b818303905092915050565b60006102678260019900909216905b50602084019350935090849003919093010190565b60006040519050919050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b6102a981610296565b81146102b457600080fd5b5061056382610278565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b80516102f581610270565b80516020830190839003935092915050565b6000604051905090919050565b919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600180546001810190915582816000f35b61040680610348565b6105398061037d6000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c806370a082311161005b57806370a0823114610126578063a9059cbb14610156578063dd62ed3e14610186578063095ea7b31461019957610088565b8063095ea7b31461008d57806318160ddd1461009a57806323b872dd146100b8578063313ce567146100cb57610088565b6100a2816100c5565b63095ea7b360e01b0361001057600080fd5b8051906020019060208301925060026000396000f35b6000600554905090565b60006100cb565b8051906020019060208301925060026000396000f35b6000600360009054906101000a900460ff16905090565b60006100f6826100fa565b8051906020019060208301925060026000396000f35b6000600660008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b6000610162838361016c565b60019050919050565b8051906020019060208301925060026000396000f35b600061017082610174565b8051906020019060208301925060026000396000f35b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16141580156101d85750600081115b156101ec576101e68233600201610233565b916101f6565b8051906020019060208301925060026000396000f35b6000600660008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050928361024d565b81811015610270576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610267906104bc565b60405180910390fd5b818103600660008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000208190555081600660008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461030491906104dd565b925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161036891906104fb565b60405180910390a3600190509392505050565b6000600760008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b6000600660008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205490508281101561047c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610473906104bc565b60405180910390fd5b82600760003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92585604051610568919061050c565b60405180910390a3600190509392505050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b60006105b58261059a565b9050919050565b6105c5816105aa565b81146105d057600080fd5b5050565b600081359050610590816105bc565b6000602082840312156105f5576105f4610575565b5b6000610603848285016105d4565b91505092915050565b600082825260208201905092915050565b7f496e73756666696369656e742062616c616e636500000000000000000000000000600082015250565b600061065460148361060c565b915061065f8261061d565b602082019050919050565b6000602082019050818103600083015261068381610647565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006106c68261059a565b91506106d18361059a565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff03821115610706576107056106ba565b5b828201905092915050565b6000819050919050565b6107248161058e565b82525050565b600060208201905061073f6000830184610711565b9291505056fea2646970667358221220a5b9f2a5e5e8b5d4d4f4e8b5e5a3e5d4e5f5a5e5d4e5f5e5a5e5d4f5e5a5d564736f6c63430008110033";

describe("SaucerSwap Integration Tests", function () {
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress; 
  let user2: SignerWithAddress;
  let assetsDeployer: AssetsDeployer;
  let saucerSwapDeployer: SaucerSwapDeployer;
  let factory: any;
  let router: any;
  let whbar: any;
  let tokenA: any;
  let tokenB: any;
  let addresses: any;


  async function deployTestToken(name: string, symbol: string, totalSupply: bigint) {
    const TestToken = new ethers.ContractFactory(ERC20_ABI, TEST_ERC20_BYTECODE, deployer);
    return await TestToken.deploy(name, symbol, 18, totalSupply);
  }

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    
    // Deploy assets layer first
    assetsDeployer = new AssetsDeployer();
    const assetsResult = await assetsDeployer.deployWHBAR();
    whbar = assetsResult.deployments.whbar;
    
    // Deploy SaucerSwap
    saucerSwapDeployer = new SaucerSwapDeployer();
    const result = await saucerSwapDeployer.deployV1();
    factory = result.deployments.factory;
    router = result.deployments.router;
    addresses = result.addresses;

    // Deploy test tokens for testing
    const tokenSupply = ethers.parseEther("1000000"); // 1M tokens
    tokenA = await deployTestToken("Token A", "TKNA", tokenSupply);
    tokenB = await deployTestToken("Token B", "TKNB", tokenSupply);

    // Give users some tokens
    await tokenA.transfer(user1.address, ethers.parseEther("10000"));
    await tokenA.transfer(user2.address, ethers.parseEther("10000"));
    await tokenB.transfer(user1.address, ethers.parseEther("10000"));
    await tokenB.transfer(user2.address, ethers.parseEther("10000"));

    // Give users some WHBAR
    await whbar.connect(user1).deposit({ value: ethers.parseEther("100") });
    await whbar.connect(user2).deposit({ value: ethers.parseEther("100") });
  });

  describe("End-to-End Liquidity and Swapping", function () {
    it("should create pair, add liquidity, and perform swaps", async function () {
      // Step 1: Create a trading pair
      const pairCreationFee = ethers.parseEther("1");
      await factory.createPair(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        { value: pairCreationFee }
      );

      const pairAddress = await factory.getPair(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // Step 2: Approve router to spend tokens
      const approveAmount = ethers.parseEther("1000");
      await tokenA.connect(user1).approve(addresses.router, approveAmount);
      await tokenB.connect(user1).approve(addresses.router, approveAmount);

      // Step 3: Add initial liquidity
      const liquidityA = ethers.parseEther("100");
      const liquidityB = ethers.parseEther("200");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const addLiquidityTx = await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityA,
        liquidityB,
        liquidityA * 95n / 100n, // 5% slippage tolerance
        liquidityB * 95n / 100n,
        user1.address,
        deadline
      );

      await addLiquidityTx.wait();

      // Verify liquidity was added
      const pair = new ethers.Contract(pairAddress, [
        "function getReserves() view returns (uint112, uint112, uint32)",
        "function balanceOf(address) view returns (uint256)",
        "function totalSupply() view returns (uint256)"
      ], ethers.provider);

      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.be.gt(0);
      expect(reserve1).to.be.gt(0);

      const user1LPBalance = await pair.balanceOf(user1.address);
      expect(user1LPBalance).to.be.gt(0);

      // Step 4: Perform a swap
      const swapAmount = ethers.parseEther("10");
      await tokenA.connect(user2).approve(addresses.router, swapAmount);

      const user2InitialBalanceB = await tokenB.balanceOf(user2.address);
      
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const minAmountOut = ethers.parseEther("15"); // Expecting ~20 tokens out with 2:1 ratio

      const swapTx = await router.connect(user2).swapExactTokensForTokens(
        swapAmount,
        minAmountOut,
        path,
        user2.address,
        deadline
      );

      await swapTx.wait();

      // Verify swap occurred
      const user2FinalBalanceB = await tokenB.balanceOf(user2.address);
      expect(user2FinalBalanceB).to.be.gt(user2InitialBalanceB);

      // Step 5: Remove some liquidity
      const lpTokensToRemove = user1LPBalance / 2n;
      
      await pair.connect(user1).approve(addresses.router, lpTokensToRemove);

      const user1InitialBalanceA = await tokenA.balanceOf(user1.address);
      const user1InitialBalanceB = await tokenB.balanceOf(user1.address);

      const removeLiquidityTx = await router.connect(user1).removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        lpTokensToRemove,
        0, // Accept any amount of tokens back
        0,
        user1.address,
        deadline
      );

      await removeLiquidityTx.wait();

      // Verify liquidity was removed
      const user1FinalBalanceA = await tokenA.balanceOf(user1.address);
      const user1FinalBalanceB = await tokenB.balanceOf(user1.address);
      
      expect(user1FinalBalanceA).to.be.gt(user1InitialBalanceA);
      expect(user1FinalBalanceB).to.be.gt(user1InitialBalanceB);
    });

    it("should handle HBAR/Token liquidity and swaps", async function () {
      // Step 1: Create WHBAR/Token pair
      await factory.createPair(
        addresses.whbar,
        await tokenA.getAddress(),
        { value: ethers.parseEther("1") }
      );

      // Step 2: Add HBAR/Token liquidity
      const tokenAmount = ethers.parseEther("1000");
      const hbarAmount = ethers.parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await tokenA.connect(user1).approve(addresses.router, tokenAmount);

      const addLiquidityTx = await router.connect(user1).addLiquidityHBAR(
        await tokenA.getAddress(),
        tokenAmount,
        tokenAmount * 95n / 100n,
        hbarAmount * 95n / 100n,
        user1.address,
        deadline,
        { value: hbarAmount }
      );

      await addLiquidityTx.wait();

      // Step 3: Swap HBAR for tokens
      const swapHBARAmount = ethers.parseEther("1");
      const path = [addresses.whbar, await tokenA.getAddress()];

      const user2InitialBalance = await tokenA.balanceOf(user2.address);

      const swapTx = await router.connect(user2).swapExactHBARForTokens(
        0, // Accept any amount of tokens
        path,
        user2.address,
        deadline,
        { value: swapHBARAmount }
      );

      await swapTx.wait();

      // Verify swap
      const user2FinalBalance = await tokenA.balanceOf(user2.address);
      expect(user2FinalBalance).to.be.gt(user2InitialBalance);

      // Step 4: Swap tokens for HBAR
      const tokenSwapAmount = ethers.parseEther("50");
      await tokenA.connect(user2).approve(addresses.router, tokenSwapAmount);

      const user2InitialHBARBalance = await ethers.provider.getBalance(user2.address);

      const swapTokensTx = await router.connect(user2).swapExactTokensForHBAR(
        tokenSwapAmount,
        0,
        path.reverse(),
        user2.address,
        deadline
      );

      const receipt = await swapTokensTx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      // Verify HBAR received (accounting for gas)
      const user2FinalHBARBalance = await ethers.provider.getBalance(user2.address);
      expect(user2FinalHBARBalance).to.be.gt(user2InitialHBARBalance - gasUsed);
    });
  });

  describe("Price Impact and Slippage", function () {
    beforeEach(async function () {
      // Create pair and add significant liquidity
      await factory.createPair(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        { value: ethers.parseEther("1") }
      );

      const liquidityA = ethers.parseEther("10000");
      const liquidityB = ethers.parseEther("20000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await tokenA.connect(user1).approve(addresses.router, liquidityA);
      await tokenB.connect(user1).approve(addresses.router, liquidityB);

      await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidityA,
        liquidityB,
        0,
        0,
        user1.address,
        deadline
      );
    });

    it("should handle large swaps with price impact", async function () {
      const largeSwapAmount = ethers.parseEther("1000"); // 10% of liquidity
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Get expected output
      const expectedOutput = await router.getAmountsOut(largeSwapAmount, path);
      
      await tokenA.connect(user2).approve(addresses.router, largeSwapAmount);

      const initialBalance = await tokenB.balanceOf(user2.address);

      await router.connect(user2).swapExactTokensForTokens(
        largeSwapAmount,
        expectedOutput[1] * 90n / 100n, // 10% slippage tolerance
        path,
        user2.address,
        deadline
      );

      const finalBalance = await tokenB.balanceOf(user2.address);
      const actualOutput = finalBalance - initialBalance;

      // Verify price impact (should receive less than linear exchange rate)
      const linearRate = largeSwapAmount * 2n; // 2:1 initial ratio
      expect(actualOutput).to.be.lt(linearRate);
      expect(actualOutput).to.be.gte(expectedOutput[1]);
    });

    it("should revert on excessive slippage", async function () {
      const swapAmount = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const expectedOutput = await router.getAmountsOut(swapAmount, path);
      const unrealisticMinOutput = expectedOutput[1] * 110n / 100n; // Expecting 10% more than possible

      await tokenA.connect(user2).approve(addresses.router, swapAmount);

      await expect(
        router.connect(user2).swapExactTokensForTokens(
          swapAmount,
          unrealisticMinOutput,
          path,
          user2.address,
          deadline
        )
      ).to.be.revertedWith("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
    });
  });

  describe("Multiple Pool Interactions", function () {
    it("should handle multi-hop swaps through multiple pools", async function () {
      // Create Token A/WHBAR pool
      await factory.createPair(await tokenA.getAddress(), addresses.whbar, { value: ethers.parseEther("1") });
      
      // Create WHBAR/Token B pool
      await factory.createPair(addresses.whbar, await tokenB.getAddress(), { value: ethers.parseEther("1") });

      // Add liquidity to both pools
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Add Token A/WHBAR liquidity
      await tokenA.connect(user1).approve(addresses.router, ethers.parseEther("1000"));
      await router.connect(user1).addLiquidityHBAR(
        await tokenA.getAddress(),
        ethers.parseEther("1000"),
        0,
        0,
        user1.address,
        deadline,
        { value: ethers.parseEther("10") }
      );

      // Add WHBAR/Token B liquidity
      await tokenB.connect(user1).approve(addresses.router, ethers.parseEther("2000"));
      await router.connect(user1).addLiquidityHBAR(
        await tokenB.getAddress(),
        ethers.parseEther("2000"),
        0,
        0,
        user1.address,
        deadline,
        { value: ethers.parseEther("10") }
      );

      // Perform multi-hop swap: Token A -> WHBAR -> Token B
      const swapAmount = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), addresses.whbar, await tokenB.getAddress()];

      await tokenA.connect(user2).approve(addresses.router, swapAmount);
      const initialBalanceB = await tokenB.balanceOf(user2.address);

      await router.connect(user2).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        user2.address,
        deadline
      );

      const finalBalanceB = await tokenB.balanceOf(user2.address);
      expect(finalBalanceB).to.be.gt(initialBalanceB);
    });
  });
});