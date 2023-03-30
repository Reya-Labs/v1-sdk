import { BigNumber, Bytes, Signer, providers } from 'ethers';
import axios from 'axios';
import { DateTime } from 'luxon';
import { isUndefined } from 'lodash';
import { getSeasonUsers } from '@voltz-protocol/subgraph-data';
import { CommunitySBT, CommunitySBT__factory } from '../typechain-sbt';
import { createLeaves } from '../utils/communitySbt/getIpfsLeaves';
import { getRootFromSubgraph } from '../utils/communitySbt/getSubgraphRoot';
import { getProof } from '../utils/communitySbt/merkle-tree';
import { MULTI_REDEEM_METHOD_ID, ONE_DAY_IN_SECONDS, REDEEM_METHOD_ID } from '../constants';
import {
  decodeBadgeType,
  decodeMultipleBadgeTypes,
  get100KRefereeBenchmark,
  get2MRefereeBenchmark,
  getEtherscanURL,
  getLeavesIpfsUri,
  getSelectedSeasonBadgesUrl,
  getTopBadgeType,
  toMillis,
} from '../utils/communitySbt/helpers';
import { getSubgraphBadges } from '../utils/communitySbt/getSubgraphBadges';

import { getSentryTracker } from '../init';
import { geckoEthToUsd } from '../utils/priceFetch';
import { getScores, GetScoresArgs } from '../utils/communitySbt/getScores';
import { SupportedChainId } from '../types';

export type SBTConstructorArgs = {
  id: string;
  signer: Signer | null;
  chainId: SupportedChainId | null;
  coingeckoKey?: string;
  currentBadgesSubgraphUrl?: string;
  nextBadgesSubgraphUrl?: string;
  nonProgDbUrl?: string;
  referralsDbUrl?: string;
  subgraphUrl?: string;
  ignoredWalletIds?: Record<string, boolean>;
  badgesCids?: Array<string>;
  leavesCids?: Array<string>;
};

export type BadgeRecord = {
  badgeType: string;
  awardedTimestamp: number;
};

export type LeafInfo = {
  account: string;
  badgeId: number;
};

type MultiRedeemData = {
  leaves: Array<LeafInfo>;
  proofs: Array<string[]>;
  roots: Array<Bytes>;
};

export type BadgeResponse = {
  id: string;
  badgeType: string;
  awardedTimestampMs?: number;
  mintedTimestampMs?: number;
};

export type SubgraphBadgeResponse = {
  id: string;
  badgeType: string;
  awardedTimestamp: string;
  mintedTimestamp: string;
};

export type RankType = {
  address: string;
  points: number;
  rank: number;
};

enum TxBadgeStatus {
  SUCCESSFUL,
  FAILED,
  PENDING,
}

export enum BadgeClaimingStatus {
  CLAIMED,
  CLAIMING,
  NOT_CLAIMED,
}

export type BadgeWithStatus = {
  badgeType: number;
  claimingStatus: BadgeClaimingStatus;
};

export type GetBadgesStatusArgs = {
  apiKey: string;
  subgraphUrl: string;
  season: number;
  potentialClaimingBadgeTypes: Array<number>;
};

export type NonProgramaticBadgeResponse = {
  address: string;
  badge: string;
  awardedTimestamp: number;
};

export const TOP_BADGES_VARIANT: Record<string, string[]> = {
  trader: ['15', '31', '56'],
  liquidityProvider: ['12', '28', '53'],
};

export const NON_PROGRAMATIC_BADGES_VARIANT: Record<number, Record<string, string>> = {
  1: {
    diplomatz: '33',
    governorz: '34',
    senatorz: '35',
  },
  2: {
    diplomatz: '57',
    governorz: '58',
    senatorz: '59',
  },
  3: {
    diplomatz: '80',
    governorz: '81',
    senatorz: '82',
  },
};

export const REFERROR_BADGES_VARIANT: Record<number, Record<string, string>> = {
  1: {
    referror: '36',
    notionalInfluencer: '37',
    whaleWhisperer: '38',
  },
  2: {
    referror: '60',
    notionalInfluencer: '61',
    whaleWhisperer: '62',
  },
  3: {
    referror: '83',
    notionalInfluencer: '84',
    whaleWhisperer: '85',
  },
};

