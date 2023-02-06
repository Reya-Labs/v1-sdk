export const getHistoricalFixedRate = async (
  ammId: string,
  filters: {
    granularityInSeconds: number;
    timeframeInSeconds: number;
  },
): Promise<any[]> => {
  // get ticks (with timeframe)
  const currentTimestamp = Date.now() / 1000;

  const startTime = currentTimestamp - filters.timeframeInSeconds;
  const endTime = currentTimestamp; // if end timestamp > last point => extrapolate

  let tickUpdates: any[] = []; // get from subgraph-data

  const result: any[] = [];

  for (let timestamp = startTime; timestamp < endTime; timestamp += filters.timeframeInSeconds) {
    if (timestamp < tickUpdates[0]) {
      result.push([1, timestamp]);
      continue;
    }
    // find closest two points
    const beforeOrAtIndex = binarySearch(tickUpdates, timestamp);
    const beforeOrAt = tickUpdates[beforeOrAtIndex];

    const rate = 1 / (1.0001 ^ beforeOrAt.rate);

    result.push([rate, timestamp]);

    // cut off the prevous datapoints to minimise search effort
    tickUpdates = tickUpdates.slice(beforeOrAtIndex);
  }
  return result;
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
