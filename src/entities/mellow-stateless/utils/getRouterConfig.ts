import { getMellowConfig } from '../config/config';
import { MellowRouter } from '../config/types';

export const getRouterConfig = (routerId: string): MellowRouter => {
  const config = getMellowConfig();

  const routerConfig = config.MELLOW_ROUTERS.find(
    (item) => item.router.toLowerCase() === routerId.toLowerCase(),
  );

  if (!routerConfig) {
    // TODO: add sentry
    throw new Error('Router ID not found');
  }

  return routerConfig;
};
