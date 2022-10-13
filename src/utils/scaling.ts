import { BigNumber, BigNumberish, ethers } from 'ethers';

export const descale = (decimals: number) => {
  return (amount: BigNumberish): number => {
    return Number(ethers.utils.formatUnits(amount, decimals));
  };
};

export const scale = (decimals: number) => {
  return (amount: number): BigNumber => {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  };
};
