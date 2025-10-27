// SPDX-License-Identifier: Apache-2.0
pragma solidity =0.6.12;
pragma experimental ABIEncoderV2;

import "../saucerswap/hedera/SafeHederaTokenService.sol";
import "../saucerswap/libraries/Bits.sol";

contract TokenCreateContract is SafeHederaTokenService {

    using Bits for uint;

    string public name = "TestToken";
    string public symbol = "TEST";
    address public token;

    event CreatedToken(address tokenAddress);

    constructor() public payable {
        uint supplyKeyType;
        IHederaTokenService.KeyValue memory supplyKeyValue;

        // turn on bits corresponding to supply key type
        supplyKeyType = supplyKeyType.setBit(4);
        supplyKeyValue.contractId = address(this);

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey (supplyKeyType, supplyKeyValue);

        IHederaTokenService.Expiry memory expiry;
        expiry.autoRenewAccount = address(this);
        expiry.autoRenewPeriod = 8000000;

        IHederaTokenService.HederaToken memory myToken;
        myToken.name = "Test Token";
        myToken.symbol = "TEST";
        myToken.treasury = address(this);
        myToken.expiry = expiry;
        myToken.tokenKeys = keys;

        (int responseCode, address _token) =
        HederaTokenService.createFungibleToken(myToken, 1000000, 8);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        token = _token;
        emit CreatedToken(_token);
    }
}