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
} from 'ethers';
import { BytesLike } from '@ethersproject/bytes';
import { Listener, Provider } from '@ethersproject/providers';
import { FunctionFragment, EventFragment, Result } from '@ethersproject/abi';
import { VAMM as VoltzVAMM } from '@voltz/voltz-core';
import VAMMContract from '@voltz/voltz-core/artifacts/contracts/VAMM.sol/VAMM.json';

class VAMM implements Partial<VoltzVAMM> {
  address: string;

  signer: ethers.Signer;

  contract: ethers.Contract;

  constructor(address: string, signer: ethers.Signer) {
    this.address = address;
    this.signer = signer;
    this.contract = new ethers.Contract(this.address, VAMMContract.abi, this.signer);
  }

  swap(
    params: {
      recipient: string;
      isFT: boolean;
      amountSpecified: BigNumberish;
      sqrtPriceLimitX96: BigNumberish;
      isUnwind: boolean;
      isTrader: boolean;
    },
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction> {
    return this.contract.swap(params, overrides);
  }

  mint(
    recipient: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    amount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction> {
    return this.contract.mint(recipient, tickLower, tickUpper, amount, overrides);
  }

  burn(
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    amount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction> {
    return this.contract.burn(tickLower, tickUpper, amount, overrides);
  }
}

export default VAMM;
