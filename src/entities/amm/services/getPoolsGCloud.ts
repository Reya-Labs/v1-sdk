import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';

// todo: change it to prod
const baseURL = '//localhost:8080/chain-pools';

export type RawAMM = {
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

  hidden: boolean;
  traderHidden: boolean;
  traderWithdrawable: boolean;

  minLeverageAllowed: number;

  rollover: string;
};

export const getPoolsGCloud = async (chainId: SupportedChainId): Promise<RawAMM[]> => {
  try {
    const url = `${baseURL}/${chainId}`;

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
