import { getAMMs as getRawAMMs, AMM as RawAMM } from '@voltz-protocol/subgraph-data';
import { getSentryTracker } from '../../init';
import { RateOracle } from '../rateOracle';
import Token from '../token';
import { AMM } from './amm';
import { getConfig } from './voltz-config/getConfig';

type GetAMMsArgs = {
  network: string;
  providerURL: string;
  subgraphURL: string;
};

type GetAMMsResponse = {
  amms: AMM[];
  error: string | undefined;
};

export const getAMMs = async ({
  network,
  providerURL,
  subgraphURL,
}: GetAMMsArgs): Promise<GetAMMsResponse> => {
  const config = getConfig({
    network,
    providerURL,
  });

  const poolIds = config.pools.map((pool) => pool.id.toLowerCase());
  const whitelistedPoolIds = config.pools
    .filter((pool) => pool.show.general)
    .map((pool) => pool.id.toLowerCase());

  let rawAMMs: RawAMM[] = [];
  let error: string | undefined;

  try {
    rawAMMs = await getRawAMMs(subgraphURL, Date.now().valueOf(), {
      ammIDs: config.apply ? whitelistedPoolIds : undefined,
    });
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

  const amms = sortedRawAMMs.map((rawAmm) => {
    return new AMM({
      id: rawAmm.id,
      signer: null,
      provider: config.PROVIDER,
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
    });
  });

  return {
    amms,
    error,
  };
};
