import { ethers } from 'ethers';
import { getMellowConfig } from '../config/config';
import { closeOrPastMaturity } from '../config/utils';
import { getTokenInfo } from '../../../services/getTokenInfo';
import { descale } from '../../../utils/scaling';
import { sum } from '../../../utils/functions';
import { ZERO_ADDRESS } from '../../../constants';
import { getProvider } from '../../../init';
import { ContractRouterInfo, RouterInfo, VaultInfo } from './types';
import { Erc20RootVaultABI, IERC20MinimalABI, MellowLensContractABI } from '../../../ABIs';

const mapRouter = (
  routerConfig: ReturnType<typeof getMellowConfig>['MELLOW_ROUTERS'][0],
  optimiserContractInfo: ContractRouterInfo,
): RouterInfo => {
  // Get token information
  const tokenId = optimiserContractInfo.token;
  const { name: tokenName, decimals: tokenDecimals } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  // Get latest maturity and decide whether the entire router is expired or not
  const latestMaturityInMS = Math.max(
    ...optimiserContractInfo.erc20RootVaults.map((v) => v.latestMaturity.toNumber() * 1000),
  );
  const expired = closeOrPastMaturity(latestMaturityInMS);

  // Decide whether the vault is depositable or not
  const depositable = !expired && !routerConfig.deprecated;

  // Get underlying pool of the router
  const underlyingPools = routerConfig.vaults.reduce((allPools, currentVault) => {
    if (currentVault.weight > 0) {
      const appendingPools = currentVault.pools.filter((p) => !allPools.includes(p));
      return [...allPools, ...appendingPools];
    }
    return allPools;
  }, [] as string[]);

  // Get user wallet balance
  const userWalletBalance = descale(
    isETH ? optimiserContractInfo.ethBalance : optimiserContractInfo.tokenBalance,
    tokenDecimals,
  );

  // Get information about the underlying vaults
  const vaultsContractInfo = optimiserContractInfo.erc20RootVaults;

  // Check if the on-chain data corresponds to the config file
  if (routerConfig.vaults.length > vaultsContractInfo.length) {
    throw new Error('Configuration has more vaults than on-chain.');
  }

  for (let i = 0; i < routerConfig.vaults.length; i++) {
    if (
      routerConfig.vaults[i].address.toLowerCase() !== vaultsContractInfo[i].rootVault.toLowerCase()
    ) {
      throw new Error(`Vault ${i} address doesn't correspond to on-chain vault`);
    }
  }

  // Get vault information
  const vaults = routerConfig.vaults.map((vaultConfig, vaultIndex): VaultInfo => {
    const vaultContractInfo = vaultsContractInfo[vaultIndex];

    // Get maturity timestamp
    const maturityTimestampMS = vaultContractInfo.latestMaturity.toNumber() * 1000;

    // Get user deposits on this vault
    const userVaultCommittedDeposit = descale(
      vaultContractInfo.committedUserDeposit,
      tokenDecimals,
    );
    const userVaultPendingDeposit = descale(vaultContractInfo.pendingUserDeposit, tokenDecimals);
    const userVaultDeposit = userVaultCommittedDeposit + userVaultPendingDeposit;

    // Build the vault information
    return {
      vaultId: vaultContractInfo.rootVault,

      pools: vaultConfig.pools,
      estimatedHistoricApy: vaultConfig.estimatedHistoricApy,
      defaultWeight: closeOrPastMaturity(maturityTimestampMS) ? 0 : vaultConfig.weight,

      maturityTimestampMS,
      withdrawable: vaultConfig.withdrawable && vaultContractInfo.canWithdrawOrRollover,
      rolloverable: vaultConfig.withdrawable && vaultContractInfo.canWithdrawOrRollover,

      userVaultCommittedDeposit,
      userVaultPendingDeposit,
      userVaultDeposit,

      canUserManageVault: vaultContractInfo.canWithdrawOrRollover,
    };
  });

  return {
    routerId: routerConfig.router,

    soon: routerConfig.soon,
    title: routerConfig.title,
    description: routerConfig.description,

    underlyingPools,

    tokenId,

    expired,
    depositable,

    userWalletBalance,

    userRouterDeposit: sum(vaults.map((vault) => vault.userVaultDeposit)),
    userRouterCommittedDeposit: sum(vaults.map((vault) => vault.userVaultCommittedDeposit)),
    userRouterPendingDeposit: sum(vaults.map((vault) => vault.userVaultPendingDeposit)),
    isUserRegisteredForAutoRollover: optimiserContractInfo.isRegisteredForAutoRollover,

    vaults,
  };
};

