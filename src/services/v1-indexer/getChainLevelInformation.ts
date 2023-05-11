import axios from 'axios';
import { getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { getServiceUrl } from './urls';

export const getChainLevelInformation = async (
  chainIds: SupportedChainId[],
): Promise<{
  volume30DayInDollars: number;
  totalLiquidityInDollars: number;
}> => {
  try {
    const baseUrl = getServiceUrl('chain-information');
    const url = `${baseUrl}/${chainIds.join('&')}`;
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
