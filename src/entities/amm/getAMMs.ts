import { getProvider, getSentryTracker } from '../../init';
import { SupportedChainId } from '../../types';
import { RateOracle } from '../rateOracle';
import Token from '../token';
import { AMM } from './amm';
import { Factory__factory as factoryFactory } from '../../typechain';
import { exponentialBackoff } from '../../utils/retry';
import { RawAMM, getPoolsGCloud } from './services/getPoolsGCloud';
import { getVoltzPoolConfig } from './voltz-config';

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

  let rawAMMs: RawAMM[] = [];
  let error: string | undefined;

  try {
    rawAMMs = await getPoolsGCloud(chainId);

    if (config.apply) {
      rawAMMs = rawAMMs.filter((item) => !item.hidden);
    }
  } catch (err) {
    const sentryTracker = getSentryTracker();
    sentryTracker.captureException(err);
    sentryTracker.captureMessage('Failed to fetch AMMs from the subgraph');

    error = 'Failed to fetch AMMs from the subgraph';
  }

  if (active) {
    rawAMMs = rawAMMs.filter((item) => item.termEndTimestampInMS > Date.now().valueOf());
  }

  const factoryContract = factoryFactory.connect(
    config.factoryAddress,
    getProvider(chainId, alchemyApiKey),
  );
  const peripheryAddress = await exponentialBackoff(() => factoryContract.periphery());

  const amms = rawAMMs.map((rawAmm) => {
    return new AMM({
      id: rawAmm.vamm,
      signer: null,
      provider: getProvider(chainId, alchemyApiKey),
      peripheryAddress,
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
        rawAmm.minLeverageAllowed > 0
          ? rawAmm.minLeverageAllowed
          : config.defaultMinLeverageAllowed,

      hidden: rawAmm.hidden,
      traderHidden: rawAmm.traderHidden,
      traderWithdrawable: rawAmm.traderWithdrawable,

      rollover: rawAmm.rollover.length > 0 ? rawAmm.rollover : undefined,
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
