import { ethers } from 'ethers';
import { ZERO_ADDRESS } from '../../../constants';
import { getOptimiserConfig } from '../utils/getOptimiserConfig';
import { getIndividualOptimiserInfo } from './optimisers/getIndividualOptimiserInfo';
import { OptimiserInfo } from './types';
import { getVaultInfo } from './vaults/getVaultInfo';

export const getMellowProduct = async ({
  optimiserId,
  signer,
}: {
  optimiserId: string;
  signer: ethers.Signer | null;
}): Promise<OptimiserInfo> => {
  const optimiserConfig = getOptimiserConfig(optimiserId);
  if (optimiserConfig.isVault) {
    const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;
    return getVaultInfo(optimiserConfig.optimiser, userAddress);
  }

  return getIndividualOptimiserInfo(optimiserConfig.optimiser, signer);
};