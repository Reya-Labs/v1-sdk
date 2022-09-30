import { BigNumber } from 'ethers';

export type Mint = {
  id: string;
  transactionId: string;
  positionId: string;
  ammId: string;
  timestamp: number;
  sender: string;
  amount: BigNumber;
};

export type Burn = {
  id: string;
  transactionId: string;
  positionId: string;
  ammId: string;
  timestamp: number;
  sender: string;
  amount: BigNumber;
};

export type Swap = {
  id: string;
  transactionId: string;
  positionId: string;
  ammId: string;
  timestamp: number;
  sender: string;
  cumulativeFeeIncurred: BigNumber;
  fixedTokenDelta: BigNumber;
  variableTokenDelta: BigNumber;
  fixedTokenDeltaUnbalanced: BigNumber;
};

export type MarginUpdate = {
  id: string;
  transactionId: string;
  timestamp: number;
  ammId: string;
  positionId: string;
  depositer: string;
  marginDelta: BigNumber;
};

export type Liquidation = {
  id: string;
  transactionId: string;
  timestamp: number;
  ammId: string;
  positionId: string;
  liquidator: string;
  reward: BigNumber;
  notionalUnwound: BigNumber;
};

export type Settlement = {
  id: string;
  transactionId: string;
  transactionTimestamp: BigNumber;
  ammId: string;
  positionId: string;
  settlementCashflow: BigNumber;
};
