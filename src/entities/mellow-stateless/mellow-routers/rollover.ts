import { ethers, BigNumber } from 'ethers';
import { Erc20RootVaultABI, MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getMellowConfig } from '../config/config';
import { validateWeights } from '../utils/validateWeights';

type RolloverArgs = {
  routerId: string;
  vaultId: string;
  weights: [string, number][];
  signer: ethers.Signer;
};

export const rollover = async ({
  routerId,
  vaultId,
  weights,
  signer,
}: RolloverArgs): Promise<ethers.ContractReceipt> => {
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
  const vaultIndex = routerVaultIds.findIndex((item) => item === vaultId);
  if (vaultIndex < 0) {
    // Add Sentry
    throw new Error('Vault ID not found.');
  }

  const allWeights = routerVaultIds.map((routerVaultId) => {
    const weight = weights.find((w) => w[0] === routerVaultId);
    return weight ? weight[1] : 0;
  });

  if (validateWeights(allWeights)) {
    // TODO: add sentry
    throw new Error('Weights are invalid');
  }

  const erc20RootVaultContract = new ethers.Contract(
    routerVaultIds[vaultIndex],
    Erc20RootVaultABI,
    signer,
  );

  const subvaultsCount: number = (await erc20RootVaultContract.subvaultNfts()).length;

  const minTokenAmounts = BigNumber.from(0);
  const vaultsOptions = new Array(subvaultsCount).fill(0x0);

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowRouter.callStatic.rolloverLPTokens(
      vaultIndex,
      [minTokenAmounts],
      vaultsOptions,
      weights,
    );
  } catch (err) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful rolloverLPTokens simulation.');
  }

  const gasLimit = await mellowRouter.estimateGas.rolloverLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
    weights,
  );

  const tx = await mellowRouter.rolloverLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
    weights,
    {
      gasLimit: getGasBuffer(gasLimit),
    },
  );

  const receipt = await tx.wait();
  return receipt;
};
