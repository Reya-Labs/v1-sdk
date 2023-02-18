import { ONE_YEAR_IN_SECONDS } from '../constants';

const getAnnualizedTime = (start: number, end: number): number => {
  return (end - start) / ONE_YEAR_IN_SECONDS;
};

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

  let vf = 0;

  switch (rateOracleID) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7: {
      // (rate[end]/rate[current])^(YEAR / (end-current)) - 1 = APY(current, end)
      // rate[end]/rate[current] = (APY(current, end) + 1)^((end - current)/YEAR)
      // rate[end]/rate[current] - 1 = (APY(current, end) + 1)^((end - current)/YEAR) - 1
      vf = (1 + predictedApr) ** getAnnualizedTime(current, end) - 1;

      break;
    }

    case 8: {
      // (rate[end]/rate[current]-1) * (YEAR / (end - current)) = APY(current, end)
      // rate[end]/rate[current] = APY(current, end) * (end - current) / YEAR + 1
      // rate[end]/rate[current] - 1 = APY(current, end) * (end - current) / YEAR
      vf = predictedApr * getAnnualizedTime(current, end);

      break;
    }

    default: {
      throw new Error('Unrecognized protocol');
    }
  }

  // cashflow = uft * (end - current) / YEAR * 0.01 + vt * (rate[end]/rate[current] - 1)
  const ecs = uft * getAnnualizedTime(current, end) * 0.01 + vt * vf;

  // PNL = (estimated cashflow / margin so far) * (YEAR / (end - current))
  const pnl = (ecs / margin) * (1 / getAnnualizedTime(current, end));

  return [pnl, ecs];
};
