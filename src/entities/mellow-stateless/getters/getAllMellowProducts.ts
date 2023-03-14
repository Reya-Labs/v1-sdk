import { ethers } from 'ethers';
import { OptimiserInfo } from './types';
import { getOptimisersInfo } from './optimisers/getOptimisersInfo';
import { getVaultsInfo } from './vaults/getVaultsInfo';
import { ZERO_ADDRESS } from '../../../constants';
import { SupportedChainId } from '../../../types';

type GetAllMellowProductsParams = {
  signer: ethers.Signer | null;
  type: 'all' | 'active';
  chainId: SupportedChainId;
  alchemyApiKey: string;
};

export const getAllMellowProducts = async ({
  signer,
  type = 'all',
  chainId,
  alchemyApiKey,
}: GetAllMellowProductsParams): Promise<OptimiserInfo[]> => {
  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;
  const vaults = await getVaultsInfo(userAddress, type, chainId, alchemyApiKey);
  const optimisers = await getOptimisersInfo(signer, type, chainId, alchemyApiKey);

  return vaults.concat(optimisers);
};
