import { network, waffle } from 'hardhat';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import { AMM, Position, RateOracle, Token } from '../../src/entities';
import * as initSDK from '../../src/init';
import axios from 'axios';
import alchemyApiKeyToURL from '../../src/utils/alchemyApiKeyToURL';

const { provider } = waffle;

// todo: needs more work
describe.skip('position:refreshInfoGcloud', () => {
  const resetNetwork = async (blockNumber: number) => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          chainId: 1,
          forking: {
            jsonRpcUrl: alchemyApiKeyToURL(1, process.env.ALCHEMY_API_KEY || ''),
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
    describe('positions', () => {
      it('trader', async () => {
        // todo: remove redundunt mock data
        const amm = new AMM({
          id: '0xf6421486af95c3ea6c4555554d55ef0c3a2048ba',
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
          '0xf6421486af95c3ea6c4555554d55ef0c3a2048ba#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-69060#0';

        // todo: not swaps in the example below won't align with gcloud
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

        const realizedPnLFromSwaps = position.realizedPnLFromSwaps;

        // eslint-disable-next-line no-console
        console.log(`realizedPnLFromSwaps trader ${realizedPnLFromSwaps}`);
      });

      it('lp', async () => {
        // todo: remove redundunt mock data
        const amm = new AMM({
          id: '0xf6421486af95c3ea6c4555554d55ef0c3a2048ba',
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
          '0xf6421486af95c3ea6c4555554d55ef0c3a2048ba#0xf8f6b70a36f4398f0853a311dc6699aba8333cc1#-69060#0';

        // todo: not swaps in the example below won't align with gcloud
        const position = new Position({
          id: positionId,
          amm,
          owner: '0xf8f6b70a36f4398f0853a311dc6699aba8333cc1',
          tickLower: -13560,
          tickUpper: -13440,
          isBothTraderAndLP: false,

          createdTimestamp: 0,

          positionType: 2,

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
      });
    });
  });
});
