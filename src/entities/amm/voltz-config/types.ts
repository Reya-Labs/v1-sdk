type PoolConfiguration = {
  name: string;
  id: string;
  show: {
    general: boolean;
    trader: boolean;
  };
  traderWithdrawable: boolean;
  minLeverageAllowed?: number;
  rollover?: string;
};

export type NetworkConfiguration = {
  factoryAddress: string;
  wethAddress: string;
  apply: boolean;
  defaultMinLeverageAllowed: number;
  pools: PoolConfiguration[];
};
