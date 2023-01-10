import { getSeasonUsers } from '@voltz-protocol/subgraph-data';
import { BadgeResponse } from '../../entities';
import { sentryTracker } from '../sentry';

export async function getSubgraphBadges({
  userId,
  seasonId,
  badgesSubgraphUrl,
}: {
  userId: string;
  seasonId: number;
  seasonStart: number;
  seasonEnd: number;
  badgesSubgraphUrl?: string;
}): Promise<BadgeResponse[]> {
  try {
    // programmatic badges
    if (badgesSubgraphUrl) {
      const seasonUsers = await getSeasonUsers(badgesSubgraphUrl, {
        season: seasonId,
        users: [userId.toLowerCase()],
      });

      if (seasonUsers.length === 0) {
        return [];
      }

      const badges = seasonUsers[0].badges;

      const badgesResponse = badges
        .filter((badge) => badge.awardedTimestampInMS > 0 || badge.mintedTimestampInMS > 0)
        .map((badge) => {
          return {
            id: badge.id,
            badgeType: badge.badgeType,
            awardedTimestampMs:
              badge.awardedTimestampInMS > 0 ? badge.awardedTimestampInMS : undefined,
            mintedTimestampMs:
              badge.mintedTimestampInMS > 0 ? badge.mintedTimestampInMS : undefined,
          };
        });

      return badgesResponse;
    }

    return [];
  } catch (error) {
    sentryTracker.captureException(error);
    return [];
  }
}
