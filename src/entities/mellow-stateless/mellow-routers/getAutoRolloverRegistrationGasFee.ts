import { ethers } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getProvider, getSentryTracker } from '../../../init';
import { convertGasUnitsToUSD } from '../../../utils/mellowHelpers/convertGasUnitsToUSD';
import { getRouterConfig } from '../utils/getRouterConfig';

type GetAutoRolloverRegistrationGasFeeArgs = {
  routerId: string;
  registration: boolean;
  signer: ethers.Signer;
};

export const getAutoRolloverRegistrationGasFee = async ({
  routerId,
  registration,
  signer,
}: GetAutoRolloverRegistrationGasFeeArgs): Promise<number> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  if (routerConfig.isVault) {
    const errorMessage = 'Query not supported for vaults.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  const provider = getProvider();
  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  try {
    const gasLimit = await mellowRouter.estimateGas.registerForAutoRollover(registration);
    const fee = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

    return fee;
  } catch (error) {
    const errorMessage = 'Transaction Confirmation Error';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }
};
