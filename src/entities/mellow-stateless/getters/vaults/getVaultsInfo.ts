import { SupportedChainId } from '../../../../types';
import { getMellowConfig, getMellowConfigV1 } from '../../config/config';
import { OptimiserInfo } from '../types';
import { getVaultInfo, getVaultInfoV1 } from './getVaultInfo';

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

export const getVaultsInfoV1 = async (
  userAddress: string,
  type: 'all' | 'active' = 'all',
  chainId: SupportedChainId,
  alchemyApiKey: string,
): Promise<OptimiserInfo[]> => {
  const config = getMellowConfigV1(chainId);
  let vaultConfigs = config.MELLOW_OPTIMISERS.filter((v) => v.isVault);
  if (type === 'active') {
    vaultConfigs = vaultConfigs.filter((v) => !v.deprecated);
  }

  // Get vaults
  const vaults: OptimiserInfo[] = [];
  for (const vaultConfig of vaultConfigs) {
    vaults.push(await getVaultInfoV1(vaultConfig.optimiser, userAddress, chainId, alchemyApiKey));
  }

  return vaults;
};
