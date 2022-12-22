/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import axios from 'axios';
import { BigNumber } from 'ethers';
import { sentryTracker } from '../sentry';

export async function convertGasUnitsToUSD(gasUnits: BigNumber): Promise<string> {
  const geckoEthToUsd = async () => {
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
  };

  const getGasPriceGwei = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const data = await axios.get(`https://ethgasstation.info/api/ethgasAPI.json?`);
        const averageGasPrice = data.data.average / 10;
        return averageGasPrice;
      } catch (error) {
        sentryTracker.captureException(error);
        sentryTracker.captureMessage(
          'Unsuccesful call to retrieve gas price (gwei) price from ETH Gas Station',
        );
        console.error(error);
      }
    }
    return 0;
  };

  const gasPriceGwei = await getGasPriceGwei();
  const ethToUSDPrice = await geckoEthToUsd();
  const gasPriceUSD = gasUnits.mul(gasPriceGwei).mul(ethToUSDPrice).div('1000000000');
  return gasPriceUSD.toString();
}
