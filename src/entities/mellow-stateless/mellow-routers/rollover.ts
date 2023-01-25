import { ethers, BigNumber } from 'ethers';
import { Erc20RootVaultABI, MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getSentryTracker } from '../../../init';
import { exponentialBackoff } from '../../../utils/retry';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { RouterInfo } from '../getters/types';
import { getRouterConfig } from '../utils/getRouterConfig';
import { mapWeights } from '../utils/mapWeights';

type RolloverArgs = {
  routerId: string;
  vaultId: string;
  spareWeights: [string, number][];
  signer: ethers.Signer;
};

type RolloverResponse = {
  transaction: {
    receipt: ethers.ContractReceipt;
  };
  newRouterState: RouterInfo | null;
};

export const rollover = async ({
  routerId,
  vaultId,
  spareWeights,
  signer,
}: RolloverArgs): Promise<RolloverResponse> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  // Rollover is only allowed for routers
  if (routerConfig.isVault) {
    const errorMessage = 'Rollover not supported for vaults.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get Router contract
  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  // Get the index of the specified vault
  const routerVaultIds = routerConfig.vaults.map((v) => v.address);
  const vaultIndex = routerVaultIds.findIndex((item) => item === vaultId);
  if (vaultIndex < 0) {
    const errorMessage = 'Vault ID not found.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get the Vault Contract
  const erc20RootVaultContract = new ethers.Contract(
    routerVaultIds[vaultIndex],
    Erc20RootVaultABI,
    signer,
  );

  // Map spare weights to array
  const weights = mapWeights(
    routerConfig.vaults.map((v) => v.address),
    spareWeights,
  );

  // Build the parameters
  let subvaultsCount: number;
  try {
    subvaultsCount = (await exponentialBackoff(() => erc20RootVaultContract.subvaultNfts())).length;
  } catch (error) {
    const errorMessage = 'Failed to fetch number of subvaults';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  const minTokenAmounts = BigNumber.from(0);
  const vaultsOptions = new Array(subvaultsCount).fill(0x0);

  // Simulate the transaction
  try {
    await mellowRouter.callStatic.rolloverLPTokens(
      vaultIndex,
      [minTokenAmounts],
      vaultsOptions,
      weights,
    );
  } catch (error) {
    const errorMessage = 'Unsuccessful rolloverLPTokens simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get the gas limit
  const gasLimit = await mellowRouter.estimateGas.rolloverLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
    weights,
  );

  // Send the transaction
  const tx = await mellowRouter.rolloverLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
    weights,
    {
      gasLimit: getGasBuffer(gasLimit),
    },
  );

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
