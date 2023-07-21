import { V1V2PortfolioPositionDetails } from '@voltz-protocol/api-sdk-v2';
import { AMM } from '../../../entities/amm/amm';
import { Position } from '../../../entities/position/position';
import { HealthFactorStatus } from '../../../entities';
import { getRangeHealthFactor } from '../../../utils/rangeHealthFactor';

export const mapToPosition = async (
  p: V1V2PortfolioPositionDetails,
  amm: AMM,
): Promise<Position> => {
  const position = new Position({
    id: p.id,

    amm,
    owner: p.ownerAddress,

    tickLower: p.tickLower,
    tickUpper: p.tickUpper,

    createdTimestamp: p.creationTimestampInMS,

    positionType: p.type === 'Fixed' ? 1 : p.type === 'Variable' ? 2 : 3,

    mints: p.history
      .filter((h) => h.type === 'mint')
      .map((h) => ({
        id: '',
        txId: '',
        creationTimestampInMS: h.creationTimestampInMS,
        sender: '',
        liquidity: h.notional,
      })),
    burns: p.history
      .filter((h) => h.type === 'burn')
      .map((h) => ({
        id: '',
        txId: '',
        creationTimestampInMS: h.creationTimestampInMS,
        sender: '',
        liquidity: h.notional,
      })),
    swaps: p.history
      .filter((h) => h.type === 'swap')
      .map((h) => ({
        id: '',
        txId: '',
        creationTimestampInMS: h.creationTimestampInMS,
        sender: '',
        fees: h.paidFees,
        fixedTokenDelta: 0,
        variableTokenDelta: h.notional,
        unbalancedFixedTokenDelta: h.notional * h.fixedRate * 100,
      })),
    marginUpdates: p.history
      .filter((h) => h.type === 'margin-update')
      .map((h) => ({
        id: '',
        txId: '',
        creationTimestampInMS: h.creationTimestampInMS,
        sender: '',
        marginDelta: h.marginDelta,
      })),
    liquidations: p.history
      .filter((h) => h.type === 'liquidation')
      .map((h) => ({
        id: '',
        txId: '',
        creationTimestampInMS: h.creationTimestampInMS,
        sender: '',
        loss: h.marginDelta,
        notionalUnwound: h.notional,
      })),
    settlements: p.history
      .filter((h) => h.type === 'settlement')
      .map((h) => ({
        id: '',
        txId: '',
        creationTimestampInMS: h.creationTimestampInMS,
        sender: '',
        settlementCashflow: h.marginDelta,
      })),

    isBothTraderAndLP: false,
  });

  if (p.pool.isV2) {
    const tokenPriceUSD = p.pool.underlyingToken.priceUSD;

    position.initialized = true;

    // not used by UI
    position.fixedTokenBalance = 0;

    position.variableTokenBalance = p.notionalTraded;

    position.liquidity = p.notionalProvided;
    position.liquidityInUSD = p.notionalProvided * tokenPriceUSD;

    position.notional = p.notional;
    position.notionalInUSD = p.notional * tokenPriceUSD;

    position.margin = p.margin;
    position.marginInUSD = p.margin * tokenPriceUSD;

    position.fees = p.realizedPNLFees;
    position.feesInUSD = p.realizedPNLFees * tokenPriceUSD;

    position.accruedCashflow = p.realizedPNLCashflow;
    position.accruedCashflowInUSD = p.realizedPNLCashflow * tokenPriceUSD;

    position.realizedPnLFromSwaps = p.realizedPNLCashflow;
    position.realizedPnLFromSwapsInUSD = p.realizedPNLCashflow * tokenPriceUSD;

    position.realizedPnLFromFeesPaid = p.realizedPNLFees;
    position.realizedPnLFromFeesPaidInUSD = p.realizedPNLFees * tokenPriceUSD;

    position.unrealizedPnLFromSwaps = p.unrealizedPNL;
    position.unrealizedPnLFromSwapsInUSD = p.unrealizedPNL * tokenPriceUSD;

    position.settlementCashflow = p.settlementCashflow;
    position.settlementCashflowInUSD = p.settlementCashflow * tokenPriceUSD;

    position.liquidationThreshold = p.liquidationThreshold;
    position.safetyThreshold = p.safetyThreshold;

    position.receivingRate = p.receiving * 100;
    position.payingRate = p.paying * 100;

    const mapHealth = (health: typeof p.health): ReturnType<typeof getRangeHealthFactor> => {
      switch (health) {
        case 'healthy': {
          return HealthFactorStatus.HEALTHY;
        }

        case 'warning': {
          return HealthFactorStatus.WARNING;
        }

        case 'danger': {
          return HealthFactorStatus.DANGER;
        }
      }
    };
    position.healthFactor = mapHealth(p.health);

    position.fixedRateHealthFactor = getRangeHealthFactor(
      p.fixLow,
      p.fixHigh,
      p.poolCurrentFixedRate,
    );

    position.poolAPR = p.pool.currentFixedRate;
    position.isPoolMatured = p.pool.termEndTimestampInMS <= Date.now();

    position.isSettled = p.variant === 'settled';
    position.maxMarginWithdrawable = p.maxWithdrawableMargin;
  } else {
    await position.refreshInfo();
  }

  return position;
};
