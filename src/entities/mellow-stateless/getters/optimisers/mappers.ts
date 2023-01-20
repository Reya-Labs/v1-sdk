import { getTokenInfo } from '../../../../services/getTokenInfo';
import { sum } from '../../../../utils/functions';
import { descale } from '../../../../utils/scaling';
import { closeOrPastMaturity } from '../../config';
import { getMellowConfig } from '../../config/config';
import { ContractRouterInfo, RouterInfo, VaultInfo } from '../types';

export const mapRouter = (
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
