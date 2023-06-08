import JSBI from 'jsbi';
import { BigNumberish } from 'ethers';

export type BigIntish = JSBI | string | number;

export enum TradeType {
  FIXED_TAKER,
  VARIABLE_TAKER,
}

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export type SwapPeripheryParams = {
  marginEngine: string;
  isFT: boolean;
  notional: BigNumberish;
  sqrtPriceLimitX96: BigNumberish;
  tickLower: BigNumberish;
  tickUpper: BigNumberish;
  marginDelta: BigNumberish;
};

export type MintOrBurnParams = {
  marginEngine: string;
  tickLower: BigNumberish;
  tickUpper: BigNumberish;
  notional: BigNumberish;
  isMint: boolean;
  marginDelta: BigNumberish;
};

export enum SupportedChainId {
  mainnet = 1,
  goerli = 5,
  arbitrum = 42161,
  arbitrumGoerli = 421613,
  avalanche = 43114,
  avalancheFuji = 43113,
  spruce = 424242,
}

export enum SubgraphURLEnum {
  voltzProtocol = 1,
  badgesCurrentSeasonNoIPFS = 2,
  badgesRollingSeason = 3,
}