export const NON_SUBGRAPH_BADGES_SEASONS: Record<number, string[]> = {
  0: [TOP_BADGES_VARIANT.trader[0], TOP_BADGES_VARIANT.liquidityProvider[0]],
  1: [
    TOP_BADGES_VARIANT.trader[1],
    TOP_BADGES_VARIANT.liquidityProvider[1],
    NON_PROGRAMATIC_BADGES_VARIANT[1].diplomatz,
    NON_PROGRAMATIC_BADGES_VARIANT[1].governorz,
    NON_PROGRAMATIC_BADGES_VARIANT[1].senatorz,
    REFERROR_BADGES_VARIANT[1].referror,
    REFERROR_BADGES_VARIANT[1].notionalInfluencer,
    REFERROR_BADGES_VARIANT[1].whaleWhisperer,
  ],
  2: [
    TOP_BADGES_VARIANT.trader[2],
    TOP_BADGES_VARIANT.liquidityProvider[2],
    NON_PROGRAMATIC_BADGES_VARIANT[2].diplomatz,
    NON_PROGRAMATIC_BADGES_VARIANT[2].governorz,
    NON_PROGRAMATIC_BADGES_VARIANT[2].senatorz,
    REFERROR_BADGES_VARIANT[2].referror,
    REFERROR_BADGES_VARIANT[2].notionalInfluencer,
    REFERROR_BADGES_VARIANT[2].whaleWhisperer,
  ],
  3: [
    TOP_BADGES_VARIANT.trader[3],
    TOP_BADGES_VARIANT.liquidityProvider[3],
    NON_PROGRAMATIC_BADGES_VARIANT[3].diplomatz,
    NON_PROGRAMATIC_BADGES_VARIANT[3].governorz,
    NON_PROGRAMATIC_BADGES_VARIANT[3].senatorz,
    REFERROR_BADGES_VARIANT[3].referror,
    REFERROR_BADGES_VARIANT[3].notionalInfluencer,
    REFERROR_BADGES_VARIANT[3].whaleWhisperer,
  ],
};

class SBT {
  public readonly id: string;
  public readonly signer: Signer | null;
  public readonly chainId: SupportedChainId | null;
  public readonly provider: providers.Provider | undefined;
  public readonly coingeckoKey?: string;
  public readonly currentBadgesSubgraphUrl?: string;
  public readonly nextBadgesSubgraphUrl?: string;
  public readonly nonProgDbUrl?: string;
  public readonly referralsDbUrl?: string;
  public readonly subgraphUrl?: string;
  public readonly ignoredWalletIds?: Record<string, boolean>;
  public readonly badgesCids?: Array<string>;
  public readonly leavesCids?: Array<string>;
  public contract: CommunitySBT | null;
  public ethPrice: number | undefined;

  /**
   *
   * @param id: CommunitySBT contract address (depends on the network)
   * @param signer: Signer object according to the user's wallet
   */
  public constructor({
    id,
    signer,
    chainId,
    coingeckoKey,
    currentBadgesSubgraphUrl,
    nextBadgesSubgraphUrl,
    nonProgDbUrl,
    referralsDbUrl,
    subgraphUrl,
    ignoredWalletIds,
    badgesCids,
    leavesCids,
  }: SBTConstructorArgs) {
    this.id = id;
    this.signer = signer;

    this.coingeckoKey = coingeckoKey;
    this.currentBadgesSubgraphUrl = currentBadgesSubgraphUrl;
    this.nextBadgesSubgraphUrl = nextBadgesSubgraphUrl;
    this.nonProgDbUrl = nonProgDbUrl;
    this.referralsDbUrl = referralsDbUrl;
    this.subgraphUrl = subgraphUrl;
    this.ignoredWalletIds = ignoredWalletIds ?? {};
    this.badgesCids = badgesCids;
    this.leavesCids = leavesCids;
    this.chainId = chainId;
    if (signer) {
      this.contract = CommunitySBT__factory.connect(id, signer);
      this.provider = signer.provider;
    } else {
      this.contract = null;
    }
  }

