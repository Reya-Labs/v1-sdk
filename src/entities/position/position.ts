import { DateTime } from 'luxon';
import { BigNumber } from 'ethers';
import {
  Burn,
  Liquidation,
  MarginUpdate,
  Mint,
  Settlement,
  Swap,
} from '@voltz-protocol/subgraph-data';
import { AMM, HealthFactorStatus } from '../amm';
import { ONE_YEAR_IN_SECONDS, Q96 } from '../../constants';
import { tickToPrice, tickToFixedRate } from '../../utils/priceTickConversions';
import { TickMath } from '../../utils/tickMath';
import { Price } from '../fractions/price';

import {
  MarginEngine__factory as marginEngineFactory,
  BaseRateOracle__factory as baseRateOracleFactory,
} from '../../typechain';
import { getCashflowInfo, transformSwaps } from '../../services/getCashflowInfo';
import { getSentryTracker } from '../../init';
import { getRangeHealthFactor } from '../../utils/rangeHealthFactor';
import { exponentialBackoff } from '../../utils/retry';
import { getPositionPnLGCloud } from '../../services/gateway/getPositionPnLGCloud';
import { getGLPPositionFinalBalance } from '../../services';

export type PositionConstructorArgs = {
  id: string;

  amm: AMM;
  owner: string;
  tickLower: number;
  tickUpper: number;

  createdTimestamp: number;

  positionType: number;

  mints: Mint[];
  burns: Burn[];
  swaps: Swap[];
  marginUpdates: MarginUpdate[];
  liquidations: Liquidation[];
  settlements: Settlement[];

  isBothTraderAndLP: boolean;
};

export class Position {
  public readonly id: string;
  public readonly createdTimestamp: number;
  public readonly amm: AMM;
  public readonly owner: string;
  public readonly tickLower: number;
  public readonly tickUpper: number;
  public readonly positionType: number;
  public readonly mints: Array<Mint>;
  public readonly burns: Array<Burn>;
  public readonly swaps: Array<Swap>;
  public readonly marginUpdates: Array<MarginUpdate>;
  public readonly liquidations: Array<Liquidation>;
  public readonly settlements: Array<Settlement>;
  public readonly isBothTraderAndLP: boolean;

  public initialized = false;

  public fixedTokenBalance = 0;
  public variableTokenBalance = 0;

  public liquidity = 0;
  public liquidityInUSD = 0;

  public notional = 0;
  public notionalInUSD = 0;

  public margin = 0;
  public marginInUSD = 0;

  public fees = 0;
  public feesInUSD = 0;

  public accruedCashflow = 0;
  public accruedCashflowInUSD = 0;

  // pnl
  public realizedPnLFromSwaps = 0;
  public realizedPnLFromSwapsInUSD = 0;

  public realizedPnLFromFeesPaid = 0;
  public realizedPnLFromFeesPaidInUSD = 0;

  public unrealizedPnLFromSwaps = 0;
  public unrealizedPnLFromSwapsInUSD = 0;

  public estimatedFutureCashflow: (estimatedApy: number) => number = () => 0;
  public estimatedFutureCashflowInUSD: (estimatedApy: number) => number = () => 0;

  public estimatedTotalCashflow: (estimatedApy: number) => number = () => 0;
  public estimatedTotalCashflowInUSD: (estimatedApy: number) => number = () => 0;

  public settlementCashflow = 0;
  public settlementCashflowInUSD = 0;

  public liquidationThreshold = 0;
  public safetyThreshold = 0;

  public receivingRate = 0;
  public payingRate = 0;

  public healthFactor = HealthFactorStatus.NOT_FOUND;
  public fixedRateHealthFactor = HealthFactorStatus.NOT_FOUND;

  public poolAPR = 0;
  public isPoolMatured = false;

  public isSettled = false;

  public maxMarginWithdrawable = 0;

