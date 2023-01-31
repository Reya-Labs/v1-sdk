import { ethers } from 'ethers';
import { OptimiserInfo } from './types';
import { getOptimisersInfo } from './optimisers/getOptimisersInfo';
import { getVaultsInfo } from './vaults/getVaultsInfo';
import { ZERO_ADDRESS } from '../../../constants';

export const getAllMellowProducts = async (
  signer: ethers.Signer | null,
  type: 'all' | 'active' = 'all',
): Promise<OptimiserInfo[]> => {
  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;
  const vaults = await getVaultsInfo(userAddress, type);
  const optimisers = await getOptimisersInfo(signer, type);

  return vaults.concat(optimisers);
};
