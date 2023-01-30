import { ethers, BigNumber } from 'ethers';
import { Erc20RootVaultABI, MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getSentryTracker } from '../../../init';
import { exponentialBackoff } from '../../../utils/retry';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { OptimiserInfo } from '../getters/types';
import { getOptimiserConfig } from '../utils/getOptimiserConfig';
import { mapWeights } from '../utils/mapWeights';

type RolloverArgs = {
  optimiserId: string;
  vaultId: string;
  spareWeights: [string, number][];
  signer: ethers.Signer;
};

type RolloverResponse = {
  transaction: {
    receipt: ethers.ContractReceipt;
  };
  newOptimiserState: OptimiserInfo | null;
};

export const rollover = async ({
  optimiserId,
  vaultId,
  spareWeights,
  signer,
}: RolloverArgs): Promise<RolloverResponse> => {
  // Get Mellow Config
  const optimiserConfig = getOptimiserConfig(optimiserId);

  // Rollover is only allowed for optimisers
  if (optimiserConfig.isVault) {
    const errorMessage = 'Rollover not supported for vaults.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get Optimiser contract
  const mellowOptimiser = new ethers.Contract(optimiserId, MellowMultiVaultRouterABI, signer);

  // Get the index of the specified vault
  const optimiserVaultIds = optimiserConfig.vaults.map((v) => v.address);
  const vaultIndex = optimiserVaultIds.findIndex((item) => item === vaultId);
  if (vaultIndex < 0) {
    const errorMessage = 'Vault ID not found.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get the Vault Contract
  const erc20RootVaultContract = new ethers.Contract(
    optimiserVaultIds[vaultIndex],
    Erc20RootVaultABI,
    signer,
  );

  // Map spare weights to array
  const weights = mapWeights(
    optimiserConfig.vaults.map((v) => v.address),
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
    await mellowOptimiser.callStatic.rolloverLPTokens(
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
  const gasLimit = await mellowOptimiser.estimateGas.rolloverLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
    weights,
  );

  // Send the transaction
  const tx = await mellowOptimiser.rolloverLPTokens(
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

  // Get the next state of the optimiser
  let optimiserInfo: OptimiserInfo | null = null;
  try {
    optimiserInfo = await getOptimiserInfo(optimiserId, signer);
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
    newOptimiserState: optimiserInfo,
  };
};
