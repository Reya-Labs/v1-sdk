import { BigNumber } from 'ethers';

export interface SwapPeripheryParams {
  marginEngineAddress: string;
  recipient: string;
  isFT: boolean;
  notional: BigNumber;
  sqrtPriceLimitX96: BigNumber;
  tickLower: number;
  tickUpper: number;
}
