import { DEPOSIT_WINDOW } from '../../../constants';
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
                Date.now().valueOf() + DEPOSIT_WINDOW > vault.maturityTimestampMS
                  ? 0
                  : vault.weight,
            };
          }),
        },
      };
    }),
  };
};
