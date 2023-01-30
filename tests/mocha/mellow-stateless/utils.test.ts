import { waffle } from 'hardhat';
import { describe } from 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { mapWeights } from '../../../src/entities/mellow-stateless/utils/mapWeights';
import * as initSDK from '../../../src/init';
import * as initMellowConfig from '../../../src/entities/mellow-stateless/config/config';
import { MockGoerliConfig } from './utils';
import { getOptimiserConfig } from '../../../src/entities/mellow-stateless/utils/getOptimiserConfig';
import { fail } from '../../utils';
import { validateWeights } from '../../../src/entities/mellow-stateless/utils/validateWeights';

const { provider } = waffle;

describe('tests for utils', () => {
  const mock = async () => {
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

  describe('getOptimiserConfig', () => {
    it('existing Id', async () => {
      const optimiserId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';
      const optimiserConfig = getOptimiserConfig(optimiserId);

      expect(optimiserConfig).to.be.deep.eq({
        optimiser: '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB',
        isVault: true,
        title: 'MELLOW - ETH',
        description: 'A',
        show: true,
        soon: false,
        deprecated: true,
        vaults: [
          {
            address: '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB',
            weight: 100,
            pools: ['Compound - ETH'],
            estimatedHistoricApy: [31.03, 31.03],
            withdrawable: true,
          },
        ],
      });
    });

    it('non-existing ID', async () => {
      const optimiserId = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdC';
      try {
        getOptimiserConfig(optimiserId);
        fail();
      } catch (error: unknown) {
        expect((error as Error).message).to.be.eq('Optimiser ID not found');
      }
    });
  });

  describe('mapWeights', () => {
    it('all weights', async () => {
      const vaultIds = ['A', 'B', 'C'];
      const spareWeights: [string, number][] = [
        ['A', 20],
        ['B', 30],
        ['C', 50],
      ];

      const weights = mapWeights(vaultIds, spareWeights);

      expect(weights).to.be.deep.eq([20, 30, 50]);
    });

    it('partial weights', async () => {
      const vaultIds = ['A', 'B', 'C'];
      const spareWeights: [string, number][] = [
        ['A', 20],
        ['C', 80],
      ];

      const weights = mapWeights(vaultIds, spareWeights);

      expect(weights).to.be.deep.eq([20, 0, 80]);
    });

    it('invalid weights', async () => {
      const vaultIds = ['A', 'B', 'C'];
      const spareWeights: [string, number][] = [
        ['A', 20],
        ['C', 90],
      ];

      try {
        mapWeights(vaultIds, spareWeights);
        fail();
      } catch (error: unknown) {
        expect((error as Error).message).to.be.eq('Invalid weights');
      }
    });

    it('non-existing vault weight', async () => {
      const vaultIds = ['A', 'B', 'C'];
      const spareWeights: [string, number][] = [
        ['A', 100],
        ['D', 80],
      ];

      try {
        mapWeights(vaultIds, spareWeights);
        fail();
      } catch (error: unknown) {
        expect((error as Error).message).to.be.eq('Spare vault id not found');
      }
    });

    it('non-existing vault weight', async () => {
      const vaultIds = ['A', 'B', 'C'];
      const spareWeights: [string, number][] = [
        ['A', 20],
        ['A', 20],
        ['C', 80],
      ];

      try {
        mapWeights(vaultIds, spareWeights);
        fail();
      } catch (error: unknown) {
        expect((error as Error).message).to.be.eq('Duplicate vault ids in spare weights');
      }
    });
  });

  describe('validateWeights', () => {
    it('empty array', async () => {
      const weights: number[] = [];
      const validation = validateWeights(weights);
      expect(validation).to.be.deep.eq(false);
    });

    it('sum not 100', async () => {
      const weights: number[] = [30, 60];
      const validation = validateWeights(weights);
      expect(validation).to.be.deep.eq(false);
    });

    it('valid weights', async () => {
      const weights: number[] = [30, 70];
      const validation = validateWeights(weights);
      expect(validation).to.be.deep.eq(true);
    });

    it('weights not integers', async () => {
      const weights: number[] = [29.5, 70.5];
      const validation = validateWeights(weights);
      expect(validation).to.be.deep.eq(false);
    });
  });
});
