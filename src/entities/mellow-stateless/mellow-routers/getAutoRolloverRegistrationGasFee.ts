import { ethers } from 'ethers';
import { MellowMultiVaultRouterABI } from '../../../ABIs';
import { getProvider } from '../../../init';
import { convertGasUnitsToUSD } from '../../../utils/mellowHelpers/convertGasUnitsToUSD';
import { getRouterConfig } from '../utils/getRouterConfig';

type GetAutoRolloverRegistrationGasFeeArgs = {
  routerId: string;
  registration: boolean;
  signer: ethers.Signer;
};

export const getAutoRolloverRegistrationGasFee = async ({
  routerId,
  registration,
  signer,
}: GetAutoRolloverRegistrationGasFeeArgs): Promise<number> => {
  // Get Mellow Config
  const routerConfig = getRouterConfig(routerId);

  if (routerConfig.isVault) {
    throw new Error('Deposit not supported for vaults.');
  }

  const provider = getProvider();
  const mellowRouter = new ethers.Contract(routerId, MellowMultiVaultRouterABI, signer);

  const gasLimit = await mellowRouter.estimateGas.registerForAutoRollover(registration);
  const fee = await convertGasUnitsToUSD(provider, gasLimit.toNumber());

  return fee;
};
