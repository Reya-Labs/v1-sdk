import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';
import { getServiceUrl } from '../urls';
import { GetPortfolioPositionsResponse } from './types';

export const getPortfolioPositions = async (
  chainIds: SupportedChainId[],
  ownerAddress: string,
): Promise<GetPortfolioPositionsResponse> => {
  try {
    const baseUrl = getServiceUrl('portfolio-positions');
    const url = `${baseUrl}/${chainIds.join('&')}/${ownerAddress.toLowerCase()}`;

    const res = await axios.get<GetPortfolioPositionsResponse>(url, {
      withCredentials: false,
    });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud Portfolio Positions API unavailable with message ${(e as Error).message}`,
    );

    return {
      positions: [],
      summary: {
        portfolioValueUSD: 0,
        marginUSD: 0,
        unrealizedPNLUSD: 0,
        realizedPNLUSD: 0,
        notionalUSD: 0,

        numberOfPositions: 0,
        healthyPositions: 0,
        warningPositions: 0,
        dangerPositions: 0,
      },
    };
  }
};
