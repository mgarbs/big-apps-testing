// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.6.12;
pragma experimental ABIEncoderV2;

import './saucerswap/hedera/SafeHederaTokenService.sol';

contract AssociationHelper is SafeHederaTokenService {
    
    function associateUserWithToken(address user, address token) external {
        safeAssociateToken(user, token);
    }
    
    function associateUserWithTokens(address user, address[] memory tokens) external {
        safeAssociateTokens(user, tokens);
    }
}