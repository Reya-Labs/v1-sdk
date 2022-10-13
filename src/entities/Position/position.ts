/// TO DO: remove this
/* eslint-disable no-console */

import { providers } from 'ethers';
import { isUndefined } from 'lodash';
import { tickToFixedRate, tickToSqrtPrice } from '../../utils/tickHandling';
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
    this.accumulatedFees = 0;

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
  }

  // getters
  public get liquidity(): number {
    const sqrtPriceLow = tickToSqrtPrice(this.tickLower);
    const sqrtPriceHigh = tickToSqrtPrice(this.tickUpper);

    return this._liquidity * (sqrtPriceHigh - sqrtPriceLow);
  }

  public get fixedLow(): number {
    return tickToFixedRate(this.tickUpper);
  }

  public get fixedHigh(): number {
    return tickToFixedRate(this.tickLower);
  }

  // loader
  init = async (): Promise<void> => {
    if (this.initialized) {
      console.log('The position is already initialized');
      return;
    }

    if (isUndefined(this.provider)) {
      console.log('Stop here... No provider');
      return;
    }

    // refresh information
    if (this._liquidity > 0) {
      // only LP's information is updated real-time
      await this.refreshPosition();
    }

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
}
