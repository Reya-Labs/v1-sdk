import { network, waffle } from 'hardhat';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { expect } from 'chai';
import * as initSDK from '../../../src/init';
import * as initMellowConfig from '../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig, RETRY_ATTEMPTS } from './utils';
import { fail, withSigner } from '../../utils';
import { rollover } from '../../../src/entities/mellow-stateless/actions/rollover';
import { getMellowProduct } from '../../../src/entities/mellow-stateless/getters/getMellowProduct';
import { exponentialBackoff } from '../../../src/utils/retry';

const { provider } = waffle;
const DELTA = 0.00001;

describe('Mellow Router:Rollover', () => {
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
    const block = 8375800;
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

  describe('ETH router rollover', () => {
    it('rollover in vault blocked', async () => {
      const routerId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';
      const vaultId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';

      await withSigner(network, userAddress, async (signer) => {
        try {
          await exponentialBackoff(
            () =>
              rollover({
                routerId,
                vaultId,
                spareWeights: [['0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB', 0]],
                signer,
              }),
            RETRY_ATTEMPTS,
          );
          fail();
        } catch (_) {}
      });
    });

    it('rollover in ETH', async () => {
      const routerId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
      const vaultId = '0xca5ecDeb7f6E3E6d40E685ac49E76aC8EeE7049B';

      await withSigner(network, userAddress, async (signer) => {
        const routerState = await getMellowProduct({
          routerId,
          userAddress,
        });

        const { newRouterState } = await exponentialBackoff(
          () =>
            rollover({
              routerId,
              vaultId,
              spareWeights: [
                ['0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706', 50],
                ['0x5de7a5BbEDcE4a739b8a8D1cdA15D71924BDC9f7', 50],
              ],
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        if (!newRouterState) {
          throw new Error('Failure');
        }

        expect(newRouterState.userRouterDeposit - routerState.userRouterDeposit).to.be.closeTo(
          0,
          DELTA,
        );

        expect(
          newRouterState.vaults[4].userVaultDeposit - routerState.vaults[4].userVaultDeposit,
        ).to.be.closeTo(0.011, DELTA);

        expect(
          newRouterState.vaults[5].userVaultDeposit - routerState.vaults[5].userVaultDeposit,
        ).to.be.closeTo(0.011, DELTA);
      });
    });

    it('rollover in USDC', async () => {
      const routerId = '0x9f397CD24103A0a0252DeC82a88e656480C53fB7';
      const vaultId = '0xAb0f8CeE5fa7e3D577d1a546Aeb11fE5c768c75E';

      await withSigner(network, userAddress, async (signer) => {
        const routerState = await getMellowProduct({
          routerId,
          userAddress,
        });

        const { newRouterState } = await exponentialBackoff(
          () =>
            rollover({
              routerId,
              vaultId,
              spareWeights: [['0x4972C5f24E6EDfD479ba989b204bD376503D48d8', 100]],
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        if (!newRouterState) {
          throw new Error('Failure');
        }

        expect(newRouterState.userRouterDeposit - routerState.userRouterDeposit).to.be.closeTo(
          0,
          DELTA,
        );

        expect(
          newRouterState.vaults[3].userVaultDeposit - routerState.vaults[3].userVaultDeposit,
        ).to.be.closeTo(27.3, DELTA);
      });
    });
  });
});
