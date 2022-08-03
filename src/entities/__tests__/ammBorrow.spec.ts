import { BigNumber, providers, Wallet} from 'ethers';

import Token from '../token';
import RateOracle from '../rateOracle';
import BorrowAMM from '../ammBorrow';
import AMM from '../amm';
import JSBI from 'jsbi';
import Position from '../position';
import { MockCToken__factory } from '../../typechain';
import Swap from '../swap';

describe('amm Borrow', () => {

    let borrowAmm: BorrowAMM;
    let wallet_0: Wallet;
    let position: Position;

    let provider: providers.JsonRpcProvider;

    // old pool - to be complted
    const marginEngineAddress = '0x75537828f2ce51be7289709686A69CbFDbB714F1'; 
    const vammAddress = '0xE451980132E65465d0a498c53f0b5227326Dd73F'; 
    const start = '1659525053000000000000000000';
    const end = '1660125280000000000000000000';
    const termStartTimestamp =JSBI.BigInt(start);
    const termEndTimestamp = JSBI.BigInt(end);
    const cTokenAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

    provider = new providers.JsonRpcProvider('http://0.0.0.0:8545/');
    wallet_0 = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      provider
    ); // at address - 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

    beforeAll(async () => {
      borrowAmm = new BorrowAMM({
        id: vammAddress,
        signer: wallet_0,
        provider: provider,
        environment: 'LOCALHOST_SDK',
        factoryAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        marginEngineAddress: marginEngineAddress,
        rateOracle: new RateOracle({
          id: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed', //
          protocolId: 6,
        }),
        termEndTimestamp: termEndTimestamp, 
        termStartTimestamp: termStartTimestamp,
        underlyingToken: new Token({
          id: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
          name: 'USDC',
          decimals: 18,
        }),
        tick: 0,
        tickSpacing: 60,
      });

      const amm = new AMM({
        id: vammAddress,
        signer: wallet_0,
        provider: provider,
        environment: 'LOCALHOST_SDK',
        factoryAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        marginEngineAddress: marginEngineAddress,
        fcmAddress: "0", 
        rateOracle: new RateOracle({
          id: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed',
          protocolId: 6,
        }),
        updatedTimestamp: JSBI.BigInt('1658089957000000000000000000'), // not used
        termEndTimestamp: termEndTimestamp, 
        termStartTimestamp: termStartTimestamp,
        underlyingToken: new Token({
          id: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
          name: 'USDC',
          decimals: 18,
        }),
        tick: 0,
        tickSpacing: 60,
        txCount: 0,
        totalNotionalTraded: JSBI.BigInt('0'),
        totalLiquidity: JSBI.BigInt('0')
      });

      const swap_0 = new Swap({
        id: '0',
        transactionId: '0',
        transactionTimestamp: JSBI.BigInt(BigNumber.from(start).div(BigNumber.from(10).pow(18)).toString()), // IRS start
        ammId: '0',
        positionId: '0',
        sender:'0',
        desiredNotional: JSBI.BigInt('0'),
        sqrtPriceLimitX96: JSBI.BigInt('0'),
        cumulativeFeeIncurred: JSBI.BigInt('0'),
        fixedTokenDelta: JSBI.BigInt('0'), 
        variableTokenDelta: JSBI.BigInt('-1000000000000000000000'), //
        fixedTokenDeltaUnbalanced: JSBI.BigInt("1000000000000000000000"), // 1000*1e18
      });

      const halfTime = BigNumber.from(start).sub(BigNumber.from(end)).div(2).add(BigNumber.from(start));

      const swap_1 = new Swap({
        id: '0',
        transactionId: '0',
        transactionTimestamp: JSBI.BigInt(BigNumber.from(halfTime).div(BigNumber.from(10).pow(18)).toString()), // IRS half term
        ammId: '0',
        positionId: '0',
        sender:'0',
        desiredNotional: JSBI.BigInt('0'),
        sqrtPriceLimitX96: JSBI.BigInt('0'),
        cumulativeFeeIncurred: JSBI.BigInt('0'),
        fixedTokenDelta: JSBI.BigInt('0'),
        variableTokenDelta: JSBI.BigInt('-1000000000000000000000'), //
        fixedTokenDeltaUnbalanced: JSBI.BigInt("1000000000000000000000"), // 1000*1e18
      });

      position = new Position({
        source: "",
        id: 'position_test',
        createdTimestamp: JSBI.BigInt('0'),
        amm: amm,
        owner: wallet_0.address,
        updatedTimestamp: JSBI.BigInt('0'),
        marginInScaledYieldBearingTokens: JSBI.BigInt('2000'), //
        fixedTokenBalance: JSBI.BigInt('0'),
        variableTokenBalance: JSBI.BigInt('0'),
        isSettled: false,
        fcmSwaps: [],
        fcmUnwinds: [],
        fcmSettlements: [],
        tickLower: -6960,
        tickUpper: 0,
        liquidity: JSBI.BigInt('0'),
        margin: JSBI.BigInt('0'),
        accumulatedFees: JSBI.BigInt('0'),
        positionType: 0,
        totalNotionalTraded: JSBI.BigInt('0'),
        sumOfWeightedFixedRate: JSBI.BigInt('0'),
        mints: [],
        burns: [],
        swaps: [swap_0, swap_1],
        marginUpdates: [],
        liquidations: [],
        settlements: [],
      });

      // set mock borrowBalance in MockCToken
      const mockCToken = MockCToken__factory.connect(cTokenAddress, wallet_0);
      const borrowBalance = borrowAmm.scale(3000);
      //await mockCToken.setBorrowBalanceCurrent(BigNumber.from(borrowBalance), wallet_0.address);

      // cToken - set accrued block to high ro there is a significant rate increase
      await mockCToken.setAccrualBlockNumber(1);
      const currentBlock = await provider.getBlockNumber();
      console.log("Current Block: ",currentBlock);
    });

    it('gets the borrow balance in compound', async () => {
        const balance = await borrowAmm.getBorrowBalance(position);
        console.log(balance);
    });
  

});

