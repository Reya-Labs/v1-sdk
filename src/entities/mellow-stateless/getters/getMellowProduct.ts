import { ethers } from 'ethers';
import { ZERO_ADDRESS } from '../../../constants';
import { SupportedChainId } from '../../../types';
import { getOptimiserConfig, getOptimiserConfigV1 } from '../utils/getOptimiserConfig';
import {
  getIndividualOptimiserInfo,
  getIndividualOptimiserInfoV1,
} from './optimisers/getIndividualOptimiserInfo';
import { OptimiserInfo } from './types';
import { getVaultInfo, getVaultInfoV1 } from './vaults/getVaultInfo';

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

export const getMellowProductV1 = async ({
  optimiserId,
  signer,
  chainId,
  alchemyApiKey,
}: {
  optimiserId: string;
  signer: ethers.Signer | null;
  chainId: SupportedChainId;
  alchemyApiKey: string;
}): Promise<OptimiserInfo> => {
  const optimiserConfig = getOptimiserConfigV1(chainId, optimiserId);
  if (optimiserConfig.isVault) {
    const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;
    return getVaultInfoV1(optimiserConfig.optimiser, userAddress, chainId, alchemyApiKey);
  }

  return getIndividualOptimiserInfoV1(optimiserConfig.optimiser, signer, chainId, alchemyApiKey);
};
