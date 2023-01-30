type VaultConfig = {
  address: string;
  weight: number;
  pools: string[];
  estimatedHistoricApy: [number, number];
  withdrawable: boolean;
};

export type OptimiserConfig = {
  isVault: boolean;

  optimiser: string;
  show: boolean;
  soon: boolean;
  deprecated: boolean;
  title: string;
  description: string;
  vaults: VaultConfig[];
};

export type NetworkConfiguration = {
  MELLOW_LENS: string;
  MELLOW_OPTIMISERS: OptimiserConfig[];
};
