import { BigNumber, Signer } from 'ethers';
import { CommunitySBT, CommunitySBT__factory } from '../typechain-sbt';
import { createLeaves } from '../utils/communitySbt/getSubgraphLeaves';
import { getRoot } from '../utils/communitySbt/getSubgraphRoot';
import { getProof } from '../utils/communitySbt/merkle-tree';

export type SBTConstructorArgs = {
    id: string;
    signer: Signer| null;
};

class SBT {

  public readonly id: string;
  public readonly signer: Signer | null;
  public contract: CommunitySBT | null;

  public constructor({ id, signer }: SBTConstructorArgs) {
    this.id = id;
    this.signer = signer;
    if (signer) {
        this.contract = CommunitySBT__factory.connect(id, signer);
    } else {
        this.contract = null;
    }
  }

  public async redeemToken(
    badgeType: number,
    owner: string,
    awardedTimestamp: number,
    subgraphAPI: string
  ): Promise<BigNumber | void> {
    if (!this.contract) {
        throw new Error('Wallet not connected');
    }
    const rootEntity = await getRoot(awardedTimestamp, subgraphAPI);
    const metadataUri = rootEntity.baseMetadataUri + badgeType + '.json';

    const startTimestamp = rootEntity.startTimestamp;
    const endTimestamp = rootEntity.endTimestamp;

    const leafInfo = {
        account: owner,
        metadataURI: metadataUri
    }

    try {
        const leaves = await createLeaves(startTimestamp, endTimestamp, rootEntity.baseMetadataUri, subgraphAPI);
        const proof = getProof(owner, badgeType, metadataUri, leaves);
        const tokenId = await this.contract.callStatic.redeem(leafInfo, proof, rootEntity.merkleRoot);

        if(tokenId) {
           const tx = await this.contract.redeem(leafInfo, proof, rootEntity.merkleRoot);
            await tx.wait();
            return tokenId;
        }
    } catch (err) {
        throw new Error("Unable to claim");
    }

  }
}

export default SBT;