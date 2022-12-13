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
  PayableOverrides,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import type { TypedEventFilter, TypedEvent, TypedListener } from "./common";

interface IPeripheryOldInterface extends ethers.utils.Interface {
  functions: {
    "getCurrentTick(address)": FunctionFragment;
    "lpMarginCaps(address)": FunctionFragment;
    "lpMarginCumulatives(address)": FunctionFragment;
    "mintOrBurn((address,int24,int24,uint256,bool,int256))": FunctionFragment;
    "rolloverWithMint(address,address,int24,int24,(address,int24,int24,uint256,bool,int256))": FunctionFragment;
    "rolloverWithSwap(address,address,int24,int24,(address,bool,uint256,uint160,int24,int24,uint256))": FunctionFragment;
    "setLPMarginCap(address,int256)": FunctionFragment;
    "setLPMarginCumulative(address,int256)": FunctionFragment;
    "settlePositionAndWithdrawMargin(address,address,int24,int24)": FunctionFragment;
    "swap((address,bool,uint256,uint160,int24,int24,uint256))": FunctionFragment;
    "updatePositionMargin(address,int24,int24,int256,bool)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "getCurrentTick",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "lpMarginCaps",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "lpMarginCumulatives",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "mintOrBurn",
    values: [
      {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      }
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "rolloverWithMint",
    values: [
      string,
      string,
      BigNumberish,
      BigNumberish,
      {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      }
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "rolloverWithSwap",
    values: [
      string,
      string,
      BigNumberish,
      BigNumberish,
      {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      }
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "setLPMarginCap",
    values: [string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "setLPMarginCumulative",
    values: [string, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "settlePositionAndWithdrawMargin",
    values: [string, string, BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "swap",
    values: [
      {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      }
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "updatePositionMargin",
    values: [string, BigNumberish, BigNumberish, BigNumberish, boolean]
  ): string;

  decodeFunctionResult(
    functionFragment: "getCurrentTick",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "lpMarginCaps",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "lpMarginCumulatives",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "mintOrBurn", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "rolloverWithMint",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "rolloverWithSwap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setLPMarginCap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setLPMarginCumulative",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "settlePositionAndWithdrawMargin",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "swap", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "updatePositionMargin",
    data: BytesLike
  ): Result;

  events: {
    "MarginCap(address,int256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "MarginCap"): EventFragment;
}

export type MarginCapEvent = TypedEvent<
  [string, BigNumber] & { vamm: string; lpMarginCapNew: BigNumber }
>;

export class IPeripheryOld extends BaseContract {
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

  interface: IPeripheryOldInterface;

  functions: {
    getCurrentTick(
      marginEngine: string,
      overrides?: CallOverrides
    ): Promise<[number] & { currentTick: number }>;

    lpMarginCaps(vamm: string, overrides?: CallOverrides): Promise<[BigNumber]>;

    lpMarginCumulatives(
      vamm: string,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    mintOrBurn(
      params: {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    rolloverWithMint(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      paramsNewPosition: {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    rolloverWithSwap(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      paramsNewPosition: {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setLPMarginCap(
      vamm: string,
      lpMarginCapNew: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    setLPMarginCumulative(
      vamm: string,
      lpMarginCumulative: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    settlePositionAndWithdrawMargin(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    swap(
      params: {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    updatePositionMargin(
      marginEngine: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      marginDelta: BigNumberish,
      fullyWithdraw: boolean,
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;
  };

  getCurrentTick(
    marginEngine: string,
    overrides?: CallOverrides
  ): Promise<number>;

  lpMarginCaps(vamm: string, overrides?: CallOverrides): Promise<BigNumber>;

  lpMarginCumulatives(
    vamm: string,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  mintOrBurn(
    params: {
      marginEngine: string;
      tickLower: BigNumberish;
      tickUpper: BigNumberish;
      notional: BigNumberish;
      isMint: boolean;
      marginDelta: BigNumberish;
    },
    overrides?: PayableOverrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  rolloverWithMint(
    marginEngine: string,
    owner: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    paramsNewPosition: {
      marginEngine: string;
      tickLower: BigNumberish;
      tickUpper: BigNumberish;
      notional: BigNumberish;
      isMint: boolean;
      marginDelta: BigNumberish;
    },
    overrides?: PayableOverrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  rolloverWithSwap(
    marginEngine: string,
    owner: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    paramsNewPosition: {
      marginEngine: string;
      isFT: boolean;
      notional: BigNumberish;
      sqrtPriceLimitX96: BigNumberish;
      tickLower: BigNumberish;
      tickUpper: BigNumberish;
      marginDelta: BigNumberish;
    },
    overrides?: PayableOverrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setLPMarginCap(
    vamm: string,
    lpMarginCapNew: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  setLPMarginCumulative(
    vamm: string,
    lpMarginCumulative: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  settlePositionAndWithdrawMargin(
    marginEngine: string,
    owner: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  swap(
    params: {
      marginEngine: string;
      isFT: boolean;
      notional: BigNumberish;
      sqrtPriceLimitX96: BigNumberish;
      tickLower: BigNumberish;
      tickUpper: BigNumberish;
      marginDelta: BigNumberish;
    },
    overrides?: PayableOverrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  updatePositionMargin(
    marginEngine: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    marginDelta: BigNumberish,
    fullyWithdraw: boolean,
    overrides?: PayableOverrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    getCurrentTick(
      marginEngine: string,
      overrides?: CallOverrides
    ): Promise<number>;

    lpMarginCaps(vamm: string, overrides?: CallOverrides): Promise<BigNumber>;

    lpMarginCumulatives(
      vamm: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mintOrBurn(
      params: {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      },
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    rolloverWithMint(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      paramsNewPosition: {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      },
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    rolloverWithSwap(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      paramsNewPosition: {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      },
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, number] & {
        _fixedTokenDelta: BigNumber;
        _variableTokenDelta: BigNumber;
        _cumulativeFeeIncurred: BigNumber;
        _fixedTokenDeltaUnbalanced: BigNumber;
        _marginRequirement: BigNumber;
        _tickAfter: number;
      }
    >;

    setLPMarginCap(
      vamm: string,
      lpMarginCapNew: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    setLPMarginCumulative(
      vamm: string,
      lpMarginCumulative: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    settlePositionAndWithdrawMargin(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    swap(
      params: {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      },
      overrides?: CallOverrides
    ): Promise<
      [BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, number] & {
        _fixedTokenDelta: BigNumber;
        _variableTokenDelta: BigNumber;
        _cumulativeFeeIncurred: BigNumber;
        _fixedTokenDeltaUnbalanced: BigNumber;
        _marginRequirement: BigNumber;
        _tickAfter: number;
      }
    >;

    updatePositionMargin(
      marginEngine: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      marginDelta: BigNumberish,
      fullyWithdraw: boolean,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "MarginCap(address,int256)"(
      vamm?: null,
      lpMarginCapNew?: null
    ): TypedEventFilter<
      [string, BigNumber],
      { vamm: string; lpMarginCapNew: BigNumber }
    >;

    MarginCap(
      vamm?: null,
      lpMarginCapNew?: null
    ): TypedEventFilter<
      [string, BigNumber],
      { vamm: string; lpMarginCapNew: BigNumber }
    >;
  };

  estimateGas: {
    getCurrentTick(
      marginEngine: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    lpMarginCaps(vamm: string, overrides?: CallOverrides): Promise<BigNumber>;

    lpMarginCumulatives(
      vamm: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mintOrBurn(
      params: {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    rolloverWithMint(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      paramsNewPosition: {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    rolloverWithSwap(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      paramsNewPosition: {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setLPMarginCap(
      vamm: string,
      lpMarginCapNew: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    setLPMarginCumulative(
      vamm: string,
      lpMarginCumulative: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    settlePositionAndWithdrawMargin(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    swap(
      params: {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    updatePositionMargin(
      marginEngine: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      marginDelta: BigNumberish,
      fullyWithdraw: boolean,
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    getCurrentTick(
      marginEngine: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    lpMarginCaps(
      vamm: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    lpMarginCumulatives(
      vamm: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    mintOrBurn(
      params: {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    rolloverWithMint(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      paramsNewPosition: {
        marginEngine: string;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        notional: BigNumberish;
        isMint: boolean;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    rolloverWithSwap(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      paramsNewPosition: {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setLPMarginCap(
      vamm: string,
      lpMarginCapNew: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    setLPMarginCumulative(
      vamm: string,
      lpMarginCumulative: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    settlePositionAndWithdrawMargin(
      marginEngine: string,
      owner: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    swap(
      params: {
        marginEngine: string;
        isFT: boolean;
        notional: BigNumberish;
        sqrtPriceLimitX96: BigNumberish;
        tickLower: BigNumberish;
        tickUpper: BigNumberish;
        marginDelta: BigNumberish;
      },
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    updatePositionMargin(
      marginEngine: string,
      tickLower: BigNumberish,
      tickUpper: BigNumberish,
      marginDelta: BigNumberish,
      fullyWithdraw: boolean,
      overrides?: PayableOverrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;
  };
}