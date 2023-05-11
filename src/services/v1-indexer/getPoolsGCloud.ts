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
};

export const getPoolsGCloud = async (chainIds: SupportedChainId[]): Promise<RawAMM[]> => {
  try {
    const baseUrl = getServiceUrl('chain-pools');
    const url = `${baseUrl}/${chainIds}`;

    const res = await axios({
      method: 'get',
      url: url,
      withCredentials: false,
    });

    const rawAMMs = res.data;

    return rawAMMs;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud Pool API unavailable with message ${(e as Error).message}`,
    );

    throw new Error(`GCloud Pool API unavailable with message ${(e as Error).message}`);
  }
};
