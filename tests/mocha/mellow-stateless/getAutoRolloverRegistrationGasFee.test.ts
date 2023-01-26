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
import * as priceFetcher from '../../../src/utils/priceFetch';

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

    sinon.stub(priceFetcher, 'geckoEthToUsd').resolves(1);

    sinon.stub(initMellowConfig, 'getMellowConfig').callsFake(() => MockGoerliConfig);
  };

  const restore = async () => {
    // restore the original implementation of initSDK.getSentryTracker
    (initSDK.getSentryTracker as sinon.SinonStub).restore();

    // restore the original implementation of initSDK.getProvider
    (initSDK.getProvider as sinon.SinonStub).restore();

    // restore the original implementation of priceFetcher.geckoEthToUsd
    (priceFetcher.geckoEthToUsd as sinon.SinonStub).restore();

    // restore the original implementation of initMellowConfig.getMellowConfig
    (initMellowConfig.getMellowConfig as sinon.SinonStub).restore();
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
            registration: true,
            signer,
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
          })
        ).gasEstimateUsd;

        expect(fee).to.be.closeTo(0.00012932421998012398, DELTA);
      });
    });
  });
});
