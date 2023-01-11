import {
  BrowserClient,
  makeFetchTransport,
  defaultStackParser,
  defaultIntegrations,
} from '@sentry/browser';

import { init as initSubgraphDataSentry } from '@voltz-protocol/subgraph-data';

let sentryTracker: BrowserClient | null = null;

export const init = (): void => {
  initSubgraphDataSentry();

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

export const getSentryTracker = (): BrowserClient => {
  if (!sentryTracker) {
    throw new Error('Sentry tracker is not setup!');
  }
  return sentryTracker;
};
