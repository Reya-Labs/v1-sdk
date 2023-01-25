import { ethers, BigNumber } from 'ethers';
import { isUndefined } from 'lodash';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getProvider, getSentryTracker } from '../../../init';
import { getTokenInfo } from '../../../services/getTokenInfo';
import { convertGasUnitsToUSD } from '../../../utils/mellowHelpers/convertGasUnitsToUSD';
import { exponentialBackoff } from '../../../utils/retry';
import { scale } from '../../../utils/scaling';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { RouterInfo } from '../getters/types';
import { getRouterConfig } from '../utils/getRouterConfig';
import { mapWeights } from '../utils/mapWeights';
import { deposit } from './deposit';

type DepositAndRegisterArgs = {
  onlyGasEstimate?: boolean;
  routerId: string;
  amount: number;
  spareWeights: [string, number][];
  registration?: boolean;
  signer: ethers.Signer;
};

type DepositAndRegisterResponse = {
  gasEstimateUsd: number;
  receipt: ethers.ContractReceipt | null;
  newRouterState: RouterInfo | null;
};

export const depositAndRegister = async ({
  onlyGasEstimate,
  routerId,
  amount,
  spareWeights,
  registration,
  signer,
}: DepositAndRegisterArgs): Promise<DepositAndRegisterResponse> => {
  if (isUndefined(registration)) {
    return deposit({
      onlyGasEstimate,
      routerId,
      amount,
      spareWeights,
      signer,
    });
  }

  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  if (routerConfig.isVault) {
    const errorMessage = 'Deposit and register not supported for vaults.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

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

  // Get the transaction and wait for the receipt
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (isETH) {
    tempOverrides.value = scaledAmount;
  }

  // Simulate deposit and register
  try {
    if (isETH) {
      mellowRouter.callStatic.depositEthAndRegisterForAutoRollover(
        weights,
        registration,
        tempOverrides,
      );
    } else {
      mellowRouter.callStatic.depositErc20AndRegisterForAutoRollover(
        scaledAmount,
        weights,
        registration,
      );
    }
  } catch (error) {
    const errorMessage = 'Unsuccessful deposit and register simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(errorMessage);

    throw new Error(errorMessage);
  }

  // Estimate gas
  const gasLimit = isETH
    ? await mellowRouter.estimateGas.depositEthAndRegisterForAutoRollover(
        weights,
        registration,
        tempOverrides,
      )
    : await mellowRouter.estimateGas.depositErc20AndRegisterForAutoRollover(
        scaledAmount,
        weights,
        registration,
        tempOverrides,
      );
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
  const tx = isETH
    ? await mellowRouter.depositEthAndRegisterForAutoRollover(weights, registration, tempOverrides)
    : await mellowRouter.depositErc20AndRegisterForAutoRollover(
        scaledAmount,
        weights,
        registration,
        tempOverrides,
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
    const errorMessage = 'Failed to get new state after deposit and register';

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
