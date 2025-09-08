#!/usr/bin/env node --env-file .env

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import * as sdk from '@hashgraph/sdk';
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Hbar,
  PrivateKey,
} from '@hashgraph/sdk';
import c from 'ansi-colors';

class AppError extends Error { }

console.log('Welcome to Stader HBARX staking CLI');

const client = Client.forNetwork({ '127.0.0.1:50211': '0.0.3' });
const tokenId = '0.0.834116';
const stakingContractId = '0.0.1060'; // https://hashscan.io/mainnet/contract/0.0.1027588 on mainnet
const undelegationContractId = '0.0.1027587'; // // https://hashscan.io/mainnet/contract/0.0.1027587 on mainnet

/**
 * 
 * @param {number} amount 
 * @param {string} stakingContractAddr 
 */
async function stake(amount, stakingContractAddr) {
  assert(stakingContractAddr.startsWith('0x') && stakingContractAddr.length === 42, 'Invalid staking contract address');

  console.log(`Staking with ${amount} HBAR`);
  const transaction = new ContractExecuteTransaction()
    // .setContractId(stakingContractId)
    .setContractId(`0.0.${stakingContractAddr.slice(2)}`)
    .setGas(2000000)
    .setPayableAmount(new Hbar(amount))
    .setFunction("stake");

  const txEx = await transaction.execute(client);
  const txExRx = await txEx.getRecord(client);

  const txId = txExRx.transactionId.toString().replace("0.0.", "").replace(/[@.]/g, "-");
  console.log(`Check you transaction at http://localhost:8080/localnet/transaction/0.0.${txId}`);

  if (txExRx.receipt.status.toString() === 'SUCCESS') {
    console.log(`You have successfully staked ${amount} HBAR`);
  } else {
    console.log(`Something went wrong. Please try again`);
  }
}

const unStake = async (amount) => {
  console.log(`unStaking with ${amount} HBARX`);
  const transaction = new ContractExecuteTransaction()
    .setContractId(stakingContractId)
    .setGas(2000000)
    .setFunction(
      "unStake",
      new ContractFunctionParameters().addUint256(amount * 10 ** 8)
    );

  const txEx = await transaction.execute(client);
  const txExRx = await txEx.getRecord(client);

  console.log(
    `Check you transaction at https://hashscan.io/#/${network}/transaction/0.0.${txExRx.transactionId
      .toString()
      .replace("0.0.", "")
      .replace(/[@.]/g, "-")}`
  );

  if (txExRx.receipt.status.toString() === "SUCCESS") {
    console.log(`You have successfully unStaked ${amount} HBARX`);
  } else {
    console.log(`Something went wrong. Please try again`);
  }
};

const withdraw = async (index) => {
  console.log(`withdrawing ${index} index`);
  const transaction = new ContractExecuteTransaction()
    .setContractId(undelegationContractId)
    .setGas(2000000)
    .setFunction(
      "withdraw",
      new ContractFunctionParameters().addUint256(index)
    );

  const txEx = await transaction.execute(client);
  const txExRx = await txEx.getRecord(client);

  console.log(
    `Check you transaction at https://hashscan.io/#/${network}/transaction/0.0.${txExRx.transactionId
      .toString()
      .replace("0.0.", "")
      .replace(/[@.]/g, "-")}`
  );

  if (txExRx.receipt.status.toString() === "SUCCESS") {
    console.log(`You have successfully withdrawn`);
  } else {
    console.log(`Something went wrong. Please try again`);
  }
};

const getExchangeRate = async () => {
  const transaction = new ContractExecuteTransaction()
    .setContractId(stakingContractId)
    .setGas(2000000)
    .setFunction("getExchangeRate");

  const txEx = await transaction.execute(client);
  const txExRx = await txEx.getRecord(client);
  const exchangeRate = txExRx.contractFunctionResult.getUint256(0) / 10 ** 8;
  if (txExRx.receipt.status.toString() === "SUCCESS") {
    console.log(`- Exchange Rate: ${exchangeRate}`);
  } else {
    console.log(`Something went wrong. Please try again`);
  }
};

const getUnbondingTime = async () => {
  const transaction = new ContractExecuteTransaction()
    .setContractId(stakingContractId)
    .setGas(2000000)
    .setFunction("unbondingTime");

  const txEx = await transaction.execute(client);
  const txExRx = await txEx.getRecord(client);
  const unbondingTime = txExRx.contractFunctionResult.getUint256(0);
  if (txExRx.receipt.status.toString() === "SUCCESS") {
    console.log(`- Unbonding Time: ${unbondingTime} seconds`);
  } else {
    console.log(`Something went wrong. Please try again`);
  }
};

const getBalance = async (operatorId) => {
  const query = new AccountBalanceQuery().setAccountId(operatorId);
  const accountBalance = await query.execute(client);
  console.log(
    `- Account balance: ${accountBalance.hbars.toBigNumber().toString()}`
  );

  if (accountBalance.tokens) {
    const tokens = accountBalance.tokens;
    const hbarX = tokens.get(tokenId);

    if (hbarX) {
      console.log(`- Current HBARX balance: ${hbarX.toNumber() / 10 ** 8}`);
    } else {
      console.log(`- Current HBARX balance: 0`);
    }
  }
};

async function main() {
  const cmd = process.argv[2];

  const accountId = process.env['USER_ID'];
  if (accountId === undefined)
    throw new AppError('Missing `USER_ID` environment variable');

  const privateKey = process.env['USER_PK'];
  if (privateKey === undefined)
    throw new AppError('Missing `USER_PK` environment variable');

  const operatorId = AccountId.fromString(accountId);
  const operatorKey = PrivateKey.fromStringECDSA(privateKey);
  client.setOperator(operatorId, operatorKey);

  const stakingContractAddr = readFileSync('./stakingContract.address', 'utf-8').trim();

  {
    const contractId = `0.0.${stakingContractAddr.slice(2)}`;
    const contractInfo = await new sdk.AccountInfoQuery()
        .setAccountId(contractId)
        .execute(client);
    console.info('Staking Contract Address', stakingContractAddr, '| ID', contractId, '| adminKey', contractInfo.key.toString());
    const k = new sdk.KeyList([operatorKey, contractInfo.key], 1);
    const transaction = new sdk.AccountUpdateTransaction()
      .setAccountId(accountId)
      .setKey(k)
      .freezeWith(client);
    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);
    console.info(c.cyan(`Key set up transaction http://localhost:8080/localnet/transaction/${response.transaction?.transactionId}`), '| Status', receipt.status.toString());
  }

  await getBalance(operatorId);
  await getExchangeRate();

  const amount = 10;

  if (cmd === 'stake') {
    await stake(amount, stakingContractAddr);
  } else if (cmd === 'unstake') {
    await unStake(amount);
  } else if (cmd === 'withdraw') {
    // "Whats the index of withdraw?(its from 0 to the number of time you unstaked -1, Please make sure you have unstaked and undelegate time has reached, its 24 hours) ",
    await withdraw(index);
  } else {
    console.log('invalid input');
  }

  await getBalance(operatorId);
};

main().finally(() => {
  client.close();
});
