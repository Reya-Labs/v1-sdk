import { BigNumber, BigNumberish } from 'ethers';
import { toBn } from 'evm-bn';
import { expect } from 'chai';
import { before, describe, it } from 'mocha';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { getAccruedCashflow } from '../../src/services/getAccruedCashflow';
import { BaseRateOracle } from '../../src/typechain';
import * as initSDK from '../../src/init';

class MockBaseRateOracle {
  public apy: BigNumber = toBn('0');

  async setAPY(to: number) {
    this.apy = toBn(to.toString());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getApyFromTo(from: BigNumberish, to: BigNumberish) {
    return this.apy;
  }
}

describe('accrued cashflow tests', () => {
  let rateOracle: MockBaseRateOracle;

  before(async () => {
    rateOracle = new MockBaseRateOracle();
    await rateOracle.setAPY(0.03);
  });

  beforeEach(() => {
    sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );
  });

  afterEach(() => {
    // restore the original implementation of initSDK.getSentryTracker
    (initSDK.getSentryTracker as sinon.SinonStub).restore();
  });

  it('FT and extend FT', async () => {
    const result = await getAccruedCashflow({
      swaps: [
        {
          avgFixedRate: 0.05,
          notional: -1000,
          time: 90 * 24 * 60 * 60,
        },
        {
          avgFixedRate: 0.08,
          notional: -500,
          time: 180 * 24 * 60 * 60,
        },
      ],
      rateOracle: rateOracle as unknown as BaseRateOracle,
      currentTime: 270 * 24 * 60 * 60,
      endTime: 365 * 24 * 60 * 60,
    });

    // pre-swap accrued cashflow: (5% - 3%) * 1000 * 90 / 365
    // overall accrued cashflow: (6% - 3%) * 1500 * 90 / 365

    expect(result.avgFixedRate).to.be.closeTo(6, 6);
    expect(result.accruedCashflow).to.be.closeTo(16.02739726, 6);
  });

  it('FT and partial unwind VT', async () => {
    const result = await getAccruedCashflow({
      swaps: [
        {
          avgFixedRate: 0.05,
          notional: -1000,
          time: 90 * 24 * 60 * 60,
        },
        {
          avgFixedRate: 0.06,
          notional: 500,
          time: 180 * 24 * 60 * 60,
        },
      ],
      rateOracle: rateOracle as unknown as BaseRateOracle,
      currentTime: 270 * 24 * 60 * 60,
      endTime: 365 * 24 * 60 * 60,
    });

    // locked in profit: (5% - 6%) * 500 * 185 / 365
    // pre-unwind accrued cashflow: (5% - 3%) * 500 * 90 / 365
    // overall accrued cashflow: (5% - 3%) * 500 * 180 / 365

    expect(result.avgFixedRate).to.be.closeTo(5, 6);
    expect(result.accruedCashflow).to.be.closeTo(4.86301369, 6);
  });

  it('FT and larger unwind VT', async () => {
    const result = await getAccruedCashflow({
      swaps: [
        {
          avgFixedRate: 0.05,
          notional: -1000,
          time: 90 * 24 * 60 * 60,
        },
        {
          avgFixedRate: 0.06,
          notional: 1500,
          time: 180 * 24 * 60 * 60,
        },
      ],
      rateOracle: rateOracle as unknown as BaseRateOracle,
      currentTime: 270 * 24 * 60 * 60,
      endTime: 365 * 24 * 60 * 60,
    });

    // locked in profit: (5% - 6%) * 1000 * 185 / 365
    // pre-unwind accrued cashflow: (5% - 3%) * 1000 * 90 / 365
    // overall accrued cashflow: (3% - 6%) * 500 * 90 / 365

    expect(result.avgFixedRate).to.be.closeTo(6, 6);
    expect(result.accruedCashflow).to.be.closeTo(-3.83561643, 6);
  });

  it('VT and extend VT', async () => {
    const result = await getAccruedCashflow({
      swaps: [
        {
          avgFixedRate: 0.05,
          notional: 1000,
          time: 90 * 24 * 60 * 60,
        },
        {
          avgFixedRate: 0.08,
          notional: 500,
          time: 180 * 24 * 60 * 60,
        },
      ],
      rateOracle: rateOracle as unknown as BaseRateOracle,
      currentTime: 270 * 24 * 60 * 60,
      endTime: 365 * 24 * 60 * 60,
    });

    // pre-swap accrued cashflow: (3% - 5%) * 1000 * 90 / 365
    // overall accrued cashflow: (3% - 6%) * 1500 * 90 / 365

    expect(result.avgFixedRate).to.be.closeTo(6, 6);
    expect(result.accruedCashflow).to.be.closeTo(-16.02739726, 6);
  });

  it('VT and partial unwind FT', async () => {
    const result = await getAccruedCashflow({
      swaps: [
        {
          avgFixedRate: 0.05,
          notional: 1000,
          time: 90 * 24 * 60 * 60,
        },
        {
          avgFixedRate: 0.08,
          notional: -500,
          time: 180 * 24 * 60 * 60,
        },
      ],
      rateOracle: rateOracle as unknown as BaseRateOracle,
      currentTime: 270 * 24 * 60 * 60,
      endTime: 365 * 24 * 60 * 60,
    });

    // locked in profit: (8% - 5%) * 500 * 185 / 365
    // pre-unwind accrued cashflow: (3% - 5%) * 500 * 90 / 365
    // overall accrued cashflow: (3% - 5%) * 500 * 180 / 365

    expect(result.avgFixedRate).to.be.closeTo(5, 6);
    expect(result.accruedCashflow).to.be.closeTo(0.20547945, 6);
  });

  it('VT and larger unwind FT', async () => {
    const result = await getAccruedCashflow({
      swaps: [
        {
          avgFixedRate: 0.05,
          notional: 1000,
          time: 90 * 24 * 60 * 60,
        },
        {
          avgFixedRate: 0.08,
          notional: -1500,
          time: 180 * 24 * 60 * 60,
        },
      ],
      rateOracle: rateOracle as unknown as BaseRateOracle,
      currentTime: 270 * 24 * 60 * 60,
      endTime: 365 * 24 * 60 * 60,
    });

    // locked in profit: (8% - 5%) * 1000 * 185 / 365
    // pre-unwind accrued cashflow: (3% - 5%) * 1000 * 90 / 365
    // overall accrued cashflow: (8% - 3%) * 500 * 90 / 365

    expect(result.avgFixedRate).to.be.closeTo(8, 6);
    expect(result.accruedCashflow).to.be.closeTo(16.43835616, 6);
  });

  it('mixed case', async () => {
    const result = await getAccruedCashflow({
      swaps: [
        {
          avgFixedRate: 0.05,
          notional: 1000,
          time: 90 * 24 * 60 * 60,
        },
        {
          avgFixedRate: 0.06,
          notional: -500,
          time: 150 * 24 * 60 * 60,
        },
        {
          avgFixedRate: 0.07,
          notional: 750,
          time: 210 * 24 * 60 * 60,
        },
      ],
      rateOracle: rateOracle as unknown as BaseRateOracle,
      currentTime: 270 * 24 * 60 * 60,
      endTime: 365 * 24 * 60 * 60,
    });

    // locked in profit: (6% - 5%) * 500 * 215 / 365
    // pre-unwind accrued cashflow: (3% - 5%) * 500 * 60 / 365
    // remaining position: 500 VT @ 5% at day 90

    // pre-swap accrued cashflow: (3% - 5%) * 500 * 120 / 365
    // remaining position: 1250 VT @ 6.2% at day 210

    // overall accrued cashflow: (3% - 6.2%) * 1250 * 60 / 365

    expect(result.avgFixedRate).to.be.closeTo(6.2, 6);
    expect(result.accruedCashflow).to.be.closeTo(-8.56164383, 6);
  });
});
