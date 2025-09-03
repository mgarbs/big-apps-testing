#!/usr/bin/env node

import { parseArgs } from 'node:util';

import c from 'ansi-colors';

class AppError extends Error { }

/**
 * @type {{ [network: string]: string }}
 */
const mirrorNodeConfig = {
    mainnet: 'https://mainnet.mirrornode.hedera.com',
    testnet: 'https://testnet.mirrornode.hedera.com',
    solo: 'http://localhost:8081',
    local: 'http://localhost:5551',
};

/**
 * @param {string} mirrorNodeUrl
 * @param {string} endpoint
 * @param {string} accumProp
 * @param {any[]} data
 */
async function fetchEndpoint(mirrorNodeUrl, endpoint, accumProp, data = []) {
    const response = await fetch(mirrorNodeUrl + endpoint);

    if (response.status !== 200) 
        throw new AppError(`Failed to fetch data from Mirror Node (${response.status} ${response.statusText}): ${await response.text()}`);

    const result = await response.json();
    data.push(...result[accumProp]);
    if (result.links.next !== null)
        return fetchEndpoint(mirrorNodeUrl, result.links.next, accumProp, data);

    return data;
}

/**
 * @param {string} mirrorNodeUrl
 * @param {string} contractIdOrAddress
 */
function fetchContractState(mirrorNodeUrl, contractIdOrAddress) {
    return fetchEndpoint(mirrorNodeUrl, `/api/v1/contracts/${contractIdOrAddress}/state`, 'state');
}

async function main() {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: {
            network: {
                type: 'string',
                short: 'n',
                default: 'solo',
            },
            yul: {
                type: 'boolean',
                short: 'y',
                default: false,
            },
        },
    });

    const [contractAddress] = positionals;
    if (contractAddress === undefined)
        throw new AppError('Missing contract address');
    if (positionals.length > 1)
        throw new AppError(`Too many positional arguments: ${positionals.slice(1).join(', ')}`);
    const mirrorNodeUrl = mirrorNodeConfig[values.network] ?? values.network;

    const state = await fetchContractState(mirrorNodeUrl, contractAddress);
    if (state.length === 0)
        throw new AppError(`No storage entries found for contract \`${contractAddress}\` on network ${mirrorNodeUrl}`);

    if (values.yul) {
        console.info(`// ${state.length} entries found`);
        for (const entry of state) {
            console.info(`sstore(${entry.slot}, ${entry.value})`);
        }
    } else {
        console.info(state);
    }
}

try {
    await main();
} catch (err) {
    if (err instanceof AppError) {
        console.error(c.yellow(err.message));
        process.exit(2);
    }

    throw err;
}
