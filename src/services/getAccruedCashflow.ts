/* eslint-disable no-await-in-loop */
/* eslint-disable no-lonely-if */
import { BigNumber, utils } from 'ethers';
import { ONE_YEAR_IN_SECONDS } from '../constants';
import { Position } from '../entities';
import { BaseRateOracle } from '../typechain';

const getAnnualizedTime = (start: number, end: number): number => {
  return (end - start) / ONE_YEAR_IN_SECONDS;
};

export type AccruedCashflowArgs = {
  position: Position;
  rateOracle: BaseRateOracle;
  currentTime: number;
  endTime: number;
  decimals: number;
};

export type AccruedCashflowInfo = {
  avgFixedRate: number;
  accruedCashflow: number;
};

export type TransformedSwap = {
  avgFixedRate: number;
  notional: number;
  time: number;
};

function getSwaps({ swaps }: Position, decimals: number): TransformedSwap[] {
  return swaps
    .map((s) => {
      return {
        notional: Number(
          utils.formatUnits(BigNumber.from(s.variableTokenDelta.toString()), decimals),
        ),
        time: Number(s.transactionTimestamp.toString()),
        avgFixedRate: Math.abs(
          Number(
            utils.formatUnits(
              BigNumber.from(s.fixedTokenDeltaUnbalanced.toString())
                .mul(BigNumber.from(10).pow(18))
                .div(BigNumber.from(s.variableTokenDelta.toString())),
              18,
            ),
          ),
        ),
      };
    })
    .sort((a, b) => a.time - b.time);
}

export const getAccruedCashflow = async ({
  position,
  rateOracle,
  currentTime,
  endTime,
  decimals,
}: AccruedCashflowArgs): Promise<AccruedCashflowInfo> => {
  if (position.swaps.length === 0) {
    return {
      avgFixedRate: 0,
      accruedCashflow: 0,
    };
  }

  const swaps = getSwaps(position, decimals);
  let info = {
    accruedCashflow: 0,
    ...swaps[0],
  };

  //   console.log("Getting accrued cashflow...");

  for (let i = 1; i < swaps.length; i += 1) {
    const timeBetween = getAnnualizedTime(info.time, swaps[i].time);
    const timeUntilMaturity = getAnnualizedTime(swaps[i].time, endTime);

    // console.log(`Getting APY between ${info.time} -- ${swaps[i].time}`);
    const apyBetween = Number(
      utils.formatUnits(await rateOracle.getApyFromTo(info.time, swaps[i].time), 18),
    );
    // console.log(`APY: ${apyBetween}`);

    if (info.notional >= 0) {
      // VT

      if (swaps[i].notional < 0) {
        // FT

        if (info.notional + swaps[i].notional > 0) {
          // partial unwind

          const lockedInProfit =
            (info.avgFixedRate - swaps[i].avgFixedRate) * swaps[i].notional * timeUntilMaturity;

          const accruedCashflowBetween =
            swaps[i].notional * timeBetween * (info.avgFixedRate * 0.01 - apyBetween);

          info = {
            accruedCashflow: info.accruedCashflow + lockedInProfit + accruedCashflowBetween,
            notional: info.notional + swaps[i].notional,
            time: info.time,
            avgFixedRate: info.avgFixedRate,
          };
        } else {
          // full unwind + FT

          const lockedInProfit =
            (info.avgFixedRate - swaps[i].avgFixedRate) * swaps[i].notional * timeUntilMaturity;

          info = {
            accruedCashflow: info.accruedCashflow + lockedInProfit,
            notional: info.notional + swaps[i].notional,
            time: swaps[i].time,
            avgFixedRate: swaps[i].avgFixedRate,
          };
        }
      } else {
        // extend VT position

        const accruedCashflowBetween =
          info.notional * timeBetween * (apyBetween - info.avgFixedRate * 0.01);

        info = {
          accruedCashflow: info.accruedCashflow + accruedCashflowBetween,
          notional: info.notional + swaps[i].notional,
          time: swaps[i].time,
          avgFixedRate:
            (info.avgFixedRate * info.notional + swaps[i].avgFixedRate + swaps[i].notional) /
            (info.notional + swaps[i].notional),
        };
      }
    } else {
      // FT

      if (swaps[i].notional < 0) {
        // extend FT position

        const accruedCashflowBetween =
          info.notional * timeBetween * (apyBetween - info.avgFixedRate * 0.01);

        info = {
          accruedCashflow: info.accruedCashflow + accruedCashflowBetween,
          notional: info.notional + swaps[i].notional,
          time: swaps[i].time,
          avgFixedRate:
            (info.avgFixedRate * info.notional + swaps[i].avgFixedRate + swaps[i].notional) /
            (info.notional + swaps[i].notional),
        };
      } else {
        // VT

        if (info.notional + swaps[i].notional < 0) {
          // partial unwind

          const lockedInProfit =
            (info.avgFixedRate - swaps[i].avgFixedRate) * swaps[i].notional * timeUntilMaturity;

          const accruedCashflowBetween =
            swaps[i].notional * timeBetween * (info.avgFixedRate * 0.01 - apyBetween);

          info = {
            accruedCashflow: info.accruedCashflow + lockedInProfit + accruedCashflowBetween,
            notional: info.notional + swaps[i].notional,
            time: info.time,
            avgFixedRate: info.avgFixedRate,
          };
        } else {
          // full unwind + VT

          const lockedInProfit =
            (info.avgFixedRate - swaps[i].avgFixedRate) * swaps[i].notional * timeUntilMaturity;

          info = {
            accruedCashflow: info.accruedCashflow + lockedInProfit,
            notional: info.notional + swaps[i].notional,
            time: swaps[i].time,
            avgFixedRate: swaps[i].avgFixedRate,
          };
        }
      }
    }
  }

  //   console.log(`Getting APY between ${info.time} -- ${currentTime}`);
  const apyBetween = Number(
    utils.formatUnits(await rateOracle.getApyFromTo(info.time, currentTime), 18),
  );
  //   console.log(`APY: ${apyBetween}`);

  const timeBetween = getAnnualizedTime(info.time, currentTime);

  const accruedCashflowBetween = info.notional * timeBetween * (info.avgFixedRate - apyBetween);

  info = {
    accruedCashflow: info.accruedCashflow + accruedCashflowBetween,
    notional: info.notional,
    time: currentTime,
    avgFixedRate: info.avgFixedRate,
  };

  //   console.log("Returning result...");
  return {
    avgFixedRate: info.avgFixedRate,
    accruedCashflow: info.accruedCashflow,
  };
};
