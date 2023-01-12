import {
  getPositions as getRawPositions,
  Position as RawPosition,
} from '@voltz-protocol/subgraph-data';
import { getSentryTracker } from '../../init';
import Position from '../position';
import { AMM } from './amm';

type GetPositionsArgs = {
  userWalletId: string;
  amms: AMM[];
  subgraphURL: string;
  type: 'Trader' | 'LP' | 'Borrowing';
};

type GetPositionsResponse = {
  positions: Position[];
  error: string | undefined;
};

const isBorrowingPosition = (p: Position) => {
  return p.positionType === 2 && p.tickLower === -69000 && p.tickUpper === 69060;
};

const isTraderPosition = (p: Position) => {
  return (p.positionType === 1 || p.positionType === 2) && !isBorrowingPosition(p);
};

const isLPPosition = (p: Position) => {
  return p.positionType === 3;
};

const getUninitialisedPositions = async ({
  userWalletId,
  amms,
  subgraphURL,
}: GetPositionsArgs): Promise<GetPositionsResponse> => {
  let rawPositions: RawPosition[] = [];
  let error: string | undefined;

  try {
    rawPositions = await getRawPositions(
      subgraphURL,
      Date.now().valueOf(),
      {
        ammIDs: amms.map((amm) => amm.id),
        owners: [userWalletId],
      },
      true,
    );
  } catch (err) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(err);
    sentryTracker.captureMessage('Transaction Confirmation Error');

    error = 'Failed to fetch positions from the subgraph';
  }

  const positions: Position[] = [];

  try {
    rawPositions.map((rawPos) => {
      const correspondingAmm = amms.find((amm) => amm.id === rawPos.amm.id);
      if (correspondingAmm) {
        return new Position({
          ...rawPos,
          amm: correspondingAmm,
          createdTimestamp: rawPos.creationTimestampInMS / 1000,
          positionType: rawPos.positionType,
        });
      }

      throw new Error('Position AMM not found');
    });
  } catch (err) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('Position AMM not found');

    error = 'Position AMM not found';
  }

  const sortedPositions = positions
    .sort((a, b) => {
      return b.createdTimestamp - a.createdTimestamp; // sort positions by timestamp
    })
    .sort((a, b) => {
      return Number(a.isSettled) - Number(b.isSettled); // sort settled positions to the bottom
    });

  return {
    positions: sortedPositions,
    error,
  };
};

export const getPositions = async (params: GetPositionsArgs): Promise<GetPositionsResponse> => {
  let { positions, error } = await getUninitialisedPositions(params);

  switch (params.type) {
    case 'Trader': {
      positions = positions.filter((pos) => isTraderPosition(pos));
      break;
    }
    case 'LP': {
      positions = positions.filter((pos) => isLPPosition(pos));
      break;
    }
    case 'Borrowing': {
      positions = positions.filter((pos) => isBorrowingPosition(pos));
      break;
    }
    default: {
      break;
    }
  }

  try {
    await Promise.allSettled(positions.map((pos) => pos.refreshInfo()));
  } catch (err) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(err);
    sentryTracker.captureMessage('');

    error = 'Positions failed to be initialised';
  }

  return {
    positions,
    error,
  };
};
