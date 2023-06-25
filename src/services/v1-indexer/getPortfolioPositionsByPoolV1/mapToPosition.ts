import { AMM } from '../../../entities/amm/amm';
import { Position } from '../../../entities/position/position';
import { V1PortfolioPositionDetails } from './types';

export const mapToPosition = async (p: V1PortfolioPositionDetails, amm: AMM): Promise<Position> => {
  const position = new Position({
    id: p.id,

    amm,
    owner: p.ownerAddress,

    tickLower: p.tickLower,
    tickUpper: p.tickUpper,

    createdTimestamp: p.creationTimestampInMS,

    positionType: p.type === 'Fixed' ? 1 : p.type === 'Variable' ? 2 : 3,

    mints: [],
    burns: [],
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
    marginUpdates: [],
    liquidations: [],
    settlements: [],

    isBothTraderAndLP: false,
  });

  await position.refreshInfo();

  return position;
};
