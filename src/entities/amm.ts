import JSBI from 'jsbi';
import { BigNumber, Signer } from 'ethers';

import { BigintIsh } from '../types';
import { PERIPHERY_ADDRESS, Q192 } from '../constants';
import { Price } from './fractions/price';
import { Periphery__factory } from '../typechain';
import { SwapPeripheryParams } from '../utils/interfaces';
import Token from './token';

export type AMMConstructorArgs = {
  id: string;
  marginEngineAddress: string;
  fcmAddress: string;
  rateOracleAddress: string;
  protocolName: string;
  createdTimestamp: BigintIsh;
  updatedTimestamp: BigintIsh;
  termStartTimestamp: JSBI;
  termEndTimestamp: JSBI;
  underlyingToken: Token;
  sqrtRatioX96: JSBI;
  liquidity: JSBI;
  tick: JSBI;
  tickSpacing: JSBI;
  txCount: number;
};

export type AMMSwapArgs = {
  signer: Signer;
  recipient: string;
  isFT: boolean;
  notional: BigNumber;
  sqrtPriceLimitX96: BigNumber;
  tickLower: 0;
  tickUpper: 0;
};

class AMM {
  public readonly id: string;
  public readonly marginEngineAddress: string;
  public readonly fcmAddress: string;
  public readonly rateOracleAddress: string;
  public readonly protocolName: string;
  public readonly createdTimestamp: BigintIsh;
  public readonly updatedTimestamp: BigintIsh;
  public readonly termStartTimestamp: JSBI;
  public readonly termEndTimestamp: JSBI;
  public readonly underlyingToken: Token;
  public readonly sqrtRatioX96: JSBI;
  public readonly liquidity: JSBI;
  public readonly tickSpacing: JSBI;
  public readonly tick: JSBI;
  public readonly txCount: number;
  private _fixedRate?: Price;
  private _price?: Price;

  public constructor({
    id,
    marginEngineAddress,
    fcmAddress,
    rateOracleAddress,
    protocolName,
    createdTimestamp,
    updatedTimestamp,
    termStartTimestamp,
    termEndTimestamp,
    underlyingToken,
    sqrtRatioX96,
    liquidity,
    tick,
    tickSpacing,
    txCount,
  }: AMMConstructorArgs) {
    this.id = id;
    this.marginEngineAddress = marginEngineAddress;
    this.fcmAddress = fcmAddress;
    this.rateOracleAddress = rateOracleAddress;
    this.protocolName = protocolName;
    this.createdTimestamp = createdTimestamp;
    this.updatedTimestamp = updatedTimestamp;
    this.termStartTimestamp = termStartTimestamp;
    this.termEndTimestamp = termEndTimestamp;
    this.underlyingToken = underlyingToken;
    this.sqrtRatioX96 = JSBI.BigInt(sqrtRatioX96);
    this.liquidity = JSBI.BigInt(liquidity);
    this.tickSpacing = tickSpacing;
    this.tick = tick;
    this.txCount = txCount;
  }

  public async swap({
    signer,
    recipient,
    isFT,
    notional,
    sqrtPriceLimitX96,
    tickLower = 0,
    tickUpper = 0,
  }: AMMSwapArgs) {
    const peripheryContract = Periphery__factory.connect(PERIPHERY_ADDRESS, signer);
    const marginEngineAddress: string = this.marginEngineAddress;

    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngineAddress,
      recipient,
      isFT,
      notional,
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
    };
    const swapReceipt = await peripheryContract.swap(swapPeripheryParams);

    return swapReceipt;
  }

  public get fixedRate(): Price {
    return (
      this._fixedRate ??
      (this._fixedRate = new Price(JSBI.multiply(this.sqrtRatioX96, this.sqrtRatioX96), Q192))
    );
  }

  public get price(): Price {
    return (
      this._price ??
      (this._price = new Price(Q192, JSBI.multiply(this.sqrtRatioX96, this.sqrtRatioX96)))
    );
  }
}

export default AMM;
