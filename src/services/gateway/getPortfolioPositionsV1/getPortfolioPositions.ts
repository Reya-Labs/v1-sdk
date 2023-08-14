import axios from 'axios';
import { getSentryTracker } from '../../../init';
import { SupportedChainId } from '../../../types';
import { getServiceUrl } from '../urls';
import { getVoltzPoolConfig } from '../../../entities/amm/voltz-config/getConfig';
import { V1V2PortfolioPosition } from '@voltz-protocol/api-sdk-v2';
import { adjustForGLPPositions } from './adjustForGLPPositions';
import { adjustForAavePositions } from './adjustForAavePositions';

export const getPortfolioPositions = async (
  chainIds: SupportedChainId[],
  ownerAddress: string,
): Promise<V1V2PortfolioPosition[]> => {
  try {
    const baseUrl = getServiceUrl('v1v2-positions');
    const url = `${baseUrl}/${chainIds.join('&')}/${ownerAddress.toLowerCase()}`;

    const res = await axios.get<V1V2PortfolioPosition[]>(url, {
      withCredentials: false,
    });

    let positions = res.data;

    positions = adjustForGLPPositions(positions);
    positions = adjustForAavePositions(positions);

    // todo: move this config and filtering on the API side
    for (const chainId of chainIds) {
      const config = getVoltzPoolConfig(chainId);

      if (config.apply) {
        const whitelistedPoolIds = config.pools
          .filter((pool) => pool.show.general)
          .map((pool) => pool.id.toLowerCase());

        positions = positions.filter((item) => {
          if (!(item.pool.chainId === chainId)) {
            return true;
          }

          return whitelistedPoolIds.includes(item.pool.vamm.toLowerCase());
        });
      }
    }

    return positions;
  } catch (e) {
    console.error(e);
    const sentryTracker = getSentryTracker();
    sentryTracker.captureMessage(
      `GCloud Portfolio Positions API unavailable with message ${(e as Error).message}`,
    );

    return [];
  }
};
