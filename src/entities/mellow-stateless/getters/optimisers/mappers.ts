import { ethers } from 'ethers';
import { getTokenInfo } from '../../../../services/getTokenInfo';
import { sum } from '../../../../utils/functions';
import { descale } from '../../../../utils/scaling';
import { closeOrPastMaturity } from '../../config/utils';
import { getMellowConfig } from '../../config/config';
import { ContractOptimiserInfo, OptimiserInfo, VaultInfo } from '../types';
import { geckoEthToUsd } from '../../../../utils/priceFetch';
import { MellowMultiVaultRouterABI } from '../../../../ABIs';
import { convertGasUnitsToUSD } from '../../../../utils/mellowHelpers/convertGasUnitsToUSD';
import { getProvider } from '../../../../init';

export const mapOptimiser = async (
  optimiserConfig: ReturnType<typeof getMellowConfig>['MELLOW_OPTIMISERS'][0],
  optimiserContractInfo: ContractOptimiserInfo,
  signer: ethers.Signer | null,
): Promise<OptimiserInfo> => {
  const provider = getProvider();

  // Get token information
  const tokenId = optimiserContractInfo.token;
  const { name: tokenName, decimals: tokenDecimals } = getTokenInfo(tokenId);
  const isETH = tokenName === 'ETH';

  // Get latest maturity and decide whether the entire optimiser is expired or not
  const latestMaturityInMS = Math.max(
    ...optimiserContractInfo.erc20RootVaults.map((v) => v.latestMaturity.toNumber() * 1000),
  );
  const expired = closeOrPastMaturity(latestMaturityInMS);

  // Decide whether the vault is depositable or not
  const depositable = !expired && !optimiserConfig.deprecated;

  // Get underlying pool of the optimiser
  const underlyingPools = optimiserConfig.vaults.reduce((allPools, currentVault) => {
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
  if (optimiserConfig.vaults.length > vaultsContractInfo.length) {
    throw new Error('Configuration has more vaults than on-chain.');
  }

  for (let i = 0; i < optimiserConfig.vaults.length; i++) {
    if (
      optimiserConfig.vaults[i].address.toLowerCase() !==
      vaultsContractInfo[i].rootVault.toLowerCase()
    ) {
      throw new Error(`Vault ${i} address doesn't correspond to on-chain vault`);
    }
  }

  // Get batch submission fees
  const feePerDeposit = descale(optimiserContractInfo.feePerDeposit, tokenDecimals);
  const accumulatedFees = descale(optimiserContractInfo.accumulatedFees, tokenDecimals);
  const pendingDepositsCount = descale(optimiserContractInfo.pendingDepositsCount, tokenDecimals);

  // Get vault information
  const vaults = optimiserConfig.vaults.map((vaultConfig, vaultIndex): VaultInfo => {
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

  const underlyingPrice =
    tokenName === 'ETH' ? await geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || '') : 1;

  let gasEstimateUsd = 0;
  let canRegisterUnregister = false;

  if (signer) {
    try {
      const mellowOptimiser = new ethers.Contract(
        optimiserConfig.optimiser,
        MellowMultiVaultRouterABI,
        signer,
      );

      const gasLimit = await mellowOptimiser.estimateGas.registerForAutoRollover(
        !optimiserContractInfo.isRegisteredForAutoRollover,
      );

      gasEstimateUsd = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

      canRegisterUnregister = true;
    } catch (_) {}
  }

  return {
    optimiserId: optimiserConfig.optimiser,

    feePerDeposit,
    feePerDepositUSD: feePerDeposit * underlyingPrice,

    accumulatedFees,
    accumulatedFeesUSD: accumulatedFees * underlyingPrice,

    pendingDepositsCount,

    soon: optimiserConfig.soon,
    title: optimiserConfig.title,
    description: optimiserConfig.description,

    underlyingPools,

    tokenId,
    tokenName,

    expired,
    depositable,

    autorolloverGasCostInUSD: gasEstimateUsd,
    canRegisterUnregister,

    userWalletBalance,

    userOptimiserDeposit: sum(vaults.map((vault) => vault.userVaultDeposit)),
    userOptimiserCommittedDeposit: sum(vaults.map((vault) => vault.userVaultCommittedDeposit)),
    userOptimiserPendingDeposit: sum(vaults.map((vault) => vault.userVaultPendingDeposit)),
    isUserRegisteredForAutoRollover: optimiserContractInfo.isRegisteredForAutoRollover,

    vaults,
  };
};