  public constructor({
    id,
    createdTimestamp,
    amm,
    owner,
    tickLower,
    tickUpper,
    positionType,
    mints,
    burns,
    swaps,
    marginUpdates,
    liquidations,
    settlements,
    isBothTraderAndLP,
  }: PositionConstructorArgs) {
    this.id = id;
    this.createdTimestamp = createdTimestamp;
    this.amm = amm;
    this.owner = owner;

    this.mints = mints;
    this.burns = burns;
    this.marginUpdates = marginUpdates;
    this.liquidations = liquidations;
    this.settlements = settlements;
    this.swaps = swaps;

    this.tickLower = tickLower;
    this.tickUpper = tickUpper;
    this.positionType = positionType;

    this.isBothTraderAndLP = isBothTraderAndLP;
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

  public getNotionalFromLiquidity(liquidity: BigNumber): number {
    const sqrtPriceLowerX96 = new Price(Q96, TickMath.getSqrtRatioAtTick(this.tickLower));
    const sqrtPriceUpperX96 = new Price(Q96, TickMath.getSqrtRatioAtTick(this.tickUpper));

    return sqrtPriceUpperX96
      .subtract(sqrtPriceLowerX96)
      .multiply(liquidity.toString())
      .divide(Price.fromNumber(10 ** this.amm.underlyingToken.decimals))
      .toNumber();
  }

  public get createdDateTime(): DateTime {
    return DateTime.fromMillis(this.createdTimestamp);
  }

  public async refreshInfo(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Build the contract
    const marginEngineContract = marginEngineFactory.connect(
      this.amm.marginEngineAddress,
      this.amm.provider,
    );

    const rateOracleContract = baseRateOracleFactory.connect(
      this.amm.rateOracle.id,
      this.amm.provider,
    );

    // Get fresh information about the position
    const freshInfo = await exponentialBackoff(() =>
      marginEngineContract.callStatic.getPosition(this.owner, this.tickLower, this.tickUpper),
    );

    this.isSettled = freshInfo.isSettled;

    // Get last block timestamp
    const block = await exponentialBackoff(() => this.amm.provider.getBlock('latest'));
    const currentTime = block.timestamp - 1;
    this.isPoolMatured = currentTime >= this.amm.endDateTime.toSeconds();

    if (!this.isSettled) {
      this.liquidity = this.getNotionalFromLiquidity(freshInfo._liquidity);
      this.fixedTokenBalance = this.amm.descale(freshInfo.fixedTokenBalance);
      this.variableTokenBalance = this.amm.descale(freshInfo.variableTokenBalance);
      this.fees = this.amm.descale(freshInfo.accumulatedFees);
      this.margin = this.amm.descale(freshInfo.margin) - this.fees;

      // Get pool information
      this.poolAPR = await this.amm.getFixedApr();

      // Get settlement cashflow
      if (this.isPoolMatured) {
        this.settlementCashflow = await this.getSettlementCashflow();
      }

      const chainId = (await this.amm.provider.getNetwork()).chainId;

      // todo: consider getting it out of the isSettled clause as well and push that logic into the gcloud api
      const positionPnL = await getPositionPnLGCloud(
        chainId,
        this.amm.vammAddress,
        this.owner,
        this.tickLower,
        this.tickUpper,
      );

      this.realizedPnLFromSwaps = positionPnL.realizedPnLFromSwaps;
      this.realizedPnLFromFeesPaid = positionPnL.realizedPnLFromFeesPaid;
      this.unrealizedPnLFromSwaps = positionPnL.unrealizedPnLFromSwaps;

      // Get accrued cashflow and receiving/paying rates
      if (this.swaps.length > 0) {
        if (!this.isPoolMatured) {
          try {
            const cashflowInfo = await getCashflowInfo({
              swaps: transformSwaps(this.swaps),
              rateOracle: rateOracleContract,
              currentTime,
              endTime: this.amm.endDateTime.toSeconds(),
            });
            this.accruedCashflow = cashflowInfo.accruedCashflow;
            this.estimatedFutureCashflow = cashflowInfo.estimatedFutureCashflow;
            this.estimatedTotalCashflow = cashflowInfo.estimatedTotalCashflow;

            // Get receiving and paying rates
            const avgFixedRate = cashflowInfo.avgFixedRate;
            const avgVariableRate = (await this.amm.getInstantApy()).currentApy * 100;

            [this.receivingRate, this.payingRate] =
              this.positionType === 1
                ? [avgFixedRate, avgVariableRate]
                : [avgVariableRate, avgFixedRate];
          } catch (error) {
            const sentryTracker = getSentryTracker();
            sentryTracker.captureException(error);
          }
        } else {
          this.accruedCashflow = this.settlementCashflow;
          this.estimatedFutureCashflow = () => 0;
          this.estimatedTotalCashflow = () => 0;
        }
      }

      if (!this.isPoolMatured) {
        // Get liquidation threshold
        try {
          const scaledLiqT = await exponentialBackoff(() =>
            marginEngineContract.callStatic.getPositionMarginRequirement(
              this.owner,
              this.tickLower,
              this.tickUpper,
              true,
            ),
          );
          this.liquidationThreshold = this.amm.descale(scaledLiqT);
        } catch (error) {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureMessage('Failed to compute the liquidation threshold');
          sentryTracker.captureException(error);
        }

        // Get safety threshold
        try {
          const scaledSafeT = await exponentialBackoff(() =>
            marginEngineContract.callStatic.getPositionMarginRequirement(
              this.owner,
              this.tickLower,
              this.tickUpper,
              false,
            ),
          );
          this.safetyThreshold = this.amm.descale(scaledSafeT);
          this.maxMarginWithdrawable = Math.max(
            0,
            this.amm.descale(freshInfo.margin.sub(scaledSafeT).sub(BigNumber.from(1))),
          );
        } catch (error) {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureMessage('Failed to compute the safety threshold');
          sentryTracker.captureException(error);
        }

        // Get health factor
        if (this.margin + this.fees < this.liquidationThreshold) {
          this.healthFactor = HealthFactorStatus.DANGER;
        } else if (this.margin + this.fees < this.safetyThreshold) {
          this.healthFactor = HealthFactorStatus.WARNING;
        } else {
          this.healthFactor = HealthFactorStatus.HEALTHY;
        }

        // Get range health factor for LPs
        this.fixedRateHealthFactor = getRangeHealthFactor(
          this.fixedRateLower.toNumber(),
          this.fixedRateUpper.toNumber(),
          this.poolAPR,
        );
      }

      // Get notional (LPs - liquidity, Traders - absolute variable tokens)
      this.notional =
        this.positionType === 3 ? this.liquidity : Math.abs(this.variableTokenBalance);

      // Get the underlying token price in USD
      const usdExchangeRate = this.amm.isETH ? await this.amm.ethPrice() : 1;

      // Compute the information in USD
      this.liquidityInUSD = this.liquidity * usdExchangeRate;
      this.notionalInUSD = this.notional * usdExchangeRate;
      this.marginInUSD = this.margin * usdExchangeRate;
      this.feesInUSD = this.fees * usdExchangeRate;
      this.accruedCashflowInUSD = this.accruedCashflow * usdExchangeRate;
      this.realizedPnLFromSwapsInUSD = this.realizedPnLFromSwaps * usdExchangeRate;
      this.realizedPnLFromFeesPaidInUSD = this.realizedPnLFromFeesPaid * usdExchangeRate;
      this.unrealizedPnLFromSwapsInUSD = this.unrealizedPnLFromSwaps * usdExchangeRate;

      this.estimatedFutureCashflowInUSD = (estimatedApy) =>
        this.estimatedFutureCashflow(estimatedApy) * usdExchangeRate;
      this.estimatedTotalCashflowInUSD = (estimatedApy) =>
        this.estimatedTotalCashflow(estimatedApy) * usdExchangeRate;
      this.settlementCashflowInUSD = this.settlementCashflow * usdExchangeRate;
    }

    // GLP Edge Case
    // minortodo: turn isGLP28Jun2023 margin engine address into a constant
    const isGLP28Jun2023: boolean =
      this.amm.marginEngineAddress.toLowerCase() === '0xbe958ba49be73d3020cb62e512619da953a2bab1';

    if (isGLP28Jun2023) {
      this.margin = await getGLPPositionFinalBalance({
        ownerAddress: this.owner,
        tickLower: this.tickLower,
        tickUpper: this.tickUpper,
      });
    }

    this.initialized = true;
  }

  private async getSettlementCashflow(): Promise<number> {
    const fixedFactor =
      (this.amm.endDateTime.toMillis() - this.amm.startDateTime.toMillis()) /
      ONE_YEAR_IN_SECONDS /
      1000;

    const { scaled: variableFactor } = await this.amm.variableFactor(
      this.amm.termStartTimestampInMS,
      this.amm.termEndTimestampInMS,
    );

    const settlementCashflow =
      this.fixedTokenBalance * fixedFactor * 0.01 + this.variableTokenBalance * variableFactor;

    return settlementCashflow;
  }

  public get settlementBalance(): number {
    if (this.initialized) {
      return this.margin + this.fees + this.settlementCashflow;
    }
    return 0;
  }
}
