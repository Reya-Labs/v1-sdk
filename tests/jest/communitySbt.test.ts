/* eslint-disable @typescript-eslint/no-explicit-any */
// Run with: npx jest tests/jest/communitySbt.test.ts
import axios from 'axios';
import { jest } from '@jest/globals';
import { ethers } from 'hardhat';
import { getApolloClient } from '../../src/utils/communitySbt/getApolloClient';
import SBT, {
  NonProgramaticBadgeResponse,
  SubgraphBadgeResponse,
} from '../../src/entities/communitySbt';
import { getSelectedSeasonBadgesUrl, toMillis } from '../../src/utils/communitySbt/helpers';
import { getSubgraphBadges } from '../../src/utils/communitySbt/getSubgraphBadges';
import { getScores } from '../../src/utils/communitySbt/getTopBadges';
import {
  createBadgeResponse,
  createSeasonUserWithBadges,
  createIpfsBadge,
  createNonProgBadgeResponse,
  createSeasonUsers,
  createPosition,
  IpfsBadge,
} from '../utilsCommunitySbt';

jest.useFakeTimers();

jest.mock('axios');
jest.mock('../../src/utils/communitySbt/getApolloClient.ts', () => {
  const mApolloClient = { query: jest.fn() };
  return { getApolloClient: jest.fn(() => mApolloClient) };
});
jest.mock('../../src/utils/sentry/index.ts', () => {
  return { sentryTracker: { captureException: jest.fn(), captureMessage: jest.fn() } };
});
const mockGetApolloClient = getApolloClient as jest.Mocked<(network: string) => any>;

