import axios from 'axios';
import { getSentryTracker } from '../../init';
import { getServiceUrl } from './urls';
import { HistoricalRate } from '@voltz-protocol/api-v2-types';

export const getFixedRatesGCloud = async (
  poolId: string,
  startTimestamp: number,
  endTimestamp: number,
): Promise<HistoricalRate[]> => {
  try {
    const baseUrl = getServiceUrl('v1v2-fixed-rates');
    const url = `${baseUrl}/${poolId}/${startTimestamp}/${endTimestamp}`;
    const res = await axios.get<HistoricalRate[]>(url, { withCredentials: false });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('GCloud Fixed Rates API unavailable');

    return [];
  }
};

export const getVariableRatesGCloud = async (
  poolId: string,
  startTimestamp: number,
  endTimestamp: number,
): Promise<HistoricalRate[]> => {
  try {
    const baseUrl = getServiceUrl('v1v2-variable-rates');
    const url = `${baseUrl}/${poolId}/${startTimestamp}/${endTimestamp}`;
    const res = await axios.get<HistoricalRate[]>(url, { withCredentials: false });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('GCloud Variable Rates API unavailable');

    return [];
  }
};
