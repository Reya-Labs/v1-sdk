import { ethers, network, waffle } from 'hardhat';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { expect } from 'chai';
import { descale } from '../../../src/utils/scaling';
import * as initSDK from '../../../src/init';
import * as initMellowConfig from '../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig, RETRY_ATTEMPTS } from './utils';
import { withSigner } from '../../utils';
import { withdraw } from '../../../src/entities/mellow-stateless/actions/withdraw';
import { getMellowProduct } from '../../../src/entities/mellow-stateless/getters/getMellowProduct';
import { IERC20MinimalABI, MellowDepositWrapperABI } from '../../../src/ABIs';
import { exponentialBackoff } from '../../../src/utils/retry';

const { provider } = waffle;
const DELTA = 0.00001;

describe('Mellow Optimiser:Withdraw', () => {
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

  describe('ETH optimiser withdraw', () => {
    it('withdraw in vault active', async () => {
      const optimiserId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';
      const vaultId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';

      await withSigner(network, userAddress, async (signer) => {
        // Get ERC20 vault contract
        const wrapperId = '0xcF2f79d8DF97E09BF5c4DBF3F953aeEF4f4a204d';
        const ethWrapper = new ethers.Contract(wrapperId, MellowDepositWrapperABI, signer);

        // Make a deposit (since current deposit is 0)
        await exponentialBackoff(
          () =>
            ethWrapper.deposit(optimiserId, 0, [], {
              value: '100000000000000000',
            }),
          RETRY_ATTEMPTS,
        );

        // Get the token contract
        const wethContract = new ethers.Contract(
          '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
          IERC20MinimalABI,
          signer,
        );

        const balance = descale(
          await exponentialBackoff(() => wethContract.balanceOf(userAddress), RETRY_ATTEMPTS),
          18,
        );

        const optimiserState = await getMellowProduct({
          optimiserId,
          signer,
        });

        await exponentialBackoff(
          () =>
            withdraw({
              optimiserId,
              vaultId,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        const newBalance = descale(
          await exponentialBackoff(() => wethContract.balanceOf(userAddress), RETRY_ATTEMPTS),
          18,
        );

        const { newOptimiserState } = await exponentialBackoff(
          () =>
            withdraw({
              optimiserId,
              vaultId,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        if (!newOptimiserState) {
          throw new Error('Failure');
        }

        // Nothing to withdraw, change 0
        expect(
          newOptimiserState.userOptimiserDeposit - optimiserState.userOptimiserDeposit,
        ).to.be.closeTo(-0.1, DELTA);

        // Nothing to withdraw, change 0
        expect(newBalance - balance).to.be.closeTo(0.1, DELTA);
      });
    });

    it('withdraw in ETH', async () => {
      const optimiserId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
      const vaultId = '0xca5ecDeb7f6E3E6d40E685ac49E76aC8EeE7049B';

      await withSigner(network, userAddress, async (signer) => {
        const optimiserState = await getMellowProduct({
          optimiserId,
          signer,
        });

        const { newOptimiserState } = await exponentialBackoff(
          () =>
            withdraw({
              optimiserId,
              vaultId,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        if (!newOptimiserState) {
          throw new Error('Failure');
        }

        expect(
          newOptimiserState.userOptimiserDeposit - optimiserState.userOptimiserDeposit,
        ).to.be.closeTo(-0.022, DELTA);
      });
    });

    it('withdraw in USDC', async () => {
      const optimiserId = '0x9f397CD24103A0a0252DeC82a88e656480C53fB7';
      const vaultId = '0xAb0f8CeE5fa7e3D577d1a546Aeb11fE5c768c75E';

      await withSigner(network, userAddress, async (signer) => {
        const optimiserState = await getMellowProduct({
          optimiserId,
          signer,
        });

        const { newOptimiserState } = await exponentialBackoff(
          () =>
            withdraw({
              optimiserId,
              vaultId,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        if (!newOptimiserState) {
          throw new Error('Failure');
        }

        expect(
          newOptimiserState.userOptimiserDeposit - optimiserState.userOptimiserDeposit,
        ).to.be.closeTo(0, DELTA);

        expect(
          newOptimiserState.userWalletBalance - optimiserState.userWalletBalance,
        ).to.be.closeTo(0, DELTA);
      });
    });
  });
});
