import { expect } from 'chai';
import { waffle, network } from 'hardhat';
import { BrowserClient } from '@sentry/browser';
import * as sinon from 'sinon';
import axios from 'axios';
import { convertGasUnitsToUSD } from '../../src/utils/mellowHelpers/convertGasUnitsToUSD';
import { geckoEthToUsd } from '../../src/utils/priceFetch';
import * as initSDK from '../../src/init';
import { exponentialBackoff } from '../../src/utils/retry';
import { fail } from '../utils';

const { provider } = waffle;

describe('Test utils', () => {
  const resetNetwork = async (blockNumber: number) => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          chainId: 5,
          forking: {
            jsonRpcUrl: process.env.GOERLI_URL,
            blockNumber,
          },
        },
      ],
    });
  };

  beforeEach(async () => {
    await resetNetwork(8321776);

    sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );

    sinon.stub(axios, 'get').resolves({
      data: {
        ethereum: {
          usd: 1630.37,
        },
      },
    });
  });

  afterEach(() => {
    // restore the original implementation of initSDK.getSentryTracker
    (initSDK.getSentryTracker as sinon.SinonStub).restore();

    // restore the original implementation of axios.get
    (axios.get as sinon.SinonStub).restore();
  });

  it('Gas Units to USD conversion function', async () => {
    const currentEthPrice = await geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || '');
    expect((await convertGasUnitsToUSD(provider, 100000)) / currentEthPrice).to.be.approximately(
      0.00198,
      0.00001,
    );

    expect(
      (100000 * (await convertGasUnitsToUSD(provider, 1))) / currentEthPrice,
    ).to.be.approximately(0.00198, 0.00001);
  });

  describe('Exponential backoff', () => {
    it('successfull call - first attempt', async () => {
      const call = async () => 1;

      let timeElapsed = Date.now().valueOf();
      const response = await exponentialBackoff(call);
      timeElapsed = Date.now().valueOf() - timeElapsed;
      expect(response).to.be.eq(1);
      expect(timeElapsed).to.be.lessThan(1000);
    });

    it('successfull call - second attempt', async () => {
      let tries = 0;
      const call = async () => {
        tries += 1;
        if (tries <= 1) {
          throw new Error('attempt fails');
        }
        return 1;
      };

      let timeElapsed = Date.now().valueOf();
      const response = await exponentialBackoff(call);
      timeElapsed = Date.now().valueOf() - timeElapsed;
      expect(response).to.be.eq(1);
      expect(timeElapsed).to.be.greaterThan(1000);
      expect(timeElapsed).to.be.lessThan(2000);
    });

    it('successfull call - third attempt', async () => {
      let tries = 0;
      const call = async () => {
        tries += 1;
        if (tries <= 2) {
          throw new Error('attempt fails');
        }
        return 1;
      };

      let timeElapsed = Date.now().valueOf();
      const response = await exponentialBackoff(call);
      timeElapsed = Date.now().valueOf() - timeElapsed;
      expect(response).to.be.eq(1);
      expect(timeElapsed).to.be.greaterThan(3000);
      expect(timeElapsed).to.be.lessThan(4000);
    });

    it('failing call', async () => {
      const call = async () => {
        throw new Error('attempt fails');
      };

      let timeElapsed = Date.now().valueOf();
      try {
        await exponentialBackoff(call, 3);
        fail();
      } catch (error: unknown) {
        timeElapsed = Date.now().valueOf() - timeElapsed;
        expect(timeElapsed).to.be.greaterThan(3000);
        expect(timeElapsed).to.be.lessThan(4000);

        expect((error as Error).message).to.be.eq('attempt fails');
      }
    });
  });
});
