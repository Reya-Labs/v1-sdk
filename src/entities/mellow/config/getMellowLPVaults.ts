import MellowLpRouter from '../mellowLpRouter';
import MellowLpVault from '../mellowLpVault';
import { getConfig } from './config';
import { MellowProduct } from './types';

export const getMellowLPVaults = ({
  network,
  providerURL,
}: {
  network: string;
  providerURL: string;
}): MellowProduct[] => {
  const config = getConfig({
    network,
    providerURL,
  });

  const vaults: MellowProduct[] = config.MELLOW_VAULTS.filter((item) => item.metadata.show).map(
    (item) => {
      const vault = new MellowLpVault({
        id: item.voltzVault,
        ethWrapperAddress: config.MELLOW_ETH_WRAPPER,
        voltzVaultAddress: item.voltzVault,
        erc20RootVaultAddress: item.erc20RootVault,
        erc20RootVaultGovernanceAddress: item.erc20RootVaultGovernance,
        provider: config.PROVIDER,
        metadata: {
          ...item.metadata,
          underlyingPools: item.metadata.vaults.reduce(
            (allPools, currentVault) => [...allPools, ...currentVault.pools],
            [] as string[],
          ),
        },
      });

      return vault;
    },
  );

  const routers: MellowProduct[] = config.MELLOW_ROUTERS.filter((item) => item.metadata.show).map(
    (item) => {
      const vault = new MellowLpRouter({
        id: `mellow-${item.metadata.token.toLowerCase()}`,
        mellowRouterAddress: item.router,
        provider: config.PROVIDER,
        metadata: {
          ...item.metadata,
          underlyingPools: item.metadata.vaults.reduce(
            (allPools, currentVault) => [...allPools, ...currentVault.pools],
            [] as string[],
          ),
        },
      });

      return vault;
    },
  );

  return routers.concat(vaults);
};