  /**
   * @notice This function calls the SBT contract's
   * @param badgeType: number associated with the badge to redeem
   * @param owner: user's address
   * @param awardedTimestamp: time at which the badge was awarded (taken from the subgraph)
   * @param subgraphAPI: the api link used to query the subgraph
   * @returns
   */
  public async redeemSbt(
    badgeType: string,
    owner: string,
    seasonId: number,
    awardedTimestamp: number,
  ): Promise<BigNumber | void> {
    // wallet was not connected when the object was initialised
    // therefore, it couldn't obtain the contract connection
    if (!this.contract) {
      throw new Error('Cannot connect to community SBT contract');
    }

    const selectedBadgesSubgraphUrl = getSelectedSeasonBadgesUrl(
      seasonId,
      this.badgesCids,
      this.currentBadgesSubgraphUrl,
      this.nextBadgesSubgraphUrl,
    );

    try {
      if (
        !selectedBadgesSubgraphUrl ||
        !this.coingeckoKey ||
        !this.subgraphUrl ||
        !this.provider ||
        !this.leavesCids ||
        !this.chainId
      ) {
        throw new Error('Missing env vars');
      }

      const awardedTimestampSec = Math.floor(awardedTimestamp / 1000);
      // create merkle tree from subgraph derived leaves and get the root
      const rootEntity = await getRootFromSubgraph(awardedTimestampSec, selectedBadgesSubgraphUrl);
      if (!rootEntity) {
        throw new Error('No root found');
      }
      const leafInfo: LeafInfo = {
        account: owner,
        badgeId: parseInt(badgeType),
      };

      const leaves = await createLeaves(seasonId, this.leavesCids);
      const proof = getProof(owner, parseInt(badgeType), leaves);

      const tokenId = await this.contract.callStatic.redeem(leafInfo, proof, rootEntity.merkleRoot);
      const tx = await this.contract.redeem(leafInfo, proof, rootEntity.merkleRoot);
      await tx.wait();
      return tokenId;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Unable to claim');
      throw new Error('Unable to claim');
    }
  }

  /**
   * @notice This function calls the SBT contract's
   * @param badges: array of badgeTypes and the time at which they were awarded
   * @param owner: user's address
   * @param subgraphAPI: the api link used to query the subgraph
   * @returns
   */
  public async redeemMultipleSbts(
    badges: BadgeRecord[],
    owner: string,
    seasonId: number,
  ): Promise<{
    claimedBadgeTypes: number[];
  }> {
    // wallet was not connected when the object was initialised
    // therefore, it couldn't obtain the contract connection
    if (!this.contract || !this.provider || !this.leavesCids) {
      throw new Error('Wallet not connected');
    }

    // parse through badges and create
    // multiRedeem(LeafInfo[] memory leafInfos, bytes32[][] calldata proofs, bytes32[] memory merkleRoots)
    const data: MultiRedeemData = {
      leaves: [],
      proofs: [],
      roots: [],
    };

    const selectedBadgesSubgraphUrl = getSelectedSeasonBadgesUrl(
      seasonId,
      this.badgesCids,
      this.currentBadgesSubgraphUrl,
      this.nextBadgesSubgraphUrl,
    );

    const claimedBadgeTypes: number[] = [];
    for (const badge of badges) {
      if (!selectedBadgesSubgraphUrl || !this.coingeckoKey || !this.subgraphUrl) {
        break;
      }

      const awardedTimestampSec = Math.floor(badge.awardedTimestamp / 1000);
      // create merkle tree from subgraph derived leaves and get the root
      const rootEntity = await getRootFromSubgraph(awardedTimestampSec, selectedBadgesSubgraphUrl);
      if (!rootEntity) {
        continue;
      }
      const leafInfo: LeafInfo = {
        account: owner,
        badgeId: parseInt(badge.badgeType),
      };

      const leaves = await createLeaves(seasonId, this.leavesCids);
      const proof = getProof(owner, parseInt(badge.badgeType), leaves);

      data.leaves.push(leafInfo);
      data.proofs.push(proof);
      data.roots.push(rootEntity.merkleRoot);
      claimedBadgeTypes.push(parseInt(badge.badgeType));
    }

    try {
      await this.contract.callStatic.multiRedeem(data.leaves, data.proofs, data.roots);
      const tx = await this.contract.multiRedeem(data.leaves, data.proofs, data.roots);
      await tx.wait();
      return {
        claimedBadgeTypes,
      };
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Unable to claim multiple badges');
      throw new Error('Unable to claim multiple badges');
    }
  }

