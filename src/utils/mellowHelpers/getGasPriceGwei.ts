/* eslint-disable no-await-in-loop */
import axios from 'axios';
import { getSentryTracker } from '../../init';

export async function getGasPriceGwei(): Promise<number> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const data = await axios.get(`https://ethgasstation.info/api/ethgasAPI.json?`);
      const averageGasPrice = data.data.average;
      return averageGasPrice;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(
        'Unsuccesful call to retrieve gas price (gwei) price from ETH Gas Station',
      );
      console.error(error);
    }
  }
  return 0;
}
