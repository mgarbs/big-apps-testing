#!/usr/bin/env node --env-file .env

import { debuglog } from 'node:util';

import * as sdk from '@hashgraph/sdk';

import c from 'ansi-colors';

const log = debuglog('hbarx');

class AppError extends Error { }

const client = sdk.Client.forNetwork({ '127.0.0.1:50211': '0.0.3' });

async function main() {
    const { ACCOUNT_ID: accountId, PRIVATE_KEY: privateKey } = process.env;

    if (accountId === undefined || privateKey === undefined)
        throw new AppError('Environment variables `ACCOUNT_ID` and `PRIVATE_KEY` must be set');

    const operatorId = sdk.AccountId.fromString(accountId);
    const operatorKey = sdk.PrivateKey.fromStringECDSA(privateKey);
    client.setOperator(operatorId, operatorKey);

    const treasuryAccountId = operatorId;
    let transaction = new sdk.TokenCreateTransaction()
        .setTokenName("HBARx")
        .setTokenSymbol("HBARx")
        .setTreasuryAccountId(treasuryAccountId)
        .setInitialSupply(10000000)
        .setSupplyKey(operatorKey.publicKey)
        .setAdminKey(operatorKey.publicKey)
        // .setAdminKey(adminPublicKey)
        // .setMetadataKey(metadataKey)
        // .setMetadata(metadata)
        .setMaxTransactionFee(new sdk.Hbar(30))
        .freezeWith(client);

    //Sign the transaction with the token adminKey and the token treasury account private key
    transaction = await transaction.sign(operatorKey);
    // const signTx =  await (await transaction.sign(adminKey)).sign(treasuryKey);

    //Sign the transaction with the client operator private key and submit to a Hedera network
    // const txResponse = await signTx.execute(client);
    const txResponse = await transaction.execute(client);

    //Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the token ID from the receipt
    const tokenId = receipt.tokenId;

    console.error(`The HBARx token ID is ${tokenId}`);
    console.info(`0x${tokenId?.toEvmAddress()}`);
}

main().catch(err => {
    if (err instanceof AppError) {
        console.error(c.yellow(`${err}`));
        process.exitCode = 2;
    } else
        throw err;
}).finally(() => {
    log('Closing client connection');
    client.close();
});
