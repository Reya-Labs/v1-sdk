import { expect } from 'chai';
import { waffle, network } from 'hardhat';
import { convertGasUnitsToUSD } from '../../src/utils/mellowHelpers/convertGasUnitsToUSD';
import { geckoEthToUsd } from '../../src/utils/priceFetch';
import { delay } from '../../src/utils/retry';

const { provider } = waffle;

describe('Test utils', () => {
  const resetNetwork = async (blockNumber: number) => {
    await delay(1000);
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
