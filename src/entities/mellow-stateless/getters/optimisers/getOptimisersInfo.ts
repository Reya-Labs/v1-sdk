import { ethers } from 'ethers';
import { MellowLensContractABI } from '../../../../ABIs';
import { ZERO_ADDRESS } from '../../../../constants';
import { getProvider } from '../../../../init';
import { getMellowConfig } from '../../config/config';
import { RouterInfo, ContractRouterInfo } from '../types';
import { mapRouter } from './mappers';

export const getOptimisersInfo = async (userAddress = ZERO_ADDRESS): Promise<RouterInfo[]> => {
  const config = getMellowConfig();
  const provider = getProvider();
  const routerConfigs = config.MELLOW_ROUTERS.filter((r) => !r.isVault);

  const mellowLensContract = new ethers.Contract(
    config.MELLOW_LENS,
    MellowLensContractABI,
    provider,
  );

  // Get routers
  const optimisersContractInfo: ContractRouterInfo[] = await mellowLensContract.getOptimisersInfo(
    routerConfigs.map((routerConfig) => routerConfig.router),
    userAddress,
  );

  const routers = routerConfigs.map((routerConfig, index) =>
    mapRouter(routerConfig, optimisersContractInfo[index]),
  );

  return routers;
};
