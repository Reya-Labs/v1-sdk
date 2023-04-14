import axios from 'axios';
import { getSentryTracker } from '../init';
import { SupportedChainId } from '../types';

const baseURL = 'http://34.142.8.201:8080/api/chains';

export const getChainLevelInformation = async (
  chainId: SupportedChainId,
): Promise<{
  volume30DayInDollars: number;
  totalLiquidityInDollars: number;
}> => {
  try {
    const url = `${baseURL}/${chainId}`;
    const res = await axios({
      method: 'get',
      url: url,
      withCredentials: false,
    });
    return {
      volume30DayInDollars: res.data.volume30Day,
      totalLiquidityInDollars: res.data.totalLiquidity,
    };
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('GCloud Amm Information API unavailable');

    return {
      volume30DayInDollars: 0,
      totalLiquidityInDollars: 0,
    };
  }
};
