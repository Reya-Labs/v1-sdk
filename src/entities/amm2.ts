/* eslint-disable lines-between-class-members */
import { BigNumber, Contract, ethers, providers, Signer } from 'ethers';
import { isUndefined } from 'lodash';
import { fetchVariableApy } from '../services2/fetchVariableApy';
import { descale } from '../utils2/scaling';
import { AMMConstructorArgs } from './types';

class AMM {
  // address of the underlying VAMM
  public readonly id: string;
  public readonly provider?: providers.Provider;

  public readonly factoryAddress: string;
  public readonly vammAddress: string;
  public readonly marginEngineAddress: string;
  public readonly rateOracleAddress: string;
  public readonly underlyingTokenAddress: string;

  public readonly termStartTimestamp: BigNumber;
  public readonly termEndTimestamp: BigNumber;

  public readonly rateOracleID: number;

  public tick: number;
  public readonly tickSpacing: number;

  // general information
  public readOnlyContracts?: {
    factory: Contract;
    periphery: Contract;
    vamm: Contract;
    marginEngine: Contract;
    rateOracle: Contract;
    token: Contract;
  };

  public variableApy?: number;

  public ammInitialized = false;

  // user specific information
  public writeContracts?: {
    periphery: Contract;
  };

  public userInitialized = false;

  public constructor(args: AMMConstructorArgs) {
    this.id = args.id;
    this.provider = args.provider;

    this.factoryAddress = args.factoryAddress;
    this.vammAddress = args.vammAddress;
    this.marginEngineAddress = args.marginEngineAddress;
    this.rateOracleAddress = args.rateOracleAddress;
    this.underlyingTokenAddress = args.underlyingTokenAddress;

    this.rateOracleID = args.rateOracleID;

    this.termStartTimestamp = args.termStartTimestamp;
    this.termEndTimestamp = args.termEndTimestamp;

    this.tick = args.tick;
    this.tickSpacing = args.tickSpacing;
  }

  ammInit = async (): Promise<void> => {
    if (this.ammInitialized) {
      console.log('The AMM is already initialized.');
      return;
    }

    if (isUndefined(this.provider)) {
      console.log('Stop here... No provider provided');
      return;
    }

    // fetch read-only contracts
    const factoryContract = new ethers.Contract(this.factoryAddress, FactoryABI, this.provider);

    const peripheryAddress = await factoryContract.periphery();

    this.readOnlyContracts = {
      factory: factoryContract,
      periphery: new ethers.Contract(peripheryAddress, PeripheryABI, this.provider),
      vamm: new ethers.Contract(this.vammAddress, VammABI, this.provider),
      marginEngine: new ethers.Contract(this.marginEngineAddress, MarginEngineABI, this.provider),
      rateOracle: new ethers.Contract(this.rateOracleAddress, BaseRateOracleABI, this.provider),
      token: new ethers.Contract(this.underlyingTokenAddress, IERC20MinimalABI, this.provider),
    };

    this.ammInitialized = true;
  };

  // Fixed APR of the VAMM
  refreshFixedApr = async (): Promise<void> => {
    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    this.tick = await this.readOnlyContracts.periphery.getCurrentTick(this.vammAddress);
  };

  public get fixedApr(): number {
    return 1.0001 ** -this.tick;
  }

  // Variable APY of the VAMM
  refreshVariableApy = async (): Promise<void> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.provider)) {
      return;
    }

    this.variableApy = await fetchVariableApy({
      rateOracle: this.readOnlyContracts.rateOracle,
      rateOracleID: this.rateOracleID,
      tokenAddress: this.readOnlyContracts.token.address,
      provider: this.provider,
    });
  };

  // scaling tools
}

export default AMM;
