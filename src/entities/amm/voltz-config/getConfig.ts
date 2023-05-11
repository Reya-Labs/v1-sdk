import { NetworkConfiguration, PoolConfiguration } from './types';
import { networkConfigurations } from './config';
import { SupportedChainId } from '../../../types';

export const getVoltzPoolConfig = (chainId: SupportedChainId): NetworkConfiguration => {
  return networkConfigurations[chainId];
};

export const getVoltzSinglePoolConfig = (
  chainId: SupportedChainId,
  vammAddress: string,
): PoolConfiguration => {
  if (!networkConfigurations[chainId].apply) {
    return {
      name: 'name',
      id: 'id',
      show: {
        general: true,
        trader: true,
      },
      traderWithdrawable: true,
    };
  }

  const allPools = networkConfigurations[chainId].pools;

  const configIndex = allPools.findIndex(
    (item) => item.id.toLowerCase() === vammAddress.toLowerCase(),
  );

  if (configIndex === -1) {
    throw new Error(`Pool Configuration of ${vammAddress} for chain id ${chainId} not found.`);
  }

  return allPools[configIndex];
};
