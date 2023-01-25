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

type DepositArgs = {
  routerId: string;
  amount: number;
  spareWeights: [string, number][];
  signer: ethers.Signer;
};

type DepositResponse = {
  transaction: {
    receipt: ethers.ContractReceipt;
  };
  newRouterState: RouterInfo;
};

const getTransaction = async (
  mellowRouter: ethers.Contract,
  isETH: boolean,
  scaledAmount: ethers.BigNumber,
  weights: number[],
): Promise<ethers.ContractTransaction> => {
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (isETH) {
    tempOverrides.value = scaledAmount;

    // Simulate deposit
    try {
      await mellowRouter.callStatic.depositEth(weights, tempOverrides);
    } catch (error) {
      // TODO: Add Sentry
      throw new Error('Unsuccessful deposit simulation.');
    }

    // Estimate gas
    const gasLimit = await mellowRouter.estimateGas.depositEth(weights, tempOverrides);
    tempOverrides.gasLimit = getGasBuffer(gasLimit);

    // Send transaction
    return mellowRouter.depositEth(weights, tempOverrides);
  }

  // Simulate deposit
  try {
    await mellowRouter.callStatic.depositErc20(scaledAmount, weights);
  } catch (error) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful deposit simulation.');
  }

  // Estimate gas
  const gasLimit = await mellowRouter.estimateGas.depositErc20(scaledAmount, weights);
  tempOverrides.gasLimit = getGasBuffer(gasLimit);

  // Send transaction
  return mellowRouter.depositErc20(scaledAmount, weights, tempOverrides);
};

export const deposit = async ({
  routerId,
  amount,
  spareWeights,
  signer,
}: DepositArgs): Promise<DepositResponse> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  // Deposit is only allowed for routers
  if (routerConfig.isVault) {
    throw new Error('Deposit not supported for vaults.');
  }

  // Get Router contract
  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  // Get token address
  const tokenId = await exponentialBackoff(() => mellowRouter.token());

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
  const tx = await getTransaction(mellowRouter, isETH, scaledAmount, weights);
  const receipt = await tx.wait();

  // Get the next state of the router
  const userAddress = await exponentialBackoff(() => signer.getAddress());
  const routerInfo = await getOptimiserInfo(routerId, userAddress);

  // Return the response
  return {
    transaction: {
      receipt,
    },
    newRouterState: routerInfo,
  };
};
