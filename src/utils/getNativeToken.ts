import { providers } from 'ethers';
import { getSentryTracker } from '../init';
import { SupportedChainId } from '../types';

export async function getNativeToken(provider: providers.Provider): Promise<'ETH' | 'AVAX'> {
  let chainId = 0;

  const attempts = 5;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      chainId = (await provider.getNetwork()).chainId;
      break;
    } catch (error) {
      if (attempt + 1 === attempts) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Unable to fetch gas price after 5 attempts');
      }
    }
  }

  switch (chainId) {
    case SupportedChainId.mainnet:
    case SupportedChainId.goerli:
    case SupportedChainId.arbitrum:
    case SupportedChainId.arbitrumGoerli:
      return 'ETH';

    case SupportedChainId.avalanche:
    case SupportedChainId.avalancheFuji:
      return 'AVAX';

    default:
      throw Error(`Unsupported chain id ${chainId}`);
  }
}
