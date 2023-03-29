import { SubgraphURLEnum, SupportedChainId } from '../types';

const initSubgraphURLs = (
  chainId: SupportedChainId,
  apiKey?: string,
): { [key in SubgraphURLEnum]: string } => {
  switch (chainId) {
    case SupportedChainId.mainnet: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/mainnet-v1',
        [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]: `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/B4defqxwFvMHMgm5XuTzyYZyLXKhv7tbqbiDCcPLtGUq`,
        [SubgraphURLEnum.badgesRollingSeason]: `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/B4defqxwFvMHMgm5XuTzyYZyLXKhv7tbqbiDCcPLtGUq`,
        [SubgraphURLEnum.historicalRates]:
          'https://api.studio.thegraph.com/query/36721/voltz-historical-rates-mainnet/v0.0.7',
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
        [SubgraphURLEnum.historicalRates]:
          'https://api.studio.thegraph.com/query/36721/voltz-goerli-historical-rates/v0.0.2',
      };
    }
    case SupportedChainId.arbitrum: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/arbitrum-v1',
        [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]: '',
        [SubgraphURLEnum.badgesRollingSeason]: '',
        [SubgraphURLEnum.historicalRates]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/voltz-historical-rates-arb-one',
      };
    }
    case SupportedChainId.arbitrumGoerli: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/arbitrum-goerli-v1',
        [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]: '',
        [SubgraphURLEnum.badgesRollingSeason]: '',
        [SubgraphURLEnum.historicalRates]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/voltz-historical-rates-arbgrli',
      };
    }
    default: {
      throw new Error(`Unable to get subgraph URLs for chain ID ${chainId}`);
    }
  }
};

export default initSubgraphURLs;
