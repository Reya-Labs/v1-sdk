import JSBI from 'jsbi';
import { BigIntish } from '../types';

export type LiquidationConstructorArgs = {
  id: string;
  transactionId: string;
  transactionTimestamp: number;
  ammId: string;
  positionId: string;
  liquidator: string;
  reward: BigIntish;
  notionalUnwound: BigIntish;
};

class Liquidation {
  public readonly id: string;

  public readonly transactionId: string;

  public readonly transactionTimestamp: number;

  public readonly ammId: string;

  public readonly positionId: string;

  public readonly liquidator: string;

  public readonly reward: JSBI;

  public readonly notionalUnwound: JSBI;

  public constructor({
    id,
    transactionId,
    transactionTimestamp,
    ammId,
    positionId,
    liquidator,
    reward,
    notionalUnwound,
  }: LiquidationConstructorArgs) {
    this.id = id;
    this.transactionId = transactionId;
    this.transactionTimestamp = transactionTimestamp;
    this.ammId = ammId;
    this.positionId = positionId;
    this.liquidator = liquidator;
    this.reward = JSBI.BigInt(reward);
    this.notionalUnwound = JSBI.BigInt(notionalUnwound);
  }
}

export default Liquidation;
