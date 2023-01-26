import { ethers } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getProvider, getSentryTracker } from '../../../init';
import { convertGasUnitsToUSD } from '../../../utils/mellowHelpers/convertGasUnitsToUSD';
import { exponentialBackoff } from '../../../utils/retry';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { OptimiserInfo } from '../getters/types';
import { getOptimiserConfig } from '../utils/getOptimiserConfig';

type SubmitAllBatchesForFeeArgs = {
  onlyGasEstimate?: boolean;
  optimiserId: string;
  signer: ethers.Signer | null;
};

type SubmitAllBatchesForFeeResponse = {
  gasEstimateUsd: number;
  receipt: ethers.ContractReceipt | null;
  newOptimiserState: OptimiserInfo | null;
};

export const submitAllBatchesForFee = async ({
  onlyGasEstimate,
  optimiserId,
  signer,
}: SubmitAllBatchesForFeeArgs): Promise<SubmitAllBatchesForFeeResponse> => {
  const provider = getProvider();

  // Get Mellow Config
  const optimiserConfig = getOptimiserConfig(optimiserId);

  // Submit batch is only allowed for optimisers
  if (optimiserConfig.isVault) {
    const errorMessage = 'Submit batch not supported for vaults.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get Optimiser contract
  let mellowOptimiser = new ethers.Contract(optimiserId, MellowMultiVaultRouterABI, provider);

  // Simulate the transaction
  try {
    await mellowOptimiser.callStatic.submitAllBatchesForFee();
  } catch (error) {
    const errorMessage = 'Unsuccessful Submit Batch simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

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
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  mellowOptimiser = new ethers.Contract(optimiserId, MellowMultiVaultRouterABI, signer);

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
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get the next state of the optimiser
  let optimiserInfo: OptimiserInfo | null = null;
  try {
    const userAddress = await exponentialBackoff(() => signer.getAddress());
    optimiserInfo = await getOptimiserInfo(optimiserId, userAddress);
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