describe('getSeasonBadges: general', () => {
  const ogSeasonStart = 1654037999;
  const ogSeasonEnd = 1664578799;
  const s1SeasonStart = 1664578800;
  const s1SeasonEnd = 1672531199;
  const s2SeasonStart = 1672531200;
  const s2SeasonEnd = 1677628799;
  const network = 'mainnet';
  let communitySbt: SBT;
  beforeEach(() => {
    communitySbt = new SBT({
      id: 'testId',
      signer: ethers.provider.getSigner(),
      coingeckoKey: 'coingecko_api',
      currentBadgesSubgraphUrl: 'current_badges_subgraph',
      nextBadgesSubgraphUrl: 'next_badges_subgraph',
      nonProgDbUrl: 'non=prog-db',
      referralsDbUrl: 'referralsDbUrl',
      subgraphUrl: 'subgraphUrl',
      ignoredWalletIds: {},
      badgesCids: ['badgesCids'],
      leavesCids: ['leavesCids'],
    });
  });

  test('get badges from ipfs', async () => {
    const badges = [
      createBadgeResponse(1, ogSeasonStart + 1, ogSeasonEnd + 1, 'account1', 0),
      createBadgeResponse(7, ogSeasonStart + 1, 0, 'account1', 0),
      createBadgeResponse(12, 0, ogSeasonEnd + 1, 'account1', 0), // non prog, but minted
    ] as SubgraphBadgeResponse[];
    const seasonUser = createSeasonUserWithBadges('account1', 0, badges);
    const mGraphQLResponse = { data: { seasonUser } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<IpfsBadge> = [];
    data.push(createIpfsBadge('account1', 8)); // non prog, not minted
    data.push(createIpfsBadge('account1', 12));
    data.push(createIpfsBadge('account1', 1));
    data.push(createIpfsBadge('account1', 7));
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { snapshot: data },
    });
    const badgesList = await communitySbt.getSeasonBadges({
      userId: 'account1',
      seasonId: 0,
      seasonStart: ogSeasonStart,
      seasonEnd: ogSeasonEnd,
    });
    expect(badgesList[0].badgeType).toBe('8');
    expect(badgesList[0].awardedTimestampMs).toBe(toMillis(ogSeasonEnd));
    expect(badgesList[0].mintedTimestampMs).toBe(undefined);
    expect(badgesList[1].badgeType).toBe('12');
    expect(badgesList[1].awardedTimestampMs).toBe(toMillis(ogSeasonEnd));
    expect(badgesList[1].mintedTimestampMs).toBe(toMillis(ogSeasonEnd + 1));
    expect(badgesList[2].badgeType).toBe('1');
    expect(badgesList[2].awardedTimestampMs).toBe(toMillis(ogSeasonStart + 1));
    expect(badgesList[2].mintedTimestampMs).toBe(toMillis(ogSeasonEnd + 1));
    expect(badgesList[3].badgeType).toBe('7');
    expect(badgesList[3].awardedTimestampMs).toBe(toMillis(ogSeasonStart + 1));
    expect(badgesList[3].mintedTimestampMs).toBe(undefined);
  });

  test('get subgraph badges', async () => {
    const badges = [
      createBadgeResponse(1, ogSeasonStart + 1, ogSeasonEnd + 1, 'account1', 0),
      createBadgeResponse(7, ogSeasonStart + 1, 0, 'account1', 0),
      createBadgeResponse(12, 0, ogSeasonEnd + 1, 'account1', 0),
    ] as SubgraphBadgeResponse[];
    const seasonUser = createSeasonUserWithBadges('account1', 0, badges);
    const mGraphQLResponse = { data: { seasonUser } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const badgesList = await getSubgraphBadges({
      userId: 'account1',
      seasonId: 0,
      seasonStart: ogSeasonStart,
      seasonEnd: ogSeasonEnd,
      badgesSubgraphUrl: 'badges_subgraph',
    });
    expect(badgesList[2].badgeType).toBe('12');
    expect(badgesList[2].awardedTimestampMs).toBe(toMillis(0));
    expect(badgesList[2].mintedTimestampMs).toBe(toMillis(ogSeasonEnd + 1));
    expect(badgesList[0].badgeType).toBe('1');
    expect(badgesList[0].awardedTimestampMs).toBe(toMillis(ogSeasonStart + 1));
    expect(badgesList[0].mintedTimestampMs).toBe(toMillis(ogSeasonEnd + 1));
    expect(badgesList[1].badgeType).toBe('7');
    expect(badgesList[1].awardedTimestampMs).toBe(toMillis(ogSeasonStart + 1));
    expect(badgesList[1].mintedTimestampMs).toBe(undefined);
  });

  test('get community badges, check no out-of-season badges are parsed', async () => {
    const data: Array<NonProgramaticBadgeResponse> = [];
    data.push(createNonProgBadgeResponse('account1', 'diplomatz', s2SeasonStart + 1)); // 57
    data.push(createNonProgBadgeResponse('account1', 'governorz', s2SeasonStart + 2)); // 58
    data.push(createNonProgBadgeResponse('account1', 'senatorz', s1SeasonEnd - 2)); // 35

    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { badges: data },
    });
    const badgesList = await communitySbt.getNonProgramaticBadges(
      'account1',
      2,
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
    const data: Array<NonProgramaticBadgeResponse> = [];
    data.push(createNonProgBadgeResponse('account1', 'diplomatz', s2SeasonStart + 1)); // 54
    data.push(createNonProgBadgeResponse('account1', 'governorz', s2SeasonStart + 2)); // 55
    data.push(createNonProgBadgeResponse('account1', 'senatorz', s2SeasonEnd - 2)); // 35

    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { badges: data },
    });
    const badgesList = await communitySbt.getNonProgramaticBadges(
      'account1',
      1,
      s1SeasonStart,
      s1SeasonEnd,
    );
    expect(Object.keys(badgesList).length).toBe(0);
  });

  test('get referrer badges', async () => {
    const seasonUsers = createSeasonUsers(1, 0, 1);
    const mGraphQLResponse = { data: { seasonUsers } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<string> = ['under100k0', 'over2m0'];
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data,
    });
    const badgesList = await communitySbt.getReferrorBadges('account1', 1, "current_badges_subgraph");

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(1);
  });

  test('get top badges LP', async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: false }], // mints
      [
        { time: s1SeasonEnd + 2, amount: 5, isETH: false },
        { time: s1SeasonStart + 2, amount: 1, isETH: false },
      ], // burns
      [
        { time: s1SeasonStart + 1, amount: 20, isETH: false },
        { time: s1SeasonStart + 2, amount: 30, isETH: false },
      ], // swaps
    ); // 4
    const positionsWallet2 = createPosition(
      [
        { time: s1SeasonStart + 1, amount: 10, isETH: false },
        { time: s1SeasonStart + 2, amount: 1, isETH: false },
      ], // mints
      [{ time: s1SeasonStart + 2, amount: 5, isETH: false }], // burns
      [], // swaps
    ); // 6
    const positionsWallet3 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: false }],
      [],
      [],
    );
    const positionsWallet4 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 1, isETH: false }],
      [],
      [],
    );
    const positionsWallet5 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 5, isETH: false }],
      [],
      [],
    );
    const positionsWallet6 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 8, isETH: false }],
      [],
      [],
    );
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
      { id: 'wallet3', positions: positionsWallet3 },
      { id: 'wallet4', positions: positionsWallet4 },
      { id: 'wallet5', positions: positionsWallet5 },
      { id: 'wallet6', positions: positionsWallet6 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { ethereum: { usd: 1400 } },
    });

    let badge = await communitySbt.getTopBadge('wallet1', 1, true, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('28');
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet2', 1, true, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('28');
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet3', 1, true, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('28');
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet4', 1, true, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge).toBe(undefined);
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet5', 1, true, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('28');
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet6', 1, true, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('28');
  });

  test('get top badges trader', async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: false }], // mints
      [
        { time: s1SeasonEnd + 2, amount: 5, isETH: false },
        { time: s1SeasonStart + 2, amount: 1, isETH: false },
      ], // burns
      [
        { time: s1SeasonStart + 1, amount: 20, isETH: false },
        { time: s1SeasonStart + 2, amount: 30, isETH: false },
      ], // swaps
    ); // 50
    const positionsWallet2 = createPosition(
      [
        { time: s1SeasonStart + 1, amount: 10, isETH: false },
        { time: s1SeasonStart + 2, amount: 1, isETH: false },
      ], // mints
      [{ time: s1SeasonStart + 2, amount: 5, isETH: false }], // burns
      [{ time: s1SeasonStart + 2, amount: 5, isETH: false }], // swaps
    ); // 5
    const positionsWallet3 = createPosition(
      [],
      [],
      [{ time: s1SeasonStart + 2, amount: 9, isETH: false }],
    );
    const positionsWallet4 = createPosition(
      [],
      [],
      [{ time: s1SeasonStart + 2, amount: 23, isETH: false }],
    );
    const positionsWallet5 = createPosition(
      [],
      [],
      [{ time: s1SeasonStart + 2, amount: 11, isETH: false }],
    );
    const positionsWallet6 = createPosition(
      [],
      [],
      [{ time: s1SeasonStart + 2, amount: 55, isETH: false }],
    );
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
      { id: 'wallet3', positions: positionsWallet3 },
      { id: 'wallet4', positions: positionsWallet4 },
      { id: 'wallet5', positions: positionsWallet5 },
      { id: 'wallet6', positions: positionsWallet6 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { ethereum: { usd: 1400 } },
    });

    let badge = await communitySbt.getTopBadge('wallet1', 1, false, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('31');
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet2', 1, false, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge).toBe(undefined);
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet3', 1, false, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('31');
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet4', 1, false, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('31');
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet5', 1, false, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('31');
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet6', 1, false, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('31');
  });

  test('get top badges when less than 5', async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: false }], // mints
      [
        { time: s1SeasonEnd + 2, amount: 5, isETH: false },
        { time: s1SeasonStart + 2, amount: 1, isETH: false },
      ], // burns
      [
        { time: s1SeasonStart + 1, amount: 20, isETH: false },
        { time: s1SeasonStart + 2, amount: 30, isETH: false },
      ], // swaps
    ); // 50
    const positionsWallet2 = createPosition(
      [
        { time: s1SeasonStart + 1, amount: 10, isETH: false },
        { time: s1SeasonStart + 2, amount: 1, isETH: false },
      ], // mints
      [{ time: s1SeasonStart + 2, amount: 5, isETH: false }], // burns
      [{ time: s1SeasonStart + 2, amount: 5, isETH: false }], // swaps
    ); // 5
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { ethereum: { usd: 1400 } },
    });

    let badge = await communitySbt.getTopBadge('wallet1', 1, false, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('31');
    client.query.mockResolvedValueOnce(mGraphQLResponse);
    badge = await communitySbt.getTopBadge('wallet2', 1, false, s1SeasonStart, s1SeasonEnd, 'current_badges_subgraph');
    expect(badge?.badgeType).toBe('31');
  });
});

