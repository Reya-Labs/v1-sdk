import { getPositions } from '@voltz-protocol/subgraph-data';
import { ONE_YEAR_IN_SECONDS } from '../../constants';

export type GetScoresArgs = {
  seasonStart: number;
  seasonEnd: number;
  subgraphUrl: string;
  ethPrice: number;
  ignoredWalletIds: Record<string, boolean>;
};

export type ScoreResult = {
  lpScores: Record<string, number>;
  traderScores: Record<string, number>;
};

/**
 * @dev Query the Main subgraph and retrieve season's liquidity
 * or trading score of all users based on time weighted liquidity.
 * Score is based on swaps for Traders and mints/burns for LPs.
 */
export async function getScores({
  seasonStart,
  seasonEnd,
  subgraphUrl,
  ethPrice,
  ignoredWalletIds,
}: GetScoresArgs): Promise<ScoreResult> {
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

  const traderScores: Record<string, number> = {};
  const lpScores: Record<string, number> = {};

  positions.forEach((position) => {
    if (!ignoredWalletIds[position.owner]) {
      // Tracking trader scores
      position.swaps.forEach((swap) => {
        const actionTime = swap.creationTimestampInMS / 1000;
        const termEnd = position.amm.termEndTimestampInMS / 1000;
        const tokenPrice = position.amm.tokenName === 'ETH' ? ethPrice : 1;

        if (seasonStart < actionTime && actionTime <= seasonEnd) {
          const timeWeightedNotional =
            (Math.abs(swap.variableTokenDelta) * (termEnd - actionTime)) / ONE_YEAR_IN_SECONDS;

          const addScore = timeWeightedNotional * tokenPrice;
          if (addScore > 0) {
            traderScores[position.owner] = (traderScores[position.owner] || 0) + addScore;
          }
        }
      });

      // Tracking lp scores
      position.mints.forEach((mint) => {
        const actionTime = mint.creationTimestampInMS / 1000;
        const termEnd = position.amm.termEndTimestampInMS / 1000;
        const tokenPrice = position.amm.tokenName === 'ETH' ? ethPrice : 1;

        if (seasonStart < actionTime && actionTime <= seasonEnd) {
          const timeWeightedNotional =
            (mint.liquidity * (termEnd - actionTime)) / ONE_YEAR_IN_SECONDS;

          const addScore = timeWeightedNotional * tokenPrice;
          if (addScore > 0) {
            lpScores[position.owner] = (lpScores[position.owner] || 0) + addScore;
          }
        }
      });

      position.burns.forEach((burn) => {
        const actionTime = burn.creationTimestampInMS / 1000;
        const termEnd = position.amm.termEndTimestampInMS / 1000;
        const tokenPrice = position.amm.tokenName === 'ETH' ? ethPrice : 1;

        if (seasonStart < actionTime && actionTime <= seasonEnd) {
          const timeWeightedNotional =
            (burn.liquidity * (termEnd - actionTime)) / ONE_YEAR_IN_SECONDS;

          const addScore = timeWeightedNotional * tokenPrice;
          if (addScore > 0) {
            lpScores[position.owner] = (lpScores[position.owner] || 0) - addScore;
          }
        }
      });
    }
  });

  return {
    traderScores,
    lpScores,
  };
}
