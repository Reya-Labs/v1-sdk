import { getMellowConfig } from '../../config/config';
import { OptimiserInfo } from '../types';
import { getVaultInfo } from './getVaultInfo';

export const getVaultsInfo = async (userAddress: string): Promise<OptimiserInfo[]> => {
  const config = getMellowConfig();
  const vaultConfigs = config.MELLOW_OPTIMISERS.filter((r) => r.isVault);

  // Get vaults
  const vaults: OptimiserInfo[] = [];
  for (const vaultConfig of vaultConfigs) {
    vaults.push(await getVaultInfo(vaultConfig.optimiser, userAddress));
  }

  return vaults;
};
