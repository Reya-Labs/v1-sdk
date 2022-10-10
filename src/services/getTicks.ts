import { MAX_FIXED_RATE, MIN_FIXED_RATE } from '../constants';
import { fixedRateToClosestTick } from '../utils/tickHandling';

export const getTicks = (tickSpacing: number) => {
  return ([fixedLow, fixedHigh]: [number, number]): [number, number] => {
    // sanity checks
    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    // tick conversions
    const tickUpper = fixedRateToClosestTick(fixedLow, tickSpacing);
    const tickLower = fixedRateToClosestTick(fixedHigh, tickSpacing);

    return [tickLower, tickUpper];
  };
};