describe('get top trader/LP badges', () => {
  const s1SeasonStart = 1664578800;
  const s1SeasonEnd = 1672531199;
  const network = 'mainnet';

  test('get scores traders USDC', async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: false }], // mints
      [{ time: s1SeasonStart + 1, amount: 5, isETH: false }], // burns
      [
        { time: s1SeasonStart + 1, amount: 20, isETH: false },
        { time: s1SeasonStart + 2, amount: 30, isETH: false },
      ], // swaps
    );
    const positionsWallet2 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 11, isETH: false }], // mints
      [{ time: s1SeasonStart + 1, amount: 5, isETH: false }], // burns
      [
        { time: s1SeasonStart + 1, amount: 10, isETH: false },
        { time: s1SeasonStart + 2, amount: 2, isETH: false },
      ], // swaps
    );
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const scores = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
      subgraphUrl: 'someUrl',
      ethPrice: 1400,
      ignoredWalletIds: {},
      isLP: false,
    });

    expect(scores.wallet1).toBeCloseTo(50, 0);
    expect(scores.wallet2).toBeCloseTo(12, 0);
    expect(Object.entries(scores).length).toBe(2);
  });

  test('get scores traders ETH', async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: true }], // mints
      [{ time: s1SeasonStart + 1, amount: 5, isETH: false }], // burns
      [
        { time: s1SeasonStart + 1, amount: 2, isETH: true },
        { time: s1SeasonStart + 2, amount: 3, isETH: true },
      ], // swaps
    );
    const positionsWallet2 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 11, isETH: true }], // mints
      [{ time: s1SeasonStart + 1, amount: 5, isETH: false }], // burns
      [
        { time: s1SeasonStart + 1, amount: 1, isETH: true },
        { time: s1SeasonStart + 2, amount: 2, isETH: true },
      ], // swaps
    );
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const scores = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
      subgraphUrl: 'someUrl',
      ethPrice: 14,
      ignoredWalletIds: {},
      isLP: false,
    });

    expect(scores.wallet1).toBeCloseTo(70, 0);
    expect(scores.wallet2).toBeCloseTo(42, 0);
    expect(Object.entries(scores).length).toBe(2);
  });

  test('get scores traders ETH and USDC', async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: true }], // mints
      [{ time: s1SeasonStart + 1, amount: 5, isETH: false }], // burns
      [
        { time: s1SeasonStart + 1, amount: 1, isETH: true },
        { time: s1SeasonStart + 2, amount: 20, isETH: false },
      ], // swaps
    );
    const positionsWallet2 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 11, isETH: true }], // mints
      [{ time: s1SeasonStart + 1, amount: 5, isETH: false }], // burns
      [
        { time: s1SeasonStart + 1, amount: 10, isETH: false },
        { time: s1SeasonStart + 2, amount: 2, isETH: true },
      ], // swaps
    );
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const scores = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
      subgraphUrl: 'someUrl',
      ethPrice: 14,
      ignoredWalletIds: {},
      isLP: false,
    });

    expect(scores.wallet1).toBeCloseTo(34, 0);
    expect(scores.wallet2).toBeCloseTo(38, 0);
    expect(Object.entries(scores).length).toBe(2);
  });

  test('get scores LPs USDC', async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: false }], // mints
      [{ time: s1SeasonStart + 2, amount: 5, isETH: false }], // burns
      [
        { time: s1SeasonStart + 1, amount: 20, isETH: false },
        { time: s1SeasonStart + 2, amount: 30, isETH: false },
      ], // swaps
    );
    const positionsWallet2 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 13, isETH: false }], // mints
      [{ time: s1SeasonStart + 2, amount: 5, isETH: false }], // burns
      [
        { time: s1SeasonStart + 1, amount: 10, isETH: false },
        { time: s1SeasonStart + 2, amount: 2, isETH: false },
      ], // swaps
    );
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const scores = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
      subgraphUrl: 'someUrl',
      ethPrice: 1400,
      ignoredWalletIds: {},
      isLP: true,
    });

    expect(scores.wallet1).toBeCloseTo(5, 0);
    expect(scores.wallet2).toBeCloseTo(8, 0);
    expect(Object.entries(scores).length).toBe(2);
  });

  test('get scores LPs ETH', async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: true }], // mints
      [{ time: s1SeasonStart + 2, amount: 5, isETH: true }], // burns
      [
        { time: s1SeasonStart + 1, amount: 20, isETH: true },
        { time: s1SeasonStart + 2, amount: 30, isETH: true },
      ], // swaps
    );
    const positionsWallet2 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 13, isETH: true }], // mints
      [{ time: s1SeasonStart + 2, amount: 5, isETH: true }], // burns
      [
        { time: s1SeasonStart + 1, amount: 10, isETH: false },
        { time: s1SeasonStart + 2, amount: 2, isETH: false },
      ], // swaps
    );
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const scores = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
      subgraphUrl: 'someUrl',
      ethPrice: 14,
      ignoredWalletIds: {},
      isLP: true,
    });

    expect(scores.wallet1).toBeCloseTo(70, 0);
    expect(scores.wallet2).toBeCloseTo(112, 0);
    expect(Object.entries(scores).length).toBe(2);
  });

  test('get scores LPs ETH and USDC', async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: true }], // mints
      [
        { time: s1SeasonStart + 2, amount: 50, isETH: false },
        { time: s1SeasonStart + 2, amount: 1, isETH: true },
      ], // burns
      [
        { time: s1SeasonStart + 1, amount: 20, isETH: true },
        { time: s1SeasonStart + 2, amount: 30, isETH: true },
      ], // swaps
    ); // -> 140 - 50 - 14 = 76
    const positionsWallet2 = createPosition(
      [
        { time: s1SeasonStart + 1, amount: 13, isETH: false },
        { time: s1SeasonStart + 1, amount: 3, isETH: true },
      ], // mints
      [{ time: s1SeasonStart + 2, amount: 2, isETH: true }], // burns
      [
        { time: s1SeasonStart + 1, amount: 10, isETH: false },
        { time: s1SeasonStart + 2, amount: 2, isETH: false },
      ], // swaps
    ); // -> 13 + 42 - 28 = 27
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const scores = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
      subgraphUrl: 'someUrl',
      ethPrice: 14,
      ignoredWalletIds: {},
      isLP: true,
    });

    expect(scores.wallet1).toBeCloseTo(76, 0);
    expect(scores.wallet2).toBeCloseTo(27, 0);
    expect(Object.entries(scores).length).toBe(2);
  });

  test('get scores lp weights', async () => {
    const halfPoolTime = 1680217200; // 31 March (half way till pool expires)
    const thirdPoolTime = 1685487600; // 31 May (a third of the way till pool expires)
    const positionsWallet1 = createPosition(
      [{ time: thirdPoolTime, amount: 10, isETH: true }], // mints
      [
        { time: thirdPoolTime, amount: 50, isETH: false },
        { time: halfPoolTime, amount: 1, isETH: true },
      ], // burns
      [], // swaps
    ); // -> 140/3 - 50/3 - 14/2 = 46.66 - 16.66 - 7 = 23
    const positionsWallet2 = createPosition(
      [
        { time: thirdPoolTime, amount: 313, isETH: false },
        { time: halfPoolTime, amount: 3, isETH: true },
      ], // mints
      [{ time: thirdPoolTime, amount: 2, isETH: true }], // burns
      [], // swaps
    ); // -> 313/3 + 42/2 - 28/3 = 104.33 + 21 - 9.33 = 116
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const scores = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: thirdPoolTime + 1,
      subgraphUrl: 'someUrl',
      ethPrice: 14,
      ignoredWalletIds: {},
      isLP: true,
    });

    expect(scores.wallet1).toBeCloseTo(23, 0);
    expect(scores.wallet2).toBeCloseTo(117, 0);
    expect(Object.entries(scores).length).toBe(2);
  });

  test('get scores trader weights', async () => {
    const halfPoolTime = 1680217200; // 31 March (half way till pool expires)
    const thirdPoolTime = 1685487600; // 31 May (a third of the way till pool expires)
    const positionsWallet1 = createPosition(
      [], // mints
      [], // burns
      [
        { time: thirdPoolTime, amount: 20, isETH: true },
        { time: halfPoolTime, amount: 30, isETH: false },
      ], // swaps
    ); // -> 20*14/3 + 30/2 = 93.33 + 15 = 108.33
    const positionsWallet2 = createPosition(
      [], // mints
      [], // burns
      [
        { time: thirdPoolTime, amount: 10, isETH: false },
        { time: halfPoolTime, amount: 2, isETH: true },
      ], // swaps
    ); // -> 10/3 + 2*14/2 = 3.33 + 14 = 17.33
    const wallets = [
      { id: 'wallet1', positions: positionsWallet1 },
      { id: 'wallet2', positions: positionsWallet2 },
    ];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const scores = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: thirdPoolTime + 1,
      subgraphUrl: 'someUrl',
      ethPrice: 14,
      ignoredWalletIds: {},
      isLP: false,
    });

    expect(scores.wallet1).toBeCloseTo(109, 0);
    expect(scores.wallet2).toBeCloseTo(17, 0);
    expect(Object.entries(scores).length).toBe(2);
  });

  test("check out-of-season trade don't count", async () => {
    const positionsWallet1 = createPosition(
      [{ time: s1SeasonStart + 1, amount: 10, isETH: false }], // mints
      [
        { time: s1SeasonEnd + 2, amount: 50, isETH: false },
        { time: s1SeasonStart + 2, amount: 1, isETH: false },
      ], // burns
      [
        { time: s1SeasonStart + 1, amount: 20, isETH: false },
        { time: s1SeasonEnd + 2, amount: 30, isETH: false },
      ], // swaps
    );
    const wallets = [{ id: 'wallet1', positions: positionsWallet1 }];
    const mGraphQLResponse = { data: { wallets } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const scoresLp = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
      subgraphUrl: 'someUrl',
      ethPrice: 14,
      ignoredWalletIds: {},
      isLP: true,
    });
    expect(scoresLp.wallet1).toBeCloseTo(9, 0);

    client.query.mockResolvedValueOnce(mGraphQLResponse);
    const scoresTrader = await getScores({
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
      subgraphUrl: 'someUrl',
      ethPrice: 14,
      ignoredWalletIds: {},
      isLP: false,
    });
    expect(scoresTrader.wallet1).toBeCloseTo(20, 0);
  });
});

