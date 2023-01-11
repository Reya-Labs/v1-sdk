import { getPositions as getRawPositions } from '@voltz-protocol/subgraph-data';
import Position from '../position';
import { AMM } from './amm';

export const getTraderPositions = async ({
  userWalletId,
  amms,
  subgraphURL,
}: {
  userWalletId: string;
  amms: AMM[];
  subgraphURL: string;
}): Promise<Position[]> => {
  const rawPositions = await getRawPositions(
    subgraphURL,
    Date.now().valueOf(),
    {
      ammIDs: amms.map((amm) => amm.id),
      owners: [userWalletId],
    },
    true,
  );

  const traderRawPositions = rawPositions.filter(
    (rawPos) => rawPos.positionType === 1 || rawPos.positionType === 2,
  );

  const positions: Position[] = traderRawPositions.map((rawPos) => {
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

  const sortedPositions = positions
    .sort((a, b) => {
      return b.createdTimestamp - a.createdTimestamp; // sort positions by timestamp
    })
    .sort((a, b) => {
      return Number(a.isSettled) - Number(b.isSettled); // sort settled positions to the bottom
    });

  return sortedPositions;
};
