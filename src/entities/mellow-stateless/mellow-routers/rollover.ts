import { ethers, BigNumber } from 'ethers';
import { Erc20RootVaultABI, MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { exponentialBackoff } from '../../../utils/retry';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { RouterInfo } from '../getters/types';
import { getRouterConfig } from '../utils/getRouterConfig';
import { mapWeights } from '../utils/mapWeights';

type RolloverArgs = {
  routerId: string;
  vaultId: string;
  spareWeights: [string, number][];
  signer: ethers.Signer;
};

type RolloverResponse = {
  transaction: {
    receipt: ethers.ContractReceipt;
  };
  newRouterState: RouterInfo;
};

export const rollover = async ({
  routerId,
  vaultId,
  spareWeights,
  signer,
}: RolloverArgs): Promise<RolloverResponse> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  // Rollover is only allowed for routers
  if (routerConfig.isVault) {
    throw new Error('Deposit not supported for vaults.');
  }

  // Get Router contract
  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  // Get the index of the specified vault
  const routerVaultIds = routerConfig.vaults.map((v) => v.address);
  const vaultIndex = routerVaultIds.findIndex((item) => item === vaultId);
  if (vaultIndex < 0) {
    // Add Sentry
    throw new Error('Vault ID not found.');
  }

  // Get the Vault Contract
  const erc20RootVaultContract = new ethers.Contract(
    routerVaultIds[vaultIndex],
    Erc20RootVaultABI,
    signer,
  );

  // Map spare weights to array
  const weights = mapWeights(
    routerConfig.vaults.map((v) => v.address),
    spareWeights,
  );

  // Build the parameters
  const subvaultsCount: number = (
    await exponentialBackoff(() => erc20RootVaultContract.subvaultNfts())
  ).length;

  const minTokenAmounts = BigNumber.from(0);
  const vaultsOptions = new Array(subvaultsCount).fill(0x0);

  // Simulate the transaction
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

  // Get the gas limit
  const gasLimit = await mellowRouter.estimateGas.rolloverLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
    weights,
  );

  // Send the transaction
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
