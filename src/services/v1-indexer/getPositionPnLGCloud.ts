import axios from 'axios';
import { getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { getServiceUrl } from './urls';

export type GetPositionPnLGCloudReturn = {
  realizedPnLFromSwaps: number;
  realizedPnLFromFeesPaid: number;
  unrealizedPnLFromSwaps: number;
};

export const getPositionPnLGCloud = async (
  chainId: SupportedChainId,
  vammAddress: string,
  ownerAddress: string,
  tickLower: number,
  tickUpper: number,
): Promise<GetPositionPnLGCloudReturn> => {
  try {
    const baseUrl = getServiceUrl('position-pnl');
    const url = `${baseUrl}/${chainId}/${vammAddress}/${ownerAddress}/${tickLower}/${tickUpper}`;
    const res = await axios({
      method: 'get',
      url: url,
      withCredentials: false,
    });
    return {
      realizedPnLFromSwaps: res.data.realizedPnLFromSwaps,
      realizedPnLFromFeesPaid: res.data.realizedPnLFromFeesPaid,
      unrealizedPnLFromSwaps: res.data.unrealizedPnLFromSwaps,
    };
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('GCloud Positions API unavailable');

    return {
      realizedPnLFromSwaps: 0,
      realizedPnLFromFeesPaid: 0,
      unrealizedPnLFromSwaps: 0,
    };
  }
};
