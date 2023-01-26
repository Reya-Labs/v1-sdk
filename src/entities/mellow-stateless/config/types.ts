type VaultInfo = {
  address: string;
  weight: number;
  pools: string[];
  estimatedHistoricApy: [number, number];
  withdrawable: boolean;
};

export type MellowOptimiser = {
  isVault: boolean;

  optimiser: string;
  show: boolean;
  soon: boolean;
  deprecated: boolean;
  title: string;
  description: string;
  vaults: VaultInfo[];
};

export type NetworkConfiguration = {
  MELLOW_LENS: string;
  MELLOW_OPTIMISERS: MellowOptimiser[];
};
