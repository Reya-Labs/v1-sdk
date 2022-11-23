import { BigNumber, Bytes, Signer, providers, ethers } from 'ethers';
import { ApolloClient, ApolloQueryResult, gql, HttpLink, InMemoryCache, NormalizedCacheObject } from '@apollo/client';
import { CommunitySBT, CommunitySBT__factory } from '../typechain-sbt';
import { createLeaves } from '../utils/communitySbt/getSubgraphLeaves';
import { getRootFromSubgraph } from '../utils/communitySbt/getSubgraphRoot';
import { getProof } from '../utils/communitySbt/merkle-tree';
import  axios from 'axios';
import fetch from 'cross-fetch';
import { MULTI_REDEEM_METHOD_ID, ONE_YEAR_IN_SECONDS, REDEEM_METHOD_ID } from '../constants';
import { decodeBadgeType, decodeMultipleBadgeTypes, geckoEthToUsd, get100KRefereeBenchmark, get2MRefereeBenchmark, getEtherscanURL, getTopBadgeType, toMillis } from '../utils/communitySbt/helpers';
import { DateTime } from 'luxon';

export type SBTConstructorArgs = {
    id: string;
    signer: Signer| null;
};

export type BadgeRecord = {
    badgeType: string;
    awardedTimestamp: number;
};

export type LeafInfo = {
    account: string;
    badgeId: number;
}

type MultiRedeemData = {
    leaves: Array<LeafInfo>;
    proofs: Array<string[]>;
    roots: Array<Bytes>;
}

export type BadgeResponse = {
    id: string;
    badgeType: string;
    awardedTimestampMs?: number;
    mintedTimestampMs?: number;
}

type SubgraphBadgeResponse = {
    id: string;
    badgeType: string;
    awardedTimestamp: string;
    mintedTimestamp: string;
}

type SubgraphPointzResponse = {
    id: string;
    seasonUser: {id: string};
    weightedNotionalTraded: string;
    weightedLiquidityProvided: string;
    lastSwapTimestamp: string;
    lastMintTradeTimestamp: string;
}

enum TxBadgeStatus {
    SUCCESSFUL,
    FAILED,
    PENDING
}

export enum BadgeClaimingStatus {
    CLAIMED,
    CLAIMING,
    NOT_CLAIMED
}

export type BadgeWithStatus = {
    badgeType: number;
    claimingStatus: BadgeClaimingStatus;
}

export type GetBadgesStatusArgs = {
    apiKey: string;
    subgraphUrl: string;
    season: number;
    potentialClaimingBadgeTypes: Array<number>;
}

export type NonProgramaticBadgeResponse = {
    address: string;
    badge: string;
    awardedTimestamp: number;
    mintedTimestamp: number;
}

export const NON_SUBGRAPH_BADGES_SEASONS: Record<number, string[]>  = {
    0: [
        '15',
        '12'
    ],
    1: [
        '31',
        '28',
        '33',
        '34',
        '35',
        '36',
        '37',
        '38'
    ]
}

export const TOP_BADGES_VARIANT: Record<string, string[]> = {
    'trader': ['15', '31'],
    'liquidityProvider': ['12', '28']
}


export const NON_PROGRAMATIC_BADGES_VARIANT: Record<string, string> = {
    'diplomatz' : '33',
    'governorz' : '34',
    'senatorz' : '35'
}

export const REFERROR_BADGES_VARIANT: Record<string, string> = {
    'referror' : '36',
    'notionalInfluencer' : '37',
    'whaleWhisperer' : '38'
}



class SBT {

  public readonly id: string;
  public readonly signer: Signer | null;
  public readonly provider: providers.Provider | undefined;
  public contract: CommunitySBT | null;

