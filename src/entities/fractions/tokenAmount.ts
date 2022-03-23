import invariant from 'tiny-invariant';
import JSBI from 'jsbi';
import Token from "../token";
import _Big from 'big.js';
import toFormat from 'toformat';
import { BigintIsh, Rounding, MaxUint256 } from '../../constants';
import { Fraction } from './fraction';

const Big = toFormat(_Big)

export class TokenAmount<T extends Token> extends Fraction {
  public readonly token: T
  public readonly decimalScale: JSBI

  /**
   * Returns a new token amount instance from the unitless amount of token, i.e. the raw amount
   * @param token the token in the amount
   * @param rawAmount the raw token or ether amount
   */
  public static fromRawAmount<T extends Token>(token: T, rawAmount: BigintIsh): TokenAmount<T> {
    return new TokenAmount(token, rawAmount)
  }

  /**
   * Construct a token amount with a denominator that is not equal to 1
   * @param token the token
   * @param numerator the numerator of the fractional token amount
   * @param denominator the denominator of the fractional token amount
   */
  public static fromFractionalAmount<T extends Token>(
    token: T,
    numerator: BigintIsh,
    denominator: BigintIsh
  ): TokenAmount<T> {
    return new TokenAmount(token, numerator, denominator)
  }

  protected constructor(token: T, numerator: BigintIsh, denominator?: BigintIsh) {
    super(numerator, denominator)
    invariant(JSBI.lessThanOrEqual(this.quotient, MaxUint256), 'AMOUNT')
    this.token = token
    this.decimalScale = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(token.decimals))
  }

  public toSignificant(
    significantDigits: number = 6,
    format?: object,
    rounding: Rounding = Rounding.ROUND_DOWN
  ): string {
    return super.divide(this.decimalScale).toSignificant(significantDigits, format, rounding)
  }

  public toFixed(
    decimalPlaces: number = this.token.decimals,
    format?: object,
    rounding: Rounding = Rounding.ROUND_DOWN
  ): string {
    invariant(decimalPlaces <= this.token.decimals, 'DECIMALS')
    return super.divide(this.decimalScale).toFixed(decimalPlaces, format, rounding)
  }

  public toExact(format: object = { groupSeparator: '' }): string {
    Big.DP = this.token.decimals
    return new Big(this.quotient.toString()).div(this.decimalScale.toString()).toFormat(format)
  }


}