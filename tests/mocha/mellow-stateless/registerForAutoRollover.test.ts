import { network, waffle } from 'hardhat';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { expect } from 'chai';
import * as initSDK from '../../../src/init';
import * as initMellowConfig from '../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig, RETRY_ATTEMPTS } from './utils';
import { fail, withSigner } from '../../utils';
import { registerForAutoRollover } from '../../../src/entities/mellow-stateless/actions/registerForAutoRollover';
import { exponentialBackoff } from '../../../src/utils/retry';

const { provider } = waffle;

describe('registration for autorollover', () => {
  const userAddress = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

  const resetNetwork = async (blockNumber: number) => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          chainId: 5,
          forking: {
            jsonRpcUrl: process.env.GOERLI_URL,
            blockNumber,
          },
        },
      ],
    });
  };

  const mock = async () => {
    const block = 8344555;
    await resetNetwork(block);

    sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );

    sinon.stub(initSDK, 'getProvider').callsFake(() => provider);

    sinon.stub(initMellowConfig, 'getMellowConfig').callsFake(() => MockGoerliConfig);
  };

  const restore = async () => {
    // restore the original implementation of initSDK.getSentryTracker
    (initSDK.getSentryTracker as sinon.SinonStub).restore();

    // restore the original implementation of initSDK.getProvider
    (initSDK.getProvider as sinon.SinonStub).restore();

    // restore the original implementation of initMellowConfig.getMellowConfig
    (initMellowConfig.getMellowConfig as sinon.SinonStub).restore();
  };

  beforeEach(async () => {
    await mock();
  });

  afterEach(async () => {
    await restore();
  });

  describe('ETH router register', () => {
    it('register in vault blocked', async () => {
      const routerId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';

      await withSigner(network, userAddress, async (signer) => {
        try {
          await exponentialBackoff(
            () =>
              registerForAutoRollover({
                routerId,
                signer,
                registration: true,
              }),
            RETRY_ATTEMPTS,
          );
          fail();
        } catch (_) {}
      });
    });

    it('register in ETH', async () => {
      const routerId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
      await withSigner(network, userAddress, async (signer) => {
        const { newRouterState } = await exponentialBackoff(
          () =>
            registerForAutoRollover({
              routerId,
              signer,
              registration: true,
            }),
          RETRY_ATTEMPTS,
        );

        if (!newRouterState) {
          throw new Error('Failure');
        }

        expect(newRouterState.isUserRegisteredForAutoRollover).to.be.eq(true);
      });
    });

    it('register in USDC', async () => {
      const routerId = '0x9f397CD24103A0a0252DeC82a88e656480C53fB7';

      await withSigner(network, userAddress, async (signer) => {
        const { newRouterState } = await exponentialBackoff(
          () =>
            registerForAutoRollover({
              routerId,
              signer,
              registration: true,
            }),
          RETRY_ATTEMPTS,
        );

        if (!newRouterState) {
          throw new Error('Failure');
        }

        expect(newRouterState.isUserRegisteredForAutoRollover).to.be.eq(true);
      });
    });
  });
});
