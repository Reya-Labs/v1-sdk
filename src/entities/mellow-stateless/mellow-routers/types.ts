import { BigNumber } from 'ethers';

export type ContractRouterInfo = {
  token: string;
  tokenBalance: BigNumber;
  ethBalance: BigNumber;
  isRegisteredForAutoRollover: boolean;
  erc20RootVaults: {
    rootVault: string;
    latestMaturity: BigNumber;
    vaultDeprecated: boolean;
    pendingUserDeposit: BigNumber;
    committedUserDeposit: BigNumber;
    canWithdrawOrRollover: boolean;
  }[];
};

export type VaultInfo = {
  vaultId: string;

  pools: string[];
  estimatedHistoricApy: [number, number];
  defaultWeight: number;

  maturityTimestampMS: number;
  withdrawable: boolean;
  rolloverable: boolean;

  userVaultCommittedDeposit: number;
  userVaultPendingDeposit: number;
  userVaultDeposit: number;

  canUserManageVault: boolean;
};

export type RouterInfo = {
  routerId: string;

  soon: boolean;
  title: string;
  description: string;
  underlyingPools: string[];
  tokenId: string;

  expired: boolean;
  depositable: boolean;

  userWalletBalance: number;

  userRouterDeposit: number;
  userRouterCommittedDeposit: number;
  userRouterPendingDeposit: number;
  isUserRegisteredForAutoRollover: boolean;

  vaults: VaultInfo[];
};
