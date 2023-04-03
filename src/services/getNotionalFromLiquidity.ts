import { BigNumber } from 'ethers';
import { TickMath } from '../utils/tickMath';
import { Q96 } from '../constants';
import { Price } from '../entities/fractions/price';

export const getNotionalFromLiquidity = (
  liquidity: BigNumber,
  tickLower: number,
  tickUpper: number,
  decimals: number,
): number => {
  const sqrtPriceLowerX96 = new Price(Q96, TickMath.getSqrtRatioAtTick(tickLower));
  const sqrtPriceUpperX96 = new Price(Q96, TickMath.getSqrtRatioAtTick(tickUpper));

  return sqrtPriceUpperX96
    .subtract(sqrtPriceLowerX96)
    .multiply(liquidity.toString())
    .divide(Price.fromNumber(10 ** decimals))
    .toNumber();
};
