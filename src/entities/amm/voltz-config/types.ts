export type PoolConfiguration = {
  name: string;
  id: string;
  show: {
    general: boolean;
    trader: boolean;
  };
  traderWithdrawable: boolean;
  minLeverageAllowed?: number;
  rollover?: string;
  isAaveV3?: boolean;
};

export type NetworkConfiguration = {
  factoryAddress: string;
  peripheryAddress: string;
  wethAddress: string;
  apply: boolean;
  defaultMinLeverageAllowed: number;
  pools: PoolConfiguration[];
};
