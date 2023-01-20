import { MellowRouter } from '../config/types';
import { validateWeights } from './validateWeights';

export const mapWeights = (
  routerConfig: MellowRouter,
  spareWeights: [string, number][],
): number[] => {
  const routerVaultIds = routerConfig.vaults.map((v) => v.address);
  const weights = routerVaultIds.map((routerVaultId) => {
    const weight = spareWeights.find((w) => w[0] === routerVaultId);
    return weight ? weight[1] : 0;
  });

  if (!validateWeights(weights)) {
    // TODO: add sentry
    throw new Error('Weights are invalid');
  }

  return weights;
};
