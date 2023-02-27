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
  oppositeSideCurrentRate: number;
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
};

export const getHistoricalRates = async ({
  chainId,
  isFixed,
  filters,
  ammId,
  rateOracleId,
}: HistoricalRatesParams): Promise<RatesData> => {
  // check ids
  const parentObjectId = isFixed ? ammId : rateOracleId;
  const opositeSideObjectId = !isFixed ? rateOracleId : ammId;

  const subgraphUrl = getSubgraphURL(chainId, SubgraphURLEnum.historicalRates);

  // get ticks (with timeframe)
  const currentTimestamp = Date.now();

  const startTime = currentTimestamp - filters.timeframeMs;
  const endTime = currentTimestamp;

  // subgraph-data should output points in asc order by timestamp
  const rateUpdates = await getHistoricalRatesFromSubgraph(
    subgraphUrl,
    isFixed,
    parentObjectId,
    Math.round(startTime / 1000),
    Math.round(endTime / 1000),
  );

  const opositeSideCurrentRate = await getCurrentRateFromSubgraph(
    subgraphUrl,
    isFixed,
    opositeSideObjectId,
    endTime,
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
        value: descaleRate(p.value),
      });
      latestParsedTimestamp = p.timestampInMs;
    }
  }

  return {
    historicalRates: result,
    oppositeSideCurrentRate: descaleRate(opositeSideCurrentRate),
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
      sentryTracker.captureException(new Error('No variable rate registerd in the last day'));
      sentryTracker.captureMessage('No variable rate registerd in the last day');
      return BigNumber.from(-1);
    }
    return res[res.length - 1].historicalFixedRate;
  }
  const res = await getHistoricalVariableIndex(subgraphUrl, parentObjectId, startTime, endTime);
  if (res.length === 0) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(new Error('No fixed rate registerd in the last day'));
    sentryTracker.captureMessage('No fixed rate registerd in the last day');
    return BigNumber.from(-1);
  }
  return res[res.length - 1].historicalVariableRate;
};

const descaleRate = (rate: BigNumber): number => {
  return rate.div(BigNumber.from(1000000000000)).toNumber() / 1000000;
};
