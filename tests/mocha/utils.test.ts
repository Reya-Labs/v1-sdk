import { expect } from "chai";
import { BigNumber } from "ethers";
import { waffle } from "hardhat";
import { convertGasUnitsToUSD } from "../../src/utils/mellowHelpers/convertGasUnitsToUSD";
import { getGasPriceGwei } from "../../src/utils/mellowHelpers/getGasPriceGwei";
import { geckoEthToUsd } from "../../src/utils/priceFetch";

const { provider } = waffle;

describe('Test utils', () => {
  it('Gas Units to USD conversion function', async () => {
    expect(await convertGasUnitsToUSD(provider, 100000)).to.be.approximately(
      3.953,
      0.1,
    );

    expect(100000 * (await convertGasUnitsToUSD(provider, 1))).to.be.approximately(
      3.953,
      0.1,
    );
  });
});