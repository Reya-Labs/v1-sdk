import { ONE_WEEK_IN_SECONDS } from '../../src/constants';

import {
  addSwapsToCashflowInfo,
  DEFAULT_ADVANCED_CASHFLOW_INFO,
} from '../../src/services/getAccruedCashflow';

jest.setTimeout(50000);

describe('accrued cashflow calculation', () => {
  it('no swaps', async () => {
    const info = await addSwapsToCashflowInfo({
      info: DEFAULT_ADVANCED_CASHFLOW_INFO,
      swaps: [],
      apyGenerator: async () => 0.03,
      currentTime: 0,
      endTime: 0,
    });

    expect(info.time).toBeCloseTo(0);
    expect(info.notional).toBeCloseTo(0);
    expect(info.avgFixedRate).toBeCloseTo(0);
    expect(info.lockedCashflow.fixed).toBeCloseTo(0);
    expect(info.lockedCashflow.variable).toBeCloseTo(0);
    expect(info.accruingCashflow.fixed).toBeCloseTo(0);
    expect(info.accruingCashflow.variable).toBeCloseTo(0);
    expect(info.estimatedFutureCashflow(0.03).fixed).toBeCloseTo(0);
    expect(info.estimatedFutureCashflow(0.03).variable).toBeCloseTo(0);
  });

  it('one swap (current < end)', async () => {
    const info = await addSwapsToCashflowInfo({
      info: DEFAULT_ADVANCED_CASHFLOW_INFO,
      swaps: [
        {
          time: ONE_WEEK_IN_SECONDS,
          notional: 1000,
          avgFixedRate: 0.02,
        },
      ],
      apyGenerator: async () => 0.03,
      currentTime: 2 * ONE_WEEK_IN_SECONDS,
      endTime: 3 * ONE_WEEK_IN_SECONDS,
    });

    expect(info.time).toBeCloseTo(ONE_WEEK_IN_SECONDS);
    expect(info.notional).toBeCloseTo(1000);
    expect(info.avgFixedRate).toBeCloseTo(0.02);
    expect(info.lockedCashflow.fixed).toBeCloseTo(0);
    expect(info.lockedCashflow.variable).toBeCloseTo(0);
    expect(info.accruingCashflow.fixed).toBeCloseTo(((-1000 * 7) / 365) * 0.02);
    expect(info.accruingCashflow.variable).toBeCloseTo(((1000 * 7) / 365) * 0.03);
    expect(info.estimatedFutureCashflow(0.03).fixed).toBeCloseTo(((-1000 * 7) / 365) * 0.02);
    expect(info.estimatedFutureCashflow(0.03).variable).toBeCloseTo(((1000 * 7) / 365) * 0.03);
  });

  it('one swap (current > end)', async () => {
    const info = await addSwapsToCashflowInfo({
      info: DEFAULT_ADVANCED_CASHFLOW_INFO,
      swaps: [
        {
          time: ONE_WEEK_IN_SECONDS,
          notional: 1000,
          avgFixedRate: 0.02,
        },
      ],
      apyGenerator: async () => 0.03,
      currentTime: 4 * ONE_WEEK_IN_SECONDS,
      endTime: 3 * ONE_WEEK_IN_SECONDS,
    });

    expect(info.time).toBeCloseTo(ONE_WEEK_IN_SECONDS);
    expect(info.notional).toBeCloseTo(1000);
    expect(info.avgFixedRate).toBeCloseTo(0.02);
    expect(info.lockedCashflow.fixed).toBeCloseTo(0);
    expect(info.lockedCashflow.variable).toBeCloseTo(0);
    expect(info.accruingCashflow.fixed).toBeCloseTo(((-1000 * 14) / 365) * 0.02);
    expect(info.accruingCashflow.variable).toBeCloseTo(((1000 * 14) / 365) * 0.03);
    expect(info.estimatedFutureCashflow(0.03).fixed).toBeCloseTo(0);
    expect(info.estimatedFutureCashflow(0.03).variable).toBeCloseTo(0);
  });

  it('two VT swaps', async () => {
    const info = await addSwapsToCashflowInfo({
      info: DEFAULT_ADVANCED_CASHFLOW_INFO,
      swaps: [
        {
          time: ONE_WEEK_IN_SECONDS,
          notional: 1000,
          avgFixedRate: 0.02,
        },
        {
          time: 2 * ONE_WEEK_IN_SECONDS,
          notional: 1000,
          avgFixedRate: 0.025,
        },
      ],
      apyGenerator: async () => 0.03,
      currentTime: 3 * ONE_WEEK_IN_SECONDS,
      endTime: 4 * ONE_WEEK_IN_SECONDS,
    });

    expect(info.time).toBeCloseTo(2 * ONE_WEEK_IN_SECONDS);
    expect(info.notional).toBeCloseTo(2000);
    expect(info.avgFixedRate).toBeCloseTo(0.0225);
    expect(info.lockedCashflow.fixed).toBeCloseTo(((-1000 * 7) / 365) * 0.02);
    expect(info.lockedCashflow.variable).toBeCloseTo(((1000 * 7) / 365) * 0.03);
    expect(info.accruingCashflow.fixed).toBeCloseTo(((-2000 * 7) / 365) * 0.0225);
    expect(info.accruingCashflow.variable).toBeCloseTo(((2000 * 7) / 365) * 0.03);
    expect(info.estimatedFutureCashflow(0.03).fixed).toBeCloseTo(((-2000 * 7) / 365) * 0.0225);
    expect(info.estimatedFutureCashflow(0.03).variable).toBeCloseTo(((2000 * 7) / 365) * 0.03);
  });

  it('two FT swaps', async () => {
    const info = await addSwapsToCashflowInfo({
      info: DEFAULT_ADVANCED_CASHFLOW_INFO,
      swaps: [
        {
          time: ONE_WEEK_IN_SECONDS,
          notional: -1000,
          avgFixedRate: 0.02,
        },
        {
          time: 2 * ONE_WEEK_IN_SECONDS,
          notional: -1000,
          avgFixedRate: 0.025,
        },
      ],
      apyGenerator: async () => 0.03,
      currentTime: 3 * ONE_WEEK_IN_SECONDS,
      endTime: 4 * ONE_WEEK_IN_SECONDS,
    });

    expect(info.time).toBeCloseTo(2 * ONE_WEEK_IN_SECONDS);
    expect(info.notional).toBeCloseTo(-2000);
    expect(info.avgFixedRate).toBeCloseTo(0.0225);
    expect(info.lockedCashflow.fixed).toBeCloseTo(((1000 * 7) / 365) * 0.02);
    expect(info.lockedCashflow.variable).toBeCloseTo(((-1000 * 7) / 365) * 0.03);
    expect(info.accruingCashflow.fixed).toBeCloseTo(((2000 * 7) / 365) * 0.0225);
    expect(info.accruingCashflow.variable).toBeCloseTo(((-2000 * 7) / 365) * 0.03);
    expect(info.estimatedFutureCashflow(0.03).fixed).toBeCloseTo(((2000 * 7) / 365) * 0.0225);
    expect(info.estimatedFutureCashflow(0.03).variable).toBeCloseTo(((-2000 * 7) / 365) * 0.03);
  });

  it('one VT, one partial unwind', async () => {
    const info = await addSwapsToCashflowInfo({
      info: DEFAULT_ADVANCED_CASHFLOW_INFO,
      swaps: [
        {
          time: ONE_WEEK_IN_SECONDS,
          notional: 1000,
          avgFixedRate: 0.02,
        },
        {
          time: 2 * ONE_WEEK_IN_SECONDS,
          notional: -500,
          avgFixedRate: 0.025,
        },
      ],
      apyGenerator: async () => 0.03,
      currentTime: 3 * ONE_WEEK_IN_SECONDS,
      endTime: 4 * ONE_WEEK_IN_SECONDS,
    });

    expect(info.time).toBeCloseTo(ONE_WEEK_IN_SECONDS);
    expect(info.notional).toBeCloseTo(500);
    expect(info.avgFixedRate).toBeCloseTo(0.02);
    expect(info.lockedCashflow.fixed).toBeCloseTo(
      ((-500 * 7) / 365) * 0.02 + (500 * 0.005 * 14) / 365,
    );
    expect(info.lockedCashflow.variable).toBeCloseTo(((500 * 7) / 365) * 0.03);
    expect(info.accruingCashflow.fixed).toBeCloseTo(((-500 * 14) / 365) * 0.02);
    expect(info.accruingCashflow.variable).toBeCloseTo(((500 * 14) / 365) * 0.03);
    expect(info.estimatedFutureCashflow(0.03).fixed).toBeCloseTo(((-500 * 7) / 365) * 0.02);
    expect(info.estimatedFutureCashflow(0.03).variable).toBeCloseTo(((500 * 7) / 365) * 0.03);
  });

  it('one VT, one bigger FT', async () => {
    const info = await addSwapsToCashflowInfo({
      info: DEFAULT_ADVANCED_CASHFLOW_INFO,
      swaps: [
        {
          time: ONE_WEEK_IN_SECONDS,
          notional: 1000,
          avgFixedRate: 0.02,
        },
        {
          time: 2 * ONE_WEEK_IN_SECONDS,
          notional: -1500,
          avgFixedRate: 0.025,
        },
      ],
      apyGenerator: async () => 0.03,
      currentTime: 3 * ONE_WEEK_IN_SECONDS,
      endTime: 4 * ONE_WEEK_IN_SECONDS,
    });

    expect(info.time).toBeCloseTo(2 * ONE_WEEK_IN_SECONDS);
    expect(info.notional).toBeCloseTo(-500);
    expect(info.avgFixedRate).toBeCloseTo(0.025);
    expect(info.lockedCashflow.fixed).toBeCloseTo(
      ((-1000 * 7) / 365) * 0.02 + (1000 * 0.005 * 14) / 365,
    );
    expect(info.lockedCashflow.variable).toBeCloseTo(((1000 * 7) / 365) * 0.03);
    expect(info.accruingCashflow.fixed).toBeCloseTo(((500 * 7) / 365) * 0.025);
    expect(info.accruingCashflow.variable).toBeCloseTo(((-500 * 7) / 365) * 0.03);
    expect(info.estimatedFutureCashflow(0.03).fixed).toBeCloseTo(((500 * 7) / 365) * 0.025);
    expect(info.estimatedFutureCashflow(0.03).variable).toBeCloseTo(((-500 * 7) / 365) * 0.03);
  });

  it('one FT, one partial unwind', async () => {
    const info = await addSwapsToCashflowInfo({
      info: DEFAULT_ADVANCED_CASHFLOW_INFO,
      swaps: [
        {
          time: ONE_WEEK_IN_SECONDS,
          notional: -1000,
          avgFixedRate: 0.02,
        },
        {
          time: 2 * ONE_WEEK_IN_SECONDS,
          notional: 500,
          avgFixedRate: 0.025,
        },
      ],
      apyGenerator: async () => 0.03,
      currentTime: 3 * ONE_WEEK_IN_SECONDS,
      endTime: 4 * ONE_WEEK_IN_SECONDS,
    });

    expect(info.time).toBeCloseTo(ONE_WEEK_IN_SECONDS);
    expect(info.notional).toBeCloseTo(-500);
    expect(info.avgFixedRate).toBeCloseTo(0.02);
    expect(info.lockedCashflow.fixed).toBeCloseTo(
      ((500 * 7) / 365) * 0.02 + (-500 * 0.005 * 14) / 365,
    );
    expect(info.lockedCashflow.variable).toBeCloseTo(((-500 * 7) / 365) * 0.03);
    expect(info.accruingCashflow.fixed).toBeCloseTo(((500 * 14) / 365) * 0.02);
    expect(info.accruingCashflow.variable).toBeCloseTo(((-500 * 14) / 365) * 0.03);
    expect(info.estimatedFutureCashflow(0.03).fixed).toBeCloseTo(((500 * 7) / 365) * 0.02);
    expect(info.estimatedFutureCashflow(0.03).variable).toBeCloseTo(((-500 * 7) / 365) * 0.03);
  });

  it('one FT, one bigger VT', async () => {
    const info = await addSwapsToCashflowInfo({
      info: DEFAULT_ADVANCED_CASHFLOW_INFO,
      swaps: [
        {
          time: ONE_WEEK_IN_SECONDS,
          notional: -1000,
          avgFixedRate: 0.02,
        },
        {
          time: 2 * ONE_WEEK_IN_SECONDS,
          notional: 1500,
          avgFixedRate: 0.025,
        },
      ],
      apyGenerator: async () => 0.03,
      currentTime: 3 * ONE_WEEK_IN_SECONDS,
      endTime: 4 * ONE_WEEK_IN_SECONDS,
    });

    expect(info.time).toBeCloseTo(2 * ONE_WEEK_IN_SECONDS);
    expect(info.notional).toBeCloseTo(500);
    expect(info.avgFixedRate).toBeCloseTo(0.025);
    expect(info.lockedCashflow.fixed).toBeCloseTo(
      ((1000 * 7) / 365) * 0.02 + (-1000 * 0.005 * 14) / 365,
    );
    expect(info.lockedCashflow.variable).toBeCloseTo(((-1000 * 7) / 365) * 0.03);
    expect(info.accruingCashflow.fixed).toBeCloseTo(((-500 * 7) / 365) * 0.025);
    expect(info.accruingCashflow.variable).toBeCloseTo(((500 * 7) / 365) * 0.03);
    expect(info.estimatedFutureCashflow(0.03).fixed).toBeCloseTo(((-500 * 7) / 365) * 0.025);
    expect(info.estimatedFutureCashflow(0.03).variable).toBeCloseTo(((500 * 7) / 365) * 0.03);
  });
});
