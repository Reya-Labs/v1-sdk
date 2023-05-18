import { ethers } from 'ethers';
import { ZERO_ADDRESS } from '../../../constants';
import { SupportedChainId } from '../../../types';
import { getOptimiserConfig } from '../utils/getOptimiserConfig';
import { getIndividualOptimiserInfo } from './optimisers/getIndividualOptimiserInfo';
import { OptimiserInfo } from './types';
import { getVaultInfo } from './vaults/getVaultInfo';

export const getMellowProduct = async ({
  optimiserId,
  signer,
  chainId,
  alchemyApiKey,
  infuraApiKey,
}: {
  optimiserId: string;
  signer: ethers.Signer | null;
  chainId: SupportedChainId;
  alchemyApiKey: string;
  infuraApiKey: string;
}): Promise<OptimiserInfo> => {
  const optimiserConfig = getOptimiserConfig(chainId, optimiserId);
  if (optimiserConfig.isVault) {
    const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;
    return getVaultInfo(
      optimiserConfig.optimiser,
      userAddress,
      chainId,
      alchemyApiKey,
      infuraApiKey,
    );
  }

  return getIndividualOptimiserInfo(
    optimiserConfig.optimiser,
    signer,
    chainId,
    alchemyApiKey,
    infuraApiKey,
  );
};
