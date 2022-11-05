import { BigNumber } from 'ethers';
import { descale } from '../utils/scaling';

export const getAvgFixedRate = (
  unbalancedFixedTokens: BigNumber,
  variableTokens: BigNumber,
): number => {
  if (variableTokens.eq(0)) {
    return 0;
  }

  const avgFixedRateWad = unbalancedFixedTokens.mul(BigNumber.from(10).pow(18)).div(variableTokens);
  return Math.abs(descale(18)(avgFixedRateWad));
};
