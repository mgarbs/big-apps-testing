import 'hardhat/types/config';

declare module 'hardhat/types/config' {
  export interface NetworkUserConfig {
    /**
     * Custom Hedera SDK client config for HAPI calls
     */
    sdkClient?: {
      operatorId: string;
      operatorKey: string;
      networkNodeUrl: string;
      nodeId: string;
      mirrorNode: string;
    };
  }
}
