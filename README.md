# Big Apps - Hedera Network Testing Framework

A production-ready framework for deploying and testing major DeFi applications on Hedera testnet and previewnet. Built for network upgrade validation and contract verification.

## Quick Start

1. **Setup:**
   ```bash
   npm install
   cp .env.example .env  # Add your PRIVATE_KEY
   ```

2. **Deploy SaucerSwap V1:**
   ```bash
   npm run deploy:saucerswap:v1:testnet
   ```

3. **Test Deployment:**
   ```bash
   npm run test:saucerswap:v1:testnet
   ```

## Current Status

### ✅ SaucerSwap V1 - PRODUCTION READY

Full Uniswap V2 based DEX deployed and tested on Hedera networks:

- **Factory**: Creates HTS token trading pairs with configurable fees
- **Router**: Handles swaps and liquidity management  
- **WHBAR Integration**: Uses existing testnet/previewnet WHBAR (0.0.15057)

### 🔄 Future Big Apps

Ready to add:
- **SaucerSwap V2** (Uniswap V3 based)
- **Bonzo** 
- **Stader**
- **HSuite**
- **Stargate**
- **SquidRouter**

## Key Features

- **Zero Contract Modifications**: Uses official SaucerSwap contracts exactly as published
- **HTS Native**: Full Hedera Token Service integration
- **Network Upgrade Ready**: Validates contracts work post-upgrade
- **Clean Architecture**: Modular, scalable, no spaghetti code
- **Production Grade**: Real deployments with proper logging and artifact management

## Commands

### Deployment
```bash
# Testnet
npm run deploy:saucerswap:v1:testnet

# Previewnet  
npm run deploy:saucerswap:v1:previewnet
```

### Testing
```bash
# Compile contracts
npm run compile

# Test on testnet
npm run test:saucerswap:v1:testnet
```

## Project Structure

```
big-apps/
├── contracts/saucerswap/           # SaucerSwap V1 contracts
│   ├── UniswapV2Factory.sol        # Pair factory
│   ├── UniswapV2Router02.sol       # Trading router
│   ├── hedera/                     # HTS integration
│   ├── interfaces/                 # Contract interfaces
│   └── libraries/                  # Utility libraries
├── scripts/deploy/                 # Deployment scripts
├── test/apps/                      # Test suites
└── deployments/                    # Deployment artifacts
```

## Environment Configuration

```bash
# .env
PRIVATE_KEY=0x...
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
HEDERA_PREVIEWNET_RPC=https://previewnet.hashio.io/api
```

## Adding New Apps

Follow the SaucerSwap pattern:

1. Create `contracts/[app]/` directory
2. Add app contracts and dependencies  
3. Create `scripts/deploy/[app].ts`
4. Add test suite in `test/apps/[app].test.ts`
5. Update package.json scripts

No modifications to original contracts required - framework handles everything.