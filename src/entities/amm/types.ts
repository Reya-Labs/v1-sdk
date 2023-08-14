import { providers, Signer } from 'ethers';
import { Price } from '../fractions/price';
import { Position } from '../position';
import { RateOracle } from '../rateOracle';
import Token from '../token';
import { SupportedChainId } from '../../types';

export type AMMConstructorArgs = {
  id: string;
  chainId: SupportedChainId;
  signer: Signer | null;
  provider: providers.Provider;

  peripheryAddress: string;
  factoryAddress: string;
  vammAddress: string;
  marginEngineAddress: string;
  rateOracle: RateOracle;
  underlyingToken: Token;

  termStartTimestampInMS: number;
  termEndTimestampInMS: number;

  tickSpacing: number;
  wethAddress: string;

  ethPrice?: () => Promise<number>;

  minLeverageAllowed: number;
  traderVisible: boolean;
  traderWithdrawable: boolean;

  isV2?: boolean;
  isPaused?: boolean;
  isSettlementAllowedWhenPaused?: boolean;

  fixedApr?: number;
  variableApy?: number;
  variableApy24Ago?: number;
};

// swap

export type AMMGetInfoPostSwapArgs = {
  position?: Position;
  isFT: boolean;
  notional: number;
  fixedRateLimit?: number;
  fixedLow: number;
  fixedHigh: number;
  margin?: number;
};

export type AMMSwapArgs = {
  isFT: boolean;
  notional: number;
  margin: number;
  fixedRateLimit?: number;
  fixedLow: number;
  fixedHigh: number;
  fullyCollateralisedVTSwap?: boolean;
};

export type InfoPostSwap = {
  marginRequirement: number;
  availableNotional: number;
  fee: number;
  slippage: number;
  averageFixedRate: number;
  fixedTokenDeltaBalance: number;
  variableTokenDeltaBalance: number;
  fixedTokenDeltaUnbalanced: number;
  maxAvailableNotional?: number;
};

export type InfoPostLp = {
  marginRequirement: number;
  maxMarginWithdrawable: number;
  gasFee: {
    value: number;
    token: 'ETH' | 'AVAX' | 'USDCf';
  };
};

export type InfoPostSwapV1 = {
  marginRequirement: number;
  maxMarginWithdrawable: number;
  fee: number;
  averageFixedRate: number;
  variableTokenDeltaBalance: number;
  gasFee: {
    value: number;
    token: 'ETH' | 'AVAX' | 'USDCf';
  };
};

export type ExpectedApyArgs = {
  margin: number;
  position?: Position;
  fixedLow: number;
  fixedHigh: number;
  fixedTokenDeltaUnbalanced: number;
  availableNotional: number;
  predictedVariableApy: number;
};

export type ExpectedApyInfo = {
  expectedApy: number;
  expectedCashflow: number;
};

// rollover with swap

export type AMMRolloverWithSwapArgs = {
  isFT: boolean;
  notional: number;
  margin: number;
  fixedRateLimit?: number;
  fixedLow: number;
  fixedHigh: number;
  newMarginEngine: string;
  rolloverPosition: {
    tickLower: number;
    tickUpper: number;
    settlementBalance: number;
  };
};

// lp

export type AMMLpArgs = {
  addLiquidity: boolean;
  fixedLow: number;
  fixedHigh: number;
  notional: number;
  margin: number;
};

export type AMMGetInfoPostLpArgs = {
  addLiquidity: boolean;
  fixedLow: number;
  fixedHigh: number;
  notional: number;
};

// mint

export type AMMMintArgs = {
  fixedLow: number;
  fixedHigh: number;
  notional: number;
  margin: number;
};

export type AMMGetInfoPostMintArgs = {
  fixedLow: number;
  fixedHigh: number;
  notional: number;
};

// rollover with swap

export type AMMRolloverWithMintArgs = {
  fixedLow: number;
  fixedHigh: number;
  notional: number;
  margin: number;
  newMarginEngine: string;
  rolloverPosition: {
    tickLower: number;
    tickUpper: number;
    settlementBalance: number;
  };
};

// burn

export type AMMBurnArgs = Omit<AMMMintArgs, 'margin'>;

// update position margin

export type AMMUpdatePositionMarginArgs = {
  owner?: string;
  fixedLow: number;
  fixedHigh: number;
  marginDelta: number;
};

// settlement

export type AMMSettlePositionArgs = {
  owner?: string;
  fixedLow: number;
  fixedHigh: number;
};

export enum HealthFactorStatus {
  NOT_FOUND = 0,
  DANGER = 1,
  WARNING = 2,
  HEALTHY = 3,
}

export type ClosestTickAndFixedRate = {
  closestUsableTick: number;
  closestUsableFixedRate: Price;
};

export type PoolSwapInfo = {
  availableNotionalFixedTaker: number;
  availableNotionalVariableTaker: number;
  maxLeverageFixedTaker: number;
  maxLeverageVariableTaker: number;
};

export type PoolLpInfo = {
  maxLeverage: number;
};

export type ExpectedCashflowArgs = {
  position: Position | undefined;
  prospectiveSwapAvgFixedRate: number;
  prospectiveSwapNotional: number;
};

export type ExpectedCashflowInfo = {
  averageFixedRate: number;
  accruedCashflowExistingPosition: number;
  accruedCashflowEditPosition: number;
  // Additional cashflow resulted from executing the prospective swap
  estimatedAdditionalCashflow: (estimatedApy: number) => number;
  // Total cashflow of resulting position
  estimatedTotalCashflow: (estimatedApy: number) => number;
};

export type InfoPostSettlePosition = {
  gasFee: {
    value: number;
    token: 'ETH' | 'AVAX' | 'USDCf';
  };
};
