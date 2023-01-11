import { providers } from 'ethers';
import { NetworkConfiguration } from './types';
import { networkConfigurations } from './config';

let cachedConfig:
  | (NetworkConfiguration & {
      PROVIDER: providers.BaseProvider;
    })
  | null = null;

export const getConfig = ({
  network,
  providerURL,
}: {
  network: string;
  providerURL: string;
}): NetworkConfiguration & {
  PROVIDER: providers.BaseProvider;
} => {
  if (cachedConfig) {
    return cachedConfig;
  }

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

  cachedConfig = {
    ...config,
    PROVIDER: provider,
  };
  return cachedConfig;
};
