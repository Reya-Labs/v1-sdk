import { NetworkConfiguration } from './types';

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

export const disableMaturedWeights = (config: NetworkConfiguration): NetworkConfiguration => {
  return {
    ...config,
    MELLOW_ROUTERS: config.MELLOW_ROUTERS.map((router) => {
      return {
        ...router,
        metadata: {
          ...router.metadata,
          vaults: router.metadata.vaults.map((vault) => {
            return {
              ...vault,
              weight:
                Date.now().valueOf() > vault.maturityTimestampMS - 48 * ONE_HOUR_IN_MS
                  ? 0
                  : vault.weight,
            };
          }),
        },
      };
    }),
  };
};
