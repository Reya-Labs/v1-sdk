import axios from 'axios';
import { getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { getServiceUrl } from './urls';

export type RawV1V2AMM = {
  id: string;
  chainId: number;
  vamm: string;
  marginEngine: string;
  rateOracle: {
    address: string;
    protocolId: number;
  };

  isBorrowing: boolean;
  market: string;
  marketId: string;
  isV2: boolean;

  variableRateChange: number;
  currentVariableRate: number;
  currentFixedRate: number;
  fixedRateChange: number;
  currentLiquidityIndex: number;
  rateChangeLookbackWindowMS: number;

  coreAddress: string;
  productAddress: string;
  exchangeAddress: string;

  tickSpacing: number;
  termStartTimestampInMS: number;
  termEndTimestampInMS: number;

  underlyingToken: {
    address: string;
    name: string;
    tokenDecimals: number;
    priceUSD: number;
  };
};

export const getV1V2PoolsGCloud = async (chainIds: SupportedChainId[]): Promise<RawV1V2AMM[]> => {
  try {
    const baseUrl = getServiceUrl('v1v2-pools');
    const url = `${baseUrl}/${chainIds.join('&')}`;

    const res = await axios.get<RawV1V2AMM[]>(url, {
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

//// TO BE DEPRECATED

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
