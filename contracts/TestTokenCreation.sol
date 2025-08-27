// SPDX-License-Identifier: GPL-3.0
pragma solidity =0.6.12;
pragma experimental ABIEncoderV2;

import './saucerswap/hedera/SafeHederaTokenService.sol';
import './saucerswap/libraries/Bits.sol';

contract TestTokenCreation is SafeHederaTokenService {
    using Bits for uint;

    address public createdToken;
    int public lastResponseCode;
    
    function createSimpleToken() external payable {
        uint supplyKeyType;
        IHederaTokenService.KeyValue memory supplyKeyValue;

        supplyKeyType = supplyKeyType.setBit(4);
        supplyKeyValue.contractId = address(this);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey(supplyKeyType, supplyKeyValue);

        IHederaTokenService.Expiry memory expiry;
        expiry.autoRenewAccount = address(this);
        expiry.autoRenewPeriod = 8000000;

        IHederaTokenService.HederaToken memory myToken;
        myToken.name = "Test Token";
        myToken.symbol = "TEST";
        myToken.treasury = address(this);
        myToken.expiry = expiry;
        myToken.tokenKeys = keys;

        (int responseCode, address token) = HederaTokenService.createFungibleToken(myToken, 0, 8);
        
        lastResponseCode = responseCode;
        if (responseCode == HederaResponseCodes.SUCCESS) {
            createdToken = token;
        }
    }
}