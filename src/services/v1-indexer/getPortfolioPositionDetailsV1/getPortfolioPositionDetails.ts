import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { getServiceUrl } from '../urls';
import { PortfolioPositionDetails } from './types';

export const getPortfolioPositionDetails = async (
  positionId: string,
): Promise<PortfolioPositionDetails | null> => {
  try {
    const baseUrl = getServiceUrl('portfolio-position-details');
    const url = `${baseUrl}/${positionId.toLowerCase()}`;

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
