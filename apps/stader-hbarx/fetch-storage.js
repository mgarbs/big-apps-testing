#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { debuglog, parseArgs } from 'node:util';

import c from 'ansi-colors';

const log = debuglog('fetch-storage');

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

class MirrorNodeClient {

    /**
     * @param {string} url
     */
    constructor(url) {
        this.url = url;
    }

    /**
     * @param {string} blockHashOrNumber 
     */
    fetchBlock(blockHashOrNumber) {
        return this.#fetch(`/api/v1/blocks/${blockHashOrNumber}`);
    }

    /**
     * @param {string} contractIdOrAddress
     * @param {string=} timestamp
     */
    fetchContractState(contractIdOrAddress, timestamp) {
        return this.#fetchNext(`/api/v1/contracts/${contractIdOrAddress}/state${searchParams({ timestamp })}`, 'state');
    }

    /**
     * @param {string} endpoint
     * @param {string} accumProp
     * @param {any[]} data
     * @return {Promise<any[]>}
     */
    async #fetchNext(endpoint, accumProp, data = []) {
        const result = await this.#fetch(endpoint);
        data.push(...result[accumProp]);
        if (result.links.next !== null)
            return this.#fetchNext(result.links.next, accumProp, data);

        return data;
    }

    /**
     * @param {string} endpoint 
     */
    async #fetch(endpoint) {
        const reqId = randomUUID()
        log('[%s] Fetching from %s', reqId, this.url + endpoint);
        const response = await fetch(this.url + endpoint);

        if (response.status !== 200)
            throw new AppError(`Failed to fetch data from Mirror Node (${response.status} ${response.statusText}): ${await response.text()}`);

        const value = await response.json();
        log('[%s] Response data: %o', reqId, value);
        return value;
    }
}

/**
 * 
 * @param {{[param: string]: string | undefined}} params
 */
function searchParams(params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            searchParams.append(key, value);
        }
    }
    const queryString = searchParams.toString();
    return queryString !== '' ? `?${queryString}` : '';
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
            block: {
                type: 'string',
                short: 'b',
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

    const mirrorNodeClient = new MirrorNodeClient(mirrorNodeConfig[values.network] ?? values.network);

    const timestamp = values.block !== undefined
        ? (await mirrorNodeClient.fetchBlock(values.block)).timestamp.from
        : undefined;

    const state = await mirrorNodeClient.fetchContractState(contractAddress, timestamp);
    if (state.length === 0)
        throw new AppError(`No storage entries found for contract \`${contractAddress}\` on network ${mirrorNodeClient.url}`);

    if (values.yul) {
        console.info(`// ${state.length} entries found`);
        for (const entry of state) {
            console.info(`sstore(${entry.slot}, ${entry.value})`);
        }
    } else {
        console.info(state);
    }
}

main().catch(err => {
    if (err instanceof AppError) {
        console.error(c.yellow(`${err}`));
        process.exitCode = 2;
    } else
        throw err;
});
