import { getMellowConfig } from '../../config/config';
import { OptimiserInfo } from '../types';
import { getVaultInfo } from './getVaultInfo';

export const getVaultsInfo = async (
  userAddress: string,
  type: 'all' | 'active' = 'all',
): Promise<OptimiserInfo[]> => {
  const config = getMellowConfig();
  let vaultConfigs = config.MELLOW_OPTIMISERS.filter((v) => v.isVault);
  if (type === 'active') {
    vaultConfigs = vaultConfigs.filter((v) => !v.deprecated);
  }

  // Get vaults
  const vaults: OptimiserInfo[] = [];
  for (const vaultConfig of vaultConfigs) {
    vaults.push(await getVaultInfo(vaultConfig.optimiser, userAddress));
  }

  return vaults;
};
