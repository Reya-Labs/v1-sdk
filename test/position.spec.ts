/* eslint-disable no-restricted-syntax */

import { providers } from 'ethers';
import * as dotenv from 'dotenv';
import { getPosition } from '../scripts/getPosition';
import { getAMM } from '../scripts/getAMM';

import * as mainnetPools from '../pool-addresses/mainnet.json';

dotenv.config();
jest.setTimeout(50000);

describe('position', () => {
  const provider = new providers.JsonRpcProvider('http://localhost:8545');

  it('LP position', async () => {
    const poolName = 'aUSDC_v3';
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    const userAddress = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';
    const tickLower = -4680;
    const tickUpper = -3360;

    const amm = await getAMM({
      vammAddress: item.vamm,
      provider,
      signer: userAddress,
    });

    const position = await getPosition({
      amm,
      userAddress,
      tickLower,
      tickUpper,
    });

    const expectedPositionId = `${item.marginEngine.toLowerCase()}#${userAddress.toLowerCase()}#${tickLower}#${tickUpper}`;

    expect(position.id).toBe(expectedPositionId);
    expect(position.owner).toBe(userAddress);
    expect(position.fixedLow).toBeCloseTo(1.4);
    expect(position.fixedHigh).toBeCloseTo(1.6);

    expect(position.positionType).toBe(3);

    expect(position.liquidity).toBeCloseTo(1010);
    expect(position.accumulatedFees).toBeCloseTo(0.13);

    expect(position.margin).toBeCloseTo(3.13);
    expect(position.fixedTokenBalance).toBeCloseTo(-737.63);
    expect(position.variableTokenBalance).toBeCloseTo(513.33);

    expect(position.timestamp).toBe(1664540159);
    expect(position.isSettled).toBe(false);

    expect(position.requirements.liquidation).toBeCloseTo(1.47991);
    expect(position.requirements.safety).toBeCloseTo(1.64844);

    expect(position.inRange).toBe('RED');
    expect(position.healthFactor).toBe('GREEN');
  });

  it('Trader position', async () => {
    const poolName = 'borrow_aUSDC_v1';
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    const amm = await getAMM({
      vammAddress: item.vamm,
      provider,
    });

    const userAddress = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';
    const tickLower = -69060;
    const tickUpper = 0;

    const position = await getPosition({
      amm,
      userAddress,
      tickLower,
      tickUpper,
    });

    const expectedPositionId = `${item.marginEngine.toLowerCase()}#${userAddress.toLowerCase()}#${tickLower}#${tickUpper}`;

    expect(position.id).toBe(expectedPositionId);
    expect(position.owner).toBe(userAddress);

    expect(position.positionType).toBe(2);

    expect(position.liquidity).toBeCloseTo(0);
    expect(position.accumulatedFees).toBeCloseTo(0);

    expect(position.margin).toBeCloseTo(9.18);
    expect(position.fixedTokenBalance).toBeCloseTo(-1441.36);
    expect(position.variableTokenBalance).toBeCloseTo(1000);

    expect(position.timestamp).toBe(1661156184);
    expect(position.isSettled).toBe(false);

    expect(position.accruedCashflow).toBeCloseTo(0.09747);
    expect(position.receivingRate).toBeCloseTo(2.14294);
    expect(position.payingRate).toBeCloseTo(1.44136);
    expect(position.requirements.liquidation).toBeCloseTo(1.20932);
    expect(position.requirements.safety).toBeCloseTo(3.63632);

    expect(position.healthFactor).toBe('GREEN');
  });
});
