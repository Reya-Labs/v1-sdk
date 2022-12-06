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

interface CommunityDeployerInterface extends ethers.utils.Interface {
  functions: {
    "TIMELOCK_PERIOD_IN_SECONDS()": FunctionFragment;
    "blockTimestampTimelockEnd()": FunctionFragment;
    "blockTimestampVotingEnd()": FunctionFragment;
    "castVote(uint256,uint256,bool,bytes32[])": FunctionFragment;
    "deploy()": FunctionFragment;
    "hasTokenIdVoted(uint256)": FunctionFragment;
    "hasVoted(uint256)": FunctionFragment;
    "isQueued()": FunctionFragment;
    "masterMarginEngine()": FunctionFragment;
    "masterVAMM()": FunctionFragment;
    "merkleRoot()": FunctionFragment;
    "noVoteCount()": FunctionFragment;
    "ownerAddress()": FunctionFragment;
    "queue()": FunctionFragment;
    "quorumVotes()": FunctionFragment;
    "voltzFactory()": FunctionFragment;
    "yesVoteCount()": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "TIMELOCK_PERIOD_IN_SECONDS",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "blockTimestampTimelockEnd",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "blockTimestampVotingEnd",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "castVote",
    values: [BigNumberish, BigNumberish, boolean, BytesLike[]]
  ): string;
  encodeFunctionData(functionFragment: "deploy", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "hasTokenIdVoted",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "hasVoted",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(functionFragment: "isQueued", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "masterMarginEngine",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "masterVAMM",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "merkleRoot",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "noVoteCount",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "ownerAddress",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "queue", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "quorumVotes",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "voltzFactory",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "yesVoteCount",
    values?: undefined
  ): string;

  decodeFunctionResult(
    functionFragment: "TIMELOCK_PERIOD_IN_SECONDS",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "blockTimestampTimelockEnd",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "blockTimestampVotingEnd",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "castVote", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "deploy", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "hasTokenIdVoted",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "hasVoted", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "isQueued", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "masterMarginEngine",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "masterVAMM", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "merkleRoot", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "noVoteCount",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "ownerAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "queue", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "quorumVotes",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "voltzFactory",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "yesVoteCount",
    data: BytesLike
  ): Result;

  events: {
    "Voted(uint256,address,uint256,bool)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "Voted"): EventFragment;
}

export type VotedEvent = TypedEvent<
  [BigNumber, string, BigNumber, boolean] & {
    index: BigNumber;
    account: string;
    numberOfVotes: BigNumber;
    yesVote: boolean;
  }
>;

export class CommunityDeployer extends BaseContract {
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

  interface: CommunityDeployerInterface;

  functions: {
    TIMELOCK_PERIOD_IN_SECONDS(overrides?: CallOverrides): Promise<[BigNumber]>;

    blockTimestampTimelockEnd(overrides?: CallOverrides): Promise<[BigNumber]>;

    blockTimestampVotingEnd(overrides?: CallOverrides): Promise<[BigNumber]>;

    castVote(
      _index: BigNumberish,
      _numberOfVotes: BigNumberish,
      _yesVote: boolean,
      _merkleProof: BytesLike[],
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    deploy(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    hasTokenIdVoted(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    hasVoted(
      index: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    isQueued(overrides?: CallOverrides): Promise<[boolean]>;

    masterMarginEngine(overrides?: CallOverrides): Promise<[string]>;

    masterVAMM(overrides?: CallOverrides): Promise<[string]>;

    merkleRoot(overrides?: CallOverrides): Promise<[string]>;

    noVoteCount(overrides?: CallOverrides): Promise<[BigNumber]>;

    ownerAddress(overrides?: CallOverrides): Promise<[string]>;

    queue(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<ContractTransaction>;

    quorumVotes(overrides?: CallOverrides): Promise<[BigNumber]>;

    voltzFactory(overrides?: CallOverrides): Promise<[string]>;

    yesVoteCount(overrides?: CallOverrides): Promise<[BigNumber]>;
  };

  TIMELOCK_PERIOD_IN_SECONDS(overrides?: CallOverrides): Promise<BigNumber>;

  blockTimestampTimelockEnd(overrides?: CallOverrides): Promise<BigNumber>;

  blockTimestampVotingEnd(overrides?: CallOverrides): Promise<BigNumber>;

  castVote(
    _index: BigNumberish,
    _numberOfVotes: BigNumberish,
    _yesVote: boolean,
    _merkleProof: BytesLike[],
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  hasTokenIdVoted(
    arg0: BigNumberish,
    overrides?: CallOverrides
  ): Promise<boolean>;

  hasVoted(index: BigNumberish, overrides?: CallOverrides): Promise<boolean>;

  isQueued(overrides?: CallOverrides): Promise<boolean>;

  masterMarginEngine(overrides?: CallOverrides): Promise<string>;

  masterVAMM(overrides?: CallOverrides): Promise<string>;

  merkleRoot(overrides?: CallOverrides): Promise<string>;

  noVoteCount(overrides?: CallOverrides): Promise<BigNumber>;

  ownerAddress(overrides?: CallOverrides): Promise<string>;

  queue(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ContractTransaction>;

  quorumVotes(overrides?: CallOverrides): Promise<BigNumber>;

  voltzFactory(overrides?: CallOverrides): Promise<string>;

  yesVoteCount(overrides?: CallOverrides): Promise<BigNumber>;

  callStatic: {
    TIMELOCK_PERIOD_IN_SECONDS(overrides?: CallOverrides): Promise<BigNumber>;

    blockTimestampTimelockEnd(overrides?: CallOverrides): Promise<BigNumber>;

    blockTimestampVotingEnd(overrides?: CallOverrides): Promise<BigNumber>;

    castVote(
      _index: BigNumberish,
      _numberOfVotes: BigNumberish,
      _yesVote: boolean,
      _merkleProof: BytesLike[],
      overrides?: CallOverrides
    ): Promise<void>;

    deploy(overrides?: CallOverrides): Promise<void>;

    hasTokenIdVoted(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<boolean>;

    hasVoted(index: BigNumberish, overrides?: CallOverrides): Promise<boolean>;

    isQueued(overrides?: CallOverrides): Promise<boolean>;

    masterMarginEngine(overrides?: CallOverrides): Promise<string>;

    masterVAMM(overrides?: CallOverrides): Promise<string>;

    merkleRoot(overrides?: CallOverrides): Promise<string>;

    noVoteCount(overrides?: CallOverrides): Promise<BigNumber>;

    ownerAddress(overrides?: CallOverrides): Promise<string>;

    queue(overrides?: CallOverrides): Promise<void>;

    quorumVotes(overrides?: CallOverrides): Promise<BigNumber>;

    voltzFactory(overrides?: CallOverrides): Promise<string>;

    yesVoteCount(overrides?: CallOverrides): Promise<BigNumber>;
  };

  filters: {
    "Voted(uint256,address,uint256,bool)"(
      index?: null,
      account?: null,
      numberOfVotes?: null,
      yesVote?: null
    ): TypedEventFilter<
      [BigNumber, string, BigNumber, boolean],
      {
        index: BigNumber;
        account: string;
        numberOfVotes: BigNumber;
        yesVote: boolean;
      }
    >;

    Voted(
      index?: null,
      account?: null,
      numberOfVotes?: null,
      yesVote?: null
    ): TypedEventFilter<
      [BigNumber, string, BigNumber, boolean],
      {
        index: BigNumber;
        account: string;
        numberOfVotes: BigNumber;
        yesVote: boolean;
      }
    >;
  };

  estimateGas: {
    TIMELOCK_PERIOD_IN_SECONDS(overrides?: CallOverrides): Promise<BigNumber>;

    blockTimestampTimelockEnd(overrides?: CallOverrides): Promise<BigNumber>;

    blockTimestampVotingEnd(overrides?: CallOverrides): Promise<BigNumber>;

    castVote(
      _index: BigNumberish,
      _numberOfVotes: BigNumberish,
      _yesVote: boolean,
      _merkleProof: BytesLike[],
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    deploy(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    hasTokenIdVoted(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    hasVoted(
      index: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    isQueued(overrides?: CallOverrides): Promise<BigNumber>;

    masterMarginEngine(overrides?: CallOverrides): Promise<BigNumber>;

    masterVAMM(overrides?: CallOverrides): Promise<BigNumber>;

    merkleRoot(overrides?: CallOverrides): Promise<BigNumber>;

    noVoteCount(overrides?: CallOverrides): Promise<BigNumber>;

    ownerAddress(overrides?: CallOverrides): Promise<BigNumber>;

    queue(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<BigNumber>;

    quorumVotes(overrides?: CallOverrides): Promise<BigNumber>;

    voltzFactory(overrides?: CallOverrides): Promise<BigNumber>;

    yesVoteCount(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    TIMELOCK_PERIOD_IN_SECONDS(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    blockTimestampTimelockEnd(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    blockTimestampVotingEnd(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    castVote(
      _index: BigNumberish,
      _numberOfVotes: BigNumberish,
      _yesVote: boolean,
      _merkleProof: BytesLike[],
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    deploy(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    hasTokenIdVoted(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    hasVoted(
      index: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    isQueued(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    masterMarginEngine(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    masterVAMM(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    merkleRoot(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    noVoteCount(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    ownerAddress(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    queue(
      overrides?: Overrides & { from?: string | Promise<string> }
    ): Promise<PopulatedTransaction>;

    quorumVotes(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    voltzFactory(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    yesVoteCount(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}