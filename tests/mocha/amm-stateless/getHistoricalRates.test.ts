import { describe } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import * as initSDK from '../../../src/init';
import { getHistoricalVariableRate, getHistoricalFixedRates } from '../../../src/entities';
import * as fun from '../../../src/entities/amm/getters/historicalRates/getHistoricalVariableRate';
import * as funFixed from '../../../src/entities/amm/getters/historicalRates/getHistoricalFixedRate';
import { RateUpdate, TickUpdate } from '@voltz-protocol/subgraph-data';
import { ONE_DAY_IN_SECONDS, ONE_YEAR_IN_SECONDS, WAD } from '../../../src/constants';
import { BigNumber } from 'ethers';

describe.skip('getHistoricalVariableRate', () => {
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

describe('getHistoricalFixedRate', () => {
    const mock = async (observations: TickUpdate[]) => {
      sinon.stub(initSDK, 'getSentryTracker').callsFake(
        () =>
          ({
            captureException: () => undefined,
            captureMessage: () => undefined,
          } as unknown as BrowserClient),
      );
      
      sinon.stub(funFixed, 'getSubgraphData').resolves(observations);
    };
  
    const restore = async () => {
      sinon.restore();
    };
  
    afterEach(async () => {
      await restore();
    });
  
    it('start time earlier than observations', async () => {
      const currentTimestamp = Date.now();
      const obseravtions : TickUpdate[] = [
          {id: "mockId2", tick: BigNumber.from(6960), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000},
      ];
      await mock(obseravtions);
  
      const result : {rate: number, timestampMs: number}[] = await getHistoricalFixedRates(
          "mockUrl",
          "mockId", 
          {
              granularityMs: ONE_DAY_IN_SECONDS * 0.5 * 1000, 
              timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
          }
      );
  
      console.log(result);
      expect(result.length).to.be.eq(5);
      expect(result[0].rate).to.be.eq(1);
    });
  
    it('end time later than observations', async () => {
        const currentTimestamp = Date.now();
        const obseravtions : TickUpdate[] = [
            {id: "mockId2", tick: BigNumber.from(6960), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000},
            {id: "mockId2", tick: BigNumber.from(0), timestampInMS: currentTimestamp},
        ];
        await mock(obseravtions);
    
        const result : {rate: number, timestampMs: number}[] = await getHistoricalFixedRates(
            "mockUrl",
            "mockId", 
            {
                granularityMs: ONE_DAY_IN_SECONDS * 0.5 * 1000, 
                timeframeMs: ONE_DAY_IN_SECONDS * 1 * 1000
            }
        );
    
        console.log(result);
        expect(result.length).to.be.eq(3);
        expect(result[2].rate).to.be.eq(1);
    });
  
    it('many observations & big granularity', async () => {
        const currentTimestamp = Date.now();
        const obseravtions : TickUpdate[] = [
            {id: "mockId2", tick: BigNumber.from(6900), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 2 * 1000},
            {id: "mockId2", tick: BigNumber.from(0), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 1.5 * 1000},
            {id: "mockId2", tick: BigNumber.from(6960), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000},
            {id: "mockId2", tick: BigNumber.from(6000), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 0.5 * 1000},
            {id: "mockId2", tick: BigNumber.from(5940), timestampInMS: currentTimestamp},
        ];
        await mock(obseravtions);
    
        const result : {rate: number, timestampMs: number}[] = await getHistoricalFixedRates(
            "mockUrl",
            "mockId", 
            {
                granularityMs: ONE_DAY_IN_SECONDS * 1000, 
                timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
            }
        );
    
        console.log(result);
        expect(result.length).to.be.eq(3);
        expect(result[0].rate).to.be.eq(1/(1.0001 ** 6900));
        expect(result[1].rate).to.be.eq(1/(1.0001 ** 6960));
        expect(result[2].rate).to.be.eq(1/(1.0001 ** 5940));
    });
  
    it('little observation & smaller granularity', async () => {
        const currentTimestamp = Date.now();
        const obseravtions : TickUpdate[] = [
            {id: "mockId2", tick: BigNumber.from(6960), timestampInMS: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000},
        ];
        await mock(obseravtions);
    
        const result : {rate: number, timestampMs: number}[] = await getHistoricalFixedRates(
            "mockUrl",
            "mockId", 
            {
                granularityMs: ONE_DAY_IN_SECONDS * 0.5 * 1000, 
                timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
            }
        );
    
        console.log(result);
        expect(result.length).to.be.eq(5);
        expect(result[0].rate).to.be.eq(1);
        expect(result[1].rate).to.be.eq(1);
        expect(result[2].rate).to.be.eq(1/(1.0001 ** 6960));
        expect(result[3].rate).to.be.eq(1/(1.0001 ** 6960));
        expect(result[4].rate).to.be.eq(1/(1.0001 ** 6960));
    });
  
    it('no observations', async () => {
        const currentTimestamp = Date.now();
        const obseravtions : TickUpdate[] = [];
        await mock(obseravtions);
    
        const result : {rate: number, timestampMs: number}[] = await getHistoricalFixedRates(
            "mockUrl",
            "mockId", 
            {
                granularityMs: ONE_DAY_IN_SECONDS * 0.5 * 1000, 
                timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
            }
        );
    
        console.log(result);
        expect(result.length).to.be.eq(5);
        expect(result[0].rate).to.be.eq(1);
        expect(result[1].rate).to.be.eq(1);
        expect(result[2].rate).to.be.eq(1);
        expect(result[3].rate).to.be.eq(1);
        expect(result[4].rate).to.be.eq(1);
    });
  
});
