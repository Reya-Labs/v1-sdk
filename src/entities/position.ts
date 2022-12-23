import JSBI from 'jsbi';

import { DateTime } from 'luxon';
import { BigNumber } from 'ethers';
import AMM from './amm';
import Burn from './burn';
import Liquidation from './liquidation';
import MarginUpdate from './marginUpdate';
import Mint from './mint';
import Settlement from './settlement';
import Swap from './swap';
import { Q96 } from '../constants';
import { tickToPrice, tickToFixedRate } from '../utils/priceTickConversions';
import { TickMath } from '../utils/tickMath';
import { Price } from './fractions/price';

export type PositionConstructorArgs = {
  id: string;
  createdTimestamp: JSBI;
  amm: AMM;
  owner: string;
  updatedTimestamp: JSBI;

  variableTokenBalance: JSBI;
  isSettled: boolean;

  // specific to ME

  tickLower: number;
  tickUpper: number;
  positionType: number;

  totalNotionalTraded: JSBI;
  sumOfWeightedFixedRate: JSBI;

  mints: Array<Mint>;
  burns: Array<Burn>;
  swaps: Array<Swap>;
  marginUpdates: Array<MarginUpdate>;
  liquidations: Array<Liquidation>;
  settlements: Array<Settlement>;
};

class Position {
  public readonly id: string;

  public readonly createdTimestamp: JSBI;

  public readonly amm: AMM;

  public readonly owner: string;

  public readonly updatedTimestamp: JSBI;

  public readonly variableTokenBalance: JSBI;

  public readonly isSettled: boolean;

  public readonly tickLower: number;

  public readonly tickUpper: number;

  public readonly positionType: number;

  public readonly mints: Array<Mint>;

  public readonly burns: Array<Burn>;

  public readonly swaps: Array<Swap>;

  public readonly marginUpdates: Array<MarginUpdate>;

  public readonly liquidations: Array<Liquidation>;

  public readonly settlements: Array<Settlement>;

  public readonly totalNotionalTraded: JSBI;

  public readonly sumOfWeightedFixedRate: JSBI;

  public constructor({
    id,
    createdTimestamp,
    amm,
    owner,
    updatedTimestamp,
    variableTokenBalance,
    isSettled,
    tickLower,
    tickUpper,
    positionType,
    mints,
    burns,
    swaps,
    marginUpdates,
    liquidations,
    settlements,
    totalNotionalTraded,
    sumOfWeightedFixedRate,
  }: PositionConstructorArgs) {
    this.id = id;
    this.createdTimestamp = createdTimestamp;
    this.amm = amm;
    this.owner = owner;
    this.updatedTimestamp = updatedTimestamp;
    this.variableTokenBalance = variableTokenBalance;
    this.isSettled = isSettled;

    this.mints = mints;
    this.burns = burns;
    this.marginUpdates = marginUpdates;
    this.liquidations = liquidations;
    this.settlements = settlements;
    this.swaps = swaps;

    this.tickLower = tickLower;
    this.tickUpper = tickUpper;
    this.positionType = positionType;

    this.totalNotionalTraded = totalNotionalTraded;
    this.sumOfWeightedFixedRate = sumOfWeightedFixedRate;
  }

  public get priceLower(): Price {
    return tickToPrice(this.tickLower);
  }

  public get priceUpper(): Price {
    return tickToPrice(this.tickUpper);
  }

  public get fixedRateLower(): Price {
    return tickToFixedRate(this.tickUpper);
  }

  public get fixedRateUpper(): Price {
    return tickToFixedRate(this.tickLower);
  }

  public getNotionalFromLiquidity(liquidity: JSBI): number {
    const sqrtPriceLowerX96 = new Price(Q96, TickMath.getSqrtRatioAtTick(this.tickLower));
    const sqrtPriceUpperX96 = new Price(Q96, TickMath.getSqrtRatioAtTick(this.tickUpper));

    return sqrtPriceUpperX96
      .subtract(sqrtPriceLowerX96)
      .multiply(liquidity)
      .divide(Price.fromNumber(10 ** this.amm.underlyingToken.decimals))
      .toNumber();
  }

  public get createdDateTime(): DateTime {
    return DateTime.fromMillis(JSBI.toNumber(this.createdTimestamp));
  }

  public get updatedDateTime(): DateTime {
    return DateTime.fromMillis(JSBI.toNumber(this.updatedTimestamp));
  }

  public get averageFixedRate(): number | undefined {
    const sumOfWeightedFixedRateBn = BigNumber.from(this.sumOfWeightedFixedRate.toString());
    const totalNotionalTradedBn = BigNumber.from(this.totalNotionalTraded.toString());
    if (totalNotionalTradedBn.eq(BigNumber.from(0))) {
      return undefined;
    }
    const averageFixedRate =
      sumOfWeightedFixedRateBn.mul(BigNumber.from(1000)).div(totalNotionalTradedBn).toNumber() /
      1000;
    return Math.abs(averageFixedRate);
  }
}

export default Position;
