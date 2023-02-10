import { providers } from 'ethers';
import { NetworkConfiguration } from './types';
import { networkConfigurations, networkConfigurationsV1 } from './config';
import { SupportedChainId } from '../../../types';

export const getVoltzPoolConfig = ({
  network,
  providerURL,
}: {
  network: string;
  providerURL: string;
}): NetworkConfiguration & {
  PROVIDER: providers.BaseProvider;
} => {
  if (!network) {
    throw new Error(`Network not specified as an environment variable.`);
  }

  const allNetworks = Object.keys(networkConfigurations);
  if (!allNetworks.includes(network)) {
    throw new Error(
      `Network ${network} not found in configuration networks ${allNetworks.toString()}.`,
    );
  }

  const config = networkConfigurations[network as keyof typeof networkConfigurations];
  const provider = providers.getDefaultProvider(providerURL);

  return {
    ...config,
    PROVIDER: provider,
  };
};

export const getVoltzPoolConfigV1 = (chainId: SupportedChainId): NetworkConfiguration => {
  return networkConfigurationsV1[chainId];
};
