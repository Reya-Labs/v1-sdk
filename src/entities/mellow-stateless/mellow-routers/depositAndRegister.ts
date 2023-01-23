import { ethers, BigNumber } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getTokenInfo } from '../../../services/getTokenInfo';
import { scale } from '../../../utils/scaling';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { RouterInfo } from '../getters/types';
import { getRouterConfig } from '../utils/getRouterConfig';
import { mapWeights } from '../utils/mapWeights';

type DepositAndRegisterArgs = {
  routerId: string;
  amount: number;
  spareWeights: [string, number][];
  registration: boolean;
  signer: ethers.Signer;
};

type DepositAndRegisterResponse = {
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
  registration: boolean,
): Promise<ethers.ContractTransaction> => {
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (isETH) {
    tempOverrides.value = scaledAmount;

    // Simulate deposit and register
    try {
      mellowRouter.callStatic.depositEthAndRegisterForAutoRollover(
        weights,
        registration,
        tempOverrides,
      );
    } catch (error) {
      // TODO: Add Sentry
      throw new Error('Unsuccessful depositAndRegisterForAutoRollover simulation.');
    }

    const gasLimit = await mellowRouter.estimateGas.depositEthAndRegisterForAutoRollover(
      weights,
      registration,
      tempOverrides,
    );
    tempOverrides.gasLimit = getGasBuffer(gasLimit);

    return mellowRouter.depositEthAndRegisterForAutoRollover(weights, registration, tempOverrides);
  }

  // Simulate deposit and register
  try {
    mellowRouter.callStatic.depositErc20AndRegisterForAutoRollover(
      scaledAmount,
      weights,
      registration,
    );
  } catch (error) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful depositAndRegisterForAutoRollover simulation.');
  }

  // Estimate gas
  const gasLimit = await mellowRouter.estimateGas.depositErc20AndRegisterForAutoRollover(
    scaledAmount,
    weights,
    registration,
    tempOverrides,
  );
  tempOverrides.gasLimit = getGasBuffer(gasLimit);

  // Send transaction
  return mellowRouter.depositErc20AndRegisterForAutoRollover(
    scaledAmount,
    weights,
    registration,
    tempOverrides,
  );
};

export const depositAndRegister = async ({
  routerId,
  amount,
  spareWeights,
  registration,
  signer,
}: DepositAndRegisterArgs): Promise<DepositAndRegisterResponse> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  if (routerConfig.isVault) {
    throw new Error('Deposit not supported for vaults.');
  }

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  // Get token address
  const tokenId = await mellowRouter.token();

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
  const tx = await getTransaction(mellowRouter, isETH, scaledAmount, weights, registration);
  const receipt = await tx.wait();

  // Get the next state of the router
  const userAddress = await signer.getAddress();
  const routerInfo = await getOptimiserInfo(routerId, userAddress);

  // Return the response
  return {
    transaction: {
      receipt,
    },
    newRouterState: routerInfo,
  };
};
