import axios from 'axios';
import { getSentryTracker } from '../../../init';

const baseURL = 'https://voltz-indexer-3wpwbm66ca-nw.a.run.app/api/positions';

export const getPositionPnLGCloud = async (
  vammAddress: string,
  ownerAddress: string,
  tickLower: number,
  tickUpper: number,
): Promise<{
  realizedPnLFromSwaps: number;
  unrealizedPnLFromSwaps: number;
}> => {
  try {
    const url = `${baseURL}/${vammAddress}/${ownerAddress}/${tickLower}/${tickUpper}`;
    const res = await axios({
      method: 'get',
      url: url,
      withCredentials: false,
    });
    return {
      realizedPnLFromSwaps: res.data.realizedPnLFromSwaps,
      unrealizedPnLFromSwaps: res.data.unrealizedPnLFromSwaps,
    };
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('GCloud Positions API unavailable');

    return {
      realizedPnLFromSwaps: 0,
      unrealizedPnLFromSwaps: 0,
    };
  }
};
