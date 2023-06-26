import axios from 'axios';
import { getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { getServiceUrl } from './urls';

type ChainLevelInformation = {
  volume30DayInDollars: number;
  totalLiquidityInDollars: number;
};

export const getChainLevelInformation = async (
  chainIds: SupportedChainId[],
): Promise<ChainLevelInformation> => {
  try {
    const baseUrl = getServiceUrl('chain-information');
    const url = `${baseUrl}/${chainIds.join('&')}`;
    const res = await axios.get<{
      volume30Day: number;
      totalLiquidity: number;
    }>(url, {
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