describe('getReferrorBadges', () => {
  let communitySbt: SBT;
  beforeEach(() => {
    communitySbt = new SBT({
      id: 'testId',
      signer: ethers.provider.getSigner(),
      coingeckoKey: 'coingecko_api',
      currentBadgesSubgraphUrl: 'current_badges_subgraph',
      nextBadgesSubgraphUrl: 'next_badges_subgraph',
      nonProgDbUrl: 'non=prog-db',
      referralsDbUrl: 'referralsDbUrl',
      subgraphUrl: 'subgraphUrl',
      ignoredWalletIds: {},
      badgesCids: ['badgesCids'],
      leavesCids: ['leavesCids'],
    });
  });

  test('check referror badge assigned and no whale influenecer', async () => {
    const seasonUsers = createSeasonUsers(2, 1, 4);
    const mGraphQLResponse = { data: { seasonUsers } };
    const client = mockGetApolloClient('goerli');
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<string> = ['over100k0', 'over2M1', 'over2M2', 'over2M3', 'over2M0'];
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data,
    });
    const badgesList = await communitySbt.getReferrorBadges('account1', 1, "current_badges_subgraph");

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(1);
  });

  test('check whale whisperer but no notional influencer', async () => {
    const seasonUsers = createSeasonUsers(1, 0, 9);
    const mGraphQLResponse = { data: { seasonUsers } };
    const client = mockGetApolloClient('goerli');
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<string> = [
      'over2M0',
      'over2M1',
      'over2M2',
      'over2M3',
      'over2M4',
      'over2M5',
      'over2M6',
      'over2M7',
      'over2M8',
      'under100k0',
    ];
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data,
    });
    const badgesList = await communitySbt.getReferrorBadges('account1', 1, "current_badges_subgraph");

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(badgesList['38'].badgeType).toBe('38');
    expect(badgesList['38'].awardedTimestampMs).toBeDefined();
    expect(badgesList['38'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(2);
  });

  test('check notional influencer but no whale whisperer', async () => {
    const seasonUsers = createSeasonUsers(0, 6, 4);
    const mGraphQLResponse = { data: { seasonUsers } };
    const client = mockGetApolloClient('goerli');
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<string> = [
      'over2M0',
      'over2M1',
      'over2M2',
      'over2M3',
      'over100k0',
      'over100k1',
      'over100k2',
      'over100k3',
      'over100k4',
      'over100k5',
    ];
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data,
    });

    const badgesList = await communitySbt.getReferrorBadges('account1', 1, "current_badges_subgraph");

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(badgesList['37'].badgeType).toBe('37');
    expect(badgesList['37'].awardedTimestampMs).toBeDefined();
    expect(badgesList['37'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(2);
  });

  test('check no badge', async () => {
    const seasonUsers = createSeasonUsers(1, 0, 0);
    const mGraphQLResponse = { data: { seasonUsers } };
    const client = mockGetApolloClient('goerli');
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<string> = [];
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data,
    });

    const badgesList = await communitySbt.getReferrorBadges('account1', 1, "current_badges_subgraph");

    expect(Object.entries(badgesList).length).toBe(0);
  });

  test("check referror with even if one referee didn't trade", async () => {
    const seasonUsers = createSeasonUsers(0, 0, 1);
    const mGraphQLResponse = { data: { seasonUsers } };
    const client = mockGetApolloClient('goerli');
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<string> = ['didntTrade', 'over2M0'];
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data,
    });

    const badgesList = await communitySbt.getReferrorBadges('account1', 1, "current_badges_subgraph");

    expect(badgesList['36'].badgeType).toBe('36');
    expect(badgesList['36'].awardedTimestampMs).toBeDefined();
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined);
    expect(Object.entries(badgesList).length).toBe(1);
  });

  test('check all badges achieved', async () => {
    const seasonUsers = createSeasonUsers(0, 5, 6);
    const mGraphQLResponse = { data: { seasonUsers } };
    const client = mockGetApolloClient('goerli');
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<string> = [
      'over2M0',
      'over2M1',
      'over2M2',
      'over2M3',
      'over2M4',
      'over100k0',
      'over100k1',
      'over100k2',
      'over100k3',
      'over100k4',
      'over100k5',
    ];
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data,
    });

    const badgesList = await communitySbt.getReferrorBadges('account1', 1, "current_badges_subgraph");

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
  const s2SeasonStart = 1672141481;
  const s2SeasonEnd = 1677628799;
  const network = 'mainnet';
  let communitySbt: SBT;
  beforeEach(() => {
    communitySbt = new SBT({
      id: 'testId',
      signer: ethers.provider.getSigner(),
      coingeckoKey: 'coingecko_api',
      currentBadgesSubgraphUrl: 'current_badges_subgraph',
      nextBadgesSubgraphUrl: 'next_badges_subgraph',
      nonProgDbUrl: 'non=prog-db',
      referralsDbUrl: 'referralsDbUrl',
      subgraphUrl: 'subgraphUrl',
      ignoredWalletIds: {},
      badgesCids: ['badgesCids'],
      leavesCids: ['leavesCids'],
    });
  });

  test('getSelectedSeasonBadgesUrl current', async () => {
    const selectedSubgraph = getSelectedSeasonBadgesUrl(2, ["a","b"], 'current_badges_subgraph', 'next_badges_subgraph');
    expect(selectedSubgraph).toBe('current_badges_subgraph');
  });

  test('getSelectedSeasonBadgesUrl no CID lag, next season', async () => {
    const selectedSubgraph = getSelectedSeasonBadgesUrl(2, ["a"], 'current_badges_subgraph', 'next_badges_subgraph');
    expect(selectedSubgraph).toBe('next_badges_subgraph');
  });

  test('getSelectedSeasonBadgesUrl no CID lag, previous season', async () => {
    const selectedSubgraph = getSelectedSeasonBadgesUrl(1, ["a"], 'current_badges_subgraph', 'next_badges_subgraph');
    expect(selectedSubgraph).toBe('current_badges_subgraph');
  });

  test('get badges from ipfs', async () => {
    const badges = [] as SubgraphBadgeResponse[];
    const seasonUser = createSeasonUserWithBadges('account1', 0, badges);
    const mGraphQLResponse = { data: { seasonUser } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<IpfsBadge> = [];
    data.push(createIpfsBadge('account1', 8)); // non prog, not minted
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { snapshot: data },
    });
    const badgesList = await communitySbt.getSeasonBadges({
      userId: 'account1',
      seasonId: 0,
      seasonStart: ogSeasonStart,
      seasonEnd: ogSeasonEnd,
    });
    expect(badgesList[0].badgeType).toBe('8');
    expect(badgesList[0].awardedTimestampMs).toBe(toMillis(ogSeasonEnd));
  });

  test('do not get badges from ipfs even if season ended', async () => {
    const badges = [] as SubgraphBadgeResponse[];
    const seasonUser = createSeasonUserWithBadges('account1', 1, badges);
    const mGraphQLResponse = { data: { seasonUser } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<IpfsBadge> = [];
    data.push(createIpfsBadge('account1', 8)); // non prog, not minted
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { snapshot: data },
    });
    const badgesList = await communitySbt.getSeasonBadges({
      userId: 'account1',
      seasonId: 1,
      seasonStart: s1SeasonStart,
      seasonEnd: s1SeasonEnd,
    });
    expect(badgesList.length).toBe(0);
  });

});