  public async getSeasonBadges({
    userId,
    seasonId,
    seasonStart,
    seasonEnd,
  }: {
    userId: string;
    seasonId: number;
    seasonStart: number;
    seasonEnd: number;
  }): Promise<BadgeResponse[]> {
    try {
      const selectedBadgesSubgraphUrl = getSelectedSeasonBadgesUrl(
        seasonId,
        this.badgesCids,
        this.currentBadgesSubgraphUrl,
        this.nextBadgesSubgraphUrl,
      );
      if (seasonEnd < DateTime.now().toSeconds() && this.badgesCids && this.badgesCids[seasonId]) {
        const badges = await this.getOldSeasonBadges({
          userId,
          seasonId,
          seasonStart,
          seasonEnd,
          selectedBadgesSubgraphUrl,
        });
        return badges;
      }
      const badges = await this.computeSeasonBadges({
        userId,
        seasonId,
        seasonStart,
        seasonEnd,
        selectedBadgesSubgraphUrl,
      });
      return badges;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Failed to get season badges');
      throw new Error('Failed to get season badges');
    }
  }

  public async getOldSeasonBadges({
    userId,
    seasonId,
    seasonStart,
    seasonEnd,
    selectedBadgesSubgraphUrl,
  }: {
    userId: string;
    seasonId: number;
    seasonStart: number;
    seasonEnd: number;
    selectedBadgesSubgraphUrl?: string;
  }): Promise<BadgeResponse[]> {
    if (!this.provider || !this.signer || !this.badgesCids) {
      throw new Error('Wallet not connected');
    }

    // programmatic badges
    const badgesResponse: BadgeResponse[] = await getSubgraphBadges({
      userId,
      seasonId,
      seasonStart,
      seasonEnd,
      badgesSubgraphUrl: selectedBadgesSubgraphUrl,
    });
    const mapBadges = new Map<string, BadgeResponse>();
    badgesResponse.forEach((entry) => {
      mapBadges.set(entry.id, entry);
    });

    const data = await axios.get(getLeavesIpfsUri(seasonId, this.badgesCids), {
      headers: {
        Accept: 'text/plain',
      },
    });

    const snasphots: Array<{
      owner: string;
      badgeType: number;
      metadataURI: string;
    }> = data.data.snapshot;

    // to speed things up, awarded timestamp
    const subgraphSnapshots: BadgeResponse[] = [];
    snasphots.forEach((entry) => {
      if (entry.owner.toLowerCase() === userId.toLowerCase()) {
        const id = `${entry.owner.toLowerCase()}#${entry.badgeType}#${seasonId}`;

        const snapshot = {
          id,
          badgeType: entry.badgeType.toString(),
          awardedTimestampMs:
            mapBadges.get(id)?.awardedTimestampMs || toMillis(seasonEnd - ONE_DAY_IN_SECONDS),
          mintedTimestampMs: mapBadges.get(id)?.mintedTimestampMs || undefined,
        };

        subgraphSnapshots.push(snapshot);
      }
    });

    return subgraphSnapshots;
  }

  public async computeSeasonBadges({
    userId,
    seasonId,
    seasonStart,
    seasonEnd,
    selectedBadgesSubgraphUrl,
  }: {
    userId: string;
    seasonId: number;
    seasonStart: number;
    seasonEnd: number;
    selectedBadgesSubgraphUrl?: string;
  }): Promise<BadgeResponse[]> {
    try {
      // programmatic badges
      const badgesResponse: BadgeResponse[] = await getSubgraphBadges({
        userId,
        seasonId,
        seasonStart,
        seasonEnd,
        badgesSubgraphUrl: selectedBadgesSubgraphUrl,
      });

      // referrer badges & non-programatic badges
      if (this.chainId === SupportedChainId.mainnet || this.chainId === SupportedChainId.goerli) {
        let referroorBadges: Record<string, BadgeResponse> = {};
        let nonProgBadges: Record<string, BadgeResponse> = {};
        if (this.nonProgDbUrl) {
          nonProgBadges = await this.getNonProgramaticBadges(
            userId,
            seasonId,
            seasonStart,
            seasonEnd,
          );
        }

        if (this.referralsDbUrl && selectedBadgesSubgraphUrl) {
          referroorBadges = await this.getReferrorBadges(
            userId,
            seasonId,
            selectedBadgesSubgraphUrl,
          );
        }

        for (const badgeType of NON_SUBGRAPH_BADGES_SEASONS[seasonId]) {
          if (nonProgBadges[badgeType]) {
            const nonProgBadge = nonProgBadges[badgeType];
            badgesResponse.push(nonProgBadge);
          }
          if (referroorBadges[badgeType]) {
            const referroorBadge = referroorBadges[badgeType];
            badgesResponse.push(referroorBadge);
          }
        }
      }

      // top LP & trader badges
      if (
        selectedBadgesSubgraphUrl &&
        this.subgraphUrl &&
        this.coingeckoKey &&
        DateTime.now().toSeconds() > seasonEnd
      ) {
        const { topLpBadge, topTraderBadge } = await this.getTopBadges(
          userId,
          seasonId,
          seasonEnd,
          selectedBadgesSubgraphUrl,
        );

        if (!isUndefined(topLpBadge)) badgesResponse.push(topLpBadge);
        if (!isUndefined(topTraderBadge)) badgesResponse.push(topTraderBadge);
      }

      return badgesResponse;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      return [];
    }
  }

