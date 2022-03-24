import JSBI from 'jsbi';
import { DateTime } from 'luxon';
import { BigNumber, BigNumberish, ContractTransaction, Signer, utils } from 'ethers';

import { BigIntish, SwapPeripheryParams, MintOrBurnParams } from '../types';
import { Q192, PERIPHERY_ADDRESS, FACTORY_ADDRESS } from '../constants';
import { Price } from './fractions/price';
import {
  Periphery__factory as peripheryFactory,
  MarginEngine__factory as marginEngineFactory,
  Factory__factory as factoryFactory,
  VAMM__factory as vammFactory,
  // todo: not very elegant to use the mock as a factory
  ERC20Mock__factory as tokenFactory,
  AaveFCM__factory as fcmFactory
} from '../typechain';
import Token from './token';
import RateOracle from './rateOracle';
import { TickMath } from '../utils/tickMath';
import timestampWadToDateTime from '../utils/timestampWadToDateTime';
import { fixedRateToClosestTick, tickToFixedRate } from '../utils/priceTickConversions';
import { nearestUsableTick } from '../utils/nearestUsableTick';
import { providers } from 'ethers';
import { TokenAmount } from './fractions/tokenAmount';

export type AMMConstructorArgs = {
  id: string;
  signer: Signer | null;
  provider?: providers.Provider;
  marginEngineAddress: string;
  fcmAddress: string;
  rateOracle: RateOracle;
  createdTimestamp: BigIntish;
  updatedTimestamp: BigIntish;
  termStartTimestamp: BigIntish;
  termEndTimestamp: BigIntish;
  underlyingToken: Token;
  sqrtPriceX96: BigIntish;
  liquidity: BigIntish;
  tick: BigIntish;
  tickSpacing: BigIntish;
  txCount: number;
};

export type AMMGetInfoPostSwapArgs = {
  recipient: string;
  isFT: boolean;
  notional: number;
  fixedRateLimit?: number;
  fixedLow: number;
  fixedHigh: number;
};

export type AMMUpdatePositionMarginArgs = {
  owner: string;
  fixedLow: number;
  fixedHigh: number;
  marginDelta: number;
};

export type AMMLiquidatePositionArgs = {
  owner: string;
  fixedLow: number;
  fixedHigh: number;
}

export type AMMSettlePositionArgs = {
  owner: string;
  fixedLow: number;
  fixedHigh: number;
};

export type AMMSwapArgs = {
  recipient: string;
  isFT: boolean;
  notional: number;
  margin: number;
  fixedRateLimit?: number;
  fixedLow: number;
  fixedHigh: number;
};

export type FCMSwapArgs = {
  notional: number;
  fixedRateLimit?: number;
}

export type FCMUnwindArgs = {
  notionalToUnwind: number;
  fixedRateLimit?: number;
}

export type AMMMintArgs = {
  recipient: string;
  fixedLow: number;
  fixedHigh: number;
  notional: number;
  margin: number;
};

export type AMMGetMinimumMarginRequirementPostMintArgs = AMMMintArgs;

export type InfoPostSwap = {
  marginRequirement: number;
  availableNotional: number;
  fee: number;
  slippage: number;
}

export type AMMBurnArgs = Omit<AMMMintArgs, 'margin'>;

export type ClosestTickAndFixedRate = {
  closestUsableTick: number;
  closestUsableFixedRate: Price;
};

class AMM {
  public readonly id: string;
  public readonly signer: Signer | null;
  public readonly provider?: providers.Provider;
  public readonly marginEngineAddress: string;
  public readonly fcmAddress: string;
  public readonly rateOracle: RateOracle;
  public readonly createdTimestamp: JSBI;
  public readonly updatedTimestamp: JSBI;
  public readonly termStartTimestamp: JSBI;
  public readonly termEndTimestamp: JSBI;
  public readonly underlyingToken: Token;
  public sqrtPriceX96: JSBI;
  public readonly liquidity: JSBI;
  public readonly tickSpacing: JSBI;
  public readonly tick: JSBI;
  public readonly txCount: JSBI;
  private _fixedRate?: Price;
  private _price?: Price;

