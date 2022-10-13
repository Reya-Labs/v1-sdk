import { BigNumber, BigNumberish, Contract } from 'ethers';
import { getSwapResult, SwapParams } from '../flows/swap';

// simulate large swap to get the maximum available notional
export const getMaxAvailableNotional = async ({
  periphery,
  marginEngineAddress,
  isFT,
  tokenScaler,
  tokenDescaler,
}: {
  periphery: Contract;
  marginEngineAddress: string;
  isFT: boolean;
  tokenScaler: (amount: number) => BigNumber;
  tokenDescaler: (amount: BigNumberish) => number;
}): Promise<number> => {
  const fullSwapPeripheryParams: SwapParams = {
    marginEngine: marginEngineAddress,
    isFT,
    notional: tokenScaler(1000000000000000),
    marginDelta: 0,
    tickLower: 0,
    tickUpper: 60,
    sqrtPriceLimitX96: 0,
  };

  const fullSwapResults = await getSwapResult({
    periphery,
    params: fullSwapPeripheryParams,
    tokenDescaler,
  });

  return fullSwapResults.availableNotional;
};