  /**
   * @dev Retrieve season's notional
   * ranking of all users. Check if given user is in top 5.
   * If so, assign a top trader/LP badge, otherwise return undefined
   */
  public async getTopBadges(
    userId: string,
    seasonId: number,
    seasonEnd: number,
    selectedBadgesSubgraphUrl?: string,
  ): Promise<{
    topTraderBadge: BadgeResponse | undefined;
    topLpBadge: BadgeResponse | undefined;
  }> {
    const traderBadgeType = getTopBadgeType(seasonId, true);
    const lpBadgeType = getTopBadgeType(seasonId, false);

    if (!selectedBadgesSubgraphUrl || !this.coingeckoKey || !this.ignoredWalletIds) {
      return {
        topTraderBadge: undefined,
        topLpBadge: undefined,
      };
    }

    if (!this.ethPrice) {
      this.ethPrice = await geckoEthToUsd(this.coingeckoKey);
    }

    const rankResult = await this.getRanking(seasonId);

    const traderPosition = rankResult.traderRankResults
      .slice(0, 5)
      .find((rank) => rank.address.toLowerCase() === userId.toLowerCase());

    const topTraderBadge = !isUndefined(traderPosition)
      ? await SBT.constructTopBadge(
          userId,
          seasonId,
          seasonEnd,
          traderBadgeType,
          selectedBadgesSubgraphUrl,
        )
      : undefined;

    const lpPosition = rankResult.lpRankResults
      .slice(0, 5)
      .find((rank) => rank.address.toLowerCase() === userId.toLowerCase());

    const topLpBadge = !isUndefined(lpPosition)
      ? await SBT.constructTopBadge(
          userId,
          seasonId,
          seasonEnd,
          lpBadgeType,
          selectedBadgesSubgraphUrl,
        )
      : undefined;

    return {
      topTraderBadge,
      topLpBadge,
    };
  }

  public async getRanking(seasonId: number): Promise<{
    traderRankResults: RankType[];
    lpRankResults: RankType[];
  }> {
    if (!this.subgraphUrl || !this.ignoredWalletIds) {
      return {
        traderRankResults: [],
        lpRankResults: [],
      };
    }

    const scoreArgs: GetScoresArgs = {
      season: seasonId,
      subgraphUrl: this.nextBadgesSubgraphUrl || '',
      ignoredWalletIds: this.ignoredWalletIds,
    };

    const scores = await getScores(scoreArgs);

    const traderRankResults: RankType[] = Object.keys(scores.traderScores)
      .sort((a, b) => scores.traderScores[b] - scores.traderScores[a])
      .map((walletId, index) => ({
        address: walletId,
        points: scores.traderScores[walletId] || 0,
        rank: index,
      }));

    const lpRankResults: RankType[] = Object.keys(scores.lpScores)
      .sort((a, b) => scores.lpScores[b] - scores.lpScores[a])
      .map((walletId, index) => ({
        address: walletId,
        points: scores.lpScores[walletId] || 0,
        rank: index,
      }));

    return {
      traderRankResults,
      lpRankResults,
    };
  }

