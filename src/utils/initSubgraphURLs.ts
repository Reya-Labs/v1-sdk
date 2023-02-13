import { SubgraphURLEnum, SupportedChainId } from '../types';

const initSubgraphURLs = (chainId: SupportedChainId): { [key in SubgraphURLEnum]: string } => {
  switch (chainId) {
    case SupportedChainId.mainnet: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/mainnet-v1',
        [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]:
          'https://api.studio.thegraph.com/query/36721/main-v2-voltz-badges/v0.0.5',
        [SubgraphURLEnum.badgesRollingSeason]:
          'https://api.studio.thegraph.com/query/36721/main-v2-voltz-badges/v0.0.5',
      };
    }
    case SupportedChainId.goerli: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/voltz-goerli',
        [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/badges-goerli',
        [SubgraphURLEnum.badgesRollingSeason]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/badges-goerli',
      };
    }
    case SupportedChainId.arbitrum: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/arbitrum-v1',
        [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]: '',
        [SubgraphURLEnum.badgesRollingSeason]: '',
      };
    }
    case SupportedChainId.arbitrumGoerli: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/arbitrum-goerli-v1',
        [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]: '',
        [SubgraphURLEnum.badgesRollingSeason]: '',
      };
    }
    default: {
      throw new Error(`Unable to get subgraph URLs for chain ID ${chainId}`);
    }
  }
};

export default initSubgraphURLs;
