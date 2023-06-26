import { network, waffle } from 'hardhat';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { AMM, Position, RateOracle, Token } from '../../src/entities';
import { advanceTimeAndBlock } from '../time';
import * as initSDK from '../../src/init';
import axios from 'axios';
import providerApiKeyToURL from '../../src/utils/providerApiKeyToURL';

const { provider } = waffle;
const DELTA = 0.0001;

describe('position:refreshInfo', () => {
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
    const block = 16247070;
    await resetNetwork(block);

    sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );

    sinon.stub(axios, 'get').resolves(() => null);
  });

  afterEach(() => {
    // restore the original implementation of initSDK.getSentryTracker
    (initSDK.getSentryTracker as sinon.SinonStub).restore();

    // restore the original implementation of axios.get
    (axios.get as sinon.SinonStub).restore();
  });

  describe('Stable coin positions', () => {
    describe('LP positions', () => {
      it('Before maturity', async () => {
        const amm = new AMM({
          id: '0x953e581dd817b0faa69eacafb2c5709483f39aba',
          vammAddress: '0x953e581dd817b0faa69eacafb2c5709483f39aba',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
          peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
          marginEngineAddress: '0xb785e7e71f099ada43222e1690ee0bf701f80396',
          rateOracle: new RateOracle({
            id: '0x9f30ec6903f1728ca250f48f664e48c3f15038ed',
            protocolId: 1,
          }),
          underlyingToken: new Token({
            id: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            name: 'USDC',
            decimals: 6,
          }),

          termStartTimestampInMS: 1664539200000,
          termEndTimestampInMS: 1672488000000,

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
          minLeverageAllowed: 0,
          chainId: 1,
          traderVisible: true,
          traderWithdrawable: true,
        });

        const positionId =
          '0xb785e7e71f099ada43222e1690ee0bf701f80396#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-4680#-3360';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -4680,
          tickUpper: -3360,
          isBothTraderAndLP: false,

          createdTimestamp: 0,

          positionType: 3,

          mints: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              liquidity: 10,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              liquidity: 1000,
            },
          ],
          burns: [],
          swaps: [],
          marginUpdates: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 1,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 2,
            },
          ],
          liquidations: [],
          settlements: [],
        });

        await position.refreshInfo();

        expect(position.fixedTokenBalance).to.be.closeTo(-737.63358, DELTA);
        expect(position.variableTokenBalance).to.be.closeTo(513.331319, DELTA);

        expect(position.liquidity).to.be.closeTo(1010, DELTA);
        expect(position.liquidityInUSD).to.be.closeTo(1010, DELTA);

        expect(position.notional).to.be.closeTo(1010, DELTA);
        expect(position.notionalInUSD).to.be.closeTo(1010, DELTA);

        expect(position.margin).to.be.closeTo(3, DELTA);
        expect(position.marginInUSD).to.be.closeTo(3, DELTA);

        expect(position.fees).to.be.closeTo(0.128066, DELTA);
        expect(position.feesInUSD).to.be.closeTo(0.128066, DELTA);

        expect(position.accruedCashflow).to.closeTo(0, DELTA);
        expect(position.accruedCashflowInUSD).to.closeTo(0, DELTA);

        expect(position.settlementCashflow).to.closeTo(0, DELTA);
        expect(position.settlementCashflowInUSD).to.closeTo(0, DELTA);

        expect(position.liquidationThreshold).to.closeTo(0.557287, DELTA);
        expect(position.safetyThreshold).to.closeTo(0.604046, DELTA);

        expect(position.payingRate).to.be.closeTo(0, DELTA);
        expect(position.receivingRate).to.be.closeTo(0, DELTA);

        expect(position.poolAPR).to.be.closeTo(1.007, DELTA);

        expect(position.healthFactor).to.be.eq(3);
        expect(position.fixedRateHealthFactor).to.be.eq(1);

        expect(position.isPoolMatured).to.be.eq(false);
      });

      it('After maturity, un-settled position', async () => {
        const amm = new AMM({
          id: '0xc75e6d901817b476a9f3b6b79831d2b61673f9f5',
          vammAddress: '0xc75e6d901817b476a9f3b6b79831d2b61673f9f5',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
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

        const positionId =
          '0x654316a63e68f1c0823f0518570bc108de377831#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-5280#-2640';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -5280,
          tickUpper: -2640,
          isBothTraderAndLP: false,

          createdTimestamp: 0,
          positionType: 3,

          mints: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              liquidity: 1000,
            },
          ],
          burns: [],
          swaps: [],
          marginUpdates: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 10,
            },
          ],
          liquidations: [],
          settlements: [],
        });

        await position.refreshInfo();

        expect(position.fixedTokenBalance).to.be.closeTo(-119.96543, DELTA);
        expect(position.variableTokenBalance).to.be.closeTo(95.13969, DELTA);

        expect(position.liquidity).to.be.closeTo(1000, DELTA);
        expect(position.liquidityInUSD).to.be.closeTo(1000, DELTA);

        expect(position.notional).to.be.closeTo(1000, DELTA);
        expect(position.notionalInUSD).to.be.closeTo(1000, DELTA);

        expect(position.margin).to.be.closeTo(10, DELTA);
        expect(position.marginInUSD).to.be.closeTo(10, DELTA);

        expect(position.fees).to.be.closeTo(0.04517, DELTA);
        expect(position.feesInUSD).to.be.closeTo(0.04517, DELTA);

        expect(position.accruedCashflow).to.closeTo(0, DELTA);
        expect(position.accruedCashflowInUSD).to.closeTo(0, DELTA);

        expect(position.settlementCashflow).to.closeTo(-0.06205, DELTA);
        expect(position.settlementCashflowInUSD).to.closeTo(-0.06205, DELTA);

        expect(position.liquidationThreshold).to.closeTo(0, DELTA);
        expect(position.safetyThreshold).to.closeTo(0, DELTA);

        expect(position.payingRate).to.be.closeTo(0, DELTA);
        expect(position.receivingRate).to.be.closeTo(0, DELTA);

        expect(position.poolAPR).to.be.closeTo(0.139, DELTA);

        expect(position.healthFactor).to.be.eq(0);
        expect(position.fixedRateHealthFactor).to.be.eq(0);

        expect(position.isPoolMatured).to.be.eq(true);
      });

      it('After maturity, settled position', async () => {
        const amm = new AMM({
          id: '0xa1a75f6689949ff413aa115d300f5e30f35ba061',
          vammAddress: '0xa1a75f6689949ff413aa115d300f5e30f35ba061',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
          peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
          marginEngineAddress: '0x317916f91050ee7e4f53f7c94e83fbd4ecadec7e',
          rateOracle: new RateOracle({
            id: '0x65f5139977c608c6c2640c088d7fd07fa17a0614',
            protocolId: 1,
          }),
          underlyingToken: new Token({
            id: '0x6b175474e89094c44da98b954eedeac495271d0f',
            name: 'DAI',
            decimals: 18,
          }),

          termStartTimestampInMS: 1654070400000,
          termEndTimestampInMS: 1659254400000,

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
          minLeverageAllowed: 0,
          chainId: 1,
          traderVisible: true,
          traderWithdrawable: true,
        });

        const positionId =
          '0x317916f91050ee7e4f53f7c94e83fbd4ecadec7e#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-5880#-1800';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -5880,
          tickUpper: -1800,
          isBothTraderAndLP: false,

          createdTimestamp: 0,

          positionType: 3,

          mints: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              liquidity: 10000,
            },
          ],
          burns: [],
          swaps: [],
          marginUpdates: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 70,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: -68.545626585732051688,
            },
          ],
          liquidations: [],
          settlements: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              settlementCashflow: -2.418966649418986778,
            },
          ],
        });

        await position.refreshInfo();

        expect(position.fixedTokenBalance).to.be.eq(0);
        expect(position.variableTokenBalance).to.be.eq(0);

        expect(position.liquidity).to.be.eq(0);
        expect(position.liquidityInUSD).to.be.eq(0);

        expect(position.notional).to.be.eq(0);
        expect(position.notionalInUSD).to.be.eq(0);

        expect(position.margin).to.be.eq(0);
        expect(position.marginInUSD).to.be.eq(0);

        expect(position.fees).to.be.eq(0);
        expect(position.feesInUSD).to.be.eq(0);

        expect(position.accruedCashflow).to.eq(0);
        expect(position.accruedCashflowInUSD).to.eq(0);

        expect(position.settlementCashflow).to.eq(0);
        expect(position.settlementCashflowInUSD).to.eq(0);

        expect(position.liquidationThreshold).to.eq(0);
        expect(position.safetyThreshold).to.eq(0);

        expect(position.payingRate).to.be.eq(0);
        expect(position.receivingRate).to.be.eq(0);

        expect(position.poolAPR).to.be.eq(0);

        expect(position.healthFactor).to.be.eq(0);
        expect(position.fixedRateHealthFactor).to.be.eq(0);

        expect(position.isPoolMatured).to.be.eq(true);
      });
    });

    describe('Trader positions', () => {
      it('Before maturity', async () => {
        const amm = new AMM({
          id: '0xcd47347a8c4f40e6877425080d22f4c3115b60a5',
          vammAddress: '0xcd47347a8c4f40e6877425080d22f4c3115b60a5',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
          peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
          marginEngineAddress: '0x111a75e91625142e85193b67b10e53acf82838cd',
          rateOracle: new RateOracle({
            id: '0xd24047316b274d48dbb2fe20068c9cc849b76152',
            protocolId: 6,
          }),
          underlyingToken: new Token({
            id: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            name: 'USDT',
            decimals: 6,
          }),

          termStartTimestampInMS: 1661155200000,
          termEndTimestampInMS: 1680264000000,

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
          minLeverageAllowed: 0,
          chainId: 1,
          traderVisible: true,
          traderWithdrawable: true,
        });

        const positionId =
          '0x111a75e91625142e85193b67b10e53acf82838cd#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-69060#0';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -69060,
          tickUpper: 0,
          isBothTraderAndLP: false,

          createdTimestamp: 0,

          positionType: 2,

          mints: [],
          burns: [],
          swaps: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 1661198985000,
              sender: '',
              fees: 3.627285,
              fixedTokenDelta: -4847.511723,
              variableTokenDelta: 2000,
              unbalancedFixedTokenDelta: -4845.749972,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 1661156336000,
              sender: '',
              fees: 1.8177,
              fixedTokenDelta: 2427.716271,
              variableTokenDelta: -1000,
              unbalancedFixedTokenDelta: 2427.687262,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 1661772497000,
              sender: '',
              fees: 1.759085,
              fixedTokenDelta: -2453.528799,
              variableTokenDelta: 1000,
              unbalancedFixedTokenDelta: -2442.851097,
            },
          ],
          marginUpdates: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 20,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 10,
            },
          ],
          liquidations: [],
          settlements: [],
        });

        await position.refreshInfo();

        expect(position.fixedTokenBalance).to.be.closeTo(-4873.32425, DELTA);
        expect(position.variableTokenBalance).to.be.closeTo(2000, DELTA);

        expect(position.liquidity).to.be.closeTo(0, DELTA);
        expect(position.liquidityInUSD).to.be.closeTo(0, DELTA);

        expect(position.notional).to.be.closeTo(2000, DELTA);
        expect(position.notionalInUSD).to.be.closeTo(2000, DELTA);

        expect(position.margin).to.be.closeTo(22.79593, DELTA);
        expect(position.marginInUSD).to.be.closeTo(22.79593, DELTA);

        expect(position.fees).to.be.closeTo(0, DELTA);
        expect(position.feesInUSD).to.be.closeTo(0, DELTA);

        expect(position.accruedCashflow).to.closeTo(7.151056, DELTA);
        expect(position.accruedCashflowInUSD).to.closeTo(7.151056, DELTA);

        expect(position.settlementCashflow).to.closeTo(0, DELTA);
        expect(position.settlementCashflowInUSD).to.closeTo(0, DELTA);

        expect(position.liquidationThreshold).to.closeTo(0.280685, DELTA);
        expect(position.safetyThreshold).to.closeTo(2.007124, DELTA);

        expect(position.receivingRate).to.be.closeTo(3.2166, DELTA);
        expect(position.payingRate).to.be.closeTo(2.43286, DELTA);

        expect(position.poolAPR).to.be.closeTo(3.144, DELTA);

        expect(position.healthFactor).to.be.eq(3);
        expect(position.fixedRateHealthFactor).to.be.eq(2);

        expect(position.isPoolMatured).to.be.eq(false);
      });

      it('After maturity, un-settled position', async () => {
        await advanceTimeAndBlock(4 * 31 * 24 * 60 * 60, 1);

        const amm = new AMM({
          id: '0xcd47347a8c4f40e6877425080d22f4c3115b60a5',
          vammAddress: '0xcd47347a8c4f40e6877425080d22f4c3115b60a5',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
          peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
          marginEngineAddress: '0x111a75e91625142e85193b67b10e53acf82838cd',
          rateOracle: new RateOracle({
            id: '0xd24047316b274d48dbb2fe20068c9cc849b76152',
            protocolId: 6,
          }),
          underlyingToken: new Token({
            id: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            name: 'USDT',
            decimals: 6,
          }),

          termStartTimestampInMS: 1661155200000,
          termEndTimestampInMS: 1680264000000,

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
          minLeverageAllowed: 0,
          chainId: 1,
          traderVisible: true,
          traderWithdrawable: true,
        });

        const positionId =
          '0x111a75e91625142e85193b67b10e53acf82838cd#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-69060#0';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -69060,
          tickUpper: 0,
          isBothTraderAndLP: false,

          createdTimestamp: 0,
          positionType: 2,

          mints: [],
          burns: [],
          swaps: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 1661198985000,
              sender: '',
              fees: 3.627285,
              fixedTokenDelta: -4847.511723,
              variableTokenDelta: 2000,
              unbalancedFixedTokenDelta: -4845.749972,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 1661156336000,
              sender: '',
              fees: 1.8177,
              fixedTokenDelta: 2427.716271,
              variableTokenDelta: -1000,
              unbalancedFixedTokenDelta: 2427.687262,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 1661772497000,
              sender: '',
              fees: 1.759085,
              fixedTokenDelta: -2453.528799,
              variableTokenDelta: 1000,
              unbalancedFixedTokenDelta: -2442.851097,
            },
          ],
          marginUpdates: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 20,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 10,
            },
          ],
          liquidations: [],
          settlements: [],
        });

        await position.refreshInfo();

        expect(position.fixedTokenBalance).to.be.closeTo(-4873.32425, DELTA);
        expect(position.variableTokenBalance).to.be.closeTo(2000, DELTA);

        expect(position.liquidity).to.be.closeTo(0, DELTA);
        expect(position.liquidityInUSD).to.be.closeTo(0, DELTA);

        expect(position.notional).to.be.closeTo(2000, DELTA);
        expect(position.notionalInUSD).to.be.closeTo(2000, DELTA);

        expect(position.margin).to.be.closeTo(22.79593, DELTA);
        expect(position.marginInUSD).to.be.closeTo(22.79593, DELTA);

        expect(position.fees).to.be.closeTo(0, DELTA);
        expect(position.feesInUSD).to.be.closeTo(0, DELTA);

        expect(position.accruedCashflow).to.closeTo(-5.91618, DELTA);
        expect(position.accruedCashflowInUSD).to.closeTo(-5.91618, DELTA);

        expect(position.settlementCashflow).to.closeTo(-5.91618, DELTA);
        expect(position.settlementCashflowInUSD).to.closeTo(-5.91618, DELTA);

        expect(position.liquidationThreshold).to.closeTo(0, DELTA);
        expect(position.safetyThreshold).to.closeTo(0, DELTA);

        expect(position.payingRate).to.be.closeTo(0, DELTA);
        expect(position.receivingRate).to.be.closeTo(0, DELTA);

        expect(position.poolAPR).to.be.closeTo(3.144, DELTA);

        expect(position.healthFactor).to.be.eq(0);
        expect(position.fixedRateHealthFactor).to.be.eq(0);

        expect(position.isPoolMatured).to.be.eq(true);
      });
    });
  });

  describe('ETH positions', () => {
    describe('LP positions', () => {
      it('Before maturity', async () => {
        const amm = new AMM({
          id: '0x5842254e74510e000d25b5e601bcbc43b52946b4',
          vammAddress: '0x5842254e74510e000d25b5e601bcbc43b52946b4',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
          peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
          marginEngineAddress: '0xb1125ba5878cf3a843be686c6c2486306f03e301',
          rateOracle: new RateOracle({
            id: '0x41ecaac9061f6babf2d42068f8f8daf3ba9644ff',
            protocolId: 4,
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

        const positionId =
          '0xb1125ba5878cf3a843be686c6c2486306f03e301#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-16080#-12540';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -16080,
          tickUpper: -12540,
          isBothTraderAndLP: false,

          createdTimestamp: 0,

          positionType: 3,

          mints: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              liquidity: 0.1,
            },
          ],
          burns: [],
          swaps: [],
          marginUpdates: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 0.01,
            },
          ],
          liquidations: [],
          settlements: [],
        });

        await position.refreshInfo();

        expect(position.fixedTokenBalance).to.be.closeTo(-0.10261, DELTA);
        expect(position.variableTokenBalance).to.be.closeTo(0.02253, DELTA);

        expect(position.liquidity).to.be.closeTo(0.1, DELTA);
        expect(position.liquidityInUSD).to.be.closeTo(120, DELTA);

        expect(position.notional).to.be.closeTo(0.1, DELTA);
        expect(position.notionalInUSD).to.be.closeTo(120, DELTA);

        expect(position.margin).to.be.closeTo(0.01, DELTA);
        expect(position.marginInUSD).to.be.closeTo(12, DELTA);

        expect(position.fees).to.be.closeTo(0.000027, DELTA);
        expect(position.feesInUSD).to.be.closeTo(0.032407, DELTA);

        expect(position.accruedCashflow).to.closeTo(0, DELTA);
        expect(position.accruedCashflowInUSD).to.closeTo(0, DELTA);

        expect(position.settlementCashflow).to.closeTo(0, DELTA);
        expect(position.settlementCashflowInUSD).to.closeTo(0, DELTA);

        expect(position.liquidationThreshold).to.closeTo(0.000004, DELTA);
        expect(position.safetyThreshold).to.closeTo(0.000023, DELTA);

        expect(position.payingRate).to.be.closeTo(0, DELTA);
        expect(position.receivingRate).to.be.closeTo(0, DELTA);

        expect(position.poolAPR).to.be.closeTo(4.584, DELTA);

        expect(position.healthFactor).to.be.eq(3);
        expect(position.fixedRateHealthFactor).to.be.eq(3);

        expect(position.isPoolMatured).to.be.eq(false);
      });
    });

    describe('Trader positions', () => {
      it('Before maturity', async () => {
        const amm = new AMM({
          id: '0x5842254e74510e000d25b5e601bcbc43b52946b4',
          vammAddress: '0x5842254e74510e000d25b5e601bcbc43b52946b4',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
          peripheryAddress: '0x07ceD903E6ad0278CC32bC83a3fC97112F763722',
          marginEngineAddress: '0xb1125ba5878cf3a843be686c6c2486306f03e301',
          rateOracle: new RateOracle({
            id: '0x41ecaac9061f6babf2d42068f8f8daf3ba9644ff',
            protocolId: 4,
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

        const positionId =
          '0xb1125ba5878cf3a843be686c6c2486306f03e301#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-69060#0';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -69060,
          tickUpper: 0,
          isBothTraderAndLP: false,

          createdTimestamp: 0,
          positionType: 1,

          mints: [],
          burns: [],
          swaps: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 1658323115000,
              sender: '',
              fees: 0.001347839136225266,
              fixedTokenDelta: 5.041274582293433053,
              variableTokenDelta: -1,
              unbalancedFixedTokenDelta: 5.202587247457927929,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 1658750518000,
              sender: '',
              fees: 0.000130718055555555,
              fixedTokenDelta: 0.498481102092103354,
              variableTokenDelta: -0.1,
              unbalancedFixedTokenDelta: 0.518507564967581219,
            },
          ],
          marginUpdates: [
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 0.1,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: 0.01,
            },
            {
              id: '',
              txId: '',
              creationTimestampInMS: 0,
              sender: '',
              marginDelta: -0.01,
            },
          ],
          liquidations: [],
          settlements: [],
        });

        await position.refreshInfo();

        expect(position.fixedTokenBalance).to.be.closeTo(5.53975, DELTA);
        expect(position.variableTokenBalance).to.be.closeTo(-1.1, DELTA);

        expect(position.liquidity).to.be.closeTo(0, DELTA);
        expect(position.liquidityInUSD).to.be.closeTo(0, DELTA);

        expect(position.notional).to.be.closeTo(1.1, DELTA);
        expect(position.notionalInUSD).to.be.closeTo(1320, DELTA);

        expect(position.margin).to.be.closeTo(0.098521, DELTA);
        expect(position.marginInUSD).to.be.closeTo(118.22573, DELTA);

        expect(position.fees).to.be.closeTo(0, DELTA);
        expect(position.feesInUSD).to.be.closeTo(0, DELTA);

        expect(position.accruedCashflow).to.closeTo(0.002629, DELTA);
        expect(position.accruedCashflowInUSD).to.closeTo(3.1548, DELTA);

        expect(position.settlementCashflow).to.closeTo(0, DELTA);
        expect(position.settlementCashflowInUSD).to.closeTo(0, DELTA);

        expect(position.liquidationThreshold).to.closeTo(0.00005, DELTA);
        expect(position.safetyThreshold).to.closeTo(0.0002, DELTA);

        expect(position.payingRate).to.be.closeTo(0, DELTA);
        expect(position.receivingRate).to.be.closeTo(0, DELTA);

        expect(position.poolAPR).to.be.closeTo(4.584, DELTA);

        expect(position.healthFactor).to.be.eq(3);
        expect(position.fixedRateHealthFactor).to.be.eq(2);

        expect(position.isPoolMatured).to.be.eq(false);
      });
    });
  });
});
