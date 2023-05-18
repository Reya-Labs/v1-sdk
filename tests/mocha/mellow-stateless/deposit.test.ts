import { network, waffle } from 'hardhat';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { expect } from 'chai';
import * as initSDK from '../../../src/init';
import * as initMellowConfig from '../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig, RETRY_ATTEMPTS } from './utils';
import { fail, withSigner } from '../../utils';
import { deposit } from '../../../src/entities/mellow-stateless/actions/deposit';
import { getMellowProduct } from '../../../src/entities/mellow-stateless/getters/getMellowProduct';
import { exponentialBackoff } from '../../../src/utils/retry';
import * as priceFetch from '../../../src/utils/priceFetch';
import providerApiKeyToURL from '../../../src/utils/providerApiKeyToURL';

const { provider } = waffle;
const DELTA = 0.00001;

describe('Mellow Optimiser:Deposit', () => {
  const userAddress = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

  const resetNetwork = async (blockNumber: number) => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          chainId: 5,
          forking: {
            jsonRpcUrl: providerApiKeyToURL(
              5,
              process.env.ALCHEMY_API_KEY || '',
              process.env.INFURE_API_KEY || '',
            ),
            blockNumber,
          },
        },
      ],
    });
  };

  const mock = async () => {
    const block = 8403950;
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

    sinon.stub(priceFetch, 'geckoEthToUsd').resolves(1000);
  };

  const restore = async () => {
    sinon.restore();
  };

  beforeEach(async () => {
    await mock();
  });

  afterEach(async () => {
    await restore();
  });

  describe('ETH optimiser deposit', () => {
    it('deposit in vault blocked', async () => {
      const optimiserId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';
      const amount = 0.1;

      await withSigner(network, userAddress, async (signer) => {
        try {
          await exponentialBackoff(
            () =>
              deposit({
                optimiserId,
                amount,
                spareWeights: [['0x5de7a5BbEDcE4a739b8a8D1cdA15D71924BDC9f7', 100]],
                signer,
                chainId: 1, // doesn't matter, provider mocked
                alchemyApiKey: '',
                infuraApiKey: '', // doesn't matter, provider mocked
              }),
            RETRY_ATTEMPTS,
          );
          fail();
        } catch (_) {}
      });
    });

    it('deposit in ETH', async () => {
      const optimiserId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
      const amount = 0.1;
      const fee = 0.01;
      await withSigner(network, userAddress, async (signer) => {
        const optimiserState = await getMellowProduct({
          optimiserId,
          signer,
          chainId: 1, // doesn't matter, provider mocked
          alchemyApiKey: '',
          infuraApiKey: '', // doesn't matter, provider mocked
        });

        const { newOptimiserState } = await exponentialBackoff(
          () =>
            deposit({
              optimiserId,
              amount,
              spareWeights: [['0x5de7a5BbEDcE4a739b8a8D1cdA15D71924BDC9f7', 100]],
              signer,
              chainId: 1, // doesn't matter, provider mocked
              alchemyApiKey: '',
              infuraApiKey: '', // doesn't matter, provider mocked
            }),
          RETRY_ATTEMPTS,
        );

        if (!newOptimiserState) {
          throw new Error('Failure');
        }

        expect(
          newOptimiserState.userOptimiserDeposit - optimiserState.userOptimiserDeposit,
        ).to.be.closeTo(amount - fee, DELTA);

        expect(
          newOptimiserState.vaults[5].userVaultDeposit - optimiserState.vaults[5].userVaultDeposit,
        ).to.be.closeTo(amount - fee, DELTA);
      });
    });

    it('deposit in USDC', async () => {
      const optimiserId = '0x9f397CD24103A0a0252DeC82a88e656480C53fB7';
      const amount = 10;
      const fee = 1;

      await withSigner(network, userAddress, async (signer) => {
        const optimiserState = await getMellowProduct({
          optimiserId,
          signer,
          chainId: 1, // doesn't matter, provider mocked
          alchemyApiKey: '',
          infuraApiKey: '', // doesn't matter, provider mocked
        });

        const { newOptimiserState } = await exponentialBackoff(
          () =>
            deposit({
              optimiserId,
              amount,
              spareWeights: [['0x4972C5f24E6EDfD479ba989b204bD376503D48d8', 100]],
              signer,
              chainId: 1, // doesn't matter, provider mocked
              alchemyApiKey: '',
              infuraApiKey: '', // doesn't matter, provider mocked
            }),
          RETRY_ATTEMPTS,
        );

        if (!newOptimiserState) {
          throw new Error('Failure');
        }

        expect(
          newOptimiserState.userOptimiserDeposit - optimiserState.userOptimiserDeposit,
        ).to.be.closeTo(amount - fee, DELTA);

        expect(
          newOptimiserState.vaults[3].userVaultDeposit - optimiserState.vaults[3].userVaultDeposit,
        ).to.be.closeTo(amount - fee, DELTA);
      });
    });
  });
});
