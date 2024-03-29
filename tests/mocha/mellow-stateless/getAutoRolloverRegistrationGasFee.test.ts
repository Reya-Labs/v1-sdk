import { network, waffle } from 'hardhat';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { expect } from 'chai';
import * as initSDK from '../../../src/init';
import * as initMellowConfig from '../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig } from './utils';
import { fail, withSigner } from '../../utils';
import { registerForAutoRollover } from '../../../src/entities/mellow-stateless/actions/registerForAutoRollover';
import * as priceFetch from '../../../src/utils/priceFetch';
import providerApiKeyToURL from '../../../src/utils/providerApiKeyToURL';

const { provider } = waffle;

const DELTA = 0.0001;

describe('Mellow Optimiser:Gas Fee for AutoRollover Registration', () => {
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

    sinon.stub(priceFetch, 'geckoEthToUsd').resolves(1);
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

  describe('ETH registration', () => {
    it('registration in vault blocked', async () => {
      const optimiserId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';

      await withSigner(network, userAddress, async (signer) => {
        try {
          await registerForAutoRollover({
            onlyGasEstimate: true,
            optimiserId,
            registration: true,
            signer,
            chainId: 1, // doesn't matter, provider mocked
            alchemyApiKey: '',
            infuraApiKey: '', // doesn't matter, provider mocked
          });
          fail();
        } catch (_) {}
      });
    });

    it('register in ETH', async () => {
      const optimiserId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
      await withSigner(network, userAddress, async (signer) => {
        const fee = (
          await registerForAutoRollover({
            onlyGasEstimate: true,
            optimiserId,
            registration: false,
            signer,
            chainId: 1, // doesn't matter, provider mocked
            alchemyApiKey: '',
            infuraApiKey: '', // doesn't matter, provider mocked
          })
        ).gasEstimateUsd;

        expect(fee).to.be.closeTo(0.00023464839913624799, DELTA);
      });
    });

    it('registers in USDC', async () => {
      const optimiserId = '0x9f397CD24103A0a0252DeC82a88e656480C53fB7';

      await withSigner(network, userAddress, async (signer) => {
        const fee = (
          await registerForAutoRollover({
            onlyGasEstimate: true,
            optimiserId,
            registration: false,
            signer,
            chainId: 1, // doesn't matter, provider mocked
            alchemyApiKey: '',
            infuraApiKey: '', // doesn't matter, provider mocked
          })
        ).gasEstimateUsd;

        expect(fee).to.be.closeTo(0.00012932421998012398, DELTA);
      });
    });
  });
});
