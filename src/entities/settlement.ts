import JSBI from 'jsbi';
import { BigIntish } from '../types';

export type SettlementConstructorArgs = {
  id: string;
  transactionId: string;
  transactionTimestamp: number;
  ammId: string;
  positionId: string;
  settlementCashflow: BigIntish;
};

class Settlement {
  public readonly id: string;

  public readonly transactionId: string;

  public readonly transactionTimestamp: number;

  public readonly ammId: string;

  public readonly positionId: string;

  public readonly settlementCashflow: JSBI;

  public constructor({
    id,
    transactionId,
    transactionTimestamp,
    ammId,
    positionId,
    settlementCashflow,
  }: SettlementConstructorArgs) {
    this.id = id;
    this.transactionId = transactionId;
    this.transactionTimestamp = transactionTimestamp;
    this.ammId = ammId;
    this.positionId = positionId;
    this.settlementCashflow = JSBI.BigInt(settlementCashflow);
  }
}

export default Settlement;
