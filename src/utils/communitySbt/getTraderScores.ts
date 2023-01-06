import { getPositions } from '@voltz-protocol/subgraph-data';
import { ONE_YEAR_IN_SECONDS } from '../../constants';

export type GetScoresArgs = {
  seasonStart: number;
  seasonEnd: number;
  subgraphUrl: string;
  ethPrice: number;
  ignoredWalletIds: Record<string, boolean>;
};

/**
 * @dev Query the Main subgraph and retrieve season's liquidity
 * or trading score of all users based on time weighted liquidity.
 * Score is based on swaps.
 */
export async function getTraderScores({
  seasonStart,
  seasonEnd,
  subgraphUrl,
  ethPrice,
  ignoredWalletIds,
}: GetScoresArgs): Promise<Record<string, number>> {
  const positions = await getPositions(
    subgraphUrl,
    Date.now().valueOf(),
    {
      active: true,
    },
    {
      history: true,
    },
  );

  const scores: Record<string, number> = {};

  positions.forEach((position) => {
    if (!ignoredWalletIds[position.owner]) {
      position.swaps.forEach((swap) => {
        const actionTime = swap.creationTimestampInMS / 1000;
        const termEnd = position.amm.termEndTimestampInMS / 1000;
        const tokenPrice = position.amm.tokenName === 'ETH' ? ethPrice : 1;

        if (seasonStart < actionTime && actionTime <= seasonEnd) {
          const timeWeightedNotional =
            (Math.abs(swap.variableTokenDelta) * (termEnd - actionTime)) / ONE_YEAR_IN_SECONDS;

          const addScore = timeWeightedNotional * tokenPrice;
          if (addScore > 0) {
            scores[position.owner] = (scores[position.owner] || 0) + addScore;
          }
        }
      });
    }
  });

  return scores;
}
