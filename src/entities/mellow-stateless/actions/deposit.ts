import { ethers, BigNumber } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getTokenInfo } from '../../../services/getTokenInfo';
import { scale } from '../../../utils/scaling';
import { getRouterConfig } from '../utils/getRouterConfig';
import { mapWeights } from '../utils/mapWeights';
import { RouterInfo } from '../getters/types';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { exponentialBackoff } from '../../../utils/retry';
import { getProvider, getSentryTracker } from '../../../init';
import { convertGasUnitsToUSD } from '../../../utils/mellowHelpers/convertGasUnitsToUSD';

type DepositArgs = {
  onlyGasEstimate?: boolean;
  routerId: string;
  amount: number;
  spareWeights: [string, number][];
  signer: ethers.Signer;
};

type DepositResponse = {
  gasEstimateUsd: number;
  receipt: ethers.ContractReceipt | null;
  newRouterState: RouterInfo | null;
};

export const deposit = async ({
  onlyGasEstimate,
  routerId,
  amount,
  spareWeights,
  signer,
}: DepositArgs): Promise<DepositResponse> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  // Deposit is only allowed for routers
  if (routerConfig.isVault) {
    const errorMessage = 'Deposit not supported for vaults.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get Router contract
  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  // Get token address
  let tokenId: string;
  try {
    tokenId = await exponentialBackoff(() => mellowRouter.token());
  } catch (error) {
    const errorMessage = 'Failed to fetch router token';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Get token name and decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  // Scale the amount
  const scaledAmount = scale(amount, tokenDecimals);

  // Map spare weights to array
  const weights = mapWeights(
    routerConfig.vaults.map((v) => v.address),
    spareWeights,
  );

  // Get the transaction
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (isETH) {
    tempOverrides.value = scaledAmount;
  }

  // Simulate deposit
  try {
    if (isETH) {
      await mellowRouter.callStatic.depositEth(weights, tempOverrides);
    } else {
      await mellowRouter.callStatic.depositErc20(scaledAmount, weights);
    }
  } catch (error) {
    const errorMessage = 'Unsuccessful deposit simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Estimate gas
  const gasLimit = isETH
    ? await mellowRouter.estimateGas.depositEth(weights, tempOverrides)
    : await mellowRouter.estimateGas.depositErc20(scaledAmount, weights);
  tempOverrides.gasLimit = getGasBuffer(gasLimit);

  const provider = getProvider();
  const gasEstimateUsd = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

  if (onlyGasEstimate) {
    return {
      gasEstimateUsd,
      receipt: null,
      newRouterState: null,
    };
  }

  // Send transaction
  const tx: ethers.ContractTransaction = isETH
    ? await mellowRouter.depositEth(weights, tempOverrides)
    : await mellowRouter.depositErc20(scaledAmount, weights, tempOverrides);

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
