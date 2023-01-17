import { expect } from "chai";
import { waffle, network } from "hardhat";
import { convertGasUnitsToUSD } from "../../src/utils/mellowHelpers/convertGasUnitsToUSD";

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
  });

  it('Gas Units to USD conversion function', async () => {
    expect(await convertGasUnitsToUSD(provider, 100000)).to.be.approximately(
      3.12,
      0.1,
    );

    expect(100000 * (await convertGasUnitsToUSD(provider, 1))).to.be.approximately(
      3.12,
      0.1,
    );
  });
});