/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { MockStEth, MockStEthInterface } from "../MockStEth";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "getFee",
    outputs: [
      {
        internalType: "uint16",
        name: "feeBasisPoints",
        type: "uint16",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getInstantUpdates",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "sharesAmount",
        type: "uint256",
      },
    ],
    name: "getPooledEthByShares",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getlastUpdatedTimestamp",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "instantUpdates",
        type: "bool",
      },
    ],
    name: "setInstantUpdates",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "lastUpdatedTimestamp",
        type: "uint256",
      },
    ],
    name: "setLastUpdatedTimestamp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "lastUpdatedTimestampManipulation",
        type: "bool",
      },
    ],
    name: "setLastUpdatedTimestampManipulation",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "sharesMultiplier",
        type: "uint256",
      },
    ],
    name: "setSharesMultiplierInRay",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60806040526000805534801561001457600080fd5b506002805461ffff191660011790556102a4806100326000396000f3fe608060405234801561001057600080fd5b50600436106100785760003560e01c806303ac05e81461007d57806309471fa6146100925780633c675687146100a9578063540810d0146100ca57806372228f9e146100f25780637a28fb8814610109578063ced72f871461011c578063faea0a1b1461012c575b600080fd5b61009061008b3660046101dd565b610142565b005b6001545b6040519081526020015b60405180910390f35b6100906100b73660046101f6565b6002805460ff1916911515919091179055565b6100906100d83660046101f6565b600280549115156101000261ff0019909216919091179055565b6100906101003660046101dd565b60005542600155565b6100966101173660046101dd565b6101b1565b6040516103e881526020016100a0565b60025460ff1660405190151581526020016100a0565b600254610100900460ff166101ac5760405162461bcd60e51b815260206004820152602660248201527f456e61626c65206c617374207570646174656420626c6f636b206d616e6970756044820152653630ba34b7b760d11b606482015260840160405180910390fd5b600155565b6000676765c793fa10079d601b1b600054836101cd919061021f565b6101d7919061024c565b92915050565b6000602082840312156101ef57600080fd5b5035919050565b60006020828403121561020857600080fd5b8135801515811461021857600080fd5b9392505050565b600081600019048311821515161561024757634e487b7160e01b600052601160045260246000fd5b500290565b60008261026957634e487b7160e01b600052601260045260246000fd5b50049056fea26469706673582212202ab2f9088997de7b4816afc23192ba7ec34bc4fb3128e5454b7c7fa2a920e4c064736f6c63430008090033";

export class MockStEth__factory extends ContractFactory {
  constructor(
    ...args: [signer: Signer] | ConstructorParameters<typeof ContractFactory>
  ) {
    if (args.length === 1) {
      super(_abi, _bytecode, args[0]);
    } else {
      super(...args);
    }
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<MockStEth> {
    return super.deploy(overrides || {}) as Promise<MockStEth>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): MockStEth {
    return super.attach(address) as MockStEth;
  }
  connect(signer: Signer): MockStEth__factory {
    return super.connect(signer) as MockStEth__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): MockStEthInterface {
    return new utils.Interface(_abi) as MockStEthInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): MockStEth {
    return new Contract(address, _abi, signerOrProvider) as MockStEth;
  }
}