import { ZERO_ADDRESS } from '../../../constants';
import { OptimiserInfo } from './types';
import { getOptimisersInfo } from './optimisers/getOptimisersInfo';
import { getVaultsInfo } from './vaults/getVaultsInfo';

export const getAllMellowProducts = async (
  userAddress = ZERO_ADDRESS,
): Promise<OptimiserInfo[]> => {
  const vaults = await getVaultsInfo(userAddress);
  const optimisers = await getOptimisersInfo(userAddress);

  return vaults.concat(optimisers);
};
