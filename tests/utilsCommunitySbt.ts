import { SeasonUser } from '@voltz-protocol/subgraph-data';
import { NonProgramaticBadgeResponse, SubgraphBadgeResponse } from '../src/entities/communitySbt';

export type IpfsBadge = {
  owner: string;
  badgeType: number;
  metadataURI: string;
};

type SeasonUserWithBadges = {
  id: string;
  badges: SubgraphBadgeResponse[];
};

type Position = {
  amm: {
    termEndTimestamp: string;
    rateOracle: {
      token: {
        name: string;
        decimals: number;
      };
    };
  };
};

export function createRandomUsers(userIdSuffix: string, userCount: number): SeasonUser[] {
  const seasonUsers: SeasonUser[] = [];
  const amount = userIdSuffix === 'over2m' ? 2000001 : userIdSuffix === 'over100k' ? 100001 : 67;
  for (let i = 0; i < userCount; i += 1) {
    seasonUsers.push({
      id: '',
      season: 0,
      owner: `${userIdSuffix}${i}`,
      timeWeightedTradedNotional: amount,
      timeWeightedProvidedLiquidity: 0,
      badges: [],
    });
  }
  return seasonUsers;
}

export function createSeasonUsers(
  under100k: number,
  over100k: number,
  over2M: number,
): SeasonUser[] {
  const over100kSeasonUsers = createRandomUsers('over100k', over100k);
  const under100kSeasonUsers = createRandomUsers('under100k', under100k);
  const over2MSeasonUsers = createRandomUsers('over2m', over2M);
  return over100kSeasonUsers.concat(under100kSeasonUsers).concat(over2MSeasonUsers);
}

export function createPosition(
  mints: Array<{ time: number; amount: number; isETH?: boolean }>,
  burns: Array<{ time: number; amount: number; isETH?: boolean }>,
  swaps: Array<{ time: number; amount: number; isETH?: boolean }>,
): Position[] {
  const positions: Position[] = [];
  const wadSuffix = '000000000000000000';
  const ammStableCoin = {
    termEndTimestamp: `1696114800${wadSuffix}`, // one year since s1 start
    rateOracle: {
      token: {
        name: 'USDC',
        decimals: 6,
      },
    },
  };
  const ammEth = {
    termEndTimestamp: `1696114800${wadSuffix}`, // one year since s1 start
    rateOracle: {
      token: {
        name: 'ETH',
        decimals: 18,
      },
    },
  };
  const ethMints = [];
  const stableCoinMints = [];
  const ethBurns = [];
  const stableCoinBurns = [];
  const ethSwaps = [];
  const stableCoinSwaps = [];
  const mintOrBurns = mints.concat(burns).map((entry, i) => {
    return {
      ...entry,
      isMint: i < mints.length,
    };
  });
  for (const action of mintOrBurns) {
    const tx = {
      transaction: {
        createdTimestamp: action.time,
      },
      amount: action.amount.toString() + (action.isETH ? wadSuffix : '000000'),
    };
    if (action.isETH) {
      if (action.isMint) {
        ethMints.push(tx);
      } else {
        ethBurns.push(tx);
      }
    } else if (action.isMint) {
      stableCoinMints.push(tx);
    } else {
      stableCoinBurns.push(tx);
    }
  }
  for (const swap of swaps) {
    const tx = {
      transaction: {
        createdTimestamp: swap.time,
      },
      cumulativeFeeIncurred: 0,
      variableTokenDelta: swap.amount.toString() + (swap.isETH ? wadSuffix : '000000'),
    };
    if (swap.isETH) {
      ethSwaps.push(tx);
    } else {
      stableCoinSwaps.push(tx);
    }
  }
  positions.push({
    amm: ammEth,
  });
  positions.push({
    amm: ammStableCoin,
  });
  return positions;
}

export function createSeasonUserWithBadges(
  userId: string,
  seasonId: number,
  badges: SubgraphBadgeResponse[],
): SeasonUserWithBadges {
  return {
    id: `${userId}#${seasonId}`,
    badges,
  };
}

export function createBadgeResponse(
  badgeType: number,
  awardedTimestamp: number,
  mintedTimestamp: number,
  owner: string,
  seasonId: number,
): SubgraphBadgeResponse {
  return {
    id: `${owner}#${badgeType}#${seasonId}`,
    badgeType: badgeType.toString(),
    awardedTimestamp: awardedTimestamp.toString(),
    mintedTimestamp: mintedTimestamp.toString(),
  };
}

export function createIpfsBadge(owner: string, badgeType: number): IpfsBadge {
  return {
    owner,
    badgeType,
    metadataURI: 'randomUri',
  };
}

export function createNonProgBadgeResponse(
  owner: string,
  badgeName: string,
  awardedTimestamp: number,
): NonProgramaticBadgeResponse {
  return {
    address: owner,
    badge: badgeName,
    awardedTimestamp,
  };
}
