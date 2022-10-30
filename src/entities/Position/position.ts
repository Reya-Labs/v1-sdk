import { providers } from 'ethers';
import { isUndefined } from 'lodash';
import {
  addSwapsToCashflowInfo,
  AdvancedCashflowInfo,
  DEFAULT_ADVANCED_CASHFLOW_INFO,
} from '../../services/getAccruedCashflow';
import { getLiquidityNotional } from '../../utils/liquidity';
import { tickToFixedRate } from '../../utils/tickHandling';
import { Burn, Liquidation, MarginUpdate, Mint, Settlement, Swap } from '../actions';
import { AMM } from '../AMM/amm';
import { PositionConstructorArgs } from './types';

export class Position {
  // position ID as <margin engine address>#<owner address>#<lower tick>#<upper tick>
  public readonly id: string;
  // the amm associated to this position
  public readonly amm: AMM;
  // JSON RPC provider
  public readonly provider?: providers.Provider;

  // owner of the position
  public readonly owner: string;
  // lower tick of the position
  public readonly tickLower: number;
  // upper tick of the position
  public readonly tickUpper: number;
  // type of position
  // 0: uninitialised
  // 1: fixed taker
  // 2: variable taker
  // 3: liquidity provider
  public readonly positionType: number;

  // raw liquidity
  private _liquidity: number;
  // accumulated fees
  public accumulatedFees: number;

  // number of fixed tokens
  public fixedTokenBalance: number;
  // number of variable tokens
  public variableTokenBalance: number;
  // real-time margin in underlying token
  public margin: number;

  // entry timestamp
  public readonly timestamp: number;

  // flag set when this position is settled
  public isSettled: boolean;

  // information about previous mints
  public readonly mints: Array<Mint>;
  // information about previous burns
  public readonly burns: Array<Burn>;
  // information about previous swaps
  public readonly swaps: Array<Swap>;
  // information about previous margin updates
  public readonly marginUpdates: Array<MarginUpdate>;
  // information about previous liquidations
  public readonly liquidations: Array<Liquidation>;
  // information about previous settlement
  public readonly settlements: Array<Settlement>;

  // cashflow information such as:
  // 1. locked cashflow (e.g. locked in profit)
  // 2. accruing cashflow (e.g. cashflow until the latest block timestamp)
  // 3. future cashflow information (providing an estimated variable APY,
  // you'd be able to see the performance of the position)
  public _cashflowInfo: AdvancedCashflowInfo = DEFAULT_ADVANCED_CASHFLOW_INFO;

  // real-time position requirements
  public requirements: {
    liquidation: number;
    safety: number;
  };

  // flag set when the position is fully initialized
  public initialized = false;

  // constructior of the Position object
  public constructor(args: PositionConstructorArgs) {
    this.id = args.id;
    this.amm = args.amm;
    this.provider = args.amm.provider;
    this.timestamp = args.timestamp;

    this.owner = args.owner;
    this.tickLower = args.tickLower;
    this.tickUpper = args.tickUpper;
    this.positionType = args.positionType;

    this._liquidity = args.amm.tokenDescaler(args.liquidity);
    this.accumulatedFees = args.amm.tokenDescaler(args.accumulatedFees);

    this.fixedTokenBalance = args.amm.tokenDescaler(args.fixedTokenBalance);
    this.variableTokenBalance = args.amm.tokenDescaler(args.variableTokenBalance);
    this.margin = args.amm.tokenDescaler(args.margin);

    this.isSettled = args.isSettled;

    this.mints = args.mints;
    this.burns = args.burns;
    this.swaps = args.swaps;
    this.marginUpdates = args.marginUpdates;
    this.liquidations = args.liquidations;
    this.settlements = args.settlements;

    this.requirements = {
      liquidation: 0,
      safety: 0,
    };
  }

  // liquidity (in underlying token)
  public get liquidity(): number {
    return getLiquidityNotional({
      liquidity: this._liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    });
  }

  // lower fixed rate of the position range
  public get fixedLow(): number {
    return tickToFixedRate(this.tickUpper);
  }

  // upper fixed rate of the position range
  public get fixedHigh(): number {
    return tickToFixedRate(this.tickLower);
  }

  // accrued cashflow until now
  public get accruedCashflow(): number {
    return (
      this._cashflowInfo.lockedCashflow.fixed +
      this._cashflowInfo.lockedCashflow.variable +
      this._cashflowInfo.accruingCashflow.fixed +
      this._cashflowInfo.accruingCashflow.variable
    );
  }

  // given some predicted variable APY between now and maturity,
  // get the cashflow from now until maturity
  futureCashflow = (predictedAPY: number): number => {
    const tmp = this._cashflowInfo.estimatedFutureCashflow(predictedAPY);
    return tmp.fixed + tmp.variable;
  };

