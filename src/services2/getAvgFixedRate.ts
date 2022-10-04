import { BigNumber } from 'ethers';
import { descale } from '../utils2/scaling';

export const getAvgFixedRate = (
  unbalancedFixedTokens: BigNumber,
  variableTokens: BigNumber,
): number => {
  const avgFixedRateWad = unbalancedFixedTokens.mul(BigNumber.from(10).pow(18)).div(variableTokens);
  return Math.abs(descale(avgFixedRateWad, 18));
};
