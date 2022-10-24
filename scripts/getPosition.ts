/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumber } from 'ethers';
import { gql, GraphQLClient } from 'graphql-request';
import { isUndefined } from 'lodash';
import AMM from './entities/AMM/amm';
import { Position } from '../src/entities/Position/position';
import { burnMap, liquidationMap, marginUpdateMap, mintMap, settlementMap, swapMap } from './utils';

const getPositionQuery = (positionId: string) => {
  return `{
        positions(where: {id: "${positionId}"}) {
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

export const getPosition = async ({
  amm,
  userAddress,
  tickLower,
  tickUpper,
}: {
  amm: AMM;
  userAddress: string;
  tickLower: number;
  tickUpper: number;
}): Promise<Position> => {
  const positionId = `${amm.marginEngineAddress.toLowerCase()}#${userAddress.toLowerCase()}#${tickLower.toString()}#${tickUpper.toString()}`;
  const queryString = getPositionQuery(positionId);

  const endpoint = process.env.REACT_APP_SUBGRAPH_URL;
  if (isUndefined(endpoint)) {
    throw new Error('You must set the Graph URL in the env file');
  }

  const graphQLClient = new GraphQLClient(endpoint);
  const data = await graphQLClient.request(
    gql`
      ${queryString}
    `,
  );

  if (data.positions.length === 0) {
    throw new Error(`No position found with ID ${positionId}.`);
  }

  const info = data.positions[0];

  const position = new Position({
    id: info.id,
    amm,
    timestamp: parseInt(info.createdTimestamp, 10),

    owner: userAddress,
    tickLower,
    tickUpper,
    positionType: parseInt(info.positionType, 10),

    liquidity: BigNumber.from(info.liquidity),
    accumulatedFees: BigNumber.from(info.accumulatedFees),

    fixedTokenBalance: BigNumber.from(info.fixedTokenBalance),
    variableTokenBalance: BigNumber.from(info.variableTokenBalance),
    margin: BigNumber.from(info.margin),

    isSettled: info.isSettled,

    mints: info.mints.map((item: any) => mintMap({ item, amm, positionId, tickLower, tickUpper })),
    burns: info.burns.map((item: any) => burnMap({ item, amm, positionId, tickLower, tickUpper })),
    swaps: info.swaps.map((item: any) => swapMap({ item, amm, positionId })),
    marginUpdates: info.marginUpdates.map((item: any) =>
      marginUpdateMap({ item, amm, positionId }),
    ),
    liquidations: info.liquidations.map((item: any) => liquidationMap({ item, amm, positionId })),
    settlements: info.settlements.map((item: any) => settlementMap({ item, amm, positionId })),
  });

  await position.init();
  return position;
};
