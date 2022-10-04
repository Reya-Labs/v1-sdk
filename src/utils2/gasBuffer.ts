import { BigNumber } from 'ethers';

// add 20% buffer to the gas estimation
export function getGasBuffer(value: BigNumber): BigNumber {
  return value.mul(120).div(100);
}
