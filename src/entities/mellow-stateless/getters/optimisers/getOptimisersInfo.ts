import { ethers } from 'ethers';
import { MellowLensContractABI } from '../../../../ABIs';
import { ZERO_ADDRESS } from '../../../../constants';
import { getProvider } from '../../../../init';
import { exponentialBackoff } from '../../../../utils/retry';
import { getMellowConfig } from '../../config/config';
import { OptimiserInfo, ContractOptimiserInfo } from '../types';
import { mapOptimiser } from './mappers';

export const getOptimisersInfo = async (signer: ethers.Signer | null): Promise<OptimiserInfo[]> => {
  const config = getMellowConfig();
  const provider = getProvider();
  const optimiserConfigs = config.MELLOW_OPTIMISERS.filter((r) => !r.isVault);

  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;

  const mellowLensContract = new ethers.Contract(
    config.MELLOW_LENS,
    MellowLensContractABI,
    provider,
  );

  // Get optimisers
  const optimisersContractInfo: ContractOptimiserInfo[] = await exponentialBackoff(() =>
    mellowLensContract.getOptimisersInfo(
      optimiserConfigs.map((optimiserConfig) => optimiserConfig.optimiser),
      userAddress,
    ),
  );

  const optimisers = (
    await Promise.allSettled(
      optimiserConfigs.map((optimiserConfig, index) =>
        mapOptimiser(optimiserConfig, optimisersContractInfo[index], signer),
      ),
    )
  ).map((v) => {
    if (v.status === 'fulfilled') {
      return v.value;
    }
    throw new Error('Failed to load optimiser information.');
  });

  return optimisers;
};
