/// TO DO: remove this
/* eslint-disable no-console */

/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable lines-between-class-members */

import { BigNumber, Contract, ContractReceipt, ethers, providers, Signer } from 'ethers';
import { isUndefined } from 'lodash';
import axios from 'axios';
import { fetchVariableApy } from '../../services/fetchVariableApy';
import { MaxUint256Bn, TresholdApprovalBn } from '../../constants';
import { execSwap, getSwapResult, processSwapArguments } from '../../services/swap';
import { MintOrBurnParams, SwapPeripheryParams } from '../../types';
import { descale } from '../../utils/scaling';
import { getProtocolPrefix, getTokenInfo } from '../../services/getTokenInfo';
import { getSlippage } from '../../services/getSlippage';
import { AMMConstructorArgs, InfoPostMintOrBurn, InfoPostSwap } from './types';

import {
  BaseRateOracleABI,
  FactoryABI,
  IERC20MinimalABI,
  MarginEngineABI,
  PeripheryABI,
  VammABI,
} from '../../ABIs';
import { execApprove } from '../../services/approve';
import { getAdditionalMargin } from '../../services/getAdditionalMargin';
import {
  execMintOrBurn,
  getMintOrBurnResult,
  processMintOrBurnArguments,
} from '../../services/mintOrBurn';
import { getMaxAvailableNotional } from '../../services/getMaxAvailableNotional';

