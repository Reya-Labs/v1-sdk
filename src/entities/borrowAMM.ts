import { ONE_YEAR_IN_SECONDS } from '../constants';
import {
  ICToken__factory as cTokenFactory,
  IAaveV2LendingPool__factory,
  IERC20Minimal__factory,
  ICToken,
  IERC20Minimal,
  CompoundBorrowRateOracle__factory,
  AaveBorrowRateOracle__factory,
} from '../typechain';
import { Position } from './position';
import { geckoEthToUsd } from '../utils/priceFetch';
import { AMM, InfoPostSwap, AMMGetInfoPostSwapArgs } from './amm';

export type BorrowAMMConstructorArgs = {
  id: string;
  amm: AMM;
};

export type BorrowSwapInfo = InfoPostSwap & {
  borrowMarginRequirement: number;
};

class BorrowAMM {
  public readonly id: string;
  public readonly amm: AMM;

  public cToken: ICToken | undefined;
  public aaveVariableDebtToken: IERC20Minimal | undefined;

  public underlyingDebt = 0;
  public variableDebt = 0;
  public fixedDebt = 0;
  public aggregatedDebt = 0;

  public constructor({ id, amm }: BorrowAMMConstructorArgs) {
    this.id = id;
    this.amm = amm;

    const protocolId = this.amm.rateOracle.protocolId;
    if (protocolId !== 6 && protocolId !== 5 && protocolId !== 9) {
      throw new Error('Not a borrow market');
    }
  }

