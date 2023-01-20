import {
  BrowserClient,
  makeFetchTransport,
  defaultStackParser,
  defaultIntegrations,
} from '@sentry/browser';
import { ethers } from 'ethers';
import { initMellowConfig } from './entities/mellow-stateless/config/config';

let sentryTracker: BrowserClient | null = null;
let provider: ethers.providers.JsonRpcProvider | null = null;

export const initSentryTracker = (): void => {
  sentryTracker = new BrowserClient({
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

export const initProvider = (providerURL: string): void => {
  provider = new ethers.providers.JsonRpcProvider(providerURL);
};

export const init = ({ providerURL, network }: { providerURL: string; network: string }): void => {
  // Initialize Sentry
  initSentryTracker();

  // Initialize JSON RPC Provider
  initProvider(providerURL);

  // Initialize Mellow Config
  initMellowConfig(network);
};

export const getSentryTracker = (): BrowserClient => {
  if (!sentryTracker) {
    throw new Error('Sentry tracker is not set up!');
  }
  return sentryTracker;
};

export const getProvider = (): ethers.providers.JsonRpcProvider => {
  if (!provider) {
    throw new Error('Provider is not set up!');
  }

  return provider;
};
