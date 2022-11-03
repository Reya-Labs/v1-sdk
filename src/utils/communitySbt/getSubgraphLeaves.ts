import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client'
import fetch from 'cross-fetch';
import * as fs from 'fs';

const tokensQuery = `
  query($seasonStart: BigInt, $seasonEnd: BigInt) {
    badges(where: {awardedTimestamp_gte: $seasonStart, awardedTimestamp_lt: $seasonEnd}) {
        id
        badgeType
        badgeName
        awardedTimestamp
        mintedTimestamp
    }
  }
`

export type LeafEntry = {
    owner: string,
    metadataURI: string
}

 export async function createLeaves(
    seasonStart: number,
    seasonEnd: number,
    baseMetadataUri: string,
    subgraphUrl: string) : Promise<Array<LeafEntry>> {

    const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: new HttpLink({ uri: subgraphUrl, fetch })
    })

    const data = await client
      .query({
        query: gql(tokensQuery),
        variables: {
            seasonStart: seasonStart.toString(), // season/period start timmestamp
            seasonEnd: seasonEnd.toString()
        },
      });

    let snapshot: Array<LeafEntry> = [];

    for(const entry of data.data.badges) {
        const badgeType = parseInt(entry.badgeType);

        const props = entry.id.split("#");
        const address = props[0];

        const metadataURI = baseMetadataUri + badgeType.toString() + ".json" 

        const snpashotEntry: LeafEntry = {
          owner: address,
          metadataURI: metadataURI
        }
        snapshot.push(snpashotEntry);
    }

    return snapshot;

}