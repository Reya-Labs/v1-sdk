export type Mint = {
  id: string;
  transactionId: string;
  positionId: string;
  ammId: string;
  timestamp: number;
  sender: string;
  amount: number;
};

export type Burn = {
  id: string;
  transactionId: string;
  positionId: string;
  ammId: string;
  timestamp: number;
  sender: string;
  amount: number;
};

export type Swap = {
  id: string;
  transactionId: string;
  positionId: string;
  ammId: string;
  timestamp: number;
  sender: string;
  cumulativeFeeIncurred: number;
  fixedTokenDelta: number;
  variableTokenDelta: number;
  fixedTokenDeltaUnbalanced: number;
};

export type MarginUpdate = {
  id: string;
  transactionId: string;
  timestamp: number;
  ammId: string;
  positionId: string;
  depositer: string;
  marginDelta: number;
};

export type Liquidation = {
  id: string;
  transactionId: string;
  timestamp: number;
  ammId: string;
  positionId: string;
  liquidator: string;
  reward: number;
  notionalUnwound: number;
};

export type Settlement = {
  id: string;
  transactionId: string;
  timestamp: number;
  ammId: string;
  positionId: string;
  settlementCashflow: number;
};
