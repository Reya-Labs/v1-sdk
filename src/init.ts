import {
  BrowserClient,
  makeFetchTransport,
  defaultStackParser,
  defaultIntegrations,
} from '@sentry/browser';
import { ethers } from 'ethers';
import { SubgraphURLEnum, SupportedChainId } from './types';
import providerApiKeyToURL from './utils/providerApiKeyToURL';
import initSubgraphURLs from './utils/initSubgraphURLs';

let sentryTracker: BrowserClient | null;

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

export const getProvider = (
  chainId: SupportedChainId,
  alchemyApiKey: string,
  infuraApiKey: string,
): ethers.providers.JsonRpcProvider => {
  const providerURL = providerApiKeyToURL(chainId, alchemyApiKey, infuraApiKey);
  return new ethers.providers.JsonRpcProvider(providerURL);
};

export const getSubgraphURL = (
  chainId: SupportedChainId,
  subgraphURLType: SubgraphURLEnum,
): string => {
  const subgraphURLs = initSubgraphURLs(chainId);
  return subgraphURLs[subgraphURLType];
};

export const getSentryTracker = (): BrowserClient => {
  if (!sentryTracker) {
    throw new Error('Sentry tracker is not set up!');
  }
  return sentryTracker;
};

export const init = (): void => {
  sentryTracker = initSentryTracker();
};
