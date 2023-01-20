type VaultInfo = {
  address: string;
  weight: number;
  pools: string[];
  estimatedHistoricApy: [number, number];
  withdrawable: boolean;
};

export type MellowRouter = {
  isVault: boolean;

  router: string;
  show: boolean;
  soon: boolean;
  deprecated: boolean;
  title: string;
  description: string;
  vaults: VaultInfo[];
};

export type NetworkConfiguration = {
  MELLOW_LENS: string;
  MELLOW_ROUTERS: MellowRouter[];
};
