import { BigNumber, providers } from 'ethers';
import { isUndefined } from 'lodash';
import { GetGraphAMMsResponse } from '../../../graph-queries/amms';
import {
  BurnGraphResponse,
  GetGraphPositionsResponse,
  LiquidationGraphResponse,
  MarginUpdateGraphResponse,
  MintGraphResponse,
  SettlementGraphResponse,
  SwapGraphResponse,
} from '../../../graph-queries/positions';
import { getLiquidityNotional } from '../../utils/liquidity';
import { Mint, Burn, Swap, MarginUpdate, Liquidation, Settlement } from '../actions';
import { AMM } from '../AMM/amm';
import { Position } from '../Position/position';
import { Protocol } from './protocol';

export const graphAMMsResponseToAMMs = (
  response: GetGraphAMMsResponse,
  factoryAddress: string,
  provider?: providers.Provider,
): AMM[] => {
  return response.amms.map((item) => {
    return new AMM({
      id: item.id,
      provider,
      factoryAddress,
      marginEngineAddress: item.marginEngine.id,
      rateOracleAddress: item.rateOracle.id,
      underlyingTokenAddress: item.rateOracle.token.id,

      termStartTimestampWad: BigNumber.from(item.termStartTimestamp),
      termEndTimestampWad: BigNumber.from(item.termEndTimestamp),

      rateOracleID: parseInt(item.rateOracle.protocolId, 10),

      tick: parseInt(item.tick, 10),
      tickSpacing: parseInt(item.tickSpacing, 10),
    });
  });
};

export const mintMap = ({
  mint,
  amm,
  positionId,
  tickLower,
  tickUpper,
}: {
  mint: MintGraphResponse;
  amm: AMM;
  positionId: string;
  tickLower: number;
  tickUpper: number;
}): Mint => {
  return {
    id: mint.id,
    transactionId: mint.transaction.id,
    timestamp: parseInt(mint.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    sender: mint.sender,
    amount: getLiquidityNotional({
      liquidity: amm.tokenDescaler(BigNumber.from(mint.amount)),
      tickLower,
      tickUpper,
    }),
  };
};

export const burnMap = ({
  burn,
  amm,
  positionId,
  tickLower,
  tickUpper,
}: {
  burn: BurnGraphResponse;
  amm: AMM;
  positionId: string;
  tickLower: number;
  tickUpper: number;
}): Burn => {
  return {
    id: burn.id,
    transactionId: burn.transaction.id,
    timestamp: parseInt(burn.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    sender: burn.sender,
    amount: getLiquidityNotional({
      liquidity: amm.tokenDescaler(BigNumber.from(burn.amount)),
      tickLower,
      tickUpper,
    }),
  };
};

export const swapMap = ({
  swap,
  amm,
  positionId,
}: {
  swap: SwapGraphResponse;
  amm: AMM;
  positionId: string;
}): Swap => {
  return {
    id: swap.id,
    transactionId: swap.transaction.id,
    timestamp: parseInt(swap.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    sender: swap.sender,
    cumulativeFeeIncurred: amm.tokenDescaler(BigNumber.from(swap.cumulativeFeeIncurred)),
    fixedTokenDelta: amm.tokenDescaler(BigNumber.from(swap.fixedTokenDelta)),
    variableTokenDelta: amm.tokenDescaler(BigNumber.from(swap.variableTokenDelta)),
    fixedTokenDeltaUnbalanced: amm.tokenDescaler(BigNumber.from(swap.fixedTokenDeltaUnbalanced)),
  };
};

export const marginUpdateMap = ({
  marginUpdate,
  amm,
  positionId,
}: {
  marginUpdate: MarginUpdateGraphResponse;
  amm: AMM;
  positionId: string;
}): MarginUpdate => {
  return {
    id: marginUpdate.id,
    transactionId: marginUpdate.transaction.id,
    timestamp: parseInt(marginUpdate.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    depositer: marginUpdate.depositer,
    marginDelta: amm.tokenDescaler(BigNumber.from(marginUpdate.marginDelta)),
  };
};

export const liquidationMap = ({
  liquidation,
  amm,
  positionId,
}: {
  liquidation: LiquidationGraphResponse;
  amm: AMM;
  positionId: string;
}): Liquidation => {
  return {
    id: liquidation.id,
    transactionId: liquidation.transaction.id,
    timestamp: parseInt(liquidation.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    liquidator: liquidation.liquidator,
    reward: amm.tokenDescaler(BigNumber.from(liquidation.reward)),
    notionalUnwound: amm.tokenDescaler(BigNumber.from(liquidation.notionalUnwound)),
  };
};

export const settlementMap = ({
  settlement,
  amm,
  positionId,
}: {
  settlement: SettlementGraphResponse;
  amm: AMM;
  positionId: string;
}): Settlement => {
  return {
    id: settlement.id,
    transactionId: settlement.transaction.id,
    timestamp: parseInt(settlement.transaction.createdTimestamp, 10),
    ammId: amm.id,
    positionId,
    settlementCashflow: amm.tokenDescaler(BigNumber.from(settlement.settlementCashflow)),
  };
};

export const graphPositionsResponseToPositions = (
  response: GetGraphPositionsResponse,
  protocol: Protocol,
): Position[] => {
  return response.positions.map((item) => {
    const tickLower = parseInt(item.tickLower, 10);
    const tickUpper = parseInt(item.tickUpper, 10);
    const amm = protocol.findAMM(item.amm.id);

    if (isUndefined(amm)) {
      throw new Error(`No AMM assigned to this position. Position ID: ${item.id}.`);
    }

    return new Position({
      id: item.id,
      amm,
      timestamp: parseInt(item.createdTimestamp, 10),

      owner: item.owner.id,
      tickLower,
      tickUpper,
      positionType: parseInt(item.positionType, 10),

      liquidity: BigNumber.from(item.liquidity),
      accumulatedFees: BigNumber.from(item.accumulatedFees),

      fixedTokenBalance: BigNumber.from(item.fixedTokenBalance),
      variableTokenBalance: BigNumber.from(item.variableTokenBalance),
      margin: BigNumber.from(item.margin),

      isSettled: item.isSettled,

      mints: item.mints.map((mint) =>
        mintMap({ mint, amm, positionId: item.id, tickLower, tickUpper }),
      ),
      burns: item.burns.map((burn) =>
        burnMap({ burn, amm, positionId: item.id, tickLower, tickUpper }),
      ),
      swaps: item.swaps.map((swap) => swapMap({ swap, amm, positionId: item.id })),
      marginUpdates: item.marginUpdates.map((marginUpdate) =>
        marginUpdateMap({ marginUpdate, amm, positionId: item.id }),
      ),
      liquidations: item.liquidations.map((liquidation) =>
        liquidationMap({ liquidation, amm, positionId: item.id }),
      ),
      settlements: item.settlements.map((settlement) =>
        settlementMap({ settlement, amm, positionId: item.id }),
      ),
    });
  });
};
