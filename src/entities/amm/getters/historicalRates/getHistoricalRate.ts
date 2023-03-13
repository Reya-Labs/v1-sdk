import { BigQuery } from '@google-cloud/bigquery';
import {
  getHistoricalFixedRate as getTickUpdates,
  getHistoricalVariableIndex,
} from '@voltz-protocol/subgraph-data';
import { BigNumber } from 'ethers';
import { ONE_DAY_IN_SECONDS } from '../../../../constants';
import { getSentryTracker, getSubgraphURL } from '../../../../init';
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

export type RatesData = {
  historicalRates: HistoricalRates[];
};

export type HistoricalRatesParams = {
  chainId: SupportedChainId;
  isFixed: boolean;
  filters: {
    granularity: Granularity;
    timeframeMs: number;
  };
  ammId: string;
  rateOracleId: string;
  gCloudAuth: string;
};

export const getHistoricalRates = async ({
  chainId,
  isFixed,
  filters,
  ammId,
  rateOracleId,
  gCloudAuth,
}: HistoricalRatesParams): Promise<RatesData> => {
  // check ids
  const parentObjectId = isFixed ? ammId : rateOracleId;

  // get ticks (with timeframe)
  const currentTimestamp = Date.now();

  const startTime = currentTimestamp - filters.timeframeMs;
  const endTime = currentTimestamp;

  let rateUpdates: {
    timestampInMs: number;
    value: number;
  }[];

  // subgraph-data should output points in asc order by timestamp
  if (chainId === SupportedChainId.mainnet || chainId === SupportedChainId.goerli) {
    const subgraphUrl = getSubgraphURL(chainId, SubgraphURLEnum.historicalRates);
    rateUpdates = await getHistoricalRatesFromSubgraph(
      subgraphUrl,
      isFixed,
      parentObjectId,
      Math.round(startTime / 1000),
      Math.round(endTime / 1000),
    );
  } else {
    rateUpdates = await getHistoricalRatesFromBigQuery(
      gCloudAuth,
      isFixed,
      parentObjectId,
      Math.round(startTime / 1000),
      Math.round(endTime / 1000),
    );
  }

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

export const getHistoricalRatesFromSubgraph = async (
  subgraphUrl: string,
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
  if (isFixed) {
    const res = await getTickUpdates(subgraphUrl, parentObjectId, startTime, endTime);
    const mappedResult = res.map((r) => ({
      timestampInMs: r.timestampInMS,
      value: descaleRate(r.historicalFixedRate),
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

export const getHistoricalRatesFromBigQuery = async (
  gCloudAuth: string,
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
  const big_query_credentials = JSON.parse(gCloudAuth);

  const bigquery = new BigQuery({
    credentials: big_query_credentials,
    projectId: 'voltz-protocol-v1',
  });

  let query: string;
  if (isFixed) {
    query =
      'SELECT fixed_rate as rate, timestamp FROM `historical_rates.fixed_rates` ' +
      `WHERE vamm_address = ${parentObjectId}` +
      `AND timestamp >= ${startTime} AND timestamp <= ${endTime}`;
  } else {
    query =
      'SELECT variable_rate as rate, timestamp FROM `historical_rates.variable_rates` ' +
      `WHERE rate_oracle_address = ${parentObjectId}` +
      `AND timestamp >= ${startTime} AND timestamp <= ${endTime}`;
  }
  const res = (await bigquery.query(query))[0];
  const mappedResult = res.map((r) => ({
    timestampInMs: r.timestamp * 1000,
    value: r.rate,
  }));
  return mappedResult;
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

const descaleRate = (rate: BigNumber): number => {
  return rate.div(BigNumber.from(1000000000000)).toNumber() / 1000000;
};