  public constructor({
    id,
    signer,
    provider,
    marginEngineAddress,
    fcmAddress,
    rateOracle,
    createdTimestamp,
    updatedTimestamp,
    termStartTimestamp,
    termEndTimestamp,
    underlyingToken,
    sqrtPriceX96,
    liquidity,
    tick,
    tickSpacing,
    txCount,
  }: AMMConstructorArgs) {
    this.id = id;
    this.signer = signer;
    this.provider = provider || signer?.provider;
    this.marginEngineAddress = marginEngineAddress;
    this.fcmAddress = fcmAddress;
    this.rateOracle = rateOracle;
    this.createdTimestamp = JSBI.BigInt(createdTimestamp);
    this.updatedTimestamp = JSBI.BigInt(updatedTimestamp);
    this.termStartTimestamp = JSBI.BigInt(termStartTimestamp);
    this.termEndTimestamp = JSBI.BigInt(termEndTimestamp);
    this.underlyingToken = underlyingToken;
    this.sqrtPriceX96 = JSBI.BigInt(sqrtPriceX96);
    this.liquidity = JSBI.BigInt(liquidity);
    this.tickSpacing = JSBI.BigInt(tickSpacing);
    this.tick = JSBI.BigInt(tick);
    this.txCount = JSBI.BigInt(txCount);
  }

  public async getInfoPostSwap({
    recipient,
    isFT,
    notional,
    fixedRateLimit,
    fixedLow,
    fixedHigh,
  }: AMMGetInfoPostSwapArgs) : Promise<InfoPostSwap | void> {
    if (!this.provider) return;

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    }
    else {
      if (isFT) {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString()
      } else {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString()
      }
    }

    const _notionalFraction = Price.fromNumber(notional);
    const _notionalTA = TokenAmount.fromFractionalAmount(this.underlyingToken, _notionalFraction.numerator, _notionalFraction.denominator);
    const _notional = _notionalTA.scale()
  
