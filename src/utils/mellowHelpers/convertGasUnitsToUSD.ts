import { BigNumber, providers } from 'ethers';
import { getSentryTracker } from '../../init';
import { geckoEthToUsd } from '../priceFetch';

export async function convertGasUnitsToUSD(
  provider: providers.Provider,
  gasUnits: number,
): Promise<number> {
  let gasPriceWei = BigNumber.from(0);

  const attempts = 5;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      gasPriceWei = await provider.getGasPrice();
      break;
    } catch (error) {
      if (attempt + 1 === attempts) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Unable to fetch ETH price after 5 attempts');
      }
    }
  }

  const ethPrice = await geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || '');

  const gasPriceGwei = gasPriceWei.toNumber() / 1e9;
  const gasUnitsToUSD = (gasPriceGwei * gasUnits * ethPrice) / 1e9;

  return gasUnitsToUSD;
}
