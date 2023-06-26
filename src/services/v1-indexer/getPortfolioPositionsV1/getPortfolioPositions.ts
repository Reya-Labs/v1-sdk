import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';
import { getServiceUrl } from '../urls';
import { PortfolioPosition } from './types';
import { getVoltzPoolConfig } from '../../../entities/amm/voltz-config/getConfig';

export const getPortfolioPositions = async (
  chainIds: SupportedChainId[],
  ownerAddress: string,
): Promise<PortfolioPosition[]> => {
  try {
    const baseUrl = getServiceUrl('v1v2-positions');
    const url = `${baseUrl}/${chainIds.join('&')}/${ownerAddress.toLowerCase()}`;

    const res = await axios.get<PortfolioPosition[]>(url, {
      withCredentials: false,
    });

    let positions = res.data;

    // todo: move this config and filtering on the API side
    for (const chainId of chainIds) {
      const config = getVoltzPoolConfig(chainId);

      if (config.apply) {
        const whitelistedPoolIds = config.pools
          .filter((pool) => pool.show.general)
          .map((pool) => pool.id.toLowerCase());

        positions = positions.filter((item) => {
          if (!(item.amm.chainId === chainId)) {
            return true;
          }

          return whitelistedPoolIds.includes(item.amm.id.toLowerCase());
        });
      }
    }

    return positions;
  } catch (e) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud Portfolio Positions API unavailable with message ${(e as Error).message}`,
    );

    return [];
  }
};
