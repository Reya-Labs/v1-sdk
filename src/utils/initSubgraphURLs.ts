import { SubgraphURLEnum, SupportedChainId } from '../types';

const CHAIN_SUBGRAPH_URL_MAP: Record<SupportedChainId, { [key in SubgraphURLEnum]: string }> = {
  [SupportedChainId.mainnet]: {
    [SubgraphURLEnum.voltzProtocol]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/mainnet-v1',
    [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/main-badges-season-3-mainnet',
    [SubgraphURLEnum.badgesRollingSeason]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/main-badges-season-3-mainnet',
  },
  [SupportedChainId.goerli]: {
    [SubgraphURLEnum.voltzProtocol]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/voltz-goerli',
    [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/badges-goerli',
    [SubgraphURLEnum.badgesRollingSeason]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/badges-goerli',
  },
  [SupportedChainId.arbitrum]: {
    [SubgraphURLEnum.voltzProtocol]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/arbitrum-v1',
    [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/main-badges-season-3-arbitrum',
    [SubgraphURLEnum.badgesRollingSeason]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/main-badges-season-3-arbitrum',
  },
  [SupportedChainId.arbitrumGoerli]: {
    [SubgraphURLEnum.voltzProtocol]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/arbitrum-goerli-v1',
    [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]: '',
    [SubgraphURLEnum.badgesRollingSeason]: '',
  },
  [SupportedChainId.avalanche]: {
    [SubgraphURLEnum.voltzProtocol]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/avalanche-v1',
    [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]: '',
    [SubgraphURLEnum.badgesRollingSeason]: '',
  },
  [SupportedChainId.avalancheFuji]: {
    [SubgraphURLEnum.voltzProtocol]:
      'https://api.thegraph.com/subgraphs/name/voltzprotocol/ava-fuji-v1',
    [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]: '',
    [SubgraphURLEnum.badgesRollingSeason]: '',
  },
  [SupportedChainId.spruce]: {
    [SubgraphURLEnum.voltzProtocol]: '', // subgraph does not have support for spruce
    [SubgraphURLEnum.badgesCurrentSeasonNoIPFS]: '',
    [SubgraphURLEnum.badgesRollingSeason]: '',
  },
};
const initSubgraphURLs = (chainId: SupportedChainId): { [key in SubgraphURLEnum]: string } => {
  const config = CHAIN_SUBGRAPH_URL_MAP[chainId];
  if (!config) {
    throw new Error(`Unable to get subgraph URLs for chain ID ${chainId}`);
  }
  return config;
};

export default initSubgraphURLs;
