/// TO DO: remove this
/* eslint-disable no-console */

/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable lines-between-class-members */

import { BigNumber, Contract, ContractReceipt, ethers, providers } from 'ethers';
import { isUndefined } from 'lodash';
import axios from 'axios';
import { fetchVariableApy } from '../../services/fetchVariableApy';
import { TresholdApprovalBn } from '../../constants';
import { execSwap, getSwapResult, processSwapArguments } from '../../services/swap';
import { InfoPostSwap, SwapPeripheryParams } from '../../types';
import { descale, scale } from '../../utils/scaling';
import { getProtocolPrefix, getTokenInfo } from '../../services/getTokenInfo';
import { getSlippage } from '../../services/getSlippage';
import { getAvgFixedRate } from '../../services/getAvgFixedRate';
import { AMMConstructorArgs } from './types';

const geckoEthToUsd = async (): Promise<number> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const data = await axios.get(
        `https://pro-api.coingecko.com/api/v3/simple/price?x_cg_pro_api_key=${process.env.REACT_APP_COINGECKO_API_KEY}&ids=ethereum&vs_currencies=usd`,
      );
      return data.data.ethereum.usd;
    } catch (error) {
      console.error(`Failed to fetch ETH-USD price. Raw error: ${error}`);
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
  };

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
    await this.refreshFixedApr();
    await this.refreshVariableApy();
    await this.refreshPrices();

    this.ammInitialized = true;
  };

  // underlying token name (e.g. USDC)
  public get tokenName(): string {
    if (isUndefined(this.readOnlyContracts)) {
      return '-';
    }

    return getTokenInfo(this.underlyingTokenAddress).name;
  }

  // underlying token decimals (e.g. 6)
  public get tokenDecimals(): number {
    if (isUndefined(this.readOnlyContracts)) {
      return 18;
    }

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

  // token prices
  refreshPrices = async (): Promise<void> => {
    const ethToUsd = await geckoEthToUsd();
    this.prices = {
      ethToUsd,
    };
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
  }): Promise<ContractReceipt | void> => {
    // process arguments
    const processedArgs = processSwapArguments({
      ...args,
      tickSpacing: this.tickSpacing,
      tokenDecimals: this.tokenDecimals,
    });

    console.log('Processed Swap Args:', processedArgs);

    if (isUndefined(this.writeContracts) || isUndefined(this.readOnlyContracts)) {
      return;
    }

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
          variableFactor: this.readOnlyContracts.rateOracle.variableFactorNoCache(
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

    return receipt;
  };

  getSwapInfo = async (args: {
    isFT: boolean;
    notional: number;
    fixedLow: number;
    fixedHigh: number;
  }): Promise<InfoPostSwap | void> => {
    // process arguments
    const processedArgs = processSwapArguments({
      ...args,
      margin: 0,
      tickSpacing: this.tickSpacing,
      tokenDecimals: this.tokenDecimals,
    });

    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    // get swap results
    const swapPeripheryParams: SwapPeripheryParams = {
      marginEngine: this.marginEngineAddress,
      isFT: args.isFT,
      notional: processedArgs.notional,
      marginDelta: this.isETH ? 0 : processedArgs.margin,
      tickLower: processedArgs.tickLower,
      tickUpper: processedArgs.tickUpper,
      sqrtPriceLimitX96: 0,
    };

    const results = await getSwapResult({
      periphery: this.readOnlyContracts.periphery,
      args: swapPeripheryParams,
      ethDeposit: this.isETH ? processedArgs.margin : undefined,
    });

    console.log('Swap Results:', results.toString());

    // slippage
    const slippage = getSlippage(this.tick, results.tick);

    console.log('Slippage:', slippage);

    // average fixed rate
    const avgFixedRate = getAvgFixedRate(
      results.fixedTokenDeltaUnbalanced,
      results.availableNotional,
    );

    console.log('Average fixed rate:', avgFixedRate);

    // simulate large swap to get the maximum available notional
    let maxAvailableNotional: BigNumber | undefined;
    try {
      const fullSwapPeripheryParams: SwapPeripheryParams = {
        marginEngine: this.marginEngineAddress,
        isFT: args.isFT,
        notional: scale(1000000000000000, this.tokenDecimals),
        marginDelta: 0,
        tickLower: processedArgs.tickLower,
        tickUpper: processedArgs.tickUpper,
        sqrtPriceLimitX96: 0,
      };

      const fullSwapResults = await getSwapResult({
        periphery: this.readOnlyContracts.periphery,
        args: fullSwapPeripheryParams,
      });

      console.log('Full Swap Results:', fullSwapResults);

      maxAvailableNotional = fullSwapResults.availableNotional;
    } catch (error) {
      console.error(`Unable to get maximum available notional. Raw error: ${error}`);
    }

    // return information
    return {
      marginRequirement: descale(results.marginRequirement, this.tokenDecimals),
      availableNotional: Math.abs(descale(results.availableNotional, this.tokenDecimals)),
      fee: descale(results.fee, this.tokenDecimals),
      slippage,
      averageFixedRate: avgFixedRate,
      fixedTokenDeltaBalance: descale(results.fixedTokenDelta, this.tokenDecimals),
      variableTokenDeltaBalance: descale(results.availableNotional, this.tokenDecimals),
      fixedTokenDeltaUnbalanced: descale(results.fixedTokenDeltaUnbalanced, this.tokenDecimals),
      maxAvailableNotional: isUndefined(maxAvailableNotional)
        ? undefined
        : descale(maxAvailableNotional, this.tokenDecimals),
    };
  };
}

export default AMM;
