import { getSentryTracker } from '../../../init';
import { validateWeights } from './validateWeights';

export const mapWeights = (
  optimiserVaultIds: string[],
  spareWeights: [string, number][],
): number[] => {
  const uniqueVaultIds = Array.from(new Set(spareWeights.map((w) => w[0])));

  if (uniqueVaultIds.length < spareWeights.length) {
    throw new Error('Duplicate vault ids in spare weights');
  }

  if (!uniqueVaultIds.every((id) => optimiserVaultIds.find((rootId) => rootId === id))) {
    throw new Error('Spare vault id not found');
  }

  const weights = optimiserVaultIds.map((optimiserVaultId) => {
    const weight = spareWeights.find((w) => w[0] === optimiserVaultId);
    return weight ? weight[1] : 0;
  });

  if (!validateWeights(weights)) {
    const errorMessage = 'Invalid weights';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  return weights;
};
