import {
  getHistoricalFixedRate as getTickUpdates,
  getHistoricalVariableIndex,
  RateUpdate,
  TickUpdate,
} from '@voltz-protocol/subgraph-data';

export enum Granularity {
  ONE_HOUR = 3600,
  ONE_DAY = 86400,
  ONE_WEEK = 604800,
}

export const getHistoricalRates = async (
  subgraphUrl: string,
  isFixed: boolean,
  filters: {
    granularity: Granularity;
    timeframeMs: number;
  },
  ammId?: string,
  rateOracleId?: string,
): Promise<any[]> => {
  // check ids
  let parentObjectId;
  if (isFixed && ammId) {
    parentObjectId = ammId;
  } else if (!isFixed && rateOracleId) {
    parentObjectId = rateOracleId;
  } else {
    throw new Error('Unable to get rates, parent object not provided');
  }

  // get ticks (with timeframe)
  const currentTimestamp = Date.now();

  const startTime = Math.round((currentTimestamp - filters.timeframeMs) / 1000);
  const endTime = Math.round(currentTimestamp / 1000);

  // subgraph-data should output points in asc order by timestamp
  const rateUpdates: TickUpdate[] = await getSubgraphData(
    subgraphUrl,
    isFixed,
    parentObjectId,
    startTime,
    endTime,
  );

  const result: any[] = [];

  // NOTE: points will be registered exactly every hour on the ETHEREUM mainnet
  // but on chains with arbitrary block interval, this won't be the case
  let latestParsedTimestamp = 0;
  for (const p of rateUpdates) {
    if (latestParsedTimestamp + filters.granularity <= p.timestampInMS / 1000) {
      result.push(p);
      latestParsedTimestamp = p.timestampInMS;
    }
  }

  return result;
};

export const getSubgraphData = async (
  subgraphUrl: string,
  isFixed: boolean,
  parentObjectId: string,
  startTime: number,
  endTime: number,
): Promise<TickUpdate[] | RateUpdate[]> => {
  const res = isFixed
    ? await getTickUpdates(subgraphUrl, parentObjectId, startTime, endTime)
    : await getHistoricalVariableIndex(subgraphUrl, parentObjectId, startTime, endTime);

  return res;
};
