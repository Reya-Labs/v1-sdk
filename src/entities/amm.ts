import JSBI from 'jsbi';
import { ethers, providers } from 'ethers';
import { DateTime } from 'luxon';
import { BigNumber, ContractReceipt, Signer, utils } from 'ethers';

import { SwapPeripheryParams, MintOrBurnParams } from '../types';
import {
  MIN_FIXED_RATE,
  MAX_FIXED_RATE,
  ONE_YEAR_IN_SECONDS,
  MaxUint256Bn,
  TresholdApprovalBn,
  getGasBuffer,
} from '../constants';
import {
  Periphery__factory as peripheryFactory,
  MarginEngine__factory as marginEngineFactory,
  Factory__factory as factoryFactory,
  IERC20Minimal__factory as tokenFactory,
  BaseRateOracle__factory,
  ICToken__factory,
  CompoundRateOracle,
  CompoundRateOracle__factory,
  CompoundBorrowRateOracle,
  AaveBorrowRateOracle__factory,
  IAaveV2LendingPool__factory,
  CompoundBorrowRateOracle__factory,
} from '../typechain';
import RateOracle from './rateOracle';
import { TickMath } from '../utils/tickMath';
import timestampWadToDateTime from '../utils/timestampWadToDateTime';
import { fixedRateToClosestTick, tickToFixedRate } from '../utils/priceTickConversions';
import { nearestUsableTick } from '../utils/nearestUsableTick';
import Token from './token';
import { Price } from './fractions/price';
import { TokenAmount } from './fractions/tokenAmount';
import {
  decodeInfoPostMint,
  decodeInfoPostSwap,
  getReadableErrorMessage,
} from '../utils/errors/errorHandling';
import Position from './position';
import { getExpectedApy } from '../services/getExpectedApy';
import { getAccruedCashflow, transformSwaps } from '../services/getAccruedCashflow';

import axios from 'axios';
import { getProtocolPrefix } from '../services/getTokenInfo';

import { sentryTracker } from '../utils/sentry';
import { getRangeHealthFactor } from '../utils/rangeHealthFactor';

var geckoEthToUsd = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      let data = await axios.get(
        'https://pro-api.coingecko.com/api/v3/simple/price?x_cg_pro_api_key=' +
          process.env.REACT_APP_COINGECKO_API_KEY +
          '&ids=ethereum&vs_currencies=usd',
      );
      return data.data.ethereum.usd;
    } catch (error) {}
  }
  return 0;
};

export type AMMConstructorArgs = {
  id: string;
  signer: Signer | null;
  provider?: providers.Provider;

  factoryAddress: string;
  marginEngineAddress: string;
  rateOracle: RateOracle;
  underlyingToken: Token;

  termStartTimestamp: JSBI;
  termEndTimestamp: JSBI;

  tickSpacing: number;
  wethAddress: string;

  ethPrice?: () => Promise<number>;
};

// swap

export type AMMGetInfoPostSwapArgs = {
  position?: Position;
  isFT: boolean;
  notional: number;
  fixedRateLimit?: number;
  fixedLow: number;
  fixedHigh: number;
  margin?: number;
};

export type AMMSwapArgs = {
  isFT: boolean;
  notional: number;
  margin: number;
  fixedRateLimit?: number;
  fixedLow: number;
  fixedHigh: number;
  validationOnly?: boolean;
  fullyCollateralisedVTSwap?: boolean;
};

export type AMMSwapWithWethArgs = {
  isFT: boolean;
  notional: number;
  margin: number;
  marginEth?: number;
  fixedRateLimit?: number;
  fixedLow: number;
  fixedHigh: number;
  validationOnly?: boolean;
};

export type InfoPostSwap = {
  marginRequirement: number;
  availableNotional: number;
  fee: number;
  slippage: number;
  averageFixedRate: number;
  fixedTokenDeltaBalance: number;
  variableTokenDeltaBalance: number;
  fixedTokenDeltaUnbalanced: number;
  maxAvailableNotional?: number;
};

export type ExpectedApyArgs = {
  margin: number;
  position?: Position;
  fixedLow: number;
  fixedHigh: number;
  fixedTokenDeltaUnbalanced: number;
  availableNotional: number;
  predictedVariableApy: number;
};

export type ExpectedApyInfo = {
  expectedApy: number;
  expectedCashflow: number;
};

// rollover with swap

export type AMMRolloverWithSwapArgs = {
  isFT: boolean;
  notional: number;
  margin: number;
  marginEth?: number;
  fixedRateLimit?: number;
  fixedLow: number;
  fixedHigh: number;
  owner: string;
  newMarginEngine: string;
  oldFixedLow: number;
  oldFixedHigh: number;
  validationOnly?: boolean;
};

// mint

export type AMMMintArgs = {
  fixedLow: number;
  fixedHigh: number;
  notional: number;
  margin: number;
  validationOnly?: boolean;
};

export type AMMMintWithWethArgs = {
  fixedLow: number;
  fixedHigh: number;
  notional: number;
  marginEth?: number;
  margin: number;
  validationOnly?: boolean;
};

export type AMMGetInfoPostMintArgs = {
  fixedLow: number;
  fixedHigh: number;
  notional: number;
};

//rollover with swap

export type AMMRolloverWithMintArgs = {
  fixedLow: number;
  fixedHigh: number;
  notional: number;
  margin: number;
  marginEth?: number;
  owner: string;
  newMarginEngine: string;
  oldFixedLow: number;
  oldFixedHigh: number;
  validationOnly?: boolean;
};

export type AMMGetInfoPostRolloverWithMintArgs = {
  fixedLow: number;
  fixedHigh: number;
  notional: number;
  owner: string;
  newMarginEngine: string;
  oldFixedLow: number;
  oldFixedHigh: number;
};