  /**
   * @dev Query the Badges subgraph to assess if the top
   * badge was claimed. Create a Badge Response with
   * the awarded time as end of season and claimed time
   * as either zero if not claimed or subgraph's minted timestamp
   */
  static async constructTopBadge(
    userId: string,
    seasonId: number,
    seasonEnd: number,
    badgeType: string,
    selectedBadgesSubgraphUrl?: string,
  ): Promise<BadgeResponse> {
    const seasonUsers = await getSeasonUsers(selectedBadgesSubgraphUrl || '', {
      season: seasonId,
      users: [userId],
    });

    let mintedTimestampInMS = 0;

    if (seasonUsers.length > 0) {
      const badges = seasonUsers[0].badges;
      const specificBadge = badges.find((badge) => badge.badgeType === badgeType);

      if (specificBadge) {
        mintedTimestampInMS = specificBadge.mintedTimestampInMS;
      }
    }

    const badge: BadgeResponse = {
      id: `${userId}#${seasonId}#${badgeType}`,
      badgeType,
      awardedTimestampMs: toMillis(seasonEnd),
      mintedTimestampMs: mintedTimestampInMS > 0 ? mintedTimestampInMS : undefined,
    };
    return badge;
  }

  public async getNonProgramaticBadges(
    userId: string,
    seasonId: number,
    seasonStart: number,
    seasonEnd: number,
  ): Promise<Record<string, BadgeResponse>> {
    const badgeResponseRecord: Record<string, BadgeResponse> = {};

    const resp = await axios.get(`${this.nonProgDbUrl}/get-badges/${userId}`);
    if (!resp.data) {
      return badgeResponseRecord;
    }

    const badges: NonProgramaticBadgeResponse[] = resp.data.badges;
    badges.forEach((entry) => {
      const badgeType = NON_PROGRAMATIC_BADGES_VARIANT[seasonId][entry.badge];
      if (
        badgeType &&
        entry.awardedTimestamp <= seasonEnd &&
        entry.awardedTimestamp >= seasonStart
      ) {
        badgeResponseRecord[badgeType] = {
          id: `${userId}#${badgeType}#${seasonId}`,
          badgeType,
          awardedTimestampMs: toMillis(entry.awardedTimestamp),
          mintedTimestampMs: undefined,
        } as BadgeResponse;
      }
    });
    return badgeResponseRecord;
  }

  public async getReferrorBadges(
    userId: string,
    seasonId: number,
    selectedBadgesSubgraphUrl: string,
  ): Promise<Record<string, BadgeResponse>> {
    const badgeResponseRecord: Record<string, BadgeResponse> = {};

    const resp = await axios.get(`${this.referralsDbUrl}/referrals-by/${userId.toLowerCase()}`);
    if (!resp.data) {
      return badgeResponseRecord;
    }
    const referees: string[] = resp.data;
    const lowerCaseReferees = referees.reduce(
      (pV, cV) => [...pV, cV.toLowerCase()],
      [] as Array<string>,
    );

    const seasonUsers = await getSeasonUsers(selectedBadgesSubgraphUrl, {
      season: seasonId,
      users: lowerCaseReferees,
    });

    let refereesWith100kNotionalTraded = 0;
    let refereesWith2mNotionalTraded = 0;

    seasonUsers.forEach((user) => {
      const pointz = user.timeWeightedTradedNotional;
      if (pointz >= get100KRefereeBenchmark(selectedBadgesSubgraphUrl)) {
        refereesWith100kNotionalTraded++;
        if (pointz >= get2MRefereeBenchmark(selectedBadgesSubgraphUrl)) {
          refereesWith2mNotionalTraded++;
        }
      }
    });

    if (refereesWith100kNotionalTraded >= 1) {
      let badgeType = REFERROR_BADGES_VARIANT[seasonId].referror;
      badgeResponseRecord[badgeType] = this.createReferroorBadgeRecord(badgeType, userId, seasonId);
      if (refereesWith100kNotionalTraded >= 10) {
        badgeType = REFERROR_BADGES_VARIANT[seasonId].notionalInfluencer;
        badgeResponseRecord[badgeType] = this.createReferroorBadgeRecord(
          badgeType,
          userId,
          seasonId,
        );
      }
    }
    if (refereesWith2mNotionalTraded >= 5) {
      const badgeType = REFERROR_BADGES_VARIANT[seasonId].whaleWhisperer;
      badgeResponseRecord[badgeType] = this.createReferroorBadgeRecord(badgeType, userId, seasonId);
    }
    return badgeResponseRecord;
  }

  createReferroorBadgeRecord(badgeType: string, userId: string, seasonId: number): BadgeResponse {
    return {
      id: `${userId}#${badgeType}#${seasonId}`,
      badgeType,
      awardedTimestampMs: toMillis(DateTime.now().toSeconds()),
      mintedTimestampMs: undefined,
    } as BadgeResponse;
  }

