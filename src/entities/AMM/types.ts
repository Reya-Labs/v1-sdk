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

export type InfoPostSwap = {
  marginRequirement: number;
  availableNotional: number;
  fee: number;
  slippage: number;
  averageFixedRate: number;
  fixedTokenDelta: number;
  variableTokenDelta: number;
  fixedTokenDeltaUnbalanced: number;
  maxAvailableNotional?: number;
};

export type InfoPostMintOrBurn = {
  marginRequirement: number;
};
