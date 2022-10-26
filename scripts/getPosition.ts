/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumber } from 'ethers';
import { AMM } from './entities/AMM/amm';
import { Position } from '../src/entities/Position/position';
import { burnMap, liquidationMap, marginUpdateMap, mintMap, settlementMap, swapMap } from './utils';
import { getGraphPositions } from '../graph-queries/positions';

export const getPosition = async ({
  amm,
  userAddress,
  tickLower,
  tickUpper,
}: {
  amm: AMM;
  userAddress: string;
  tickLower: number;
  tickUpper: number;
}): Promise<Position | undefined> => {
  const positionId = `${amm.marginEngineAddress.toLowerCase()}#${userAddress.toLowerCase()}#${tickLower.toString()}#${tickUpper.toString()}`;

  const data = await getGraphPositions(`where: {id: "${positionId}"}`);

  if (data.positions.length === 0) {
    return;
  }

  const info = data.positions[0];

  const position = new Position({
    id: info.id,
    amm,
    timestamp: parseInt(info.createdTimestamp, 10),

    owner: userAddress,
    tickLower,
    tickUpper,
    positionType: parseInt(info.positionType, 10),

    liquidity: BigNumber.from(info.liquidity),
    accumulatedFees: BigNumber.from(info.accumulatedFees),

    fixedTokenBalance: BigNumber.from(info.fixedTokenBalance),
    variableTokenBalance: BigNumber.from(info.variableTokenBalance),
    margin: BigNumber.from(info.margin),

    isSettled: info.isSettled,

    mints: info.mints.map((item: any) => mintMap({ item, amm, positionId, tickLower, tickUpper })),
    burns: info.burns.map((item: any) => burnMap({ item, amm, positionId, tickLower, tickUpper })),
    swaps: info.swaps.map((item: any) => swapMap({ item, amm, positionId })),
    marginUpdates: info.marginUpdates.map((item: any) =>
      marginUpdateMap({ item, amm, positionId }),
    ),
    liquidations: info.liquidations.map((item: any) => liquidationMap({ item, amm, positionId })),
    settlements: info.settlements.map((item: any) => settlementMap({ item, amm, positionId })),
  });

  await position.init();
  return position;
};
