import axios from 'axios';
import { getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { getServiceUrl } from './urls';
import { V1V2Pool } from '@voltz-protocol/api-v2-types';

export const getV1V2PoolsGCloud = async (chainIds: SupportedChainId[]): Promise<V1V2Pool[]> => {
  try {
    const baseUrl = getServiceUrl('v1v2-pools');
    const url = `${baseUrl}/${chainIds.join('&')}`;

    const res = await axios.get<V1V2Pool[]>(url, {
      withCredentials: false,
    });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `v1-v2 GCloud Pool API unavailable with message ${(e as Error).message}`,
    );

    return [];
  }
};