    const peripheryContract = peripheryFactory.connect(PERIPHERY_ADDRESS, this.provider);
    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngine: this.marginEngineAddress,
      isFT,
      notional: _notional,
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
    };

    let tickBefore = await peripheryContract.getCurrentTick(this.marginEngineAddress);
    let tickAfter = 0;
    let marginRequirement: BigNumber = BigNumber.from(0);
    let fee = BigNumber.from(0);
    let availableNotional = BigNumber.from(0);

    await peripheryContract.callStatic.swap(swapPeripheryParams).then(
      async (result: any) => {
        availableNotional = result[1];
        fee = result[2];
        marginRequirement = result[4];
        tickAfter = parseInt(result[5]);
      },
      (error) => {
        if (error.toString().includes('MarginRequirementNotMet')) {
          const args: string[] = error.message.split("MarginRequirementNotMet")[1]
            .split('(')[1]
            .split(')')[0]
            .replaceAll(' ', '')
            .split(',');

          marginRequirement = BigNumber.from(args[0]);
          tickAfter = parseInt(args[1]);
          fee = BigNumber.from(args[3]);
          availableNotional = BigNumber.from(args[4]);
        }
      },
    );

    const fixedRateBefore = tickToFixedRate(tickBefore);
    const fixedRateAfter = tickToFixedRate(tickAfter);

    const fixedRateDelta = fixedRateAfter.subtract(fixedRateBefore);
    const fixedRateDeltaRaw = fixedRateDelta.toNumber();

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.provider);
    const currentMargin = (await marginEngineContract.callStatic.getPosition(recipient, tickLower, tickUpper)).margin;
    
    const scaledCurrentMargin = parseFloat(utils.formatEther(currentMargin));
    const scaledMarginRequirement = parseFloat(utils.formatEther(marginRequirement));

    const additionalMargin = (scaledMarginRequirement > scaledCurrentMargin) ? scaledMarginRequirement - scaledCurrentMargin : 0;

    return {
      marginRequirement: additionalMargin,
      availableNotional: parseFloat(utils.formatEther(availableNotional)),
      fee: parseFloat(utils.formatEther(fee)),
      slippage: fixedRateDeltaRaw,
    }
  }

  public async settlePosition({ owner, fixedLow, fixedHigh }: AMMSettlePositionArgs) : Promise<ContractTransaction | void>  {
    if (!this.signer) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const settlePositionReceipt = await marginEngineContract.settlePosition(
      owner,
      tickLower,
      tickUpper,
    );
    return settlePositionReceipt;
  }

  public async updatePositionMargin({
    owner,
    fixedLow,
    fixedHigh,
    marginDelta,
  }: AMMUpdatePositionMarginArgs) : Promise<ContractTransaction | void>  {
    if (!this.signer) {
      return;
    }

    if (marginDelta === 0) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const _marginDeltaFraction = Price.fromNumber(marginDelta);
    const _marginDeltaTA = TokenAmount.fromFractionalAmount(this.underlyingToken, _marginDeltaFraction.numerator, _marginDeltaFraction.denominator);
    const _marginDelta = _marginDeltaTA.scale()

    await this.approveMarginEngine(_marginDelta);

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const updatePositionMarginReceipt = await marginEngineContract.updatePositionMargin(
      owner,
      tickLower,
      tickUpper,
      _marginDelta
    );

    return updatePositionMarginReceipt;
  }

  public async liquidatePosition({
    owner,
    fixedLow,
    fixedHigh,
  }: AMMLiquidatePositionArgs) : Promise<ContractTransaction | void>  {
    if (!this.signer) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const receipt = await marginEngineContract.liquidatePosition(
      owner,
      tickLower,
      tickUpper
    );

    return receipt;
  }

  public async getLiquidationThreshold({
    owner,
    fixedLow,
    fixedHigh,
  }: AMMLiquidatePositionArgs) : Promise<number | void>  {
    if (!this.signer) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const threshold = await marginEngineContract.callStatic.getPositionMarginRequirement(
      owner,
      tickLower,
      tickUpper,
      false
    );

    return parseFloat(utils.formatEther(threshold));
  }

  public async getMinimumMarginRequirementPostMint({ recipient, fixedLow, fixedHigh, notional }: AMMGetMinimumMarginRequirementPostMintArgs): Promise<number | void> {
    if (!this.provider) {
      return;
    }

    // check if the vamm is unlocked

    if (!this.initialized) {

      // need the signer object to initialize the vamm
      if (!this.signer) {
        return;
      }

      const vammContract = vammFactory.connect(this.id, this.signer);

      // todo: add logic to initialize at a more reasonable price
      await vammContract.initializeVAMM(TickMath.getSqrtRatioAtTick(0).toString());
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    const peripheryContract = peripheryFactory.connect(PERIPHERY_ADDRESS, this.provider);
    
    const _notionalFraction = Price.fromNumber(notional);
    const _notionalTA = TokenAmount.fromFractionalAmount(this.underlyingToken, _notionalFraction.numerator, _notionalFraction.denominator);
    const _notional = _notionalTA.scale()

    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower,
      tickUpper,
      notional: _notional,
      isMint: true,
    };
    
    let marginRequirement = BigNumber.from("0");
      await peripheryContract.callStatic.mintOrBurn(mintOrBurnParams)
        .then(
          (result) => {
            marginRequirement = BigNumber.from(result);
          },
          (error) => {
            if (error.toString().includes("MarginLessThanMinimum")) {
              const args: string[] = error.message.split("MarginLessThanMinimum")[1]
                .split("(")[1]
                .split(")")[0]
                .replaceAll(" ", "")
                .split(",");

              marginRequirement = BigNumber.from(args[0]);
            }
          }
        );

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.provider);
    const currentMargin = (await marginEngineContract.callStatic.getPosition(recipient, tickLower, tickUpper)).margin;
    
    const scaledCurrentMargin = parseFloat(utils.formatEther(currentMargin));
    const scaledMarginRequirement = parseFloat(utils.formatEther(marginRequirement));

    if (scaledMarginRequirement > scaledCurrentMargin) {
      return scaledMarginRequirement - scaledCurrentMargin;
    }
    else {
      return 0;
    }
  }

  public async mint({ recipient, fixedLow, fixedHigh, notional, margin }: AMMMintArgs): Promise<ContractTransaction | void> {
    if (!this.signer) {
      return;
    }

    if (!this.initialized) {
      const vammContract = vammFactory.connect(this.id, this.signer);

      await vammContract.initializeVAMM(TickMath.getSqrtRatioAtTick(0).toString());
    }

    await this.updatePositionMargin({ owner: recipient, fixedLow, fixedHigh, marginDelta: margin });

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    await this.approvePeriphery();

    const peripheryContract = peripheryFactory.connect(PERIPHERY_ADDRESS, this.signer);

    const _notionalFraction = Price.fromNumber(notional);
    const _notionalTA = TokenAmount.fromFractionalAmount(this.underlyingToken, _notionalFraction.numerator, _notionalFraction.denominator);
    const _notional = _notionalTA.scale()

    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower,
      tickUpper,
      notional: _notional,
      isMint: true,
    };

    return peripheryContract.mintOrBurn(mintOrBurnParams);
  }

  public async burn({ fixedLow, fixedHigh, notional }: AMMBurnArgs): Promise<ContractTransaction | void> {
    if (!this.signer) {
      return;
    }

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    await this.approvePeriphery();

    const peripheryContract = peripheryFactory.connect(PERIPHERY_ADDRESS, this.signer);

    const _notionalFraction = Price.fromNumber(notional);
    const _notionalTA = TokenAmount.fromFractionalAmount(this.underlyingToken, _notionalFraction.numerator, _notionalFraction.denominator);
    const _notional = _notionalTA.scale()

    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.marginEngineAddress,
      tickLower,
      tickUpper,
      notional: _notional,
      isMint: false,
    };

    return peripheryContract.mintOrBurn(mintOrBurnParams);
  }

  public async approvePeriphery(): Promise<ContractTransaction | void> {
    if (!this.signer) return;

    const factoryContract = factoryFactory.connect(FACTORY_ADDRESS, this.signer);
    const signerAddress = await this.signer.getAddress();

    const isApproved = await factoryContract.isApproved(signerAddress, PERIPHERY_ADDRESS);

    if (!isApproved) {
      return await factoryContract.setApproval(PERIPHERY_ADDRESS, true);
    } else {
      return;
    }
  }

  public async approveFCM(): Promise<ContractTransaction | void> {
    if (!this.signer) return;

    const factoryContract = factoryFactory.connect(FACTORY_ADDRESS, this.signer);
    const signerAddress = await this.signer.getAddress();

    const isApproved = await factoryContract.isApproved(signerAddress, this.fcmAddress);

    if (!isApproved) {
      return await factoryContract.setApproval(this.fcmAddress, true);
    } else {
      return;
    }

  }

  public async approveMarginEngine(
    marginDelta: BigNumberish
  ) {
    if (!this.signer) {
      return;
    }

    if (!this.underlyingToken.id) {
      return;
    }

    const token = tokenFactory.connect(this.underlyingToken.id, this.signer);

    await token.approve(this.marginEngineAddress, marginDelta);
  }

  public async swap({
    recipient,
    isFT,
    notional,
    margin,
    fixedRateLimit,
    fixedLow,
    fixedHigh,
  }: AMMSwapArgs): Promise<ContractTransaction | void> {
    if (!this.signer) {
      return;
    }

    await this.updatePositionMargin({ owner: recipient, fixedLow, fixedHigh, marginDelta: margin });

    const { closestUsableTick: tickUpper } = this.closestTickAndFixedRate(fixedLow);
    const { closestUsableTick: tickLower } = this.closestTickAndFixedRate(fixedHigh);

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    }
    else {
      if (isFT) {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString();
      } else {
        sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString();
      }
    }

    await this.approvePeriphery();

    const peripheryContract = peripheryFactory.connect(PERIPHERY_ADDRESS, this.signer);


    const _notionalFraction = Price.fromNumber(notional);
    const _notionalTA = TokenAmount.fromFractionalAmount(this.underlyingToken, _notionalFraction.numerator, _notionalFraction.denominator);
    const _notional = _notionalTA.scale()

    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngine: this.marginEngineAddress,
      isFT,
      notional: _notional,
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
    };

    return peripheryContract.swap(swapPeripheryParams);
  }

  public async FCMSwap({
    notional,
    fixedRateLimit
  }: FCMSwapArgs): Promise<ContractTransaction | void> {
    if (!this.signer) {
      return;
    }

    await this.approveFCM();

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    }
    else {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK - 1).toString()
    }

    const fcmContract = fcmFactory.connect(this.fcmAddress, this.signer);

    const _notionalFraction = Price.fromNumber(notional);
    const _notionalTA = TokenAmount.fromFractionalAmount(this.underlyingToken, _notionalFraction.numerator, _notionalFraction.denominator);
    const _notional = _notionalTA.scale()
    
    return fcmContract.initiateFullyCollateralisedFixedTakerSwap(_notional, sqrtPriceLimitX96);
  }

  public async FCMUnwind({
    notionalToUnwind,
    fixedRateLimit
  }: FCMUnwindArgs): Promise<ContractTransaction | void> {
    if (!this.signer) {
      return;
    }

    let sqrtPriceLimitX96;
    if (fixedRateLimit) {
      const { closestUsableTick: tickLimit } = this.closestTickAndFixedRate(fixedRateLimit);
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(tickLimit).toString();
    }
    else {
      sqrtPriceLimitX96 = TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK + 1).toString()
    }

    await this.approveFCM();

    const fcmContract = fcmFactory.connect(this.fcmAddress, this.signer);
    
    const _notionalFraction = Price.fromNumber(notionalToUnwind);
    const _notionalTA = TokenAmount.fromFractionalAmount(this.underlyingToken, _notionalFraction.numerator, _notionalFraction.denominator);
    const _notional = _notionalTA.scale()

    return fcmContract.unwindFullyCollateralisedFixedTakerSwap(_notional, sqrtPriceLimitX96);
  }

  public async settleFCMTrader() : Promise<ContractTransaction | void>  {
    if (!this.signer) {
      return;
    }

    const fcmContract = fcmFactory.connect(this.fcmAddress, this.signer);
    const receipt = await fcmContract.settleTrader();
    return receipt;
  }

  public get startDateTime(): DateTime {
    return timestampWadToDateTime(this.termStartTimestamp);
  }

  public get endDateTime(): DateTime {
    return timestampWadToDateTime(this.termEndTimestamp);
  }

  public get initialized(): boolean {
    return !JSBI.EQ(this.sqrtPriceX96, JSBI.BigInt(0));
  }

  public get fixedRate(): Price {
    if (!this._fixedRate) {
      if (!this.initialized) {
        return new Price(1, 0);
      }

      this._fixedRate = new Price(JSBI.multiply(this.sqrtPriceX96, this.sqrtPriceX96), Q192);
    }

    return this._fixedRate;
  }

  public get fixedApr(): number {
    return this.fixedRate.toNumber();
  }

  public get price(): Price {
    if (!this._price) {
      this._price = new Price(Q192, JSBI.multiply(this.sqrtPriceX96, this.sqrtPriceX96));
    }

    return this._price;
  }

  public async getVariableApy(): Promise<number | void> {
    if (!this.provider) {
      return;
    }

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.provider);
    const historicalApy = await marginEngineContract.callStatic.getHistoricalApy();
    return parseFloat(utils.formatEther(historicalApy));
  }

  public get protocol(): string {
    const firstProtocolCharacter = this.rateOracle.protocol[0];
    const tokenName = this.underlyingToken.name;

    return `${firstProtocolCharacter.toLowerCase()}${tokenName}`;
  }

  public closestTickAndFixedRate(fixedRate: number): ClosestTickAndFixedRate {
    const fixedRatePrice = Price.fromNumber(fixedRate);
    const closestTick: number = fixedRateToClosestTick(fixedRatePrice);
    const closestUsableTick: number = nearestUsableTick(
      closestTick,
      JSBI.toNumber(this.tickSpacing),
    );
    const closestUsableFixedRate: Price = tickToFixedRate(closestUsableTick);

    return {
      closestUsableTick,
      closestUsableFixedRate,
    };
  }
}

export default AMM;
