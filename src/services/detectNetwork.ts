import { Signer } from 'ethers';
import { SupportedChainId } from '../types';

export type NetworkDetectedType = {
  chainId: SupportedChainId | null;
  isSupported: boolean;
};

export const detectNetworkWithChainId = (chainId: number): NetworkDetectedType => {
  if (!Object.values(SupportedChainId).includes(chainId)) {
    return {
      chainId: null,
      isSupported: false,
    };
  }

  return {
    chainId,
    isSupported: true,
  };
};

export const detectNetworkWithSigner = async (signer: Signer): Promise<NetworkDetectedType> => {
  const chainId = await signer.getChainId();
  return detectNetworkWithChainId(chainId);
};
