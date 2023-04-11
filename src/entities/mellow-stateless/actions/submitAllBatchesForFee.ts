import { ethers } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getProvider, getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';
import { convertGasUnitsToUSD } from '../../../utils/convertGasUnitsToUSD';
import { getIndividualOptimiserInfo } from '../getters/optimisers/getIndividualOptimiserInfo';
import { OptimiserInfo } from '../getters/types';
import { getOptimiserConfig } from '../utils/getOptimiserConfig';

type SubmitAllBatchesForFeeResponse = {
  gasEstimateUsd: number;
  receipt: ethers.ContractReceipt | null;
  newOptimiserState: OptimiserInfo | null;
};

type SubmitAllBatchesForFeeArgs = {
  onlyGasEstimate?: boolean;
  optimiserId: string;
  signer: ethers.Signer;
  chainId: SupportedChainId;
  alchemyApiKey: string;
};

export const submitAllBatchesForFee = async ({
  onlyGasEstimate,
  optimiserId,
  signer,
  chainId,
  alchemyApiKey,
}: SubmitAllBatchesForFeeArgs): Promise<SubmitAllBatchesForFeeResponse> => {
  const provider = getProvider(chainId, alchemyApiKey);

  // Get Mellow Config
  const optimiserConfig = getOptimiserConfig(chainId, optimiserId);

  // Submit batch is only allowed for optimisers
  if (optimiserConfig.isVault) {
    const errorMessage = 'Submit batch not supported for vaults.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  // Get Optimiser contract
  const mellowOptimiser = new ethers.Contract(optimiserId, MellowMultiVaultRouterABI, signer);

  // Simulate the transaction
  try {
    await mellowOptimiser.callStatic.submitAllBatchesForFee();
  } catch (error) {
    const errorMessage = 'Unsuccessful Submit Batch simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  // Get the gas limit
  const gasLimit = await mellowOptimiser.estimateGas.submitAllBatchesForFee();
  const gasEstimateUsd = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

  if (onlyGasEstimate) {
    return {
      gasEstimateUsd,
      receipt: null,
      newOptimiserState: null,
    };
  }

  if (!signer) {
    const errorMessage = 'Signer needs to be passed to execute submit batch';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  // Send the transaction
  const tx = await mellowOptimiser.submitAllBatchesForFee({
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
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  // Get the next state of the optimiser
  let optimiserInfo: OptimiserInfo | null = null;
  try {
    optimiserInfo = await getIndividualOptimiserInfo(optimiserId, signer, chainId, alchemyApiKey);
  } catch (error) {
    const errorMessage = 'Failed to get new state after deposit';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }
  }

  // Return the response
  return {
    gasEstimateUsd,
    receipt,
    newOptimiserState: optimiserInfo,
  };
};
