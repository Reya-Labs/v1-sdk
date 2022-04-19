import JSBI from 'jsbi';
import { BigIntish } from '../types';

export type FCMSettlementConstructorArgs = {
  id: string;
  transactionId: string;
  transactionTimestamp: number;
  ammId: string;
  fcmPositionId: string;
  settlementCashflow: BigIntish;
};

class FCMSettlement {
  public readonly id: string;

  public readonly transactionId: string;

  public readonly transactionTimestamp: number;

  public readonly ammId: string;

  public readonly fcmPositionId: string;

  public readonly settlementCashflow: JSBI;

  public constructor({
    id,
    transactionId,
    transactionTimestamp,
    ammId,
    fcmPositionId,
    settlementCashflow,
  }: FCMSettlementConstructorArgs) {
    this.id = id;
    this.transactionId = transactionId;
    this.transactionTimestamp = transactionTimestamp;
    this.ammId = ammId;
    this.fcmPositionId = fcmPositionId;
    this.settlementCashflow = JSBI.BigInt(settlementCashflow);
  }
}

export default FCMSettlement;
