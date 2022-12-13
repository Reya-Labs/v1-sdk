import { ONE_HOUR_IN_MS } from '../../../constants';
import { NetworkConfiguration } from './types';

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
                Date.now().valueOf() + 48 * ONE_HOUR_IN_MS > vault.maturityTimestampMS
                  ? 0
                  : vault.weight,
            };
          }),
        },
      };
    }),
  };
};
