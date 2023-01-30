import { ethers } from 'ethers';
import { MellowLensContractABI } from '../../../../ABIs';
import { getProvider, getSentryTracker } from '../../../../init';
import { getMellowConfig } from '../../config/config';
import { OptimiserInfo } from '../types';
import { getOptimiserConfig } from '../../utils/getOptimiserConfig';
import { mapOptimiser } from './mappers';
import { ZERO_ADDRESS } from '../../../../constants';
import { exponentialBackoff } from '../../../../utils/retry';

export const getOptimiserInfo = async (
  optimiserId: string,
  signer: ethers.Signer | null,
): Promise<OptimiserInfo> => {
  const { MELLOW_LENS } = getMellowConfig();
  const optimiserConfig = getOptimiserConfig(optimiserId);
  const provider = getProvider();

  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;

  const mellowLensContract = new ethers.Contract(MELLOW_LENS, MellowLensContractABI, provider);

  try {
    const optimisersContractInfo = await exponentialBackoff(() =>
      mellowLensContract.getOptimisersInfo([optimiserConfig.optimiser], userAddress),
    );

    const optimiser = await mapOptimiser(optimiserConfig, optimisersContractInfo[0], signer);

    return optimiser;
  } catch (error) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage('Failed to load individual optimiser information.');
    throw new Error('Failed to load optimiser information.');
  }
};
