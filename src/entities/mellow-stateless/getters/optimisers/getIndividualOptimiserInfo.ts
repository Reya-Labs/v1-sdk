import { ethers } from 'ethers';
import { MellowLensContractABI } from '../../../../ABIs';
import { getProvider, getSentryTracker } from '../../../../init';
import { getMellowConfig } from '../../config/config';
import { OptimiserInfo } from '../types';
import { getOptimiserConfig } from '../../utils/getOptimiserConfig';
import { mapOptimiser } from './mappers';
import { ZERO_ADDRESS } from '../../../../constants';
import { exponentialBackoff } from '../../../../utils/retry';
import { SupportedChainId } from '../../../../types';

export const getIndividualOptimiserInfo = async (
  optimiserId: string,
  signer: ethers.Signer | null,
  chainId: SupportedChainId,
  alchemyApiKey: string,
): Promise<OptimiserInfo> => {
  const { MELLOW_LENS } = getMellowConfig(chainId);
  const optimiserConfig = getOptimiserConfig(chainId, optimiserId);
  const provider = getProvider(chainId, alchemyApiKey);

  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;

  const mellowLensContract = new ethers.Contract(MELLOW_LENS, MellowLensContractABI, provider);

  try {
    const optimisersContractInfo = await exponentialBackoff(() =>
      mellowLensContract.getOptimisersInfo([optimiserConfig.optimiser], userAddress),
    );

    const optimiser = await mapOptimiser(
      optimiserConfig,
      optimisersContractInfo[0],
      signer,
      chainId,
      alchemyApiKey,
    );

    return optimiser;
  } catch (error) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage('Failed to load individual optimiser information.');
    throw new Error('Failed to load optimiser information.');
  }
};
