import { Wallet } from 'ethers';

const getDummyWallet = (): Wallet => {
  return new Wallet(`0x0000000000000000000000000000000000000000000000000000000000000001`);
};

export default getDummyWallet;
