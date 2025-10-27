#!/usr/bin/env node --env-file .env

import { readFileSync } from 'node:fs';
import { debuglog } from 'node:util';

import * as sdk from '@hashgraph/sdk';
import c from 'ansi-colors';

const log = debuglog('set-token-key');

class AppError extends Error { }

const client = sdk.Client.forNetwork({ '127.0.0.1:50211': '0.0.3' });

/**
 * @param {string} idOrAliasOrEvmAddress 
 */
async function getAccountId(idOrAliasOrEvmAddress) {
    const response = await fetch(`http://localhost:8081/api/v1/accounts/${idOrAliasOrEvmAddress}`);
    return (await response.json()).account;
}

/**
 * @param {string} idOrAliasOrEvmAddress 
 */
async function getTokenId(idOrAliasOrEvmAddress) {
    const response = await fetch(`http://localhost:8081/api/v1/tokens/${idOrAliasOrEvmAddress}`);
    return (await response.json()).token_id;
}

async function main() {
    const { ACCOUNT_ID: accountId, PRIVATE_KEY: privateKey } = process.env;

    if (accountId === undefined || privateKey === undefined)
        throw new AppError('Environment variables `ACCOUNT_ID` and `PRIVATE_KEY` must be set');

    const operatorId = sdk.AccountId.fromString(accountId);
    const operatorKey = sdk.PrivateKey.fromStringECDSA(privateKey);
    client.setOperator(operatorId, operatorKey);

    const hbarxTokenAddr = readFileSync('./hbarxToken.address', 'utf-8').trim();
    const stakingContractAddr = readFileSync('./stakingContract.address', 'utf-8').trim();

    const tokenId = await getTokenId(hbarxTokenAddr);
    console.info('HBARx Token Address', hbarxTokenAddr, '| ID', tokenId);
    const contractId = await getAccountId(stakingContractAddr);
    const contractInfo = await new sdk.AccountInfoQuery()
        .setAccountId(contractId)
        .execute(client);
    console.info('Staking Contract Address', stakingContractAddr, '| ID', contractId, '| adminKey', contractInfo.key.toString());

    const k = new sdk.KeyList([operatorKey, contractInfo.key], 1);
    // let transaction = new sdk.TokenUpdateTransaction()
    //     .setTokenId(tokenId)
    //     .setMetadata(Buffer.from('HBARx Token Setup', 'utf-8'))
    //     .setSupplyKey(contractInfo.key)
    //     // .setAdminKey(contractInfo.key)
    //     .setAdminKey(k)
    //     .freezeWith(client);
    // transaction = await transaction.sign(operatorKey);
    // const response = await transaction.execute(client);
    // const receipt = await response.getReceipt(client);
    // console.info(c.cyan(`HBARx set up transaction http://localhost:8080/localnet/transaction/${response.transaction?.transactionId}`), '| Status', receipt.status.toString());

    // {
    //     let transaction = new sdk.TokenAssociateTransaction()
    //         .setTokenIds([tokenId])
    //         .setAccountId(contractId)
    //         .freezeWith(client);
    //     transaction = await transaction.sign(operatorKey);
    //     const response = await transaction.execute(client);
    //     const receipt = await response.getReceipt(client);
    //     console.info(c.cyan(`Assoc set up transaction http://localhost:8080/localnet/transaction/${response.transaction?.transactionId}`), '| Status', receipt.status.toString());
    // }

    {
        const transaction = new sdk.AccountUpdateTransaction()
            .setAccountId(accountId)
            .setKey(k)
            .freezeWith(client);
        const response = await transaction.execute(client);
        const receipt = await response.getReceipt(client);
        console.info(c.cyan(`Key set up transaction http://localhost:8080/localnet/transaction/${response.transaction?.transactionId}`), '| Status', receipt.status.toString());
    }
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
