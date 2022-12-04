import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Network } from 'hardhat/types';

export const fail = (): void => {
  expect(true).to.be.eq(false);
};

export const addSigner = async (network: Network, address: string): Promise<SignerWithAddress> => {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  await network.provider.send('hardhat_setBalance', [address, '0x1000000000000000000']);
  return ethers.getSigner(address);
};

const removeSigner = async (network: Network, address: string) => {
  await network.provider.request({
    method: 'hardhat_stopImpersonatingAccount',
    params: [address],
  });
};

export const withSigner = async (
  network: Network,
  address: string,
  f: (signer: SignerWithAddress) => Promise<void>,
): Promise<void> => {
  const signer = await addSigner(network, address);
  await f(signer);
  await removeSigner(network, address);
};
