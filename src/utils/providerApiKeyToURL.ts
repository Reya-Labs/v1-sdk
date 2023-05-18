import { SupportedChainId } from '../types';

const providerApiKeyToURL = (
  chainId: SupportedChainId,
  alchemyApiKey: string,
  infuraApiKey: string,
): string => {
  switch (chainId) {
    case SupportedChainId.mainnet: {
      return `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
    }
    case SupportedChainId.goerli: {
      return `https://eth-goerli.g.alchemy.com/v2/${alchemyApiKey}`;
    }
    case SupportedChainId.arbitrum: {
      return `https://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
    }
    case SupportedChainId.arbitrumGoerli: {
      return `https://arb-goerli.g.alchemy.com/v2/${alchemyApiKey}`;
    }
    case SupportedChainId.avalanche: {
      return `https://avalanche-mainnet.infura.io/v3/${infuraApiKey}`;
    }
    case SupportedChainId.avalancheFuji: {
      return `https://avalanche-fuji.infura.io/v3/${infuraApiKey}`;
    }
    default: {
      throw new Error(`Unable to convert provider API Key into RPC URL for chain ID ${chainId}`);
    }
  }
};

export default providerApiKeyToURL;
