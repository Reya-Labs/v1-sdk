import { network, waffle } from 'hardhat';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { expect } from 'chai';
import * as initSDK from '../../../src/init';
import * as initMellowConfig from '../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig, RETRY_ATTEMPTS } from './utils';
import { fail, withSigner } from '../../utils';
import { depositAndRegister } from '../../../src/entities/mellow-stateless/mellow-routers/depositAndRegister';
import { getMellowProduct } from '../../../src/entities/mellow-stateless/getters/getMellowProduct';
import { exponentialBackoff } from '../../../src/utils/retry';

const { provider } = waffle;
const DELTA = 0.00001;

describe('getRouters', () => {
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

  describe('ETH router deposit', () => {
    it('deposit in vault blocked', async () => {
      const routerId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';
      const amount = 0.1;

      await withSigner(network, userAddress, async (signer) => {
        try {
          await exponentialBackoff(
            () =>
              depositAndRegister({
                routerId,
                amount,
                spareWeights: [['0x5de7a5BbEDcE4a739b8a8D1cdA15D71924BDC9f7', 100]],
                signer,
                registration: true,
              }),
            RETRY_ATTEMPTS,
          );
          fail();
        } catch (_) {}
      });
    });

    it('deposit in ETH', async () => {
      const routerId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
      const amount = 0.1;
      await withSigner(network, userAddress, async (signer) => {
        const routerState = await getMellowProduct({
          routerId,
          userAddress,
        });

        const { newRouterState } = await exponentialBackoff(
          () =>
            depositAndRegister({
              routerId,
              amount,
              spareWeights: [['0x5de7a5BbEDcE4a739b8a8D1cdA15D71924BDC9f7', 100]],
              signer,
              registration: true,
            }),
          RETRY_ATTEMPTS,
        );

        expect(newRouterState.userRouterDeposit - routerState.userRouterDeposit).to.be.closeTo(
          amount,
          DELTA,
        );

        expect(
          newRouterState.vaults[5].userVaultDeposit - routerState.vaults[5].userVaultDeposit,
        ).to.be.closeTo(amount, DELTA);

        expect(newRouterState.isUserRegisteredForAutoRollover).to.be.eq(true);
      });
    });

    it('deposit in USDC', async () => {
      const routerId = '0x9f397CD24103A0a0252DeC82a88e656480C53fB7';
      const amount = 10;

      await withSigner(network, userAddress, async (signer) => {
        const routerState = await getMellowProduct({
          routerId,
          userAddress,
        });

        const { newRouterState } = await exponentialBackoff(
          () =>
            depositAndRegister({
              routerId,
              amount,
              spareWeights: [['0x4972C5f24E6EDfD479ba989b204bD376503D48d8', 100]],
              signer,
              registration: true,
            }),
          RETRY_ATTEMPTS,
        );

        expect(newRouterState.userRouterDeposit - routerState.userRouterDeposit).to.be.closeTo(
          amount,
          DELTA,
        );

        expect(
          newRouterState.vaults[3].userVaultDeposit - routerState.vaults[3].userVaultDeposit,
        ).to.be.closeTo(amount, DELTA);

        expect(newRouterState.isUserRegisteredForAutoRollover).to.be.eq(true);
      });
    });
  });
});
