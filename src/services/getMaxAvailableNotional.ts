import { Contract } from 'ethers';
import { SwapPeripheryParams } from '../types';
import { scale } from '../utils/scaling';
import { getSwapResult } from './swap';

// simulate large swap to get the maximum available notional
export const getMaxAvailableNotional = async ({
  periphery,
  marginEngineAddress,
  isFT,
  tokenDecimals,
}: {
  periphery: Contract;
  marginEngineAddress: string;
  isFT: boolean;
  tokenDecimals: number;
}): Promise<number> => {
  const fullSwapPeripheryParams: SwapPeripheryParams = {
    marginEngine: marginEngineAddress,
    isFT,
    notional: scale(1000000000000000, tokenDecimals),
    marginDelta: 0,
    tickLower: 0,
    tickUpper: 60,
    sqrtPriceLimitX96: 0,
  };

  const fullSwapResults = await getSwapResult({
    periphery,
    args: fullSwapPeripheryParams,
    tokenDecimals,
  });

  return fullSwapResults.availableNotional;
};
