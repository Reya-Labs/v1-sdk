import { BigNumber } from 'ethers';

export function convertGasUnitsToUSD(
  gasUnits: BigNumber,
  ethToUSDPrice: number,
  gasPriceGwei: number,
): string {
  const gasPriceUSD = gasUnits.mul(gasPriceGwei).mul(ethToUSDPrice).div('1000000000');
  return gasPriceUSD.toString();
}
