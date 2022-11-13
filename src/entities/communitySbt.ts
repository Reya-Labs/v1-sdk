import { BigNumber, Bytes, ethers, providers, Signer } from 'ethers';
import { CommunitySBT, CommunitySBT__factory } from '../typechain-sbt';
import { createLeaves } from '../utils/communitySbt/getSubgraphLeaves';
import { getRoot } from '../utils/communitySbt/getSubgraphRoot';
import { getProof } from '../utils/communitySbt/merkle-tree';
import  axios from 'axios';
import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client'
import fetch from 'cross-fetch';

export type SBTConstructorArgs = {
    id: string;
    signer: Signer| null;
};

export type BadgeRecord = {
    badgeType: number;
    awardedTimestamp: number;
};

type LeafInfo = {
    account: string;
    metadataURI: string;
}

type MultiRedeemData = {
    leaves: Array<LeafInfo>;
    proofs: Array<string[]>;
    roots: Array<Bytes>;
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
    badgeType: number,
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
        const rootEntity = await getRoot(awardedTimestamp, subgraphAPI);
        if(!rootEntity) {
            throw new Error('No root found')
        }
        const metadataUri = `ipfs:${String.fromCharCode(47)}${String.fromCharCode(47)}${rootEntity.baseMetadataUri}${String.fromCharCode(47)}${badgeType}.json`;
        const leafInfo = {
            account: owner,
            metadataURI: metadataUri
        }

        const startTimestamp = rootEntity.startTimestamp;
        const endTimestamp = rootEntity.endTimestamp;

        const leaves = await createLeaves(startTimestamp, endTimestamp, rootEntity.baseMetadataUri, subgraphAPI);
        const proof = getProof(owner, badgeType, metadataUri, leaves);


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
            const rootEntity = await getRoot(badge.awardedTimestamp, subgraphAPI);
            if(!rootEntity) {
                continue;
            }
            const metadataUri = `ipfs:${String.fromCharCode(47)}${String.fromCharCode(47)}${rootEntity.baseMetadataUri}${String.fromCharCode(47)}${badge.badgeType}.json`;
            const leafInfo: LeafInfo = {
                account: owner,
                metadataURI: metadataUri
            }
            const startTimestamp = rootEntity.startTimestamp;
            const endTimestamp = rootEntity.endTimestamp;

            const leaves = await createLeaves(startTimestamp, endTimestamp, rootEntity.baseMetadataUri, subgraphAPI);
            const proof = getProof(owner, badge.badgeType, metadataUri, leaves);

            data.leaves.push(leafInfo);
            data.proofs.push(proof);
            data.roots.push(rootEntity.merkleRoot)
            claimedBadgeTypes.push(badge.badgeType);
        }

        try {
            await this.contract.callStatic.multiRedeem(data.leaves, data.proofs, data.roots);
            const tx = await this.contract.multiRedeem(data.leaves, data.proofs, data.roots);
            await tx.wait()
            return {
                claimedBadgeTypes
            }
        } catch (err) {
            throw new Error("Unable to claim multiple badges");
        }
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

    public async getBadgeStatus(apiKey: string, subgraphUrl: string, contractAddress: string, season: number) : Promise<Array<number>| void> {
        if (this.signer) {
            const userAddress = await this.signer.getAddress();
            const network = await this.provider?.getNetwork();
            const networkName = network ? network.name : "";

            const getURL = this.getEtherscanURL(networkName, apiKey, userAddress);
            const resp = await axios.get(getURL);

            const multiRedeemId = this.getMethodId(true, networkName);
            const redeemId = this.getMethodId(false, networkName);

            if (!resp.data) {
                throw new Error("Etherscan api failed")
            }
            const transactions = resp.data.result;
            let claimingBadges = new Array<number>();

            for (const transaction of transactions) {
                // it is a redeem transaction
                if (transaction.methodId === redeemId && transaction.to.toLowerCase() === contractAddress.toLowerCase()) {
                    const badgeType = this.decodeBadgeType(transaction.input);
                    if (transaction.txreceipt_status === 1) { // transaction successful
                        console.log(3, transaction.methodId)
                        const isClaimed = await this.isClamedInSubgraph(subgraphUrl, `${userAddress.toLowerCase()}#${badgeType}#${season}`);
                        if(!isClaimed) {
                            claimingBadges.push(badgeType);
                        }
                    }
                } // it is a multiRedeem transaction TODO: findMethod id for multiredeem
                else if (transaction.methodId === multiRedeemId && transaction.to.toLowerCase() === contractAddress.toLowerCase()) {
                    const badgeTypes = this.decodeMultipleBadgeTypes(transaction.input);
                    if (transaction.txreceipt_status === 1) { // transaction successful
                        for (const badgeType of badgeTypes) {
                            const isClaimed = await this.isClamedInSubgraph(subgraphUrl, `${userAddress.toLowerCase()}#${badgeType}#${season}`);
                            if(!isClaimed) {
                                claimingBadges.push(badgeType);
                            }
                        }
                    }
                }
            }
            return claimingBadges;
        } else {
            throw new Error("No provider found")
        }
        
    }

    public decodeBadgeType(input: Bytes): number {
        const inter = new ethers.utils.Interface(CommunitySBT__factory.abi);
        const decoded = inter.decodeFunctionData("redeem", input);
        console.log(decoded[0])
        const metadataURI = decoded[0].metadataURI;
        const filenamme = metadataURI.split('/')[3];
        const badgeType = parseInt(filenamme.split('.')[0]);

        return badgeType;
    }

    public decodeMultipleBadgeTypes(input: Bytes): number[] {
        let badgeTypes = new Array<number>;
        const inter = new ethers.utils.Interface(CommunitySBT__factory.abi);
        const decoded = inter.decodeFunctionData("multiRedeem", input);
        for (const leafInfo of decoded[0]) {
            console.log(leafInfo);
            const metadataURI = leafInfo.metadataURI;
            const filenamme = metadataURI.split('/')[3];
            badgeTypes.push(parseInt(filenamme.split('.')[0]));
        }
        return badgeTypes;
    }

    async isClamedInSubgraph(subgraphUrl: string, id: string): Promise<boolean> {
        const badgeQuery = `
            query( $id: BigInt,) {
                badge(id: $id) {
                    id
                    badgeType
                    badgeName
                    awardedTimestamp
                    mintedTimestamp
                }
            }
            `;
        const client = new ApolloClient({
            cache: new InMemoryCache(),
            link: new HttpLink({ uri: subgraphUrl, fetch })
        })
        const data = await client.query({
            query: gql(badgeQuery),
            variables: {
                id: id,
            },
        });

        if(data.data.badge.mintedTimestamp != 0) {
            return true;
        }
        return false;
        
    }

    public getMethodId(isMultiRedeem: boolean, network: string): string {
        switch (network) {
            case "goerli":
                return isMultiRedeem ? "0xbdb05092" : "0xbdb05092";
            case "mainnet":
                return isMultiRedeem ? "0x79a4aaa3" : "0x79a4aaa3";
            default:
                return "";
        }
    }

    public getEtherscanURL(network: string, apiKey: string, userAddress: string): string {
        switch (network) {
            case "goerli":
                return `https://api-goerli.etherscan.io/api?module=account&action=txlist&address=${userAddress}&page=1&offset=50&sort=desc&apikey=${apiKey}`
            case "mainnet":
                return `https://api-goerli.etherscan.io/api?module=account&action=txlist&address=${userAddress}&page=1&offset=50&sort=desc&apikey=${apiKey}`
            default:
                return "";
        }
    }

}

export default SBT;