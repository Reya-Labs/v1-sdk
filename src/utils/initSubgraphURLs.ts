import { getNetwork } from '../init';
import { SubgraphURLEnum, SupportedNetworksEnum } from '../types';

const initSubgraphURLs = (): { [key in SubgraphURLEnum]: string } => {
  switch (getNetwork()) {
    case SupportedNetworksEnum.mainnet: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/mainnet-v1',
      };
    }
    case SupportedNetworksEnum.goerli: {
      return {
        [SubgraphURLEnum.voltzProtocol]:
          'https://api.thegraph.com/subgraphs/name/voltzprotocol/voltz-goerli',
      };
    }
    case SupportedNetworksEnum.arbitrum: {
      return {
        [SubgraphURLEnum.voltzProtocol]: '',
      };
    }
    case SupportedNetworksEnum.arbitrumGoerli: {
      return {
        [SubgraphURLEnum.voltzProtocol]: '',
      };
    }
    default: {
      throw new Error(`Unable to get subgraph URLs for chain ID ${getNetwork()}`);
    }
  }
};

export default initSubgraphURLs;