// burn

export type AMMBurnArgs = Omit<AMMMintArgs, 'margin'>;

// update position margin

export type AMMUpdatePositionMarginArgs = {
  owner?: string;
  fixedLow: number;
  fixedHigh: number;
  marginDelta: number;
};

// liquidation

export type AMMLiquidatePositionArgs = {
  owner: string;
  fixedLow: number;
  fixedHigh: number;
};

// settlement

export type AMMSettlePositionArgs = {
  owner?: string;
  fixedLow: number;
  fixedHigh: number;
};

export enum HealthFactorStatus {
  NOT_FOUND = 0,
  DANGER = 1,
  WARNING = 2,
  HEALTHY = 3,
}

// dynamic information about position

export type PositionInfo = {
  fixedTokenBalance: number;
  variableTokenBalance: number;

  liquidity: number;
  liquidityInUSD: number;

  notional: number;
  notionalInUSD: number;

  margin: number;
  marginInUSD: number;

  fees: number;
  feesInUSD: number;

  settlementCashflow: number;
  settlementCashflowInUSD: number;

  liquidationThreshold: number;
  safetyThreshold: number;

  accruedCashflow: number;
  accruedCashflowInUSD: number;

  variableRateSinceLastSwap: number;
  fixedRateSinceLastSwap: number;

  beforeMaturity: boolean;

  fixedApr: number;
  healthFactor: HealthFactorStatus;
  fixedRateHealthFactor: HealthFactorStatus;
};

export type ClosestTickAndFixedRate = {
  closestUsableTick: number;
  closestUsableFixedRate: Price;
};

class AMM {
  public readonly id: string;
  public readonly signer: Signer | null;
  public readonly provider?: providers.Provider;
  public readonly factoryAddress: string;
  public readonly marginEngineAddress: string;
  public readonly rateOracle: RateOracle;
  public readonly termStartTimestamp: JSBI;
  public readonly termEndTimestamp: JSBI;
  public readonly underlyingToken: Token;
  public readonly tickSpacing: number;
  public readonly isETH: boolean;
  public readonly wethAddress: string;
  public readonly ethPrice: () => Promise<number>;

  public constructor({
    id,
    signer,
    provider,
    factoryAddress,
    marginEngineAddress,
    rateOracle,
    termStartTimestamp,
    termEndTimestamp,
    underlyingToken,
    tickSpacing,
    wethAddress,
    ethPrice,
  }: AMMConstructorArgs) {
    this.id = id;
    this.signer = signer;
    this.provider = provider || signer?.provider;
    this.factoryAddress = factoryAddress;
    this.marginEngineAddress = marginEngineAddress;
    this.rateOracle = rateOracle;
    this.termStartTimestamp = termStartTimestamp;
    this.termEndTimestamp = termEndTimestamp;
    this.underlyingToken = underlyingToken;
    this.tickSpacing = tickSpacing;
    this.wethAddress = wethAddress;
    this.isETH = this.underlyingToken.name === 'ETH';
    this.ethPrice = ethPrice || geckoEthToUsd;
  }

  // expected apy
  expectedApy = async (ft: BigNumber, vt: BigNumber, margin: number, rate: number) => {
    const now = Math.round(new Date().getTime() / 1000);

    const end =
      BigNumber.from(this.termEndTimestamp.toString()).div(BigNumber.from(10).pow(12)).toNumber() /
      1000000;

    let scaledFt = 0;
    let scaledVt = 0;

    if (this.underlyingToken.decimals <= 6) {
      scaledFt = ft.toNumber() / 10 ** this.underlyingToken.decimals;
      scaledVt = vt.toNumber() / 10 ** this.underlyingToken.decimals;
    } else {
      scaledFt =
        ft.div(BigNumber.from(10).pow(this.underlyingToken.decimals - 6)).toNumber() / 1000000;
      scaledVt =
        vt.div(BigNumber.from(10).pow(this.underlyingToken.decimals - 6)).toNumber() / 1000000;
    }

    const [pnl, ecs] = getExpectedApy(now, end, scaledFt, scaledVt, margin, rate);

    return [100 * pnl, ecs];
  };

  // rollover with swap

  public async rolloverWithSwap({
    isFT,
    notional,
    margin,
    marginEth,
    fixedRateLimit,
    fixedLow,
    fixedHigh,
    owner,
    newMarginEngine,
    oldFixedLow,
    oldFixedHigh,
    validationOnly,
  }: AMMRolloverWithSwapArgs): Promise<ContractReceipt | void> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh && oldFixedLow >= oldFixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE && oldFixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE && oldFixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    if (margin < 0) {
      throw new Error('Amount of margin cannot be negative');
    }

