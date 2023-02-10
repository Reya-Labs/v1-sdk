import { ethers } from 'ethers';
import { MellowLensContractABI } from '../../../../ABIs';
import { getProvider, getProviderV1, getSentryTracker } from '../../../../init';
import { getMellowConfig, getMellowConfigV1 } from '../../config/config';
import { OptimiserInfo } from '../types';
import { getOptimiserConfig, getOptimiserConfigV1 } from '../../utils/getOptimiserConfig';
import { mapOptimiser, mapOptimiserV1 } from './mappers';
import { ZERO_ADDRESS } from '../../../../constants';
import { exponentialBackoff } from '../../../../utils/retry';
import { SupportedChainId } from '../../../../types';

export const getIndividualOptimiserInfo = async (
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

export const getIndividualOptimiserInfoV1 = async (
  optimiserId: string,
  signer: ethers.Signer | null,
  chainId: SupportedChainId,
  alchemyApiKey: string,
): Promise<OptimiserInfo> => {
  const { MELLOW_LENS } = getMellowConfigV1(chainId);
  const optimiserConfig = getOptimiserConfigV1(chainId, optimiserId);
  const provider = getProviderV1(chainId, alchemyApiKey);

  const userAddress = signer ? await signer.getAddress() : ZERO_ADDRESS;

  const mellowLensContract = new ethers.Contract(MELLOW_LENS, MellowLensContractABI, provider);

  try {
    const optimisersContractInfo = await exponentialBackoff(() =>
      mellowLensContract.getOptimisersInfo([optimiserConfig.optimiser], userAddress),
    );

    const optimiser = await mapOptimiserV1(
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
