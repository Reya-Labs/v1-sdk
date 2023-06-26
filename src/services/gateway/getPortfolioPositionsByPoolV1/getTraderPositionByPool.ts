import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { getServiceUrl } from '../urls';
import { V1PortfolioPositionDetails } from './types';
import { AMM, Position } from '../../../entities';
import { mapToPosition } from './mapToPosition';

export const getTraderPositionByPool = async (
  poolId: string,
  ownerAddress: string,
  amm: AMM,
): Promise<Position | null> => {
  if (poolId.endsWith('v2')) {
    throw new Error('Not implemented yet');
  }

  try {
    const baseUrl = getServiceUrl('v1v2-trader-positions-by-pool');
    const url = `${baseUrl}/${poolId.toLowerCase()}/${ownerAddress.toString}`;

    const res = await axios.get<V1PortfolioPositionDetails[]>(url, {
      withCredentials: false,
    });

    if (res.data.length === 0) {
      return null;
    }

    return mapToPosition(res.data[0], amm);
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud v1v2-trader-positions-by-pool API unavailable with message ${(e as Error).message}`,
    );

    return null;
  }
};
