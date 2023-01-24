import { expect } from 'chai';
import { waffle, network } from 'hardhat';
import { BrowserClient } from '@sentry/browser';
import * as sinon from 'sinon';
import axios from 'axios';
import { convertGasUnitsToUSD } from '../../src/utils/mellowHelpers/convertGasUnitsToUSD';
import { geckoEthToUsd } from '../../src/utils/priceFetch';
import * as initSDK from '../../src/init';

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
});
