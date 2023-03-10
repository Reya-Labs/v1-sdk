/* eslint-disable no-await-in-loop */
/* eslint-disable no-lonely-if */
import { Swap } from '@voltz-protocol/subgraph-data';
import { BigNumber, utils } from 'ethers';
import { ONE_YEAR_IN_SECONDS } from '../constants';
import { BaseRateOracle } from '../typechain';
import { exponentialBackoff } from '../utils/retry';

const getAnnualizedTime = (start: number, end: number): number => {
  return (end - start) / ONE_YEAR_IN_SECONDS;
};

export type CashflowInfo = {
  avgFixedRate: number;
  netNotional: number;
  accruedCashflow: number;
  estimatedFutureCashflow: (estimatedApy: number) => number; // 1% is represented as 1
  estimatedTotalCashflow: (estimatedApy: number) => number; // 1% is represented as 1
};

export type TransformedSwap = {
  avgFixedRate: number;
  notional: number;
  time: number;
};

export type CashflowInfoArgs = {
  swaps: TransformedSwap[];
  rateOracle: BaseRateOracle;
  currentTime: number;
  endTime: number;
};

// get all swaps of some position, descale the values to numbers and sort by time
export function transformSwaps(swaps: Swap[]): TransformedSwap[] {
  return swaps
    .map((s) => {
      return {
        notional: s.variableTokenDelta,
        time: s.creationTimestampInMS / 1000,
        avgFixedRate:
          s.variableTokenDelta === 0
            ? 0
            : Math.abs(s.unbalancedFixedTokenDelta / s.variableTokenDelta / 100),
      };
    })
    .sort((a, b) => a.time - b.time);
}

