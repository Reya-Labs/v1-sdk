import { ethers } from 'ethers';
import { Erc20RootVaultABI, IERC20MinimalABI, MellowLensContractABI } from '../../../../ABIs';
import { getProvider } from '../../../../init';
import { getTokenInfo } from '../../../../services/getTokenInfo';
import { sum } from '../../../../utils/functions';
import { exponentialBackoff } from '../../../../utils/retry';
import { descale } from '../../../../utils/scaling';
import { closeOrPastMaturity } from '../../config/utils';
import { getMellowConfig } from '../../config/config';
import { getRouterConfig } from '../../utils/getRouterConfig';
import { RouterInfo, VaultInfo } from '../types';

export const getVaultInfo = async (routerId: string, userAddress: string): Promise<RouterInfo> => {
  const vaultConfig = getRouterConfig(routerId);
  const { MELLOW_LENS } = getMellowConfig();
  const provider = getProvider();
  const vaultAddress = vaultConfig.vaults[0].address;

  // Get Mellow Lens Contract
  const mellowLensContract = new ethers.Contract(MELLOW_LENS, MellowLensContractABI, provider);

  // Get ERC20 vault contract
  const erc20RootVault = new ethers.Contract(vaultAddress, Erc20RootVaultABI, provider);

  // Get token information
  const tokenId: string = (await exponentialBackoff(() => erc20RootVault.vaultTokens()))[0];
  const { name: tokenName, decimals: tokenDecimals } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  // Get ERC20 vault contract
  const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, provider);

  // Get latest maturity and decide whether the entire router is expired or not
  const latestMaturityInMS: number = await exponentialBackoff(() =>
    mellowLensContract.getVaultMaturity(vaultAddress),
  );
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
    await exponentialBackoff(() =>
      isETH ? provider.getBalance(userAddress) : tokenContract.balanceOf(userAddress),
    ),
    tokenDecimals,
  );

  // Get user deposits on this vault
  let userVaultCommittedDeposit = 0;

  const lpTokens = await exponentialBackoff(() => erc20RootVault.balanceOf(userAddress));
  const totalLpTokens = await exponentialBackoff(() => erc20RootVault.totalSupply());
  const tvl = await exponentialBackoff(() => erc20RootVault.tvl());

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
      withdrawable: vaultConfig.vaults[0].withdrawable,
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

    tokenName,

    expired,
    depositable,

    feePerDeposit: 0,
    accumulatedFees: 0,
    pendingDepositsCount: 0,

    userWalletBalance,

    userRouterDeposit: sum(vaults.map((vault) => vault.userVaultDeposit)),
    userRouterCommittedDeposit: sum(vaults.map((vault) => vault.userVaultCommittedDeposit)),
    userRouterPendingDeposit: sum(vaults.map((vault) => vault.userVaultPendingDeposit)),
    isUserRegisteredForAutoRollover: false,

    vaults,
  };
};
