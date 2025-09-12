import hre from 'hardhat';
import { ethers } from 'hardhat';
import {
  Client,
  AccountInfoQuery,
  AccountId,
  PrivateKey,
  KeyList,
  ContractId,
  TokenId,
  TokenUpdateTransaction,
  AccountUpdateTransaction
} from '@hashgraph/sdk';

/**
 * Utility functions for interacting with Hedera via HAPI and EVM.
 */
export default class Utils {
  /**
   * Creates a Hedera SDK Client for HAPI calls.
   * @param operatorId Optional operator account ID (string).
   * @param operatorKey Optional operator private key (hex string).
   */
  static async createSDKClient(
    operatorId?: string,
    operatorKey?: PrivateKey
  ): Promise<Client> {
    const network = hre.network.name;
    const sdkConfig = (hre.config.networks[network] as any).sdkClient;

    const hederaNetwork: any = {};
    hederaNetwork[sdkConfig.networkNodeUrl] =
      AccountId.fromString(sdkConfig.nodeId);
    const { mirrorNode } = sdkConfig;

    const client = Client.forNetwork(hederaNetwork).setMirrorNetwork(
      mirrorNode
    );

    const opId = operatorId || sdkConfig.operatorId;
    const opKey = operatorKey || sdkConfig.operatorKey;
    client.setOperator(opId, opKey);
    return client;
  }

  /**
   * Returns the raw private keys for Hardhat signers.
   * @param add0xPrefix Whether to include 0x prefix. Defaults to true.
   */
  static async getHardhatSignersPrivateKeys(
    add0xPrefix = true
  ): Promise<string[]> {
    const network = hre.network.name;
    const accounts: string[] = (hre.config.networks[network].accounts as any) as string[];
    return add0xPrefix
      ? accounts
      : accounts.map((pk) => pk.replace(/^0x/, ''));
  }

  /**
   * Fetches the Hedera account ID (string) corresponding to an EVM address.
   */
  static async getAccountId(
    evmAddress: string,
    client: Client
  ): Promise<string> {
    const query = new AccountInfoQuery().setAccountId(
      AccountId.fromEvmAddress(0, 0, evmAddress)
    );
    const info = await query.execute(client);
    return info.accountId.toString();
  }

  /**
   * Updates token keys via HAPI (Hedera Account Service).
   */
  static async updateTokenKeysViaHapi(
    tokenAddress: string,
    contractAddresses: string[],
    setAdmin = true,
    setPause = true,
    setKyc = true,
    setFreeze = true,
    setSupply = true,
    setWipe = true,
    setFeeSchedule = true
  ): Promise<void> {
    // Get EVM signers for signing HAPI transactions
    const signers = await ethers.getSigners();
    // Create a client with the genesis (operator)
    const clientGenesis = await Utils.createSDKClient();
    // Fetch ECDSA keys for each signer
    const rawKeys = await Utils.getHardhatSignersPrivateKeys(false);
    const pkSigners = rawKeys.map((pk) => PrivateKey.fromStringECDSA(pk));

    // Derive HAPI account ID and client for signer 0
    const accountIdSigner0 = await Utils.getAccountId(
      signers[0].address,
      clientGenesis
    );
    const clientSigner0 = await Utils.createSDKClient(
      accountIdSigner0,
      pkSigners[0].toString()
    );

    // Build a KeyList including all signers and contracts
    const allKeys = [
      ...pkSigners.map((key) => key.publicKey),
      ...contractAddresses.map((addr) =>
        ContractId.fromEvmAddress(0, 0, addr)
      )
    ];
    const keyList = new KeyList(allKeys, 1);

    // Construct the TokenUpdateTransaction
    let tx = new TokenUpdateTransaction().setTokenId(
      TokenId.fromSolidityAddress(tokenAddress)
    );
    if (setAdmin) tx = tx.setAdminKey(keyList);
    if (setPause) tx = tx.setPauseKey(keyList);
    if (setKyc) tx = tx.setKycKey(keyList);
    if (setFreeze) tx = tx.setFreezeKey(keyList);
    if (setSupply) tx = tx.setSupplyKey(keyList);
    if (setWipe) tx = tx.setWipeKey(keyList);
    if (setFeeSchedule) tx = tx.setFeeScheduleKey(keyList);

    // Freeze, sign, and execute
    const signed = await tx.freezeWith(clientSigner0).sign(
      pkSigners[0]
    );
    await signed.execute(clientSigner0);
  }

  static async updateAccountKeysViaHapi(
    contractAddresses: string[],
    ecdsaPrivateKeys: string[] = []
  ): Promise<void> {
    const clientGenesis = await Utils.createSDKClient();

    if (!ecdsaPrivateKeys.length) {
      ecdsaPrivateKeys = await this.getHardhatSignersPrivateKeys(false);
    }

    for (const privateKey of ecdsaPrivateKeys) {
      const pkSigner = PrivateKey.fromStringECDSA(privateKey.replace('0x', ''));

      const accountId = await Utils.getAccountId(
        pkSigner.publicKey.toEvmAddress(),
        clientGenesis
      );
  
      const clientSigner = await Utils.createSDKClient(accountId, pkSigner);

      const keyList = new KeyList(
        [
          pkSigner.publicKey,
          ...contractAddresses.map((address: string) =>
            ContractId.fromEvmAddress(0, 0, address)
          ),
        ],
        1
      );

      try{ 
        
         const tx =  await new AccountUpdateTransaction()
            .setAccountId(accountId)
            .setKey(keyList)
            .freezeWith(clientSigner)
            .sign(pkSigner)
          const tx2 = await tx.execute(clientSigner)
          await tx2.getReceipt(clientSigner)
      } catch(e) {
        console.log(e)
      }
      
    }
  }

  static createSalt(tokenA: string, tokenB: string): string {
    return ethers.keccak256(ethers.solidityPacked(["address", "address"], [tokenA, tokenB]))
  }

  static calculateCreate2Address(address: string, salt: string, initCode: string) {
    const pairAddress = ethers.getCreate2Address(address, salt, initCode)
    return pairAddress;
  }
}
