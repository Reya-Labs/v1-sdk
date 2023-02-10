import { getNetwork } from '../init';
import { SubgraphURLEnum, SupportedChainId } from '../types';

const initSubgraphURLs = (): { [key in SubgraphURLEnum]: string } => {
  switch (getNetwork()) {
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
        [SubgraphURLEnum.voltzProtocol]: '',
      };
    }
    default: {
      throw new Error(`Unable to get subgraph URLs for chain ID ${getNetwork()}`);
    }
  }
};

export default initSubgraphURLs;
