/* eslint-disable no-await-in-loop */
import axios from 'axios';
import { sentryTracker } from '../sentry';

export async function geckoEthToUsd(): Promise<number> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const data = await axios.get(
        `https://pro-api.coingecko.com/api/v3/simple/price?x_cg_pro_api_key=${process.env.REACT_APP_COINGECKO_API_KEY}&ids=ethereum&vs_currencies=usd`,
      );
      return data.data.ethereum.usd;
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Unsuccesful call to retrieve ETH/USD price from Coingecko');
      console.error(error);
    }
  }
  return 0;
}
