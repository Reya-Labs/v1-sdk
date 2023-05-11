import { providers, BigNumber, ContractReceipt, Signer, utils, Wallet } from 'ethers';
import { DateTime } from 'luxon';

import { SwapPeripheryParams, MintOrBurnParams, SupportedChainId } from '../../types';
import {
  MIN_FIXED_RATE,
  MAX_FIXED_RATE,
  MaxUint256Bn,
  TresholdApprovalBn,
  getGasBuffer,
  ONE_YEAR_IN_SECONDS,
  GLP_PRECISION,
  WAD_PRECISION,
} from '../../constants';
import {
  Periphery__factory as peripheryFactory,
  MarginEngine__factory as marginEngineFactory,
  IERC20Minimal__factory as tokenFactory,
  BaseRateOracle__factory as baseRateOracleFactory,
  ICToken__factory as iCTokenFactory,
  CompoundRateOracle,
  CompoundRateOracle__factory as compoundRateOracleFactory,
  CompoundBorrowRateOracle,
  AaveBorrowRateOracle__factory as aaveBorrowRateOracleFactory,
  IAaveV2LendingPool__factory as iAaveV2LendingPoolFactory,
  AaveV3RateOracle__factory as aaveV3RateOracleFactory,
  CompoundBorrowRateOracle__factory as compoundBorrowRateOracleFactory,
  GlpRateOracle__factory as glpRateOracleFactory,
  IRewardTracker__factory as rewardTrackerFactory,
  IGlpManager__factory as glpManagerFactory,
} from '../../typechain';
import { TickMath } from '../../utils/tickMath';
import { fixedRateToClosestTick, tickToFixedRate } from '../../utils/priceTickConversions';
import { nearestUsableTick } from '../../utils/nearestUsableTick';
import Token from '../token';
import { Price } from '../fractions/price';
import {
  decodeInfoPostMint,
  decodeInfoPostSwap,
  getReadableErrorMessage,
} from '../../utils/errors/errorHandling';
import { getExpectedApy } from '../../services/getExpectedApy';
import {
  CashflowInfo,
  getCashflowInfo,
  TransformedSwap,
  transformSwaps,
} from '../../services/getCashflowInfo';

import { getProtocolPrefix } from '../../services/getTokenInfo';

import { getSentryTracker } from '../../init';
import {
  AMMConstructorArgs,
  AMMRolloverWithSwapArgs,
  AMMRolloverWithMintArgs,
  AMMGetInfoPostSwapArgs,
  InfoPostSwap,
  ExpectedApyInfo,
  AMMSwapArgs,
  AMMGetInfoPostMintArgs,
  AMMMintArgs,
  AMMLpArgs,
  AMMBurnArgs,
  AMMUpdatePositionMarginArgs,
  AMMSettlePositionArgs,
  ClosestTickAndFixedRate,
  ExpectedApyArgs,
  InfoPostSwapV1,
  ExpectedCashflowArgs,
  PoolSwapInfo,
  PoolLpInfo,
  ExpectedCashflowInfo,
  InfoPostLp,
  AMMGetInfoPostLpArgs,
  InfoPostSettlePosition,
} from './types';
import { geckoEthToUsd } from '../../utils/priceFetch';
import { getVariableFactor, RateOracle } from '../rateOracle';
import { exponentialBackoff } from '../../utils/retry';
import {
  getHistoricalRates,
  Granularity,
  RatesData,
} from './getters/historicalRates/getHistoricalRate';
import getDummyWallet from '../../utils/getDummyWallet';
import { getMarket, Market } from '../../utils/getMarket';
import { estimateSwapGasUnits } from '../../utils/estimateSwapGasUnits';
import { convertGasUnitsToETH } from '../../utils/convertGasUnitsToETH';
import { getBlockAtTimestampHeuristic } from '../../utils/getBlockAtTimestamp';
import { approveToken, tokenAllowance } from '../../services';
import { getCurrentBlock } from '../../services/chainBlocks';

export class AMM {
  public readonly id: string;
  public readonly chainId: number;
  public readonly signer: Signer | null;
  public readonly provider: providers.Provider;
  public readonly peripheryAddress: string;
  public readonly factoryAddress: string;
  public readonly marginEngineAddress: string;
  public readonly rateOracle: RateOracle;
  public readonly termStartTimestampInMS: number;
  public readonly termEndTimestampInMS: number;
  public readonly underlyingToken: Token;
  public readonly tickSpacing: number;
  public readonly isETH: boolean;
  public readonly wethAddress: string;
  public readonly ethPrice: () => Promise<number>;
  public readonly variableFactor: (
    fromInMS: number,
    toInMS: number,
  ) => Promise<{
    scaled: number;
    wad: BigNumber;
  }>;
  public readonly minLeverageAllowed: number;
  public readonly traderVisible: boolean;
  public readonly traderWithdrawable: boolean;

  private readonly dummyWallet: Wallet;

  // new

  public fixedApr = 0;
  public variableApy = 0;
  public variableApy24Ago = 0;

  public constructor({
    id,
    chainId,
    signer,
    provider,
    peripheryAddress,
    factoryAddress,
    marginEngineAddress,
    rateOracle,
    termStartTimestampInMS,
    termEndTimestampInMS,
    underlyingToken,
    tickSpacing,
    wethAddress,
    ethPrice,
    minLeverageAllowed,
    traderVisible,
    traderWithdrawable,
  }: AMMConstructorArgs) {
    this.id = id;
    this.chainId = chainId;
    this.signer = signer;
    this.peripheryAddress = peripheryAddress;
    this.factoryAddress = factoryAddress;
    this.marginEngineAddress = marginEngineAddress;
    this.rateOracle = rateOracle;
    this.termStartTimestampInMS = termStartTimestampInMS;
    this.termEndTimestampInMS = termEndTimestampInMS;
    this.underlyingToken = underlyingToken;
    this.tickSpacing = tickSpacing;
    this.wethAddress = wethAddress;
    this.isETH = this.underlyingToken.name === 'ETH';
    this.ethPrice =
      ethPrice || (() => geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || ''));

    this.provider = provider;

    this.variableFactor = getVariableFactor(this.provider, this.rateOracle.id);

    this.minLeverageAllowed = minLeverageAllowed;
    this.traderVisible = traderVisible;
    this.traderWithdrawable = traderWithdrawable;

