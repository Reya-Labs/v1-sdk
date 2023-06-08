import { providers } from 'ethers';
import { getSentryTracker } from '../init';
import { SupportedChainId } from '../types';

const CHAIN_TOKEN_MAP: Record<SupportedChainId, 'ETH' | 'AVAX'> = {
  [SupportedChainId.mainnet]: 'ETH',
  [SupportedChainId.goerli]: 'ETH',
  [SupportedChainId.arbitrum]: 'ETH',
  [SupportedChainId.arbitrumGoerli]: 'ETH',
  [SupportedChainId.avalanche]: 'AVAX',
  [SupportedChainId.avalancheFuji]: 'AVAX',
  // TODO: Alex fix spruce
  [SupportedChainId.spruce]: 'AVAX',
};
export async function getNativeToken(provider: providers.Provider): Promise<'ETH' | 'AVAX'> {
  let chainId: SupportedChainId | null = null;

  const attempts = 5;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      chainId = (await provider.getNetwork()).chainId as SupportedChainId;
      break;
    } catch (error) {
      if (attempt + 1 === attempts) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Unable to provider.getNetwork after 5 attempts');
      }
    }
  }

  if (!chainId) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('Cannot detect chain id');
    throw Error('Cannot detect chain id');
  }

  if (CHAIN_TOKEN_MAP[chainId]) {
    return CHAIN_TOKEN_MAP[chainId];
  }

  throw Error(`Unsupported chain id ${chainId}`);
}
