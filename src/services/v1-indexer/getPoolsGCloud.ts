import axios from 'axios';
import { getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { getServiceUrl } from './urls';

export type RawAMM = {
  chainId: number;
  vamm: string;
  marginEngine: string;
  rateOracle: string;
  protocolId: number;

  tickSpacing: number;
  termStartTimestampInMS: number;
  termEndTimestampInMS: number;

  tokenId: string;
  tokenName: string;
  tokenDecimals: number;
  isV2: boolean;
};

export const getPoolsGCloud = async (chainIds: SupportedChainId[]): Promise<RawAMM[]> => {
  try {
    const baseUrl = getServiceUrl('all-pools');
    const url = `${baseUrl}/${chainIds.join('&')}`;

    const res = await axios.get<RawAMM[]>(url, {
      withCredentials: false,
    });

    return res.data;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud Pool API unavailable with message ${(e as Error).message}`,
    );

    return [];
  }
};
