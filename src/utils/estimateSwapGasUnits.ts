import { SupportedChainId } from '../types';

export function estimateSwapGasUnits(chainId: SupportedChainId): number {
  switch (chainId) {
    case SupportedChainId.mainnet:
    case SupportedChainId.goerli:
      return 550000;

    case SupportedChainId.arbitrum:
    case SupportedChainId.arbitrumGoerli:
      return 1500000;
  }
}