  private static getAllSwaps(position: Position): {
    fDelta: number;
    vDelta: number;
    timestamp: number;
  }[] {
    if (position === undefined) {
      return [];
    }

    const allSwaps = position.swaps
      .map((s) => ({
        fDelta: s.unbalancedFixedTokenDelta,
        vDelta: s.variableTokenDelta,
        timestamp: s.creationTimestampInMS / 1000,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return allSwaps;
  }

  private async getAccruedCashflow(
    allSwaps: {
      fDelta: number;
      vDelta: number;
      timestamp: number;
    }[],
    atMaturity: boolean,
  ): Promise<[number, number]> {
    let totalVarableCashflow = 0;
    let totalFixedCashflow = 0;
    const lenSwaps = allSwaps.length;

    const lastBlock = await this.amm.provider.getBlockNumber();
    const lastBlockTimestamp = (await this.amm.provider.getBlock(lastBlock)).timestamp;

    const untilTimestamp = atMaturity ? this.amm.termEndTimestampInMS / 1000 : lastBlockTimestamp;

    for (let i = 0; i < lenSwaps; i++) {
      const currentSwapTimestamp = allSwaps[i].timestamp;

      const normalizedTime = (untilTimestamp - currentSwapTimestamp) / ONE_YEAR_IN_SECONDS;

      const { scaled: variableFactorBetweenSwaps } = await this.amm.variableFactor(
        currentSwapTimestamp * 1000,
        untilTimestamp * 1000,
      );

      const fixedCashflow = (allSwaps[i].fDelta * normalizedTime) / 100;
      const variableCashflow = allSwaps[i].vDelta * variableFactorBetweenSwaps;

      totalFixedCashflow += fixedCashflow;
      totalVarableCashflow += variableCashflow;
    }

    return [totalFixedCashflow, totalVarableCashflow];
  }

  public async atMaturity(): Promise<boolean> {
    // is past maturity?
    const lastBlock = await this.amm.provider.getBlockNumber();
    const lastBlockTimestamp = (await this.amm.provider.getBlock(lastBlock - 1)).timestamp;
    const pastMaturity = this.amm.termEndTimestampInMS < lastBlockTimestamp * 1000;

    return pastMaturity;
  }

  public async getVariableCashFlow(position: Position): Promise<number> {
    if (position === undefined) {
      return 0;
    }
    const allSwaps = BorrowAMM.getAllSwaps(position);
    const pastMaturity = await this.atMaturity();

    const [, variableCashFlow] = await this.getAccruedCashflow(allSwaps, pastMaturity);

    return variableCashFlow;
  }

  public async getFixedCashFlow(position: Position): Promise<number> {
    if (position === undefined) {
      return 0;
    }

    const allSwaps = BorrowAMM.getAllSwaps(position);
    const pastMaturity = await this.atMaturity();

    const [fixedCashFlow] = await this.getAccruedCashflow(allSwaps, pastMaturity);

    return fixedCashFlow;
  }

  public async getUnderlyingBorrowBalance(): Promise<number> {
    if (!this.amm.signer) {
      throw new Error('Wallet not connected');
    }

    const protocolId = this.amm.rateOracle.protocolId;
    if (protocolId === 6 && !this.cToken) {
      const compoundRateOracle = CompoundBorrowRateOracle__factory.connect(
        this.amm.rateOracle.id,
        this.amm.signer,
      );
      const cTokenAddress = await compoundRateOracle.ctoken();
      this.cToken = cTokenFactory.connect(cTokenAddress, this.amm.signer);
    } else if (protocolId === 5 && !this.aaveVariableDebtToken) {
      const aaveRateOracle = AaveBorrowRateOracle__factory.connect(
        this.amm.rateOracle.id,
        this.amm.signer,
      );

      const lendingPoolAddress = await aaveRateOracle.aaveLendingPool();
      const lendingPool = IAaveV2LendingPool__factory.connect(lendingPoolAddress, this.amm.signer);
      const reserve = await lendingPool.getReserveData(this.amm.underlyingToken.id);
      const variableDebtTokenAddress = reserve.variableDebtTokenAddress;
      this.aaveVariableDebtToken = IERC20Minimal__factory.connect(
        variableDebtTokenAddress,
        this.amm.signer,
      );
    }

    if (this.cToken) {
      // compound
      const userAddress = await this.amm.signer.getAddress();
      const borrowBalance = await this.cToken.callStatic.borrowBalanceCurrent(userAddress);
      return this.amm.descale(borrowBalance);
    }

    if (this.aaveVariableDebtToken) {
      // aave
      const userAddress = await this.amm.signer.getAddress();
      const borrowBalance = await this.aaveVariableDebtToken.balanceOf(userAddress);
      return this.amm.descale(borrowBalance);
    }

    return 0;
  }

  public async getFixedBorrowBalance(position: Position): Promise<number> {
    const fixedCashFlow = await this.getFixedCashFlow(position);
    await position.refreshInfo();
    const notional = position.variableTokenBalance;

    return notional - fixedCashFlow;
  }

  // get variable debt: debt from underlying protocol - fixed debt on Voltz
  public async getAggregatedBorrowBalance(position: Position): Promise<number> {
    const variableCashFlow = await this.getVariableCashFlow(position);
    await position.refreshInfo();
    const notional = position.variableTokenBalance;
    const notionalWithVariableCashFlow = notional + variableCashFlow;

    const notionalWithVariableCashFlowAndBuffer = notionalWithVariableCashFlow * 1.001;

    const underlyingBorrowBalance = await this.getUnderlyingBorrowBalance();

    if (underlyingBorrowBalance >= notionalWithVariableCashFlowAndBuffer) {
      return underlyingBorrowBalance - notionalWithVariableCashFlow;
    }
    return 0;
  }

  public async getBorrowInfo(infoPostSwapArgs: AMMGetInfoPostSwapArgs): Promise<BorrowSwapInfo> {
    if (!this.amm.signer) {
      throw new Error('Wallet not connected');
    }

    const infoPostSwap = await this.amm.getInfoPostSwap(infoPostSwapArgs);

    const { scaled: variableAPYToMaturity } = await this.amm.variableFactor(
      this.amm.termStartTimestampInMS,
      this.amm.termEndTimestampInMS,
    );

    const termStartTimestamp = this.amm.termStartTimestampInMS / 1000;
    const termEndTimestamp = this.amm.termEndTimestampInMS / 1000;

    const fixedFactor = ((termEndTimestamp - termStartTimestamp) / ONE_YEAR_IN_SECONDS) * 0.01;

    let fcMargin = -(
      infoPostSwap.fixedTokenDeltaBalance * fixedFactor +
      infoPostSwap.variableTokenDeltaBalance * variableAPYToMaturity
    );
    fcMargin = (fcMargin + infoPostSwap.fee) * 1.01;
    return {
      borrowMarginRequirement: fcMargin > 0 ? fcMargin : 0,
      ...infoPostSwap,
    };
  }

  public async getFixedBorrowBalanceInUSD(position: Position): Promise<number> {
    const balanceInTokens = await this.getFixedBorrowBalance(position);
    if (this.amm && this.amm.isETH) {
      const EthToUsdPrice = await geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || '');
      return balanceInTokens * EthToUsdPrice;
    }
    return balanceInTokens;
  }

  public async getUnderlyingBorrowBalanceInUSD(): Promise<number> {
    const balanceInTokens = await this.getUnderlyingBorrowBalance();
    if (this.amm && this.amm.isETH) {
      const EthToUsdPrice = await geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || '');
      return balanceInTokens * EthToUsdPrice;
    }
    return balanceInTokens;
  }

  public async getAggregatedBorrowBalanceInUSD(position: Position): Promise<number> {
    const balanceInTokens = await this.getAggregatedBorrowBalance(position);
    if (this.amm && this.amm.isETH) {
      const EthToUsdPrice = await geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || '');
      return balanceInTokens * EthToUsdPrice;
    }
    return balanceInTokens;
  }
}

export default BorrowAMM;
