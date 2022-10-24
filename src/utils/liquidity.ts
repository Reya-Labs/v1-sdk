import { tickToSqrtPrice } from './tickHandling';

export const getLiquidityNotional = ({
  liquidity,
  tickLower,
  tickUpper,
}: {
  liquidity: number;
  tickLower: number;
  tickUpper: number;
}): number => {
  const sqrtPriceLow = tickToSqrtPrice(tickLower);
  const sqrtPriceHigh = tickToSqrtPrice(tickUpper);

  return liquidity * (sqrtPriceHigh - sqrtPriceLow);
};
