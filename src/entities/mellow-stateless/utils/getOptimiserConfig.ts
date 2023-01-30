import { getSentryTracker } from '../../../init';
import { getMellowConfig } from '../config/config';
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
