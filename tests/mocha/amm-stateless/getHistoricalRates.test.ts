import { describe } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import * as initSDK from '../../../src/init';
import { getHistoricalVariableRate } from '../../../src/entities';
import * as fun from '../../../src/entities/amm/getters/historicalRates/getHistoricalVariableRate';
import { RateUpdate } from '@voltz-protocol/subgraph-data';
import { ONE_DAY_IN_SECONDS, ONE_YEAR_IN_SECONDS, WAD } from '../../../src/constants';

describe('getHistoricalVariableRate', () => {
  const mock = async (observations: RateUpdate[]) => {
    sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );
    
    sinon.stub(fun, 'getSubgraphData').onFirstCall().resolves(observations);
  };

  const restore = async () => {
    sinon.restore();
  };

  afterEach(async () => {
    await restore();
  });

  it('start time earlier than observations', async () => {
    const currentTimestamp = Date.now();
    const obseravtions : RateUpdate[] = [
        {id: "mockId1", rate: WAD, timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 2 * 1000},
        {id: "mockId2", rate: WAD.add(WAD.div(3)), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000},
        {id: "mockId2", rate: WAD.add(WAD.div(2)), timestampInMS: currentTimestamp},
    ];
    await mock(obseravtions);

    const promise = getHistoricalVariableRate(
        "mockUrl",
        "mockId", 
        {
            granularityMs: ONE_DAY_IN_SECONDS * 0.5 * 1000, 
            timeframeMs: ONE_DAY_IN_SECONDS * 4 * 1000
        }
    );

    expect(Promise.resolve(promise)).to.be.revertedWith("Timeframe spans past the set's initial observation")
  });

  it('end time later than observations', async () => {
    const currentTimestamp = Date.now();
    const obseravtions : RateUpdate[] = [
        {id: "mockId1", rate: WAD, timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 2 * 1000},
        {id: "mockId2", rate: WAD.add(WAD.div(3000)), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000},
        {id: "mockId3", rate: WAD.add(WAD.div(2000)), timestampInMS: currentTimestamp},
    ];
    await mock(obseravtions);

    const result : {apy: number, timestampMs: number}[] = await getHistoricalVariableRate(
        "mockUrl",
        "mockId", 
        {
            granularityMs: ONE_DAY_IN_SECONDS * 0.5 * 1000, 
            timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
        }
    );
    expect(result.length).to.be.eq(5);
  });

  it('no observations', async () => {
    const obseravtions : RateUpdate[] = [];
    await mock(obseravtions);

    const promise =  getHistoricalVariableRate(
        "mockUrl",
        "mockId", 
        {
            granularityMs: ONE_DAY_IN_SECONDS * 0.5 * 1000, 
            timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
        }
    );
    expect(Promise.resolve(promise)).to.be.revertedWith("Not enough observations")
  });

  it('little observation', async () => {
    const currentTimestamp = Date.now();
    const obseravtions : RateUpdate[] = [
        {id: "mockId1", rate: WAD, timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 3 * 1000},
        {id: "mockId2", rate: WAD.add(WAD.div(3000)), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 2 * 1000},
    ];
    await mock(obseravtions);

    const result : {apy: number, timestampMs: number}[] = await getHistoricalVariableRate(
        "mockUrl",
        "mockId", 
        {
            granularityMs: ONE_DAY_IN_SECONDS * 0.5 * 1000, 
            timeframeMs: ONE_DAY_IN_SECONDS * 3 * 1000
        }
    );
    expect(result.length).to.be.eq(7);
  });

  it('correct interpolation', async () => {
    const currentTimestamp = Date.now();
    const obseravtions : RateUpdate[] = [
        {id: "mockId1", rate: WAD, timestampInMS: currentTimestamp - ONE_YEAR_IN_SECONDS * 1000},
        {id: "mockId2", rate: WAD.add(WAD), timestampInMS: currentTimestamp},
    ];
    await mock(obseravtions);

    const result : {apy: number, timestampMs: number}[] = await getHistoricalVariableRate(
        "mockUrl",
        "mockId", 
        {
            granularityMs: ONE_YEAR_IN_SECONDS * 0.5 * 1000, 
            timeframeMs: ONE_YEAR_IN_SECONDS * 1000
        }
    );
    expect(result.length).to.be.eq(3);
    expect(result[1].apy).to.be.closeTo(100, 1)
  });

  it('correct extrapolation', async () => {
    const currentTimestamp = Date.now();
    const obseravtions : RateUpdate[] = [
        {id: "mockId1", rate: WAD, timestampInMS: currentTimestamp - ONE_YEAR_IN_SECONDS * 2 * 1000},
        {id: "mockId2", rate: WAD.add(WAD.div(20)), timestampInMS: currentTimestamp - ONE_YEAR_IN_SECONDS * 1000},
    ];
    await mock(obseravtions);

    const result : {apy: number, timestampMs: number}[] = await getHistoricalVariableRate(
        "mockUrl",
        "mockId", 
        {
            granularityMs: ONE_YEAR_IN_SECONDS * 0.5 * 1000, 
            timeframeMs: ONE_YEAR_IN_SECONDS * 2 * 1000
        }
    );
    expect(result.length).to.be.eq(5);
    expect(result[3].apy).to.be.closeTo(5, 0.01)
  });

});