  /**
   * 
   * @param id: CommunitySBT contract address (depends on the network)
   * @param signer: Signer object according to the user's wallet
   */
  public constructor({ id, signer }: SBTConstructorArgs) {
    this.id = id;
    this.signer = signer;
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
    awardedTimestamp: number,
    subgraphAPI: string
  ): Promise<BigNumber | void> {

    // wallet was not connected when the object was initialised
    // therefore, it couldn't obtain the contract connection
    if (!this.contract) {
        throw new Error('Cannot connect to community SBT contract');
    }

    try {
        // create merkle tree from subgraph derived leaves and get the root
        const rootEntity = await getRootFromSubgraph(awardedTimestamp, subgraphAPI);
        if(!rootEntity) {
            throw new Error('No root found')
        }
        const leafInfo : LeafInfo = {
            account: owner,
            badgeId: parseInt(badgeType)
        }

        const startTimestamp = rootEntity.startTimestamp;
        const endTimestamp = rootEntity.endTimestamp;

        const leaves = await createLeaves(startTimestamp, endTimestamp, subgraphAPI);
        const proof = getProof(owner, parseInt(badgeType), leaves);


        const tokenId = await this.contract.callStatic.redeem(leafInfo, proof, rootEntity.merkleRoot);
        const tx = await this.contract.redeem(leafInfo, proof, rootEntity.merkleRoot);
        await tx.wait();
        return tokenId;
    } catch (err) {
        console.error(err);
        throw new Error("Unable to claim");
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
        subgraphAPI: string
    ): Promise<{
        claimedBadgeTypes: number[]
    }> {
        // wallet was not connected when the object was initialised
        // therefore, it couldn't obtain the contract connection
        if (!this.contract) {
            throw new Error('Wallet not connected');
        }

        // parse through badges and create 
        // multiRedeem(LeafInfo[] memory leafInfos, bytes32[][] calldata proofs, bytes32[] memory merkleRoots) 
        let data: MultiRedeemData = {
            leaves: [],
            proofs: [],
            roots: []
        }
        const claimedBadgeTypes: number[] = [];
        for (const badge of badges) {
            // create merkle tree from subgraph derived leaves and get the root
            const rootEntity = await getRootFromSubgraph(badge.awardedTimestamp, subgraphAPI);
            if(!rootEntity) {
                continue;
            }
            const leafInfo: LeafInfo = {
                account: owner,
                badgeId:  parseInt(badge.badgeType)
            }
            const startTimestamp = rootEntity.startTimestamp;
            const endTimestamp = rootEntity.endTimestamp;

            const leaves = await createLeaves(startTimestamp, endTimestamp, subgraphAPI);
            const proof = getProof(owner,  parseInt(badge.badgeType), leaves);

            data.leaves.push(leafInfo);
            data.proofs.push(proof);
            data.roots.push(rootEntity.merkleRoot)
            claimedBadgeTypes.push( parseInt(badge.badgeType));
        }

        try {
            await this.contract.callStatic.multiRedeem(data.leaves, data.proofs, data.roots);
            const tx = await this.contract.multiRedeem(data.leaves, data.proofs, data.roots);
            return {
                claimedBadgeTypes,
            }
        } catch (err) {
            throw new Error("Unable to claim multiple badges");
        }
    }

    public async getSeasonBadges({
        badgesSubgraphUrl,
        nonProgDbUrl,
        referralsDbUrl,
        subgraphUrl,
        coingeckoKey,
        userId,
        seasonId,
        seasonStart,
        seasonEnd
      }: {
        badgesSubgraphUrl?: string;
        nonProgDbUrl?: string;
        referralsDbUrl? : string,
        subgraphUrl?: string,
        coingeckoKey?: string,
        userId: string;
        seasonId: number;
        seasonStart: number,
        seasonEnd: number
      }): Promise<BadgeResponse[]> {
        try {
            let badgesResponse : BadgeResponse[] = [];

            // programmatic badges
            if (badgesSubgraphUrl) {
                const badgeQuery = `
                    query( $id: String) {
                        seasonUser(id: $id) {
                            id
                            badges {
                            id
                            awardedTimestamp
                            mintedTimestamp
                            badgeType
                            }
                        }
                    }
                `;
                const client = new ApolloClient({
                    cache: new InMemoryCache(),
                    link: new HttpLink({ uri: badgesSubgraphUrl, fetch })
                })
                const id = `${userId.toLowerCase()}#${seasonId}`
                const data = await client.query<{
                    seasonUser: {
                        badges: SubgraphBadgeResponse[]
                    }
                }>({
                    query: gql(badgeQuery),
                    variables: {
                        id: id,
                    },
                });

                const subgraphBadges = (data?.data?.seasonUser ? data.data.seasonUser.badges : []) as SubgraphBadgeResponse[];
                for (const badge of subgraphBadges) {
                    if (parseInt(badge.awardedTimestamp) > 0) {
                        badgesResponse.push({
                            id: badge.id,
                            badgeType: badge.badgeType,
                            awardedTimestampMs: toMillis(parseInt(badge.awardedTimestamp)),
                            mintedTimestampMs: toMillis(parseInt(badge.mintedTimestamp)),
                        });
                    }
                }
            }

            // referrer badges & non-programatic badges
            let referroorBadges : Record<string, BadgeResponse> = {};
            let nonProgBadges : Record<string, BadgeResponse> = {};
            if (nonProgDbUrl) {
                nonProgBadges = await this.getNonProgramaticBadges(userId, nonProgDbUrl);
            }
            
            if (referralsDbUrl && badgesSubgraphUrl) {
                referroorBadges = await this.getReferrorBadges(
                    userId,
                    referralsDbUrl,
                    badgesSubgraphUrl,
                    seasonId
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

            // top LP & trader badges
            if (badgesSubgraphUrl && subgraphUrl && coingeckoKey) {
                const topLpBadge =  await this.getTopBadge(userId, seasonId, false, seasonStart, seasonEnd, subgraphUrl, badgesSubgraphUrl, coingeckoKey);
                const topTraderBadge =  await this.getTopBadge(userId, seasonId, true, seasonStart, seasonEnd, subgraphUrl, badgesSubgraphUrl, coingeckoKey);
                if (topLpBadge) badgesResponse.push(topLpBadge);
                if (topTraderBadge) badgesResponse.push(topTraderBadge);
            }
            
            return badgesResponse;
        } catch (error) {
          return [];
        }
    }

    /**
   * @dev Retrieve season's notional
   * ranking of all users. Check if given user is in top 5.
   * If so, assign a top trader/LP badge, otherwise return undefined
   */
    public async getTopBadge(
        userId: string,
        seasonId: number,
        isTrader: boolean,
        seasonStart: number,
        seasonEnd: number,
        subgraphUrl: string,
        badgesSubgraphUrl: string,
        coingeckoKey: string
    ): Promise<BadgeResponse | undefined> {
        const badgeType = getTopBadgeType(seasonId, isTrader);
        if (!badgeType) return undefined;

        const scores = isTrader ? (await this.getTraderScores(
            seasonStart,
            seasonEnd,
            subgraphUrl,
            coingeckoKey
        )) : (await this.getLPScores(
            seasonStart,
            seasonEnd,
            subgraphUrl,
            coingeckoKey
        ));

        const rankResult: {address: string; points: number}[] = [];
        const keys = Array.from(scores.keys());
        keys.forEach((address) => {
            const value = scores.get(address);
            rankResult.push({ address: address, points: value ?? 0 });
        });

        const sorted = rankResult.sort((a, b) => b.points - a.points);

        if (sorted) {
            for (let rank = 0; rank < 5; rank++) {
                const entry = sorted[rank];
                if (entry.address === userId) {
                    const badge = await this.constructTopBadge(
                        userId,
                        seasonId,
                        seasonEnd,
                        badgeType,
                        badgesSubgraphUrl
                    );
                    return badge;
                }
            }
        }

        return undefined;
    }

    /**
   * @dev Query the Badges subgraph to assess if the top 
   * badge was claimed. Create a Badge Response with
   * the awarded time as end of season and claimed time 
   * as eithr zero if not claimed or subgrap's minted timestamp
   */
    async constructTopBadge(
        userId: string,
        seasonId: number,
        seasonEnd: number,
        badgeType: string,
        badgesSubgraphUrl: string
    ) : Promise<BadgeResponse> {
        const badgeQuery = `
            query( $id: String) {
                badge(id: $id){
                    id
                    mintedTimestamp
                }
            }
        `;
        const client = new ApolloClient({
            cache: new InMemoryCache(),
            link: new HttpLink({ uri: badgesSubgraphUrl, fetch })
        })
      
        const idBadge = `${userId.toLowerCase()}#${badgeType}#${seasonId}`;
        const badgeData = await client.query<{
            badge: SubgraphBadgeResponse;
        }>({
            query: gql(badgeQuery),
            variables: {
                id: idBadge,
            },
        });
        const badge : BadgeResponse = {
            id: `${userId}#${seasonId}#${badgeType}`,
            badgeType: badgeType,
            awardedTimestampMs: toMillis(seasonEnd),
            mintedTimestampMs: toMillis(parseInt(badgeData?.data?.badge ? badgeData.data.badge.mintedTimestamp : "0")),
        }
        return badge;
    }

    /**
   * @dev Query the Main subgraph and retrieve season's trading
   * scores of all users based on time weighted notional.
   */
    async getTraderScores(
        seasonStart: number,
        seasonEnd: number,
        subgraphUrl: string,
        coingeckoKey: string
    ): Promise<Map<string, number>> {
        const activityQuery = `
            query( $skipCount: Int) {
                wallets(first: 1000, skip: $skip) {
                    id
                    positions {
                        amm {
                            termEndTimestamp
                            rateOracle {
                                token {
                                    name
                                    decimals
                                }
                            }
                        }
                        swaps {
                            transaction {
                                createdTimestamp
                            }
                            cumulativeFeeIncurred
                            variableTokenDelta
                        }
                }
                }
            }
          `
      
        const ethPrice = await geckoEthToUsd(coingeckoKey);

        const client = new ApolloClient({
            cache: new InMemoryCache(),
            link: new HttpLink({ uri: subgraphUrl, fetch })
        })
      
        const scores: Map<string, number> = new Map<string, number>();
      
        let skip = 0;
        while (true) {
            const data = await client.query({
                query: gql(activityQuery),
                variables: {
                    skipCount: skip,
                },
            });
          skip += 1000;
      
          for (const wallet of data.data.wallets) {
            let score = 0;
      
            for (const position of wallet.positions) {
              const token = position.amm.rateOracle.token.name;
              const decimals: number = position.amm.rateOracle.token.decimals;
      
              const termEnd = Number(
                ethers.utils.formatUnits(position.amm.termEndTimestamp.toString(), 18),
              );
      
              for (const swap of position.swaps) {
                const swapTime: number = swap.transaction.createdTimestamp;
                const swapNotional = Number(
                  ethers.utils.formatUnits(swap.variableTokenDelta.toString(), decimals),
                );
      
                if (seasonStart < swapTime && swapTime <= seasonEnd) {
                  const timeWeightedNotional =
                    (Math.abs(swapNotional) * (termEnd - swapTime)) / ONE_YEAR_IN_SECONDS;
                  switch (token) {
                    case 'ETH': {
                      score += timeWeightedNotional * ethPrice;
                      break;
                    }
                    default: {
                      score += timeWeightedNotional;
                    }
                  }
                }
              }
            }
      
            if (score > 0) {
              scores.set(wallet.id as string, score);
            }
          }
      
          if (data.data.wallets.length < 1000) {
            break;
          }
        }
        return scores;
    }

    /**
   * @dev Query the Main subgraph and retrieve season's liquidity
   * score of all users based on time weighted liquidity.
   * Score is based on both mints and swaps.
   */
    async getLPScores(
        seasonStart: number,
        seasonEnd: number,
        subgraphUrl: string,
        coingeckoKey: string
    ): Promise<Map<string, number>> {
        const activityQuery = `
            query( $skipCount: Int) {
                wallets(first: 1000, skip: $skipCount) {
                    id
                    positions {
                        amm {
                            termEndTimestamp
                            rateOracle {
                                token {
                                    name
                                    decimals
                                }
                            }
                        }
                        mints {
                            transaction {
                                createdTimestamp
                            }
                            amount
                        }
                        burns {
                            transaction {
                                createdTimestamp
                            }
                            amount
                        }
                    }
                }
            }
          `
      
        const ethPrice = await geckoEthToUsd(coingeckoKey);

        const client = new ApolloClient({
            cache: new InMemoryCache(),
            link: new HttpLink({ uri: subgraphUrl, fetch })
        })
      
        const scores: Map<string, number> = new Map<string, number>();
      
        let skip = 0;
        while (true) {
            const data = await client.query({
                query: gql(activityQuery),
                variables: {
                    skipCount: skip,
                },
            });
          skip += 1000;
      
          for (const wallet of  data.data.wallets) {
            let score = 0;
      
            for (const position of wallet.positions) {
              const token = position.amm.rateOracle.token.name;
              const decimals: number = position.amm.rateOracle.token.decimals;
      
              const termEnd = Number(
                ethers.utils.formatUnits(position.amm.termEndTimestamp.toString(), 18),
              );
      
              for (const mints of position.mints) {
                const mintTime: number = mints.transaction.createdTimestamp;
                const mintNotional = Number(
                  ethers.utils.formatUnits(mints.amount.toString(), decimals),
                );
      
                if (seasonStart < mintTime && mintTime <= seasonEnd) {
                  const timeWeightedNotional =
                    (Math.abs(mintNotional) * (termEnd - mintTime)) / ONE_YEAR_IN_SECONDS;
                  switch (token) {
                    case 'ETH': {
                      score += timeWeightedNotional * ethPrice;
                      break;
                    }
                    default: {
                      score += timeWeightedNotional;
                    }
                  }
                }
              }
              for (const burns of position.burns) {
                const burnTime: number = burns.transaction.createdTimestamp;
                const burnNotional = Number(
                  ethers.utils.formatUnits(burns.amount.toString(), decimals),
                );
      
                if (seasonStart < burnTime && burnTime <= seasonEnd) {
                  const timeWeightedNotional =
                    (Math.abs(burnNotional) * (termEnd - burnTime)) / ONE_YEAR_IN_SECONDS;
                  switch (token) {
                    case 'ETH': {
                      score -= timeWeightedNotional * ethPrice;
                      break;
                    }
                    default: {
                      score -= timeWeightedNotional;
                    }
                  }
                }
              }
            }
      
            if (score > 0) {
              scores.set(wallet.id as string, score);
            }
          }
      
          if (data.data.wallets.length < 1000) {
            break;
          }
        }
        return scores;
    }

    public async getNonProgramaticBadges(userId: string, nonProgramaticBadgesUrl: string) : Promise<Record<string, BadgeResponse>> {
        let badgeResponseRecord : Record<string, BadgeResponse> = {};

        const resp = await axios.get(`${nonProgramaticBadgesUrl}/get-badges/${userId}`);
        if (!resp.data){
            return badgeResponseRecord;
        }

        const badges: NonProgramaticBadgeResponse[] = resp.data.badges;
        badges.forEach((entry) => {
            const badgeType = NON_PROGRAMATIC_BADGES_VARIANT[entry.badge];
            
            if(badgeType) {
                badgeResponseRecord[badgeType] = {
                    id: `${userId}#${badgeType}#1`,
                    badgeType: badgeType,
                    awardedTimestampMs: toMillis(entry.awardedTimestamp),
                    mintedTimestampMs: toMillis(entry.mintedTimestamp),
                } as BadgeResponse;
            }
        });
        return badgeResponseRecord;
    }

    public async getReferrorBadges(userId: string, referroorBadgesUrl: string, subgraphUrl: string, seasonId: number) : Promise<Record<string, BadgeResponse>> {
        let badgeResponseRecord : Record<string, BadgeResponse> = {};

        const resp = await axios.get(`${referroorBadgesUrl}/referrals-by/${userId.toLowerCase()}`);
        if (!resp.data){
            return badgeResponseRecord;
        }

        const referees: string[] = resp.data;
        let refereesWith100kNotionalTraded = 0;
        let refereesWith2mNotionalTraded = 0;
        for (const referee of referees){
            const badgeQuery = `
                query( $id: String) {
                    seasonUsers( where: {owner_contains: $id}) {
                        id
                        totalWeightedNotionalTraded
                      
                    }
                }
            `;
            const client = new ApolloClient({
                cache: new InMemoryCache(),
                link: new HttpLink({ uri: subgraphUrl, fetch })
            })
            const id = `${referee.toLowerCase()}`
            const data = await client.query<{
                seasonUsers: {
                    totalWeightedNotionalTraded: string
                }[]
            }>({
                query: gql(badgeQuery),
                variables: {
                    id: id,
                },
            });

            if(!data?.data?.seasonUsers){
                continue;
            }

            let totalPointz = 0;
            data.data.seasonUsers.forEach((user) => {
                totalPointz = totalPointz + parseFloat(user.totalWeightedNotionalTraded);
            });
            if(totalPointz >= get100KRefereeBenchmark(subgraphUrl)) {
                refereesWith100kNotionalTraded++;
                if(totalPointz >= get2MRefereeBenchmark(subgraphUrl)){
                    refereesWith2mNotionalTraded++;
                }
            }
        };

        if (refereesWith100kNotionalTraded > 0) {
            let badgeType = '36'; //referror
            badgeResponseRecord[badgeType] = this.createReferroorBadgeRecord(badgeType, userId, seasonId);
            if (refereesWith100kNotionalTraded >= 10) {
                badgeType = '37'; // Notional Influence
                badgeResponseRecord[badgeType] = this.createReferroorBadgeRecord(badgeType, userId, seasonId);
            }
        }
        if (refereesWith2mNotionalTraded > 0) {
            const badgeType = '38'; //whaleWhisperer
            badgeResponseRecord[badgeType] = this.createReferroorBadgeRecord(badgeType, userId, seasonId);
        }
        return badgeResponseRecord;
    }

    createReferroorBadgeRecord(badgeType: string, userId: string, seasonId: number) : BadgeResponse {
        return {
            id: `${userId}#${badgeType}#${seasonId}`,
            badgeType: badgeType,
            awardedTimestampMs: toMillis(DateTime.now().toSeconds()),
            mintedTimestampMs: undefined,
        } as BadgeResponse;
    }

    public async getUserBalance(user: string) : Promise<BigNumber | void> {
        const balance = await this.contract?.balanceOf(user);
        return balance;
    }

    public async getTokenOwner(tokenId: string) : Promise<string | void> {
        const owner = await this.contract?.ownerOf(tokenId);
        return owner;
    }

    public async getTotalSupply() : Promise<BigNumber | void> {
        const totalSupply = await this.contract?.totalSupply();
        return totalSupply;
    }

    public async getBadgeStatus(args: GetBadgesStatusArgs) : Promise<Array<BadgeWithStatus>> {
        if (!this.signer) { 
            throw new Error("No provider found")
        }
        const userAddress = await this.signer.getAddress();
        const network = await this.provider?.getNetwork();
        const networkName = network ? network.name : "";

        const getURL = getEtherscanURL(networkName, args.apiKey, userAddress);
        const resp = await axios.get(getURL);

        if (!resp.data) {
            throw new Error("Etherscan api failed")
        }
        const transactions = resp.data.result;

        // get last 50 transactions, match is redeem and set SUCC/FAILED status
        let txBadges = new Map<number, TxBadgeStatus>();
        for (const transaction of transactions) {
            if (transaction.to.toLowerCase() !== this.contract?.address.toLowerCase()) { 
                continue;
            }
            const status = transaction.txreceipt_status === 1 ? 
                TxBadgeStatus.SUCCESSFUL
                : TxBadgeStatus.FAILED;
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
        const subgraphClaimedBadges = await this.claimedBadgesInSubgraph(args.subgraphUrl, userAddress, args.season);

        // final claiming status verdict
        const badgeStatuses = subgraphClaimedBadges.map((badge) => {
            if(badge.claimingStatus === BadgeClaimingStatus.CLAIMED){
                return badge;
            }
            const txStatus = txBadges.get(badge.badgeType);

            // badge not found in recent successful txs or in potential pending txs
            // meaning their status is desided by the subgraph
            if (!txStatus || txStatus === TxBadgeStatus.FAILED) { 
                return {
                    badgeType: badge.badgeType, 
                    claimingStatus: badge.claimingStatus
                }
            } else { // subgraph is not updated yet
                return {
                    badgeType: badge.badgeType, 
                    claimingStatus: BadgeClaimingStatus.CLAIMING
                }
            }
        })

        return badgeStatuses;
        
    }

    async claimedBadgesInSubgraph(subgraphUrl: string, userAddress: string, season: number): Promise<Array<BadgeWithStatus>> {
        const badgeQuery = `
            query( $id: String) {
                badges(first: 50, where: {seasonUser_contains: $id}) {
                    id
                    badgeType
                    awardedTimestamp
                    mintedTimestamp
                }
            }
        `;
        const client = new ApolloClient({
            cache: new InMemoryCache(),
            link: new HttpLink({ uri: subgraphUrl, fetch })
        })
        const id = `${userAddress.toLowerCase()}#${season}`
        const data = await client.query<{
            badges: SubgraphBadgeResponse[]
        }>({
            query: gql(badgeQuery),
            variables: {
                id: id,
            },
        });

        let badgesClaimed = new Array<BadgeWithStatus>();
        for (const badge of data.data.badges) {
            badgesClaimed.push({
                badgeType: parseInt(badge.badgeType, 10),
                claimingStatus: parseInt(badge.mintedTimestamp, 10) === 0 ?
                    BadgeClaimingStatus.NOT_CLAIMED 
                    : BadgeClaimingStatus.CLAIMED // only from subgraph's perspective
            });
        }

        return badgesClaimed;
    }

}

export default SBT;