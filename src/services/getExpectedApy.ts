import { convertApyToVariableFactor } from '../utils/convertApyToVariableFactor';
import { getAnnualizedTime } from '../utils/functions';

export const getExpectedApy = (
  current: number, // current timestamp in seconds
  end: number, // end timestamp in seconds
  uft: number, // unbalanced fixed token balance
  vt: number, // variable token balance
  margin: number, // margin until the current timestamp (margin + accrued cashflow)
  predictedApr: number, // the predicted variable APY between current and end
  rateOracleID: number, // the rate oracle ID that suggests what type of APY is used (linear vs. compounding)
): [number, number] => {
  if (end <= current) {
    return [0, 0];
  }

  const vf = convertApyToVariableFactor(predictedApr, current, end, rateOracleID);

  // cashflow = uft * (end - current) / YEAR * 0.01 + vt * (rate[end]/rate[current] - 1)
  const ecs = uft * getAnnualizedTime(current, end) * 0.01 + vt * vf;

  // PNL = (estimated cashflow / margin so far) * (YEAR / (end - current))
  const pnl = (ecs / margin) * (1 / getAnnualizedTime(current, end));

  return [pnl, ecs];
};
