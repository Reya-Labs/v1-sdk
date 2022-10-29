import { GraphQLClient, gql } from 'graphql-request';
import { isUndefined } from 'lodash';

const getPositionsQuery = (cond?: string): string => {
  return `{
    positions${isUndefined(cond) ? `` : `(${cond})`} {
      id
      createdTimestamp

      amm {
        id
      }
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

export type MintGraphResponse = {
  id: string;
  sender: string;
  transaction: {
    id: string;
    createdTimestamp: string;
  };
  amount: string;
};

export type BurnGraphResponse = {
  id: string;
  sender: string;
  transaction: {
    id: string;
    createdTimestamp: string;
  };
  amount: string;
};

export type SwapGraphResponse = {
  id: string;
  sender: string;
  transaction: {
    id: string;
    createdTimestamp: string;
  };
  desiredNotional: string;
  sqrtPriceLimitX96: string;
  cumulativeFeeIncurred: string;
  fixedTokenDelta: string;
  variableTokenDelta: string;
  fixedTokenDeltaUnbalanced: string;
};

export type MarginUpdateGraphResponse = {
  id: string;
  transaction: {
    id: string;
    createdTimestamp: string;
  };
  depositer: string;
  marginDelta: string;
};

export type LiquidationGraphResponse = {
  id: string;
  transaction: {
    id: string;
    createdTimestamp: string;
  };
  liquidator: string;
  reward: string;
  notionalUnwound: string;
};

export type SettlementGraphResponse = {
  id: string;
  transaction: {
    id: string;
    createdTimestamp: string;
  };
  settlementCashflow: string;
};

export type GetGraphPositionsResponse = {
  positions: {
    id: string;
    createdTimestamp: string;
    owner: {
      id: string;
    };
    amm: {
      id: string;
    };
    tickLower: string;
    tickUpper: string;
    liquidity: string;
    margin: string;
    fixedTokenBalance: string;
    variableTokenBalance: string;
    accumulatedFees: string;
    positionType: string;
    isSettled: boolean;
    mints: MintGraphResponse[];
    burns: BurnGraphResponse[];
    swaps: SwapGraphResponse[];
    marginUpdates: MarginUpdateGraphResponse[];
    liquidations: LiquidationGraphResponse[];
    settlements: SettlementGraphResponse[];
  }[];
};

export const getGraphPositions = async ({
  graphEndpoint,
  cond,
}: {
  graphEndpoint: string;
  cond?: string;
}): Promise<GetGraphPositionsResponse> => {
  if (isUndefined(graphEndpoint)) {
    throw new Error('You must set the Graph URL in the env file');
  }

  const query = getPositionsQuery(cond);
  const graphQLClient = new GraphQLClient(graphEndpoint);
  const data = await graphQLClient.request(
    gql`
      ${query}
    `,
  );

  return data;
};
