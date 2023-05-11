import { isUndefined } from 'lodash';
import { getProvider, getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { RateOracle } from '../rateOracle';
import Token from '../token';
import { AMM } from './amm';
import { getVoltzPoolConfig } from './voltz-config';
import { RawAMM, getPoolsGCloud } from '../../services/v1-indexer/getPoolsGCloud';

type GetAMMsResponse = {
  amms: AMM[];
  error: string | undefined;
};

type GetAMMsArgs = {
  chainIds: SupportedChainId[];
  alchemyApiKey: string;
};

export const getAMMs = async ({
  chainIds,
  alchemyApiKey,
}: GetAMMsArgs): Promise<GetAMMsResponse> => {
  let rawAMMs: RawAMM[] = [];
  let error: string | undefined;

  try {
    rawAMMs = await getPoolsGCloud(chainIds);
  } catch (err) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(err);
    sentryTracker.captureMessage('Failed to fetch AMMs from the indexer');

    error = 'Failed to fetch AMMs from the indexer';
  }

  for (const chainId of chainIds) {
    const config = getVoltzPoolConfig(chainId);

    if (config.apply) {
      const whitelistedPoolIds = config.pools
        .filter((pool) => pool.show.general)
        .map((pool) => pool.id.toLowerCase());

      rawAMMs = rawAMMs.filter((item) => {
        if (!(item.chainId === chainId)) {
          return true;
        }

        return whitelistedPoolIds.map((w) => w.toLowerCase()).includes(item.vamm.toLowerCase());
      });
    }
  }

  const sortedRawAMMs = rawAMMs.slice().sort((a, b) => {
    if (a.chainId === b.chainId) {
      const config = getVoltzPoolConfig(a.chainId);
      const poolIds = config.pools.map((pool) => pool.id.toLowerCase());

      const aIndex = poolIds.findIndex((p) => p.toLowerCase() === a.vamm.toLowerCase());
      const bIndex = poolIds.findIndex((p) => p.toLowerCase() === b.vamm.toLowerCase());

      return aIndex - bIndex;
    }

    return a.chainId - b.chainId;
  });

  const amms = sortedRawAMMs.map((rawAmm, index) => {
    const config = getVoltzPoolConfig(rawAmm.chainId);

    return new AMM({
      id: rawAmm.vamm,
      signer: null,
      provider: getProvider(rawAmm.chainId, alchemyApiKey),
      peripheryAddress: config.peripheryAddress,
      factoryAddress: config.factoryAddress,
      marginEngineAddress: rawAmm.marginEngine,
      rateOracle: new RateOracle({
        id: rawAmm.rateOracle,
        protocolId: rawAmm.protocolId,
      }),
      termStartTimestampInMS: rawAmm.termStartTimestampInMS,
      termEndTimestampInMS: rawAmm.termEndTimestampInMS,
      underlyingToken: new Token({
        id: rawAmm.tokenId,
        name: rawAmm.tokenName,
        decimals: rawAmm.tokenDecimals,
      }),
      tickSpacing: rawAmm.tickSpacing,
      wethAddress: config.wethAddress,
      minLeverageAllowed:
        index < config.pools.length && !isUndefined(config.pools[index].minLeverageAllowed)
          ? (config.pools[index].minLeverageAllowed as number)
          : config.defaultMinLeverageAllowed,
    });
  });

  try {
    await Promise.allSettled(
      amms
        .filter((amm) => Date.now().valueOf() <= amm.termEndTimestampInMS)
        .map((amm) => amm.refreshInfo()),
    );
  } catch (err) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(err);
    sentryTracker.captureMessage('');

    error = 'Amms failed to be initialized';
  }

  return {
    amms,
    error,
  };
};
