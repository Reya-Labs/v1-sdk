import { getNetwork } from '../init';
import { SupportedNetworksEnum } from '../types';

const alchemyApiKeyToURL = (apiKey: string): string => {
  switch (getNetwork()) {
    case SupportedNetworksEnum.mainnet: {
      return `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
    }
    case SupportedNetworksEnum.goerli: {
      return `https://eth-goerli.g.alchemy.com/v2/${apiKey}`;
    }
    case SupportedNetworksEnum.arbitrum: {
      return `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
    }
    case SupportedNetworksEnum.arbitrumGoerli: {
      return `https://arb-goerli.g.alchemy.com/v2/${apiKey}`;
    }
    default: {
      throw new Error(
        `Unable to convert Alchemy API Key into RPC URL for chain ID ${getNetwork()}`,
      );
    }
  }
};

export default alchemyApiKeyToURL;
