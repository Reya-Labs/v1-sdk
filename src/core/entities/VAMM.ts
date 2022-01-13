import { DateTime } from 'luxon';
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

export type VAMMArgs = {
  address: string;
  rateOracle: string;
  underlying: string;
  startDate: DateTime;
  endDate: DateTime;
};

class VAMM implements Partial<VoltzVAMM>, VAMMArgs {
  address: string;

  rateOracle: string;

  underlying: string;

  startDate: DateTime;

  endDate: DateTime;

  signer: ethers.Signer;

  contract: ethers.Contract;

  constructor(
    { address, rateOracle, underlying, startDate, endDate }: VAMMArgs,
    signer: ethers.Signer,
  ) {
    this.address = address;
    this.rateOracle = rateOracle;
    this.underlying = underlying;
    (this.startDate = startDate), (this.endDate = endDate);
    this.signer = signer;
    this.contract = new ethers.Contract(this.address, VAMMContract.abi, this.signer);
  }

  async swap(
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

  async mint(
    recipient: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    amount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction> {
    return this.contract.mint(recipient, tickLower, tickUpper, amount, overrides);
  }

  async burn(
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    amount: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> },
  ): Promise<ContractTransaction> {
    return this.contract.burn(tickLower, tickUpper, amount, overrides);
  }
}

export default VAMM;
