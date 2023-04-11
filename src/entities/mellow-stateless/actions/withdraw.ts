import { ethers, BigNumber } from 'ethers';
import { Erc20RootVaultABI, MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';
import { exponentialBackoff } from '../../../utils/retry';
import { getMellowConfig } from '../config/config';
import { getMellowProduct } from '../getters/getMellowProduct';
import { OptimiserInfo } from '../getters/types';
import { getOptimiserConfig } from '../utils/getOptimiserConfig';

type WithdrawResponse = {
  transaction: {
    receipt: ethers.ContractReceipt;
  };
  newOptimiserState: OptimiserInfo | null;
};

const vaultWithdraw = async ({
  vaultId,
  signer,
}: WithdrawArgs): Promise<ethers.ContractReceipt> => {
  // Get ERC20 vault contract
  const erc20RootVault = new ethers.Contract(vaultId, Erc20RootVaultABI, signer);

  // Get the balance of LP tokens
  const userAddress = await exponentialBackoff(() => signer.getAddress());
  const lpTokens = await erc20RootVault.balanceOf(userAddress);

  // Get the number of subvaults to input the correct vault options
  const subvaultsCount: number = (await exponentialBackoff(() => erc20RootVault.subvaultNfts()))
    .length;

  // Default arguments for withdraw
  const minTokenAmounts = BigNumber.from(0);
  const vaultsOptions = new Array(subvaultsCount).fill(0x0);

  // Simulate the withdrawal
  try {
    await erc20RootVault.callStatic.withdraw(
      userAddress,
      lpTokens,
      [minTokenAmounts],
      vaultsOptions,
    );
  } catch (error) {
    const errorMessage = 'Unsuccessful withdraw simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  // Estimate the gas for this transaction
  const gasLimit = await erc20RootVault.estimateGas.withdraw(
    userAddress,
    lpTokens,
    [minTokenAmounts],
    vaultsOptions,
  );

  // Send the transaction
  const tx = await erc20RootVault.withdraw(
    userAddress,
    lpTokens,
    [minTokenAmounts],
    vaultsOptions,
    {
      gasLimit: getGasBuffer(gasLimit),
    },
  );

  // Wait for the receipt
  let receipt: ethers.ContractReceipt;
  try {
    receipt = await tx.wait();
    return receipt;
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
};

type WithdrawArgs = {
  optimiserId: string;
  vaultId: string;
  signer: ethers.Signer;
  chainId: SupportedChainId;
  alchemyApiKey: string;
};

const optimiserWithdraw = async ({
  optimiserId,
  vaultId,
  signer,
  chainId,
}: WithdrawArgs): Promise<ethers.ContractReceipt> => {
  const config = getMellowConfig(chainId);

  const optimiserConfig = config.MELLOW_OPTIMISERS.find(
    (item) => item.optimiser.toLowerCase() === optimiserId.toLowerCase(),
  );

  if (!optimiserConfig) {
    const errorMessage = 'Optimiser ID not found';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  const optimiserVaultIds = optimiserConfig.vaults.map((v) => v.address);
  const vaultIndex = optimiserVaultIds.findIndex((item) => item === vaultId);
  if (vaultIndex < 0) {
    const errorMessage = 'Vault ID not found';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  const erc20RootVaultContract = new ethers.Contract(
    optimiserVaultIds[vaultIndex],
    Erc20RootVaultABI,
    signer,
  );

  let subvaultsCount: number;
  try {
    subvaultsCount = (await exponentialBackoff(() => erc20RootVaultContract.subvaultNfts())).length;
  } catch (error) {
    const errorMessage = 'Failed to fetch number of subvaults';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }
    throw new Error(errorMessage);
  }

  const minTokenAmounts = BigNumber.from(0);
  const vaultsOptions = new Array(subvaultsCount).fill(0x0);

  const mellowOptimiser = new ethers.Contract(optimiserId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowOptimiser.callStatic.claimLPTokens(vaultIndex, [minTokenAmounts], vaultsOptions);
  } catch (error) {
    const errorMessage = 'Unsuccessful claimLPTokens simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  const gasLimit = await mellowOptimiser.estimateGas.claimLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
  );

  const tx = await mellowOptimiser.claimLPTokens(vaultIndex, [minTokenAmounts], vaultsOptions, {
    gasLimit: getGasBuffer(gasLimit),
  });

  // Wait for the receipt
  let receipt: ethers.ContractReceipt;
  try {
    receipt = await tx.wait();
    return receipt;
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
};

export const withdraw = async (params: WithdrawArgs): Promise<WithdrawResponse> => {
  const { optimiserId, signer, chainId, alchemyApiKey } = params;

  // Get Mellow Config
  const optimiserConfig = getOptimiserConfig(chainId, params.optimiserId);

  const receipt = await (optimiserConfig.isVault
    ? vaultWithdraw(params)
    : optimiserWithdraw(params));

  // Get the next state of the optimiser
  let optimiserInfo: OptimiserInfo | null = null;
  try {
    // Get the next state of the optimiser
    optimiserInfo = await getMellowProduct({
      optimiserId,
      signer,
      chainId,
      alchemyApiKey,
    });
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
    transaction: {
      receipt,
    },
    newOptimiserState: optimiserInfo,
  };
};
