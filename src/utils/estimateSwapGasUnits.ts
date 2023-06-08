import { SupportedChainId } from '../types';

const CHAIN_SWAP_GAS_UNITS_MAP: Record<SupportedChainId, number> = {
  [SupportedChainId.mainnet]: 550000,
  [SupportedChainId.goerli]: 550000,
  [SupportedChainId.arbitrum]: 1500000,
  [SupportedChainId.arbitrumGoerli]: 1500000,
  [SupportedChainId.avalanche]: 650000,
  [SupportedChainId.avalancheFuji]: 650000,
  // TODO: Alex fix spruce
  [SupportedChainId.spruce]: -1,
};

export function estimateSwapGasUnits(chainId: SupportedChainId): number {
  return CHAIN_SWAP_GAS_UNITS_MAP[chainId] || -1;
}
