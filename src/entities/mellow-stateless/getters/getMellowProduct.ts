import { ZERO_ADDRESS } from '../../../constants';
import { getRouterConfig } from '../utils/getRouterConfig';
import { getOptimiserInfo } from './optimisers/getOptimiserInfo';
import { RouterInfo } from './types';
import { getVaultInfo } from './vaults/getVaultInfo';

export const getMellowProduct = async ({
  routerId,
  userAddress = ZERO_ADDRESS,
}: {
  routerId: string;
  userAddress: string;
}): Promise<RouterInfo> => {
  const routerConfig = getRouterConfig(routerId);
  if (routerConfig.isVault) {
    return getVaultInfo(routerConfig.router, userAddress);
  }

  return getOptimiserInfo(routerConfig.router, userAddress);
};
