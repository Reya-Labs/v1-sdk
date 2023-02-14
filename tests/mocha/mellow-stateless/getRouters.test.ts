import { network, waffle } from 'hardhat';
import { describe, before } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import * as initSDK from '../../../src/init';
import * as initMellowConfig from '../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig } from './utils';
import { OptimiserInfo } from '../../../src/entities/mellow-stateless/getters/types';
import { getAllMellowProducts } from '../../../src/entities/mellow-stateless/getters';
import { withSigner } from '../../utils';
import * as priceFetch from '../../../src/utils/priceFetch';

const { provider } = waffle;

describe('Mellow Optimiser:GetOptimisers', () => {
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

    sinon.stub(priceFetch, 'geckoEthToUsd').resolves(1);
  };

  const restore = async () => {
    sinon.restore();
  };

  describe('ETH optimiser with no user connected', () => {
    const ethOptimiserId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    let ethOptimiserInfo: OptimiserInfo;

    before(async () => {
      await mock();
      const mellowOptimisers = await getAllMellowProducts(null);
      await restore();

      ethOptimiserInfo = mellowOptimisers[1];
      expect(ethOptimiserInfo.optimiserId).to.be.eq(ethOptimiserId);
    });

    it.skip('Optimiser info', async () => {
      expect(ethOptimiserInfo.soon).to.be.eq(false);
      expect(ethOptimiserInfo.title).to.be.eq('MELLOW - ETH');
      expect(ethOptimiserInfo.description).to.be.eq('B');
      expect(ethOptimiserInfo.underlyingPools).to.be.deep.eq(['Compound - ETH']);
      expect(ethOptimiserInfo.tokenName).to.be.eq('ETH');
      expect(ethOptimiserInfo.expired).to.be.eq(false);
      expect(ethOptimiserInfo.depositable).to.be.eq(true);

      expect(ethOptimiserInfo.userWalletBalance).to.be.eq(0);
      expect(ethOptimiserInfo.userOptimiserDeposit).to.be.eq(0);
      expect(ethOptimiserInfo.userOptimiserCommittedDeposit).to.be.eq(0);
      expect(ethOptimiserInfo.userOptimiserPendingDeposit).to.be.eq(0);
      expect(ethOptimiserInfo.isUserRegisteredForAutoRollover).to.be.eq(false);
    });

    it('Deprecated vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[1];
      expect(vaultInfo.vaultId).to.be.eq('0x1C4808DE8F806a611b30ECbaFA20C52D1209ecB6');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([10, 10]);
      expect(vaultInfo.defaultWeight).to.be.eq(0);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1672500292000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0);
      expect(vaultInfo.canUserManageVault).to.be.eq(false);
    });

    it.skip('Active vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[4];
      expect(vaultInfo.vaultId).to.be.eq('0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([30, 30]);
      expect(vaultInfo.defaultWeight).to.be.eq(50);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1676542449000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0);
      expect(vaultInfo.canUserManageVault).to.be.eq(false);
    });
  });

  describe('ETH optimiser with user connected', () => {
    const ethOptimiserId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    const userAddress = '0xF8F6B70a36f4398f0853a311dC6699Aba8333Cc1';
    let ethOptimiserInfo: OptimiserInfo;

    before(async () => {
      await mock();
      await withSigner(network, userAddress, async (signer) => {
        const mellowOptimisers = await getAllMellowProducts(signer);
        ethOptimiserInfo = mellowOptimisers[1];
      });
      await restore();

      expect(ethOptimiserInfo.optimiserId).to.be.eq(ethOptimiserId);
    });

    it('Optimiser info', async () => {
      expect(ethOptimiserInfo.userWalletBalance).to.be.eq(4722.366482869646);
      expect(ethOptimiserInfo.userOptimiserDeposit).to.be.eq(0.2953577313582509);
      expect(ethOptimiserInfo.userOptimiserCommittedDeposit).to.be.eq(0.2953577313582509);
      expect(ethOptimiserInfo.userOptimiserPendingDeposit).to.be.eq(0);
      expect(ethOptimiserInfo.isUserRegisteredForAutoRollover).to.be.eq(true);
    });

    it('Deprecated vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[1];
      expect(vaultInfo.vaultId).to.be.eq('0x1C4808DE8F806a611b30ECbaFA20C52D1209ecB6');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([10, 10]);
      expect(vaultInfo.defaultWeight).to.be.eq(0);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1672500292000);
      expect(vaultInfo.withdrawable).to.be.eq(true);
      expect(vaultInfo.rolloverable).to.be.eq(true);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0);
      expect(vaultInfo.canUserManageVault).to.be.eq(true);
    });

    it.skip('Active vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[4];
      expect(vaultInfo.vaultId).to.be.eq('0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([30, 30]);
      expect(vaultInfo.defaultWeight).to.be.eq(50);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1676542449000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0.1643572955315569);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0.1643572955315569);
      expect(vaultInfo.canUserManageVault).to.be.eq(false);
    });
  });
});

