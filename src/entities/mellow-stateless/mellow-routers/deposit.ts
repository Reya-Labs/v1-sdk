import { ethers, BigNumber } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getTokenInfo } from '../../../services/getTokenInfo';
import { scale } from '../../../utils/scaling';
import { getMellowConfig } from '../config/config';
import { validateWeights } from '../utils/validateWeights';

type DepositArgs = {
  routerId: string;
  tokenId: string;
  amount: number;
  weights: [string, number][];
  signer: ethers.Signer;
};

export const deposit = async ({
  routerId,
  tokenId,
  amount,
  weights,
  signer,
}: DepositArgs): Promise<ethers.ContractReceipt> => {
  const config = getMellowConfig();

  const routerConfig = config.MELLOW_ROUTERS.find(
    (item) => item.router.toLowerCase() === routerId.toLowerCase(),
  );

  if (!routerConfig) {
    // TODO: add sentry
    throw new Error('Router ID not found');
  }

  if (routerConfig.isVault) {
    throw new Error('Deposit not supported for vaults.');
  }

  const routerVaultIds = routerConfig.vaults.map((v) => v.address);
  const allWeights = routerVaultIds.map((routerVaultId) => {
    const weight = weights.find((w) => w[0] === routerVaultId);
    return weight ? weight[1] : 0;
  });

  if (validateWeights(allWeights)) {
    // TODO: add sentry
    throw new Error('Weights are invalid');
  }

  // Get the token decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  const scaledAmount = scale(amount, tokenDecimals);
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (isETH) {
    tempOverrides.value = scaledAmount;
  }

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  // Simulate deposit
  try {
    if (isETH) {
      await mellowRouter.callStatic.depositEth(weights, tempOverrides);
    } else {
      await mellowRouter.callStatic.depositErc20(scaledAmount, weights);
    }
  } catch (error) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful deposit simulation.');
  }

  // Estimate gas
  if (isETH) {
    const gasLimit = await mellowRouter.estimateGas.depositEth(weights, tempOverrides);
    tempOverrides.gasLimit = getGasBuffer(gasLimit);
  } else {
    const gasLimit = await mellowRouter.estimateGas.depositErc20(
      scaledAmount,
      weights,
      tempOverrides,
    );
    tempOverrides.gasLimit = getGasBuffer(gasLimit);
  }

  const tx = isETH
    ? await mellowRouter.depositEth(weights, tempOverrides)
    : await mellowRouter.depositErc20(scaledAmount, weights, tempOverrides);

  const receipt = await tx.wait();
  return receipt;
};