  public async getUserBalance(user: string): Promise<BigNumber | void> {
    const balance = await this.contract?.balanceOf(user);
    return balance;
  }

  public async getTokenOwner(tokenId: string): Promise<string | void> {
    const owner = await this.contract?.ownerOf(tokenId);
    return owner;
  }

  public async getTotalSupply(): Promise<BigNumber | void> {
    const totalSupply = await this.contract?.totalSupply();
    return totalSupply;
  }

  public async getBadgeStatus(args: GetBadgesStatusArgs): Promise<Array<BadgeWithStatus>> {
    if (!this.signer) {
      throw new Error('No provider found');
    }
    const userAddress = await this.signer.getAddress();
    const network = await this.provider?.getNetwork();
    const networkName = network ? network.name : '';

    const getURL = getEtherscanURL(networkName, args.apiKey, userAddress);
    const resp = await axios.get(getURL);

    if (!resp.data) {
      throw new Error('Etherscan api failed');
    }
    const transactions = resp.data.result;

    // get last 50 transactions, match is redeem and set SUCC/FAILED status
    const txBadges = new Map<number, TxBadgeStatus>();
    for (const transaction of transactions) {
      if (transaction.to.toLowerCase() !== this.contract?.address.toLowerCase()) {
        continue;
      }
      const status =
        transaction.txreceipt_status === 1 ? TxBadgeStatus.SUCCESSFUL : TxBadgeStatus.FAILED;
      if (transaction.methodId === REDEEM_METHOD_ID) {
        const badgeType = decodeBadgeType(transaction.input);
        txBadges.set(badgeType, status);
      } else if (transaction.methodId === MULTI_REDEEM_METHOD_ID) {
        const badgeTypes = decodeMultipleBadgeTypes(transaction.input);
        for (const badgeType of badgeTypes) {
          txBadges.set(badgeType, status);
        }
      }
    }

    // if badges of interest are not part of those 50 transactions, set them as pending
    for (const badgeType of args.potentialClaimingBadgeTypes) {
      if (!txBadges.get(badgeType)) {
        txBadges.set(badgeType, TxBadgeStatus.PENDING);
      }
    }

    // badges claiming status in subgraph - includes all bades earned by user in given season
    const selectedBadgesSubgraphUrl = getSelectedSeasonBadgesUrl(
      args.season,
      this.badgesCids,
      this.currentBadgesSubgraphUrl,
      this.nextBadgesSubgraphUrl,
    );
    const subgraphClaimedBadges = await SBT.claimedBadgesInSubgraph(
      userAddress,
      args.season,
      selectedBadgesSubgraphUrl,
    );

    // final claiming status verdict
    const badgeStatuses = subgraphClaimedBadges.map((badge) => {
      if (badge.claimingStatus === BadgeClaimingStatus.CLAIMED) {
        return badge;
      }
      const txStatus = txBadges.get(badge.badgeType);

      // badge not found in recent successful txs or in potential pending txs
      // meaning their status is desided by the subgraph
      if (!txStatus || txStatus === TxBadgeStatus.FAILED) {
        return {
          badgeType: badge.badgeType,
          claimingStatus: badge.claimingStatus,
        };
      }
      // subgraph is not updated yet
      return {
        badgeType: badge.badgeType,
        claimingStatus: BadgeClaimingStatus.CLAIMING,
      };
    });

    return badgeStatuses;
  }

  static async claimedBadgesInSubgraph(
    userAddress: string,
    season: number,
    selectedBadgesSubgraphUrl?: string,
  ): Promise<BadgeWithStatus[]> {
    const seasonUsers = await getSeasonUsers(selectedBadgesSubgraphUrl || '', {
      season,
      users: [userAddress],
    });

    if (seasonUsers.length === 0) {
      return [];
    }

    const badges = seasonUsers[0].badges;

    const badgesClaimed = badges.map((badge): BadgeWithStatus => {
      return {
        badgeType: parseInt(badge.badgeType, 10),
        claimingStatus:
          badge.mintedTimestampInMS === 0
            ? BadgeClaimingStatus.NOT_CLAIMED
            : BadgeClaimingStatus.CLAIMED, // only from subgraph's perspective
      };
    });

    return badgesClaimed;
  }
}

export default SBT;
