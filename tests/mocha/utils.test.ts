import { expect } from "chai";
import { waffle, network } from "hardhat";
import { convertGasUnitsToUSD } from "../../src/utils/mellowHelpers/convertGasUnitsToUSD";
import { geckoEthToUsd } from "../../src/utils/priceFetch";
import * as initSDK from '../../src/init';
import Sinon from "sinon";
import { BrowserClient } from "@sentry/browser";

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
    Sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );
  });

  it('Gas Units to USD conversion function', async () => {
    const currentEthPrice = 1300;
    expect((await convertGasUnitsToUSD(provider, 100000)) / currentEthPrice).to.be.approximately(
      0.00245,
      0.00001,
    );

    expect(100000 * (await convertGasUnitsToUSD(provider, 1)) / currentEthPrice).to.be.approximately(
      0.00245,
      0.00001,
    );
  });
});