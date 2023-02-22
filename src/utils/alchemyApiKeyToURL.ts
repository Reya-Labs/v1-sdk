import { SupportedChainId } from '../types';

const alchemyApiKeyToURL = (chainId: SupportedChainId, apiKey: string): string => {
  switch (chainId) {
    case SupportedChainId.mainnet: {
      return `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
    }
    case SupportedChainId.goerli: {
      return `https://eth-goerli.g.alchemy.com/v2/${apiKey}`;
    }
    case SupportedChainId.arbitrum: {
      return `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
    }
    case SupportedChainId.arbitrumGoerli: {
      return `https://arb-goerli.g.alchemy.com/v2/${apiKey}`;
    }
    default: {
      throw new Error(`Unable to convert Alchemy API Key into RPC URL for chain ID ${chainId}`);
    }
  }
};

export default alchemyApiKeyToURL;