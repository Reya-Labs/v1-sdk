import { getMellowConfig } from '../config/config';
import { MellowOptimiser } from '../config/types';

export const getOptimiserConfig = (optimiserId: string): MellowOptimiser => {
  const config = getMellowConfig();

  const optimiserConfig = config.MELLOW_OPTIMISERS.find(
    (item) => item.optimiser.toLowerCase() === optimiserId.toLowerCase(),
  );

  if (!optimiserConfig) {
    // TODO: add sentry
    throw new Error('Optimiser ID not found');
  }

  return optimiserConfig;
};
