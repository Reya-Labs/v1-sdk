import axios from 'axios';
import { LeafInfo } from '../../entities/communitySbt';
import { geLeavesIpfsUri } from './helpers';

export async function createLeaves(
    seasonId: number,
    leavesCids: Record<number, string>
): Promise<Array<LeafInfo>> {

    const data = await axios.get(geLeavesIpfsUri(seasonId, leavesCids));

    const snaphots : Array<{
            owner: string
            badgeType: number,
            metadataURI: string
        }> = data.data.snapshot;

    const subgraphSnapshots : Array<LeafInfo> = snaphots.map((entry) => {
        return {
            account: entry.owner,
            badgeId: entry.badgeType
        }
    })

    return subgraphSnapshots;

}