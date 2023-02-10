import { ethers } from 'ethers';
import { OptimiserInfo } from './types';
import { getOptimisersInfo, getOptimisersInfoV1 } from './optimisers/getOptimisersInfo';
import { getVaultsInfo, getVaultsInfoV1 } from './vaults/getVaultsInfo';
import { ZERO_ADDRESS } from '../../../constants';
import { SupportedChainId } from '../../../types';

export const getAllMellowProducts = async (
  signer: ethers.Signer | null,
  type: 'all' | 'active' = 'all',
): Promise<OptimiserInfo[]> => {
  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;
  const vaults = await getVaultsInfo(userAddress, type);
  const optimisers = await getOptimisersInfo(signer, type);

  return vaults.concat(optimisers);
};

export const getAllMellowProductsV1 = async (
  signer: ethers.Signer | null,
  type: 'all' | 'active' = 'all',
  chainId: SupportedChainId,
  alchemyApiKey: string,
): Promise<OptimiserInfo[]> => {
  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;
  const vaults = await getVaultsInfoV1(userAddress, type, chainId, alchemyApiKey);
  const optimisers = await getOptimisersInfoV1(signer, type, chainId, alchemyApiKey);

  return vaults.concat(optimisers);
};
