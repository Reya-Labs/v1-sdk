import { SeasonUser } from '@voltz-protocol/subgraph-data';
import { NonProgramaticBadgeResponse } from '../src/entities/communitySbt';

export type IpfsBadge = {
  owner: string;
  badgeType: number;
  metadataURI: string;
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
