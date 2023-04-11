import { ethers, BigNumber } from 'ethers';
import { isUndefined } from 'lodash';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getProvider, getSentryTracker } from '../../../init';
import { getTokenInfo } from '../../../services/getTokenInfo';
import { SupportedChainId } from '../../../types';
import { convertGasUnitsToUSD } from '../../../utils/convertGasUnitsToUSD';
import { exponentialBackoff } from '../../../utils/retry';
import { scale } from '../../../utils/scaling';
import { getIndividualOptimiserInfo } from '../getters/optimisers/getIndividualOptimiserInfo';
import { OptimiserInfo } from '../getters/types';
import { getOptimiserConfig } from '../utils/getOptimiserConfig';
import { mapWeights } from '../utils/mapWeights';
import { deposit } from './deposit';

type DepositAndRegisterResponse = {
  gasEstimateUsd: number;
  receipt: ethers.ContractReceipt | null;
  newOptimiserState: OptimiserInfo | null;
};

type DepositAndRegisterArgs = {
  onlyGasEstimate?: boolean;
  optimiserId: string;
  amount: number;
  spareWeights: [string, number][];
  registration?: boolean;
  signer: ethers.Signer;
  chainId: SupportedChainId;
  alchemyApiKey: string;
};

export const depositAndRegister = async ({
  onlyGasEstimate,
  optimiserId,
  amount,
  spareWeights,
  registration,
  signer,
  chainId,
  alchemyApiKey,
}: DepositAndRegisterArgs): Promise<DepositAndRegisterResponse> => {
  if (isUndefined(registration)) {
    return deposit({
      onlyGasEstimate,
      optimiserId,
      amount,
      spareWeights,
      signer,
      chainId,
      alchemyApiKey,
    });
  }

  // Get Mellow Config
  const optimiserConfig = getOptimiserConfig(chainId, optimiserId);

  if (optimiserConfig.isVault) {
    const errorMessage = 'Deposit and register not supported for vaults.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureMessage(errorMessage);
    }
    throw new Error(errorMessage);
  }

  const mellowOptimiser = new ethers.Contract(optimiserId, MellowMultiVaultRouterABI, signer);

  // Get token address
  let tokenId: string;
  try {
    tokenId = await exponentialBackoff(() => mellowOptimiser.token());
  } catch (error) {
    const errorMessage = 'Failed to fetch optimiser token';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }
    throw new Error(errorMessage);
  }

  // Get token name and decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  // Scale the amount
  const scaledAmount = scale(amount, tokenDecimals);

  // Map spare weights to array
  const weights = mapWeights(
    optimiserConfig.vaults.map((v) => v.address),
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
      mellowOptimiser.callStatic.depositEthAndRegisterForAutoRollover(
        weights,
        registration,
        tempOverrides,
      );
    } else {
      mellowOptimiser.callStatic.depositErc20AndRegisterForAutoRollover(
        scaledAmount,
        weights,
        registration,
      );
    }
  } catch (error) {
    const errorMessage = 'Unsuccessful deposit and register simulation.';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  // Estimate gas
  const gasLimit = isETH
    ? await mellowOptimiser.estimateGas.depositEthAndRegisterForAutoRollover(
        weights,
        registration,
        tempOverrides,
      )
    : await mellowOptimiser.estimateGas.depositErc20AndRegisterForAutoRollover(
        scaledAmount,
        weights,
        registration,
        tempOverrides,
      );
  tempOverrides.gasLimit = getGasBuffer(gasLimit);

  const provider = getProvider(chainId, alchemyApiKey);
  const gasEstimateUsd = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

  if (onlyGasEstimate) {
    return {
      gasEstimateUsd,
      receipt: null,
      newOptimiserState: null,
    };
  }

  // Send transaction
  const tx = isETH
    ? await mellowOptimiser.depositEthAndRegisterForAutoRollover(
        weights,
        registration,
        tempOverrides,
      )
    : await mellowOptimiser.depositErc20AndRegisterForAutoRollover(
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
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }

    throw new Error(errorMessage);
  }

  // Get the next state of the optimiser
  let optimiserInfo: OptimiserInfo | null = null;
  try {
    optimiserInfo = await getIndividualOptimiserInfo(optimiserId, signer, chainId, alchemyApiKey);
  } catch (error) {
    const errorMessage = 'Failed to get new state after deposit and register';

    // Report to Sentry
    const sentryTracker = getSentryTracker();
    if (sentryTracker) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(errorMessage);
    }
  }

  // Return the response
  return {
    gasEstimateUsd,
    receipt,
    newOptimiserState: optimiserInfo,
  };
};
