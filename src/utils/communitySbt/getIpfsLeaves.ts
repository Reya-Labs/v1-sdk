import axios from 'axios';
import { LeafInfo } from '../../entities/communitySbt';
import { geLeavesIpfsUri } from './helpers';

export async function createLeaves(
    network: string,
    seasonId: number,
): Promise<Array<LeafInfo>> {

    const data = await axios.get(geLeavesIpfsUri(network, seasonId));

    const snaphots : Array<{
            owner: string
            badgeType: number,
            metadataURI: string
        }> = data.data.snapshot;

    let subgraphSnapshots: Array<LeafInfo> = [];

    for (const entry of snaphots) {
        const snpashotEntry = {
            account: entry.owner,
            badgeId: entry.badgeType
        }
        subgraphSnapshots.push(snpashotEntry);
    }

    return subgraphSnapshots;

}