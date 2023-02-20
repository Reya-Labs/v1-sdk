import { ethers } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getProvider, getProviderV1, getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';
import { convertGasUnitsToUSD } from '../../../utils/convertGasUnitsToUSD';
import {
  getIndividualOptimiserInfo,
  getIndividualOptimiserInfoV1,
} from '../getters/optimisers/getIndividualOptimiserInfo';
import { OptimiserInfo } from '../getters/types';
import { getOptimiserConfig, getOptimiserConfigV1 } from '../utils/getOptimiserConfig';

type RegisterForAutoRolloverArgs = {
  onlyGasEstimate?: boolean;
  optimiserId: string;
  registration: boolean;
  signer: ethers.Signer;
};

type RegisterForAutoRolloverResponse = {
  gasEstimateUsd: number;
  receipt: ethers.ContractReceipt | null;
  newOptimiserState: OptimiserInfo | null;
};

export const registerForAutoRollover = async ({
  onlyGasEstimate,
  optimiserId,
  registration,
  signer,
}: RegisterForAutoRolloverArgs): Promise<RegisterForAutoRolloverResponse> => {
  // Get Mellow Config
  const optimiserConfig = getOptimiserConfig(optimiserId);

  if (optimiserConfig.isVault) {
    throw new Error('Deposit not supported for vaults.');
  }

  const mellowOptimiser = new ethers.Contract(optimiserId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowOptimiser.callStatic.registerForAutoRollover(registration);
  } catch (err) {
    const errorMessage = 'Unsuccessful auto-rollover registration simulation';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  const gasLimit = await mellowOptimiser.estimateGas.registerForAutoRollover(registration);

  const provider = getProvider();
  const gasEstimateUsd = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

  if (onlyGasEstimate) {
    return {
      gasEstimateUsd,
      receipt: null,
      newOptimiserState: null,
    };
  }

  const tx = await mellowOptimiser.registerForAutoRollover(registration, {
    gasLimit: getGasBuffer(gasLimit),
  });

  // Wait for the receipt
  let receipt: ethers.ContractReceipt;
  try {
    receipt = await tx.wait();
  } catch (error) {
    const errorMessage = 'Transaction Confirmation Error';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get the next state of the optimiser
  let optimiserInfo: OptimiserInfo | null = null;
  try {
    optimiserInfo = await getIndividualOptimiserInfo(optimiserId, signer);
  } catch (error) {
    const errorMessage = 'Failed to get new state after deposit';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);
  }

  // Return the response
  return {
    gasEstimateUsd,
    receipt,
    newOptimiserState: optimiserInfo,
  };
};

type RegisterForAutoRolloverArgsV1 = {
  onlyGasEstimate?: boolean;
  optimiserId: string;
  registration: boolean;
  signer: ethers.Signer;
  chainId: SupportedChainId;
  alchemyApiKey: string;
};

export const registerForAutoRolloverV1 = async ({
  onlyGasEstimate,
  optimiserId,
  registration,
  signer,
  chainId,
  alchemyApiKey,
}: RegisterForAutoRolloverArgsV1): Promise<RegisterForAutoRolloverResponse> => {
  // Get Mellow Config
  const optimiserConfig = getOptimiserConfigV1(chainId, optimiserId);

  if (optimiserConfig.isVault) {
    throw new Error('Deposit not supported for vaults.');
  }

  const mellowOptimiser = new ethers.Contract(optimiserId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowOptimiser.callStatic.registerForAutoRollover(registration);
  } catch (err) {
    const errorMessage = 'Unsuccessful auto-rollover registration simulation';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  const gasLimit = await mellowOptimiser.estimateGas.registerForAutoRollover(registration);

  const provider = getProviderV1(chainId, alchemyApiKey);
  const gasEstimateUsd = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

  if (onlyGasEstimate) {
    return {
      gasEstimateUsd,
      receipt: null,
      newOptimiserState: null,
    };
  }

  const tx = await mellowOptimiser.registerForAutoRollover(registration, {
    gasLimit: getGasBuffer(gasLimit),
  });

  // Wait for the receipt
  let receipt: ethers.ContractReceipt;
  try {
    receipt = await tx.wait();
  } catch (error) {
    const errorMessage = 'Transaction Confirmation Error';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get the next state of the optimiser
  let optimiserInfo: OptimiserInfo | null = null;
  try {
    optimiserInfo = await getIndividualOptimiserInfoV1(optimiserId, signer, chainId, alchemyApiKey);
  } catch (error) {
    const errorMessage = 'Failed to get new state after deposit';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);
  }

  // Return the response
  return {
    gasEstimateUsd,
    receipt,
    newOptimiserState: optimiserInfo,
  };
};
