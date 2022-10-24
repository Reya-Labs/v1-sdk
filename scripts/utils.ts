/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumber } from 'ethers';
import { Burn, Liquidation, MarginUpdate, Mint, Settlement, Swap } from './entities/actions';
import AMM from './entities/AMM/amm';
import { getLiquidityNotional } from '../src/utils/liquidity';

export const mintMap = ({
  item,
  amm,
  positionId,
  tickLower,
  tickUpper,
}: {
  item: any;
  amm: AMM;
  positionId: string;
  tickLower: number;
  tickUpper: number;
}): Mint => {
  return {
    id: item.id,
    transactionId: item.transaction.id,
    timestamp: parseInt(item.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    sender: item.sender,
    amount: getLiquidityNotional({
      liquidity: amm.tokenDescaler(BigNumber.from(item.amount)),
      tickLower,
      tickUpper,
    }),
  };
};

export const burnMap = ({
  item,
  amm,
  positionId,
  tickLower,
  tickUpper,
}: {
  item: any;
  amm: AMM;
  positionId: string;
  tickLower: number;
  tickUpper: number;
}): Burn => {
  return {
    id: item.id,
    transactionId: item.transaction.id,
    timestamp: parseInt(item.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    sender: item.sender,
    amount: getLiquidityNotional({
      liquidity: amm.tokenDescaler(BigNumber.from(item.amount)),
      tickLower,
      tickUpper,
    }),
  };
};

export const swapMap = ({
  item,
  amm,
  positionId,
}: {
  item: any;
  amm: AMM;
  positionId: string;
}): Swap => {
  return {
    id: item.id,
    transactionId: item.transaction.id,
    timestamp: parseInt(item.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    sender: item.sender,
    cumulativeFeeIncurred: amm.tokenDescaler(BigNumber.from(item.cumulativeFeeIncurred)),
    fixedTokenDelta: amm.tokenDescaler(BigNumber.from(item.fixedTokenDelta)),
    variableTokenDelta: amm.tokenDescaler(BigNumber.from(item.variableTokenDelta)),
    fixedTokenDeltaUnbalanced: amm.tokenDescaler(BigNumber.from(item.fixedTokenDeltaUnbalanced)),
  };
};

export const marginUpdateMap = ({
  item,
  amm,
  positionId,
}: {
  item: any;
  amm: AMM;
  positionId: string;
}): MarginUpdate => {
  return {
    id: item.id,
    transactionId: item.transaction.id,
    timestamp: parseInt(item.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    depositer: item.depositer,
    marginDelta: amm.tokenDescaler(BigNumber.from(item.marginDelta)),
  };
};

export const liquidationMap = ({
  item,
  amm,
  positionId,
}: {
  item: any;
  amm: AMM;
  positionId: string;
}): Liquidation => {
  return {
    id: item.id,
    transactionId: item.transaction.id,
    timestamp: parseInt(item.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    liquidator: item.liquidator,
    reward: amm.tokenDescaler(BigNumber.from(item.reward)),
    notionalUnwound: amm.tokenDescaler(BigNumber.from(item.notionalUnwound)),
  };
};

export const settlementMap = ({
  item,
  amm,
  positionId,
}: {
  item: any;
  amm: AMM;
  positionId: string;
}): Settlement => {
  return {
    id: item.id,
    transactionId: item.transaction.id,
    timestamp: parseInt(item.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    settlementCashflow: amm.tokenDescaler(BigNumber.from(item.settlementCashflow)),
  };
};
