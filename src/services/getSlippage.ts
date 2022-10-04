import { tickToFixedRate } from '../utils/tickHandling';

export const getSlippage = (tickBefore: number, tickAfter: number): number => {
  const fixedRateBefore = tickToFixedRate(tickBefore);
  const fixedRateAfter = tickToFixedRate(tickAfter);
  return Math.abs(fixedRateAfter - fixedRateBefore);
};
