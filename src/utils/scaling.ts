import { BigNumberish, ethers, BigNumber } from 'ethers';

export const descale = (amount: BigNumberish, decimals: number): number => {
  return Number(ethers.utils.formatUnits(amount, decimals));
};

export const scale = (amount: number, decimals: number): BigNumber => {
  return ethers.utils.parseUnits(amount.toFixed(decimals), decimals);
};
