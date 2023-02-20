import { providers } from 'ethers';
import { convertGasUnitsToETH } from './convertGasUnitsToETH';
import { geckoEthToUsd } from './priceFetch';

export async function convertGasUnitsToUSD(
  provider: providers.Provider,
  gasUnits: number,
): Promise<number> {
  const gasUnitsToETH = await convertGasUnitsToETH(provider, gasUnits);
  const ethPrice = await geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || '');
  const gasUnitsToUSD = gasUnitsToETH * ethPrice;

  return gasUnitsToUSD;
}
