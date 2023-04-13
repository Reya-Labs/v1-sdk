import axios from 'axios';
import { getSentryTracker } from '../../../init';

const baseURL = 'https://voltz-indexer-3wpwbm66ca-nw.a.run.app/api/amms';

export const getAmmInformationGCloud = async (
  chainId: number,
  vammAddress: string,
): Promise<{
  volume30Day: number;
  totalLiquidity: number;
}> => {
  try {
    const url = `${baseURL}/${chainId}/${vammAddress}`;
    const res = await axios({
      method: 'get',
      url: url,
      withCredentials: false,
    });
    return {
      volume30Day: res.data.volume30Day,
      totalLiquidity: res.data.totalLiquidity,
    };
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage('GCloud Amm Information API unavailable');

    return {
      volume30Day: 0,
      totalLiquidity: 0,
    };
  }
};
