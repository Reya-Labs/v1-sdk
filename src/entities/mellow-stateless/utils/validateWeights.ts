import { sum } from '../../../utils/functions';

export const validateWeights = (weights: number[]): boolean => {
  if (!weights.every((value) => Number.isInteger(value))) {
    // All values of default weights must be integer
    return false;
  }

  return sum(weights) === 100;
};
