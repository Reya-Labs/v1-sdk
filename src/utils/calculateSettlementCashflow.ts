import { getAnnualizedTime } from './functions';

export const calculateSettlementCashflow = (
  fixedTokenBalance: number,
  variableTokenBalance: number,
  startTimestamp: number,
  endTimestamp: number,
  variableFactor: number,
): number => {
  return (
    fixedTokenBalance * getAnnualizedTime(startTimestamp, endTimestamp) * 0.01 +
    variableTokenBalance * variableFactor
  );
};
