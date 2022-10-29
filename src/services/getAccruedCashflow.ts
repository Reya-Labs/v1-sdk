import { isUndefined } from 'lodash';
import { ONE_YEAR_IN_SECONDS } from '../constants';

type Swap = {
  time: number;
  notional: number;
  avgFixedRate: number;
};

type CashflowInfo = {
  time: number;
  notional: number;
  avgFixedRate: number;
  lockedCashflow: {
    fixed: number;
    variable: number;
  };
};

const DEFAULT_CASHFLOW_INFO: CashflowInfo = {
  time: 0,
  notional: 0,
  avgFixedRate: 0,
  lockedCashflow: {
    fixed: 0,
    variable: 0,
  },
};

export type AdvancedCashflowInfo = CashflowInfo & {
  accruingCashflow: {
    fixed: number;
    variable: number;
  };
  estimatedFutureCashflow: (predictedAPY: number) => {
    fixed: number;
    variable: number;
  };
};

export const DEFAULT_ADVANCED_CASHFLOW_INFO: AdvancedCashflowInfo = {
  ...DEFAULT_CASHFLOW_INFO,
  accruingCashflow: {
    fixed: 0,
    variable: 0,
  },
  estimatedFutureCashflow: () => {
    return {
      fixed: 0,
      variable: 0,
    };
  },
};

export type CashflowInfoArgs = {
  info?: AdvancedCashflowInfo;
  swaps: Swap[];
  apyGenerator: (from: number, to: number) => Promise<number>;
  currentTime: number;
  endTime: number;
};

const getAnnualizedTime = (start: number, end: number): number => {
  return (end - start) / ONE_YEAR_IN_SECONDS;
};

// get locked cashflow of some position between two timestamps
function getLockedCashflowBetween(
  notional: number,
  fixedRate: number,
  variableRate: number,
  from: number,
  to: number,
): {
  fixed: number;
  variable: number;
} {
  // if notional > 0 -- VT, receives variable, pays fixed
  // if notional < 0 -- FT, received fixed, pays variable

  const nTime = getAnnualizedTime(from, to);

  return {
    fixed: -notional * nTime * fixedRate,
    variable: notional * nTime * variableRate,
  };
}

// in the case of an unwind, get the locked "profit" in the fixed token balance
// e.g. some position of 1,000 VT notional @ avg fixed rate 5%
// an unwind of 500 FT notional is triggered @ avg fixed rate 6% (at time T)
// the locked "profit" is 500 * (5% - 6%) * (Maturity - T) / YEAR
function getLockedInProfit(
  notional: number, // notional of unwind
  timeInYears: number,
  fixedRate0: number,
  fixedRate1: number,
) {
  // if the notional in unwind > 0, this means that the position is FT, then unwind (VT)
  // if the notional in unwind < 0, this means that the position is VT, then unwind (FT)

  return notional * timeInYears * (fixedRate0 - fixedRate1);
}

