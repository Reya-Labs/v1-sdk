import JSBI from 'jsbi';
import { DateTime } from 'luxon';
import { BigNumber, BigNumberish, ContractTransaction, Signer } from 'ethers';

import { BigIntish, SwapPeripheryParams, MintOrBurnParams } from '../types';
import { Q192, PERIPHERY_ADDRESS } from '../constants';
import { Price } from './fractions/price';
import {
  Periphery__factory as peripheryFactory,
  MarginEngine__factory as marginEngineFactory,
  VAMM__factory as vammFactory,
  Factory__factory as factoryFactory
} from '../typechain';
import Token from './token';
import RateOracle from './rateOracle';
import { TickMath } from '../utils/tickMath';
import timestampWadToDateTime from '../utils/timestampWadToDateTime';
import { FACTORY_ADDRESS } from '../../dist/types/constants';

export type AMMConstructorArgs = {
  id: string;
  signer: Signer | null;
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

export type AMMGetMinimumMarginRequirementArgs = {
  recipient: string;
  isFT: boolean;
  notional: BigNumberish;
  sqrtPriceLimitX96: BigNumberish;
  tickLower: BigNumberish;
  tickUpper: BigNumberish;
};

export type AMMUpdatePositionMarginArgs = {
  owner: string;
  tickLower: BigNumberish;
  tickUpper: BigNumberish;
  marginDelta: BigNumberish;
};

export type AMMSettlePositionArgs = {
  owner: string;
  tickLower: BigNumberish;
  tickUpper: BigNumberish;
};

export type AMMSwapArgs = {
  recipient: string;
  isFT: boolean;
  notional: BigNumberish;
  sqrtPriceLimitX96: BigNumberish;
  tickLower: 0;
  tickUpper: 0;
};

export type AMMMintOrBurnArgs = {
  recipient: string;
  tickLower: BigNumberish;
  tickUpper: BigNumberish;
  notional: BigNumberish;
  isMint: boolean;
};

class AMM {
  public readonly id: string;
  public readonly signer: Signer | null;
  public readonly marginEngineAddress: string;
  public readonly fcmAddress: string;
  public readonly rateOracle: RateOracle;
  public readonly createdTimestamp: JSBI;
  public readonly updatedTimestamp: JSBI;
  public readonly termStartTimestamp: JSBI;
  public readonly termEndTimestamp: JSBI;
  public readonly underlyingToken: Token;
  public readonly sqrtPriceX96: JSBI;
  public readonly liquidity: JSBI;
  public readonly tickSpacing: JSBI;
  public readonly tick: JSBI;
  public readonly txCount: JSBI;
  private _fixedRate?: Price;
  private _price?: Price;

  public constructor({
    id,
    signer,
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

  public async getMinimumMarginRequirement({
    recipient,
    isFT,
    notional,
    sqrtPriceLimitX96,
    tickLower,
    tickUpper,
  }: AMMGetMinimumMarginRequirementArgs) : Promise<BigNumber | void> {
    if (!this.signer) {
      return;
    }

    const peripheryContract = peripheryFactory.connect(PERIPHERY_ADDRESS, this.signer);
    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngineAddress: this.marginEngineAddress,
      recipient,
      isFT,
      notional,
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
    };

    let marginRequirement: BigNumber = BigNumber.from(0);

    await peripheryContract.callStatic.swap(swapPeripheryParams).then(
      async (result: any) => {
        marginRequirement = result[4];
      },
      (error) => {
        if (error.message.includes('MarginRequirementNotMet')) {
          const args: string[] = error.message
            .split('(')[1]
            .split(')')[0]
            .replaceAll(' ', '')
            .split(',');

          marginRequirement = BigNumber.from(args[0]);
        } else {
          console.error(error.message);
        }
      },
    );

    return marginRequirement;
  }

  public async settlePosition({ owner, tickLower, tickUpper }: AMMSettlePositionArgs) : Promise<ContractTransaction | void>  {
    if (!this.signer) {
      return;
    }

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const settlePositionReceipt = await marginEngineContract.settlePosition(
      tickLower,
      tickUpper,
      owner,
    );
    return settlePositionReceipt;
  }

  public async updatePositionMargin({
    owner,
    tickLower,
    tickUpper,
    marginDelta,
  }: AMMUpdatePositionMarginArgs) : Promise<ContractTransaction | void>  {
    if (!this.signer) {
      return;
    }

    const marginEngineContract = marginEngineFactory.connect(this.marginEngineAddress, this.signer);
    const updatePositionMarginReceipt = await marginEngineContract.updatePositionMargin(
      owner,
      tickLower,
      tickUpper,
      marginDelta,
    );

    return updatePositionMarginReceipt;
  }

  public async mint({ tickLower, ...args }: Omit<AMMMintOrBurnArgs, 'isMint'>): Promise<ContractTransaction | void> {
    if (!this.signer) {
      return;
    }

    const vammContract = vammFactory.connect(this.id, this.signer);

    if (JSBI.EQ(this.sqrtPriceX96, JSBI.BigInt(0))) {
      await vammContract.initializeVAMM(TickMath.getSqrtRatioAtTick(BigNumber.from(tickLower).toNumber()).toString())
    }

    return this.mintOrBurn({ ...args, tickLower, isMint: true });
  }

  public async burn(args: Omit<AMMMintOrBurnArgs, 'isMint'>): Promise<ContractTransaction | void> {
    return this.mintOrBurn({ ...args, isMint: false });
  }
 
  public async mintOrBurn({
    recipient,
    tickLower,
    tickUpper,
    notional,
    isMint,
  }: AMMMintOrBurnArgs) : Promise<ContractTransaction | void> {
    if (!this.signer) {
      return;
    }
    
    this.approvePeriphery()

    const peripheryContract = peripheryFactory.connect(PERIPHERY_ADDRESS, this.signer);
    const mintOrBurnParams: MintOrBurnParams = {
      marginEngineAddress: this.marginEngineAddress,
      recipient,
      tickLower,
      tickUpper,
      notional,
      isMint,
    };

    return peripheryContract.mintOrBurn(mintOrBurnParams);
  }

  public async approvePeriphery(): Promise<ContractTransaction | void> {

    if (!this.signer) {
      return;
    }
    
    const factoryContract = factoryFactory.connect(FACTORY_ADDRESS, this.signer);
    const signerAddress = await this.signer.getAddress();

    // check if already approved
    const isApproved = await factoryContract.isApproved(signerAddress, PERIPHERY_ADDRESS);

    if (!isApproved) {
      return await factoryContract.setApproval(PERIPHERY_ADDRESS, true);
    } else {
      return;
    }

  }
  
  public async swap({
    recipient,
    isFT,
    notional,
    sqrtPriceLimitX96,
    tickLower = 0,
    tickUpper = 0,
  }: AMMSwapArgs): Promise<ContractTransaction | void> {
    if (!this.signer) {
      return;
    }

    this.approvePeriphery()

    const peripheryContract = peripheryFactory.connect(PERIPHERY_ADDRESS, this.signer);
    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngineAddress: this.marginEngineAddress,
      recipient,
      isFT,
      notional,
      sqrtPriceLimitX96,
      tickLower,
      tickUpper,
    };

    return peripheryContract.swap(swapPeripheryParams);
  }

  public get startDateTime(): DateTime {
    return timestampWadToDateTime(this.termStartTimestamp);
  }

  public get endDateTime(): DateTime {
    return timestampWadToDateTime(this.termEndTimestamp);
  }

  public get fixedRate(): Price {
    if (!this._fixedRate) {
      this._fixedRate = new Price(JSBI.multiply(this.sqrtPriceX96, this.sqrtPriceX96), Q192);
    }

    return this._fixedRate;
  }

  public get fixedApr(): number {
    return parseInt(this.fixedRate.toFixed(2));
  }

  public get price(): Price {
    if (!this._price) {
      this._price = new Price(Q192, JSBI.multiply(this.sqrtPriceX96, this.sqrtPriceX96));
    }

    return this._price;
  }

  public get variableApr(): number {
    return 0;
  }

  public get protocol(): string {
    return this.rateOracle.protocol;
  }
}

export default AMM;
