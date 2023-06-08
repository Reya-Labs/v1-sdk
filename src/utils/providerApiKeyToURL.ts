import { SupportedChainId } from '../types';

const CHAIN_PROVIDER_MAP: Record<SupportedChainId, string> = {
  [SupportedChainId.mainnet]: 'https://eth-mainnet.g.alchemy.com/v2',
  [SupportedChainId.goerli]: 'https://eth-goerli.g.alchemy.com/v2',
  [SupportedChainId.arbitrum]: 'https://arb-mainnet.g.alchemy.com/v2',
  [SupportedChainId.arbitrumGoerli]: 'https://arb-goerli.g.alchemy.com/v2',
  [SupportedChainId.avalanche]: 'https://avalanche-mainnet.infura.io/v3',
  [SupportedChainId.avalancheFuji]: 'https://avalanche-fuji.infura.io/v3',
  // TODO: Alex fix spruce
  [SupportedChainId.spruce]: '',
};

const providerApiKeyToURL = (
  chainId: SupportedChainId,
  alchemyApiKey: string,
  infuraApiKey: string,
): string => {
  const config = CHAIN_PROVIDER_MAP[chainId];
  if (!config) {
    throw new Error(`Unable to convert provider API Key into RPC URL for chain ID ${chainId}`);
  }
  if (config.indexOf('infura') !== -1) {
    return `${config}/${infuraApiKey}`;
  }
  if (config.indexOf('alchemy') !== -1) {
    return `${config}/${alchemyApiKey}`;
  }
  throw new Error(`Unable to convert provider API Key into RPC URL for chain ID ${chainId}`);
};

export default providerApiKeyToURL;
