import { BigNumber, providers } from 'ethers';

export type AMMConstructorArgs = {
  id: string;
  provider: providers.Provider;

  factoryAddress: string;
  vammAddress: string;
  marginEngineAddress: string;
  rateOracleAddress: string;
  underlyingTokenAddress: string;

  termStartTimestamp: BigNumber;
  termEndTimestamp: BigNumber;

  rateOracleID: number;

  tick: number;
  tickSpacing: number;
};