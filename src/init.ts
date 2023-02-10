import {
  BrowserClient,
  makeFetchTransport,
  defaultStackParser,
  defaultIntegrations,
} from '@sentry/browser';
import { ethers } from 'ethers';
import { initMellowConfig } from './entities/mellow-stateless/config/config';
import { SubgraphURLEnum, SupportedChainId } from './types';
import alchemyApiKeyToURL from './utils/alchemyApiKeyToURL';
import initSubgraphURLs from './utils/initSubgraphURLs';

let sentryTracker: BrowserClient | null;
let subgraphURLs: { [key in SubgraphURLEnum]: string } | null;

// TO DO: to be deleted
let provider: ethers.providers.JsonRpcProvider | null;
// TO DO: to be deleted
export const getProvider = (): ethers.providers.JsonRpcProvider => {
  if (!provider) {
    throw new Error('Provider is not set up!');
  }

  return provider;
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

export const getProviderV1 = (
  chainId: SupportedChainId,
  alchemyApiKey: string,
): ethers.providers.JsonRpcProvider => {
  if (provider) {
    return provider;
  }

  const providerURL = alchemyApiKeyToURL(chainId, alchemyApiKey);
  return new ethers.providers.JsonRpcProvider(providerURL);
};

export const getSubgraphURL = (
  chainId: SupportedChainId,
  subgraphURLType: SubgraphURLEnum,
): string => {
  if (!subgraphURLs) {
    subgraphURLs = initSubgraphURLs(chainId);
  }

  return subgraphURLs[subgraphURLType];
};

export const getSentryTracker = (): BrowserClient => {
  if (!sentryTracker) {
    throw new Error('Sentry tracker is not set up!');
  }
  return sentryTracker;
};

export const init = ({ providerURL, network }: { providerURL: string; network: string }): void => {
  const networkChainId = ethers.providers.getNetwork(network).chainId;
  if (!Object.values(SupportedChainId).includes(networkChainId)) {
    throw new Error('Unsupported network!');
  }

  sentryTracker = initSentryTracker();
  provider = new ethers.providers.JsonRpcProvider(providerURL);
  initMellowConfig(network);
};

export const initV1 = (): void => {
  sentryTracker = initSentryTracker();
};