const addSwap = (
  info: CashflowInfo,
  swap: Swap,
  variableRateInBetween: number,
  endTime: number,
): CashflowInfo => {
  if (info.time === 0) {
    // info consists of no swaps
    return {
      time: swap.time,
      avgFixedRate: swap.avgFixedRate,
      notional: swap.notional,
      lockedCashflow: {
        fixed: 0,
        variable: 0,
      },
    };
  }

  if (info.time > swap.time) {
    throw new Error('Invalid input in cashflow');
  }

  const timeUntilMaturity = getAnnualizedTime(swap.time, endTime);

  if (info.notional >= 0) {
    // overall position: VT

    if (swap.notional < 0) {
      // swap: FT

      if (info.notional + swap.notional > 0) {
        // partial unwind

        const lockedInProfit = getLockedInProfit(
          swap.notional,
          timeUntilMaturity,
          info.avgFixedRate,
          swap.avgFixedRate,
        );

        const accruedCashflowBetween = getLockedCashflowBetween(
          -swap.notional, // notional > 0
          info.avgFixedRate,
          variableRateInBetween,
          info.time,
          swap.time,
        );

        return {
          time: info.time,
          notional: info.notional + swap.notional,
          avgFixedRate: info.avgFixedRate,
          lockedCashflow: {
            fixed: info.lockedCashflow.fixed + lockedInProfit + accruedCashflowBetween.fixed,
            variable: info.lockedCashflow.variable + accruedCashflowBetween.variable,
          },
        };
      } else {
        // full unwind + FT

        const lockedInProfit = getLockedInProfit(
          -info.notional,
          timeUntilMaturity,
          info.avgFixedRate,
          swap.avgFixedRate,
        );

        const accruedCashflowBetween = getLockedCashflowBetween(
          info.notional, // notional > 0
          info.avgFixedRate,
          variableRateInBetween,
          info.time,
          swap.time,
        );

        return {
          time: swap.time,
          notional: info.notional + swap.notional,
          avgFixedRate: swap.avgFixedRate,
          lockedCashflow: {
            fixed: info.lockedCashflow.fixed + lockedInProfit + accruedCashflowBetween.fixed,
            variable: info.lockedCashflow.variable + accruedCashflowBetween.variable,
          },
        };
      }
    } else {
      // swap: VT -- extend position

      const accruedCashflowBetween = getLockedCashflowBetween(
        info.notional,
        info.avgFixedRate,
        variableRateInBetween,
        info.time,
        swap.time,
      );

      return {
        time: swap.time,
        notional: info.notional + swap.notional,
        avgFixedRate:
          (info.avgFixedRate * info.notional + swap.avgFixedRate * swap.notional) /
          (info.notional + swap.notional),
        lockedCashflow: {
          fixed: info.lockedCashflow.fixed + accruedCashflowBetween.fixed,
          variable: info.lockedCashflow.variable + accruedCashflowBetween.variable,
        },
      };
    }
  } else {
    // position: FT

    if (swap.notional < 0) {
      // swap: FT -- extend position

      const accruedCashflowBetween = getLockedCashflowBetween(
        info.notional,
        info.avgFixedRate,
        variableRateInBetween,
        info.time,
        swap.time,
      );

      return {
        time: swap.time,
        notional: info.notional + swap.notional,
        avgFixedRate:
          (info.avgFixedRate * info.notional + swap.avgFixedRate * swap.notional) /
          (info.notional + swap.notional),
        lockedCashflow: {
          fixed: info.lockedCashflow.fixed + accruedCashflowBetween.fixed,
          variable: info.lockedCashflow.variable + accruedCashflowBetween.variable,
        },
      };
    } else {
      // swap: VT

      if (info.notional + swap.notional < 0) {
        // partial unwind

        const lockedInProfit = getLockedInProfit(
          swap.notional,
          timeUntilMaturity,
          info.avgFixedRate,
          swap.avgFixedRate,
        );

        const accruedCashflowBetween = getLockedCashflowBetween(
          -swap.notional, // notional < 0
          info.avgFixedRate,
          variableRateInBetween,
          info.time,
          swap.time,
        );

        return {
          time: info.time,
          notional: info.notional + swap.notional,
          avgFixedRate: info.avgFixedRate,
          lockedCashflow: {
            fixed: info.lockedCashflow.fixed + lockedInProfit + accruedCashflowBetween.fixed,
            variable: info.lockedCashflow.variable + accruedCashflowBetween.variable,
          },
        };
      } else {
        // full unwind + VT

        const lockedInProfit = getLockedInProfit(
          -info.notional,
          timeUntilMaturity,
          info.avgFixedRate,
          swap.avgFixedRate,
        );

        const accruedCashflowBetween = getLockedCashflowBetween(
          info.notional, // notional < 0
          info.avgFixedRate,
          variableRateInBetween,
          info.time,
          swap.time,
        );

        return {
          time: swap.time,
          notional: info.notional + swap.notional,
          avgFixedRate: swap.avgFixedRate,
          lockedCashflow: {
            fixed: info.lockedCashflow.fixed + lockedInProfit + accruedCashflowBetween.fixed,
            variable: info.lockedCashflow.variable + accruedCashflowBetween.variable,
          },
        };
      }
    }
  }
};

const extendCashflowInfo = (
  info: CashflowInfo,
  variableRateUntilNow: number,
  currentTime: number,
  endTime: number,
): AdvancedCashflowInfo => {
  const accruingCashflow = getLockedCashflowBetween(
    info.notional,
    info.avgFixedRate,
    variableRateUntilNow,
    info.time,
    currentTime,
  );

  // calculation of estimating the future cashflow
  const estimatedFutureCashflow = (predictedAPY: number) => {
    return getLockedCashflowBetween(
      info.notional,
      info.avgFixedRate,
      predictedAPY,
      currentTime,
      endTime,
    );
  };

  return {
    ...info,
    accruingCashflow,
    estimatedFutureCashflow,
  };
};

export const addSwapsToCashflowInfo = async ({
  info: info_,
  swaps,
  apyGenerator,
  currentTime: currentTime_,
  endTime,
}: CashflowInfoArgs): Promise<AdvancedCashflowInfo> => {
  const currentTime = currentTime_ <= endTime ? currentTime_ : endTime;
  let info = isUndefined(info_) ? DEFAULT_CASHFLOW_INFO : info_;

  for (let i = 0; i < swaps.length; i += 1) {
    const variableRateInBetween =
      info.time === 0 ? 0 : await apyGenerator(info.time, swaps[i].time);

    info = addSwap(info, swaps[i], variableRateInBetween, endTime);
  }

  const variableRateUntilNow = info.time === 0 ? 0 : await apyGenerator(info.time, currentTime);

  return extendCashflowInfo(info, variableRateUntilNow, currentTime, endTime);
};
