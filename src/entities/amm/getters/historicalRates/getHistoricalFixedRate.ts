import {
  getHistoricalFixedRate as getTickUpdates,
  TickUpdate,
} from '@voltz-protocol/subgraph-data';

export const getHistoricalFixedRates = async (
  subgraphUrl: string,
  ammId: string,
  filters: {
    granularityMs: number;
    timeframeMs: number;
  },
): Promise<any[]> => {
  // get ticks (with timeframe)
  const currentTimestamp = Date.now();

  const startTime = currentTimestamp - filters.timeframeMs;
  const endTime = currentTimestamp; // if end timestamp > last point => extrapolate

  let tickUpdates: TickUpdate[] = await getSubgraphData(subgraphUrl, ammId, startTime, endTime); // get from subgraph-data

  const result: any[] = [];

  for (let timestamp = startTime; timestamp <= endTime; timestamp += filters.granularityMs) {
    if (tickUpdates.length == 0 || timestamp < tickUpdates[0].timestampInMS) {
      result.push({ rate: 1, timestampMs: timestamp });
      continue;
    }
    // find closest two points
    const beforeOrAtIndex = binarySearch(tickUpdates, timestamp);
    const beforeOrAt = tickUpdates[beforeOrAtIndex];

    const rate = 1 / 1.0001 ** beforeOrAt.tick.toNumber();

    result.push({ rate, timestampMs: timestamp });

    // cut off the previous datapoints to minimise search effort
    if (beforeOrAtIndex >= 1) {
      tickUpdates = tickUpdates.slice(beforeOrAtIndex - 1);
    }
  }
  return result;
};

export const getSubgraphData = async (
  subgraphUrl: string,
  ammId: string,
  startTime: number,
  endTime: number,
): Promise<TickUpdate[]> => {
  const res = await getTickUpdates(subgraphUrl, ammId, startTime, endTime);
  return res;
};

/// @note returns closest point before the given timestamp (beforeOrAt)
function binarySearch(array: TickUpdate[], timestamp: number): number {
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
