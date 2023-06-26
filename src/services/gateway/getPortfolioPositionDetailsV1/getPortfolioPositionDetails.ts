import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { getServiceUrl } from '../urls';
import { PortfolioPositionDetails } from './types';

type GetPortfolioPositionDetailsParams = {
  positionId: string;
  includeHistory: boolean;
};
export const getPortfolioPositionDetails = async ({
  positionId,
  includeHistory,
}: GetPortfolioPositionDetailsParams): Promise<PortfolioPositionDetails | null> => {
  try {
    const baseUrl = getServiceUrl('portfolio-position-details');
    const url = `${baseUrl}/${positionId.toLowerCase()}${
      includeHistory ? '?includeHistory=true' : ''
    }`;

    const res = await axios.get<PortfolioPositionDetails>(url, {
      withCredentials: false,
    });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud Portfolio Positions API unavailable with message ${(e as Error).message}`,
    );

    return null;
  }
};
