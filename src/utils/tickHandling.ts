// import { BigNumber, ethers } from 'ethers';

const BASE = 1.0001;

export const fixedRateToClosestTick = (fixedRate: number, tickSpacing: number): number => {
  const tick = -Math.log(fixedRate) / Math.log(BASE);
  const closestTick = Math.floor(tick / tickSpacing) * tickSpacing;
  return closestTick;
};

export const tickToFixedRate = (tick: number): number => {
  const fixedRate = BASE ** -tick;
  return fixedRate;
};

export const tickToSqrtPrice = (tick: number): number => {
  const sqrtPrice = BASE ** (tick / 2);
  return sqrtPrice;
};

// export const tickToSqrtPriceX96 = (tick: number): BigNumber => {
//   const sqrtPrice = tickToSqrtPrice(tick);
//   const sqrtPriceWad = BigNumber.from(ethers.utils.formatUnits(sqrtPrice, 18));
//   const sqrtPriceX96 = sqrtPriceWad.mul(BigNumber.from(2).pow(96)).div(BigNumber.from(10).pow(18));

//   return sqrtPriceX96;
// };
