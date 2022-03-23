/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  BaseContract,
  ContractTransaction,
  Overrides,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import type { TypedEventFilter, TypedEvent, TypedListener } from "./common";

interface IFCMInterface extends ethers.utils.Interface {
  functions: {
    "getTraderWithYieldBearingAssets(address)": FunctionFragment;
    "initialize(address,address)": FunctionFragment;
    "initiateFullyCollateralisedFixedTakerSwap(uint256,uint160)": FunctionFragment;
    "marginEngine()": FunctionFragment;
    "rateOracle()": FunctionFragment;
    "settleTrader()": FunctionFragment;
    "transferMarginToMarginEngineTrader(address,uint256)": FunctionFragment;
    "unwindFullyCollateralisedFixedTakerSwap(uint256,uint160)": FunctionFragment;
    "vamm()": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "getTraderWithYieldBearingAssets",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "initialize",
    values: [string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "initiateFullyCollateralisedFixedTakerSwap",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "marginEngine",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "rateOracle",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "settleTrader",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferMarginToMarginEngineTrader",
    values: [string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "unwindFullyCollateralisedFixedTakerSwap",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "vamm", values?: undefined): string;

  decodeFunctionResult(
    functionFragment: "getTraderWithYieldBearingAssets",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "initialize", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "initiateFullyCollateralisedFixedTakerSwap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "marginEngine",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "rateOracle", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "settleTrader",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferMarginToMarginEngineTrader",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "unwindFullyCollateralisedFixedTakerSwap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "vamm", data: BytesLike): Result;

  events: {};
}

export class IFCM extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: IFCMInterface;

  functions: {
    getTraderWithYieldBearingAssets(
      trader: string,
      overrides?: CallOverrides
    ): Promise<
      [
        [BigNumber, BigNumber, BigNumber, boolean] & {
          marginInScaledYieldBearingTokens: BigNumber;
          fixedTokenBalance: BigNumber;
          variableTokenBalance: BigNumber;
          isSettled: boolean;
        }
      ] & {
        traderInfo: [BigNumber, BigNumber, BigNumber, boolean] & {
          marginInScaledYieldBearingTokens: BigNumber;
          fixedTokenBalance: BigNumber;
          variableTokenBalance: BigNumber;
          isSettled: boolean;
        };
      }
    >;

    initialize(
      __vamm: string,
      __marginEngine: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    initiateFullyCollateralisedFixedTakerSwap(
      notional: BigNumberish,
      sqrtPriceLimitX96: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    marginEngine(overrides?: CallOverrides): Promise<[string]>;

    rateOracle(overrides?: CallOverrides): Promise<[string]>;

    settleTrader(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    transferMarginToMarginEngineTrader(
      _account: string,
      marginDeltaInUnderlyingTokens: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    unwindFullyCollateralisedFixedTakerSwap(
      notionalToUnwind: BigNumberish,
      sqrtPriceLimitX96: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    vamm(overrides?: CallOverrides): Promise<[string]>;
  };

  getTraderWithYieldBearingAssets(
    trader: string,
    overrides?: CallOverrides
  ): Promise<
    [BigNumber, BigNumber, BigNumber, boolean] & {
      marginInScaledYieldBearingTokens: BigNumber;
      fixedTokenBalance: BigNumber;
      variableTokenBalance: BigNumber;
      isSettled: boolean;
    }
  >;

  initialize(
    __vamm: string,
    __marginEngine: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  initiateFullyCollateralisedFixedTakerSwap(
    notional: BigNumberish,
    sqrtPriceLimitX96: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  marginEngine(overrides?: CallOverrides): Promise<string>;

  rateOracle(overrides?: CallOverrides): Promise<string>;

  settleTrader(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  transferMarginToMarginEngineTrader(
    _account: string,
    marginDeltaInUnderlyingTokens: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  unwindFullyCollateralisedFixedTakerSwap(
    notionalToUnwind: BigNumberish,
    sqrtPriceLimitX96: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  vamm(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    getTraderWithYieldBearingAssets(
      trader: string,
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, boolean] & {
        marginInScaledYieldBearingTokens: BigNumber;
        fixedTokenBalance: BigNumber;
        variableTokenBalance: BigNumber;
        isSettled: boolean;
      }
    >;

    initialize(
      __vamm: string,
      __marginEngine: string,
      overrides?: CallOverrides
    ): Promise<void>;

    initiateFullyCollateralisedFixedTakerSwap(
      notional: BigNumberish,
      sqrtPriceLimitX96: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    marginEngine(overrides?: CallOverrides): Promise<string>;

    rateOracle(overrides?: CallOverrides): Promise<string>;

    settleTrader(overrides?: CallOverrides): Promise<void>;

    transferMarginToMarginEngineTrader(
      _account: string,
      marginDeltaInUnderlyingTokens: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    unwindFullyCollateralisedFixedTakerSwap(
      notionalToUnwind: BigNumberish,
      sqrtPriceLimitX96: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    vamm(overrides?: CallOverrides): Promise<string>;
  };

  filters: {};

  estimateGas: {
    getTraderWithYieldBearingAssets(
      trader: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    initialize(
      __vamm: string,
      __marginEngine: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    initiateFullyCollateralisedFixedTakerSwap(
      notional: BigNumberish,
      sqrtPriceLimitX96: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    marginEngine(overrides?: CallOverrides): Promise<BigNumber>;

    rateOracle(overrides?: CallOverrides): Promise<BigNumber>;

    settleTrader(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    transferMarginToMarginEngineTrader(
      _account: string,
      marginDeltaInUnderlyingTokens: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    unwindFullyCollateralisedFixedTakerSwap(
      notionalToUnwind: BigNumberish,
      sqrtPriceLimitX96: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    vamm(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    getTraderWithYieldBearingAssets(
      trader: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    initialize(
      __vamm: string,
      __marginEngine: string,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    initiateFullyCollateralisedFixedTakerSwap(
      notional: BigNumberish,
      sqrtPriceLimitX96: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    marginEngine(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    rateOracle(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    settleTrader(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    transferMarginToMarginEngineTrader(
      _account: string,
      marginDeltaInUnderlyingTokens: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    unwindFullyCollateralisedFixedTakerSwap(
      notionalToUnwind: BigNumberish,
      sqrtPriceLimitX96: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    vamm(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
