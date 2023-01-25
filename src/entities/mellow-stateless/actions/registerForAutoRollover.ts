import { ethers } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getSentryTracker } from '../../../init';
import { exponentialBackoff } from '../../../utils/retry';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { RouterInfo } from '../getters/types';
import { getRouterConfig } from '../utils/getRouterConfig';

type RegisterForAutoRolloverArgs = {
  routerId: string;
  registration: boolean;
  signer: ethers.Signer;
};

type RegisterForAutoRolloverResponse = {
  transaction: {
    receipt: ethers.ContractReceipt;
  };
  newRouterState: RouterInfo | null;
};

export const registerForAutoRollover = async ({
  routerId,
  registration,
  signer,
}: RegisterForAutoRolloverArgs): Promise<RegisterForAutoRolloverResponse> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  if (routerConfig.isVault) {
    throw new Error('Deposit not supported for vaults.');
  }

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowRouter.callStatic.registerForAutoRollover(registration);
  } catch (err) {
    const errorMessage = 'Unsuccessful auto-rollover registration simulation';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  const gasLimit = await mellowRouter.estimateGas.registerForAutoRollover(registration);

  const tx = await mellowRouter.registerForAutoRollover(registration, {
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
    transaction: {
      receipt,
    },
    newRouterState: routerInfo,
  };
};