// get accrued cashflow of some position between two timestamps
async function getAccruedCashflowBetween(
  notional: number,
  fixedRate: number,
  rateOracle: BaseRateOracle,
  from: number,
  to: number,
) {
  // if notional > 0 -- VT, receives variable, pays fixed
  // if notional < 0 -- FT, received fixed, pays variable

  const nTime = getAnnualizedTime(from, to);
  const variableRate = Number(
    utils.formatUnits(
      await exponentialBackoff(() =>
        rateOracle.getRateFromTo(BigNumber.from(from), BigNumber.from(to)),
      ),
      18,
    ),
  );

  return notional * (variableRate - nTime * fixedRate);
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

// get the accrued cashflow and average fixed rate of particular position
export const getCashflowInfo = async ({
  swaps,
  rateOracle,
  currentTime,
  endTime,
}: CashflowInfoArgs): Promise<CashflowInfo> => {
  if (swaps.length === 0) {
    return {
      avgFixedRate: 0,
      netNotional: 0,
      accruedCashflow: 0,
      estimatedFutureCashflow: () => 0,
      estimatedTotalCashflow: () => 0,
    };
  }
  let info = {
    accruedCashflow: 0,
    ...swaps[0],
  };

  for (let i = 1; i < swaps.length; i += 1) {
    const timeUntilMaturity = getAnnualizedTime(swaps[i].time, endTime);

    if (info.notional >= 0) {
      // overall position: VT

      if (swaps[i].notional < 0) {
        // swap: FT

        if (info.notional + swaps[i].notional > 0) {
          // partial unwind

          const lockedInProfit = getLockedInProfit(
            swaps[i].notional,
            timeUntilMaturity,
            info.avgFixedRate,
            swaps[i].avgFixedRate,
          );

          const accruedCashflowBetween = await getAccruedCashflowBetween(
            -swaps[i].notional, // notional > 0
            info.avgFixedRate,
            rateOracle,
            info.time,
            swaps[i].time,
          );

          info = {
            accruedCashflow: info.accruedCashflow + lockedInProfit + accruedCashflowBetween,
            notional: info.notional + swaps[i].notional,
            time: info.time,
            avgFixedRate: info.avgFixedRate,
          };
        } else {
          // full unwind + FT

          const lockedInProfit = getLockedInProfit(
            -info.notional,
            timeUntilMaturity,
            info.avgFixedRate,
            swaps[i].avgFixedRate,
          );

          const accruedCashflowBetween = await getAccruedCashflowBetween(
            info.notional, // notional > 0
            info.avgFixedRate,
            rateOracle,
            info.time,
            swaps[i].time,
          );

          info = {
            accruedCashflow: info.accruedCashflow + lockedInProfit + accruedCashflowBetween,
            notional: info.notional + swaps[i].notional,
            time: swaps[i].time,
            avgFixedRate: swaps[i].avgFixedRate,
          };
        }
      } else {
        // swap: VT -- extend position

        const accruedCashflowBetween = await getAccruedCashflowBetween(
          info.notional,
          info.avgFixedRate,
          rateOracle,
          info.time,
          swaps[i].time,
        );

        info = {
          accruedCashflow: info.accruedCashflow + accruedCashflowBetween,
          notional: info.notional + swaps[i].notional,
          time: swaps[i].time,
          avgFixedRate:
            info.notional + swaps[i].notional === 0
              ? 0
              : (info.avgFixedRate * info.notional + swaps[i].avgFixedRate * swaps[i].notional) /
                (info.notional + swaps[i].notional),
        };
      }
    } else {
      // position: FT

      if (swaps[i].notional < 0) {
        // swap: FT -- extend position

        const accruedCashflowBetween = await getAccruedCashflowBetween(
          info.notional,
          info.avgFixedRate,
          rateOracle,
          info.time,
          swaps[i].time,
        );

        info = {
          accruedCashflow: info.accruedCashflow + accruedCashflowBetween,
          notional: info.notional + swaps[i].notional,
          time: swaps[i].time,
          avgFixedRate:
            info.notional + swaps[i].notional === 0
              ? 0
              : (info.avgFixedRate * info.notional + swaps[i].avgFixedRate * swaps[i].notional) /
                (info.notional + swaps[i].notional),
        };
      } else {
        // swap: VT

        if (info.notional + swaps[i].notional < 0) {
          // partial unwind

          const lockedInProfit = getLockedInProfit(
            swaps[i].notional,
            timeUntilMaturity,
            info.avgFixedRate,
            swaps[i].avgFixedRate,
          );

          const accruedCashflowBetween = await getAccruedCashflowBetween(
            -swaps[i].notional, // notional < 0
            info.avgFixedRate,
            rateOracle,
            info.time,
            swaps[i].time,
          );

          info = {
            accruedCashflow: info.accruedCashflow + lockedInProfit + accruedCashflowBetween,
            notional: info.notional + swaps[i].notional,
            time: info.time,
            avgFixedRate: info.avgFixedRate,
          };
        } else {
          // full unwind + VT

          const lockedInProfit = getLockedInProfit(
            -info.notional,
            timeUntilMaturity,
            info.avgFixedRate,
            swaps[i].avgFixedRate,
          );

          const accruedCashflowBetween = await getAccruedCashflowBetween(
            info.notional, // notional < 0
            info.avgFixedRate,
            rateOracle,
            info.time,
            swaps[i].time,
          );

          info = {
            accruedCashflow: info.accruedCashflow + lockedInProfit + accruedCashflowBetween,
            notional: info.notional + swaps[i].notional,
            time: swaps[i].time,
            avgFixedRate: swaps[i].avgFixedRate,
          };
        }
      }
    }
  }

  // all swaps are processed, get the accrued of the overall position between the last update and now
  {
    const accruedCashflowBetween = await getAccruedCashflowBetween(
      info.notional,
      info.avgFixedRate,
      rateOracle,
      info.time,
      currentTime,
    );

    info = {
      accruedCashflow: info.accruedCashflow + accruedCashflowBetween,
      notional: info.notional,
      time: currentTime,
      avgFixedRate: info.avgFixedRate,
    };
  }

  const netNotional = info.notional;
  const estimatedFutureCashflow = (estimatedApy: number) =>
    netNotional *
    getAnnualizedTime(currentTime, endTime) *
    (estimatedApy / 100 - info.avgFixedRate);
  const estimatedTotalCashflow = (estimatedApy: number) =>
    info.accruedCashflow + estimatedFutureCashflow(estimatedApy);

  return {
    avgFixedRate: 100 * info.avgFixedRate,
    netNotional: info.notional,
    accruedCashflow: info.accruedCashflow,
    estimatedFutureCashflow,
    estimatedTotalCashflow,
  };
};
