import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import * as initSDK from '../../src/init';
import { getBlockAtTimestampHeuristic } from '../../src/utils/getBlockAtTimestamp';
import { providers } from 'ethers';

class MockProvider {
  private genesisTimestamp;
  private currentBlockNumber;
  private secondsPerBlock;

  constructor(genesisTimestamp: number, currentBlockNumber: number, secondsPerBlock: number) {
    this.genesisTimestamp = genesisTimestamp;
    this.currentBlockNumber = currentBlockNumber;
    this.secondsPerBlock = secondsPerBlock;
  }

  private getTimestamp(blockNumber: number) {
    return Math.floor(this.genesisTimestamp + blockNumber * this.secondsPerBlock);
  }

  async getBlock(blockHashOrBlockTag: number | string) {
    if (typeof blockHashOrBlockTag === 'string') {
      if (blockHashOrBlockTag !== 'latest') {
        throw new Error(`Mock provider: Unknown string ${blockHashOrBlockTag}`);
      }
      return {
        number: this.currentBlockNumber,
        timestamp: this.getTimestamp(this.currentBlockNumber),
      };
    } else {
      if (blockHashOrBlockTag < 1) {
        throw new Error(`Requested negative block number ${blockHashOrBlockTag}`);
      }
      const reqBlockNumber = Math.min(this.currentBlockNumber, blockHashOrBlockTag);
      return {
        number: reqBlockNumber,
        timestamp: this.getTimestamp(reqBlockNumber),
      };
    }
  }
}

describe('#getBlockAtTimestampHeuristic', () => {
  beforeEach(() => {
    sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );
  });

  afterEach(() => {
    // restore the original implementation of initSDK.getSentryTracker
    (initSDK.getSentryTracker as sinon.SinonStub).restore();
  });

  it('mainnet 12s cadance', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const currentBlock = 12345678;
    const secondsPerBlock = 12;
    const genesisTimestamp = Math.floor(timestamp - currentBlock * secondsPerBlock);

    const provider = new MockProvider(genesisTimestamp, currentBlock, secondsPerBlock);

    {
      const blockNumber = await getBlockAtTimestampHeuristic(
        1,
        provider as unknown as providers.Provider,
        timestamp,
      );

      expect(blockNumber).to.be.eq(currentBlock);
    }

    {
      const blockNumber = await getBlockAtTimestampHeuristic(
        1,
        provider as unknown as providers.Provider,
        timestamp - 12 * 100,
      );

      expect(blockNumber).to.be.eq(currentBlock - 100);
    }

    {
      const blockNumber = await getBlockAtTimestampHeuristic(
        1,
        provider as unknown as providers.Provider,
        timestamp - 12 * 2000000,
      );

      expect(blockNumber).to.be.eq(currentBlock - 2000000);
    }

    {
      const blockNumber = await getBlockAtTimestampHeuristic(
        1,
        provider as unknown as providers.Provider,
        genesisTimestamp - 100,
      );

      expect(blockNumber).to.be.eq(1);
    }
  });

  it('arbitrum 0.2s cadance', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const currentBlock = 123450000000;
    const secondsPerBlock = 0.2;
    const genesisTimestamp = Math.floor(timestamp - currentBlock * secondsPerBlock);

    const provider = new MockProvider(genesisTimestamp, currentBlock, secondsPerBlock);

    {
      const blockNumber = await getBlockAtTimestampHeuristic(
        42161,
        provider as unknown as providers.Provider,
        timestamp,
      );

      expect(blockNumber).to.be.eq(currentBlock);
    }

    {
      const blockNumber = await getBlockAtTimestampHeuristic(
        42161,
        provider as unknown as providers.Provider,
        timestamp - 0.2 * 100,
      );

      expect(blockNumber).to.be.eq(currentBlock - 100);
    }

    {
      const blockNumber = await getBlockAtTimestampHeuristic(
        42161,
        provider as unknown as providers.Provider,
        timestamp - 0.2 * 1000000000,
      );

      expect(blockNumber).to.be.eq(currentBlock - 1000000000);
    }

    {
      const blockNumber = await getBlockAtTimestampHeuristic(
        42161,
        provider as unknown as providers.Provider,
        timestamp - 0.2 * 100000000000000,
      );

      expect(blockNumber).to.be.eq(1);
    }
  });
});
