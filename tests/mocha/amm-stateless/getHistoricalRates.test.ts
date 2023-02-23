import { describe } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import * as initSDK from '../../../src/init';
import { getHistoricalRates } from '../../../src/entities';
import * as fun from '../../../src/entities/amm/getters/historicalRates/getHistoricalRate';
import { ONE_DAY_IN_SECONDS } from '../../../src/constants';
import { BigNumber } from 'ethers';


describe('getHistoricalRates', () => {
    const mock = async (observations: any[]) => {
      sinon.stub(initSDK, 'getSentryTracker').callsFake(
        () =>
          ({
            captureException: () => undefined,
            captureMessage: () => undefined,
          } as unknown as BrowserClient),
      );
      
      sinon.stub(fun, 'getSubgraphData').resolves(observations);
    };
  
    const restore = async () => {
      sinon.restore();
    };
  
    afterEach(async () => {
      await restore();
    });
  
    it('start time earlier than observations', async () => {
      const currentTimestamp = Date.now();
      const obseravtions = [
          {value: BigNumber.from("47400000000000000"), timestampInMs: currentTimestamp - fun.Granularity.ONE_DAY},
      ];
      await mock(obseravtions);
  
      const resultFixed : fun.HistoricalRates[] = await getHistoricalRates(
          "mockUrl",
          true,
          {
              granularity: fun.Granularity.ONE_DAY, 
              timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
          },
          "mockId", 
          undefined
      );
  
      expect(resultFixed.length).to.be.eq(1);
      expect(resultFixed[0].value).to.be.eq(0.0474);

      const resultVariable : fun.HistoricalRates[] = await getHistoricalRates(
        "mockUrl",
        false,
        {
            granularity: fun.Granularity.ONE_DAY, 
            timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
        },
        undefined, 
        "mockId"
      );

      expect(resultVariable.length).to.be.eq(1);
      expect(resultVariable[0].value).to.be.eq(0.0474);
    });
  
    // this case should not happen, the subgraph should never return data is there isn't any
    it('start time later than observations', async () => {
        const currentTimestamp = Date.now();
        const obseravtions = [
            {value: BigNumber.from("47400000000000000"), timestampInMs: currentTimestamp - fun.Granularity.ONE_DAY * 2},
            {value: BigNumber.from("49100000000000000"), timestampInMs: currentTimestamp - fun.Granularity.ONE_DAY - 60000},
        ];
        await mock(obseravtions);
    
        const resultFixed : fun.HistoricalRates[] = await getHistoricalRates(
            "mockUrl", 
            true,
            {
                granularity: fun.Granularity.ONE_DAY, 
                timeframeMs: ONE_DAY_IN_SECONDS * 1 * 1000
            },
            "mockId",
            undefined
        );
    
        expect(resultFixed.length).to.be.eq(0);

        const resultVariable : fun.HistoricalRates[] = await getHistoricalRates(
            "mockUrl",
            false,
            {
                granularity: fun.Granularity.ONE_DAY, 
                timeframeMs: ONE_DAY_IN_SECONDS * 1 * 1000
            },
            undefined, 
            "mockId"
        );

        expect(resultVariable.length).to.be.eq(0);
    });
  
    it('many observations & big granularity', async () => {
        const currentTimestamp = Date.now() + 1000;
        const obseravtions = [
            {value: BigNumber.from("50000000000000000"), timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 2 * 1000},
            {value: BigNumber.from("40000000000000000"), timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 1.5 * 1000},
            {value: BigNumber.from("47000000000000000"), timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000},
            {value: BigNumber.from("400000000000000000"), timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 0.5 * 1000},
            {value: BigNumber.from("1100000000000000"), timestampInMs: currentTimestamp},
        ];
        await mock(obseravtions);
    
        const resultFixed : fun.HistoricalRates[] = await getHistoricalRates(
            "mockUrl", 
            true,
            {
                granularity: fun.Granularity.ONE_DAY, 
                timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
            },
            "mockId",
            undefined
        );
    
        expect(resultFixed.length).to.be.eq(2);
        expect(resultFixed[0].value).to.be.eq(0.05);
        expect(resultFixed[1].value).to.be.eq(0.047);

        const resultVariable : fun.HistoricalRates[] = await getHistoricalRates(
            "mockUrl",
            false,
            {
                granularity: fun.Granularity.ONE_DAY, 
                timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
            },
            undefined, 
            "mockId"
        );

        expect(resultVariable.length).to.be.eq(2);
        expect(resultVariable[0].value).to.be.eq(0.05);
        expect(resultVariable[1].value).to.be.eq(0.047);
    });
  
    it('little observation & smaller granularity', async () => {
        const currentTimestamp = Date.now();
        const obseravtions = [
            {value: BigNumber.from("47000000000000000"), timestampInMs: currentTimestamp - ONE_DAY_IN_SECONDS * 1 * 1000},
        ];
        await mock(obseravtions);
    
        const resultFixed : fun.HistoricalRates[] = await getHistoricalRates(
            "mockUrl", 
            true,
            {
                granularity: fun.Granularity.ONE_DAY, 
                timeframeMs: ONE_DAY_IN_SECONDS * 4 * 1000
            },
            "mockId",
            undefined
        );
    
        expect(resultFixed.length).to.be.eq(1);
        expect(resultFixed[0].value).to.be.eq(0.047);

        const resultVariable : fun.HistoricalRates[] = await getHistoricalRates(
            "mockUrl",
            false,
            {
                granularity: fun.Granularity.ONE_DAY, 
                timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
            },
            undefined, 
            "mockId"
        );

        expect(resultVariable.length).to.be.eq(1);
        expect(resultVariable[0].value).to.be.eq(0.047);
    });
  
    it('no observations', async () => {
        const currentTimestamp = Date.now();
        const obseravtions : { timestampInMs: number; value: BigNumber}[] = [];
        await mock(obseravtions);
    
        const resultFixed : fun.HistoricalRates[] = await getHistoricalRates(
            "mockUrl", 
            true,
            {
                granularity: fun.Granularity.ONE_DAY, 
                timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
            },
            "mockId",
            undefined
        );
    
        expect(resultFixed.length).to.be.eq(0);

        const resultVariable : fun.HistoricalRates[] = await getHistoricalRates(
            "mockUrl",
            false,
            {
                granularity: fun.Granularity.ONE_DAY, 
                timeframeMs: ONE_DAY_IN_SECONDS * 2 * 1000
            },
            undefined, 
            "mockId"
        );
        expect(resultVariable.length).to.be.eq(0);
    });
  
});
