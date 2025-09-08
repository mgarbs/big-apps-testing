#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { debuglog, parseArgs } from 'node:util';

import c from 'ansi-colors';

const log = debuglog('fetch-storage');

class AppError extends Error { }

class MirrorNodeClient {

    /**
     * @type {{ [network: string]: string }}
     */
    static #config = {
        mainnet: 'https://mainnet.mirrornode.hedera.com',
        testnet: 'https://testnet.mirrornode.hedera.com',
        solo: 'http://localhost:8081',
        local: 'http://localhost:5551',
    };

    /**
     * @param {string} urlOrNetwork
     */
    constructor(urlOrNetwork) {
        this.baseUrl = new URL(MirrorNodeClient.#config[urlOrNetwork] || urlOrNetwork);
    }

    /**
     * @param {string} blockHashOrNumber 
     */
    getBlock(blockHashOrNumber) {
        return this.#get(`/api/v1/blocks/${blockHashOrNumber}`);
    }

    /**
     * @param {string} contractIdOrAddress
     * @param {string=} timestamp
     */
    getContractState(contractIdOrAddress, timestamp) {
        return this.#getNext(`/api/v1/contracts/${contractIdOrAddress}/state`, { timestamp }, 'state');
    }

    /**
     * @param {string} endpoint
     * @param {{[param: string]: string | undefined}} params
     * @param {string} accumProp
     */
    async #getNext(endpoint, params, accumProp) {
        const data = [];
        for (let result = await this.#get(endpoint, params); ; result = await this.#get(result.links.next)) {
            data.push(...result[accumProp]);
            if (result.links.next === null) break;
        }
        return data;
    }

    /**
     * @param {string} endpoint
     * @param {{[param: string]: string | undefined}} params
     */
    async #get(endpoint, params = {}) {
        const url = new URL(endpoint, this.baseUrl);
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined)
                url.searchParams.append(key, value);
        }

        const reqId = randomUUID()
        log('[%s] Fetching from %s', reqId, url);
        const response = await fetch(url);

        if (response.status !== 200)
            throw new AppError(`Failed to fetch data from Mirror Node (${response.status} ${response.statusText}): ${await response.text()}`);

        const value = await response.json();
        log('[%s] Response data: %O', reqId, value);
        return value;
    }
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

    const mirrorNodeClient = new MirrorNodeClient(values.network);

    const timestamp = values.block !== undefined
        ? (await mirrorNodeClient.getBlock(values.block)).timestamp.from
        : undefined;

    const state = await mirrorNodeClient.getContractState(contractAddress, timestamp);
    if (state.length === 0)
        throw new AppError(`No storage entries found for contract \`${contractAddress}\` on network ${mirrorNodeClient.baseUrl}`);

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
