import axios from "axios";
import { createMockClient, MockApolloClient } from "mock-apollo-client";
import { jest } from "@jest/globals";
import { getApolloClient } from "../src/utils/communitySbt/getApolloClient";
import SBT, { NonProgramaticBadgeResponse } from "../src/entities/communitySbt";
import { SubgraphBadgeResponse } from "../src/entities/communitySbt";
import { ethers } from "hardhat";
import { toMillis } from "../src/utils/communitySbt/helpers";
import { getSubgraphBadges } from "../src/utils/communitySbt/getSubgraphBadges";

type SeasonUser = {
  owner: {
    id: string;
  };
  totalWeightedNotionalTraded: number;
};

type IpfsBadge = {
    owner: string
    badgeType: number,
    metadataURI: string
}

type SeasonUserWithBadges = {
    id: string
    badges: SubgraphBadgeResponse[]
  };

jest.mock("axios");
jest.mock("../src/utils/communitySbt/getApolloClient.ts", () => {
  const mApolloClient = { query: jest.fn() };
  return { getApolloClient: jest.fn(() => mApolloClient) };
});
jest.mock("../src/utils/sentry/index.ts", () => {
    return {sentryTracker: { captureException: jest.fn(),
    captureMessage: jest.fn() } };
  });
const mockGetApolloClient = getApolloClient as jest.Mocked<
  (network: string) => any
>;

