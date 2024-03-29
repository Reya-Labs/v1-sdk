import { network, waffle } from 'hardhat';
import { expect } from 'chai';
import { ethers } from 'ethers';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import * as initSDK from '../../src/init';
import { AMM, RateOracle, Token } from '../../src/entities';
import { advanceTimeAndBlock } from '../time';
import { fail, withSigner } from '../utils';

import {
  MarginEngine__factory as marginEngineFactory,
  IERC20Minimal__factory as tokenFactory,
} from '../../src/typechain';
import providerApiKeyToURL from '../../src/utils/providerApiKeyToURL';

const { provider } = waffle;
const DELTA = 0.0001;

describe('amm:rolloverWithMint', () => {
  const resetNetwork = async (blockNumber: number) => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          chainId: 1,
          forking: {
            jsonRpcUrl: providerApiKeyToURL(
              1,
              process.env.ALCHEMY_API_KEY || '',
              process.env.INFURE_API_KEY || '',
            ),
            blockNumber,
          },
        },
      ],
    });
  };

  beforeEach('Set timers', async () => {
    const block = 16298400;
    await resetNetwork(block);

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

  describe('LP positions', () => {
    describe('Stablecoin', () => {
      it('Rollover less than received - the difference should go into wallet', async () => {
        advanceTimeAndBlock(24 * 60 * 60, 1);

        const owner = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

        await withSigner(network, owner, async (signer) => {
          const amm = new AMM({
            id: '0xc75e6d901817b476a9f3b6b79831d2b61673f9f5',
            vammAddress: '0xc75e6d901817b476a9f3b6b79831d2b61673f9f5',
            signer,
            provider,
            peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
            factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
            marginEngineAddress: '0x654316a63e68f1c0823f0518570bc108de377831',
            rateOracle: new RateOracle({
              id: '0x65f5139977c608c6c2640c088d7fd07fa17a0614',
              protocolId: 1,
            }),
            underlyingToken: new Token({
              id: '0x6b175474e89094c44da98b954eedeac495271d0f',
              name: 'DAI',
              decimals: 18,
            }),

            termStartTimestampInMS: 1659254400000,
            termEndTimestampInMS: 1664539200000,

            tickSpacing: 60,
            wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            ethPrice: async () => 1200,
            minLeverageAllowed: 0,
            chainId: 1,
            traderVisible: true,
            traderWithdrawable: true,
          });

          const before = {
            balance: await amm.underlyingTokens(),
          };

          const newMarginEngine = '0xbb3583efc060ed1cffffc06a28f6b5381031b601';
          await amm.rolloverWithMint({
            fixedLow: 1.3,
            fixedHigh: 1.7,
            notional: 0.1,
            margin: 1,
            newMarginEngine,
            rolloverPosition: {
              tickLower: -5280,
              tickUpper: -2640,
              settlementBalance: 9.98312,
            },
          });

          const after = {
            balance: await amm.underlyingTokens(),
            position: await marginEngineFactory
              .connect(newMarginEngine, signer)
              .callStatic.getPosition(owner, -5280, -2640),
          };

          expect(after.balance - before.balance).to.be.closeTo(8.98312, DELTA);
          expect(amm.descale(after.position.margin)).to.be.closeTo(1, DELTA);
        });
      });

      it('Rollover more than received - the extra funds should be withdrawn from the wallet', async () => {
        advanceTimeAndBlock(24 * 60 * 60, 1);

        const owner = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

        await withSigner(network, owner, async (signer) => {
          const amm = new AMM({
            id: '0xc75e6d901817b476a9f3b6b79831d2b61673f9f5',
            signer,
            provider,
            factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
            vammAddress: '0xc75e6d901817b476a9f3b6b79831d2b61673f9f5',
            peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
            marginEngineAddress: '0x654316a63e68f1c0823f0518570bc108de377831',
            rateOracle: new RateOracle({
              id: '0x65f5139977c608c6c2640c088d7fd07fa17a0614',
              protocolId: 1,
            }),
            underlyingToken: new Token({
              id: '0x6b175474e89094c44da98b954eedeac495271d0f',
              name: 'DAI',
              decimals: 18,
            }),

            termStartTimestampInMS: 1659254400000,
            termEndTimestampInMS: 1664539200000,

            tickSpacing: 60,
            wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            ethPrice: async () => 1200,
            minLeverageAllowed: 0,
            chainId: 1,
            traderVisible: true,
            traderWithdrawable: true,
          });

          const before = {
            balance: await amm.underlyingTokens(),
          };

          const newMarginEngine = '0xbb3583efc060ed1cffffc06a28f6b5381031b601';
          await amm.rolloverWithMint({
            fixedLow: 1.3,
            fixedHigh: 1.7,
            notional: 1,
            margin: 20,
            newMarginEngine,
            rolloverPosition: {
              tickLower: -5280,
              tickUpper: -2640,
              settlementBalance: 9.98312,
            },
          });

          const after = {
            balance: await amm.underlyingTokens(),
            position: await marginEngineFactory
              .connect(newMarginEngine, signer)
              .callStatic.getPosition(owner, -5280, -2640),
          };

          expect(after.balance - before.balance).to.be.closeTo(-10.01688, DELTA);
          expect(amm.descale(after.position.margin)).to.be.closeTo(20, DELTA);
        });
      });
    });

    describe('ETH', () => {
      it('No approval for WETH - revert', async () => {
        await advanceTimeAndBlock(24 * 60 * 60, 1);

        const owner = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

        await withSigner(network, owner, async (signer) => {
          const amm = new AMM({
            id: '0x3806b99d0a0483e0d07501b31884c10e8e8b1215',
            signer,
            provider,
            vammAddress: '0x3806b99d0a0483e0d07501b31884c10e8e8b1215',
            factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
            peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
            marginEngineAddress: '0x21f9151d6e06f834751b614c2ff40fc28811b235',
            rateOracle: new RateOracle({
              id: '0xa667502bf7f5da45c7b6a70da7f0595e6cf342d8',
              protocolId: 3,
            }),
            underlyingToken: new Token({
              id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              name: 'ETH',
              decimals: 18,
            }),

            termStartTimestampInMS: 1656662400000,
            termEndTimestampInMS: 1672491600000,

            tickSpacing: 60,
            wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            ethPrice: async () => 1200,
            minLeverageAllowed: 0,
            chainId: 1,
            traderVisible: true,
            traderWithdrawable: true,
          });

          const newMarginEngine = '0x626cf6b2fbf578653f7fa5424962972161a79de7';

          try {
            await amm.rolloverWithMint({
              fixedLow: 5,
              fixedHigh: 7,
              notional: 0.1,
              margin: 0.01,
              newMarginEngine,
              rolloverPosition: {
                tickLower: -17940,
                tickUpper: -17040,
                settlementBalance: 0.02063018,
              },
            });
            fail();
          } catch (_) {}
        });
      });

      it('Rollover less than received - the difference should go into wallet as WETH', async () => {
        await advanceTimeAndBlock(24 * 60 * 60, 1);

        const owner = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

        await withSigner(network, owner, async (signer) => {
          const amm = new AMM({
            id: '0x3806b99d0a0483e0d07501b31884c10e8e8b1215',
            signer,
            provider,
            vammAddress: '0x3806b99d0a0483e0d07501b31884c10e8e8b1215',
            factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
            peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
            marginEngineAddress: '0x21f9151d6e06f834751b614c2ff40fc28811b235',
            rateOracle: new RateOracle({
              id: '0xa667502bf7f5da45c7b6a70da7f0595e6cf342d8',
              protocolId: 3,
            }),
            underlyingToken: new Token({
              id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              name: 'ETH',
              decimals: 18,
            }),

            termStartTimestampInMS: 1656662400000,
            termEndTimestampInMS: 1672491600000,

            tickSpacing: 60,
            wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            ethPrice: async () => 1200,
            minLeverageAllowed: 0,
            chainId: 1,
            traderVisible: true,
            traderWithdrawable: true,
          });

          const tokenAddress = amm.underlyingToken.id;
          const token = tokenFactory.connect(tokenAddress, signer);

          await amm.approveUnderlyingTokenForPeriphery();

          const before = {
            balanceWeth: amm.descale(await token.balanceOf(owner)),
            balanceEth: await amm.underlyingTokens(),
          };

          const newMarginEngine = '0x626cf6b2fbf578653f7fa5424962972161a79de7';
          const receipt = await amm.rolloverWithMint({
            fixedLow: 5,
            fixedHigh: 7,
            notional: 0.1,
            margin: 0.01,
            newMarginEngine,
            rolloverPosition: {
              tickLower: -17940,
              tickUpper: -17040,
              settlementBalance: 0.02063018,
            },
          });

          const ethUsedForRollover = Number(
            ethers.utils.formatEther(receipt.effectiveGasPrice.mul(receipt.gasUsed).toString()),
          );

          const after = {
            balanceWeth: amm.descale(await token.balanceOf(owner)),
            balanceEth: await amm.underlyingTokens(),
            position: await marginEngineFactory
              .connect(newMarginEngine, signer)
              .callStatic.getPosition(owner, -19440, -16080),
          };

          expect(after.balanceWeth - before.balanceWeth).to.be.closeTo(0.01063018, DELTA);
          expect(after.balanceEth - before.balanceEth).to.be.closeTo(-ethUsedForRollover, DELTA);
          expect(amm.descale(after.position.margin)).to.be.closeTo(0.01, DELTA);
        });
      });

      it('Rollover more than received - the extra deposit should be in ETH', async () => {
        await advanceTimeAndBlock(24 * 60 * 60, 1);

        const owner = '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1';

        await withSigner(network, owner, async (signer) => {
          const amm = new AMM({
            id: '0x3806b99d0a0483e0d07501b31884c10e8e8b1215',
            signer,
            provider,
            vammAddress: '0x3806b99d0a0483e0d07501b31884c10e8e8b1215',
            factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
            peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
            marginEngineAddress: '0x21f9151d6e06f834751b614c2ff40fc28811b235',
            rateOracle: new RateOracle({
              id: '0xa667502bf7f5da45c7b6a70da7f0595e6cf342d8',
              protocolId: 3,
            }),
            underlyingToken: new Token({
              id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
              name: 'ETH',
              decimals: 18,
            }),

            termStartTimestampInMS: 1656662400000,
            termEndTimestampInMS: 167249160000,

            tickSpacing: 60,
            wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            ethPrice: async () => 1200,
            minLeverageAllowed: 0,
            chainId: 1,
            traderVisible: true,
            traderWithdrawable: true,
          });

          const tokenAddress = amm.underlyingToken.id;
          const token = tokenFactory.connect(tokenAddress, signer);

          await amm.approveUnderlyingTokenForPeriphery();

          const before = {
            balanceWeth: amm.descale(await token.balanceOf(owner)),
            balanceEth: await amm.underlyingTokens(),
          };

          const newMarginEngine = '0x626cf6b2fbf578653f7fa5424962972161a79de7';
          const receipt = await amm.rolloverWithMint({
            fixedLow: 5,
            fixedHigh: 7,
            notional: 0.1,
            margin: 0.1,
            newMarginEngine,
            rolloverPosition: {
              tickLower: -17940,
              tickUpper: -17040,
              settlementBalance: 0.02063018,
            },
          });

          const ethUsedForRollover = Number(
            ethers.utils.formatEther(receipt.effectiveGasPrice.mul(receipt.gasUsed).toString()),
          );

          const after = {
            balanceWeth: amm.descale(await token.balanceOf(owner)),
            balanceEth: await amm.underlyingTokens(),
            position: await marginEngineFactory
              .connect(newMarginEngine, signer)
              .callStatic.getPosition(owner, -19440, -16080),
          };

          expect(after.balanceWeth - before.balanceWeth).to.be.closeTo(0, DELTA);
          expect(after.balanceEth - before.balanceEth).to.be.closeTo(
            -0.07936982 - ethUsedForRollover,
            DELTA,
          );
          expect(amm.descale(after.position.margin)).to.be.closeTo(0.1, DELTA);
        });
      });
    });
  });
});
