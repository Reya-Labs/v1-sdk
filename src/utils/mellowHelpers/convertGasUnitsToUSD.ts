import { BigNumber } from 'ethers';
import { geckoEthToUsd } from './geckoEthToUsd';
import { getGasPriceGwei } from './getGasPriceGwei';

export async function convertGasUnitsToUSD(gasUnits: BigNumber): Promise<number> {
  const gasPriceGwei = await getGasPriceGwei();
  const ethToUSDPrice = await geckoEthToUsd();
  const ethToUSDPriceScaled = ethToUSDPrice * 100;

  const gasPriceUSDScaledBN = gasUnits
    .mul(BigNumber.from(gasPriceGwei))
    .mul(BigNumber.from(ethToUSDPriceScaled));

  const gasPriceUSDScaled = parseFloat(gasPriceUSDScaledBN.toString());
  const gasPriceUSD = gasPriceUSDScaled / 1000000000000;
  return gasPriceUSD;
}
