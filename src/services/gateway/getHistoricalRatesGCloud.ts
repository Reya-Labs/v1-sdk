import axios from 'axios';
import { getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { getServiceUrl } from './urls';

export type HistoricalRate = {
  rate: number;
  timestamp: number;
};

export const getFixedRatesGCloud = async (
  chainId: SupportedChainId,
  vammAddress: string,
  startTimestamp: number,
  endTimestamp: number,
): Promise<HistoricalRate[]> => {
  try {
    const baseUrl = getServiceUrl('fixed-rates');
    const url = `${baseUrl}/${chainId}/${vammAddress}/${startTimestamp}/${endTimestamp}`;
    const res = await axios.get<HistoricalRate[]>(url, { withCredentials: false });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('GCloud Fixed Rates API unavailable');

    return [];
  }
};

export const getVariableRatesGCloud = async (
  chainId: SupportedChainId,
  rateOracleAddress: string,
  startTimestamp: number,
  endTimestamp: number,
): Promise<HistoricalRate[]> => {
  try {
    const baseUrl = getServiceUrl('variable-rates');
    const url = `${baseUrl}/${chainId}/${rateOracleAddress}/${startTimestamp}/${endTimestamp}`;
    const res = await axios.get<HistoricalRate[]>(url, { withCredentials: false });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('GCloud Variable Rates API unavailable');

    return [];
  }
};
