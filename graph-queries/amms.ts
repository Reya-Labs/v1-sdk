import { GraphQLClient, gql } from 'graphql-request';
import { isUndefined } from 'lodash';
import * as dotenv from 'dotenv';

dotenv.config();

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

export const getGraphAMMs = async (cond?: string): Promise<GetGraphAMMsResponse> => {
  const endpoint = process.env.REACT_APP_SUBGRAPH_URL;
  if (isUndefined(endpoint)) {
    throw new Error('You must set the Graph URL in the env file');
  }

  const query = getAMMsQuery(cond);
  const graphQLClient = new GraphQLClient(endpoint);
  const data = await graphQLClient.request(
    gql`
      ${query}
    `,
  );

  return data;
};
