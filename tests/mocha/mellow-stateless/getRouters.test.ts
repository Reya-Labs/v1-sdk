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

  describe('ETH optimiser with no user connected', () => {
    const ethOptimiserId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    let ethOptimiserInfo: OptimiserInfo;

    before(async () => {
      await mock();
      const mellowOptimisers = await getAllMellowProducts();
      await restore();

      ethOptimiserInfo = mellowOptimisers[1];
      expect(ethOptimiserInfo.optimiserId).to.be.eq(ethOptimiserId);
    });

    it('Optimiser info', async () => {
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

    it('Active vault', async () => {
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
      const mellowOptimisers = await getAllMellowProducts(userAddress);
      await restore();

      ethOptimiserInfo = mellowOptimisers[1];
      expect(ethOptimiserInfo.optimiserId).to.be.eq(ethOptimiserId);
    });

    it('Optimiser info', async () => {
      expect(ethOptimiserInfo.userWalletBalance).to.be.eq(5.505181556948178);
      expect(ethOptimiserInfo.userOptimiserDeposit).to.be.eq(0.09164338331246726);
      expect(ethOptimiserInfo.userOptimiserCommittedDeposit).to.be.eq(0.09164338331246726);
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
      expect(vaultInfo.withdrawable).to.be.eq(true);
      expect(vaultInfo.rolloverable).to.be.eq(true);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0);
      expect(vaultInfo.canUserManageVault).to.be.eq(true);
    });

    it('Active vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[4];
      expect(vaultInfo.vaultId).to.be.eq('0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([30, 30]);
      expect(vaultInfo.defaultWeight).to.be.eq(50);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1676542449000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0.061193054465384554);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0.061193054465384554);
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

  describe('ETH optimiser with no user connected', () => {
    const ethOptimiserId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    let ethOptimiserInfo: OptimiserInfo;

    before(async () => {
      await mock();
      const mellowOptimisers = await getAllMellowProducts();
      await restore();

      ethOptimiserInfo = mellowOptimisers[1];
      expect(ethOptimiserInfo.optimiserId).to.be.eq(ethOptimiserId);
    });

    it('Optimiser info', async () => {
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

    it('Active vault', async () => {
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
      const mellowOptimisers = await getAllMellowProducts(userAddress);
      await restore();

      ethOptimiserInfo = mellowOptimisers[1];
      expect(ethOptimiserInfo.optimiserId).to.be.eq(ethOptimiserId);
    });

    it('Optimiser info', async () => {
      expect(ethOptimiserInfo.userWalletBalance).to.be.eq(5.505181556948178);
      expect(ethOptimiserInfo.userOptimiserDeposit).to.be.eq(0.09164338331246726);
      expect(ethOptimiserInfo.userOptimiserCommittedDeposit).to.be.eq(0.09164338331246726);
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
      expect(vaultInfo.withdrawable).to.be.eq(true);
      expect(vaultInfo.rolloverable).to.be.eq(true);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0);
      expect(vaultInfo.canUserManageVault).to.be.eq(true);
    });

    it('Active vault', async () => {
      const vaultInfo = ethOptimiserInfo.vaults[4];
      expect(vaultInfo.vaultId).to.be.eq('0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([30, 30]);
      expect(vaultInfo.defaultWeight).to.be.eq(50);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1676542449000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0.061193054465384554);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0.061193054465384554);
      expect(vaultInfo.canUserManageVault).to.be.eq(false);
    });
  });
});
