import { ethers, BigNumber } from 'ethers';
import { Erc20RootVaultABI, MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getSentryTracker } from '../../../init';
import { exponentialBackoff } from '../../../utils/retry';
import { getMellowConfig } from '../config/config';
import { getMellowProduct } from '../getters/getMellowProduct';
import { RouterInfo } from '../getters/types';
import { getRouterConfig } from '../utils/getRouterConfig';

type WithdrawArgs = {
  routerId: string;
  vaultId: string;
  signer: ethers.Signer;
};

type WithdrawResponse = {
  transaction: {
    receipt: ethers.ContractReceipt;
  };
  newRouterState: RouterInfo | null;
};

const routerWithdraw = async ({
  routerId,
  vaultId,
  signer,
}: WithdrawArgs): Promise<ethers.ContractReceipt> => {
  const config = getMellowConfig();

  const routerConfig = config.MELLOW_ROUTERS.find(
    (item) => item.router.toLowerCase() === routerId.toLowerCase(),
  );

  if (!routerConfig) {
    const errorMessage = 'Router ID not found';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  const routerVaultIds = routerConfig.vaults.map((v) => v.address);
  const vaultIndex = routerVaultIds.findIndex((item) => item === vaultId);
  if (vaultIndex < 0) {
    const errorMessage = 'Vault ID not found';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  const erc20RootVaultContract = new ethers.Contract(
    routerVaultIds[vaultIndex],
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
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  const minTokenAmounts = BigNumber.from(0);
  const vaultsOptions = new Array(subvaultsCount).fill(0x0);

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowRouter.callStatic.claimLPTokens(vaultIndex, [minTokenAmounts], vaultsOptions);
  } catch (error) {
    const errorMessage = 'Unsuccessful claimLPTokens simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  const gasLimit = await mellowRouter.estimateGas.claimLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
  );

  const tx = await mellowRouter.claimLPTokens(vaultIndex, [minTokenAmounts], vaultsOptions, {
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
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }
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
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

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
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }
};

export const withdraw = async (params: WithdrawArgs): Promise<WithdrawResponse> => {
  const { routerId, signer } = params;

  // Get Mellow Config
  const routerConfig = getRouterConfig(params.routerId);

  const receipt = await (routerConfig.isVault ? vaultWithdraw(params) : routerWithdraw(params));

  // Get the next state of the router
  let routerInfo: RouterInfo | null = null;
  try {
    // Get the next state of the router
    const userAddress = await exponentialBackoff(() => signer.getAddress());
    routerInfo = await getMellowProduct({
      routerId,
      userAddress,
    });
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
