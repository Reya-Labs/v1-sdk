/// TO DO: remove this
/* eslint-disable no-console */

import { providers } from 'ethers';
import { isUndefined } from 'lodash';
import { getAccruedCashflow } from '../../services/getAccruedCashflow';
import { getLiquidityNotional } from '../../utils/liquidity';
import { tickToFixedRate } from '../../utils/tickHandling';
import { Burn, Liquidation, MarginUpdate, Mint, Settlement, Swap } from '../actions';
import AMM from '../AMM/amm';
import { PositionConstructorArgs } from './types';

export class Position {
  public readonly id: string;
  public readonly amm: AMM;
  public readonly provider?: providers.Provider;

  public readonly owner: string;
  public readonly tickLower: number;
  public readonly tickUpper: number;
  public readonly positionType: number;

  private _liquidity: number;
  public accumulatedFees: number;

  public fixedTokenBalance: number;
  public variableTokenBalance: number;
  public margin: number;

  public readonly timestamp: number;

  public isSettled: boolean;

  public readonly mints: Array<Mint>;
  public readonly burns: Array<Burn>;
  public readonly swaps: Array<Swap>;
  public readonly marginUpdates: Array<MarginUpdate>;
  public readonly liquidations: Array<Liquidation>;
  public readonly settlements: Array<Settlement>;

  public accruedCashflow: number;
  public avgFixedRate: number;
  public requirements: {
    liquidation: number;
    safety: number;
  };

  public initialized = false;

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

    this.avgFixedRate = 0;
    this.accruedCashflow = 0;
    this.requirements = {
      liquidation: 0,
      safety: 0,
    };
  }

  // getters
  public get liquidity(): number {
    return getLiquidityNotional({
      liquidity: this._liquidity,
      tickLower: this.tickLower,
      tickUpper: this.tickUpper,
    });
  }

  public get fixedLow(): number {
    return tickToFixedRate(this.tickUpper);
  }

  public get fixedHigh(): number {
    return tickToFixedRate(this.tickLower);
  }

  // loader
  init = async (): Promise<void> => {
    if (this.initialized || isUndefined(this.provider)) {
      return;
    }

    // refresh information
    if (this._liquidity > 0) {
      // only LP's information is updated real-time
      await this.refreshPosition();
    }

    await this.refreshCashflowInfo();
    await this.refreshHealthFactors();

    this.initialized = true;
  };

  // refreshers
  refreshPosition = async (): Promise<void> => {
    if (isUndefined(this.amm.readOnlyContracts)) {
      return;
    }

    // get the most up-to-date information
    const posInfo = await this.amm.readOnlyContracts.marginEngine.callStatic.getPosition(
      this.owner,
      this.tickLower,
      this.tickUpper,
    );

    this.isSettled = posInfo.isSettled;
    this._liquidity = this.amm.tokenDescaler(posInfo._liquidity);
    this.margin = this.amm.tokenDescaler(posInfo.margin);
    this.fixedTokenBalance = this.amm.tokenDescaler(posInfo.fixedTokenBalance);
    this.variableTokenBalance = this.amm.tokenDescaler(posInfo.variableTokenBalance);
    this.accumulatedFees = this.amm.tokenDescaler(posInfo.accumulatedFees);
  };

  refreshCashflowInfo = async (): Promise<void> => {
    if (isUndefined(this.amm.readOnlyContracts)) {
      return;
    }

    if (this.isSettled) {
      this.accruedCashflow = 0;
      this.avgFixedRate = 0;
      return;
    }

    const accruedCashflowInfo = await getAccruedCashflow({
      swaps: this.swaps,
      rateOracle: this.amm.readOnlyContracts.rateOracle,
      currentTime: this.amm.matured ? this.amm.termEndTimestamp : this.amm.latestBlockTimestamp,
      endTime: this.amm.termEndTimestamp,
    });

    this.accruedCashflow = accruedCashflowInfo.accruedCashflow;
    this.avgFixedRate = accruedCashflowInfo.avgFixedRate;
  };

  refreshHealthFactors = async (): Promise<void> => {
    if (isUndefined(this.amm.readOnlyContracts) || isUndefined(this.amm.latestBlockTimestamp)) {
      return;
    }

    if (this.amm.matured) {
      this.requirements = {
        liquidation: 0,
        safety: 0,
      };
      return;
    }

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

    this.requirements = {
      liquidation: this.amm.tokenDescaler(liquidationThreshold),
      safety: this.amm.tokenDescaler(safetyThreshold),
    };
  };

  // paying rate -- only for Traders
  public get receivingRate(): number {
    if (this.positionType === 1) {
      return this.avgFixedRate;
    }
    return this.amm.variableApy;
  }

  // receiving rate -- only for Traders
  public get payingRate(): number {
    if (this.positionType === 1) {
      return this.amm.variableApy;
    }
    return this.avgFixedRate;
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
