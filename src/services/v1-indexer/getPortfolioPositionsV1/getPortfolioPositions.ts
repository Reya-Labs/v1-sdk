import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';
import { getServiceUrl } from '../urls';
import { PortfolioPosition } from './types';

export const getPortfolioPositions = async (
  chainIds: SupportedChainId[],
  ownerAddress: string,
): Promise<PortfolioPosition[]> => {
  try {
    const baseUrl = getServiceUrl('portfolio-positions');
    const url = `${baseUrl}/${chainIds.join('&')}/${ownerAddress.toLowerCase()}`;

    const res = await axios.get<PortfolioPosition[]>(url, {
      withCredentials: false,
    });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud Portfolio Positions API unavailable with message ${(e as Error).message}`,
    );

    return [];
  }
};
