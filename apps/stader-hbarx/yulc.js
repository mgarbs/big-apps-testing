#!/usr/bin/env node

import { readFileSync } from 'node:fs';

import solc from 'solc';

/**
 *
 * See https://docs.soliditylang.org/en/latest/yul.html#stand-alone-usage.
 *
 * @param {string} yulFile 
 */
function main(yulFile) {
    const input = {
        language: 'Yul',
        sources: {
            [yulFile]: {
                content: readFileSync(yulFile, 'utf-8'),
            },
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['evm.bytecode.object'],
                },
            },
        },
    };

    const { errors, contracts } = JSON.parse(solc.compile(JSON.stringify(input)));

    if (errors !== undefined && errors.length > 0) {
        console.error('Compilation errors');
        errors.forEach((/** @type {unknown} */ err) => {
            console.error(err);
        });

        process.exit(1);
    }

    const contract = Object.values(contracts[yulFile])[0];
    console.info(contract.evm.bytecode.object);
}

const yulFile = process.argv[2];
if (yulFile === undefined) {
    throw new Error('Yul file path must be specified');
}

main(yulFile);
