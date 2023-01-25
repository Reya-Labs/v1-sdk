import { ethers } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getProvider, getSentryTracker } from '../../../init';
import { convertGasUnitsToUSD } from '../../../utils/mellowHelpers/convertGasUnitsToUSD';
import { exponentialBackoff } from '../../../utils/retry';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { RouterInfo } from '../getters/types';
import { getRouterConfig } from '../utils/getRouterConfig';

type SubmitAllBatchesForFeeArgs = {
  onlyGasEstimate?: boolean;
  routerId: string;
  signer: ethers.Signer;
};

type SubmitAllBatchesForFeeResponse = {
  gasEstimateUsd: number;
  receipt: ethers.ContractReceipt | null;
  newRouterState: RouterInfo | null;
};

export const submitAllBatchesForFee = async ({
  onlyGasEstimate,
  routerId,
  signer,
}: SubmitAllBatchesForFeeArgs): Promise<SubmitAllBatchesForFeeResponse> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  // Rollover is only allowed for routers
  if (routerConfig.isVault) {
    const errorMessage = 'Submit batch not supported for vaults.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get Router contract
  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  // Simulate the transaction
  try {
    await mellowRouter.callStatic.submitAllBatchesForFee();
  } catch (error) {
    const errorMessage = 'Unsuccessful Submit Batch simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get the gas limit
  const gasLimit = await mellowRouter.estimateGas.submitAllBatchesForFee();

  const provider = getProvider();
  const gasEstimateUsd = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

  if (onlyGasEstimate) {
    return {
      gasEstimateUsd,
      receipt: null,
      newRouterState: null,
    };
  }

  // Send the transaction
  const tx = await mellowRouter.rolloverLPTokens(submitAllBatchesForFee, {
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

  // Get the next state of the router
  let routerInfo: RouterInfo | null = null;
  try {
    const userAddress = await exponentialBackoff(() => signer.getAddress());
    routerInfo = await getOptimiserInfo(routerId, userAddress);
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
    newRouterState: routerInfo,
  };
};
