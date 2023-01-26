import { ethers } from 'ethers';
import { MellowLensContractABI } from '../../../../ABIs';
import { ZERO_ADDRESS } from '../../../../constants';
import { getProvider } from '../../../../init';
import { exponentialBackoff } from '../../../../utils/retry';
import { getMellowConfig } from '../../config/config';
import { OptimiserInfo, ContractOptimiserInfo } from '../types';
import { mapOptimiser } from './mappers';

export const getOptimisersInfo = async (userAddress = ZERO_ADDRESS): Promise<OptimiserInfo[]> => {
  const config = getMellowConfig();
  const provider = getProvider();
  const optimiserConfigs = config.MELLOW_OPTIMISERS.filter((r) => !r.isVault);

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

  const optimisers = optimiserConfigs.map((optimiserConfig, index) =>
    mapOptimiser(optimiserConfig, optimisersContractInfo[index]),
  );

  return optimisers;
};
