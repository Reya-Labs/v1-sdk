// Run with: npx jest tests/jest/communitySbt.test.ts

import { jest } from '@jest/globals';
import { ethers } from 'hardhat';
import { Badge, SeasonUser } from '@voltz-protocol/subgraph-data';
import { ONE_DAY_IN_SECONDS } from '../../src/constants';
import { CommunitySBT as SBT } from '../../src';
import { getSelectedSeasonBadgesUrl, toMillis } from '../../src/utils/communitySbt/helpers';
import { getSubgraphBadges } from '../../src/utils/communitySbt/getSubgraphBadges';
import {
  createIpfsBadge,
  createNonProgBadgeResponse,
  createSeasonUsers,
} from '../utilsCommunitySbt';

jest.useFakeTimers();

let mockSeasonUsers: SeasonUser[] = [];
jest.mock('@voltz-protocol/subgraph-data', () => {
  return { getSeasonUsers: jest.fn(() => mockSeasonUsers) };
});

let mockAxiosData: any;
jest.mock('axios', () => {
  return {
    get: jest.fn(() => {
      return {
        status: 200,
        data: mockAxiosData,
      };
    }),
  };
});

jest.mock('../../src/init.ts', () => {
  return {
    getSentryTracker: jest.fn(() => ({ captureException: jest.fn(), captureMessage: jest.fn() })),
  };
});