  // external initializer
  init = async (): Promise<void> => {
    // 0. check if the position has not been initialized before and if the provider exists
    if (this.initialized || isUndefined(this.provider)) {
      return;
    }

    // 1. Load the real-time information if the position is an LP
    // (if the position is trader, the information from the graph is real-time)
    if (this._liquidity > 0) {
      // only LP's information is updated real-time
      await this.refreshPosition();
    }

    // 2. Load cash flow information
    await this.refreshCashflowInfo();

    // 3. Load health information
    await this.refreshHealthFactors();

    // 4. Flag that the position has been initialized
    this.initialized = true;
  };

  // refresh position information
  refreshPosition = async (): Promise<void> => {
    // 0. Check that the amm read-only contracts are loaded
    if (isUndefined(this.amm.readOnlyContracts)) {
      return;
    }

    // 1. Get the position information from the margin engine
    const posInfo = await this.amm.readOnlyContracts.marginEngine.callStatic.getPosition(
      this.owner,
      this.tickLower,
      this.tickUpper,
    );

    // 2. Populate the object fields
    this.isSettled = posInfo.isSettled;
    this._liquidity = this.amm.tokenDescaler(posInfo._liquidity);
    this.margin = this.amm.tokenDescaler(posInfo.margin);
    this.fixedTokenBalance = this.amm.tokenDescaler(posInfo.fixedTokenBalance);
    this.variableTokenBalance = this.amm.tokenDescaler(posInfo.variableTokenBalance);
    this.accumulatedFees = this.amm.tokenDescaler(posInfo.accumulatedFees);
  };

  // refresh cash flow information
  refreshCashflowInfo = async (): Promise<void> => {
    // 0. Check that the amm read-only contracts are loaded
    if (isUndefined(this.amm.readOnlyContracts)) {
      return;
    }

    // 1.1. If the position is settled, skip
    if (this.isSettled) {
      this._cashflowInfo = DEFAULT_ADVANCED_CASHFLOW_INFO;
      return;
    }

    // 1.2. Otherwise, get the cash flow of the swaps
    this._cashflowInfo = await addSwapsToCashflowInfo({
      swaps: this.swaps.map((s: Swap) => {
        return {
          notional: s.variableTokenDelta,
          time: s.timestamp,
          avgFixedRate: Math.abs(s.fixedTokenDeltaUnbalanced / s.variableTokenDelta / 100),
        };
      }),
      apyGenerator: this.amm.apyGenerator,
      currentTime: this.amm.matured ? this.amm.termEndTimestamp : this.amm.latestBlockTimestamp,
      endTime: this.amm.termEndTimestamp,
    });
  };

  // refresh health information
  refreshHealthFactors = async (): Promise<void> => {
    // 0. Check that the amm read-only contracts are loaded
    if (isUndefined(this.amm.readOnlyContracts)) {
      return;
    }

    // 1. Refresh provider timestamp and check if the pool is matured
    await this.amm.refreshTimestamp();
    if (this.amm.matured) {
      this.requirements = {
        liquidation: 0,
        safety: 0,
      };
      return;
    }

    // 2. Get the liquidation and safety threshold from the margin engine
    const liquidationThreshold =
      await this.amm.readOnlyContracts.marginEngine.callStatic.getPositionMarginRequirement(
        this.owner,
        this.tickLower,
        this.tickUpper,
        true,
      );

    const safetyThreshold =
      await this.amm.readOnlyContracts.marginEngine.callStatic.getPositionMarginRequirement(
        this.owner,
        this.tickLower,
        this.tickUpper,
        false,
      );

    // 3. Populate the object field
    this.requirements = {
      liquidation: this.amm.tokenDescaler(liquidationThreshold),
      safety: this.amm.tokenDescaler(safetyThreshold),
    };
  };

  // paying rate -- only for Traders
  public get receivingRate(): number {
    if (this.positionType === 1) {
      return this._cashflowInfo.avgFixedRate;
    }
    return this.amm.variableApy;
  }

  // receiving rate -- only for Traders
  public get payingRate(): number {
    if (this.positionType === 1) {
      return this.amm.variableApy;
    }
    return this._cashflowInfo.avgFixedRate;
  }

  // health factor
  public get healthFactor(): 'GREEN' | 'YELLOW' | 'RED' {
    if (this.margin >= this.requirements.safety) {
      return 'GREEN';
    }
    if (this.margin >= this.requirements.liquidation) {
      return 'YELLOW';
    }
    return 'RED';
  }

  // is the liquidity in range? -- only for LPs
  public get inRange(): 'GREEN' | 'YELLOW' | 'RED' {
    const proximity = 0.85;

    if (
      proximity * this.fixedLow + (1 - proximity) * this.fixedHigh <= this.amm.fixedApr &&
      this.amm.fixedApr <= proximity * this.fixedHigh + (1 - proximity) * this.fixedLow
    ) {
      return 'GREEN';
    }

    if (this.fixedLow <= this.amm.fixedApr && this.amm.fixedApr <= this.fixedHigh) {
      return 'YELLOW';
    }

    return 'RED';
  }
}