describe("getSeasonBadges old season", () => {
  const ogSeasonStart = 1654037999;
  const ogSeasonEnd = 1664578799;
  const s1SeasonStart = 1664578800;
  const s1SeasonEnd = 1672531199;
  const s2SeasonStart = 1672531200;
  const s2SeasonEnd = 1677628799;
  const seasonId = 1;
  const network = "goerli";
  let communitySbt : SBT;
  beforeEach(() => {
    communitySbt = new SBT({
        id: "testId",
        signer: ethers.provider.getSigner(),
        coingeckoKey: "coingecko_api",
        badgesSubgraphUrl: "badges_subgraph",
        nonProgDbUrl: "non=prog-db",
        referralsDbUrl: "referralsDbUrl",
        subgraphUrl: "subgraphUrl",
        ignoredWalletIds: {},
        badgesCids: ["badgesCids"],
        leavesCids: ["leavesCids"]
    });
  });

  test("get badges from ipfs", async () => {
    const badges = [
        createBadgeResponse(1, ogSeasonStart+1, ogSeasonEnd+1, "account1", 0),
        createBadgeResponse(7, ogSeasonStart+1, 0, "account1", 0),
        createBadgeResponse(12, 0, ogSeasonEnd+1, "account1", 0)
    ] as SubgraphBadgeResponse[]
    const seasonUser = createSeasonUserWithBadges(
        "account1",
        0,
        badges
    );
    const mGraphQLResponse = { data: { seasonUser: seasonUser } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<IpfsBadge> = [];
    data.push(createIpfsBadge("account1", 8)) // non prog, not minted
    data.push(createIpfsBadge("account1", 12))
    data.push(createIpfsBadge("account1", 1))
    data.push(createIpfsBadge("account1", 7))
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get
      .mockResolvedValueOnce({
        status: 200,
        data: {snapshot: data},
      });
    const badgesList = await communitySbt.getSeasonBadges({
        userId: "account1",
        seasonId: 0,
        seasonStart: ogSeasonStart,
        seasonEnd: ogSeasonEnd
    });
    expect(badgesList[0].badgeType).toBe("8")
    expect(badgesList[0].awardedTimestampMs).toBe(toMillis(ogSeasonEnd))
    expect(badgesList[0].mintedTimestampMs).toBe(undefined)
    expect(badgesList[1].badgeType).toBe("12")
    expect(badgesList[1].awardedTimestampMs).toBe(toMillis(ogSeasonEnd))
    expect(badgesList[1].mintedTimestampMs).toBe(toMillis(ogSeasonEnd+1))
    expect(badgesList[2].badgeType).toBe("1")
    expect(badgesList[2].awardedTimestampMs).toBe(toMillis(ogSeasonStart+1))
    expect(badgesList[2].mintedTimestampMs).toBe(toMillis(ogSeasonEnd+1))
    expect(badgesList[3].badgeType).toBe("7")
    expect(badgesList[3].awardedTimestampMs).toBe(toMillis(ogSeasonStart+1))
    expect(badgesList[3].mintedTimestampMs).toBe(undefined)
  });

  test("get subgraph badges", async () => {
    const badges = [
        createBadgeResponse(1, ogSeasonStart+1, ogSeasonEnd+1, "account1", 0),
        createBadgeResponse(7, ogSeasonStart+1, 0, "account1", 0),
        createBadgeResponse(12, 0, ogSeasonEnd+1, "account1", 0)
    ] as SubgraphBadgeResponse[]
    const seasonUser = createSeasonUserWithBadges(
        "account1",
        0,
        badges
    );
    const mGraphQLResponse = { data: { seasonUser: seasonUser } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const badgesList = await getSubgraphBadges({
        userId: "account1",
        seasonId: 0,
        seasonStart: ogSeasonStart,
        seasonEnd: ogSeasonEnd,
        badgesSubgraphUrl: "badges_subgraph"
    });
    expect(badgesList[2].badgeType).toBe("12")
    expect(badgesList[2].awardedTimestampMs).toBe(toMillis(0))
    expect(badgesList[2].mintedTimestampMs).toBe(toMillis(ogSeasonEnd+1))
    expect(badgesList[0].badgeType).toBe("1")
    expect(badgesList[0].awardedTimestampMs).toBe(toMillis(ogSeasonStart+1))
    expect(badgesList[0].mintedTimestampMs).toBe(toMillis(ogSeasonEnd+1))
    expect(badgesList[1].badgeType).toBe("7")
    expect(badgesList[1].awardedTimestampMs).toBe(toMillis(ogSeasonStart+1))
    expect(badgesList[1].mintedTimestampMs).toBe(undefined)
  });

  test("get community badges, check no out-of-season badges are parsed", async () => {
    const data: Array<NonProgramaticBadgeResponse> = [];
    data.push(createNonProgBadgeResponse("account1", "diplomatz", s2SeasonStart+1)) // 54
    data.push(createNonProgBadgeResponse("account1", "governorz", s2SeasonStart+2)) // 55
    data.push(createNonProgBadgeResponse("account1", "senatorz", s1SeasonEnd-2)) // 35

    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get
      .mockResolvedValueOnce({
        status: 200,
        data: {badges: data},
      });
    const badgesList = await communitySbt.getNonProgramaticBadges(
        "account1",
        2,
        s2SeasonStart,
        s2SeasonEnd
    );
    expect(badgesList['55'].badgeType).toBe('55')
    expect(badgesList['55'].awardedTimestampMs).toBe(toMillis(s2SeasonStart+2))
    expect(badgesList['55'].mintedTimestampMs).toBe(undefined)
    expect(badgesList['54'].badgeType).toBe('54')
    expect(badgesList['54'].awardedTimestampMs).toBe(toMillis(s2SeasonStart+1))
    expect(badgesList['54'].mintedTimestampMs).toBe(undefined)
    expect(badgesList['35']).toBe(undefined)
    expect(badgesList['56']).toBe(undefined)
  });

  test("get referrer badges", async () => {
    const seasonUsers = createSeasonUsers(1,0,1);
    const mGraphQLResponse = { data: { seasonUsers: seasonUsers } };
    const client = mockGetApolloClient(network);
    client.query.mockResolvedValueOnce(mGraphQLResponse);

    const data: Array<String> = [
        "under100k0",
        "over2m0"
    ];
    const mockedAxios = axios as jest.Mocked<typeof axios>;
    mockedAxios.get
      .mockResolvedValueOnce({
        status: 200,
        data: data,
      });
    const badgesList = await communitySbt.getReferrorBadges("account1",1);

    expect(badgesList['36'].badgeType).toBe('36')
    expect(badgesList['36'].awardedTimestampMs).toBeDefined()
    expect(badgesList['36'].mintedTimestampMs).toBe(undefined)
    expect(Object.entries(badgesList).length).toBe(1)
  });
});

function createSeasonUsers(
  under100k: number,
  over100k: number,
  over2M: number
): Array<SeasonUser> {
  const over100kSeasonUsers = createRandomUsers("over100k", over100k);
  const under100kSeasonUsers = createRandomUsers("under100k", under100k);
  const over2MSeasonUsers = createRandomUsers("over2m", over2M);
  return over100kSeasonUsers
    .concat(under100kSeasonUsers)
    .concat(over2MSeasonUsers);
}

function createRandomUsers(
  userIdSuffix: string,
  userCount: number
): Array<SeasonUser> {
  const seasonUsers = new Array<SeasonUser>();
  const amount =
    userIdSuffix === "over2m"
      ? 2000001
      : userIdSuffix === "over100k"
      ? 100001
      : 67;
  for (let i = 0; i < userCount; i++) {
    seasonUsers.push({
      owner: {
        id: `${userIdSuffix}${i}`,
      },
      totalWeightedNotionalTraded: amount,
    });
  }
  return seasonUsers;
}

function createSeasonUserWithBadges(
    userId: string,
    seasonId: number,
    badges: SubgraphBadgeResponse[]
  ): SeasonUserWithBadges {
    return {
        id: `${userId}#${seasonId}`,
        badges: badges
    };
  }

function createBadgeResponse(
    badgeType: number,
    awardedTimestamp: number,
    mintedTimestamp: number,
    owner: string,
    seasonId: number
) : SubgraphBadgeResponse {
    return {
        id: `${owner}#${badgeType}#${seasonId}`,
        badgeType: badgeType.toString(),
        awardedTimestamp: awardedTimestamp.toString(),
        mintedTimestamp: mintedTimestamp.toString()
    }
}

function createIpfsBadge(
    owner: string,
    badgeType: number
) : IpfsBadge {
    return {
        owner: owner,
        badgeType: badgeType,
        metadataURI: "randomUri",
    }
}

function createNonProgBadgeResponse(
    owner: string,
    badgeName: string,
    awardedTimestamp: number
) : NonProgramaticBadgeResponse {
    return {
        address: owner,
        badge: badgeName,
        awardedTimestamp: awardedTimestamp,
    }
}
  
