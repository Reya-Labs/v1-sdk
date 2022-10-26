import { GraphQLClient, gql } from 'graphql-request';
import { isUndefined } from 'lodash';

const getPositionsQuery = (cond: string): string => {
  return `{
          positions(${cond}) {
            id
            createdTimestamp
      
            owner {
              id
            }
            tickLower
            tickUpper
      
            liquidity
            margin
            fixedTokenBalance
            variableTokenBalance
            accumulatedFees
      
            positionType
            isSettled
            
            mints {
              id
              sender
              transaction {
                id
                createdTimestamp
              }
              amount
            }
            burns {
              id 
              sender
              transaction {
                id
                createdTimestamp
              }
              amount
            }
            swaps {
              id 
              sender
              transaction {
                id
                createdTimestamp
              }
              desiredNotional
              sqrtPriceLimitX96
              cumulativeFeeIncurred
              fixedTokenDelta
              variableTokenDelta
              fixedTokenDeltaUnbalanced
            }
            marginUpdates {
              id 
              transaction {
                id
                createdTimestamp
              }
              depositer
              marginDelta
            }
            liquidations {
              id
              transaction {
                id
                createdTimestamp
              }
              liquidator
              reward
              notionalUnwound
            }
            settlements {
              id 
              transaction {
                id
                createdTimestamp
              }
              settlementCashflow
            }
          }
        }
      `;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getGraphPositions = async (cond: string): Promise<any> => {
  const endpoint = process.env.REACT_APP_SUBGRAPH_URL;
  if (isUndefined(endpoint)) {
    throw new Error('You must set the Graph URL in the env file');
  }

  const query = getPositionsQuery(cond);
  const graphQLClient = new GraphQLClient(endpoint);
  const data = await graphQLClient.request(
    gql`
      ${query}
    `,
  );

  return data;
};
