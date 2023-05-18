import { ethers } from 'ethers';
import { Erc20RootVaultABI, IERC20MinimalABI, MellowLensContractABI } from '../../../../ABIs';
import { getProvider } from '../../../../init';
import { getTokenInfo } from '../../../../services/getTokenInfo';
import { sum } from '../../../../utils/functions';
import { exponentialBackoff } from '../../../../utils/retry';
import { descale } from '../../../../utils/scaling';
import { closeOrPastMaturity } from '../../config/utils';
import { getMellowConfig } from '../../config/config';
import { getOptimiserConfig } from '../../utils/getOptimiserConfig';
import { OptimiserInfo, VaultInfo } from '../types';
import { SupportedChainId } from '../../../../types';

export const getVaultInfo = async (
  optimiserId: string,
  userAddress: string,
  chainId: SupportedChainId,
  alchemyApiKey: string,
  infuraApiKey: string,
): Promise<OptimiserInfo> => {
  const vaultConfig = getOptimiserConfig(chainId, optimiserId);
  const { MELLOW_LENS } = getMellowConfig(chainId);
  const provider = getProvider(chainId, alchemyApiKey, infuraApiKey);
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

  // Get latest maturity and decide whether the entire optimiser is expired or not
  const latestMaturityInMS: number = (
    await exponentialBackoff(() => mellowLensContract.getVaultMaturity(vaultAddress))
  ).toNumber();
  const expired = closeOrPastMaturity(latestMaturityInMS);

  // Decide whether the vault is depositable or not
  const depositable = !expired && !vaultConfig.deprecated;

  // Get underlying pool of the optimiser
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
    optimiserId: vaultConfig.optimiser,

    soon: vaultConfig.soon,
    title: vaultConfig.title,
    description: vaultConfig.description,

    underlyingPools,

    tokenId,
    tokenName,

    expired,
    depositable,

    autorolloverGasCostInUSD: 0,
    canRegisterUnregister: false,

    feePerDeposit: 0,
    feePerDepositUSD: 0,
    accumulatedFees: 0,
    accumulatedFeesUSD: 0,
    pendingDepositsCount: 0,

    userWalletBalance,

    userOptimiserDeposit: sum(vaults.map((vault) => vault.userVaultDeposit)),
    userOptimiserCommittedDeposit: sum(vaults.map((vault) => vault.userVaultCommittedDeposit)),
    userOptimiserPendingDeposit: sum(vaults.map((vault) => vault.userVaultPendingDeposit)),
    isUserRegisteredForAutoRollover: false,

    vaults,
  };
};
