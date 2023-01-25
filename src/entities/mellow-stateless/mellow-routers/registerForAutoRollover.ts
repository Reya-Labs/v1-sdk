import { ethers } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { exponentialBackoff } from '../../../utils/retry';
import { getOptimiserInfo } from '../getters/optimisers/getOptimiserInfo';
import { RouterInfo } from '../getters/types';
import { getRouterConfig } from '../utils/getRouterConfig';

type RegisterForAutoRolloverArgs = {
  routerId: string;
  registration: boolean;
  signer: ethers.Signer;
};

type RegisterForAutoRolloverResponse = {
  transaction: {
    receipt: ethers.ContractReceipt;
  };
  newRouterState: RouterInfo;
};

export const registerForAutoRollover = async ({
  routerId,
  registration,
  signer,
}: RegisterForAutoRolloverArgs): Promise<RegisterForAutoRolloverResponse> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  if (routerConfig.isVault) {
    throw new Error('Deposit not supported for vaults.');
  }

  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  try {
    await mellowRouter.callStatic.registerForAutoRollover(registration);
  } catch (err) {
    // TODO: Add Sentry
    throw new Error('Unsuccessful auto-rollover registration simulation');
  }

  const gasLimit = await mellowRouter.estimateGas.registerForAutoRollover(registration);

  const tx = await mellowRouter.registerForAutoRollover(registration, {
    gasLimit: getGasBuffer(gasLimit),
  });
  const receipt = await tx.wait();

  // Get the next state of the router
  const userAddress = await exponentialBackoff(() => signer.getAddress());
  const routerInfo = await getOptimiserInfo(routerId, userAddress);

  // Return the response
  return {
    transaction: {
      receipt,
    },
    newRouterState: routerInfo,
  };
};
