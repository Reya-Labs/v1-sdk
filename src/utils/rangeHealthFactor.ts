export const getRangeHealthFactor = (
  fixedLow: number,
  fixedHigh: number,
  currentAPR: number,
): 1 | 2 | 3 => {
  if (fixedLow < currentAPR && currentAPR < fixedHigh) {
    if (
      0.15 * fixedHigh + 0.85 * fixedLow > currentAPR ||
      currentAPR > 0.85 * fixedHigh + 0.15 * fixedLow
    ) {
      return 2;
    }
    return 3;
  }
  return 1;
};
