import { Wallet } from 'ethers';

const getDummyWallet = (): Wallet => {
  return Wallet.fromMnemonic('test test test test test test test test test test test junk');
};

export default getDummyWallet;
