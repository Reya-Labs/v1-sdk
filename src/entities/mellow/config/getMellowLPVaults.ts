import { getProviderV1 } from '../../../init';
import { SupportedChainId } from '../../../types';
import MellowLpRouter from '../mellowLpRouter';
import MellowLpVault from '../mellowLpVault';
import { getMellowConfig, getMellowConfigV1 } from './config';
import { MellowProduct } from './types';

export const getMellowLPVaults = ({
  network,
  providerURL,
}: {
  network: string;
  providerURL: string;
}): MellowProduct[] => {
  const config = getMellowConfig({
    network,
    providerURL,
  });

  const vaults: MellowProduct[] = config.MELLOW_VAULTS.filter((item) => item.metadata.show).map(
    (item) => {
      const vault = new MellowLpVault({
        id: item.voltzVault,
        ethWrapperAddress: config.MELLOW_ETH_WRAPPER,
        erc20RootVaultAddress: item.erc20RootVault,
        provider: config.PROVIDER,
        metadata: {
          ...item.metadata,
          underlyingPools: item.metadata.vaults.reduce((allPools, currentVault) => {
            if (currentVault.weight > 0) {
              const appendingPools = currentVault.pools.filter((p) => !allPools.includes(p));
              return [...allPools, ...appendingPools];
            }
            return allPools;
          }, [] as string[]),
        },
      });

      return vault;
    },
  );

  const routers: MellowProduct[] = config.MELLOW_ROUTERS.filter((item) => item.metadata.show).map(
    (item) => {
      const vault = new MellowLpRouter({
        // TODO: remove special case after cost-reduction QA
        id:
          item.router === '0x7AaA278531D0baCb2aC483be3edDFf83E09564Aa'
            ? 'mellow-eth-cost-opt'
            : `mellow-${item.metadata.token.toLowerCase()}`,
        mellowRouterAddress: item.router,
        provider: config.PROVIDER,
        metadata: {
          ...item.metadata,
          underlyingPools: item.metadata.vaults.reduce((allPools, currentVault) => {
            if (currentVault.weight > 0) {
              const appendingPools = currentVault.pools.filter((p) => !allPools.includes(p));
              return [...allPools, ...appendingPools];
            }
            return allPools;
          }, [] as string[]),
        },
      });

      return vault;
    },
  );

  return routers.concat(vaults);
};

export const getMellowLPVaultsV1 = ({
  chainId,
  alchemyApiKey,
}: {
  chainId: SupportedChainId;
  alchemyApiKey: string;
}): MellowProduct[] => {
  const config = getMellowConfigV1(chainId);

  const vaults: MellowProduct[] = config.MELLOW_VAULTS.filter((item) => item.metadata.show).map(
    (item) => {
      const vault = new MellowLpVault({
        id: item.voltzVault,
        ethWrapperAddress: config.MELLOW_ETH_WRAPPER,
        erc20RootVaultAddress: item.erc20RootVault,
        provider: getProviderV1(chainId, alchemyApiKey),
        metadata: {
          ...item.metadata,
          underlyingPools: item.metadata.vaults.reduce((allPools, currentVault) => {
            if (currentVault.weight > 0) {
              const appendingPools = currentVault.pools.filter((p) => !allPools.includes(p));
              return [...allPools, ...appendingPools];
            }
            return allPools;
          }, [] as string[]),
        },
      });

      return vault;
    },
  );

  const routers: MellowProduct[] = config.MELLOW_ROUTERS.filter((item) => item.metadata.show).map(
    (item) => {
      const vault = new MellowLpRouter({
        // TODO: remove special case after cost-reduction QA
        id:
          item.router === '0x7AaA278531D0baCb2aC483be3edDFf83E09564Aa'
            ? 'mellow-eth-cost-opt'
            : `mellow-${item.metadata.token.toLowerCase()}`,
        mellowRouterAddress: item.router,
        provider: getProviderV1(chainId, alchemyApiKey),
        metadata: {
          ...item.metadata,
          underlyingPools: item.metadata.vaults.reduce((allPools, currentVault) => {
            if (currentVault.weight > 0) {
              const appendingPools = currentVault.pools.filter((p) => !allPools.includes(p));
              return [...allPools, ...appendingPools];
            }
            return allPools;
          }, [] as string[]),
        },
      });

      return vault;
    },
  );

  return routers.concat(vaults);
};