describe('getOptimisers', () => {
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

    sinon.stub(priceFetch, 'geckoEthToUsd').resolves(1);
  };

  const restore = async () => {
    sinon.restore();
  };

  describe('ETH optimiser with no user connected', () => {
    const ethOptimiserId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    let ethOptimiserInfo: OptimiserInfo;

    before(async () => {
      await mock();
      const mellowOptimisers = await getAllMellowProducts(null);
      await restore();

      ethOptimiserInfo = mellowOptimisers[1];
      expect(ethOptimiserInfo.optimiserId).to.be.eq(ethOptimiserId);
    });

    it.skip('Optimiser info', async () => {
      expect(ethOptimiserInfo.soon).to.be.eq(false);
      expect(ethOptimiserInfo.title).to.be.eq('MELLOW - ETH');
      expect(ethOptimiserInfo.description).to.be.eq('B');
      expect(ethOptimiserInfo.underlyingPools).to.be.deep.eq(['Compound - ETH']);
      expect(ethOptimiserInfo.tokenName).to.be.eq('ETH');
      expect(ethOptimiserInfo.expired).to.be.eq(false);
      expect(ethOptimiserInfo.depositable).to.be.eq(true);

      expect(ethOptimiserInfo.userWalletBalance).to.be.eq(0);
      expect(ethOptimiserInfo.userOptimiserDeposit).to.be.eq(0);
      expect(ethOptimiserInfo.userOptimiserCommittedDeposit).to.be.eq(0);
      expect(ethOptimiserInfo.userOptimiserPendingDeposit).to.be.eq(0);
      expect(ethOptimiserInfo.isUserRegisteredForAutoRollover).to.be.eq(false);
    });

    it('Deprecated vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[1];
      expect(vaultInfo.vaultId).to.be.eq('0x1C4808DE8F806a611b30ECbaFA20C52D1209ecB6');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([10, 10]);
      expect(vaultInfo.defaultWeight).to.be.eq(0);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1672500292000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0);
      expect(vaultInfo.canUserManageVault).to.be.eq(false);
    });

    it.skip('Active vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[4];
      expect(vaultInfo.vaultId).to.be.eq('0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([30, 30]);
      expect(vaultInfo.defaultWeight).to.be.eq(50);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1676542449000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0);
      expect(vaultInfo.canUserManageVault).to.be.eq(false);
    });
  });

  describe('ETH optimiser with user connected', () => {
    const ethOptimiserId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    const userAddress = '0xF8F6B70a36f4398f0853a311dC6699Aba8333Cc1';
    let ethOptimiserInfo: OptimiserInfo;

    before(async () => {
      await mock();
      await withSigner(network, userAddress, async (signer) => {
        const mellowOptimisers = await getAllMellowProducts(signer);
        ethOptimiserInfo = mellowOptimisers[1];
      });
      await restore();

      expect(ethOptimiserInfo.optimiserId).to.be.eq(ethOptimiserId);
    });

    it('Optimiser info', async () => {
      expect(ethOptimiserInfo.userWalletBalance).to.be.eq(4722.366482869646);
      expect(ethOptimiserInfo.userOptimiserDeposit).to.be.eq(0.2953577313582509);
      expect(ethOptimiserInfo.userOptimiserCommittedDeposit).to.be.eq(0.2953577313582509);
      expect(ethOptimiserInfo.userOptimiserPendingDeposit).to.be.eq(0);
      expect(ethOptimiserInfo.isUserRegisteredForAutoRollover).to.be.eq(true);
    });

    it('Deprecated vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[1];
      expect(vaultInfo.vaultId).to.be.eq('0x1C4808DE8F806a611b30ECbaFA20C52D1209ecB6');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([10, 10]);
      expect(vaultInfo.defaultWeight).to.be.eq(0);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1672500292000);
      expect(vaultInfo.withdrawable).to.be.eq(true);
      expect(vaultInfo.rolloverable).to.be.eq(true);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0);
      expect(vaultInfo.canUserManageVault).to.be.eq(true);
    });

    it.skip('Active vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[4];
      expect(vaultInfo.vaultId).to.be.eq('0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([30, 30]);
      expect(vaultInfo.defaultWeight).to.be.eq(50);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1676542449000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0.1643572955315569);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0.1643572955315569);
      expect(vaultInfo.canUserManageVault).to.be.eq(false);
    });
  });
});
