import { getAnnualizedTime, getAnnualizedTime360dayYear } from './functions';

export const convertApyToVariableFactor = (
  apy: number,
  startTimestamp: number,
  endTimestamp: number,
  protocolId: number,
): number => {
  switch (protocolId) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 9: {
      // (rate[endTimestamp]/rate[startTimestamp])^(YEAR / (endTimestamp-startTimestamp)) - 1 = APY(startTimestamp, endTimestamp)
      // rate[endTimestamp]/rate[startTimestamp] = (APY(startTimestamp, endTimestamp) + 1)^((endTimestamp - startTimestamp)/YEAR)
      // rate[endTimestamp]/rate[startTimestamp] - 1 = (APY(startTimestamp, endTimestamp) + 1)^((endTimestamp - startTimestamp)/YEAR) - 1
      return (1 + apy) ** getAnnualizedTime(startTimestamp, endTimestamp) - 1;
    }

    case 8: {
      // (rate[endTimestamp]/rate[startTimestamp]-1) * (YEAR / (endTimestamp - startTimestamp)) = APY(startTimestamp, endTimestamp)
      // rate[endTimestamp]/rate[startTimestamp] = APY(startTimestamp, endTimestamp) * (endTimestamp - startTimestamp) / YEAR + 1
      // rate[endTimestamp]/rate[startTimestamp] - 1 = APY(startTimestamp, endTimestamp) * (endTimestamp - startTimestamp) / YEAR
      return apy * getAnnualizedTime(startTimestamp, endTimestamp);
    }

    case 10: {
      // apy = (rate[endTimestamp] / rate[startTimestamp] - 1) * (360 / timeDelta)
      // (rate[endTimestamp] / rate[startTimestamp] - 1) = apy * (timeDelta / 360)
      // (rate[endTimestamp] / rate[startTimestamp] - 1) = apy * (endTimestamp - startTimestamp) / 360
      return apy * getAnnualizedTime360dayYear(startTimestamp, endTimestamp);
    }

    default: {
      throw new Error('Unrecognized protocol');
    }
  }
};
