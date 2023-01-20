import { getMellowConfig } from '../../config/config';
import { RouterInfo } from '../types';
import { getVaultInfo } from './getVaultInfo';

export const getVaultsInfo = async (userAddress: string): Promise<RouterInfo[]> => {
  const config = getMellowConfig();
  const vaultConfigs = config.MELLOW_ROUTERS.filter((r) => r.isVault);

  // Get vaults
  const vaults: RouterInfo[] = [];
  for (const vaultConfig of vaultConfigs) {
    vaults.push(await getVaultInfo(vaultConfig.router, userAddress));
  }

  return vaults;
};