describe('getSeasonBadges: general', () => {
  const ogSeasonStart = 1654037999;
  const ogSeasonEnd = 1664578799;
  const s1SeasonStart = 1664578800;
  const s1SeasonEnd = 1672531199;
  const s2SeasonStart = 1672531200;
  const s2SeasonEnd = 1677628799;
  let communitySbt: SBT;
  beforeEach(() => {
    communitySbt = new SBT({
      id: 'testId',
      signer: ethers.provider.getSigner(),
      coingeckoKey: 'coingecko_api',
      currentBadgesSubgraphId: 'current_badges_subgraph',
      nextBadgesSubgraphId: 'next_badges_subgraph',
      subgraphApiKey: 'key',
      nonProgDbUrl: 'non=prog-db',
      referralsDbUrl: 'referralsDbUrl',
      subgraphUrl: 'subgraphUrl',
      ignoredWalletIds: {},
      badgesCids: ['badgesCids'],
      leavesCids: ['leavesCids'],
    });
  });

  test('get badges from ipfs', async () => {
    const userId = 'account1';
    const seasonId = 0;
    const seasonUserId = `${userId}#${seasonId}`;

    {
      // Mock getSeasonUsers query

      const badges: Badge[] = [
        {
          id: `${userId}#1#${seasonId}`,
          awardedTimestampInMS: (ogSeasonStart + 1) * 1000,
          mintedTimestampInMS: (ogSeasonEnd + 1) * 1000,
          badgeType: '1',
        },
        {
          id: `${userId}#7#${seasonId}`,
          awardedTimestampInMS: (ogSeasonStart + 1) * 1000,
          mintedTimestampInMS: 0,
          badgeType: '7',
        },
        {
          id: `${userId}#12#${seasonId}`,
          awardedTimestampInMS: 0,
          mintedTimestampInMS: (ogSeasonEnd + 1) * 1000,
          badgeType: '12',
        },
      ];

      const seasonUsers: SeasonUser[] = [
        {
          id: seasonUserId,
          season: seasonId,
          owner: userId,
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 0,
          badges,
        },
      ];

      mockSeasonUsers = seasonUsers;
    }

    // Mock axios IPFS badges
    mockAxiosData = {
      snapshot: [
        createIpfsBadge(userId, 8),
        createIpfsBadge(userId, 12),
        createIpfsBadge(userId, 1),
        createIpfsBadge(userId, 7),
      ],
    };

    const badgesList = await communitySbt.getSeasonBadges({
      userId,
      seasonId,
      seasonStart: ogSeasonStart,
      seasonEnd: ogSeasonEnd,
    });

    expect(badgesList[0].badgeType).toBe('8');
    expect(badgesList[0].awardedTimestampMs).toBe(toMillis(ogSeasonEnd - ONE_DAY_IN_SECONDS));
    expect(badgesList[0].mintedTimestampMs).toBe(undefined);
    expect(badgesList[1].badgeType).toBe('12');
    expect(badgesList[1].awardedTimestampMs).toBe(toMillis(ogSeasonEnd - ONE_DAY_IN_SECONDS));
    expect(badgesList[1].mintedTimestampMs).toBe(toMillis(ogSeasonEnd + 1));
    expect(badgesList[2].badgeType).toBe('1');
    expect(badgesList[2].awardedTimestampMs).toBe(toMillis(ogSeasonStart + 1));
    expect(badgesList[2].mintedTimestampMs).toBe(toMillis(ogSeasonEnd + 1));
    expect(badgesList[3].badgeType).toBe('7');
    expect(badgesList[3].awardedTimestampMs).toBe(toMillis(ogSeasonStart + 1));
    expect(badgesList[3].mintedTimestampMs).toBe(undefined);
  });

  test('get subgraph badges', async () => {
    const userId = 'account1';
    const seasonId = 0;
    const seasonUserId = `${userId}#${seasonId}`;

    {
      // Mock getSeasonUsers query

      const badges: Badge[] = [
        {
          id: `${userId}#1#${seasonId}`,
          awardedTimestampInMS: (ogSeasonStart + 1) * 1000,
          mintedTimestampInMS: (ogSeasonEnd + 1) * 1000,
          badgeType: '1',
        },
        {
          id: `${userId}#7#${seasonId}`,
          awardedTimestampInMS: (ogSeasonStart + 1) * 1000,
          mintedTimestampInMS: 0,
          badgeType: '7',
        },
        {
          id: `${userId}#12#${seasonId}`,
          awardedTimestampInMS: 0,
          mintedTimestampInMS: (ogSeasonEnd + 1) * 1000,
          badgeType: '12',
        },
      ];

      const seasonUsers: SeasonUser[] = [
        {
          id: seasonUserId,
          season: seasonId,
          owner: userId,
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 0,
          badges,
        },
      ];

      mockSeasonUsers = seasonUsers;
    }

    const badgesList = await getSubgraphBadges({
      userId,
      seasonId,
      seasonStart: ogSeasonStart,
      seasonEnd: ogSeasonEnd,
      badgesSubgraphUrl: 'badges_subgraph',
    });

    expect(badgesList[2].badgeType).toBe('12');
    expect(badgesList[2].awardedTimestampMs).toBe(undefined);
    expect(badgesList[2].mintedTimestampMs).toBe(toMillis(ogSeasonEnd + 1));
    expect(badgesList[0].badgeType).toBe('1');
    expect(badgesList[0].awardedTimestampMs).toBe(toMillis(ogSeasonStart + 1));
    expect(badgesList[0].mintedTimestampMs).toBe(toMillis(ogSeasonEnd + 1));
    expect(badgesList[1].badgeType).toBe('7');
    expect(badgesList[1].awardedTimestampMs).toBe(toMillis(ogSeasonStart + 1));
    expect(badgesList[1].mintedTimestampMs).toBe(undefined);
  });

  test('get community badges, check no out-of-season badges are parsed', async () => {
    const userId = 'account1';
    const seasonId = 2;

    // Mock axios IPFS badges
    mockAxiosData = {
      badges: [
        createNonProgBadgeResponse(userId, 'diplomatz', s2SeasonStart + 1), // 57
        createNonProgBadgeResponse(userId, 'governorz', s2SeasonStart + 2), // 58
        createNonProgBadgeResponse(userId, 'senatorz', s1SeasonEnd - 2), // 35
      ],
    };

    const badgesList = await communitySbt.getNonProgramaticBadges(
      userId,
      seasonId,
      s2SeasonStart,
      s2SeasonEnd,
    );

    expect(badgesList['58'].badgeType).toBe('58');
    expect(badgesList['58'].awardedTimestampMs).toBe(toMillis(s2SeasonStart + 2));
    expect(badgesList['58'].mintedTimestampMs).toBe(undefined);
    expect(badgesList['57'].badgeType).toBe('57');
    expect(badgesList['57'].awardedTimestampMs).toBe(toMillis(s2SeasonStart + 1));
    expect(badgesList['57'].mintedTimestampMs).toBe(undefined);
    expect(badgesList['35']).toBe(undefined);
    expect(badgesList['59']).toBe(undefined);
  });

  test('get community badges, zero in season badges', async () => {
    const userId = 'account1';
    const seasonId = 1;

    // Mock axios IPFS badges
    mockAxiosData = {
      badges: [
        createNonProgBadgeResponse(userId, 'diplomatz', s2SeasonStart + 1), // 54
        createNonProgBadgeResponse(userId, 'governorz', s2SeasonStart + 2), // 55
        createNonProgBadgeResponse(userId, 'senatorz', s2SeasonEnd - 2), // 35
      ],
    };

    const badgesList = await communitySbt.getNonProgramaticBadges(
      userId,
      seasonId,
      s1SeasonStart,
      s1SeasonEnd,
    );

    expect(Object.keys(badgesList).length).toBe(0);
  });

  test('get referrer badges', async () => {
    const userId = 'account1';
    const seasonId = 1;

    {
      // Mock getSeasonUsers query
      const seasonUsers = createSeasonUsers(1, 0, 1);
      mockSeasonUsers = seasonUsers;
    }

    mockAxiosData = ['under100k0', 'over2m0'];
    const badgesList = await communitySbt.getReferrorBadges(
      userId,
      seasonId,
      'current_badges_subgraph',
    );

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(1);
  });

  test('get top badges LP', async () => {
    const seasonId = 1;
    {
      // Mock getSeasonUsers query

      const seasonUsers: SeasonUser[] = [
        {
          id: 'wallet1',
          season: seasonId,
          owner: 'wallet1',
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 1,
          badges: [],
        },
        {
          id: 'wallet2',
          season: seasonId,
          owner: 'wallet2',
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 2,
          badges: [],
        },
        {
          id: 'wallet3',
          season: seasonId,
          owner: 'wallet3',
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 3,
          badges: [],
        },
        {
          id: 'wallet4',
          season: seasonId,
          owner: 'wallet4',
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 4,
          badges: [],
        },
        {
          id: 'wallet5',
          season: seasonId,
          owner: 'wallet5',
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 5,
          badges: [],
        },
        {
          id: 'wallet6',
          season: seasonId,
          owner: 'wallet6',
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 6,
          badges: [],
        },
      ];

      mockSeasonUsers = seasonUsers;
    }

    let { topLpBadge: badge } = await communitySbt.getTopBadges(
      'wallet1',
      seasonId,
      s1SeasonStart,
      s1SeasonEnd,
      'current_badges_subgraph',
    );
    expect(badge).toBe(undefined);

    badge = (
      await communitySbt.getTopBadges(
        'wallet2',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topLpBadge;
    expect(badge?.badgeType).toBe('28');

    badge = (
      await communitySbt.getTopBadges(
        'wallet3',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topLpBadge;
    expect(badge?.badgeType).toBe('28');

    badge = (
      await communitySbt.getTopBadges(
        'wallet4',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topLpBadge;
    expect(badge?.badgeType).toBe('28');

    badge = (
      await communitySbt.getTopBadges(
        'wallet5',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topLpBadge;
    expect(badge?.badgeType).toBe('28');

    badge = (
      await communitySbt.getTopBadges(
        'wallet6',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topLpBadge;
    expect(badge?.badgeType).toBe('28');
  });

  test('get top badges trader', async () => {
    const seasonId = 1;
    {
      // Mock getSeasonUsers query

      const seasonUsers: SeasonUser[] = [
        {
          id: 'wallet1',
          season: seasonId,
          owner: 'wallet1',
          timeWeightedTradedNotional: 1,
          timeWeightedProvidedLiquidity: 0,
          badges: [],
        },
        {
          id: 'wallet2',
          season: seasonId,
          owner: 'wallet2',
          timeWeightedTradedNotional: 2,
          timeWeightedProvidedLiquidity: 0,
          badges: [],
        },
        {
          id: 'wallet3',
          season: seasonId,
          owner: 'wallet3',
          timeWeightedTradedNotional: 3,
          timeWeightedProvidedLiquidity: 0,
          badges: [],
        },
        {
          id: 'wallet4',
          season: seasonId,
          owner: 'wallet4',
          timeWeightedTradedNotional: 4,
          timeWeightedProvidedLiquidity: 0,
          badges: [],
        },
        {
          id: 'wallet5',
          season: seasonId,
          owner: 'wallet5',
          timeWeightedTradedNotional: 5,
          timeWeightedProvidedLiquidity: 0,
          badges: [],
        },
        {
          id: 'wallet6',
          season: seasonId,
          owner: 'wallet6',
          timeWeightedTradedNotional: 6,
          timeWeightedProvidedLiquidity: 0,
          badges: [],
        },
      ];

      mockSeasonUsers = seasonUsers;
    }

    let { topTraderBadge: badge } = await communitySbt.getTopBadges(
      'wallet1',
      seasonId,
      s1SeasonStart,
      s1SeasonEnd,
      'current_badges_subgraph',
    );
    expect(badge).toBe(undefined);

    badge = (
      await communitySbt.getTopBadges(
        'wallet2',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topTraderBadge;
    expect(badge?.badgeType).toBe('31');

    badge = (
      await communitySbt.getTopBadges(
        'wallet3',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topTraderBadge;
    expect(badge?.badgeType).toBe('31');

    badge = (
      await communitySbt.getTopBadges(
        'wallet4',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topTraderBadge;
    expect(badge?.badgeType).toBe('31');

    badge = (
      await communitySbt.getTopBadges(
        'wallet5',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topTraderBadge;
    expect(badge?.badgeType).toBe('31');

    badge = (
      await communitySbt.getTopBadges(
        'wallet6',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topTraderBadge;
    expect(badge?.badgeType).toBe('31');
  });

  test('get top badges when less than 5 traders', async () => {
    const seasonId = 1;
    {
      // Mock getSeasonUsers query

      const seasonUsers: SeasonUser[] = [
        {
          id: 'wallet1',
          season: seasonId,
          owner: 'wallet1',
          timeWeightedTradedNotional: 1,
          timeWeightedProvidedLiquidity: 0,
          badges: [],
        },
        {
          id: 'wallet2',
          season: seasonId,
          owner: 'wallet2',
          timeWeightedTradedNotional: 2,
          timeWeightedProvidedLiquidity: 0,
          badges: [],
        },
      ];

      mockSeasonUsers = seasonUsers;
    }

    let { topTraderBadge: badge } = await communitySbt.getTopBadges(
      'wallet1',
      seasonId,
      s1SeasonStart,
      s1SeasonEnd,
      'current_badges_subgraph',
    );
    expect(badge?.badgeType).toBe('31');

    badge = (
      await communitySbt.getTopBadges(
        'wallet2',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topTraderBadge;
    expect(badge?.badgeType).toBe('31');

    badge = (
      await communitySbt.getTopBadges(
        'wallet3',
        seasonId,
        s1SeasonStart,
        s1SeasonEnd,
        'current_badges_subgraph',
      )
    ).topTraderBadge;
    expect(badge).toBe(undefined);
  });
});

describe('getReferrorBadges', () => {
  let communitySbt: SBT;
  beforeEach(() => {
    communitySbt = new SBT({
      id: 'testId',
      signer: ethers.provider.getSigner(),
      coingeckoKey: 'coingecko_api',
      currentBadgesSubgraphId: 'current_badges_subgraph',
      nextBadgesSubgraphId: 'next_badges_subgraph',
      nonProgDbUrl: 'non=prog-db',
      referralsDbUrl: 'referralsDbUrl',
      subgraphUrl: 'subgraphUrl',
      ignoredWalletIds: {},
      badgesCids: ['badgesCids'],
      leavesCids: ['leavesCids'],
    });
  });

  test('check referror badge assigned and no whale influenecer', async () => {
    {
      // Mock getSeasonUsers query
      const seasonUsers = createSeasonUsers(2, 1, 4);
      mockSeasonUsers = seasonUsers;
    }

    mockAxiosData = mockSeasonUsers.map((s) => s.owner);

    const badgesList = await communitySbt.getReferrorBadges(
      'account1',
      1,
      'current_badges_subgraph',
    );

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(1);
  });

  test('check whale whisperer but no notional influencer', async () => {
    {
      // Mock getSeasonUsers query
      const seasonUsers = createSeasonUsers(1, 0, 9);
      mockSeasonUsers = seasonUsers;
    }

    mockAxiosData = mockSeasonUsers.map((s) => s.owner);

    const badgesList = await communitySbt.getReferrorBadges(
      'account1',
      1,
      'current_badges_subgraph',
    );

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(badgesList['38'].badgeType).toBe('38');
    expect(badgesList['38'].awardedTimestampMs).toBeDefined();
    expect(badgesList['38'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(2);
  });

  test('check notional influencer but no whale whisperer', async () => {
    {
      // Mock getSeasonUsers query
      const seasonUsers = createSeasonUsers(0, 6, 4);
      mockSeasonUsers = seasonUsers;
    }

    mockAxiosData = mockSeasonUsers.map((s) => s.owner);

    const badgesList = await communitySbt.getReferrorBadges(
      'account1',
      1,
      'current_badges_subgraph',
    );

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(badgesList['37'].badgeType).toBe('37');
    expect(badgesList['37'].awardedTimestampMs).toBeDefined();
    expect(badgesList['37'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(2);
  });

  test('check no badge', async () => {
    {
      // Mock getSeasonUsers query
      const seasonUsers = createSeasonUsers(1, 0, 0);
      mockSeasonUsers = seasonUsers;
    }

    mockAxiosData = mockSeasonUsers.map((s) => s.owner);

    const badgesList = await communitySbt.getReferrorBadges(
      'account1',
      1,
      'current_badges_subgraph',
    );

    expect(Object.entries(badgesList).length).toBe(0);
  });

  test("check referror with even if one referee didn't trade", async () => {
    {
      // Mock getSeasonUsers query
      const seasonUsers = createSeasonUsers(0, 0, 1);
      mockSeasonUsers = seasonUsers;
    }

    mockAxiosData = mockSeasonUsers.map((s) => s.owner);

    const badgesList = await communitySbt.getReferrorBadges(
      'account1',
      1,
      'current_badges_subgraph',
    );

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(1);
  });

  test('check all badges achieved', async () => {
    {
      // Mock getSeasonUsers query
      const seasonUsers = createSeasonUsers(0, 5, 6);
      mockSeasonUsers = seasonUsers;
    }

    mockAxiosData = mockSeasonUsers.map((s) => s.owner);

    const badgesList = await communitySbt.getReferrorBadges(
      'account1',
      1,
      'current_badges_subgraph',
    );

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(badgesList['37'].badgeType).toBe('37');
    expect(badgesList['37'].awardedTimestampMs).toBeDefined();
    expect(badgesList['37'].mintedTimestampMs).toBe(undefined);
    expect(badgesList['38'].badgeType).toBe('38');
    expect(badgesList['38'].awardedTimestampMs).toBeDefined();
    expect(badgesList['38'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(3);
  });
});

describe('end of season automation', () => {
  const ogSeasonStart = 1654037999;
  const ogSeasonEnd = 1664578799;
  const s1SeasonStart = 1664578800;
  const s1SeasonEnd = 1672141480;
  let communitySbt: SBT;
  beforeEach(() => {
    communitySbt = new SBT({
      id: 'testId',
      signer: ethers.provider.getSigner(),
      coingeckoKey: 'coingecko_api',
      currentBadgesSubgraphId: 'current_badges_subgraph',
      nextBadgesSubgraphId: 'next_badges_subgraph',
      subgraphApiKey: 'key',
      nonProgDbUrl: 'non=prog-db',
      referralsDbUrl: 'referralsDbUrl',
      subgraphUrl: 'subgraphUrl',
      ignoredWalletIds: {},
      badgesCids: ['badgesCids'],
      leavesCids: ['leavesCids'],
    });
  });

  test('getSelectedSeasonBadgesUrl current', async () => {
    const selectedSubgraph = getSelectedSeasonBadgesUrl(
      2,
      'key',
      ['a', 'b'],
      'current_badges_subgraph',
      'next_badges_subgraph',
    );
    expect(selectedSubgraph).toBe(`https://gateway.thegraph.com/api/key/subgraphs/id/current_badges_subgraph`);
  });

  test('getSelectedSeasonBadgesUrl no CID lag, next season', async () => {
    const selectedSubgraph = getSelectedSeasonBadgesUrl(
      2,
      'key',
      ['a'],
      'current_badges_subgraph',
      'next_badges_subgraph',
    );
    expect(selectedSubgraph).toBe('https://gateway.thegraph.com/api/key/subgraphs/id/next_badges_subgraph');
  });

  test('getSelectedSeasonBadgesUrl no CID lag, previous season', async () => {
    const selectedSubgraph = getSelectedSeasonBadgesUrl(
      1,
      'key',
      ['a'],
      'current_badges_subgraph',
      'next_badges_subgraph',
    );
    expect(selectedSubgraph).toBe('https://gateway.thegraph.com/api/key/subgraphs/id/current_badges_subgraph');
  });

  test('get badges from ipfs', async () => {
    const userId = 'account1';
    const seasonId = 0;
    const seasonUserId = `${userId}#${seasonId}`;

    {
      // Mock getSeasonUsers query

      const badges: Badge[] = [];

      const seasonUsers: SeasonUser[] = [
        {
          id: seasonUserId,
          season: seasonId,
          owner: userId,
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 0,
          badges,
        },
      ];

      mockSeasonUsers = seasonUsers;
    }

    // Mock axios IPFS badges
    mockAxiosData = {
      snapshot: [createIpfsBadge(userId, 8)],
    };

    const badgesList = await communitySbt.getSeasonBadges({
      userId: 'account1',
      seasonId: 0,
      seasonStart: ogSeasonStart,
      seasonEnd: ogSeasonEnd,
    });
    expect(badgesList[0].badgeType).toBe('8');
    expect(badgesList[0].awardedTimestampMs).toBe(toMillis(ogSeasonEnd - ONE_DAY_IN_SECONDS));
  });

  test('do not get badges from ipfs even if season ended', async () => {
    const userId = 'account1';
    const seasonId = 0;
    const seasonUserId = `${userId}#${seasonId}`;

    {
      // Mock getSeasonUsers query

      const badges: Badge[] = [];

      const seasonUsers: SeasonUser[] = [
        {
          id: seasonUserId,
          season: seasonId,
          owner: userId,
          timeWeightedTradedNotional: 0,
          timeWeightedProvidedLiquidity: 0,
          badges,
        },
      ];

      mockSeasonUsers = seasonUsers;
    }

    // Mock axios IPFS badges
    mockAxiosData = {
      snapshot: [createIpfsBadge(userId, 8)],
    };

    const badgesList = await communitySbt.getSeasonBadges({
      userId: 'account1',
      seasonId: 1,
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
    });

    expect(badgesList.length).toBe(0);
  });
});
