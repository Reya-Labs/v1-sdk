import { network, waffle } from 'hardhat';
import { describe, before } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import * as initSDK from '../../../src/init';
import * as initMellowConfig from '../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig } from './utils';
import { RouterInfo } from '../../../src/entities/mellow-stateless/getters/types';
import { getAllMellowProducts } from '../../../src/entities/mellow-stateless/getters';

const { provider } = waffle;

describe('getRouters', () => {
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

  describe('ETH router with no user connected', () => {
    const ethRouterId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    let ethRouterInfo: RouterInfo;

    before(async () => {
      await mock();
      const mellowRouters = await getAllMellowProducts();
      await restore();

      ethRouterInfo = mellowRouters[1];
      expect(ethRouterInfo.routerId).to.be.eq(ethRouterId);
    });

    it('Router info', async () => {
      expect(ethRouterInfo.soon).to.be.eq(false);
      expect(ethRouterInfo.title).to.be.eq('MELLOW - ETH');
      expect(ethRouterInfo.description).to.be.eq('B');
      expect(ethRouterInfo.underlyingPools).to.be.deep.eq(['Compound - ETH']);
      expect(ethRouterInfo.tokenId).to.be.eq('0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6');
      expect(ethRouterInfo.expired).to.be.eq(false);
      expect(ethRouterInfo.depositable).to.be.eq(true);

      expect(ethRouterInfo.userWalletBalance).to.be.eq(0);
      expect(ethRouterInfo.userRouterDeposit).to.be.eq(0);
      expect(ethRouterInfo.userRouterCommittedDeposit).to.be.eq(0);
      expect(ethRouterInfo.userRouterPendingDeposit).to.be.eq(0);
      expect(ethRouterInfo.isUserRegisteredForAutoRollover).to.be.eq(false);
    });

    it('Deprecated vault', async () => {
      const vaultInfo = ethRouterInfo.vaults[1];
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
      const vaultInfo = ethRouterInfo.vaults[4];
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

  describe('ETH router with user connected', () => {
    const ethRouterId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    const userAddress = '0xF8F6B70a36f4398f0853a311dC6699Aba8333Cc1';
    let ethRouterInfo: RouterInfo;

    before(async () => {
      await mock();
      const mellowRouters = await getAllMellowProducts(userAddress);
      await restore();

      ethRouterInfo = mellowRouters[1];
      expect(ethRouterInfo.routerId).to.be.eq(ethRouterId);
    });

    it('Router info', async () => {
      expect(ethRouterInfo.userWalletBalance).to.be.eq(6.181047125928028);
      expect(ethRouterInfo.userRouterDeposit).to.be.eq(0.076);
      expect(ethRouterInfo.userRouterCommittedDeposit).to.be.eq(0.076);
      expect(ethRouterInfo.userRouterPendingDeposit).to.be.eq(0);
      expect(ethRouterInfo.isUserRegisteredForAutoRollover).to.be.eq(false);
    });

    it('Deprecated vault', async () => {
      const vaultInfo = ethRouterInfo.vaults[1];
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
      const vaultInfo = ethRouterInfo.vaults[4];
      expect(vaultInfo.vaultId).to.be.eq('0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([30, 30]);
      expect(vaultInfo.defaultWeight).to.be.eq(50);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1676542449000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0.0462);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0.0462);
      expect(vaultInfo.canUserManageVault).to.be.eq(false);
    });
  });
});

describe('getRouters', () => {
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

  describe('ETH router with no user connected', () => {
    const ethRouterId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    let ethRouterInfo: RouterInfo;

    before(async () => {
      await mock();
      const mellowRouters = await getAllMellowProducts();
      await restore();

      ethRouterInfo = mellowRouters[1];
      expect(ethRouterInfo.routerId).to.be.eq(ethRouterId);
    });

    it('Router info', async () => {
      expect(ethRouterInfo.soon).to.be.eq(false);
      expect(ethRouterInfo.title).to.be.eq('MELLOW - ETH');
      expect(ethRouterInfo.description).to.be.eq('B');
      expect(ethRouterInfo.underlyingPools).to.be.deep.eq(['Compound - ETH']);
      expect(ethRouterInfo.tokenId).to.be.eq('0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6');
      expect(ethRouterInfo.expired).to.be.eq(false);
      expect(ethRouterInfo.depositable).to.be.eq(true);

      expect(ethRouterInfo.userWalletBalance).to.be.eq(0);
      expect(ethRouterInfo.userRouterDeposit).to.be.eq(0);
      expect(ethRouterInfo.userRouterCommittedDeposit).to.be.eq(0);
      expect(ethRouterInfo.userRouterPendingDeposit).to.be.eq(0);
      expect(ethRouterInfo.isUserRegisteredForAutoRollover).to.be.eq(false);
    });

    it('Deprecated vault', async () => {
      const vaultInfo = ethRouterInfo.vaults[1];
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
      const vaultInfo = ethRouterInfo.vaults[4];
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

  describe('ETH router with user connected', () => {
    const ethRouterId = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
    const userAddress = '0xF8F6B70a36f4398f0853a311dC6699Aba8333Cc1';
    let ethRouterInfo: RouterInfo;

    before(async () => {
      await mock();
      const mellowRouters = await getAllMellowProducts(userAddress);
      await restore();

      ethRouterInfo = mellowRouters[1];
      expect(ethRouterInfo.routerId).to.be.eq(ethRouterId);
    });

    it('Router info', async () => {
      expect(ethRouterInfo.userWalletBalance).to.be.eq(6.181047125928028);
      expect(ethRouterInfo.userRouterDeposit).to.be.eq(0.076);
      expect(ethRouterInfo.userRouterCommittedDeposit).to.be.eq(0.076);
      expect(ethRouterInfo.userRouterPendingDeposit).to.be.eq(0);
      expect(ethRouterInfo.isUserRegisteredForAutoRollover).to.be.eq(false);
    });

    it('Deprecated vault', async () => {
      const vaultInfo = ethRouterInfo.vaults[1];
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
      const vaultInfo = ethRouterInfo.vaults[4];
      expect(vaultInfo.vaultId).to.be.eq('0x4FE3444AC2Ee16cAF4661fba06186b09E4F0a706');
      expect(vaultInfo.pools).to.be.deep.eq(['Compound - ETH']);
      expect(vaultInfo.estimatedHistoricApy).to.be.deep.eq([30, 30]);
      expect(vaultInfo.defaultWeight).to.be.eq(50);
      expect(vaultInfo.maturityTimestampMS).to.be.eq(1676542449000);
      expect(vaultInfo.withdrawable).to.be.eq(false);
      expect(vaultInfo.rolloverable).to.be.eq(false);
      expect(vaultInfo.userVaultCommittedDeposit).to.be.eq(0.0462);
      expect(vaultInfo.userVaultPendingDeposit).to.be.eq(0);
      expect(vaultInfo.userVaultDeposit).to.be.eq(0.0462);
      expect(vaultInfo.canUserManageVault).to.be.eq(false);
    });
  });
});
