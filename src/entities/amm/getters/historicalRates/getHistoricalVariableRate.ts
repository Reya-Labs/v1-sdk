import { ONE_YAER_IN_SECONDS } from '../../../../constants';

export const getHistoricalVariableRate = async (
  ammId: string,
  filters: {
    granularityInSeconds: number;
    timeframeInSeconds: number;
  },
): Promise<void> => {
  // get ticks (with timeframe)
  const currentTimestamp = Date.now() / 1000;

  const startTime = currentTimestamp - filters.timeframeInSeconds;
  const endTime = currentTimestamp; // if end timestamp > last point => extrapolate

  const rateUpdates: any[] = []; // get from subgraph-data
  let rateUpdatesTemp: any[] = []; // get from subgraph-data

  // if start timestamp < 1st point => can't get data
  if (startTime < rateUpdates[0]) {
    throw Error("Timeframe spans past the set's initial observation");
  }

  const result: any[] = [];

  for (let timestamp = startTime; timestamp < endTime; timestamp += filters.timeframeInSeconds) {
    // find closest two points
    const beforeOrAtIndex = binarySearch(rateUpdatesTemp, timestamp);
    const beforeOrAt = rateUpdatesTemp[beforeOrAtIndex];

    let currentRateIndex = 0;
    if (timestamp == beforeOrAt.timestamp) {
      currentRateIndex = beforeOrAt;
    } else {
      const timeDelta = timestamp - beforeOrAt.timestamp;
      const timeInYear = timeDelta / ONE_YAER_IN_SECONDS;

      if (beforeOrAtIndex + 1 >= rateUpdatesTemp.length) {
        // extrapolation
        const beforeLastPoint = rateUpdatesTemp[beforeOrAtIndex - 1];
        const apyBetweenlastTwoPoints = beforeOrAt.rate / beforeLastPoint.rate - 1e18; // dep on decimals
        currentRateIndex = beforeOrAt.rate * ((apyBetweenlastTwoPoints + 1e18) ^ timeInYear);
      } else {
        // interpolation
        const after = rateUpdatesTemp[beforeOrAtIndex + 1];
        const apyBetweenBeforeAndAfter = after.rate / beforeOrAt.rate - 1e18; // dep on decimals
        currentRateIndex = beforeOrAt.rate * ((apyBetweenBeforeAndAfter + 1e18) ^ timeInYear);
      }
    }

    // get apy between found rate and previous point
    const rateFromTo = result[result.length - 1][0] / currentRateIndex - 1e18;
    const timeDelta = filters.timeframeInSeconds / ONE_YAER_IN_SECONDS;

    const apy = (1e18 + rateFromTo) ^ (1 / timeDelta - 1e18);

    result.push([apy, timestamp]);

    // cut off the prevous datapoints to minimise search effort
    rateUpdatesTemp = rateUpdatesTemp.slice(beforeOrAtIndex);
  }
  //
};

/// @note returns closest point before the given timestamp (beforeOrAt)
function binarySearch(array: any[], timestamp: number): number {
  let left = 0;
  let right = array.length;

  if (timestamp > array[array.length - 1]) return array.length - 1;
  if (timestamp > array[0]) return -1;

  while (left < right) {
    const mid = Math.ceil((left + right) / 2);
    if (timestamp < array[mid]) {
      right = mid - 1;
    } else {
      left = mid;
    }
  }

  return left;
}
