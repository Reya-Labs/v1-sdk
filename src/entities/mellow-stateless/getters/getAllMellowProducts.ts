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
  infuraApiKey: string;
};

export const getAllMellowProducts = async ({
  signer,
  type = 'all',
  chainId,
  alchemyApiKey,
  infuraApiKey,
}: GetAllMellowProductsParams): Promise<OptimiserInfo[]> => {
  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;
  const vaults = await getVaultsInfo(userAddress, type, chainId, alchemyApiKey, infuraApiKey);
  const optimisers = await getOptimisersInfo(signer, type, chainId, alchemyApiKey, infuraApiKey);

  return vaults.concat(optimisers);
};
