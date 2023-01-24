import axios from 'axios';
import { getSentryTracker } from '../init';
import { exponentialBackoff } from './retry';

export const geckoEthToUsd = async (apiKey: string): Promise<number> => {
  const attempts = 5;

  try {
    const data = await exponentialBackoff(
      () =>
        axios.get(
          `https://pro-api.coingecko.com/api/v3/simple/price?x_cg_pro_api_key=${apiKey}&ids=ethereum&vs_currencies=usd`,
        ),
      attempts,
    );
    return data.data.ethereum.usd;
  } catch (error) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage('Unable to fetch ETH price after 5 attempts');
  }

  return 0;
};
