import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { getServiceUrl } from '../urls';
import { V1V2PortfolioPositionDetails } from '@voltz-protocol/api-sdk-v2';
import { adjustForAavePosition } from './adjustForAavePosition';

type GetPortfolioPositionDetailsParams = {
  positionId: string;
  includeHistory: boolean;
};

export const getPortfolioPositionDetails = async ({
  positionId,
  includeHistory,
}: GetPortfolioPositionDetailsParams): Promise<V1V2PortfolioPositionDetails | null> => {
  try {
    const baseUrl = getServiceUrl('v1v2-position');
    const url = `${baseUrl}/${positionId.toLowerCase()}${
      includeHistory ? '?includeHistory=true' : ''
    }`;

    const res = await axios.get<V1V2PortfolioPositionDetails>(url, {
      withCredentials: false,
    });

    return adjustForAavePosition(res.data);
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud Portfolio Positions API unavailable with message ${(e as Error).message}`,
    );

    return null;
  }
};
