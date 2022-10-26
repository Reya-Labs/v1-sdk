import { BigNumber, providers } from 'ethers';

export type AMMConstructorArgs = {
  id: string;
  provider: providers.Provider;

  factoryAddress: string;
  vammAddress: string;
  marginEngineAddress: string;
  rateOracleAddress: string;
  underlyingTokenAddress: string;

  termStartTimestampWad: BigNumber;
  termEndTimestampWad: BigNumber;

  rateOracleID: number;

  tick: number;
  tickSpacing: number;
};

export type SwapInfo = {
  marginRequirement: number;
  availableNotional: number;
  fee: number;
  slippage: number;
  averageFixedRate: number;
  fixedTokenDelta: number;
  variableTokenDelta: number;
  fixedTokenDeltaUnbalanced: number;
  maxAvailableNotional?: number;
  estimatedPnL: (predictedAPY: number) => number;
};

export type MintOrBurnInfo = {
  marginRequirement: number;
};
