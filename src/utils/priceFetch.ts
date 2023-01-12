import axios from 'axios';
import { getSentryTracker } from '../init';

const FETCH_WINDOW_IN_MS = 60 * 1000;
const ATTEMPTS = 5;

let price = 0;
let timestampInMS = 0;

export const geckoEthToUsd = async (apiKey: string): Promise<number> => {
  const currentTimestampInMS = Date.now().valueOf();
  if (currentTimestampInMS <= timestampInMS + FETCH_WINDOW_IN_MS) {
    return price;
  }

  price = 0;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const data = await axios.get(
        `https://pro-api.coingecko.com/api/v3/simple/price?x_cg_pro_api_key=${apiKey}&ids=ethereum&vs_currencies=usd`,
      );
      price = data.data.ethereum.usd;
      timestampInMS = Date.now().valueOf();
    } catch (error) {
      if (attempt + 1 === ATTEMPTS) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage(`Unable to fetch ETH price after ${ATTEMPTS} attempts`);
      }
    }
  }

  return price;
};
