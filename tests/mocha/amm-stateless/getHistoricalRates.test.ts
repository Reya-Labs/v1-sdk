import { describe } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import * as initSDK from '../../../src/init';
import { getHistoricalRates } from '../../../src/entities';
import * as fun from '../../../src/entities/amm/getters/historicalRates/getHistoricalRate';
import { ONE_DAY_IN_SECONDS } from '../../../src/constants';
import { BigNumber } from 'ethers';
import { SupportedChainId } from '../../../src/types';

describe('getHistoricalRates', () => {
  const mock = async (observations: any[]) => {
    sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );

    sinon.stub(fun, 'getHistoricalRatesFromBigQuery').resolves(observations);
    if (observations.length > 0) {
      sinon
        .stub(fun, 'getCurrentRateFromSubgraph')
        .resolves(observations[observations.length - 1].value);
    } else {
      sinon.stub(fun, 'getCurrentRateFromSubgraph').throws('Here');
    }
  };

  const restore = async () => {
    sinon.restore();
  };

  const defautParams: fun.HistoricalRatesParams = {
    chainId: SupportedChainId.arbitrumGoerli,
    isFixed: true,
    filters: {
      granularity: fun.Granularity.ONE_DAY,
      timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000,
    },
    rateOracleId: 'mockId',
    ammId: 'mockId',
    historicalRatesApiKey: 'mockKey',
  };

  afterEach(async () => {
    await restore();
  });

  it('start time earlier than observations', async () => {
    const currentTimestamp = Date.now();
    const obseravtions = [
      {
        value: 0.474,
        timestampInMs: currentTimestamp - fun.Granularity.ONE_DAY,
      },
    ];
    await mock(obseravtions);

    const resultFixed: fun.RatesData = await getHistoricalRates(defautParams);

    expect(resultFixed.historicalRates.length).to.be.eq(1);
    expect(resultFixed.historicalRates[0].value).to.be.eq(0.474);

    const resultVariable: fun.RatesData = await getHistoricalRates({
      ...defautParams,
      isFixed: false,
    });

    expect(resultVariable.historicalRates.length).to.be.eq(1);
    expect(resultVariable.historicalRates[0].value).to.be.eq(0.474);
  });

  // this case should not happen, the subgraph should never return data is there isn't any
  it('start time later than observations', async () => {
    const currentTimestamp = Date.now();
    const obseravtions = [
      {
        value: 0.474,
        timestampInMs: currentTimestamp - fun.Granularity.ONE_DAY * 2,
      },
      {
        value: 0.491,
        timestampInMs: currentTimestamp - fun.Granularity.ONE_DAY - 60000,
      },
    ];
    await mock(obseravtions);

    const resultFixed: fun.RatesData = await getHistoricalRates({
      ...defautParams,
      filters: {
        granularity: fun.Granularity.ONE_DAY,
        timeframeMs: ONE_DAY_IN_SECONDS * 1 * 1000,
      },
    });

    expect(resultFixed.historicalRates.length).to.be.eq(0);

    const resultVariable: fun.RatesData = await getHistoricalRates({
      ...defautParams,
      isFixed: false,
      filters: {
        granularity: fun.Granularity.ONE_DAY,
        timeframeMs: ONE_DAY_IN_SECONDS * 1 * 1000,
      },
    });

    expect(resultVariable.historicalRates.length).to.be.eq(0);
  });

  it('many observations & big granularity', async () => {
    const currentTimestamp = Date.now() + 1000;
    const obseravtions = [
      {
        value: 0.5,
        timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 2 * 1000,
      },
      {
        value: 0.4,
        timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 1.5 * 1000,
      },
      {
        value: 0.47,
        timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000,
      },
      {
        value: 0.4,
        timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 0.5 * 1000,
      },
      { value: 0.11, timestampInMs: currentTimestamp },
    ];
    await mock(obseravtions);

    const resultFixed: fun.RatesData = await getHistoricalRates(defautParams);

    expect(resultFixed.historicalRates.length).to.be.eq(2);
    expect(resultFixed.historicalRates[0].value).to.be.eq(0.5);
    expect(resultFixed.historicalRates[1].value).to.be.eq(0.47);

    const resultVariable: fun.RatesData = await getHistoricalRates({
      ...defautParams,
      isFixed: false,
    });

    expect(resultVariable.historicalRates.length).to.be.eq(2);
    expect(resultVariable.historicalRates[0].value).to.be.eq(0.5);
    expect(resultVariable.historicalRates[1].value).to.be.eq(0.47);
  });

  it('little observation & smaller granularity', async () => {
    const currentTimestamp = Date.now();
    const obseravtions = [
      {
        value: 0.47,
        timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000,
      },
    ];
    await mock(obseravtions);

    const resultFixed: fun.RatesData = await getHistoricalRates({
      ...defautParams,
      filters: {
        granularity: fun.Granularity.ONE_DAY,
        timeframeMs: ONE_DAY_IN_SECONDS * 4 * 1000,
      },
    });

    expect(resultFixed.historicalRates.length).to.be.eq(1);
    expect(resultFixed.historicalRates[0].value).to.be.eq(0.47);

    const resultVariable: fun.RatesData = await getHistoricalRates({
      ...defautParams,
      isFixed: false,
      filters: {
        granularity: fun.Granularity.ONE_DAY,
        timeframeMs: ONE_DAY_IN_SECONDS * 4 * 1000,
      },
    });

    expect(resultVariable.historicalRates.length).to.be.eq(1);
    expect(resultVariable.historicalRates[0].value).to.be.eq(0.47);
  });

  it('no observations', async () => {
    const obseravtions: { timestampInMs: number; value: BigNumber }[] = [];
    await mock(obseravtions);

    try {
      await getHistoricalRates(defautParams);
      expect(0).to.eq(1);
    } catch {}

    try {
      await getHistoricalRates({ ...defautParams, isFixed: false });
      expect(0).to.eq(1);
    } catch {}
  });
});
