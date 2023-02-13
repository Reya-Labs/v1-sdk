import { SupportedChainId } from '../types';

export type ChainInfo = {
  readonly label: string;
  readonly nativeCurrency: {
    name: string; // e.g. 'Goerli ETH',
    symbol: string; // e.g. 'gorETH',
    decimals: number; // e.g. 18,
  };
  readonly explorer: string;
  readonly defaultRpcUrl: string;
};

const CHAIN_INFO: Record<SupportedChainId, ChainInfo> = {
  [SupportedChainId.mainnet]: {
    explorer: 'https://etherscan.io/',
    label: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    defaultRpcUrl: 'https://mainnet.infura.io/v3/',
  },
  [SupportedChainId.goerli]: {
    explorer: 'https://goerli.etherscan.io/',
    label: 'Görli',
    nativeCurrency: { name: 'Görli Ether', symbol: 'görETH', decimals: 18 },
    defaultRpcUrl: 'https://goerli.infura.io/v3/',
  },
  [SupportedChainId.arbitrum]: {
    explorer: 'https://arbiscan.io/',
    label: 'Arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    defaultRpcUrl: 'https://arbitrum-mainnet.infura.io',
  },
  [SupportedChainId.arbitrumGoerli]: {
    explorer: 'https://goerli.arbiscan.io/',
    label: 'Arbitrum Görli Testnet',
    nativeCurrency: { name: 'Görli Ether', symbol: 'görETH', decimals: 18 },
    defaultRpcUrl: 'https://goerli-rollup.arbitrum.io/rpc',
  },
};

export function getChainInfo(chainId: SupportedChainId): ChainInfo | undefined {
  if (chainId) {
    return CHAIN_INFO[chainId] ?? undefined;
  }
  return undefined;
}
