// SPDX-License-Identifier: Apache-2.0

import * as dotenv from 'dotenv';

dotenv.config();

/**  @type string */
export const OPERATOR_ID_A: string = process.env.OPERATOR_ID_A || '0.0.0';

/**  @type string */
export const OPERATOR_KEY_A: string = process.env.OPERATOR_KEY_A || '0.0.0';

export const PRIVATE_KEYS: string[] = process.env.PRIVATE_KEYS
  ? process.env.PRIVATE_KEYS.split(',').map((key) => key.trim())
  : [];

export const NETWORKS = {
  local: {
    name: 'local',
    url: 'http://localhost:7546',
    chainId: 298,
    networkNodeUrl: '127.0.0.1:50211',
    nodeId: '3',
    mirrorNode: 'http://127.0.0.1:5600',
  },
  testnet: {
    name: 'testnet',
    url: 'https://testnet.hashio.io/api',
    chainId: 296,
    networkNodeUrl: '0.testnet.hedera.com:50211',
    nodeId: '3',
    mirrorNode: 'testnet.mirrornode.hedera.com:443',
  },
  previewnet: {
    name: 'previewnet',
    url: 'https://previewnet.hashio.io/api',
    chainId: 297,
    networkNodeUrl: '0.previewnet.hedera.com:50211',
    nodeId: '3',
    mirrorNode: 'previewnet.mirrornode.hedera.com:443',
  },
  besu: {
    name: 'besu_local',
    url: 'http://127.0.0.1:8540',
    chainId: 1337,
    allowUnlimitedContractSize: true,
    blockGasLimit: 0x1fffffffffffff,
    gas: 1000000000,
    timeout: 60000,
  },
};
