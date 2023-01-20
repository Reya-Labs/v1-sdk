import { ethers } from 'ethers';
import { MellowLensContractABI } from '../../../../ABIs';
import { getProvider, getSentryTracker } from '../../../../init';
import { getMellowConfig } from '../../config/config';
import { RouterInfo, ContractRouterInfo } from '../types';
import { getRouterConfig } from '../../utils/getRouterConfig';
import { mapRouter } from './mappers';
import { ZERO_ADDRESS } from '../../../../constants';

export const getOptimiserInfo = async (
  routerId: string,
  userAddress: string = ZERO_ADDRESS,
): Promise<RouterInfo> => {
  const { MELLOW_LENS } = getMellowConfig();
  const routerConfig = getRouterConfig(routerId);
  const provider = getProvider();

  const mellowLensContract = new ethers.Contract(MELLOW_LENS, MellowLensContractABI, provider);

  try {
    const optimisersContractInfo: ContractRouterInfo[] = await mellowLensContract.getOptimisersInfo(
      [routerConfig.router],
      userAddress,
    );

    const router = mapRouter(routerConfig, optimisersContractInfo[0]);

    return router;
  } catch (error) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(error);
    sentryTracker.captureMessage('Failed to load individual optimiser information.');
    throw new Error('Failed to load optimiser information.');
  }
};
