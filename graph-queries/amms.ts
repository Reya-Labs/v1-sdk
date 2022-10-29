import { GraphQLClient, gql } from 'graphql-request';
import { isUndefined } from 'lodash';

const getAMMsQuery = (cond?: string): string => {
  return `{
    amms${isUndefined(cond) ? `` : `(${cond})`} {
      id
      marginEngine {
        id
      }
      rateOracle {
        id
        protocolId
        token {
          id
        }
      }
  
      tickSpacing
      termStartTimestamp
      termEndTimestamp

      tick
    }
    }
  `;
};

export type GetGraphAMMsResponse = {
  amms: {
    id: string;
    marginEngine: {
      id: string;
    };
    rateOracle: {
      id: string;
      protocolId: string;
      token: {
        id: string;
      };
    };
    tickSpacing: string;
    termStartTimestamp: string;
    termEndTimestamp: string;
    tick: string;
  }[];
};

export const getGraphAMMs = async ({
  graphEndpoint,
  cond,
}: {
  graphEndpoint: string;
  cond?: string;
}): Promise<GetGraphAMMsResponse> => {
  if (isUndefined(graphEndpoint)) {
    throw new Error('You must set the Graph URL in the env file');
  }

  const query = getAMMsQuery(cond);
  const graphQLClient = new GraphQLClient(graphEndpoint);
  const data = await graphQLClient.request(
    gql`
      ${query}
    `,
  );

  return data;
};
