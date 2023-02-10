import {
  BrowserClient,
  makeFetchTransport,
  defaultStackParser,
  defaultIntegrations,
} from '@sentry/browser';
import { ethers } from 'ethers';
import { initMellowConfigV1 } from './entities/mellow-stateless/config/config';
import { InitArgs, SDKStorage, SubgraphURLEnum, SupportedNetworksEnum } from './types';
import alchemyApiKeyToURL from './utils/alchemyApiKeyToURL';
import initSubgraphURLs from './utils/initSubgraphURLs';

const sdkStorage: SDKStorage = {
  network: null,
  provider: null,
  subgraphURLs: null,
  sentryTracker: null,
};

export const initSentryTracker = (): BrowserClient => {
  return new BrowserClient({
    dsn: 'https://c170b1643b064f2cb57b2204e1e3bf5f@o4504239616294912.ingest.sentry.io/4504247590060032',
    transport: makeFetchTransport,
    stackParser: defaultStackParser,
    integrations: defaultIntegrations,
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
    // do not edit this, it is subject to be changed automatically by scripts/release.js
    release: '<VERSION>',
  });
};

export const getNetwork = (): SupportedNetworksEnum => {
  if (!sdkStorage.network) {
    throw new Error('Network is not set up!');
  }

  return sdkStorage.network;
};

export const getProvider = (): ethers.providers.JsonRpcProvider => {
  if (!sdkStorage.provider) {
    throw new Error('Provider is not set up!');
  }

  return sdkStorage.provider;
};

export const getSubgraphURL = (subgraphURLType: SubgraphURLEnum): string => {
  if (!sdkStorage.subgraphURLs) {
    throw new Error('Subgraph URLs are not set up!');
  }

  return sdkStorage.subgraphURLs[subgraphURLType];
};

export const getSentryTracker = (): BrowserClient => {
  if (!sdkStorage.sentryTracker) {
    throw new Error('Sentry tracker is not set up!');
  }
  return sdkStorage.sentryTracker;
};

export const init = ({ providerURL, network }: { providerURL: string; network: string }): void => {
  const networkChainId = ethers.providers.getNetwork(network).chainId;
  if (!Object.values(SupportedNetworksEnum).includes(networkChainId)) {
    throw new Error('Unsupported network!');
  }

  sdkStorage.sentryTracker = initSentryTracker();

  sdkStorage.network = networkChainId;
  sdkStorage.provider = new ethers.providers.JsonRpcProvider(providerURL);

  initMellowConfigV1();
};

export const rearm = ({ network, alchemyApiKey }: InitArgs): void => {
  sdkStorage.network = network;

  const providerURL = alchemyApiKeyToURL(alchemyApiKey);
  sdkStorage.provider = new ethers.providers.JsonRpcProvider(providerURL);

  sdkStorage.subgraphURLs = initSubgraphURLs();

  if ([SupportedNetworksEnum.mainnet, SupportedNetworksEnum.goerli].find((x) => x === network)) {
    initMellowConfigV1();
  }
};

export const initV1 = ({ network, alchemyApiKey }: InitArgs): void => {
  rearm({ network, alchemyApiKey });
  sdkStorage.sentryTracker = initSentryTracker();
};