const mapVault = async (
  vaultConfig: ReturnType<typeof getMellowConfig>['MELLOW_ROUTERS'][0],
  mellowLensContract: ethers.Contract,
  userAddress: string,
): Promise<RouterInfo> => {
  const provider = getProvider();
  const vaultAddress = vaultConfig.vaults[0].address;

  // Get ERC20 vault contract
  const erc20RootVault = new ethers.Contract(vaultAddress, Erc20RootVaultABI, provider);

  // Get token information
  const tokenId: string = (await erc20RootVault.vaultTokens())[0];
  const { name: tokenName, decimals: tokenDecimals } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  // Get ERC20 vault contract
  const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, provider);

  // Get latest maturity and decide whether the entire router is expired or not
  const latestMaturityInMS: number = await mellowLensContract.getVaultMaturity(vaultAddress);
  const expired = closeOrPastMaturity(latestMaturityInMS);

  // Decide whether the vault is depositable or not
  const depositable = !expired && !vaultConfig.deprecated;

  // Get underlying pool of the router
  const underlyingPools = vaultConfig.vaults.reduce((allPools, currentVault) => {
    if (currentVault.weight > 0) {
      const appendingPools = currentVault.pools.filter((p) => !allPools.includes(p));
      return [...allPools, ...appendingPools];
    }
    return allPools;
  }, [] as string[]);

  // Get user wallet balance
  const userWalletBalance: number = descale(
    isETH ? await provider.getBalance(userAddress) : await tokenContract.balanceOf(userAddress),
    tokenDecimals,
  );

  // Get user deposits on this vault
  let userVaultCommittedDeposit = 0;

  const lpTokens = await erc20RootVault.balanceOf(userAddress);
  const totalLpTokens = await erc20RootVault.totalSupply();
  const tvl = await erc20RootVault.tvl();

  if (totalLpTokens.gt(0)) {
    const userFunds = lpTokens.mul(tvl[0][0]).div(totalLpTokens);
    userVaultCommittedDeposit = descale(userFunds, tokenDecimals);
  }

  // Build the vault information
  const vaults: VaultInfo[] = [
    {
      vaultId: vaultConfig.vaults[0].address,

      pools: vaultConfig.vaults[0].pools,
      estimatedHistoricApy: vaultConfig.vaults[0].estimatedHistoricApy,
      defaultWeight: closeOrPastMaturity(latestMaturityInMS) ? 0 : vaultConfig.vaults[0].weight,

      maturityTimestampMS: latestMaturityInMS,
      withdrawable: true,
      rolloverable: false,

      userVaultCommittedDeposit,
      userVaultPendingDeposit: 0,
      userVaultDeposit: userVaultCommittedDeposit,

      canUserManageVault: true,
    },
  ];

  return {
    routerId: vaultConfig.router,

    soon: vaultConfig.soon,
    title: vaultConfig.title,
    description: vaultConfig.description,

    underlyingPools,

    tokenId,

    expired,
    depositable,

    userWalletBalance,

    userRouterDeposit: sum(vaults.map((vault) => vault.userVaultDeposit)),
    userRouterCommittedDeposit: sum(vaults.map((vault) => vault.userVaultCommittedDeposit)),
    userRouterPendingDeposit: sum(vaults.map((vault) => vault.userVaultPendingDeposit)),
    isUserRegisteredForAutoRollover: false,

    vaults,
  };
};

export const getAllMellowRouters = async (userAddress = ZERO_ADDRESS): Promise<RouterInfo[]> => {
  const config = getMellowConfig();
  const provider = getProvider();
  const vaultConfigs = config.MELLOW_ROUTERS.filter((r) => r.isVault);
  const routerConfigs = config.MELLOW_ROUTERS.filter((r) => !r.isVault);

  const mellowLensContract = new ethers.Contract(
    config.MELLOW_LENS,
    MellowLensContractABI,
    provider,
  );

  // Get routers
  const optimisersContractInfo: ContractRouterInfo[] = await mellowLensContract.getOptimisersInfo(
    routerConfigs.map((routerConfig) => routerConfig.router),
    true,
    userAddress,
  );
  const routers = routerConfigs.map((routerConfig, index) =>
    mapRouter(routerConfig, optimisersContractInfo[index]),
  );

  // Get vaults
  const vaults: RouterInfo[] = [];
  for (const vaultConfig of vaultConfigs) {
    vaults.push(await mapVault(vaultConfig, mellowLensContract, userAddress));
  }

  return vaults.concat(routers);
};

export const getMellowRouter = async ({
  routerId,
  userAddress = ZERO_ADDRESS,
}: {
  routerId: string;
  userAddress: string;
}): Promise<RouterInfo> => {
  const config = getMellowConfig();
  const provider = getProvider();

  const routerConfig = config.MELLOW_ROUTERS.find(
    (item) => item.router.toLowerCase() === routerId.toLowerCase(),
  );

  if (!routerConfig) {
    // TODO: add sentry
    throw new Error('Router ID not found');
  }

  if (!routerConfig.isVault) {
    // TODO: add sentry
    throw new Error('Router ID corresponds to Vault');
  }

  const mellowLensContract = new ethers.Contract(
    config.MELLOW_LENS,
    MellowLensContractABI,
    provider,
  );

  const optimisersContractInfo: ContractRouterInfo[] = await mellowLensContract.getOptimisersInfo(
    [routerConfig.router],
    true,
    userAddress,
  );

  const router = mapRouter(routerConfig, optimisersContractInfo[0]);

  return router;
};