const geckoEthToUsd = async (): Promise<number> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const data = await axios.get(
        `https://pro-api.coingecko.com/api/v3/simple/price?x_cg_pro_api_key=${process.env.REACT_APP_COINGECKO_API_KEY}&ids=ethereum&vs_currencies=usd`,
      );
      return data.data.ethereum.usd;
    } catch (error) {
      console.error(`Failed to fetch ETH-USD price. ${error}`);
    }
  }
  return 0;
};

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
  public readonly isETH: boolean;

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

  public prices?: {
    ethToUsd: number;
  };

  public variableApy?: number;

  public ammInitialized = false;

  // user specific information
  public writeContracts?: {
    periphery: Contract;
    token: Contract;
  };

  public signer?: Signer;
  public userAddress?: string;

  public walletBalances?: {
    underlyingToken: number;
  };

  public approvals?: {
    underlyingToken: boolean;
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
    this.isETH = this.tokenName === 'ETH';

    this.termStartTimestamp = args.termStartTimestamp;
    this.termEndTimestamp = args.termEndTimestamp;

    this.tick = args.tick;
    this.tickSpacing = args.tickSpacing;
  }

  // general information loader
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

    // GRAPH: possibility to load it from the graph
    const peripheryAddress = await factoryContract.periphery();

    this.readOnlyContracts = {
      factory: factoryContract,
      periphery: new ethers.Contract(peripheryAddress, PeripheryABI, this.provider),
      vamm: new ethers.Contract(this.vammAddress, VammABI, this.provider),
      marginEngine: new ethers.Contract(this.marginEngineAddress, MarginEngineABI, this.provider),
      rateOracle: new ethers.Contract(this.rateOracleAddress, BaseRateOracleABI, this.provider),
      token: new ethers.Contract(this.underlyingTokenAddress, IERC20MinimalABI, this.provider),
    };

    // refresh information
    await this.refreshVariableApy();
    await this.refreshPrices();

    this.ammInitialized = true;
  };

  // user information loader
  userInit = async (signer: Signer): Promise<void> => {
    this.signer = signer;

    if (this.userInitialized) {
      console.log('The user is already initialized');
      return;
    }

    if (!this.ammInitialized) {
      console.log('The amm should be initialized first');
      return;
    }

    if (isUndefined(this.readOnlyContracts)) {
      throw new Error('Uninitialized contracts.');
    }

    this.userAddress = await this.signer.getAddress();
    console.log('user address', this.userAddress);

    this.writeContracts = {
      periphery: new ethers.Contract(
        this.readOnlyContracts.periphery.address,
        PeripheryABI,
        this.signer,
      ),
      token: new ethers.Contract(
        this.readOnlyContracts.token.address,
        IERC20MinimalABI,
        this.signer,
      ),
    };

    console.log('write contracts ready');

    await this.refreshWalletBalances();
    console.log('user balances refreshed', this.walletBalances);
    await this.refreshApprovals();
    console.log('user approvals refreshed', this.approvals);

    this.userInitialized = true;
  };

  // underlying token name (e.g. USDC)
  public get tokenName(): string {
    return getTokenInfo(this.underlyingTokenAddress).name;
  }

  // underlying token decimals (e.g. 6)
  public get tokenDecimals(): number {
    return getTokenInfo(this.underlyingTokenAddress).decimals;
  }

  // protocol name (e.g. aUSDC)
  public get protocol(): string {
    if (isUndefined(this.rateOracleID)) {
      return '-';
    }

    const prefix = getProtocolPrefix(this.rateOracleID);

    return `${prefix}${this.tokenName}`;
  }

  // Fixed APR of the VAMM
  refreshFixedApr = async (): Promise<void> => {
    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    this.tick = (await this.readOnlyContracts.vamm.vammVars())[1];
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

  // token prices
  refreshPrices = async (): Promise<void> => {
    try {
      const ethToUsd = await geckoEthToUsd();
      this.prices = {
        ethToUsd,
      };
    } catch (error) {
      console.error(`Failing to fetch coinGecko prices. ${error}`);
      this.prices = {
        ethToUsd: 0,
      };
    }
  };

  // approvals
  refreshApprovals = async (): Promise<void> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.userAddress)) {
      this.approvals = {
        underlyingToken: false,
      };
      return;
    }

    const allowance = await this.readOnlyContracts.token.allowance(
      this.userAddress,
      this.readOnlyContracts.periphery.address,
    );

    this.approvals = {
      underlyingToken: allowance.gte(TresholdApprovalBn),
    };
  };

  // balances
  refreshWalletBalances = async (): Promise<void> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.userAddress) ||
      isUndefined(this.provider)
    ) {
      this.walletBalances = {
        underlyingToken: 0,
      };
      return;
    }

    const balance = this.isETH
      ? await this.provider.getBalance(this.userAddress)
      : await this.readOnlyContracts.token.balanceOf(this.userAddress);

    this.walletBalances = {
      underlyingToken: descale(balance, this.tokenDecimals),
    };
  };

  // position information
  getPositionMargin = async ({
    tickLower,
    tickUpper,
  }: {
    tickLower: number;
    tickUpper: number;
  }): Promise<number> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.userAddress)) {
      return 0;
    }

    const positionInformation = await this.readOnlyContracts.marginEngine.callStatic.getPosition(
      this.userAddress,
      tickLower,
      tickUpper,
    );
    return descale(positionInformation.margin, this.tokenDecimals);
  };

  // approve operation
  approve = async (): Promise<ContractReceipt | undefined> => {
    if (isUndefined(this.writeContracts) || isUndefined(this.readOnlyContracts)) {
      return;
    }

    const receipt = await execApprove({
      token: this.writeContracts.token,
      args: {
        amount: MaxUint256Bn,
        spender: this.readOnlyContracts.periphery.address,
      },
    });

    // refresh state
    try {
      await this.refreshApprovals();
    } catch (error) {
      console.error(`Failed to refresh wallet balances. ${error}`);
    }

    return receipt;
  };

  // swap information
  getSwapInfo = async (args: {
    isFT: boolean;
    notional: number;
    fixedLow: number;
    fixedHigh: number;
  }): Promise<InfoPostSwap | undefined> => {
    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    // process arguments
    const processedArgs = processSwapArguments({
      ...args,
      margin: 0,
      tickSpacing: this.tickSpacing,
      tokenDecimals: this.tokenDecimals,
    });

    console.log('processed args:', processedArgs);

    // get swap results
    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngine: this.marginEngineAddress,
      isFT: args.isFT,
      notional: processedArgs.notional,
      marginDelta: 0,
      tickLower: processedArgs.tickLower,
      tickUpper: processedArgs.tickUpper,
      sqrtPriceLimitX96: 0,
    };

    console.log('swap periphery params:', swapPeripheryParams);

    const results = await getSwapResult({
      periphery: this.readOnlyContracts.periphery,
      args: swapPeripheryParams,
      tokenDecimals: this.tokenDecimals,
    });

    console.log('Swap Results:', results);

    // slippage
    const slippage = getSlippage(this.tick, results.tick);

    console.log('Slippage:', slippage);

    // additional margin
    const additionalMargin = getAdditionalMargin({
      requiredMargin: results.marginRequirement,
      currentMargin: await this.getPositionMargin(processedArgs),
      fee: results.fee,
    });

    // get max available notional
    let maxAvailableNotional: number | undefined;
    try {
      maxAvailableNotional = await getMaxAvailableNotional({
        periphery: this.readOnlyContracts.periphery,
        marginEngineAddress: this.readOnlyContracts.marginEngine.address,
        isFT: args.isFT,
        tokenDecimals: this.tokenDecimals,
      });
    } catch (error) {
      console.error(`Unable to get maximum available notional. ${error}`);
    }

    // return information
    return {
      ...results,
      marginRequirement: additionalMargin,
      slippage,
      maxAvailableNotional,
    };
  };

  // swap operation
  swap = async (args: {
    isFT: boolean;
    notional: number;
    margin: number;
    fixedLow: number;
    fixedHigh: number;
    force?: {
      fullCollateralisation?: boolean;
    };
  }): Promise<ContractReceipt | undefined> => {
    if (isUndefined(this.writeContracts) || isUndefined(this.readOnlyContracts)) {
      return;
    }

    // process arguments
    const processedArgs = processSwapArguments({
      ...args,
      tickSpacing: this.tickSpacing,
      tokenDecimals: this.tokenDecimals,
    });

    console.log('Processed Swap Args:', processedArgs);

    // build parameters of the transaction
    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngine: this.marginEngineAddress,
      isFT: args.isFT,
      notional: processedArgs.notional,
      marginDelta: this.isETH ? 0 : processedArgs.margin,
      tickLower: processedArgs.tickLower,
      tickUpper: processedArgs.tickUpper,
      sqrtPriceLimitX96: 0,
    };

    console.log('Swap Periphery Parameters:', swapPeripheryParams);

    // get variable factor in the case where the swap is fully collateralised
    let fullCollateralisation: { variableFactor: BigNumber } | undefined;

    if (!isUndefined(args.force) && !isUndefined(args.force.fullCollateralisation)) {
      if (args.force.fullCollateralisation) {
        fullCollateralisation = {
          variableFactor: await this.readOnlyContracts.rateOracle.variableFactorNoCache(
            this.termStartTimestamp,
            this.termEndTimestamp,
          ),
        };
      }
    }

    console.log('Full Collateralisation:', fullCollateralisation);

    // execute the swap and return the receipt
    const receipt = await execSwap({
      periphery: this.writeContracts.periphery,
      args: swapPeripheryParams,
      ethDeposit: this.isETH ? processedArgs.margin : undefined,
      fullCollateralisation,
    });

    // refresh state
    try {
      await this.refreshFixedApr();
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh information post swap. ${error}`);
    }

    return receipt;
  };

  // mint (or burn) information
  getMintOrBurnInfo = async (args: {
    isMint: boolean;
    notional: number;
    fixedLow: number;
    fixedHigh: number;
  }): Promise<InfoPostMintOrBurn | undefined> => {
    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    // process arguments
    const processedArgs = processMintOrBurnArguments({
      ...args,
      margin: 0,
      tickSpacing: this.tickSpacing,
      tokenDecimals: this.tokenDecimals,
    });

    console.log('processed arguments:', processedArgs);

    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.readOnlyContracts.marginEngine.address,
      isMint: args.isMint,
      tickLower: processedArgs.tickLower,
      tickUpper: processedArgs.tickUpper,
      notional: processedArgs.notional,
      marginDelta: 0,
    };

    console.log('mint or burn params:', mintOrBurnParams);

    const results = await getMintOrBurnResult({
      periphery: this.readOnlyContracts.periphery,
      args: mintOrBurnParams,
      tokenDecimals: this.tokenDecimals,
    });

    console.log('results', results);

    // additional margin
    const additionalMargin = getAdditionalMargin({
      requiredMargin: results.marginRequirement,
      currentMargin: await this.getPositionMargin(processedArgs),
      fee: 0,
    });

    return {
      marginRequirement: additionalMargin,
    };
  };

  // mint or burn operations
  mintOrBurn = async (args: {
    isMint: boolean;
    notional: number;
    margin: number;
    fixedLow: number;
    fixedHigh: number;
  }): Promise<ContractReceipt | undefined> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.writeContracts)) {
      return;
    }

    // process arguments
    const processedArgs = processMintOrBurnArguments({
      ...args,
      tickSpacing: this.tickSpacing,
      tokenDecimals: this.tokenDecimals,
    });

    console.log('processed args:', processedArgs);

    // for ETH pools: deposit in ETH, withdrawals in WETH
    // for non-ETH pools: both in underlying token
    const [ethDeposit, erc20Deposit] =
      processedArgs.margin.gt(0) && this.isETH
        ? [processedArgs.margin, 0]
        : [undefined, processedArgs.margin];

    const mintOrBurnParams: MintOrBurnParams = {
      marginEngine: this.readOnlyContracts.marginEngine.address,
      isMint: args.isMint,
      tickLower: processedArgs.tickLower,
      tickUpper: processedArgs.tickUpper,
      notional: processedArgs.notional,
      marginDelta: erc20Deposit,
    };

    console.log('mint or burn params:', mintOrBurnParams);

    // execute the swap and return the receipt
    const receipt = await execMintOrBurn({
      periphery: this.writeContracts.periphery,
      args: mintOrBurnParams,
      ethDeposit,
    });

    // refresh state
    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh information post swap. ${error}`);
    }

    return receipt;
  };
}

export default AMM;
