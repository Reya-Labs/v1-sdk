import JSBI from 'jsbi';
import { BigNumberish, ethers } from 'ethers';
import { BrowserClient } from '@sentry/browser';

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

export enum SupportedNetworksEnum {
  mainnet = 1,
  goerli = 5,
  arbitrum = 42161,
  arbitrumGoerli = 421613,
}

export type InitArgs = {
  network: SupportedNetworksEnum;
  alchemyApiKey: string;
};

export enum SubgraphURLEnum {
  voltzProtocol = 1,
  // more to be added once SBT will be integrated
}

export type SDKStorage = {
  network: SupportedNetworksEnum | null;
  provider: ethers.providers.JsonRpcProvider | null;
  subgraphURLs: { [key in SubgraphURLEnum]: string } | null;
  sentryTracker: BrowserClient | null;
};
