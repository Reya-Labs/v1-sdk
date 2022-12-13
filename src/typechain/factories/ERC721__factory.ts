/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { ERC721, ERC721Interface } from "../ERC721";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name_",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol_",
        type: "string",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "approved",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "balanceOf",
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
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "getApproved",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
    ],
    name: "isApprovedForAll",
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
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "ownerOf",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
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
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "tokenURI",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b5060405162001372380380620013728339810160408190526200003491620001db565b81516200004990600090602085019062000068565b5080516200005f90600190602084019062000068565b50505062000282565b828054620000769062000245565b90600052602060002090601f0160209004810192826200009a5760008555620000e5565b82601f10620000b557805160ff1916838001178555620000e5565b82800160010185558215620000e5579182015b82811115620000e5578251825591602001919060010190620000c8565b50620000f3929150620000f7565b5090565b5b80821115620000f35760008155600101620000f8565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200013657600080fd5b81516001600160401b03808211156200015357620001536200010e565b604051601f8301601f19908116603f011681019082821181831017156200017e576200017e6200010e565b816040528381526020925086838588010111156200019b57600080fd5b600091505b83821015620001bf5785820183015181830184015290820190620001a0565b83821115620001d15760008385830101525b9695505050505050565b60008060408385031215620001ef57600080fd5b82516001600160401b03808211156200020757600080fd5b620002158683870162000124565b935060208501519150808211156200022c57600080fd5b506200023b8582860162000124565b9150509250929050565b600181811c908216806200025a57607f821691505b602082108114156200027c57634e487b7160e01b600052602260045260246000fd5b50919050565b6110e080620002926000396000f3fe608060405234801561001057600080fd5b50600436106100af5760003560e01c806301ffc9a7146100b457806306fdde03146100dc578063081812fc146100f1578063095ea7b31461011c57806323b872dd1461013157806342842e0e146101445780636352211e1461015757806370a082311461016a57806395d89b411461018b578063a22cb46514610193578063b88d4fde146101a6578063c87b56dd146101b9578063e985e9c5146101cc575b600080fd5b6100c76100c2366004610bc2565b6101df565b60405190151581526020015b60405180910390f35b6100e4610231565b6040516100d39190610c37565b6101046100ff366004610c4a565b6102c3565b6040516001600160a01b0390911681526020016100d3565b61012f61012a366004610c7f565b6102ea565b005b61012f61013f366004610ca9565b610405565b61012f610152366004610ca9565b610436565b610104610165366004610c4a565b610451565b61017d610178366004610ce5565b610486565b6040519081526020016100d3565b6100e461050c565b61012f6101a1366004610d00565b61051b565b61012f6101b4366004610d52565b61052a565b6100e46101c7366004610c4a565b610562565b6100c76101da366004610e2d565b6105d6565b60006001600160e01b031982166380ac58cd60e01b148061021057506001600160e01b03198216635b5e139f60e01b145b8061022b57506301ffc9a760e01b6001600160e01b03198316145b92915050565b60606000805461024090610e60565b80601f016020809104026020016040519081016040528092919081815260200182805461026c90610e60565b80156102b95780601f1061028e576101008083540402835291602001916102b9565b820191906000526020600020905b81548152906001019060200180831161029c57829003601f168201915b5050505050905090565b60006102ce82610604565b506000908152600460205260409020546001600160a01b031690565b60006102f582610451565b9050806001600160a01b0316836001600160a01b031614156103685760405162461bcd60e51b815260206004820152602160248201527f4552433732313a20617070726f76616c20746f2063757272656e74206f776e656044820152603960f91b60648201526084015b60405180910390fd5b336001600160a01b0382161480610384575061038481336105d6565b6103f65760405162461bcd60e51b815260206004820152603e60248201527f4552433732313a20617070726f76652063616c6c6572206973206e6f7420746f60448201527f6b656e206f776e6572206e6f7220617070726f76656420666f7220616c6c0000606482015260840161035f565b610400838361063b565b505050565b61040f33826106a9565b61042b5760405162461bcd60e51b815260040161035f90610e9b565b610400838383610708565b6104008383836040518060200160405280600081525061052a565b6000818152600260205260408120546001600160a01b03168061022b5760405162461bcd60e51b815260040161035f90610ee9565b60006001600160a01b0382166104f05760405162461bcd60e51b815260206004820152602960248201527f4552433732313a2061646472657373207a65726f206973206e6f7420612076616044820152683634b21037bbb732b960b91b606482015260840161035f565b506001600160a01b031660009081526003602052604090205490565b60606001805461024090610e60565b6105263383836108a4565b5050565b61053433836106a9565b6105505760405162461bcd60e51b815260040161035f90610e9b565b61055c8484848461096f565b50505050565b606061056d82610604565b600061058460408051602081019091526000815290565b905060008151116105a457604051806020016040528060008152506105cf565b806105ae846109a2565b6040516020016105bf929190610f1b565b6040516020818303038152906040525b9392505050565b6001600160a01b03918216600090815260056020908152604080832093909416825291909152205460ff1690565b6000818152600260205260409020546001600160a01b03166106385760405162461bcd60e51b815260040161035f90610ee9565b50565b600081815260046020526040902080546001600160a01b0319166001600160a01b038416908117909155819061067082610451565b6001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a45050565b6000806106b583610451565b9050806001600160a01b0316846001600160a01b031614806106dc57506106dc81856105d6565b806107005750836001600160a01b03166106f5846102c3565b6001600160a01b0316145b949350505050565b826001600160a01b031661071b82610451565b6001600160a01b03161461077f5760405162461bcd60e51b815260206004820152602560248201527f4552433732313a207472616e736665722066726f6d20696e636f72726563742060448201526437bbb732b960d91b606482015260840161035f565b6001600160a01b0382166107e15760405162461bcd60e51b8152602060048201526024808201527f4552433732313a207472616e7366657220746f20746865207a65726f206164646044820152637265737360e01b606482015260840161035f565b6107ec60008261063b565b6001600160a01b0383166000908152600360205260408120805460019290610815908490610f60565b90915550506001600160a01b0382166000908152600360205260408120805460019290610843908490610f77565b909155505060008181526002602052604080822080546001600160a01b0319166001600160a01b0386811691821790925591518493918716917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef91a4505050565b816001600160a01b0316836001600160a01b031614156109025760405162461bcd60e51b815260206004820152601960248201527822a9219b99189d1030b8383937bb32903a379031b0b63632b960391b604482015260640161035f565b6001600160a01b03838116600081815260056020908152604080832094871680845294825291829020805460ff191686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b61097a848484610708565b61098684848484610a9f565b61055c5760405162461bcd60e51b815260040161035f90610f8f565b6060816109c65750506040805180820190915260018152600360fc1b602082015290565b8160005b81156109f057806109da81610fe1565b91506109e99050600a83611012565b91506109ca565b6000816001600160401b03811115610a0a57610a0a610d3c565b6040519080825280601f01601f191660200182016040528015610a34576020820181803683370190505b5090505b841561070057610a49600183610f60565b9150610a56600a86611026565b610a61906030610f77565b60f81b818381518110610a7657610a7661103a565b60200101906001600160f81b031916908160001a905350610a98600a86611012565b9450610a38565b60006001600160a01b0384163b15610ba157604051630a85bd0160e11b81526001600160a01b0385169063150b7a0290610ae3903390899088908890600401611050565b602060405180830381600087803b158015610afd57600080fd5b505af1925050508015610b2d575060408051601f3d908101601f19168201909252610b2a9181019061108d565b60015b610b87573d808015610b5b576040519150601f19603f3d011682016040523d82523d6000602084013e610b60565b606091505b508051610b7f5760405162461bcd60e51b815260040161035f90610f8f565b805181602001fd5b6001600160e01b031916630a85bd0160e11b149050610700565b506001949350505050565b6001600160e01b03198116811461063857600080fd5b600060208284031215610bd457600080fd5b81356105cf81610bac565b60005b83811015610bfa578181015183820152602001610be2565b8381111561055c5750506000910152565b60008151808452610c23816020860160208601610bdf565b601f01601f19169290920160200192915050565b6020815260006105cf6020830184610c0b565b600060208284031215610c5c57600080fd5b5035919050565b80356001600160a01b0381168114610c7a57600080fd5b919050565b60008060408385031215610c9257600080fd5b610c9b83610c63565b946020939093013593505050565b600080600060608486031215610cbe57600080fd5b610cc784610c63565b9250610cd560208501610c63565b9150604084013590509250925092565b600060208284031215610cf757600080fd5b6105cf82610c63565b60008060408385031215610d1357600080fd5b610d1c83610c63565b915060208301358015158114610d3157600080fd5b809150509250929050565b634e487b7160e01b600052604160045260246000fd5b60008060008060808587031215610d6857600080fd5b610d7185610c63565b9350610d7f60208601610c63565b92506040850135915060608501356001600160401b0380821115610da257600080fd5b818701915087601f830112610db657600080fd5b813581811115610dc857610dc8610d3c565b604051601f8201601f19908116603f01168101908382118183101715610df057610df0610d3c565b816040528281528a6020848701011115610e0957600080fd5b82602086016020830137600060208483010152809550505050505092959194509250565b60008060408385031215610e4057600080fd5b610e4983610c63565b9150610e5760208401610c63565b90509250929050565b600181811c90821680610e7457607f821691505b60208210811415610e9557634e487b7160e01b600052602260045260246000fd5b50919050565b6020808252602e908201527f4552433732313a2063616c6c6572206973206e6f7420746f6b656e206f776e6560408201526d1c881b9bdc88185c1c1c9bdd995960921b606082015260800190565b602080825260189082015277115490cdcc8c4e881a5b9d985b1a59081d1bdad95b88125160421b604082015260600190565b60008351610f2d818460208801610bdf565b835190830190610f41818360208801610bdf565b01949350505050565b634e487b7160e01b600052601160045260246000fd5b600082821015610f7257610f72610f4a565b500390565b60008219821115610f8a57610f8a610f4a565b500190565b60208082526032908201527f4552433732313a207472616e7366657220746f206e6f6e20455243373231526560408201527131b2b4bb32b91034b6b83632b6b2b73a32b960711b606082015260800190565b6000600019821415610ff557610ff5610f4a565b5060010190565b634e487b7160e01b600052601260045260246000fd5b60008261102157611021610ffc565b500490565b60008261103557611035610ffc565b500690565b634e487b7160e01b600052603260045260246000fd5b6001600160a01b038581168252841660208201526040810183905260806060820181905260009061108390830184610c0b565b9695505050505050565b60006020828403121561109f57600080fd5b81516105cf81610bac56fea2646970667358221220c8873ad8f2635734eb813b7fa2f624ad3cc6abd1d27df23b127e87b02c519de564736f6c63430008090033";

export class ERC721__factory extends ContractFactory {
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
    name_: string,
    symbol_: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<ERC721> {
    return super.deploy(name_, symbol_, overrides || {}) as Promise<ERC721>;
  }
  getDeployTransaction(
    name_: string,
    symbol_: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(name_, symbol_, overrides || {});
  }
  attach(address: string): ERC721 {
    return super.attach(address) as ERC721;
  }
  connect(signer: Signer): ERC721__factory {
    return super.connect(signer) as ERC721__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ERC721Interface {
    return new utils.Interface(_abi) as ERC721Interface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): ERC721 {
    return new Contract(address, _abi, signerOrProvider) as ERC721;
  }
}