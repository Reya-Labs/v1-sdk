import { getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';
import { getMellowConfig } from '../config/config';
import { OptimiserConfig } from '../config/types';

export const getOptimiserConfig = (
  chainId: SupportedChainId,
  optimiserId: string,
): OptimiserConfig => {
  const config = getMellowConfig(chainId);

  const optimiserConfig = config.MELLOW_OPTIMISERS.find(
    (item) => item.optimiser.toLowerCase() === optimiserId.toLowerCase(),
  );

  if (!optimiserConfig) {
    const errorMessage = 'Optimiser ID not found';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  return optimiserConfig;
};
