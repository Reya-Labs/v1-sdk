import axios from 'axios';
import { getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { getServiceUrl } from './urls';

export type RawV1V2AMM = {
  id: string;
  chainId: number;

  marketId: string; // v2-only

  vamm: string; // v1-only
  marginEngineAddress: string; // v1-only

  tickSpacing: number;
  termStartTimestampInMS: number;
  termEndTimestampInMS: number;

  isBorrowing: boolean;
  market: 'Aave V2' | 'Aave V3' | 'Compound' | 'Lido' | 'Rocket' | 'GMX:GLP' | 'SOFR';

  rateOracle: {
    address: string;
    protocolId: number;
  };

  underlyingToken: {
    address: string;
    name: 'eth' | 'usdc' | 'usdt' | 'dai';
    tokenDecimals: number;
    priceUSD: number;
  };

  currentFixedRate: number; // v2-only
  fixedRateChange: number; // v2-only

  currentLiquidityIndex: number; // v2-only
  currentVariableRate: number; // v2-only
  variableRateChange: number; // v2-only
  rateChangeLookbackWindowMS: number; // v2-only

  coreAddress: string; // v2-only
  productAddress: string; // v2-only
  exchangeAddress: string; // v2-only

  // Indicates if Voltz protocol V2 is used for the pool
  isV2: boolean;
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
