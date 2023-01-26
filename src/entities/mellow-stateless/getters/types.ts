import { BigNumber } from 'ethers';

export type ContractOptimiserInfo = {
  token: string;
  feePerDeposit: BigNumber;
  accumulatedFees: BigNumber;
  pendingDepositsCount: BigNumber;
  tokenBalance: BigNumber;
  ethBalance: BigNumber;
  isRegisteredForAutoRollover: boolean;
  erc20RootVaults: {
    rootVault: string;
    latestMaturity: BigNumber;
    vaultCompleted: boolean;
    vaultPaused: boolean;
    pendingUserDeposit: BigNumber;
    committedUserDeposit: BigNumber;
    canWithdrawOrRollover: boolean;
  }[];
};

export type VaultInfo = {
  // The address of the ERC20 root vault
  vaultId: string;

  // The underlying pools (e.g. Aave - USDC Lend)
  pools: string[];

  // Estimated historic APY
  estimatedHistoricApy: [number, number];

  // Default weight
  defaultWeight: number;

  // Maturity in milliseconds
  maturityTimestampMS: number;

  // Are withdrawals allowed for this vault?
  withdrawable: boolean;

  // Are rollovers allowed for this vault?
  rolloverable: boolean;

  // Overall vault deposit (in underlying token)
  userVaultCommittedDeposit: number;

  // Committed (transferred) vault deposit (in underlying token)
  userVaultPendingDeposit: number;

  // Pending vault deposit (in underlying token)
  userVaultDeposit: number;

  // Can user withdraw or rollover vault? (autorollover related)
  canUserManageVault: boolean;
};

export type OptimiserInfo = {
  // The address of the optimiser
  optimiserId: string;

  // Is the optimiser available soon?
  soon: boolean;

  // Title of the optimiser (e.g. Optimiser)
  title: string;

  // Description of the optimiser
  description: string;

  // Unique underlying pools of the vaults (e.g. Aave - USDC Lend)
  underlyingPools: string[];

  // The address and name of the token
  tokenId: string;
  tokenName: string;

  // The optimiser is expired when all its underlying vaults have matured
  expired: boolean;

  // Are deposits allowed in this optimiser?
  depositable: boolean;

  // Fee per deposit for batching (both in underlying token and USD)
  feePerDeposit: number;
  feePerDepositUSD: number;

  // Accumulated fees for batching (both in underlying token and USD)
  accumulatedFees: number;
  accumulatedFeesUSD: number;

  // Number of pending deposits in the optimiser
  pendingDepositsCount: number;

  // User Wallet Balance
  userWalletBalance: number;

  // Overall optimiser deposit (in underlying token)
  userOptimiserDeposit: number;

  // Committed (transferred) optimiser deposit (in underlying token)
  userOptimiserCommittedDeposit: number;

  // Pending optimiser deposit (in underlying token)
  userOptimiserPendingDeposit: number;

  // Is the user registered for auto rollover?
  isUserRegisteredForAutoRollover: boolean;

  // Information about the underlying vaults
  vaults: VaultInfo[];
};
