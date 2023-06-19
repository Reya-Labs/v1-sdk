import { getProvider, getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { RateOracle } from '../rateOracle';
import Token from '../token';
import { AMM } from './amm';
import { getVoltzPoolConfig } from './voltz-config';
import {
  RawAMM,
  getPoolsGCloud,
  RawV1V2AMM,
  getV1V2PoolsGCloud,
} from '../../services/v1-indexer/getPoolsGCloud';
import { getVoltzSinglePoolConfig } from './voltz-config/getConfig';

type GetAMMsResponse = {
  amms: AMM[];
  error: string | undefined;
};

type GetAMMsArgs = {
  chainIds: SupportedChainId[];
  alchemyApiKey: string;
  infuraApiKey: string;
};

export const getAMMs = async ({
  chainIds,
  alchemyApiKey,
  infuraApiKey,
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

  // todo: move this config and filtering on the API side
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

        return whitelistedPoolIds.includes(item.vamm.toLowerCase());
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

  const amms = sortedRawAMMs.map((rawAmm) => {
    const networkConfig = getVoltzPoolConfig(rawAmm.chainId);
    const poolConfig = getVoltzSinglePoolConfig(rawAmm.chainId, rawAmm.vamm);

    return new AMM({
      chainId: rawAmm.chainId,
      id: rawAmm.vamm,

      signer: null,
      provider: getProvider(rawAmm.chainId, alchemyApiKey, infuraApiKey),

      peripheryAddress: networkConfig.peripheryAddress,
      factoryAddress: networkConfig.factoryAddress,

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
      wethAddress: networkConfig.wethAddress,

      minLeverageAllowed: poolConfig.minLeverageAllowed || networkConfig.defaultMinLeverageAllowed,
      traderVisible: poolConfig.show.trader,
      traderWithdrawable: poolConfig.traderWithdrawable,
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

export const getV1V2AMMs = async ({
  chainIds,
  alchemyApiKey,
  infuraApiKey,
}: GetAMMsArgs): Promise<GetAMMsResponse> => {
  let rawAMMs: RawV1V2AMM[] = [];
  let error: string | undefined;

  try {
    rawAMMs = await getV1V2PoolsGCloud(chainIds);
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

  const amms = sortedRawAMMs.map((rawAmm) => {
    const networkConfig = getVoltzPoolConfig(rawAmm.chainId);
    const poolConfig = getVoltzSinglePoolConfig(rawAmm.chainId, rawAmm.vamm);

    return new AMM({
      chainId: rawAmm.chainId,
      id: rawAmm.vamm,

      signer: null,
      provider: getProvider(rawAmm.chainId, alchemyApiKey, infuraApiKey),

      peripheryAddress: networkConfig.peripheryAddress,
      factoryAddress: networkConfig.factoryAddress,

      marginEngineAddress: rawAmm.marginEngine,
      rateOracle: new RateOracle({
        id: rawAmm.rateOracle.address,
        protocolId: rawAmm.rateOracle.protocolId,
      }),
      termStartTimestampInMS: rawAmm.termStartTimestampInMS * (rawAmm.isV2 ? 1000 : 0),
      termEndTimestampInMS: rawAmm.termEndTimestampInMS * (rawAmm.isV2 ? 1000 : 0),
      underlyingToken: new Token({
        id: rawAmm.underlyingToken.address,
        name: rawAmm.underlyingToken.name,
        decimals: rawAmm.underlyingToken.tokenDecimals,
      }),
      tickSpacing: rawAmm.tickSpacing,
      wethAddress: networkConfig.wethAddress,

      minLeverageAllowed: poolConfig.minLeverageAllowed || networkConfig.defaultMinLeverageAllowed,
      traderVisible: poolConfig.show.trader,
      traderWithdrawable: poolConfig.traderWithdrawable,

      fixedApr: rawAmm.isV2 ? rawAmm.currentFixedRate : 0,
      variableApy: rawAmm.isV2 ? rawAmm.currentVariableRate : 0,
      variableApy24Ago: rawAmm.isV2 ? rawAmm.currentVariableRate + rawAmm.variableRateChange : 0,
    });
  });

  try {
    await Promise.allSettled(
      amms
        .filter((amm) => Date.now().valueOf() <= amm.termEndTimestampInMS && !amm.isV2)
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
