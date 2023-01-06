import { getSeasonUsers } from '@voltz-protocol/subgraph-data';

export type GetScoresArgs = {
  season: number;
  subgraphUrl: string;
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
  season,
  subgraphUrl,
  ignoredWalletIds,
}: GetScoresArgs): Promise<ScoreResult> {
  const seasonUsers = await getSeasonUsers(subgraphUrl, {
    season,
  });

  const traderScores: Record<string, number> = {};
  const lpScores: Record<string, number> = {};

  seasonUsers
    .filter((user) => !ignoredWalletIds[user.owner])
    .forEach((user) => {
      traderScores[user.owner] = user.timeWeightedTradedNotional;
      lpScores[user.owner] = user.timeWeightedTradedNotional;
    });

  return {
    traderScores,
    lpScores,
  };
}
