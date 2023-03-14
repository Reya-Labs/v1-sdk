import { NetworkConfiguration } from './types';
import { networkConfigurations } from './config';
import { SupportedChainId } from '../../../types';

export const getVoltzPoolConfig = (chainId: SupportedChainId): NetworkConfiguration => {
  return networkConfigurations[chainId];
};
