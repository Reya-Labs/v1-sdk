import { ZERO_ADDRESS } from '../../../constants';
import { getOptimiserConfig } from '../utils/getOptimiserConfig';
import { getOptimiserInfo } from './optimisers/getOptimiserInfo';
import { OptimiserInfo } from './types';
import { getVaultInfo } from './vaults/getVaultInfo';

export const getMellowProduct = async ({
  optimiserId,
  userAddress = ZERO_ADDRESS,
}: {
  optimiserId: string;
  userAddress: string;
}): Promise<OptimiserInfo> => {
  const optimiserConfig = getOptimiserConfig(optimiserId);
  if (optimiserConfig.isVault) {
    return getVaultInfo(optimiserConfig.optimiser, userAddress);
  }

  return getOptimiserInfo(optimiserConfig.optimiser, userAddress);
};
