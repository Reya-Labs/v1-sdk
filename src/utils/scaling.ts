import { BigNumberish, ethers, BigNumber } from 'ethers';

export const descale = (amount: BigNumberish, decimals: number): number => {
  return Number(ethers.utils.formatUnits(amount, decimals));
};

export const scale = (amount: number, decimals: number): BigNumber => {
  return ethers.utils.parseUnits(amount.toFixed(decimals), decimals);
};

export const descaleToString = (amount: BigNumberish, decimals: number): string => {
  return ethers.utils.formatUnits(amount, decimals);
};

export const descaleToBigNumber = (amount: BigNumberish, decimals: number): BigNumber => {
  return BigNumber.from(descaleToString(amount, decimals).split('.')[0]);
};
