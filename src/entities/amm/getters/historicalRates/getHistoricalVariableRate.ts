import { getHistoricalVariableIndex, RateUpdate } from '@voltz-protocol/subgraph-data';
import { BigNumber } from 'ethers';
import { ONE_YEAR_IN_SECONDS, WAD } from '../../../../constants';

export const getHistoricalVariableRate = async (
  subgraphUrl: string,
  rateOracleId: string,
  filters: {
    granularityMs: number;
    timeframeMs: number;
  },
): Promise<any[]> => {
  // get ticks (with timeframe)
  const currentTimestamp = Date.now();

  const startTime = currentTimestamp - filters.timeframeMs;
  const endTime = currentTimestamp; // if end timestamp > last point => extrapolate

  let rateUpdates = await getSubgraphData(subgraphUrl, rateOracleId, startTime, endTime); // get from subgraph-data

  if (rateUpdates.length < 2) {
    throw Error('Not enough observations');
  }

  // if start timestamp < 1st point => can't get data
  if (startTime < rateUpdates[0].timestampInMS) {
    throw Error("Timeframe spans past the set's initial observation");
  }

  const rateIndexes: BigNumber[] = [];
  const result: { apy: number; timestampMs: number }[] = [];

  const secondToLastValue = rateUpdates[rateUpdates.length - 2];

  for (let timestamp = startTime; timestamp <= endTime; timestamp += filters.granularityMs) {
    // find closest two points
    const beforeOrAtIndex = binarySearch(rateUpdates, timestamp);
    const beforeOrAt = rateUpdates[beforeOrAtIndex];

    let currentRateIndex: BigNumber;
    if (timestamp == beforeOrAt.timestampInMS) {
      currentRateIndex = beforeOrAt.rate;
    } else {
      const timeDelta = timestamp - beforeOrAt.timestampInMS;
      const timeInYear = timeDelta / (ONE_YEAR_IN_SECONDS * 1000);

      if (beforeOrAtIndex + 1 >= rateUpdates.length) {
        // extrapolation
        const beforeLastPoint = secondToLastValue;
        const apyBetweenLastTwoPoints = beforeOrAt.rate.mul(WAD).div(beforeLastPoint.rate).sub(WAD);

        const apyNumber = bigNumberWadToNumber(apyBetweenLastTwoPoints);

        const deltaAPY = numberToBigNumberWad((apyNumber + 1) ** timeInYear);

        currentRateIndex = beforeOrAt.rate.mul(deltaAPY).div(WAD);
      } else {
        // interpolation
        const after = rateUpdates[beforeOrAtIndex + 1];
        const apyBetweenBeforeAndAfter = after.rate.mul(WAD).div(beforeOrAt.rate).sub(WAD);

        const apyNumber = bigNumberWadToNumber(apyBetweenBeforeAndAfter);

        const deltaAPY = numberToBigNumberWad((apyNumber + 1) ** timeInYear);

        currentRateIndex = beforeOrAt.rate.mul(deltaAPY).div(WAD);
      }
    }

    // get apy between found rate and previous point
    const previousRateIndex = result.length > 0 ? rateIndexes[result.length - 1] : beforeOrAt.rate;
    const rateFromTo = currentRateIndex.mul(WAD).div(previousRateIndex).sub(WAD);
    const timeDelta = filters.granularityMs / (ONE_YEAR_IN_SECONDS * 1000);

    const rateFromToNumber = bigNumberWadToNumber(rateFromTo);
    const deltaAPY = numberToBigNumberWad((rateFromToNumber + 1) ** (1 / timeDelta));

    const apyWad = deltaAPY.sub(WAD);

    // push results
    const apy = bigNumberWadToNumber(apyWad) * 100;
    result.push({ apy, timestampMs: timestamp });
    rateIndexes.push(currentRateIndex);

    // cut off the prevous datapoints to minimise search effort
    rateUpdates = rateUpdates.slice(beforeOrAtIndex);
  }

  return result;
};

/// @note returns closest point before the given timestamp (beforeOrAt)
function binarySearch(array: RateUpdate[], timestamp: number): number {
  let left = 0;
  let right = array.length;

  if (timestamp >= array[array.length - 1].timestampInMS) return array.length - 1;
  if (timestamp < array[0].timestampInMS) return -1;

  while (left < right) {
    const mid = Math.ceil((left + right) / 2);
    if (timestamp < array[mid].timestampInMS) {
      right = mid - 1;
    } else {
      left = mid;
    }
  }

  return left;
}

export const getSubgraphData = async (
  subgraphUrl: string,
  rateOracleId: string,
  startTime: number,
  endTime: number,
): Promise<RateUpdate[]> => {
  const res = await getHistoricalVariableIndex(subgraphUrl, rateOracleId, startTime, endTime);
  return res;
};

const bigNumberWadToNumber = (x: BigNumber): number => {
  const str = x.toString();
  const intPart = x.div(WAD);
  const intPartLength = intPart.toString() === '0' ? 0 : intPart.toString().length;
  const decimals = str.slice(intPartLength);

  const zeroPadding = 18 - decimals.length;
  let zeroes = '000000000000000000';

  zeroes = zeroes.slice(0, zeroPadding);

  const numberStr = `${intPart}.${zeroes}${decimals}`;

  return Number(numberStr);
};

const numberToBigNumberWad = (x: number): BigNumber => {
  let str = x.toString();

  const decimalPart = str.split('.')[1] ?? 0;
  const zeroPadding = 18 - decimalPart.length;
  const zeroes = '000000000000000000';

  if (zeroPadding < 0) {
    str = str.slice(0, 17);
  } else {
    str += zeroes.slice(0, zeroPadding);
  }

  str = str.replace('.', '');
  return BigNumber.from(str);
};
