import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';
import fetch from 'cross-fetch';
import { Bytes } from 'ethers';

const rootsQuery = `
  query($timestamp: BigInt) {
    roots(where: {startTimestamp_lte: $timestamp, endTimestamp_gt: $timestamp}) {
        id
        root
        startTimestamp
        endTimestamp
        metadataURIBase
    }
  }
`;

export type RootEntity = {
  merkleRoot: Bytes;
  baseMetadataUri: string;
  startTimestamp: number;
  endTimestamp: number;
};

export async function getRoot(timestamp: number, subgraphUrl: string): Promise<RootEntity> {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({ uri: subgraphUrl, fetch }),
  });

  const data = await client.query({
    query: gql(rootsQuery),
    variables: {
      timestamp: timestamp.toString(),
    },
  });

  const rootEntity = data.data.roots[0];

  const response: RootEntity = {
    merkleRoot: rootEntity.root,
    baseMetadataUri: rootEntity.metadataURIBase,
    startTimestamp: rootEntity.startTimestamp,
    endTimestamp: rootEntity.endTimestamp,
  };

  return response;
}
