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
import { Factory as VoltzFactory } from '@voltz/voltz-core';
import FactoryContract from '@voltz/voltz-core/artifacts/contracts/VAMM.sol/VAMM.json';

import VAMM from './VAMM';

class Factory implements Partial<VoltzFactory> {
  address: string;

  signer: ethers.Signer;

  contract: ethers.Contract;

  constructor(address: string, signer: ethers.Signer) {
    this.address = address;
    this.signer = signer;
    this.contract = new ethers.Contract(this.address, FactoryContract.abi, this.signer);
  }

  async getVAMMs(arg0: string, overrides?: CallOverrides): Promise<VAMM[]> {
    const vammMap = await this.getVAMMMap(arg0, overrides);

    // TODO: parse map result
    // getAMMMap[rateOracleId][underlyingToken][termStartTimestamp][termEndTimestamp]

    const address = '';
    const rateOracle = '';
    const underlying = '';
    const startDate = DateTime.now();
    const endDate = DateTime.now();

    return [new VAMM({ address, rateOracle, underlying, startDate, endDate }, this.signer)];
  }

  async getVAMMMap(arg0: string, overrides?: CallOverrides): Promise<string> {
    return this.contract.getVAMMMap(arg0, overrides);
  }
}

export default Factory;
