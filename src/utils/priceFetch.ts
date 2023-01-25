import axios from 'axios';
import { getSentryTracker } from '../init';
import { exponentialBackoff } from './retry';

const REFRESH_INTERVAL_IN_MS = 60 * 1000;
const NO_OF_RETRIES = 5;

let price: number | null = null;
let lastRefreshInMs = 0;

export const geckoEthToUsd = async (apiKey: string): Promise<number> => {
  if (price && lastRefreshInMs + REFRESH_INTERVAL_IN_MS > Date.now().valueOf()) {
    return price;
  }

  try {
    const data = await exponentialBackoff(
      () =>
        axios.get(
          `https://pro-api.coingecko.com/api/v3/simple/price?x_cg_pro_api_key=${apiKey}&ids=ethereum&vs_currencies=usd`,
        ),
      NO_OF_RETRIES,
    );

    price = data.data.ethereum.usd as number;
    lastRefreshInMs = Date.now().valueOf();

    return price;
  } catch (error) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage(`Unable to fetch ETH price after ${NO_OF_RETRIES} attempts`);
  }

  return 0;
};
