import { ethers, BigNumber } from 'ethers';
import { Erc20RootVaultABI, MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getProvider } from '../../../init';
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
  newRouterState: RouterInfo;
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
    // TODO: add sentry
    throw new Error('Router ID not found');
  }

  const routerVaultIds = routerConfig.vaults.map((v) => v.address);
  const vaultIndex = routerVaultIds.findIndex((item) => item === vaultId);
  if (vaultIndex < 0) {
    // Add Sentry
    throw new Error('Vault ID not found.');
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
    await mellowRouter.callStatic.claimLPTokens(vaultIndex, [minTokenAmounts], vaultsOptions);
  } catch (err) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful claimLPTokens simulation.');
  }

  const gasLimit = await mellowRouter.estimateGas.claimLPTokens(
    vaultIndex,
    [minTokenAmounts],
    vaultsOptions,
  );

  const tx = await mellowRouter.claimLPTokens(vaultIndex, [minTokenAmounts], vaultsOptions, {
    gasLimit: getGasBuffer(gasLimit),
  });

  return tx.wait();
};

const vaultWithdraw = async ({
  vaultId,
  signer,
}: WithdrawArgs): Promise<ethers.ContractReceipt> => {
  const provider = getProvider();

  // Get ERC20 vault contract
  const erc20RootVault = new ethers.Contract(vaultId, Erc20RootVaultABI, provider);

  // Get the balance of LP tokens
  const userAddress = await signer.getAddress();
  const lpTokens = erc20RootVault.balanceOf(userAddress);

  // Get the number of subvaults to input the correct vault options
  const subvaultsCount: number = (await erc20RootVault.subvaultNfts()).length;

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
    // TODO: Add Sentry
    throw new Error('Unsuccessful withdrawal simulation.');
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

  return tx.wait();
};

export const withdraw = async (params: WithdrawArgs): Promise<WithdrawResponse> => {
  const { routerId, signer } = params;

  // Get Mellow Config
  const routerConfig = getRouterConfig(params.routerId);

  const receipt = await (routerConfig.isVault ? vaultWithdraw(params) : routerWithdraw(params));

  // Get the next state of the router
  const userAddress = await signer.getAddress();
  const routerInfo = await getMellowProduct({
    routerId,
    userAddress,
  });

  // Return the response
  return {
    transaction: {
      receipt,
    },
    newRouterState: routerInfo,
  };
};
