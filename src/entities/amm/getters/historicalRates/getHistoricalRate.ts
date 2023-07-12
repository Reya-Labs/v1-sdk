import {
  getHistoricalFixedRate as getTickUpdates,
  getHistoricalVariableIndex,
} from '@voltz-protocol/subgraph-data';
import { BigNumber } from 'ethers';
import { ONE_DAY_IN_SECONDS } from '../../../../constants';
import { getSentryTracker } from '../../../../init';
import {
  getFixedRatesGCloud,
  getVariableRatesGCloud,
} from '../../../../services/gateway/getHistoricalRatesGCloud';
import { HistoricalRate } from '@voltz-protocol/api-v2-types';

export enum Granularity {
  ONE_HOUR = 3600 * 1000,
  ONE_DAY = 86400 * 1000,
  ONE_WEEK = 604800 * 1000,
}

export type HistoricalRates = {
  timestampInMs: number;
  value: number;
};

export type RatesData = {
  historicalRates: HistoricalRates[];
};

export type HistoricalRatesParams = {
  poolId: string;
  isFixed: boolean;
  filters: {
    granularity: Granularity;
    timeframeMs: number;
  };
};

export const getHistoricalRatesFromBigQuery = async (
  isFixed: boolean,
  poolId: string,
  startTime: number,
  endTime: number,
): Promise<
  {
    timestampInMs: number;
    value: number;
  }[]
> => {
  let resp: HistoricalRate[];
  try {
    if (isFixed) {
      resp = await getFixedRatesGCloud(poolId, startTime, endTime);
    } else {
      resp = await getVariableRatesGCloud(poolId, startTime, endTime);
    }
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('Historical rates API unavailable');
    return [];
  }

  const sortedData = resp.sort((a, b) => a.timestamp - b.timestamp);

  const result = sortedData.map((r) => ({
    timestampInMs: r.timestamp * 1000,
    value: r.rate,
  }));

  return result;
};

export const getHistoricalRates = async ({
  poolId,
  isFixed,
  filters,
}: HistoricalRatesParams): Promise<RatesData> => {
  // get ticks (with timeframe)
  const currentTimestamp = Date.now();

  const startTime = currentTimestamp - filters.timeframeMs;
  const endTime = currentTimestamp;

  const rateUpdates = await getHistoricalRatesFromBigQuery(
    isFixed,
    poolId,
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
        value: p.value,
      });
      latestParsedTimestamp = p.timestampInMs;
    }
  }

  return {
    historicalRates: result,
  };
};

// gets the last rate update
export const getCurrentRateFromSubgraph = async (
  subgraphUrl: string,
  isFixed: boolean,
  parentObjectId: string,
  endTime: number,
): Promise<BigNumber> => {
  // give subgraph a buffer of one day
  const startTime = endTime - ONE_DAY_IN_SECONDS;
  if (!isFixed) {
    const res = await getTickUpdates(subgraphUrl, parentObjectId, startTime, endTime);
    if (res.length === 0) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureMessage('No variable rate registered in the last day');
      return BigNumber.from(-10).pow(16); // default to -0.01
    }
    return res[res.length - 1].historicalFixedRate;
  }
  const res = await getHistoricalVariableIndex(subgraphUrl, parentObjectId, startTime, endTime);
  if (res.length === 0) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('No fixed rate registered in the last day');
    return BigNumber.from(-10).pow(16); // default to -0.01
  }
  return res[res.length - 1].historicalVariableRate;
};
