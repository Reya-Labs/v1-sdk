import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { getServiceUrl } from '../urls';
import { Position } from '../../../entities/position/position';
import { mapToPosition } from './mapToPosition';
import { AMM } from '../../../entities/amm/amm';
import { V1PortfolioPositionDetails } from './types';

export const getLpPositionsByPool = async (
  poolId: string,
  ownerAddress: string,
  amm: AMM,
): Promise<Position[]> => {
  if (poolId.endsWith('v2')) {
    throw new Error('Not implemented yet');
  }

  try {
    const baseUrl = getServiceUrl('v1v2-lp-positions-by-pool');
    const url = `${baseUrl}/${poolId.toLowerCase()}/${ownerAddress.toString}`;

    const res = await axios.get<V1PortfolioPositionDetails[]>(url, {
      withCredentials: false,
    });

    const responses = await Promise.allSettled(res.data.map((p) => mapToPosition(p, amm)));

    const positions = responses.map((r) => {
      if (r.status === 'rejected') {
        throw r.reason;
      }
      return r.value;
    });

    return positions;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud v1v2-lp-positions-by-pool API unavailable with message ${(e as Error).message}`,
    );

    return [];
  }
};
