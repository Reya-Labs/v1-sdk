import { BigNumber, ethers, providers } from 'ethers';
import { getSentryTracker } from '../init';

export async function convertGasUnitsToNativeToken(
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
        sentryTracker.captureMessage('Unable to fetch gas price after 5 attempts');
      }
    }
  }

  const gasUnitsToNativeToken = parseFloat(ethers.utils.formatEther(gasPriceWei)) * gasUnits;
  return gasUnitsToNativeToken;
}
