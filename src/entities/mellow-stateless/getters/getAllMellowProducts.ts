import { ZERO_ADDRESS } from '../../../constants';
import { RouterInfo } from './types';
import { getOptimisersInfo } from './optimisers/getOptimisersInfo';
import { getVaultsInfo } from './vaults/getVaultsInfo';

export const getAllMellowProducts = async (userAddress = ZERO_ADDRESS): Promise<RouterInfo[]> => {
  const vaults = await getVaultsInfo(userAddress);
  const routers = await getOptimisersInfo(userAddress);

  return vaults.concat(routers);
};
