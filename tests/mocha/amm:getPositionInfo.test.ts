import { network, waffle } from 'hardhat';
import JSBI from 'jsbi';
import { expect } from 'chai';
import {
  AMM,
  MarginUpdate,
  Mint,
  Position,
  RateOracle,
  Settlement,
  Swap,
  Token,
} from '../../src/entities';

const { provider } = waffle;
const DELTA = 0.0001;

describe('amm:getPositionInfo', () => {
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

  const setTime = (timestamp: number) => {
    Date.now = () => new Date(timestamp).valueOf();
  };

  beforeEach('Set timers', async () => {
    const block = 16247070;
    await resetNetwork(block);
    const { timestamp } = await provider.getBlock(block);
    setTime(timestamp * 1000);
  });

  describe('Stable coin positions', () => {
    describe('LP positions', () => {
      it('Before maturity', async () => {
        const amm = new AMM({
          id: '0x953e581dd817b0faa69eacafb2c5709483f39aba',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
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

          termStartTimestamp: JSBI.BigInt('1664539200000000000000000000'),
          termEndTimestamp: JSBI.BigInt('1672488000000000000000000000'),

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
        });

        const positionId =
          '0xb785e7e71f099ada43222e1690ee0bf701f80396#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-4680#-3360';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -4680,
          tickUpper: -3360,

          createdTimestamp: JSBI.BigInt(0),
          updatedTimestamp: JSBI.BigInt(0),

          positionType: 3,
          isSettled: false,

          mints: [
            new Mint({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              sender: '',
              amount: JSBI.BigInt('185219962'),
            }),
            new Mint({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              sender: '',
              amount: JSBI.BigInt('18521996212'),
            }),
          ],
          burns: [],
          swaps: [],
          marginUpdates: [
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('1000000'),
            }),
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('2000000'),
            }),
          ],
          liquidations: [],
          settlements: [],
        });

        const positionInfo = await amm.getPositionInformation(position);

        expect(positionInfo.fixedTokenBalance).to.be.closeTo(-737.63358, DELTA);
        expect(positionInfo.variableTokenBalance).to.be.closeTo(513.331319, DELTA);

        expect(positionInfo.liquidity).to.be.closeTo(1010, DELTA);
        expect(positionInfo.liquidityInUSD).to.be.closeTo(1010, DELTA);

        expect(positionInfo.notional).to.be.closeTo(1010, DELTA);
        expect(positionInfo.notionalInUSD).to.be.closeTo(1010, DELTA);

        expect(positionInfo.margin).to.be.closeTo(3, DELTA);
        expect(positionInfo.marginInUSD).to.be.closeTo(3, DELTA);

        expect(positionInfo.fees).to.be.closeTo(0.128066, DELTA);
        expect(positionInfo.feesInUSD).to.be.closeTo(0.128066, DELTA);

        expect(positionInfo.accruedCashflow).to.closeTo(0, DELTA);
        expect(positionInfo.accruedCashflowInUSD).to.closeTo(0, DELTA);

        expect(positionInfo.settlementCashflow).to.closeTo(0, DELTA);
        expect(positionInfo.settlementCashflowInUSD).to.closeTo(0, DELTA);

        expect(positionInfo.liquidationThreshold).to.closeTo(0.557287, DELTA);
        expect(positionInfo.safetyThreshold).to.closeTo(0.604046, DELTA);

        expect(positionInfo.variableRateSinceLastSwap).to.be.closeTo(0, DELTA);
        expect(positionInfo.fixedRateSinceLastSwap).to.be.closeTo(0, DELTA);

        expect(positionInfo.fixedApr).to.be.closeTo(1.007, DELTA);

        expect(positionInfo.healthFactor).to.be.eq(3);
        expect(positionInfo.fixedRateHealthFactor).to.be.eq(1);

        expect(positionInfo.beforeMaturity).to.be.eq(true);
      });

      it('After maturity, un-settled position', async () => {
        const amm = new AMM({
          id: '0xc75e6d901817b476a9f3b6b79831d2b61673f9f5',
          signer: null,
          provider,
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

          termStartTimestamp: JSBI.BigInt('1659254400000000000000000000'),
          termEndTimestamp: JSBI.BigInt('1664539200000000000000000000'),

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
        });

        const positionId =
          '0x654316a63e68f1c0823f0518570bc108de377831#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-5280#-2640';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -5280,
          tickUpper: -2640,

          createdTimestamp: JSBI.BigInt(0),
          updatedTimestamp: JSBI.BigInt(0),

          positionType: 3,
          isSettled: false,

          mints: [
            new Mint({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              sender: '',
              amount: JSBI.BigInt('9228233403242855483144'),
            }),
          ],
          burns: [],
          swaps: [],
          marginUpdates: [
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('10000000000000000000'),
            }),
          ],
          liquidations: [],
          settlements: [],
        });

        const positionInfo = await amm.getPositionInformation(position);

        expect(positionInfo.fixedTokenBalance).to.be.closeTo(-119.96543, DELTA);
        expect(positionInfo.variableTokenBalance).to.be.closeTo(95.13969, DELTA);

        expect(positionInfo.liquidity).to.be.closeTo(1000, DELTA);
        expect(positionInfo.liquidityInUSD).to.be.closeTo(1000, DELTA);

        expect(positionInfo.notional).to.be.closeTo(1000, DELTA);
        expect(positionInfo.notionalInUSD).to.be.closeTo(1000, DELTA);

        expect(positionInfo.margin).to.be.closeTo(10, DELTA);
        expect(positionInfo.marginInUSD).to.be.closeTo(10, DELTA);

        expect(positionInfo.fees).to.be.closeTo(0.04517, DELTA);
        expect(positionInfo.feesInUSD).to.be.closeTo(0.04517, DELTA);

        expect(positionInfo.accruedCashflow).to.closeTo(0, DELTA);
        expect(positionInfo.accruedCashflowInUSD).to.closeTo(0, DELTA);

        expect(positionInfo.settlementCashflow).to.closeTo(-0.06205, DELTA);
        expect(positionInfo.settlementCashflowInUSD).to.closeTo(-0.06205, DELTA);

        expect(positionInfo.liquidationThreshold).to.closeTo(0, DELTA);
        expect(positionInfo.safetyThreshold).to.closeTo(0, DELTA);

        expect(positionInfo.variableRateSinceLastSwap).to.be.closeTo(0, DELTA);
        expect(positionInfo.fixedRateSinceLastSwap).to.be.closeTo(0, DELTA);

        expect(positionInfo.fixedApr).to.be.closeTo(0.139, DELTA);

        expect(positionInfo.healthFactor).to.be.eq(0);
        expect(positionInfo.fixedRateHealthFactor).to.be.eq(0);

        expect(positionInfo.beforeMaturity).to.be.eq(false);
      });

      it('After maturity, settled position', async () => {
        const amm = new AMM({
          id: '0xa1a75f6689949ff413aa115d300f5e30f35ba061',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
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

          termStartTimestamp: JSBI.BigInt('1654070400000000000000000000'),
          termEndTimestamp: JSBI.BigInt('1659254400000000000000000000'),

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
        });

        const positionId =
          '0x317916f91050ee7e4f53f7c94e83fbd4ecadec7e#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-5880#-1800';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -5880,
          tickUpper: -1800,

          createdTimestamp: JSBI.BigInt(0),
          updatedTimestamp: JSBI.BigInt(0),

          positionType: 3,
          isSettled: true,

          mints: [
            new Mint({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              sender: '',
              amount: JSBI.BigInt('59295152120936424452182'),
            }),
          ],
          burns: [],
          swaps: [],
          marginUpdates: [
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('70000000000000000000'),
            }),
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('-68545626585732051688'),
            }),
          ],
          liquidations: [],
          settlements: [
            new Settlement({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              settlementCashflow: JSBI.BigInt('-2418966649418986778'),
            }),
          ],
        });

        const positionInfo = await amm.getPositionInformation(position);

        expect(positionInfo.fixedTokenBalance).to.be.eq(0);
        expect(positionInfo.variableTokenBalance).to.be.eq(0);

        expect(positionInfo.liquidity).to.be.eq(0);
        expect(positionInfo.liquidityInUSD).to.be.eq(0);

        expect(positionInfo.notional).to.be.eq(0);
        expect(positionInfo.notionalInUSD).to.be.eq(0);

        expect(positionInfo.margin).to.be.eq(0);
        expect(positionInfo.marginInUSD).to.be.eq(0);

        expect(positionInfo.fees).to.be.eq(0);
        expect(positionInfo.feesInUSD).to.be.eq(0);

        expect(positionInfo.accruedCashflow).to.eq(0);
        expect(positionInfo.accruedCashflowInUSD).to.eq(0);

        expect(positionInfo.settlementCashflow).to.eq(0);
        expect(positionInfo.settlementCashflowInUSD).to.eq(0);

        expect(positionInfo.liquidationThreshold).to.eq(0);
        expect(positionInfo.safetyThreshold).to.eq(0);

        expect(positionInfo.variableRateSinceLastSwap).to.be.eq(0);
        expect(positionInfo.fixedRateSinceLastSwap).to.be.eq(0);

        expect(positionInfo.fixedApr).to.be.eq(0);

        expect(positionInfo.healthFactor).to.be.eq(0);
        expect(positionInfo.fixedRateHealthFactor).to.be.eq(0);

        expect(positionInfo.beforeMaturity).to.be.eq(false);
      });
    });

    describe('Trader positions', () => {
      it('Before maturity', async () => {
        const amm = new AMM({
          id: '0xcd47347a8c4f40e6877425080d22f4c3115b60a5',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
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

          termStartTimestamp: JSBI.BigInt('1661155200000000000000000000'),
          termEndTimestamp: JSBI.BigInt('1680264000000000000000000000'),

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
        });

        const positionId =
          '0x111a75e91625142e85193b67b10e53acf82838cd#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-69060#0';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -69060,
          tickUpper: 0,

          createdTimestamp: JSBI.BigInt(0),
          updatedTimestamp: JSBI.BigInt(0),

          positionType: 2,
          isSettled: false,

          mints: [],
          burns: [],
          swaps: [
            new Swap({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(1661198985),
              ammId: amm.id,
              positionId,
              sender: '',
              desiredNotional: JSBI.BigInt('-2000000000'),
              sqrtPriceLimitX96: JSBI.BigInt('2503161564979124432035869129'),
              cumulativeFeeIncurred: JSBI.BigInt('3627285'),
              fixedTokenDelta: JSBI.BigInt('-4847511723'),
              variableTokenDelta: JSBI.BigInt('2000000000'),
              fixedTokenDeltaUnbalanced: JSBI.BigInt('-4845749972'),
            }),
            new Swap({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(1661156336),
              ammId: amm.id,
              positionId,
              sender: '',
              desiredNotional: JSBI.BigInt('1000000000'),
              sqrtPriceLimitX96: JSBI.BigInt('2507669430214757147510696507320'),
              cumulativeFeeIncurred: JSBI.BigInt('1817700'),
              fixedTokenDelta: JSBI.BigInt('2427716271'),
              variableTokenDelta: JSBI.BigInt('-1000000000'),
              fixedTokenDeltaUnbalanced: JSBI.BigInt('2427687262'),
            }),
            new Swap({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(1661772497),
              ammId: amm.id,
              positionId,
              sender: '',
              desiredNotional: JSBI.BigInt('-1000000000'),
              sqrtPriceLimitX96: JSBI.BigInt('2503161564979124432035869129'),
              cumulativeFeeIncurred: JSBI.BigInt('1759085'),
              fixedTokenDelta: JSBI.BigInt('-2453528799'),
              variableTokenDelta: JSBI.BigInt('1000000000'),
              fixedTokenDeltaUnbalanced: JSBI.BigInt('-2442851097'),
            }),
          ],
          marginUpdates: [
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('20000000'),
            }),
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('10000000'),
            }),
          ],
          liquidations: [],
          settlements: [],
        });

        const positionInfo = await amm.getPositionInformation(position);

        expect(positionInfo.fixedTokenBalance).to.be.closeTo(-4873.32425, DELTA);
        expect(positionInfo.variableTokenBalance).to.be.closeTo(2000, DELTA);

        expect(positionInfo.liquidity).to.be.closeTo(0, DELTA);
        expect(positionInfo.liquidityInUSD).to.be.closeTo(0, DELTA);

        expect(positionInfo.notional).to.be.closeTo(2000, DELTA);
        expect(positionInfo.notionalInUSD).to.be.closeTo(2000, DELTA);

        expect(positionInfo.margin).to.be.closeTo(22.79593, DELTA);
        expect(positionInfo.marginInUSD).to.be.closeTo(22.79593, DELTA);

        expect(positionInfo.fees).to.be.closeTo(0, DELTA);
        expect(positionInfo.feesInUSD).to.be.closeTo(0, DELTA);

        expect(positionInfo.accruedCashflow).to.closeTo(7.43095, DELTA);
        expect(positionInfo.accruedCashflowInUSD).to.closeTo(7.43095, DELTA);

        expect(positionInfo.settlementCashflow).to.closeTo(0, DELTA);
        expect(positionInfo.settlementCashflowInUSD).to.closeTo(0, DELTA);

        expect(positionInfo.liquidationThreshold).to.closeTo(0.280685, DELTA);
        expect(positionInfo.safetyThreshold).to.closeTo(2.007124, DELTA);

        expect(positionInfo.variableRateSinceLastSwap).to.be.closeTo(3.2166, DELTA);
        expect(positionInfo.fixedRateSinceLastSwap).to.be.closeTo(2.43286, DELTA);

        expect(positionInfo.fixedApr).to.be.closeTo(3.144, DELTA);

        expect(positionInfo.healthFactor).to.be.eq(3);
        expect(positionInfo.fixedRateHealthFactor).to.be.eq(2);

        expect(positionInfo.beforeMaturity).to.be.eq(true);
      });

      it('After maturity, un-settled position', async () => {
        // Set time to 1st April 2023
        setTime(1680339600000);

        const amm = new AMM({
          id: '0xcd47347a8c4f40e6877425080d22f4c3115b60a5',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
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

          termStartTimestamp: JSBI.BigInt('1661155200000000000000000000'),
          termEndTimestamp: JSBI.BigInt('1680264000000000000000000000'),

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
        });

        const positionId =
          '0x111a75e91625142e85193b67b10e53acf82838cd#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-69060#0';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -69060,
          tickUpper: 0,

          createdTimestamp: JSBI.BigInt(0),
          updatedTimestamp: JSBI.BigInt(0),

          positionType: 2,
          isSettled: false,

          mints: [],
          burns: [],
          swaps: [
            new Swap({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(1661198985),
              ammId: amm.id,
              positionId,
              sender: '',
              desiredNotional: JSBI.BigInt('-2000000000'),
              sqrtPriceLimitX96: JSBI.BigInt('2503161564979124432035869129'),
              cumulativeFeeIncurred: JSBI.BigInt('3627285'),
              fixedTokenDelta: JSBI.BigInt('-4847511723'),
              variableTokenDelta: JSBI.BigInt('2000000000'),
              fixedTokenDeltaUnbalanced: JSBI.BigInt('-4845749972'),
            }),
            new Swap({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(1661156336),
              ammId: amm.id,
              positionId,
              sender: '',
              desiredNotional: JSBI.BigInt('1000000000'),
              sqrtPriceLimitX96: JSBI.BigInt('2507669430214757147510696507320'),
              cumulativeFeeIncurred: JSBI.BigInt('1817700'),
              fixedTokenDelta: JSBI.BigInt('2427716271'),
              variableTokenDelta: JSBI.BigInt('-1000000000'),
              fixedTokenDeltaUnbalanced: JSBI.BigInt('2427687262'),
            }),
            new Swap({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(1661772497),
              ammId: amm.id,
              positionId,
              sender: '',
              desiredNotional: JSBI.BigInt('-1000000000'),
              sqrtPriceLimitX96: JSBI.BigInt('2503161564979124432035869129'),
              cumulativeFeeIncurred: JSBI.BigInt('1759085'),
              fixedTokenDelta: JSBI.BigInt('-2453528799'),
              variableTokenDelta: JSBI.BigInt('1000000000'),
              fixedTokenDeltaUnbalanced: JSBI.BigInt('-2442851097'),
            }),
          ],
          marginUpdates: [
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('20000000'),
            }),
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('10000000'),
            }),
          ],
          liquidations: [],
          settlements: [],
        });

        const positionInfo = await amm.getPositionInformation(position);

        expect(positionInfo.fixedTokenBalance).to.be.closeTo(-4873.32425, DELTA);
        expect(positionInfo.variableTokenBalance).to.be.closeTo(2000, DELTA);

        expect(positionInfo.liquidity).to.be.closeTo(0, DELTA);
        expect(positionInfo.liquidityInUSD).to.be.closeTo(0, DELTA);

        expect(positionInfo.notional).to.be.closeTo(2000, DELTA);
        expect(positionInfo.notionalInUSD).to.be.closeTo(2000, DELTA);

        expect(positionInfo.margin).to.be.closeTo(22.79593, DELTA);
        expect(positionInfo.marginInUSD).to.be.closeTo(22.79593, DELTA);

        expect(positionInfo.fees).to.be.closeTo(0, DELTA);
        expect(positionInfo.feesInUSD).to.be.closeTo(0, DELTA);

        expect(positionInfo.accruedCashflow).to.closeTo(-5.90239, DELTA);
        expect(positionInfo.accruedCashflowInUSD).to.closeTo(-5.90239, DELTA);

        expect(positionInfo.settlementCashflow).to.closeTo(-5.90239, DELTA);
        expect(positionInfo.settlementCashflowInUSD).to.closeTo(-5.90239, DELTA);

        expect(positionInfo.liquidationThreshold).to.closeTo(0, DELTA);
        expect(positionInfo.safetyThreshold).to.closeTo(0, DELTA);

        expect(positionInfo.variableRateSinceLastSwap).to.be.closeTo(0, DELTA);
        expect(positionInfo.fixedRateSinceLastSwap).to.be.closeTo(0, DELTA);

        expect(positionInfo.fixedApr).to.be.closeTo(3.144, DELTA);

        expect(positionInfo.healthFactor).to.be.eq(0);
        expect(positionInfo.fixedRateHealthFactor).to.be.eq(0);

        expect(positionInfo.beforeMaturity).to.be.eq(false);
      });
    });
  });

  describe('ETH positions', () => {
    describe('LP positions', () => {
      it('Before maturity', async () => {
        const amm = new AMM({
          id: '0x5842254e74510e000d25b5e601bcbc43b52946b4',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
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

          termStartTimestamp: JSBI.BigInt('1656662400000000000000000000'),
          termEndTimestamp: JSBI.BigInt('1672491600000000000000000000'),

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
        });

        const positionId =
          '0xb1125ba5878cf3a843be686c6c2486306f03e301#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-16080#-12540';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -16080,
          tickUpper: -12540,

          createdTimestamp: JSBI.BigInt(0),
          updatedTimestamp: JSBI.BigInt(0),

          positionType: 3,
          isSettled: false,

          mints: [
            new Mint({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              sender: '',
              amount: JSBI.BigInt('1153994930164637473'),
            }),
          ],
          burns: [],
          swaps: [],
          marginUpdates: [
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('10000000000000000'),
            }),
          ],
          liquidations: [],
          settlements: [],
        });

        const positionInfo = await amm.getPositionInformation(position);

        expect(positionInfo.fixedTokenBalance).to.be.closeTo(-0.10261, DELTA);
        expect(positionInfo.variableTokenBalance).to.be.closeTo(0.02253, DELTA);

        expect(positionInfo.liquidity).to.be.closeTo(0.1, DELTA);
        expect(positionInfo.liquidityInUSD).to.be.closeTo(120, DELTA);

        expect(positionInfo.notional).to.be.closeTo(0.1, DELTA);
        expect(positionInfo.notionalInUSD).to.be.closeTo(120, DELTA);

        expect(positionInfo.margin).to.be.closeTo(0.01, DELTA);
        expect(positionInfo.marginInUSD).to.be.closeTo(12, DELTA);

        expect(positionInfo.fees).to.be.closeTo(0.000027, DELTA);
        expect(positionInfo.feesInUSD).to.be.closeTo(0.032407, DELTA);

        expect(positionInfo.accruedCashflow).to.closeTo(0, DELTA);
        expect(positionInfo.accruedCashflowInUSD).to.closeTo(0, DELTA);

        expect(positionInfo.settlementCashflow).to.closeTo(0, DELTA);
        expect(positionInfo.settlementCashflowInUSD).to.closeTo(0, DELTA);

        expect(positionInfo.liquidationThreshold).to.closeTo(0.000004, DELTA);
        expect(positionInfo.safetyThreshold).to.closeTo(0.000023, DELTA);

        expect(positionInfo.variableRateSinceLastSwap).to.be.closeTo(0, DELTA);
        expect(positionInfo.fixedRateSinceLastSwap).to.be.closeTo(0, DELTA);

        expect(positionInfo.fixedApr).to.be.closeTo(4.584, DELTA);

        expect(positionInfo.healthFactor).to.be.eq(3);
        expect(positionInfo.fixedRateHealthFactor).to.be.eq(3);

        expect(positionInfo.beforeMaturity).to.be.eq(true);
      });
    });

    describe('Trader positions', () => {
      it('Before maturity', async () => {
        const amm = new AMM({
          id: '0x5842254e74510e000d25b5e601bcbc43b52946b4',
          signer: null,
          provider,
          factoryAddress: '0x6a7a5c3824508d03f0d2d24e0482bea39e08ccaf',
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

          termStartTimestamp: JSBI.BigInt('1656662400000000000000000000'),
          termEndTimestamp: JSBI.BigInt('1672491600000000000000000000'),

          tickSpacing: 60,
          wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          ethPrice: async () => 1200,
        });

        const positionId =
          '0xb1125ba5878cf3a843be686c6c2486306f03e301#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-69060#0';
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -69060,
          tickUpper: 0,

          createdTimestamp: JSBI.BigInt(0),
          updatedTimestamp: JSBI.BigInt(0),

          positionType: 1,
          isSettled: false,

          mints: [],
          burns: [],
          swaps: [
            new Swap({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(1658323115),
              ammId: amm.id,
              positionId,
              sender: '',
              desiredNotional: JSBI.BigInt('1000000000000000000'),
              sqrtPriceLimitX96: JSBI.BigInt('2507669430214757147510696507320'),
              cumulativeFeeIncurred: JSBI.BigInt('1347839136225266'),
              fixedTokenDelta: JSBI.BigInt('5041274582293433053'),
              variableTokenDelta: JSBI.BigInt('-1000000000000000000'),
              fixedTokenDeltaUnbalanced: JSBI.BigInt('5202587247457927929'),
            }),
            new Swap({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(1658750518),
              ammId: amm.id,
              positionId,
              sender: '',
              desiredNotional: JSBI.BigInt('100000000000000000'),
              sqrtPriceLimitX96: JSBI.BigInt('2507669430214757147510696507320'),
              cumulativeFeeIncurred: JSBI.BigInt('130718055555555'),
              fixedTokenDelta: JSBI.BigInt('498481102092103354'),
              variableTokenDelta: JSBI.BigInt('-100000000000000000'),
              fixedTokenDeltaUnbalanced: JSBI.BigInt('518507564967581219'),
            }),
          ],
          marginUpdates: [
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('100000000000000000'),
            }),
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('10000000000000000'),
            }),
            new MarginUpdate({
              id: '',
              transactionId: '',
              transactionTimestamp: JSBI.BigInt(0),
              ammId: amm.id,
              positionId,
              depositer: '',
              marginDelta: JSBI.BigInt('-10000000000000000'),
            }),
          ],
          liquidations: [],
          settlements: [],
        });

        const positionInfo = await amm.getPositionInformation(position);

        expect(positionInfo.fixedTokenBalance).to.be.closeTo(5.53975, DELTA);
        expect(positionInfo.variableTokenBalance).to.be.closeTo(-1.1, DELTA);

        expect(positionInfo.liquidity).to.be.closeTo(0, DELTA);
        expect(positionInfo.liquidityInUSD).to.be.closeTo(0, DELTA);

        expect(positionInfo.notional).to.be.closeTo(1.1, DELTA);
        expect(positionInfo.notionalInUSD).to.be.closeTo(1320, DELTA);

        expect(positionInfo.margin).to.be.closeTo(0.098521, DELTA);
        expect(positionInfo.marginInUSD).to.be.closeTo(118.22573, DELTA);

        expect(positionInfo.fees).to.be.closeTo(0, DELTA);
        expect(positionInfo.feesInUSD).to.be.closeTo(0, DELTA);

        expect(positionInfo.accruedCashflow).to.closeTo(0.002328, DELTA);
        expect(positionInfo.accruedCashflowInUSD).to.closeTo(2.79401, DELTA);

        expect(positionInfo.settlementCashflow).to.closeTo(0, DELTA);
        expect(positionInfo.settlementCashflowInUSD).to.closeTo(0, DELTA);

        expect(positionInfo.liquidationThreshold).to.closeTo(0.00005, DELTA);
        expect(positionInfo.safetyThreshold).to.closeTo(0.0002, DELTA);

        expect(positionInfo.variableRateSinceLastSwap).to.be.closeTo(4.1388, DELTA);
        expect(positionInfo.fixedRateSinceLastSwap).to.be.closeTo(5.20099, DELTA);

        expect(positionInfo.fixedApr).to.be.closeTo(4.584, DELTA);

        expect(positionInfo.healthFactor).to.be.eq(3);
        expect(positionInfo.fixedRateHealthFactor).to.be.eq(2);

        expect(positionInfo.beforeMaturity).to.be.eq(true);
      });
    });
  });
});
