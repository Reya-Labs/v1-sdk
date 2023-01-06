import { getRoots } from '@voltz-protocol/subgraph-data';
import { Bytes } from 'ethers';

export type RootEntity = {
  merkleRoot: Bytes;
  baseMetadataUri: string;
  startTimestamp: number;
  endTimestamp: number;
};

export async function getRootFromSubgraph(
  timestamp: number,
  subgraphUrl: string,
): Promise<RootEntity | undefined> {
  const roots = await getRoots(subgraphUrl);
  const timestampInMS = timestamp * 1000;
  const seasonRoots = roots.filter(
    (root) => root.startTimestampInMS <= timestampInMS && timestampInMS <= root.endTimestampInMS,
  );

  if (seasonRoots.length === 0) {
    return undefined;
  }

  // TODO: add support for multiple roots, [0] is not enough
  const rootEntity = seasonRoots[0];

  return {
    merkleRoot: rootEntity.root,
    baseMetadataUri: rootEntity.metadataURIBase,
    startTimestamp: rootEntity.startTimestampInMS / 1000,
    endTimestamp: rootEntity.endTimestampInMS / 1000,
  };
}
