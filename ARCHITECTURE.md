# Big Apps - Architecture Documentation

## Overview

This framework enables deployment and testing of major DeFi applications on Hedera networks for network upgrade validation. Currently supports SaucerSwap V1 with a clean, scalable architecture for adding more applications.

## Design Principles

### 🎯 Zero Contract Modifications
- All application contracts used exactly as published by original teams
- No import path changes or code modifications required
- Maintains full compatibility with official deployments

### 🏗️ Self-Contained Applications  
- Each app contains its complete dependency tree
- No shared dependencies to cause version conflicts
- Clean separation between different applications

### 🚀 Production Ready
- Real contracts deployed and verified on Hedera networks
- Comprehensive testing against actual network conditions
- Proper logging, error handling, and artifact management

## Current Implementation

### SaucerSwap V1 (Uniswap V2)

**Deployed Components:**
- `UniswapV2Factory` - Creates HTS token trading pairs
- `UniswapV2Router02` - Handles user interactions (swaps, liquidity)
- Uses existing WHBAR deployment (0.0.15057) on both testnet and previewnet

**Capabilities:**
- ✅ Create trading pairs with HTS tokens
- ✅ Execute token swaps through router
- ✅ Add/remove liquidity positions
- ✅ Handle Hedera-specific fees and gas requirements

## File Organization

```
contracts/saucerswap/
├── UniswapV2Factory.sol           # Main factory contract
├── UniswapV2Pair.sol              # Trading pair implementation  
├── UniswapV2Router02.sol          # User interaction router
├── hedera/                        # Hedera Token Service integration
│   ├── HederaTokenService.sol     # Core HTS functionality
│   ├── SafeHederaTokenService.sol # Safe wrapper functions
│   └── [interfaces]               # HTS interfaces
├── interfaces/                    # Contract interfaces
│   ├── IUniswapV2Factory.sol
│   ├── IUniswapV2Router02.sol  
│   └── [others]
└── libraries/                     # Utility libraries
    ├── UniswapV2Library.sol       # AMM calculations
    ├── SafeMath.sol               # Safe arithmetic
    └── [others]
```

## Network Configuration

### Supported Networks
- **Testnet**: Chain ID 296, RPC `https://testnet.hashio.io/api`
- **Previewnet**: Chain ID 297, RPC `https://previewnet.hashio.io/api`

### Shared Resources
- **WHBAR**: `0x0000000000000000000000000000000000003ad1` (0.0.15057)
  - Same address on both testnet and previewnet
  - Production WHBAR deployment used by SaucerSwap

## Deployment Process

### 1. Pre-Deployment Validation
- Verify network connectivity and account balance
- Confirm WHBAR availability at expected address
- Validate contract compilation

### 2. Contract Deployment  
- Deploy Factory with configurable fees
- Deploy Router pointing to Factory and WHBAR
- Save deployment artifacts with timestamps

### 3. Post-Deployment Verification
- Verify contract addresses and configuration
- Test basic functionality (pair creation, etc.)
- Generate deployment summary

## Testing Strategy

### Integration Testing
- Deploy fresh contracts for each test suite
- Test against real Hedera network conditions
- Validate HTS token interactions

### Test Categories
1. **Deployment Tests**: Verify contracts deploy with correct parameters
2. **Factory Tests**: Test pair creation and fee handling
3. **Router Tests**: Test swap routing and liquidity management
4. **HTS Integration**: Test Hedera-specific token functionality

## Scalability Plan

### Adding New Applications

Each new application follows the same pattern:

1. **Isolated Directory**: `contracts/[app]/` contains all dependencies
2. **Deployer Class**: Extends base `Deployer` with app-specific logic
3. **Test Suite**: Comprehensive tests in `test/apps/[app].test.ts`
4. **Documentation**: Clear README and usage instructions

### Benefits
- **No Conflicts**: Applications isolated from each other
- **Consistent Patterns**: Same deployment and testing approach
- **Easy Maintenance**: Clear ownership and responsibility per app
- **Rapid Development**: Framework handles infrastructure concerns

## Future Roadmap

### SaucerSwap V2 (Uniswap V3)
- Concentrated liquidity positions
- Multiple fee tiers (0.05%, 0.30%, 1.00%)
- NFT-based position management

### Additional Applications
- **Bonzo**: Lending and borrowing protocol
- **Stader**: Liquid staking solutions  
- **HSuite**: Multi-protocol DeFi suite
- **Stargate**: Cross-chain bridge protocol
- **SquidRouter**: Cross-chain swap routing

Each application will follow the established patterns for clean, maintainable integration.