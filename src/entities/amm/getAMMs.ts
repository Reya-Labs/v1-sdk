import { getAMMs as getRawAMMs, AMM as RawAMM } from '@voltz-protocol/subgraph-data';
import { isUndefined } from 'lodash';
import { getProvider, getSentryTracker, getSubgraphURL } from '../../init';
import { SubgraphURLEnum, SupportedChainId } from '../../types';
import { RateOracle } from '../rateOracle';
import Token from '../token';
import { AMM } from './amm';
import { getVoltzPoolConfig } from './voltz-config';
import { Factory__factory as factoryFactory } from '../../typechain';
import { exponentialBackoff } from '../../utils/retry';

type GetAMMsResponse = {
  amms: AMM[];
  error: string | undefined;
};

type GetAMMsArgs = {
  chainId: SupportedChainId;
  alchemyApiKey: string;
  active?: boolean;
};

export const getAMMs = async ({
  chainId,
  alchemyApiKey,
  active,
}: GetAMMsArgs): Promise<GetAMMsResponse> => {
  const config = getVoltzPoolConfig(chainId);

  const poolIds = config.pools.map((pool) => pool.id.toLowerCase());
  const whitelistedPoolIds = config.pools
    .filter((pool) => pool.show.general)
    .map((pool) => pool.id.toLowerCase());

  let rawAMMs: RawAMM[] = [];
  let error: string | undefined;

  try {
    rawAMMs = await getRawAMMs(
      getSubgraphURL(chainId, SubgraphURLEnum.voltzProtocol),
      Date.now().valueOf(),
      {
        ammIDs: config.apply ? whitelistedPoolIds : undefined,
        active,
      },
    );
  } catch (err) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(err);
    sentryTracker.captureMessage('Failed to fetch AMMs from the subgraph');

    error = 'Failed to fetch AMMs from the subgraph';
  }

  const sortedRawAMMs = rawAMMs.slice().sort((a, b) => {
    const aIndex = poolIds.findIndex((p) => p.toLowerCase() === a.id.toLowerCase());
    const bIndex = poolIds.findIndex((p) => p.toLowerCase() === b.id.toLowerCase());

    return aIndex - bIndex;
  });

  const factoryContract = factoryFactory.connect(
    config.factoryAddress,
    getProvider(chainId, alchemyApiKey),
  );
  const peripheryAddress = await exponentialBackoff(() => factoryContract.periphery());

  const amms = sortedRawAMMs.map((rawAmm, index) => {
    return new AMM({
      id: rawAmm.id,
      signer: null,
      provider: getProvider(chainId, alchemyApiKey),
      peripheryAddress,
      factoryAddress: config.factoryAddress,
      marginEngineAddress: rawAmm.marginEngineId,
      rateOracle: new RateOracle({
        id: rawAmm.rateOracleId,
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
    await Promise.allSettled(amms.map((amm) => amm.refreshInfo()));
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