    this.dummyWallet = getDummyWallet().connect(this.provider);
  }

  public async refreshInfo(): Promise<void> {
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

    const responses = await Promise.allSettled([
      this.getFixedApr(),
      this.getInstantApy(),
      this.getInstantApy(Date.now() - oneDayInMilliseconds),
    ]);

    if (responses[0].status === 'fulfilled') {
      this.fixedApr = responses[0].value;
    }

    if (responses[1].status === 'fulfilled') {
      this.variableApy = responses[1].value * 100;
    }

    if (responses[2].status === 'fulfilled') {
      this.variableApy24Ago = responses[2].value * 100;
    }
  }

  public getUserAddress = async (_signer?: Signer): Promise<string> => {
    const signer = _signer || this.signer;
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    return exponentialBackoff(() => signer.getAddress());
  };

  // expected apy
  private expectedApy = (
    ft: number,
    vt: number,
    margin: number,
    rate: number,
  ): [number, number] => {
    const now = Math.round(new Date().getTime() / 1000);
    const end = this.termEndTimestampInMS / 1000;
    const [pnl, ecs] = getExpectedApy(now, end, ft, vt, margin, rate, this.rateOracle.protocolId);
    return [100 * pnl, ecs];
  };

  // rollover with swap

  public async rolloverWithSwap({
    isFT,
    notional,
    margin,
    fixedRateLimit,
    fixedLow,
    fixedHigh,
    newMarginEngine,
    rolloverPosition,
  }: AMMRolloverWithSwapArgs): Promise<ContractReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    if (margin < 0) {
      throw new Error('Amount of margin cannot be negative');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    const owner = await this.getUserAddress();

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    } else if (isFT) {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString();
    } else {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString();
    }

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);

    // Get the margin delta in underlying ERC20 tokens and ETH
    let scaledMarginDelta = '0';
    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH) {
      // Get the settlement margin from the previous position
      const settlementBalance = rolloverPosition.settlementBalance;

      if (settlementBalance >= margin) {
        // Case 1. If you get from the settled pool more than want to roll over
        scaledMarginDelta = this.scale(margin);
      } else {
        // Case 2. if you get from the settled pool less than want to roll over, then need to deposit extra ETH
        scaledMarginDelta = this.scale(settlementBalance);
        tempOverrides.value = BigNumber.from(this.scale(margin - settlementBalance));
      }
    } else {
      scaledMarginDelta = this.scale(margin);
    }

    const swapPeripheryParams = {
      marginEngine: newMarginEngine,
      isFT,
      notional: scaledNotional,
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
      marginDelta: scaledMarginDelta,
    };

    await peripheryContract.callStatic
      .rolloverWithSwap(
        this.marginEngineAddress,
        owner,
        rolloverPosition.tickLower,
        rolloverPosition.tickUpper,
        swapPeripheryParams,
        tempOverrides,
      )
      .catch(async (error: any) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    const estimatedGas = await peripheryContract.estimateGas
      .rolloverWithSwap(
        this.marginEngineAddress,
        owner,
        rolloverPosition.tickLower,
        rolloverPosition.tickUpper,
        swapPeripheryParams,
        tempOverrides,
      )
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    const swapTransaction = await peripheryContract
      .rolloverWithSwap(
        this.marginEngineAddress,
        owner,
        rolloverPosition.tickLower,
        rolloverPosition.tickUpper,
        swapPeripheryParams,
        tempOverrides,
      )
      .catch((error) => {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await swapTransaction.wait();
      return receipt;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  // rollover with mint

  public async rolloverWithMint({
    fixedLow,
    fixedHigh,
    notional,
    margin,
    newMarginEngine,
    rolloverPosition,
  }: AMMRolloverWithMintArgs): Promise<ContractReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    if (margin < 0) {
      throw new Error('Amount of margin cannot be negative');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    const owner = await this.getUserAddress();

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);

    // Get the margin delta in underlying ERC20 tokens and ETH
    let scaledMarginDelta = '0';
    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH) {
      // Get the settlement margin from the previous position

      const settlementMargin = rolloverPosition.settlementBalance;
      if (settlementMargin >= margin) {
        // Case 1. If you get from the settled pool more than want to roll over
        scaledMarginDelta = this.scale(margin);
      } else {
        // Case 2. if you get from the settled pool less than want to roll over, then need to deposit extra ETH
        scaledMarginDelta = this.scale(settlementMargin);
        tempOverrides.value = BigNumber.from(this.scale(margin)).sub(
          BigNumber.from(scaledMarginDelta),
        );
      }
    } else {
      scaledMarginDelta = this.scale(margin);
    }

    const mintOrBurnParams = {
      marginEngine: newMarginEngine,
      tickLower,
      tickUpper,
      notional: scaledNotional,
      isMint: true,
      marginDelta: scaledMarginDelta,
    };

    await peripheryContract.callStatic
      .rolloverWithMint(
        this.marginEngineAddress,
        owner,
        rolloverPosition.tickLower,
        rolloverPosition.tickUpper,
        mintOrBurnParams,
        tempOverrides,
      )
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    const estimatedGas = await peripheryContract.estimateGas
      .rolloverWithMint(
        this.marginEngineAddress,
        owner,
        rolloverPosition.tickLower,
        rolloverPosition.tickUpper,
        mintOrBurnParams,
        tempOverrides,
      )
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    const mintTransaction = await peripheryContract
      .rolloverWithMint(
        this.marginEngineAddress,
        owner,
        rolloverPosition.tickLower,
        rolloverPosition.tickUpper,
        mintOrBurnParams,
        tempOverrides,
      )
      .catch((error) => {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await mintTransaction.wait();
      return receipt;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  // swap

  public async getInfoPostSwap({
    isFT,
    notional,
    fixedRateLimit,
    fixedLow,
    fixedHigh,
  }: AMMGetInfoPostSwapArgs): Promise<InfoPostSwap> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    const signerAddress = await this.getUserAddress();

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    } else if (isFT) {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString();
    } else {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString();
    }

    const scaledNotional = this.scale(notional);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);
    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngine: this.marginEngineAddress,
      isFT,
      notional: scaledNotional,
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
      marginDelta: '0',
    };

    const tickBefore = await exponentialBackoff(() =>
      peripheryContract.getCurrentTick(this.marginEngineAddress),
    );
    let tickAfter = 0;
    let marginRequirement: BigNumber = BigNumber.from(0);
    let fee = BigNumber.from(0);
    let availableNotional = BigNumber.from(0);
    let fixedTokenDeltaUnbalanced = BigNumber.from(0);
    let fixedTokenDelta = BigNumber.from(0);

    await peripheryContract.callStatic.swap(swapPeripheryParams).then(
      (result: any) => {
        availableNotional = result[1];
        fee = result[2];
        fixedTokenDeltaUnbalanced = result[3];
        marginRequirement = result[4];
        tickAfter = parseInt(result[5], 10);
        fixedTokenDelta = result[0];
      },
      (error: any) => {
        const result = decodeInfoPostSwap(error);
        marginRequirement = result.marginRequirement;
        tickAfter = result.tick;
        fee = result.fee;
        availableNotional = result.availableNotional;
        fixedTokenDeltaUnbalanced = result.fixedTokenDeltaUnbalanced;
        fixedTokenDelta = result.fixedTokenDelta;
      },
    );

    const fixedRateBefore = tickToFixedRate(tickBefore);
    const fixedRateAfter = tickToFixedRate(tickAfter);

    const fixedRateDelta = fixedRateAfter.subtract(fixedRateBefore);
    const fixedRateDeltaRaw = fixedRateDelta.toNumber();

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const currentMargin = (
      await exponentialBackoff(() =>
        marginEngineContract.callStatic.getPosition(signerAddress, tickLower, tickUpper),
      )
    ).margin;

    const scaledCurrentMargin = this.descale(currentMargin);
    const scaledAvailableNotional = this.descale(availableNotional);
    const scaledFee = this.descale(fee);
    const scaledMarginRequirement = (this.descale(marginRequirement) + scaledFee) * 1.01;

    const additionalMargin =
      scaledMarginRequirement > scaledCurrentMargin
        ? scaledMarginRequirement - scaledCurrentMargin
        : 0;

    const averageFixedRate = availableNotional.eq(BigNumber.from(0))
      ? 0
      : fixedTokenDeltaUnbalanced.mul(BigNumber.from(1000)).div(availableNotional).toNumber() /
        1000;

    let maxAvailableNotional = BigNumber.from(0);
    const swapPeripheryParamsLargeSwap = {
      marginEngine: this.marginEngineAddress,
      isFT,
      notional: this.scale(1000000000000000),
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
      marginDelta: '0',
    };
    await peripheryContract.callStatic.swap(swapPeripheryParamsLargeSwap).then(
      (result: any) => {
        maxAvailableNotional = result[1];
      },
      (error: any) => {
        const result = decodeInfoPostSwap(error);
        maxAvailableNotional = result.availableNotional;
      },
    );
    const scaledMaxAvailableNotional = this.descale(maxAvailableNotional);

    const result: InfoPostSwap = {
      marginRequirement: additionalMargin,
      availableNotional:
        scaledAvailableNotional < 0 ? -scaledAvailableNotional : scaledAvailableNotional,
      fee: scaledFee < 0 ? -scaledFee : scaledFee,
      slippage: fixedRateDeltaRaw < 0 ? -fixedRateDeltaRaw : fixedRateDeltaRaw,
      averageFixedRate: averageFixedRate < 0 ? -averageFixedRate : averageFixedRate,
      fixedTokenDeltaBalance: this.descale(fixedTokenDelta),
      variableTokenDeltaBalance: this.descale(availableNotional),
      fixedTokenDeltaUnbalanced: this.descale(fixedTokenDeltaUnbalanced),
      maxAvailableNotional:
        scaledMaxAvailableNotional < 0 ? -scaledMaxAvailableNotional : scaledMaxAvailableNotional,
    };

    return result;
  }

  public async getInfoPostSwapV1({
    isFT,
    notional,
    fixedRateLimit,
    fixedLow,
    fixedHigh,
  }: AMMGetInfoPostSwapArgs): Promise<InfoPostSwapV1> {
    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    const wallet = this.signer || this.dummyWallet;
    const walletAddress = await this.getUserAddress(wallet);

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    } else if (isFT) {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString();
    } else {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString();
    }

    const scaledNotional = this.scale(notional);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, wallet);
    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngine: this.marginEngineAddress,
      isFT,
      notional: scaledNotional,
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
      marginDelta: '0',
    };

    const tickBefore = await exponentialBackoff(() =>
      peripheryContract.getCurrentTick(this.marginEngineAddress),
    );
    let tickAfter = 0;
    let marginRequirement: BigNumber = BigNumber.from(0);
    let fee = BigNumber.from(0);
    let availableNotional = BigNumber.from(0);
    let fixedTokenDeltaUnbalanced = BigNumber.from(0);
    let fixedTokenDelta = BigNumber.from(0);

    await peripheryContract.callStatic.swap(swapPeripheryParams).then(
      (result: any) => {
        availableNotional = result[1];
        fee = result[2];
        fixedTokenDeltaUnbalanced = result[3];
        marginRequirement = result[4];
        tickAfter = parseInt(result[5], 10);
        fixedTokenDelta = result[0];
      },
      (error: any) => {
        const result = decodeInfoPostSwap(error);
        marginRequirement = result.marginRequirement;
        tickAfter = result.tick;
        fee = result.fee;
        availableNotional = result.availableNotional;
        fixedTokenDeltaUnbalanced = result.fixedTokenDeltaUnbalanced;
        fixedTokenDelta = result.fixedTokenDelta;
      },
    );

    const fixedRateBefore = tickToFixedRate(tickBefore);
    const fixedRateAfter = tickToFixedRate(tickAfter);

    const fixedRateDelta = fixedRateAfter.subtract(fixedRateBefore);
    const fixedRateDeltaRaw = fixedRateDelta.toNumber();

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, wallet);
    const currentMargin = (
      await exponentialBackoff(() =>
        marginEngineContract.callStatic.getPosition(walletAddress, tickLower, tickUpper),
      )
    ).margin;

    const scaledCurrentMargin = this.descale(currentMargin);
    const scaledAvailableNotional = this.descale(availableNotional);
    const scaledFee = this.descale(fee);
    const scaledMarginRequirement = (this.descale(marginRequirement) + scaledFee) * 1.01;

    const additionalMargin =
      scaledMarginRequirement > scaledCurrentMargin
        ? scaledMarginRequirement - scaledCurrentMargin
        : 0;

    const averageFixedRate = availableNotional.eq(BigNumber.from(0))
      ? 0
      : fixedTokenDeltaUnbalanced.mul(BigNumber.from(1000)).div(availableNotional).toNumber() /
        1000;

    let swapGasUnits = 0;
    const chainId = await wallet.getChainId();
    if (Object.values(SupportedChainId).includes(chainId)) {
      swapGasUnits = estimateSwapGasUnits(chainId);
    }
    const gasFeeETH = await convertGasUnitsToETH(this.provider, swapGasUnits);

    const maxMarginWithdrawable = Math.max(
      0,
      this.descale(currentMargin.sub(marginRequirement).sub(BigNumber.from(1))),
    );

    const result: InfoPostSwapV1 = {
      marginRequirement: additionalMargin,
      maxMarginWithdrawable: maxMarginWithdrawable,
      availableNotional:
        scaledAvailableNotional < 0 ? -scaledAvailableNotional : scaledAvailableNotional,
      fee: scaledFee < 0 ? -scaledFee : scaledFee,
      slippage: fixedRateDeltaRaw < 0 ? -fixedRateDeltaRaw : fixedRateDeltaRaw,
      averageFixedRate: averageFixedRate < 0 ? -averageFixedRate : averageFixedRate,
      fixedTokenDeltaBalance: this.descale(fixedTokenDelta),
      variableTokenDeltaBalance: this.descale(availableNotional),
      fixedTokenDeltaUnbalanced: this.descale(fixedTokenDeltaUnbalanced),
      gasFeeETH,
    };

    return result;
  }

  public async getExpectedApyInfo({
    margin,
    position,
    fixedLow,
    fixedHigh,
    fixedTokenDeltaUnbalanced,
    availableNotional,
    predictedVariableApy,
  }: ExpectedApyArgs): Promise<ExpectedApyInfo> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const signerAddress = await this.getUserAddress();

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const currentMargin = (
      await exponentialBackoff(() =>
        marginEngineContract.callStatic.getPosition(signerAddress, tickLower, tickUpper),
      )
    ).margin;

    const rateOracleContract = baseRateOracleFactory.connect(this.rateOracle.id, this.provider);

    const lastBlockTimestamp = (await getCurrentBlock(this.chainId, this.provider)).timestamp - 15;

    const scaledCurrentMargin = this.descale(currentMargin);

    let positionMargin = 0;
    let accruedCashflow = 0;
    let positionUft = 0;
    let positionVt = 0;

    if (position) {
      positionUft = position.swaps.reduce((acc, swap) => acc + swap.unbalancedFixedTokenDelta, 0);
      positionVt = position.swaps.reduce((acc, swap) => acc + swap.variableTokenDelta, 0);

      positionMargin = scaledCurrentMargin;

      try {
        if (position.swaps.length > 0) {
          const accruedCashflowInfo = await getCashflowInfo({
            swaps: transformSwaps(position.swaps),
            rateOracle: rateOracleContract,
            currentTime: Number(lastBlockTimestamp.toString()),
            endTime: this.termEndTimestampInMS / 1000,
          });
          accruedCashflow = accruedCashflowInfo.accruedCashflow;
        }
      } catch (error) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
      }
    }

    const [expectedApy, expectedCashflow] = this.expectedApy(
      positionUft + fixedTokenDeltaUnbalanced,
      positionVt + availableNotional,
      margin + positionMargin + accruedCashflow,
      predictedVariableApy,
    );

    const result: ExpectedApyInfo = {
      expectedApy,
      expectedCashflow,
    };

    return result;
  }

  public async swap({
    isFT,
    notional,
    margin,
    fixedRateLimit,
    fixedLow,
    fixedHigh,
    fullyCollateralisedVTSwap,
  }: AMMSwapArgs): Promise<ContractReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    } else if (isFT) {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString();
    } else {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString();
    }

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);

    let swapPeripheryParams: SwapPeripheryParams;
    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH && margin > 0) {
      swapPeripheryParams = {
        marginEngine: this.marginEngineAddress,
        isFT,
        notional: scaledNotional,
        sqrtPriceLimitX96,
        tickLower,
        tickUpper,
        marginDelta: 0, // passed as ETH
      };

      tempOverrides.value = utils.parseEther(margin.toFixed(18).toString());
    } else {
      const scaledMarginDelta = this.scale(margin);

      swapPeripheryParams = {
        marginEngine: this.marginEngineAddress,
        isFT,
        notional: scaledNotional,
        sqrtPriceLimitX96,
        tickLower,
        tickUpper,
        marginDelta: scaledMarginDelta,
      };
    }

    let swapTransaction;
    if (fullyCollateralisedVTSwap === undefined || fullyCollateralisedVTSwap === false) {
      await peripheryContract.callStatic
        .swap(swapPeripheryParams, tempOverrides)
        .catch(async (error: any) => {
          const errorMessage = getReadableErrorMessage(error);
          throw new Error(errorMessage);
        });

      const estimatedGas = await peripheryContract.estimateGas
        .swap(swapPeripheryParams, tempOverrides)
        .catch((error) => {
          const errorMessage = getReadableErrorMessage(error);
          throw new Error(errorMessage);
        });

      tempOverrides.gasLimit = getGasBuffer(estimatedGas);

      swapTransaction = await peripheryContract
        .swap(swapPeripheryParams, tempOverrides)
        .catch((error) => {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureException(error);
          sentryTracker.captureMessage('Transaction Confirmation Error');
          throw new Error('Transaction Confirmation Error');
        });
    } else {
      const { wad: variableFactorFromStartToNowWad } = await this.variableFactor(
        this.termStartTimestampInMS,
        this.termEndTimestampInMS,
      );

      // move rate oracle queries to another folder and make them stateless

      await peripheryContract.callStatic
        .fullyCollateralisedVTSwap(
          swapPeripheryParams,
          variableFactorFromStartToNowWad,
          tempOverrides,
        )
        .catch(async (error: any) => {
          const errorMessage = getReadableErrorMessage(error);
          throw new Error(errorMessage);
        });

      const estimatedGas = await peripheryContract.estimateGas
        .fullyCollateralisedVTSwap(
          swapPeripheryParams,
          variableFactorFromStartToNowWad,
          tempOverrides,
        )
        .catch((error) => {
          const errorMessage = getReadableErrorMessage(error);
          throw new Error(errorMessage);
        });

      tempOverrides.gasLimit = getGasBuffer(estimatedGas);

      swapTransaction = await peripheryContract
        .fullyCollateralisedVTSwap(
          swapPeripheryParams,
          variableFactorFromStartToNowWad,
          tempOverrides,
        )
        .catch((error) => {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureException(error);
          sentryTracker.captureMessage('Transaction Confirmation Error');
          throw new Error('Transaction Confirmation Error');
        });
    }

    try {
      const receipt = await swapTransaction.wait();
      return receipt;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  // lp

  public async lp({
    addLiquidity,
    fixedLow,
    fixedHigh,
    notional,
    margin,
  }: AMMLpArgs): Promise<ContractReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);

    let mintOrBurnParams: MintOrBurnParams;
    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH && margin > 0) {
      mintOrBurnParams = {
        marginEngine: this.marginEngineAddress,
        tickLower,
        tickUpper,
        notional: scaledNotional,
        isMint: addLiquidity,
        marginDelta: 0, // passed as ETH
      };

      tempOverrides.value = utils.parseEther(margin.toFixed(18).toString());
    } else {
      const scaledMarginDelta = this.scale(margin);

      mintOrBurnParams = {
        marginEngine: this.marginEngineAddress,
        tickLower,
        tickUpper,
        notional: scaledNotional,
        isMint: addLiquidity,
        marginDelta: scaledMarginDelta,
      };
    }

    await peripheryContract.callStatic
      .mintOrBurn(mintOrBurnParams, tempOverrides)
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    const estimatedGas = await peripheryContract.estimateGas
      .mintOrBurn(mintOrBurnParams, tempOverrides)
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    const lpTransaction = await peripheryContract
      .mintOrBurn(mintOrBurnParams, tempOverrides)
      .catch((error) => {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await lpTransaction.wait();
      return receipt;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  public async getInfoPostLp({
    addLiquidity,
    fixedLow,
    fixedHigh,
    notional,
  }: AMMGetInfoPostLpArgs): Promise<InfoPostLp> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    // todo: amount of notional should also be lower than what the user has already provided if removing liquidity

    const signerAddress = await this.getUserAddress();
    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);
    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower,
      tickUpper,
      notional: scaledNotional,
      isMint: addLiquidity,
      marginDelta: '0',
    };

    let marginRequirement = BigNumber.from('0');
    await peripheryContract.callStatic.mintOrBurn(mintOrBurnParams).then(
      (result) => {
        marginRequirement = BigNumber.from(result);
      },
      (error) => {
        const result = decodeInfoPostMint(error);
        marginRequirement = result.marginRequirement;
      },
    );

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const currentMargin = (
      await exponentialBackoff(() =>
        marginEngineContract.callStatic.getPosition(signerAddress, tickLower, tickUpper),
      )
    ).margin;

    // todo: confirm logic below is correct and test!
    let additionalMargin = 0;
    const scaledCurrentMargin = this.descale(currentMargin);
    const scaledMarginRequirement = this.descale(marginRequirement) * 1.01;

    if (scaledMarginRequirement > scaledCurrentMargin) {
      additionalMargin = scaledMarginRequirement - scaledCurrentMargin;
    }

    const wallet = this.signer || this.dummyWallet;
    let lpGasUnits = 0;
    const chainId = await wallet.getChainId();
    if (Object.values(SupportedChainId).includes(chainId)) {
      lpGasUnits = estimateSwapGasUnits(chainId);
    }

    const gasFeeETH = await convertGasUnitsToETH(this.provider, lpGasUnits);

    const maxMarginWithdrawable = Math.max(
      0,
      this.descale(currentMargin.sub(marginRequirement).sub(BigNumber.from(1))),
    );

    const result: InfoPostLp = {
      marginRequirement: additionalMargin,
      maxMarginWithdrawable: maxMarginWithdrawable,
      gasFeeETH,
    };

    return result;
  }

  // mint

  public async getInfoPostMint({
    fixedLow,
    fixedHigh,
    notional,
  }: AMMGetInfoPostMintArgs): Promise<number> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    const signerAddress = await this.getUserAddress();
    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);
    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower,
      tickUpper,
      notional: scaledNotional,
      isMint: true,
      marginDelta: '0',
    };

    let marginRequirement = BigNumber.from('0');
    await peripheryContract.callStatic.mintOrBurn(mintOrBurnParams).then(
      (result) => {
        marginRequirement = BigNumber.from(result);
      },
      (error) => {
        const result = decodeInfoPostMint(error);
        marginRequirement = result.marginRequirement;
      },
    );

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const currentMargin = (
      await exponentialBackoff(() =>
        marginEngineContract.callStatic.getPosition(signerAddress, tickLower, tickUpper),
      )
    ).margin;

    const scaledCurrentMargin = this.descale(currentMargin);
    const scaledMarginRequirement = this.descale(marginRequirement) * 1.01;

    if (scaledMarginRequirement > scaledCurrentMargin) {
      return scaledMarginRequirement - scaledCurrentMargin;
    }
    return 0;
  }

  public async mint({
    fixedLow,
    fixedHigh,
    notional,
    margin,
  }: AMMMintArgs): Promise<ContractReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    if (margin < 0) {
      throw new Error('Amount of margin cannot be negative');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);

    let mintOrBurnParams: MintOrBurnParams;
    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH && margin > 0) {
      mintOrBurnParams = {
        marginEngine: this.marginEngineAddress,
        tickLower,
        tickUpper,
        notional: scaledNotional,
        isMint: true,
        marginDelta: 0, // passed as ETH
      };

      tempOverrides.value = utils.parseEther(margin.toFixed(18).toString());
    } else {
      const scaledMarginDelta = this.scale(margin);

      mintOrBurnParams = {
        marginEngine: this.marginEngineAddress,
        tickLower,
        tickUpper,
        notional: scaledNotional,
        isMint: true,
        marginDelta: scaledMarginDelta,
      };
    }

    await peripheryContract.callStatic
      .mintOrBurn(mintOrBurnParams, tempOverrides)
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    const estimatedGas = await peripheryContract.estimateGas
      .mintOrBurn(mintOrBurnParams, tempOverrides)
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    const mintTransaction = await peripheryContract
      .mintOrBurn(mintOrBurnParams, tempOverrides)
      .catch((error) => {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await mintTransaction.wait();
      return receipt;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  // burn

  public async burn({ fixedLow, fixedHigh, notional }: AMMBurnArgs): Promise<ContractReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);

    const scaledNotional = this.scale(notional);

    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower,
      tickUpper,
      notional: scaledNotional,
      isMint: false,
      marginDelta: '0',
    };

    await peripheryContract.callStatic.mintOrBurn(mintOrBurnParams).catch((error) => {
      const errorMessage = getReadableErrorMessage(error);
      throw new Error(errorMessage);
    });

    const estimatedGas = await peripheryContract.estimateGas.mintOrBurn(mintOrBurnParams);

    const burnTransaction = await peripheryContract
      .mintOrBurn(mintOrBurnParams, {
        gasLimit: getGasBuffer(estimatedGas),
      })
      .catch((error) => {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await burnTransaction.wait();
      return receipt;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  // update position margin

  public async updatePositionMargin({
    fixedLow,
    fixedHigh,
    marginDelta,
  }: AMMUpdatePositionMarginArgs): Promise<ContractReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (marginDelta === 0) {
      throw new Error('No margin delta to update');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};
    let scaledMarginDelta: string;

    if (this.isETH && marginDelta > 0) {
      tempOverrides.value = utils.parseEther(marginDelta.toFixed(18).toString());
      scaledMarginDelta = '0';
    } else {
      scaledMarginDelta = this.scale(marginDelta);
    }

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);

    await peripheryContract.callStatic
      .updatePositionMargin(
        this.marginEngineAddress,
        tickLower,
        tickUpper,
        scaledMarginDelta,
        false,
        tempOverrides,
      )
      .catch(async (error: any) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    const estimatedGas = await peripheryContract.estimateGas.updatePositionMargin(
      this.marginEngineAddress,
      tickLower,
      tickUpper,
      scaledMarginDelta,
      false,
      tempOverrides,
    );

    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    const updatePositionMarginTransaction = await peripheryContract
      .updatePositionMargin(
        this.marginEngineAddress,
        tickLower,
        tickUpper,
        scaledMarginDelta,
        false,
        tempOverrides,
      )
      .catch((error) => {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await updatePositionMarginTransaction.wait();
      return receipt;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  // settlement

  public async settlePosition({
    owner,
    fixedLow,
    fixedHigh,
  }: AMMSettlePositionArgs): Promise<ContractReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const effectiveOwner = !owner ? await this.getUserAddress() : owner;

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);

    await peripheryContract.callStatic
      .settlePositionAndWithdrawMargin(
        this.marginEngineAddress,
        effectiveOwner,
        tickLower,
        tickUpper,
      )
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    const estimatedGas = await peripheryContract.estimateGas.settlePositionAndWithdrawMargin(
      this.marginEngineAddress,
      effectiveOwner,
      tickLower,
      tickUpper,
    );

    const settlePositionTransaction = await peripheryContract
      .settlePositionAndWithdrawMargin(
        this.marginEngineAddress,
        effectiveOwner,
        tickLower,
        tickUpper,
        {
          gasLimit: getGasBuffer(estimatedGas),
        },
      )
      .catch((error) => {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await settlePositionTransaction.wait();
      return receipt;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  public async getInfoPostSettlePosition({
    owner,
    fixedLow,
    fixedHigh,
  }: AMMSettlePositionArgs): Promise<InfoPostSettlePosition> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const effectiveOwner = !owner ? await this.getUserAddress() : owner;

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.signer);

    const gasLimit = await peripheryContract.estimateGas.settlePositionAndWithdrawMargin(
      this.marginEngineAddress,
      effectiveOwner,
      tickLower,
      tickUpper,
    );

    const gasFeeETH = await convertGasUnitsToETH(this.provider, gasLimit.toNumber());

    return {
      gasFeeETH,
    };
  }

  // scale/descale according to underlying token
  public scale(value: number): string {
    return utils
      .parseUnits(value.toFixed(this.underlyingToken.decimals), this.underlyingToken.decimals)
      .toString();
  }

  public descale(value: BigNumber): number {
    return Number(utils.formatUnits(value, this.underlyingToken.decimals));
  }

  // token approval for periphery
  public async isTokenApprovedForPeriphery({
    forceErc20Check,
    approvalAmount, // Unscaled, e.g. dollars not wei
  }: {
    forceErc20Check: boolean;
    approvalAmount?: number;
  }): Promise<boolean> {
    if (!forceErc20Check && this.isETH) {
      return true;
    }

    const scaledAmount = approvalAmount && this.scale(approvalAmount);

    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const signerAddress = await this.getUserAddress();

    const tokenAddress = this.underlyingToken.id;
    const token = tokenFactory.connect(tokenAddress, this.signer);

    const allowance = await exponentialBackoff(() =>
      token.allowance(signerAddress, this.peripheryAddress),
    );

    if (scaledAmount === undefined) {
      return allowance.gte(TresholdApprovalBn);
    }
    return allowance.gte(scaledAmount);
  }

  public async getUnderlyingTokenAllowance({
    forceErc20Check,
    chainId,
    alchemyApiKey,
  }: {
    forceErc20Check: boolean;
    chainId: SupportedChainId;
    alchemyApiKey: string;
  }): Promise<number> {
    if (!forceErc20Check && this.isETH) {
      return Number.MAX_SAFE_INTEGER;
    }

    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const signerAddress = await this.getUserAddress();

    return await tokenAllowance({
      tokenId: this.underlyingToken.id,
      userAddress: signerAddress,
      to: this.peripheryAddress,
      forceErc20: forceErc20Check,
      chainId,
      alchemyApiKey,
    });
  }

  public async approveUnderlyingTokenForPeriphery(): Promise<void> {
    if (!this.underlyingToken.id) {
      throw new Error('No underlying token');
    }

    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const tokenAddress = this.underlyingToken.id;
    const token = tokenFactory.connect(tokenAddress, this.signer);

    let estimatedGas;
    try {
      estimatedGas = await token.estimateGas.approve(this.peripheryAddress, MaxUint256Bn);
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(
        `Could not increase periphery allowance (${tokenAddress}, ${await this.getUserAddress()}, ${MaxUint256Bn.toString()})`,
      );
      throw new Error(
        `Unable to approve. If your existing allowance is non-zero but lower than needed, some tokens like USDT require you to call approve("${this.peripheryAddress}", 0) before you can increase the allowance.`,
      );
    }

    const approvalTransaction = await token
      .approve(this.peripheryAddress, MaxUint256Bn, {
        gasLimit: getGasBuffer(estimatedGas),
      })
      .catch((error) => {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      await approvalTransaction.wait();
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Token approval failed');
      throw new Error('Token approval failed');
    }
  }

  public async approveUnderlyingTokenForPeripheryV1(): Promise<number> {
    if (!this.underlyingToken.id) {
      throw new Error('No underlying token');
    }

    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const approveTokenResponse = await approveToken({
      tokenId: this.underlyingToken.id,
      to: this.peripheryAddress,
      amount: undefined,
      signer: this.signer,
    });

    return approveTokenResponse.allowance;
  }

  // protocol name

  public get protocol(): string {
    const tokenName = this.underlyingToken.name;

    const prefix = getProtocolPrefix(this.rateOracle.protocolId);

    return `${prefix}${tokenName}`;
  }

  public get market(): Market {
    return getMarket(this.rateOracle.protocolId);
  }

  // start and end dates

  public get startDateTime(): DateTime {
    return DateTime.fromMillis(this.termStartTimestampInMS);
  }

  public get endDateTime(): DateTime {
    return DateTime.fromMillis(this.termEndTimestampInMS);
  }

  public async getFixedApr(): Promise<number> {
    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.provider);
    const currentTick = await exponentialBackoff(() =>
      peripheryContract.getCurrentTick(this.marginEngineAddress),
    );
    const apr = tickToFixedRate(currentTick).toNumber();

    return apr;
  }

  // tick functionalities

  public closestTickAndFixedRate(fixedRate: number): ClosestTickAndFixedRate {
    const inRangeFixedRate = Math.min(Math.max(fixedRate, MIN_FIXED_RATE), MAX_FIXED_RATE);

    const fixedRatePrice = Price.fromNumber(inRangeFixedRate);
    const closestTick: number = fixedRateToClosestTick(fixedRatePrice);
    const closestUsableTick: number = nearestUsableTick(closestTick, this.tickSpacing);
    const closestUsableFixedRate: Price = tickToFixedRate(closestUsableTick);

    return {
      closestUsableTick,
      closestUsableFixedRate,
    };
  }

  public getNextUsableFixedRate(fixedRate: number, count: number): number {
    let { closestUsableTick } = this.closestTickAndFixedRate(fixedRate);
    closestUsableTick -= count * this.tickSpacing;
    return tickToFixedRate(closestUsableTick).toNumber();
  }

  // historocal rates

  public async getHistoricalVariableRate(
    chainId: SupportedChainId,
    filters: {
      granularity: Granularity;
      timeframeMs: number;
    },
    historicalRatesApiKey: string,
  ): Promise<RatesData> {
    const result = await getHistoricalRates({
      chainId: chainId,
      isFixed: false,
      filters,
      ammId: this.id,
      rateOracleId: this.rateOracle.id,
      historicalRatesApiKey: historicalRatesApiKey,
    });
    return result;
  }

  public async getHistoricalFixedRate(
    chainId: SupportedChainId,
    filters: {
      granularity: Granularity;
      timeframeMs: number;
    },
    historicalRatesApiKey: string,
  ): Promise<RatesData> {
    const result = await getHistoricalRates({
      chainId: chainId,
      isFixed: true,
      filters,
      ammId: this.id,
      rateOracleId: this.rateOracle.id,
      historicalRatesApiKey: historicalRatesApiKey,
    });
    return result;
  }

  // balance checks

  public async underlyingTokens(): Promise<number> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const signerAddress = await this.getUserAddress();

    let currentBalance: BigNumber;
    if (this.isETH) {
      currentBalance = await exponentialBackoff(() => this.provider.getBalance(signerAddress));
    } else {
      if (!this.underlyingToken.id) {
        throw new Error('No underlying token');
      }

      const tokenAddress = this.underlyingToken.id;
      const token = tokenFactory.connect(tokenAddress, this.signer);

      currentBalance = await exponentialBackoff(() => token.balanceOf(signerAddress));
    }

    return this.descale(currentBalance);
  }

  // instant apy
  async getInstantApy(timestampInMS?: number): Promise<number> {
    let block: number;
    if (timestampInMS) {
      block = await getBlockAtTimestampHeuristic(this.chainId, this.provider, timestampInMS / 1000);
    } else {
      block = (await getCurrentBlock(this.chainId, this.provider)).number;
    }

    const blocksPerDay = 6570; // 13.15 seconds per block

    switch (this.rateOracle.protocolId) {
      case 1: {
        if (!this.underlyingToken.id) {
          throw new Error('No underlying error');
        }

        const rateOracleContract = aaveBorrowRateOracleFactory.connect(
          this.rateOracle.id,
          this.provider,
        );
        const lendingPoolAddress = await exponentialBackoff(() =>
          rateOracleContract.aaveLendingPool({ blockTag: block }),
        );
        const lendingPool = iAaveV2LendingPoolFactory.connect(lendingPoolAddress, this.provider);
        const reservesData = await exponentialBackoff(() =>
          lendingPool.getReserveData(this.underlyingToken.id, { blockTag: block }),
        );
        const rateInRay = reservesData.currentLiquidityRate;
        const result = rateInRay.div(BigNumber.from(10).pow(21)).toNumber() / 1000000;
        return result;
      }
      case 2: {
        const daysPerYear = 365;
        const rateOracle = compoundRateOracleFactory.connect(this.rateOracle.id, this.provider);
        const cTokenAddress = await exponentialBackoff(() =>
          (rateOracle as CompoundRateOracle).ctoken({ blockTag: block }),
        );
        const cTokenContract = iCTokenFactory.connect(cTokenAddress, this.provider);
        const supplyRatePerBlock = await exponentialBackoff(() =>
          cTokenContract.supplyRatePerBlock({ blockTag: block }),
        );
        const supplyApy =
          ((supplyRatePerBlock.toNumber() / 1e18) * blocksPerDay + 1) ** daysPerYear - 1;
        return supplyApy;
      }

      case 3:
      case 4: {
        const toInSeconds =
          (await exponentialBackoff(() => this.provider.getBlock(block))).timestamp - 15;
        const fromInSeconds = toInSeconds - 28 * 60 * 60;

        const rateOracleContract = baseRateOracleFactory.connect(this.rateOracle.id, this.provider);

        const instantApy = await exponentialBackoff(() =>
          rateOracleContract.getApyFromTo(fromInSeconds, toInSeconds, { blockTag: block }),
        );

        // TODO: normalize this to utility descale
        return instantApy.div(BigNumber.from(1000000000000)).toNumber() / 1000000;
      }

      case 5: {
        if (!this.underlyingToken.id) {
          throw new Error('No underlying error');
        }

        const rateOracleContract = aaveBorrowRateOracleFactory.connect(
          this.rateOracle.id,
          this.provider,
        );
        const lendingPoolAddress = await exponentialBackoff(() =>
          rateOracleContract.aaveLendingPool({ blockTag: block }),
        );
        const lendingPool = iAaveV2LendingPoolFactory.connect(lendingPoolAddress, this.provider);
        const reservesData = await exponentialBackoff(() =>
          lendingPool.getReserveData(this.underlyingToken.id, { blockTag: block }),
        );
        const rateInRay = reservesData.currentVariableBorrowRate;
        const result = rateInRay.div(BigNumber.from(10).pow(21)).toNumber() / 1000000;
        return result;
      }

      case 6: {
        const daysPerYear = 365;

        const rateOracle = compoundBorrowRateOracleFactory.connect(
          this.rateOracle.id,
          this.provider,
        );

        const cTokenAddress = await exponentialBackoff(() =>
          (rateOracle as CompoundBorrowRateOracle).ctoken({ blockTag: block }),
        );
        const cTokenContract = iCTokenFactory.connect(cTokenAddress, this.provider);

        const borrowRatePerBlock = await exponentialBackoff(() =>
          cTokenContract.borrowRatePerBlock({ blockTag: block }),
        );
        const borrowApy =
          ((borrowRatePerBlock.toNumber() / 1e18) * blocksPerDay + 1) ** daysPerYear - 1;
        return borrowApy;
      }

      case 7:
      case 9: {
        if (!this.underlyingToken.id) {
          throw new Error('No underlying error');
        }

        const rateOracleContract = aaveV3RateOracleFactory.connect(
          this.rateOracle.id,
          this.provider,
        );

        const toInSeconds =
          (await exponentialBackoff(() => this.provider.getBlock(block))).timestamp - 15;
        const fromInSeconds = toInSeconds - 1 * 60 * 60;

        const instantApy = await exponentialBackoff(() =>
          rateOracleContract.getApyFromTo(fromInSeconds, toInSeconds, { blockTag: block }),
        );

        // TODO: normalize this to utility descale
        return instantApy.div(BigNumber.from(1000000000000)).toNumber() / 1000000;
      }

      case 8: {
        if (!this.underlyingToken.id) {
          throw new Error('No underlying error');
        }

        const ethUsdPrice = await exponentialBackoff(() => this.ethPrice());
        const ethUsdPriceWad = BigNumber.from(Math.round(ethUsdPrice * 1000))
          .mul(WAD_PRECISION)
          .div(1000);

        const rateOracleContract = glpRateOracleFactory.connect(this.rateOracle.id, this.provider);
        const rewardTrackerAddress = await exponentialBackoff(() =>
          rateOracleContract.rewardTracker({ blockTag: block }),
        );
        const rewardTracker = rewardTrackerFactory.connect(rewardTrackerAddress, this.provider);
        const tokensPerIntervalWad = await exponentialBackoff(() =>
          rewardTracker.tokensPerInterval({ blockTag: block }),
        );

        const glpManagerAddress = await exponentialBackoff(() =>
          rateOracleContract.glpManager({ blockTag: block }),
        );
        const glpManager = glpManagerFactory.connect(glpManagerAddress, this.provider);
        const aumUsdWad = (
          await exponentialBackoff(() => glpManager.getAum(false, { blockTag: block }))
        )
          .mul(WAD_PRECISION)
          .div(GLP_PRECISION);

        const instantApy = tokensPerIntervalWad
          .mul(ONE_YEAR_IN_SECONDS)
          .mul(ethUsdPriceWad)
          .div(aumUsdWad);

        return instantApy.div(BigNumber.from(1000000000000)).toNumber() / 1000000;
      }

      default:
        throw new Error('Unrecognized protocol');
    }
  }

  private async getPoolSwapInfoOneSide({
    isFT,
    sqrtPriceLimitX96,
  }: {
    isFT: boolean;
    sqrtPriceLimitX96: BigNumber;
  }): Promise<{
    availableNotional: number;
    maxLeverage: number;
  }> {
    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.dummyWallet);

    let availableNotional = BigNumber.from(0);
    let maxLeverage = BigNumber.from(0);

    {
      const swapPeripheryParamsLargeSwap = {
        marginEngine: this.marginEngineAddress,
        isFT,
        notional: this.scale(1000000000000000),
        sqrtPriceLimitX96,
        tickLower: -69060,
        tickUpper: 0,
        marginDelta: '0',
      };

      await peripheryContract.callStatic.swap(swapPeripheryParamsLargeSwap).then(
        (result: any) => {
          availableNotional = result[1];
        },
        (error: any) => {
          const result = decodeInfoPostSwap(error);
          availableNotional = result.availableNotional;
        },
      );
    }

    {
      const smallNotionalScaled = this.scale(1);
      const swapPeripheryParamsSmallSwap = {
        marginEngine: this.marginEngineAddress,
        isFT,
        notional: smallNotionalScaled,
        sqrtPriceLimitX96,
        tickLower: -69060,
        tickUpper: 0,
        marginDelta: '0',
      };

      let marginRequirement = BigNumber.from(0);
      await peripheryContract.callStatic.swap(swapPeripheryParamsSmallSwap).then(
        (result: any) => {
          marginRequirement = result[4];
        },
        (error: any) => {
          const result = decodeInfoPostSwap(error);
          marginRequirement = result.marginRequirement;
        },
      );

      if (marginRequirement.gt(0)) {
        // should always happen, since we connect with dummy account
        maxLeverage = BigNumber.from(smallNotionalScaled)
          .mul(BigNumber.from(10).pow(this.underlyingToken.decimals))
          .div(marginRequirement);
      }
    }

    return {
      availableNotional: this.descale(availableNotional.abs()),
      maxLeverage: Math.floor(this.descale(maxLeverage)),
    };
  }

  public async getPoolLpInfo(fixedLow: number, fixedHigh: number): Promise<PoolLpInfo> {
    const poolLpInfo: PoolLpInfo = {
      maxLeverage: 0,
    };

    const peripheryContract = peripheryFactory.connect(this.peripheryAddress, this.dummyWallet);
    const smallNotionalScaled = this.scale(1);
    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower,
      tickUpper,
      notional: smallNotionalScaled,
      isMint: true,
      marginDelta: '0',
    };

    let marginRequirement = BigNumber.from('0');

    await peripheryContract.callStatic.mintOrBurn(mintOrBurnParams).then(
      (result) => {
        marginRequirement = BigNumber.from(result);
      },
      (error) => {
        const result = decodeInfoPostMint(error);
        marginRequirement = result.marginRequirement;
      },
    );

    if (marginRequirement.gt(0)) {
      // should always happen, since we connect with dummy account
      const maxLeverage: BigNumber = BigNumber.from(smallNotionalScaled)
        .mul(BigNumber.from(10).pow(this.underlyingToken.decimals))
        .div(marginRequirement);
      poolLpInfo.maxLeverage = Math.floor(this.descale(maxLeverage));
    }

    return poolLpInfo;
  }

  public async getPoolSwapInfo(): Promise<PoolSwapInfo> {
    const poolSwapInfo: PoolSwapInfo = {
      availableNotionalFT: 0,
      availableNotionalVT: 0,
      maxLeverageFT: 0,
      maxLeverageVT: 0,
    };

    {
      const { availableNotional, maxLeverage } = await this.getPoolSwapInfoOneSide({
        isFT: true,
        sqrtPriceLimitX96: BigNumber.from(
          TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString(),
        ),
      });
      poolSwapInfo.availableNotionalFT = availableNotional;
      poolSwapInfo.maxLeverageFT = maxLeverage;
    }

    {
      const { availableNotional, maxLeverage } = await this.getPoolSwapInfoOneSide({
        isFT: false,
        sqrtPriceLimitX96: BigNumber.from(
          TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString(),
        ),
      });
      poolSwapInfo.availableNotionalVT = availableNotional;
      poolSwapInfo.maxLeverageVT = maxLeverage;
    }

    return poolSwapInfo;
  }

  public async getExpectedCashflowInfo({
    position,
    prospectiveSwapAvgFixedRate,
    prospectiveSwapNotional,
  }: ExpectedCashflowArgs): Promise<ExpectedCashflowInfo> {
    const rateOracleContract = baseRateOracleFactory.connect(this.rateOracle.id, this.provider);
    const lastBlockTimestamp =
      (await exponentialBackoff(() => this.provider.getBlock('latest'))).timestamp - 15;

    const prospectiveSwap: TransformedSwap = {
      avgFixedRate: prospectiveSwapAvgFixedRate,
      notional: prospectiveSwapNotional,
      time: lastBlockTimestamp,
    };

    const existingPositionCashflowInfo = await getCashflowInfo({
      swaps: position ? transformSwaps(position.swaps) : [],
      rateOracle: rateOracleContract,
      currentTime: Number(lastBlockTimestamp.toString()),
      endTime: this.termEndTimestampInMS / 1000,
    });

    let editPositionCashflowInfo: CashflowInfo;
    if (prospectiveSwap.notional === 0) {
      editPositionCashflowInfo = existingPositionCashflowInfo;
    } else {
      editPositionCashflowInfo = await getCashflowInfo({
        swaps: (position ? transformSwaps(position.swaps) : []).concat(prospectiveSwap),
        rateOracle: rateOracleContract,
        currentTime: Number(lastBlockTimestamp.toString()),
        endTime: this.termEndTimestampInMS / 1000,
      });
    }

    return {
      averageFixedRate: editPositionCashflowInfo.avgFixedRate,
      accruedCashflowExistingPosition: existingPositionCashflowInfo.accruedCashflow,
      accruedCashflowEditPosition: editPositionCashflowInfo.accruedCashflow,
      estimatedAdditionalCashflow: (estimatedApy: number) =>
        editPositionCashflowInfo.estimatedTotalCashflow(estimatedApy) -
        existingPositionCashflowInfo.estimatedTotalCashflow(estimatedApy),
      estimatedTotalCashflow: editPositionCashflowInfo.estimatedTotalCashflow,
    };
  }
}
