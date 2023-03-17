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
import { withSigner } from '../../../utils';
import { isTokenApproved } from '../../../../src/services/token/isTokenApproved';
import { exponentialBackoff } from '../../../../src/utils/retry';
import * as priceFetch from '../../../../src/utils/priceFetch';

const { provider } = waffle;

describe('Utilities:IsTokenApproved', () => {
  const userAddress = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';
  const chainId = 1;
  const alchemyApiKey = 'key';

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

  describe('token approvals', () => {
    it('USDC token not approved against default threshold', async () => {
      const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const to = '0x1111111111111111111111111111111111111111';

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(false);
    });

    it('USDC token not approved against specific threshold', async () => {
      const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const to = '0x1111111111111111111111111111111111111111';

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        threshold: 1,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(false);
    });

    it('USDC token approved comparing to 0', async () => {
      const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const to = '0x1111111111111111111111111111111111111111';

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        threshold: 0,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(true);
    });

    it('USDC token approval of 5 USDC passes against 1 USDC', async () => {
      const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const to = '0x1111111111111111111111111111111111111111';

      // approve 5 USDC
      await withSigner(network, userAddress, async (signer) => {
        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);
        await exponentialBackoff(() => tokenContract.approve(to, '5000000'), RETRY_ATTEMPTS);
      });

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        threshold: 1,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(true);
    });

    it('USDC token approval of 5 USDC does not pass against 10 USDC', async () => {
      const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const to = '0x1111111111111111111111111111111111111111';

      // approve 5 USDC
      await withSigner(network, userAddress, async (signer) => {
        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);
        await exponentialBackoff(() => tokenContract.approve(to, '5000000'), RETRY_ATTEMPTS);
      });

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        threshold: 10,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(false);
    });

    it('USDC token approval of 5 USDC does not pass against default threshold', async () => {
      const tokenId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      const to = '0x1111111111111111111111111111111111111111';

      // approve 5 USDC
      await withSigner(network, userAddress, async (signer) => {
        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);
        await exponentialBackoff(() => tokenContract.approve(to, '5000000'), RETRY_ATTEMPTS);
      });

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(false);
    });

    it('ETH token approval passes by default', async () => {
      const tokenId = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
      const to = '0x1111111111111111111111111111111111111111';

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(true);
    });

    it('WETH token approval does not by default', async () => {
      const tokenId = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
      const to = '0x1111111111111111111111111111111111111111';

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        forceErc20: true,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(false);
    });

    it('WETH token approval passes against 2 WETH after approval of 5 WETH', async () => {
      const tokenId = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
      const to = '0x1111111111111111111111111111111111111111';

      // approve 5 WETH
      await withSigner(network, userAddress, async (signer) => {
        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);
        await exponentialBackoff(
          () => tokenContract.approve(to, '5000000000000000000'),
          RETRY_ATTEMPTS,
        );
      });

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        forceErc20: true,
        threshold: 2,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(true);
    });

    it('WETH token approval does not against 10 WETH after approval of 5 WETH', async () => {
      const tokenId = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
      const to = '0x1111111111111111111111111111111111111111';

      // approve 5 WETH
      await withSigner(network, userAddress, async (signer) => {
        const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);
        await exponentialBackoff(
          () => tokenContract.approve(to, '5000000000000000000'),
          RETRY_ATTEMPTS,
        );
      });

      const approval = await isTokenApproved({
        tokenId,
        userAddress,
        to,
        forceErc20: true,
        threshold: 10,
        chainId,
        alchemyApiKey,
      });

      expect(approval).to.be.eq(false);
    });
  });
});
