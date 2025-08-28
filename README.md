# Big Apps - Hedera DeFi Testing Framework

Production-ready framework for deploying and testing major DeFi applications on Hedera networks.

## Quick Start

```bash
npm install
cp .env.example .env

# Deploy assets layer
npx hardhat run scripts/deploy/assets.ts --network hederaTestnet

# Deploy applications  
npx hardhat run scripts/deploy/saucerswap.ts --network hederaTestnet

# Run tests
npx hardhat test --network hederaTestnet
```

## Architecture

### Assets Layer
Core infrastructure deployed first:
- **WHBAR**: Wrapped HBAR implementation with HTS integration

### Application Layer  
DeFi applications that use the assets layer:
- **SaucerSwap V1**: Uniswap V2-based DEX
- **SaucerSwap V2**: Uniswap V3-based DEX

## Status

### Assets
- **WHBAR**: Wrapped HBAR contract with Hedera Token Service integration

### SaucerSwap V1
- **Factory**: Creates token trading pairs with configurable fees
- **Router**: Handles swaps and liquidity management
- **Testing**: Comprehensive test suite covering all functionality

### SaucerSwap V2
- **Factory**: Deploys Uniswap V3 pools
- **Pool**: Uniswap V3 Pool contract
- **PoolDeployer**: Deploys a pool

## Deployment

### Deploy Assets
```bash
npx hardhat run scripts/deploy/assets.ts --network hederaTestnet
```

### Deploy SaucerSwap  
```bash
npx hardhat run scripts/deploy/saucerswap.ts --network hederaTestnet
```

### Full Deployment
```bash
npx hardhat run scripts/deploy/full.ts --network hederaTestnet
```

## Testing

```bash
npx hardhat test --network hederaTestnet
npx hardhat test test/saucerswap/factory.test.ts --network hederaTestnet
npx hardhat test test/assets/whbar.test.ts --network hederaTestnet
```

### Test Structure
```
test/
├── assets/
│   └── whbar.test.ts       # WHBAR functionality
└── saucerswap/
    ├── saucer.test.ts      # Basic deployment tests
    ├── factory.test.ts     # Factory functionality
    ├── router.test.ts      # Router functionality
    └── integration.test.ts # End-to-end flows
```

## Project Structure

```
big-apps/
├── contracts/
│   ├── assets/                  # Core infrastructure
│   │   └── WHBAR.sol           # Wrapped HBAR implementation
│   └── saucerswap/             # SaucerSwap V1 contracts
│       ├── UniswapV2Factory.sol # Pair factory
│       ├── UniswapV2Router02.sol# Trading router
│       ├── hedera/             # HTS integration
│       ├── interfaces/         # Contract interfaces
│       └── libraries/          # Utility libraries
├── scripts/deploy/
│   ├── assets.ts               # Assets deployment
│   ├── saucerswap.ts          # SaucerSwap deployment
│   └── utils/                  # Deployment utilities
├── test/
│   ├── assets/                 # Assets tests
│   └── saucerswap/            # SaucerSwap tests
├── deployments/               # Deployment artifacts
└── typechain-types/           # Generated types
```

## Environment Configuration

```bash
# .env
PRIVATE_KEY=0x...
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
HEDERA_PREVIEWNET_RPC=https://previewnet.hashio.io/api
```

## Features

- **Modular**: Assets layer → Application layer dependency flow
- **HTS Integration**: Hedera Token Service compatibility
- **Comprehensive Testing**: Full Uniswap V2-style test coverage
- **Network Verified**: All contracts visible on Hashscan

## Deployment Artifacts

Each deployment creates JSON artifacts:
```json
{
  "network": "hederaTestnet",
  "version": "assets",
  "timestamp": "2025-08-26T19:30:00.000Z",
  "addresses": {
    "whbar": "0x7e7d61C946C6125AA019Cea12a1844541BA1568a"
  },
  "app": "Assets"
}
```

## Adding Applications

1. Create contracts in `contracts/[app]/`
2. Create deployment script in `scripts/deploy/[app].ts`
3. Add tests in `test/[app]/`
4. Load dependencies from assets layer

## Contract Verification

All deployed contracts are verifiable on Hashscan:
- **Testnet**: https://hashscan.io/testnet/contract/[address]
- **Previewnet**: https://hashscan.io/previewnet/contract/[address]

Deployment artifacts in `deployments/` contain all contract addresses.
