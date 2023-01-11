import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { CRITICAL_ERROR_MESSAGE } from '../../src/utils/errors/constants';
import { getReadableErrorMessage } from '../../src/utils/errors/errorHandling';
import * as initSDK from '../../src/init';

describe('getReadableErrorMessage', () => {
  beforeEach(() => {
    sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );
  });

  afterEach(() => {
    // restore the original implementation of initSDK.getSentryTracker
    (initSDK.getSentryTracker as sinon.SinonStub).restore();
  });

  describe('Default Metamask - Infura errors', async () => {
    it('Custom error', async () => {
      const error = {
        error: {
          code: -32603,
          message: 'execution reverted',
          data: {
            originalError: {
              code: 3,
              data: '0x43f283210000000000000000000000000000000000000000000000000000000c0d24cfabfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffef215fffffffffffffffffffffffffffffffffffffffffffffffffffff0c62bb06bed0000000000000000000000000000000000000000000000000000058ebd20aa950000000000000000000000000000000000000000000000000000000069a47660ffffffffffffffffffffffffffffffffffffffffffffffffffffeb4dfdfca4ef',
              message: 'execution reverted',
            },
          },
        },
      };

      const errorMessage = getReadableErrorMessage(error);
      expect(errorMessage).to.be.eq('Not enough margin for this operation');
    });

    it('Unrecognised custom error', async () => {
      const error = {
        error: {
          code: -32603,
          message: 'execution reverted',
          data: {
            originalError: {
              code: 3,
              data: '0x43f283200000000000000000000000000000000000000000000000000000000c0d24cfabfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffef215fffffffffffffffffffffffffffffffffffffffffffffffffffff0c62bb06bed0000000000000000000000000000000000000000000000000000058ebd20aa950000000000000000000000000000000000000000000000000000000069a47660ffffffffffffffffffffffffffffffffffffffffffffffffffffeb4dfdfca4ef',
              message: 'execution reverted',
            },
          },
        },
      };

      try {
        getReadableErrorMessage(error);
      } catch (err: unknown) {
        expect((err as Error).message).to.be.eq(CRITICAL_ERROR_MESSAGE);
      }
    });

    it('Compatible string error', async () => {
      const error = {
        error: {
          code: -32603,
          message: 'execution reverted',
          data: {
            originalError: {
              code: 3,
              data: '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000353504c0000000000000000000000000000000000000000000000000000000000',
              message: 'execution reverted',
            },
          },
        },
      };

      const errorMessage = getReadableErrorMessage(error);
      expect(errorMessage).to.be.eq('No notional available in that direction');
    });

    it('Incompatible string error', async () => {
      const error = {
        error: {
          code: -32603,
          message: 'execution reverted',
          data: {
            originalError: {
              code: 3,
              data: '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000353504c000000000000000000000000000000000000000000000000000000000',
              message: 'execution reverted',
            },
          },
        },
      };

      const errorMessage = getReadableErrorMessage(error);
      expect(errorMessage).to.be.eq(CRITICAL_ERROR_MESSAGE);
    });
  });

  describe('Ankr errors', async () => {
    it('Custom error', async () => {
      const error = {
        code: -32603,
        message: 'Internal JSON-RPC error.',
        data: {
          code: 3,
          message: 'execution reverted',
          data: '0x43f283210000000000000000000000000000000000000000000000000000000c0d0c4b1cfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffef215fffffffffffffffffffffffffffffffffffffffffffffffffffff0c6327f067a0000000000000000000000000000000000000000000000000000058ebd20aa950000000000000000000000000000000000000000000000000000000069a3ae8effffffffffffffffffffffffffffffffffffffffffffffffffffeb4dfdfca4ef',
        },
      };

      const errorMessage = getReadableErrorMessage(error);
      expect(errorMessage).to.be.eq('Not enough margin for this operation');
    });
  });

  describe('Alchemy errors', async () => {
    it('Custom error', async () => {
      const error = {
        code: -32603,
        message: 'Internal JSON-RPC error.',
        data: {
          code: 3,
          message: 'execution reverted',
          data: '0x43f283210000000000000000000000000000000000000000000000000000000c0d07d3e4fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffef215fffffffffffffffffffffffffffffffffffffffffffffffffffff0c633bbe1170000000000000000000000000000000000000000000000000000058ebd20aa950000000000000000000000000000000000000000000000000000000069a38a3effffffffffffffffffffffffffffffffffffffffffffffffffffeb4dfdfca4ef',
        },
      };

      const errorMessage = getReadableErrorMessage(error);
      expect(errorMessage).to.be.eq('Not enough margin for this operation');
    });
  });

  describe('Unsupported error types', async () => {
    it('Custom error', async () => {
      const error = {
        code: -32603,
        message: 'Internal JSON-RPC error.',
      };

      try {
        getReadableErrorMessage(error);
      } catch (err) {
        expect((err as Error).message).to.be.eq(CRITICAL_ERROR_MESSAGE);
      }
    });
  });
});
