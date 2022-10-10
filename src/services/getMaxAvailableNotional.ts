import { Contract } from 'ethers';
import { scale } from '../utils/scaling';
import { getSwapResult, SwapParams } from '../flows/swap';

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
  const fullSwapPeripheryParams: SwapParams = {
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
    params: fullSwapPeripheryParams,
    tokenDecimals,
  });

  return fullSwapResults.availableNotional;
};
