import { providers } from 'ethers';
import { convertGasUnitsToNativeToken } from './convertGasUnitsToNativeToken';
import { geckoEthToUsd } from './priceFetch';

export async function convertGasUnitsToUSD(
  provider: providers.Provider,
  gasUnits: number,
): Promise<number> {
  // WARNING: This only works if native token is ETH
  // Currently, it is used only for Mellow, which is mainnet-only
  // todo: take into account other native tokens, such as AVAX.
  const gasUnitsToETH = await convertGasUnitsToNativeToken(provider, gasUnits);
  const ethPrice = await geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || '');
  const gasUnitsToUSD = gasUnitsToETH * ethPrice;

  return gasUnitsToUSD;
}
