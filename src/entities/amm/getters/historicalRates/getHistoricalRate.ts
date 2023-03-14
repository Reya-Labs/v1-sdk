import {
  getHistoricalFixedRate as getTickUpdates,
  getHistoricalVariableIndex,
} from '@voltz-protocol/subgraph-data';
import axios from 'axios';
import { BigNumber } from 'ethers';
import { ONE_DAY_IN_SECONDS } from '../../../../constants';
import { getSentryTracker } from '../../../../init';

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
  isFixed: boolean;
  filters: {
    granularity: Granularity;
    timeframeMs: number;
  };
  ammId: string;
  rateOracleId: string;
  historicalRatesApiKey: string;
};

export const getHistoricalRates = async ({
  isFixed,
  filters,
  ammId,
  rateOracleId,
  historicalRatesApiKey,
}: HistoricalRatesParams): Promise<RatesData> => {
  // check ids
  const parentObjectId = isFixed ? ammId : rateOracleId;

  // get ticks (with timeframe)
  const currentTimestamp = Date.now();

  const startTime = currentTimestamp - filters.timeframeMs;
  const endTime = currentTimestamp;

  const rateUpdates = await getHistoricalRatesFromBigQuery(
    historicalRatesApiKey,
    isFixed,
    parentObjectId,
    Math.round(startTime / 1000),
    Math.round(endTime / 1000),
  );

  const result = [];

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

export const getHistoricalRatesFromBigQuery = async (
  historicalRatesApiKey: string,
  isFixed: boolean,
  parentObjectId: string,
  startTime: number,
  endTime: number,
): Promise<
  {
    timestampInMs: number;
    value: number;
  }[]
> => {
  const params = {
    key: historicalRatesApiKey,
    start_time: startTime,
    end_time: endTime,
  };

  let resp: { data: { rate: number; timestamp: number }[] };

  try {
    if (isFixed) {
      resp = await axios.get(`https://voltz-historical-rates.herokuapp.com/fixed_rates/`, {
        params: { ...params, vamm: parentObjectId },
      });
    } else {
      resp = await axios.get(`https://voltz-historical-rates.herokuapp.com/variable_rates/`, {
        params: { ...params, rate_oracle: parentObjectId },
      });
    }
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('Historical rates API unavailable');
    return [];
  }

  const sortedData = resp.data.sort((a, b) => a.timestamp - b.timestamp);

  const result = sortedData.map((r) => ({
    timestampInMs: r.timestamp * 1000,
    value: r.rate,
  }));

  return result;
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
