import { network, waffle } from 'hardhat';
import { describe } from 'mocha';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { expect } from 'chai';
import { ethers } from 'ethers';
import { IERC20MinimalABI } from '../../../../src/ABIs';
import * as initSDK from '../../../../src/init';
import * as initMellowConfig from '../../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig, RETRY_ATTEMPTS } from '../../mellow-stateless/utils';
import { fail, withSigner } from '../../../utils';
import { approveToken } from '../../../../src/services/token/approveToken';
import { MaxUint256Bn } from '../../../../src/constants';
import { exponentialBackoff } from '../../../../src/utils/retry';
import * as priceFetch from '../../../../src/utils/priceFetch';

const { provider } = waffle;

describe('Utilities:ApproveToken', () => {
  const userAddress = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

  const resetNetwork = async (blockNumber: number) => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          chainId: 1,
          forking: {
            jsonRpcUrl: process.env.MAINNET_URL,
            blockNumber,
          },
        },
      ],
    });
  };

  const mock = async () => {
    const block = 16469730;

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

  describe('token approvals', () => {
    it('approve USDC with specified amount', async () => {
      const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const to = '0x1111111111111111111111111111111111111111';

      await withSigner(network, userAddress, async (signer) => {
        await exponentialBackoff(
          () =>
            approveToken({
              tokenId,
              to,
              amount: 10,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);

        const allowance = await exponentialBackoff(
          () => tokenContract.allowance(userAddress, to),
          RETRY_ATTEMPTS,
        );
        expect(allowance).to.be.eq('10000000');
      });
    });

    it('approve USDC with no specified amount', async () => {
      const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const to = '0x1111111111111111111111111111111111111111';

      await withSigner(network, userAddress, async (signer) => {
        await exponentialBackoff(
          () =>
            approveToken({
              tokenId,
              to,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);

        const allowance = await tokenContract.allowance(userAddress, to);
        expect(allowance).to.be.eq(MaxUint256Bn);
      });
    });

    it('approve 0 USDC', async () => {
      const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const to = '0x1111111111111111111111111111111111111111';

      await withSigner(network, userAddress, async (signer) => {
        await exponentialBackoff(
          () =>
            approveToken({
              tokenId,
              amount: 0,
              to,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);

        const allowance = await exponentialBackoff(
          () => tokenContract.allowance(userAddress, to),
          RETRY_ATTEMPTS,
        );
        expect(allowance).to.be.eq(0);
      });
    });

    it('approve WETH', async () => {
      const tokenId = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
      const to = '0x1111111111111111111111111111111111111111';

      await withSigner(network, userAddress, async (signer) => {
        await exponentialBackoff(
          () =>
            approveToken({
              tokenId,
              amount: 10,
              to,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);

        const allowance = await tokenContract.allowance(userAddress, to);
        expect(allowance).to.be.eq('10000000000000000000');
      });
    });

    it('approve USDT', async () => {
      const tokenId = '0xdac17f958d2ee523a2206206994597c13d831ec7';
      const to = '0x1111111111111111111111111111111111111111';

      await withSigner(network, userAddress, async (signer) => {
        await exponentialBackoff(
          () =>
            approveToken({
              tokenId,
              amount: 10,
              to,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);

        const allowance = await exponentialBackoff(
          () => tokenContract.allowance(userAddress, to),
          RETRY_ATTEMPTS,
        );
        expect(allowance).to.be.eq('10000000');
      });
    });

    it('approve USDT fails when trying to re-approve', async () => {
      const tokenId = '0xdac17f958d2ee523a2206206994597c13d831ec7';
      const to = '0x1111111111111111111111111111111111111111';

      await withSigner(network, userAddress, async (signer) => {
        await exponentialBackoff(
          () =>
            approveToken({
              tokenId,
              amount: 10,
              to,
              signer,
            }),
          RETRY_ATTEMPTS,
        );

        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);

        const allowance = await exponentialBackoff(
          () => tokenContract.allowance(userAddress, to),
          RETRY_ATTEMPTS,
        );
        expect(allowance).to.be.eq('10000000');

        try {
          await exponentialBackoff(
            () =>
              approveToken({
                tokenId,
                amount: 10,
                to,
                signer,
              }),
            RETRY_ATTEMPTS,
          );
          fail();
        } catch (error: unknown) {
          expect((error as Error).message === 'The current approval needs to be reset first.');
        }
      });
    });
  });
});
