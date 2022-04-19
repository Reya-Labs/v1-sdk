import JSBI from 'jsbi';
import { BigIntish } from '../types';

export type MarginUpdateConstructorArgs = {
  id: string;
  transactionId: string;
  transactionTimestamp: number;
  ammId: string;
  positionId: string;
  depositer: string;
  marginDelta: BigIntish;
};

class MarginUpdate {
  public readonly id: string;

  public readonly transactionId: string;

  public readonly transactionTimestamp: number;

  public readonly ammId: string;

  public readonly positionId: string;

  public readonly depositer: string;

  public readonly marginDelta: JSBI;

  public constructor({
    id,
    transactionId,
    transactionTimestamp,
    ammId,
    positionId,
    depositer,
    marginDelta,
  }: MarginUpdateConstructorArgs) {
    this.id = id;
    this.transactionId = transactionId;
    this.transactionTimestamp = transactionTimestamp;
    this.ammId = ammId;
    this.positionId = positionId;
    this.depositer = depositer;
    this.marginDelta = JSBI.BigInt(marginDelta);
  }
}

export default MarginUpdate;
