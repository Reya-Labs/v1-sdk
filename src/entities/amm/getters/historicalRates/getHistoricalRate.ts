import {
  getHistoricalFixedRate as getTickUpdates,
  getHistoricalVariableIndex,
} from '@voltz-protocol/subgraph-data';
import { BigNumber } from 'ethers';
import { getSubgraphURL } from '../../../../init';
import { SubgraphURLEnum, SupportedChainId } from '../../../../types';

export enum Granularity {
  ONE_HOUR = 3600 * 1000,
  ONE_DAY = 86400 * 1000,
  ONE_WEEK = 604800 * 1000,
}

export type HistoricalRates = {
  timestampInMs: number;
  value: number;
};

export const getHistoricalRates = async (
  chainId: SupportedChainId,
  isFixed: boolean,
  filters: {
    granularity: Granularity;
    timeframeMs: number;
  },
  ammId?: string,
  rateOracleId?: string,
): Promise<HistoricalRates[]> => {
  // check ids
  let parentObjectId;
  if (isFixed && ammId) {
    parentObjectId = ammId;
  } else if (!isFixed && rateOracleId) {
    parentObjectId = rateOracleId;
  } else {
    throw new Error('Unable to get rates, parent object not provided');
  }

  const subgraphUrl = getSubgraphURL(chainId, SubgraphURLEnum.historicalRates);

  // get ticks (with timeframe)
  const currentTimestamp = Date.now();

  const startTime = currentTimestamp - filters.timeframeMs;
  const endTime = currentTimestamp;

  // subgraph-data should output points in asc order by timestamp
  const rateUpdates = await getSubgraphData(
    subgraphUrl,
    isFixed,
    parentObjectId,
    Math.round(startTime / 1000),
    Math.round(endTime / 1000),
  );

  const result = [];

  // NOTE: points will be registered exactly every hour on the ETHEREUM mainnet
  // but on chains with arbitrary block interval, this won't be the case
  let latestParsedTimestamp = 0;
  for (const p of rateUpdates) {
    if (
      latestParsedTimestamp + filters.granularity <= p.timestampInMs &&
      p.timestampInMs >= startTime &&
      p.timestampInMs <= endTime
    ) {
      result.push({
        timestampInMs: p.timestampInMs,
        value: p.value.div(BigNumber.from(1000000000000)).toNumber() / 1000000,
      });
      latestParsedTimestamp = p.timestampInMs;
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
): Promise<
  {
    timestampInMs: number;
    value: BigNumber;
  }[]
> => {
  if (isFixed) {
    const res = await getTickUpdates(subgraphUrl, parentObjectId, startTime, endTime);
    const mappedResult = res.map((r) => ({
      timestampInMs: r.timestampInMS,
      value: r.historicalFixedRate,
    }));
    return mappedResult;
  }
  const res = await getHistoricalVariableIndex(subgraphUrl, parentObjectId, startTime, endTime);
  const mappedResult = res.map((r) => ({
    timestampInMs: r.timestampInMS,
    value: r.historicalVariableRate,
  }));
  return mappedResult;
};
