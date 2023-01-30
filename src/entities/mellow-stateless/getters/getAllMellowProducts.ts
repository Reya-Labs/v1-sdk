import { ethers } from 'ethers';
import { OptimiserInfo } from './types';
import { getOptimisersInfo } from './optimisers/getOptimisersInfo';
import { getVaultsInfo } from './vaults/getVaultsInfo';
import { ZERO_ADDRESS } from '../../../constants';

export const getAllMellowProducts = async (
  signer: ethers.Signer | null,
): Promise<OptimiserInfo[]> => {
  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;
  const vaults = await getVaultsInfo(userAddress);
  const optimisers = await getOptimisersInfo(signer);

  return vaults.concat(optimisers);
};
