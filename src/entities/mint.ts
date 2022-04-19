import JSBI from 'jsbi';
import { BigIntish } from '../types';

export type MintConstructorArgs = {
  id: string;
  transactionId: string;
  transactionTimestamp: number;
  ammId: string;
  positionId: string;
  sender: string;
  amount: BigIntish;
};

class Mint {
  public readonly id: string;

  public readonly transactionId: string;

  public readonly transactionTimestamp: number;

  public readonly ammId: string;

  public readonly positionId: string;

  public readonly sender: string;

  public readonly amount: JSBI;

  public constructor({
    id,
    transactionId,
    transactionTimestamp,
    ammId,
    positionId,
    sender,
    amount,
  }: MintConstructorArgs) {
    this.id = id;
    this.transactionId = transactionId;
    this.transactionTimestamp = transactionTimestamp;
    this.ammId = ammId;
    this.positionId = positionId;
    this.sender = sender;
    this.amount = JSBI.BigInt(amount);
  }
}

export default Mint;