    if (marginEth && marginEth < 0) {
      throw new Error('Amount of margin in ETH cannot be negative');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    if (validationOnly) {
      return;
    }

    const effectiveOwner = !owner ? await this.signer.getAddress() : owner;

    const { closestUsableTick: oldTickUpper } = this.closestTickAndFixedRate(oldFixedLow);
    const { closestUsableTick: oldTickLower } = this.closestTickAndFixedRate(oldFixedHigh);

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    } else {
      if (isFT) {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString();
      } else {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString();
      }
    }

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();
    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);

    let swapPeripheryParams: SwapPeripheryParams;
    let tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH && marginEth) {
      tempOverrides.value = ethers.utils.parseEther(marginEth.toFixed(18).toString());
    }

    const scaledMarginDelta = this.scale(margin);

    swapPeripheryParams = {
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
        effectiveOwner,
        oldTickLower,
        oldTickUpper,
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
        effectiveOwner,
        oldTickLower,
        oldTickUpper,
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
        effectiveOwner,
        oldTickLower,
        oldTickUpper,
        swapPeripheryParams,
        tempOverrides,
      )
      .catch((error) => {
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await swapTransaction.wait();
      return receipt;
    } catch (error) {
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
    marginEth,
    owner,
    newMarginEngine,
    oldFixedLow,
    oldFixedHigh,
    validationOnly,
  }: AMMRolloverWithMintArgs): Promise<ContractReceipt | void> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    if (fixedLow >= fixedHigh && oldFixedLow >= oldFixedHigh) {
      throw new Error('Lower Rate must be smaller than Upper Rate');
    }

    if (fixedLow < MIN_FIXED_RATE && oldFixedLow < MIN_FIXED_RATE) {
      throw new Error('Lower Rate is too low');
    }

    if (fixedHigh > MAX_FIXED_RATE && oldFixedHigh > MAX_FIXED_RATE) {
      throw new Error('Upper Rate is too high');
    }

    if (notional <= 0) {
      throw new Error('Amount of notional must be greater than 0');
    }

    if (margin < 0) {
      throw new Error('Amount of margin cannot be negative');
    }

    if (marginEth && marginEth < 0) {
      throw new Error('Amount of margin in ETH cannot be negative');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    if (validationOnly) {
      return;
    }

    const effectiveOwner = !owner ? await this.signer.getAddress() : owner;

    const { closestUsableTick: oldTickUpper } = this.closestTickAndFixedRate(oldFixedLow);
    const { closestUsableTick: oldTickLower } = this.closestTickAndFixedRate(oldFixedHigh);

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();
    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);
    const _notional = this.scale(notional);

    let mintOrBurnParams: MintOrBurnParams;
    let tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH && marginEth) {
      tempOverrides.value = ethers.utils.parseEther(marginEth.toFixed(18).toString());
    }

    const scaledMarginDelta = this.scale(margin);

    mintOrBurnParams = {
      marginEngine: newMarginEngine,
      tickLower,
      tickUpper,
      notional: _notional,
      isMint: true,
      marginDelta: scaledMarginDelta,
    };

    await peripheryContract.callStatic
      .rolloverWithMint(
        this.marginEngineAddress,
        effectiveOwner,
        oldTickLower,
        oldTickUpper,
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
        effectiveOwner,
        oldTickLower,
        oldTickUpper,
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
        effectiveOwner,
        oldTickLower,
        oldTickUpper,
        mintOrBurnParams,
        tempOverrides,
      )
      .catch((error) => {
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await mintTransaction.wait();
      return receipt;
    } catch (error) {
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

    const signerAddress = await this.signer.getAddress();

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    } else {
      if (isFT) {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString();
      } else {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString();
      }
    }

    const scaledNotional = this.scale(notional);

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();

    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);
    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngine: this.marginEngineAddress,
      isFT,
      notional: scaledNotional,
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
      marginDelta: '0',
    };

    let tickBefore = await peripheryContract.getCurrentTick(this.marginEngineAddress);
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
        tickAfter = parseInt(result[5]);
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
      await marginEngineContract.callStatic.getPosition(signerAddress, tickLower, tickUpper)
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

    if (!this.provider) {
      throw new Error('Blockchain not connected');
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

    const signerAddress = await this.signer.getAddress();

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const currentMargin = (
      await marginEngineContract.callStatic.getPosition(signerAddress, tickLower, tickUpper)
    ).margin;

    const rateOracleContract = BaseRateOracle__factory.connect(this.rateOracle.id, this.provider);

    const lastBlock = await this.provider.getBlockNumber();
    const lastBlockTimestamp = BigNumber.from(
      (await this.provider.getBlock(lastBlock - 1)).timestamp,
    );

    const scaledCurrentMargin = this.descale(currentMargin);

    let positionMargin = 0;
    let accruedCashflow = 0;
    let positionUft = BigNumber.from(0);
    let positionVt = BigNumber.from(0);

    if (position) {
      for (let swap of position.swaps) {
        positionUft = positionUft.add(swap.fixedTokenDeltaUnbalanced.toString());
        positionVt = positionVt.add(swap.variableTokenDelta.toString());
      }

      positionMargin = scaledCurrentMargin;

      try {
        if (position.swaps.length > 0) {
          const accruedCashflowInfo = await getAccruedCashflow({
            swaps: transformSwaps(position.swaps, this.underlyingToken.decimals),
            rateOracle: rateOracleContract,
            currentTime: Number(lastBlockTimestamp.toString()),
            endTime: Number(utils.formatUnits(this.termEndTimestamp.toString(), 18)),
          });
          accruedCashflow = accruedCashflowInfo.accruedCashflow;
        }
      } catch (error) {
        sentryTracker.captureException(error);
      }
    }

    const [expectedApy, expectedCashflow] = await this.expectedApy(
      positionUft.add(this.scale(fixedTokenDeltaUnbalanced)),
      positionVt.add(this.scale(availableNotional)),
      margin + positionMargin + accruedCashflow,
      predictedVariableApy,
    );

    const result: ExpectedApyInfo = {
      expectedApy: expectedApy,
      expectedCashflow: expectedCashflow,
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
    validationOnly,
    fullyCollateralisedVTSwap,
  }: AMMSwapArgs): Promise<ContractReceipt | void> {
    if (!this.provider) {
      throw new Error('Blockchain not connected');
    }

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

    if (validationOnly) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    } else {
      if (isFT) {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString();
      } else {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString();
      }
    }

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();

    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);

    let swapPeripheryParams: SwapPeripheryParams;
    let tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH) {
      swapPeripheryParams = {
        marginEngine: this.marginEngineAddress,
        isFT,
        notional: scaledNotional,
        sqrtPriceLimitX96,
        tickLower,
        tickUpper,
        marginDelta: 0, //
      };

      tempOverrides.value = ethers.utils.parseEther(margin.toFixed(18).toString());
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
          let result = decodeInfoPostSwap(error);
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
          sentryTracker.captureException(error);
          sentryTracker.captureMessage('Transaction Confirmation Error');
          throw new Error('Transaction Confirmation Error');
        });
    } else {
      const rateOracleContract = BaseRateOracle__factory.connect(this.rateOracle.id, this.provider);
      const variableFactorFromStartToNowWad = await rateOracleContract.callStatic.variableFactor(
        BigNumber.from(this.termStartTimestamp.toString()),
        BigNumber.from(this.termEndTimestamp.toString()),
      );

      await peripheryContract.callStatic
        .fullyCollateralisedVTSwap(
          swapPeripheryParams,
          variableFactorFromStartToNowWad,
          tempOverrides,
        )
        .catch(async (error: any) => {
          let result = decodeInfoPostSwap(error);
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
          sentryTracker.captureException(error);
          sentryTracker.captureMessage('Transaction Confirmation Error');
          throw new Error('Transaction Confirmation Error');
        });
    }

    try {
      const receipt = await swapTransaction.wait();
      return receipt;
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  public async swapWithWeth({
    isFT,
    notional,
    margin,
    marginEth,
    fixedRateLimit,
    fixedLow,
    fixedHigh,
    validationOnly,
  }: AMMSwapWithWethArgs): Promise<ContractReceipt | void> {
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

    if (marginEth && marginEth < 0) {
      throw new Error('Amount of margin in ETH cannot be negative');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    if (validationOnly) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    } else {
      if (isFT) {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString();
      } else {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString();
      }
    }

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();
    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);

    let swapPeripheryParams: SwapPeripheryParams;
    let tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH && marginEth) {
      tempOverrides.value = ethers.utils.parseEther(marginEth.toFixed(18).toString());
    }

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

    const swapTransaction = await peripheryContract
      .swap(swapPeripheryParams, tempOverrides)
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      })
      .catch((error) => {
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await swapTransaction.wait();
      return receipt;
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
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

    const signerAddress = await this.signer.getAddress();
    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();

    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);
    const scaledNotional = this.scale(notional);
    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower: tickLower,
      tickUpper: tickUpper,
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
      await marginEngineContract.callStatic.getPosition(signerAddress, tickLower, tickUpper)
    ).margin;

    const scaledCurrentMargin = this.descale(currentMargin);
    const scaledMarginRequirement = this.descale(marginRequirement) * 1.01;

    if (scaledMarginRequirement > scaledCurrentMargin) {
      return scaledMarginRequirement - scaledCurrentMargin;
    } else {
      return 0;
    }
  }

  public async mint({
    fixedLow,
    fixedHigh,
    notional,
    margin,
    validationOnly,
  }: AMMMintArgs): Promise<ContractReceipt | void> {
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

    if (validationOnly) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();

    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);
    const _notional = this.scale(notional);

    let mintOrBurnParams: MintOrBurnParams;
    let tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH) {
      mintOrBurnParams = {
        marginEngine: this.marginEngineAddress,
        tickLower,
        tickUpper,
        notional: _notional,
        isMint: true,
        marginDelta: 0,
      };

      tempOverrides.value = ethers.utils.parseEther(margin.toFixed(18).toString());
    } else {
      const scaledMarginDelta = this.scale(margin);

      mintOrBurnParams = {
        marginEngine: this.marginEngineAddress,
        tickLower,
        tickUpper,
        notional: _notional,
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
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await mintTransaction.wait();
      return receipt;
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  public async mintWithWeth({
    fixedLow,
    fixedHigh,
    notional,
    margin,
    marginEth,
    validationOnly,
  }: AMMMintWithWethArgs): Promise<ContractReceipt | void> {
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

    if (marginEth && marginEth < 0) {
      throw new Error('Amount of margin in ETH cannot be negative');
    }

    if (!this.underlyingToken.id) {
      throw new Error('No underlying error');
    }

    if (validationOnly) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();
    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);
    const _notional = this.scale(notional);

    let mintOrBurnParams: MintOrBurnParams;
    let tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH && marginEth) {
      tempOverrides.value = ethers.utils.parseEther(marginEth.toFixed(18).toString());
    }

    const scaledMarginDelta = this.scale(margin);

    mintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower,
      tickUpper,
      notional: _notional,
      isMint: true,
      marginDelta: scaledMarginDelta,
    };

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
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await mintTransaction.wait();
      return receipt;
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  // burn

  public async burn({
    fixedLow,
    fixedHigh,
    notional,
    validationOnly,
  }: AMMBurnArgs): Promise<ContractReceipt | void> {
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

    if (validationOnly) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();

    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);

    const _notional = this.scale(notional);

    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower,
      tickUpper,
      notional: _notional,
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
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await burnTransaction.wait();
      return receipt;
    } catch (error) {
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
  }: AMMUpdatePositionMarginArgs): Promise<ContractReceipt | void> {
    if (!this.signer) {
      return;
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

    let tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};
    let scaledMarginDelta: string;

    if (this.isETH && marginDelta > 0) {
      tempOverrides.value = ethers.utils.parseEther(marginDelta.toFixed(18).toString());
      scaledMarginDelta = '0';
    } else {
      scaledMarginDelta = this.scale(marginDelta);
    }

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();

    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);

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
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await updatePositionMarginTransaction.wait();
      return receipt;
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  // liquidation

  public async liquidatePosition({
    owner,
    fixedLow,
    fixedHigh,
  }: AMMLiquidatePositionArgs): Promise<ContractReceipt> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);

    await marginEngineContract.callStatic
      .liquidatePosition(owner, tickLower, tickUpper)
      .catch((error) => {
        const errorMessage = getReadableErrorMessage(error);
        throw new Error(errorMessage);
      });

    const estimatedGas = await marginEngineContract.estimateGas.liquidatePosition(
      owner,
      tickLower,
      tickUpper,
    );

    const liquidatePositionTransaction = await marginEngineContract
      .liquidatePosition(owner, tickLower, tickUpper, {
        gasLimit: getGasBuffer(estimatedGas),
      })
      .catch((error) => {
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await liquidatePositionTransaction.wait();
      return receipt;
    } catch (error) {
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

    const effectiveOwner = !owner ? await this.signer.getAddress() : owner;

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();

    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.signer);

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
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await settlePositionTransaction.wait();
      return receipt;
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Transaction Confirmation Error');
      throw new Error('Transaction Confirmation Error');
    }
  }

  // scale/descale according to underlying token
  public scale(value: number): string {
    const price = Price.fromNumber(value);
    const tokenAmount = TokenAmount.fromFractionalAmount(
      this.underlyingToken,
      price.numerator,
      price.denominator,
    );
    const scaledValue = tokenAmount.scale();

    return scaledValue;
  }

  public descale(value: BigNumber): number {
    return Number(ethers.utils.formatUnits(value, this.underlyingToken.decimals));
  }

  // descale compound tokens

  public descaleCompoundValue(value: BigNumber): number {
    return Number(
      ethers.utils.formatUnits(value, parseInt(this.underlyingToken.decimals.toString()) + 10),
    );
  }

  // underlying token approval for periphery

  // token approval for periphery
  public async isTokenApprovedForPeriphery(
    tokenAddress: string | undefined,
    approvalAmount?: number, // Unscaled, e.g. dollars not wei
  ): Promise<boolean | void> {
    const scaledAmount = approvalAmount && this.scale(approvalAmount);

    if (!tokenAddress) {
      throw new Error('No underlying token');
    }

    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const signerAddress = await this.signer.getAddress();
    const token = tokenFactory.connect(tokenAddress, this.signer);

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();
    const allowance = await token.allowance(signerAddress, peripheryAddress);

    if (scaledAmount === undefined) {
      return allowance.gte(TresholdApprovalBn);
    } else {
      return allowance.gte(scaledAmount);
    }
  }

  public async approveUnderlyingTokenForPeriphery(): Promise<ContractReceipt | void> {
    if (!this.underlyingToken.id) {
      throw new Error('No underlying token');
    }

    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    let isApproved;
    let tokenAddress = this.underlyingToken.id;

    if (this.isETH && this.wethAddress) {
      tokenAddress = this.wethAddress;
    } else if (this.isETH) {
      // No approval required for ETH (not WETH) collateral
      isApproved = true;
    }

    isApproved = await this.isTokenApprovedForPeriphery(tokenAddress);

    if (isApproved) {
      return;
    }

    const token = tokenFactory.connect(tokenAddress, this.signer);

    const factoryContract = factoryFactory.connect(this.factoryAddress, this.signer);
    const peripheryAddress = await factoryContract.periphery();

    let estimatedGas;
    try {
      estimatedGas = await token.estimateGas.approve(peripheryAddress, MaxUint256Bn);
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage(
        `Could not increase periphery allowance (${tokenAddress}, ${await this.signer.getAddress()}, ${MaxUint256Bn.toString()})`,
      );
      throw new Error(
        `Unable to approve. If your existing allowance is non-zero but lower than needed, some tokens like USDT require you to call approve("${peripheryAddress}", 0) before you can increase the allowance.`,
      );
    }

    const approvalTransaction = await token
      .approve(peripheryAddress, MaxUint256Bn, {
        gasLimit: getGasBuffer(estimatedGas),
      })
      .catch((error) => {
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Transaction Confirmation Error');
        throw new Error('Transaction Confirmation Error');
      });

    try {
      const receipt = await approvalTransaction.wait();
      return receipt;
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Token approval failed');
      throw new Error('Token approval failed');
    }
  }

  // protocol name

  public get protocol(): string {
    const tokenName = this.underlyingToken.name;

    let prefix = getProtocolPrefix(this.rateOracle.protocolId);

    return `${prefix}${tokenName}`;
  }

  // start and end dates

  public get startDateTime(): DateTime {
    return timestampWadToDateTime(this.termStartTimestamp);
  }

  public get endDateTime(): DateTime {
    return timestampWadToDateTime(this.termEndTimestamp);
  }

  // get position information

  public async getFixedApr(): Promise<number> {
    if (!this.provider) {
      throw new Error('Blockchain not connected');
    }
    const factoryContract = factoryFactory.connect(this.factoryAddress, this.provider);
    const peripheryAddress = await factoryContract.periphery();

    const peripheryContract = peripheryFactory.connect(peripheryAddress, this.provider);
    const currentTick = await peripheryContract.callStatic.getCurrentTick(this.marginEngineAddress);
    const apr = tickToFixedRate(currentTick).toNumber();

    return apr;
  }

  public async getVariableApy(): Promise<number> {
    if (!this.provider) {
      throw new Error('Blockchain not connected');
    }

    const marginEngineContract = marginEngineFactory.connect(
      this.marginEngineAddress,
      this.provider,
    );
    const historicalApy = await marginEngineContract.callStatic.getHistoricalApy();

    return parseFloat(utils.formatEther(historicalApy));
  }

  public async getVariableFactor(
    termStartTimestamp: BigNumber,
    termEndTimestamp: BigNumber,
  ): Promise<number> {
    if (!this.provider) {
      throw new Error('Blockchain not connected');
    }
    const rateOracleContract = BaseRateOracle__factory.connect(this.rateOracle.id, this.provider);
    try {
      const result = await rateOracleContract.callStatic.variableFactor(
        termStartTimestamp,
        termEndTimestamp,
      );
      const resultScaled = result.div(BigNumber.from(10).pow(12)).toNumber() / 1000000;
      return resultScaled;
    } catch (error) {
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Cannot get variable factor');
      throw new Error('Cannot get variable factor');
    }
  }

  public async getPositionInformation(position: Position): Promise<PositionInfo> {
    if (!this.provider) {
      throw new Error('Blockchain not connected');
    }

    if (position.isSettled) {
      return {
        fixedTokenBalance: 0,
        variableTokenBalance: 0,

        liquidity: 0,
        liquidityInUSD: 0,

        notional: 0,
        notionalInUSD: 0,

        margin: 0,
        marginInUSD: 0,

        fees: 0,
        feesInUSD: 0,

        accruedCashflow: 0,
        accruedCashflowInUSD: 0,

        settlementCashflow: 0,
        settlementCashflowInUSD: 0,

        liquidationThreshold: 0,
        safetyThreshold: 0,

        variableRateSinceLastSwap: 0,
        fixedRateSinceLastSwap: 0,

        fixedApr: 0,
        healthFactor: 0,
        fixedRateHealthFactor: 0,

        beforeMaturity: false,
      };
    }

    // Get the underlying token price in USD
    let usdExchangeRate = 1;
    if (this.isETH) {
      usdExchangeRate = await this.ethPrice();
    }

    // Build the contracts
    const rateOracleContract = BaseRateOracle__factory.connect(this.rateOracle.id, this.provider);

    // Get last block timestamp
    const block = await this.provider.getBlock('latest');
    const currentTime = block.timestamp - 1;

    // Get before maturity
    const beforeMaturity = currentTime < this.endDateTime.toSeconds();

    // Get the margin engine contract
    const marginEngineContract = marginEngineFactory.connect(
      this.marginEngineAddress,
      this.provider,
    );

    // Get fixed APR of the pool
    const fixedApr = await this.getFixedApr();

    // Get the position information from the margin engine
    const freshPositionInfo = await position.getFreshInfo();

    // Descale position information
    const margin = this.descale(freshPositionInfo.margin);
    const fees = this.descale(freshPositionInfo.accumulatedFees);
    const fixedTokenBalance = this.descale(freshPositionInfo.fixedTokenBalance);
    const variableTokenBalance = this.descale(freshPositionInfo.variableTokenBalance);

    // Get settlement cashflow
    let settlementCashflow = 0;
    if (!beforeMaturity && !freshPositionInfo.isSettled) {
      const variableFactorWad = await rateOracleContract.callStatic.variableFactor(
        this.termStartTimestamp.toString(),
        this.termEndTimestamp.toString(),
      );

      const fixedFactor =
        (this.endDateTime.toMillis() - this.startDateTime.toMillis()) / ONE_YEAR_IN_SECONDS / 1000;
      const variableFactor = Number(ethers.utils.formatEther(variableFactorWad));

      settlementCashflow =
        fixedTokenBalance * fixedFactor * 0.01 + variableTokenBalance * variableFactor;
    }

    // Get variable APY and accrued cashflow
    let variableRateSinceLastSwap = 0;
    let fixedRateSinceLastSwap = 0;
    let accruedCashflow = 0;

    if (position.swaps.length > 0) {
      if (beforeMaturity) {
        try {
          const accruedCashflowInfo = await getAccruedCashflow({
            swaps: transformSwaps(position.swaps, this.underlyingToken.decimals),
            rateOracle: rateOracleContract,
            currentTime,
            endTime: this.endDateTime.toSeconds(),
          });
          accruedCashflow = accruedCashflowInfo.accruedCashflow;

          fixedRateSinceLastSwap = accruedCashflowInfo.avgFixedRate;
          variableRateSinceLastSwap = (await this.getInstantApy()) * 100;
        } catch (error) {
          console.error('What?', error);
          sentryTracker.captureException(error);
        }
      } else {
        if (!position.isSettled) {
          accruedCashflow = settlementCashflow;
        }
      }
    }

    // Get health factors

    let liquidationThreshold = 0;
    let safetyThreshold = 0;
    let healthFactor = HealthFactorStatus.NOT_FOUND;
    let fixedRateHealthFactor = HealthFactorStatus.NOT_FOUND;

    if (beforeMaturity) {
      // Get liquidation threshold
      try {
        const scaledLiqT = await marginEngineContract.callStatic.getPositionMarginRequirement(
          position.owner,
          position.tickLower,
          position.tickUpper,
          true,
        );
        liquidationThreshold = this.descale(scaledLiqT);
      } catch (error) {
        sentryTracker.captureException(error);
      }

      // Get safety threshold
      try {
        const scaledSafeT = await marginEngineContract.callStatic.getPositionMarginRequirement(
          position.owner,
          position.tickLower,
          position.tickUpper,
          false,
        );
        safetyThreshold = this.descale(scaledSafeT);
      } catch (error) {
        sentryTracker.captureException(error);
      }

      // Get health factor
      if (margin < liquidationThreshold) {
        healthFactor = HealthFactorStatus.DANGER;
      } else {
        if (margin < safetyThreshold) {
          healthFactor = HealthFactorStatus.WARNING;
        } else {
          healthFactor = HealthFactorStatus.HEALTHY;
        }
      }

      // Get range health factor for LPs
      fixedRateHealthFactor = getRangeHealthFactor(
        position.fixedRateLower.toNumber(),
        position.fixedRateUpper.toNumber(),
        fixedApr,
      );
    }

    // Get liquidity
    const liquidity = position.getNotionalFromLiquidity(
      JSBI.BigInt(freshPositionInfo._liquidity.toString()),
    );

    // Get notional (LPs - liquidity, Traders - absolute variable tokens)
    const notional = position.positionType === 3 ? liquidity : Math.abs(variableTokenBalance);

    // Build result and return
    return {
      fixedTokenBalance,
      variableTokenBalance,

      liquidity,
      liquidityInUSD: liquidity * usdExchangeRate,

      notional,
      notionalInUSD: notional * usdExchangeRate,

      margin: margin - fees,
      marginInUSD: (margin - fees) * usdExchangeRate,

      fees,
      feesInUSD: fees * usdExchangeRate,

      accruedCashflow: accruedCashflow,
      accruedCashflowInUSD: accruedCashflow * usdExchangeRate,

      settlementCashflow: settlementCashflow,
      settlementCashflowInUSD: settlementCashflow * usdExchangeRate,

      liquidationThreshold,
      safetyThreshold,

      variableRateSinceLastSwap,
      fixedRateSinceLastSwap,

      fixedApr,
      healthFactor,
      fixedRateHealthFactor,

      beforeMaturity,
    };
  }

  // tick functionalities

  public closestTickAndFixedRate(fixedRate: number): ClosestTickAndFixedRate {
    if (fixedRate < MIN_FIXED_RATE) {
      fixedRate = MIN_FIXED_RATE;
    }
    if (fixedRate > MAX_FIXED_RATE) {
      fixedRate = MAX_FIXED_RATE;
    }

    const fixedRatePrice = Price.fromNumber(fixedRate);
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

  // balance checks

  public async hasEnoughUnderlyingTokens(
    amount: number,
    rolloverPosition: { fixedLow: number; fixedHigh: number } | undefined,
  ): Promise<boolean> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const signerAddress = await this.signer.getAddress();

    let currentBalance: BigNumber;
    if (this.isETH) {
      if (!this.signer.provider) {
        throw new Error('Provider not connected');
      }

      currentBalance = await this.signer.provider.getBalance(signerAddress);
    } else {
      if (!this.underlyingToken.id) {
        throw new Error('No underlying token');
      }

      const tokenAddress = this.underlyingToken.id;
      const token = tokenFactory.connect(tokenAddress, this.signer);

      currentBalance = await token.balanceOf(signerAddress);
    }

    const scaledAmount = BigNumber.from(this.scale(amount));

    if (rolloverPosition && !this.isETH) {
      if (rolloverPosition.fixedLow >= rolloverPosition.fixedHigh) {
        throw new Error('Lower Rate must be smaller than Upper Rate');
      }

      if (rolloverPosition.fixedLow < MIN_FIXED_RATE) {
        throw new Error('Lower Rate is too low');
      }

      if (rolloverPosition.fixedHigh > MAX_FIXED_RATE) {
        throw new Error('Upper Rate is too high');
      }

      const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(
        rolloverPosition.fixedLow,
      );
      const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(
        rolloverPosition.fixedHigh,
      );

      const marginEngineContract = marginEngineFactory.connect(
        this.marginEngineAddress,
        this.signer,
      );

      const position = await marginEngineContract.callStatic.getPosition(
        signerAddress,
        tickLower,
        tickUpper,
      );

      const start = BigNumber.from(this.termStartTimestamp.toString());
      const end = BigNumber.from(this.termEndTimestamp.toString());

      const timeInYearsFromStartToEnd = end.sub(start).div(ONE_YEAR_IN_SECONDS);

      const rateOracleContract = BaseRateOracle__factory.connect(this.rateOracle.id, this.signer);
      const variableFactor = await rateOracleContract.callStatic.variableFactor(
        this.termStartTimestamp.toString(),
        this.termEndTimestamp.toString(),
      );

      const fixedCashflow = position.fixedTokenBalance
        .mul(timeInYearsFromStartToEnd)
        .div(BigNumber.from(100))
        .div(BigNumber.from(10).pow(18));
      const variableCashflow = position.variableTokenBalance
        .mul(variableFactor)
        .div(BigNumber.from(10).pow(18));

      const cashflow = fixedCashflow.add(variableCashflow);

      const marginAfterSettlement = position.margin.add(cashflow);

      return currentBalance.add(marginAfterSettlement).gte(scaledAmount);
    }

    return currentBalance.gte(scaledAmount);
  }

  public async underlyingTokens(
    rolloverPosition: { fixedLow: number; fixedHigh: number } | undefined,
  ): Promise<number> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const signerAddress = await this.signer.getAddress();

    let currentBalance: BigNumber;
    if (this.isETH) {
      if (!this.provider) {
        throw new Error('Provider not connected');
      }

      currentBalance = await this.provider.getBalance(signerAddress);
    } else {
      if (!this.underlyingToken.id) {
        throw new Error('No underlying token');
      }

      const tokenAddress = this.underlyingToken.id;
      const token = tokenFactory.connect(tokenAddress, this.signer);

      currentBalance = await token.balanceOf(signerAddress);
    }

    if (rolloverPosition && !this.isETH) {
      if (rolloverPosition.fixedLow >= rolloverPosition.fixedHigh) {
        throw new Error('Lower Rate must be smaller than Upper Rate');
      }

      if (rolloverPosition.fixedLow < MIN_FIXED_RATE) {
        throw new Error('Lower Rate is too low');
      }

      if (rolloverPosition.fixedHigh > MAX_FIXED_RATE) {
        throw new Error('Upper Rate is too high');
      }

      const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(
        rolloverPosition.fixedLow,
      );
      const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(
        rolloverPosition.fixedHigh,
      );

      const marginEngineContract = marginEngineFactory.connect(
        this.marginEngineAddress,
        this.signer,
      );

      const position = await marginEngineContract.callStatic.getPosition(
        signerAddress,
        tickLower,
        tickUpper,
      );

      const start = BigNumber.from(this.termStartTimestamp.toString());
      const end = BigNumber.from(this.termEndTimestamp.toString());

      const timeInYearsFromStartToEnd = end.sub(start).div(ONE_YEAR_IN_SECONDS);

      const rateOracleContract = BaseRateOracle__factory.connect(this.rateOracle.id, this.signer);
      const variableFactor = await rateOracleContract.callStatic.variableFactor(
        this.termStartTimestamp.toString(),
        this.termEndTimestamp.toString(),
      );

      const fixedCashflow = position.fixedTokenBalance
        .mul(timeInYearsFromStartToEnd)
        .div(BigNumber.from(100))
        .div(BigNumber.from(10).pow(18));
      const variableCashflow = position.variableTokenBalance
        .mul(variableFactor)
        .div(BigNumber.from(10).pow(18));

      const cashflow = fixedCashflow.add(variableCashflow);

      const marginAfterSettlement = position.margin.add(cashflow);

      return this.descale(currentBalance.add(marginAfterSettlement));
    }

    return this.descale(currentBalance);
  }

  // current position margin requirement

  async getPositionMarginRequirement(fixedLow: number, fixedHigh: number): Promise<number> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);

    const signerAddress = await this.signer.getAddress();

    const requirement = await marginEngineContract.callStatic.getPositionMarginRequirement(
      signerAddress,
      tickLower,
      tickUpper,
      false,
    );

    return this.descale(requirement);
  }

  // one week look-back window apy

  async getInstantApy(): Promise<number> {
    if (!this.provider) {
      throw new Error('Blockchain not connected');
    }

    const blocksPerDay = 6570; // 13.15 seconds per block
    const blockPerHour = 274;

    switch (this.rateOracle.protocolId) {
      case 1: {
        if (!this.underlyingToken.id) {
          throw new Error('No underlying error');
        }

        const rateOracleContract = AaveBorrowRateOracle__factory.connect(
          this.rateOracle.id,
          this.provider,
        );
        const lendingPoolAddress = await rateOracleContract.aaveLendingPool();
        const lendingPool = IAaveV2LendingPool__factory.connect(lendingPoolAddress, this.provider);
        const reservesData = await lendingPool.getReserveData(this.underlyingToken.id);
        const rateInRay = reservesData.currentLiquidityRate;
        const result = rateInRay.div(BigNumber.from(10).pow(21)).toNumber() / 1000000;
        return result;
      }
      case 2: {
        const daysPerYear = 365;
        const rateOracle = CompoundRateOracle__factory.connect(this.rateOracle.id, this.provider);
        const cTokenAddress = await (rateOracle as CompoundRateOracle).ctoken();
        const cTokenContract = ICToken__factory.connect(cTokenAddress, this.provider);
        const supplyRatePerBlock = await cTokenContract.supplyRatePerBlock();
        const supplyApy =
          Math.pow((supplyRatePerBlock.toNumber() / 1e18) * blocksPerDay + 1, daysPerYear) - 1;
        return supplyApy;
      }

      case 3: {
        const lastBlock = await this.provider.getBlockNumber();
        const to = BigNumber.from((await this.provider.getBlock(lastBlock - 1)).timestamp);
        const from = BigNumber.from(
          (await this.provider.getBlock(lastBlock - 28 * blockPerHour)).timestamp,
        );

        const rateOracleContract = BaseRateOracle__factory.connect(
          this.rateOracle.id,
          this.provider,
        );

        const oneWeekApy = await rateOracleContract.callStatic.getApyFromTo(from, to);

        return oneWeekApy.div(BigNumber.from(1000000000000)).toNumber() / 1000000;
      }

      case 4: {
        const lastBlock = await this.provider.getBlockNumber();
        const to = BigNumber.from((await this.provider.getBlock(lastBlock - 1)).timestamp);
        const from = BigNumber.from(
          (await this.provider.getBlock(lastBlock - 28 * blockPerHour)).timestamp,
        );

        const rateOracleContract = BaseRateOracle__factory.connect(
          this.rateOracle.id,
          this.provider,
        );

        const oneWeekApy = await rateOracleContract.callStatic.getApyFromTo(from, to);

        return oneWeekApy.div(BigNumber.from(1000000000000)).toNumber() / 1000000;
      }

      case 5: {
        if (!this.underlyingToken.id) {
          throw new Error('No underlying error');
        }

        const rateOracleContract = AaveBorrowRateOracle__factory.connect(
          this.rateOracle.id,
          this.provider,
        );
        const lendingPoolAddress = await rateOracleContract.aaveLendingPool();
        const lendingPool = IAaveV2LendingPool__factory.connect(lendingPoolAddress, this.provider);
        const reservesData = await lendingPool.getReserveData(this.underlyingToken.id);
        const rateInRay = reservesData.currentVariableBorrowRate;
        const result = rateInRay.div(BigNumber.from(10).pow(21)).toNumber() / 1000000;
        return result;
      }

      case 6: {
        const daysPerYear = 365;

        const rateOracle = CompoundBorrowRateOracle__factory.connect(
          this.rateOracle.id,
          this.provider,
        );

        const cTokenAddress = await (rateOracle as CompoundBorrowRateOracle).ctoken();
        const cTokenContract = ICToken__factory.connect(cTokenAddress, this.provider);

        const borrowRatePerBlock = await cTokenContract.borrowRatePerBlock();
        const borrowApy =
          Math.pow((borrowRatePerBlock.toNumber() / 1e18) * blocksPerDay + 1, daysPerYear) - 1;
        return borrowApy;
      }

      default:
        throw new Error('Unrecognized protocol');
    }
  }
}

export default AMM;
