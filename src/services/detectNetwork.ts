import { Signer } from 'ethers';
import { SupportedChainId } from '../types';

export type NetworkDetectedType = {
  network: SupportedChainId | null;
  isSupported: boolean;
};

export const detectNetworkWithChainId = (chainId: number): NetworkDetectedType => {
  if (!Object.values(SupportedChainId).includes(chainId)) {
    return {
      network: null,
      isSupported: false,
    };
  }

  return {
    network: chainId,
    isSupported: true,
  };
};

export const detectNetworkWithSigner = async (signer: Signer): Promise<NetworkDetectedType> => {
  const chainId = await signer.getChainId();
  return detectNetworkWithChainId(chainId);
};
