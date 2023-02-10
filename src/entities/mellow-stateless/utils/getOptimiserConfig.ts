import { getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';
import { getMellowConfig, getMellowConfigV1 } from '../config/config';
import { OptimiserConfig } from '../config/types';

export const getOptimiserConfig = (optimiserId: string): OptimiserConfig => {
  const config = getMellowConfig();

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

export const getOptimiserConfigV1 = (
  chainId: SupportedChainId,
  optimiserId: string,
): OptimiserConfig => {
  const config = getMellowConfigV1(chainId);

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
