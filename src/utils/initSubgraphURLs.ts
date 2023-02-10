import { SubgraphURLEnum, SupportedChainId } from '../types';

const initSubgraphURLs = (chainId: SupportedChainId): { [key in SubgraphURLEnum]: string } => {
  switch (chainId) {
    case SupportedChainId.mainnet: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/mainnet-v1',
      };
    }
    case SupportedChainId.goerli: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/voltz-goerli',
      };
    }
    case SupportedChainId.arbitrum: {
      return {
        [SubgraphURLEnum.voltzProtocol]: '',
      };
    }
    case SupportedChainId.arbitrumGoerli: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/arbitrum-goerli-v1',
      };
    }
    default: {
      throw new Error(`Unable to get subgraph URLs for chain ID ${chainId}`);
    }
  }
};

export default initSubgraphURLs;
