import { ethers } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getGasBuffer } from '../../../constants';
import { getMellowConfig } from '../config/config';

type RegisterForAutoRolloverArgs = {
  routerId: string;
  registration: boolean;
  signer: ethers.Signer;
};

export const registerForAutoRollover = async ({
  routerId,
  registration,
  signer,
}: RegisterForAutoRolloverArgs): Promise<ethers.ContractReceipt> => {
  const config = getMellowConfig();

  const routerConfig = config.MELLOW_ROUTERS.find(
    (item) => item.router.toLowerCase() === routerId.toLowerCase(),
  );

  if (!routerConfig) {
    // TODO: add sentry
    throw new Error('Router ID not found');
  }

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
  return receipt;
};
