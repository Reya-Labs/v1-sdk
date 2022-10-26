/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable lines-between-class-members */

import {
  BigNumber,
  BigNumberish,
  Contract,
  ContractReceipt,
  ethers,
  providers,
  Signer,
} from 'ethers';
import { isUndefined } from 'lodash';
import axios from 'axios';
import { fetchVariableApy } from '../../services/fetchVariableApy';
import { MaxUint256Bn, TresholdApprovalBn, WAD } from '../../constants';
import {
  execSwap,
  getSwapResult,
  processSwapArguments,
  UserSwapArgs,
  UserSwapInfoArgs,
} from '../../flows/swap';
import { descale, scale } from '../../utils/scaling';
import { getProtocolPrefix, getTokenInfo } from '../../services/getTokenInfo';
import { getSlippage } from '../../services/getSlippage';
import { AMMConstructorArgs, MintOrBurnInfo, SwapInfo } from './types';

import {
  BaseRateOracleABI,
  FactoryABI,
  IERC20MinimalABI,
  MarginEngineABI,
  PeripheryABI,
  VammABI,
} from '../../ABIs';
import { execApprove } from '../../flows/approve';
import { getAdditionalMargin } from '../../services/getAdditionalMargin';
import {
  execMintOrBurn,
  getMintOrBurnResult,
  processMintOrBurnArguments,
  UserMintOrBurnArgs,
  UserMintOrBurnInfoArgs,
} from '../../flows/mintOrBurn';
import { getMaxAvailableNotional } from '../../services/getMaxAvailableNotional';
import {
  execUpdateMargin,
  processUpdateMarginArgumests,
  UserUpdateMarginArgs,
} from '../../flows/updateMargin';
import { execSettle, processSettleArguments, UserSettleArgs } from '../../flows/settle';
import { getTicks } from '../../services/getTicks';
import {
  execRolloverWithSwap,
  processRolloverWithSwapArguments,
  UserRolloverWithSwapArgs,
} from '../../flows/rolloverWithSwap';
import {
  execRolloverWithMint,
  processRolloverWithMintArguments,
  UserRolloverWithMintArgs,
} from '../../flows/rolloverWithMint';
import { addSwapsToCashflowInfo } from '../../services/getAccruedCashflow';

// OPTIMISATION: when we call functions that might affect position (e.g. swap),
// it'd be great to pass the Position object in order to get information (e.g. position margin)
// or to refresh position information (e.g. margin refresher)

// TODO: trim the ABIs if the size is too large
// TODO: enforce types of the subgraph responses

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

  public readonly termStartTimestampWad: BigNumber;
  public readonly termEndTimestampWad: BigNumber;

  public readonly rateOracleID: number;
  public readonly isETH: boolean;

  public tick: number;
  public readonly tickSpacing: number;
  public readonly tickFormat: ([fixedLow, fixedHigh]: [number, number]) => [number, number];
  public readonly tokenScaler: (amount: number) => BigNumber;
  public readonly tokenDescaler: (amount: BigNumberish) => number;

  // loading state
  // 0: uninitized
  // 1: amm general information loaded
  // 2: user general information loaded
  // 3: write functionalities loaded
  public ammInitialized: 0 | 1 | 2 | 3 = 0;

  // general information
  public readOnlyContracts?: {
    factory: Contract;
    periphery: Contract;
    vamm: Contract;
    marginEngine: Contract;
    rateOracle: Contract;
    token: Contract;
  };

  public priceInUsd = 0;

  public variableApy: number;

  public latestBlockTimestamp: number;

  // user specific information
  private writeContracts?: {
    periphery: Contract;
    token: Contract;
  };

  public userAddress?: string;

  public walletBalance = 0;

  public approval = false;

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

    this.termStartTimestampWad = args.termStartTimestampWad;
    this.termEndTimestampWad = args.termEndTimestampWad;

    this.tick = args.tick;
    this.tickSpacing = args.tickSpacing;
    this.tickFormat = getTicks(this.tickSpacing);

    this.tokenScaler = scale(this.tokenDecimals);
    this.tokenDescaler = descale(this.tokenDecimals);

    this.variableApy = 0;
    this.priceInUsd = 0;
    this.latestBlockTimestamp = 0;
    this.walletBalance = 0;
    this.approval = false;
  }

  // general information loader
  private ammInit = async (): Promise<void> => {
    if (this.ammInitialized >= 1 || isUndefined(this.provider)) {
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
    await this.refreshTimestamp();

    this.ammInitialized = 1;
  };

  // user general information loader
  private userGeneralInformationInit = async (userAddress: string): Promise<void> => {
    if (this.ammInitialized >= 2 || isUndefined(this.readOnlyContracts)) {
      return;
    }

    this.userAddress = userAddress;

    await this.refreshWalletBalances();
    await this.refreshApprovals();

    this.ammInitialized = 2;
  };

  // user write functionalities loader
  private userWriteFunctionalitiesInit = async (signer: Signer): Promise<void> => {
    if (this.ammInitialized >= 3 || isUndefined(this.readOnlyContracts)) {
      return;
    }

    this.writeContracts = {
      periphery: new ethers.Contract(
        this.readOnlyContracts.periphery.address,
        PeripheryABI,
        signer,
      ),
      token: new ethers.Contract(this.readOnlyContracts.token.address, IERC20MinimalABI, signer),
    };

    this.ammInitialized = 3;
  };

  init = async (signer?: Signer | string): Promise<void> => {
    if (isUndefined(signer)) {
      await this.ammInit();
    } else {
      if (typeof signer === 'string') {
        await this.ammInit();
        await this.userGeneralInformationInit(signer);
      } else {
        await this.ammInit();
        const userAddress = await signer.getAddress();
        await this.userGeneralInformationInit(userAddress);
        await this.userWriteFunctionalitiesInit(signer);
      }
    }
  };

  // timestamps
  public get termStartTimestamp(): number {
    return Number(ethers.utils.formatUnits(this.termStartTimestampWad.toString(), 18));
  }

  public get termEndTimestamp(): number {
    return Number(ethers.utils.formatUnits(this.termEndTimestampWad.toString(), 18));
  }

  // latest block timestamp
  public async refreshTimestamp(): Promise<void> {
    if (isUndefined(this.provider)) {
      return;
    }

    const latestBlock = await this.provider.getBlock((await this.provider.getBlockNumber()) - 2);
    this.latestBlockTimestamp = latestBlock.timestamp;
  }

  // is this pool matured?
  public get matured(): boolean {
    const latestTimestampWad = BigNumber.from(this.latestBlockTimestamp).mul(WAD);
    return latestTimestampWad.gt(this.termEndTimestampWad);
  }

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

  // get value of the underlying token in USD
  public amountInUSD(amount: number): number {
    return this.priceInUsd * amount;
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
    if (!this.isETH) {
      this.priceInUsd = 1;
      return;
    }
    try {
      const ethToUsd = await geckoEthToUsd();
      this.priceInUsd = ethToUsd;
    } catch (error) {
      console.error(`Failing to fetch coinGecko prices. ${error}`);
      this.priceInUsd = 0;
    }
  };

  // approvals
  refreshApprovals = async (): Promise<void> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.userAddress)) {
      this.approval = false;
      return;
    }

    const allowance = await this.readOnlyContracts.token.allowance(
      this.userAddress,
      this.readOnlyContracts.periphery.address,
    );

    this.approval = allowance.gte(TresholdApprovalBn);
  };

  // balances
  refreshWalletBalances = async (): Promise<void> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.userAddress) ||
      isUndefined(this.provider)
    ) {
      this.walletBalance = 0;
      return;
    }

    const balance = this.isETH
      ? await this.provider.getBalance(this.userAddress)
      : await this.readOnlyContracts.token.balanceOf(this.userAddress);

    this.walletBalance = this.tokenDescaler(balance);
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
    return this.tokenDescaler(positionInformation.margin);
  };

  // approve operation
  approve = async (): Promise<ContractReceipt | undefined> => {
    if (isUndefined(this.writeContracts) || isUndefined(this.readOnlyContracts)) {
      return;
    }

    const receipt = await execApprove({
      token: this.writeContracts.token,
      params: {
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
  getSwapInfo = async (args: UserSwapInfoArgs): Promise<SwapInfo | undefined> => {
    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    const { swapParams } = processSwapArguments({
      ...args,
      marginErc20: 0,
      marginEth: undefined,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    const results = await getSwapResult({
      periphery: this.readOnlyContracts.periphery,
      params: swapParams,
      tokenDescaler: this.tokenDescaler,
    });

    // slippage
    const slippage = getSlippage(this.tick, results.tick);

    // additional margin
    const additionalMargin = getAdditionalMargin({
      requiredMargin: results.marginRequirement,
      currentMargin: await this.getPositionMargin(swapParams),
      fee: results.fee,
    });

    // get max available notional
    let maxAvailableNotional: number | undefined;
    try {
      maxAvailableNotional = await getMaxAvailableNotional({
        periphery: this.readOnlyContracts.periphery,
        marginEngineAddress: this.readOnlyContracts.marginEngine.address,
        isFT: args.isFT,
        tokenScaler: this.tokenScaler,
        tokenDescaler: this.tokenDescaler,
      });
    } catch (error) {
      console.error(`Unable to get maximum available notional. ${error}`);
    }

    await this.refreshTimestamp();
    const cashflowInfo = await addSwapsToCashflowInfo({
      info: args.position?._cashflowInfo,
      swaps: [
        {
          notional: results.variableTokenDelta,
          time: this.latestBlockTimestamp,
          avgFixedRate: Math.abs(
            results.fixedTokenDeltaUnbalanced / results.variableTokenDelta / 100,
          ),
        },
      ],
      rateOracle: this.readOnlyContracts.rateOracle,
      currentTime: this.latestBlockTimestamp,
      endTime: this.termEndTimestamp,
    });

    // return information
    return {
      ...results,
      marginRequirement: additionalMargin,
      slippage,
      maxAvailableNotional,
      estimatedPnL: (predictedAPY: number) => {
        const result = cashflowInfo.estimatedFutureCashflow(predictedAPY);
        return result.fixed + result.variable;
      },
    };
  };

  // swap operation
  swap = async (args: UserSwapArgs): Promise<ContractReceipt | undefined> => {
    if (isUndefined(this.writeContracts) || isUndefined(this.readOnlyContracts)) {
      return;
    }

    // for ETH pools: deposit in ETH, withdrawals in WETH
    // for non-ETH pools: both in underlying token
    const [marginEth, marginErc20]: [number | undefined, number] =
      args.margin > 0 && this.isETH ? [args.margin, 0] : [undefined, args.margin];

    // process arguments
    const { swapParams, ethDeposit } = processSwapArguments({
      ...args,
      marginErc20,
      marginEth,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // get variable factor in the case where the swap is fully collateralised
    let fullCollateralisation: { variableFactor: BigNumber } | undefined;

    if (!isUndefined(args.force) && !isUndefined(args.force.fullCollateralisation)) {
      if (args.force.fullCollateralisation) {
        fullCollateralisation = {
          variableFactor: await this.readOnlyContracts.rateOracle.variableFactorNoCache(
            this.termStartTimestampWad,
            this.termEndTimestampWad,
          ),
        };
      }
    }

    // execute the swap and return the receipt
    const receipt = await execSwap({
      periphery: this.writeContracts.periphery,
      params: swapParams,
      ethDeposit,
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
  getMintOrBurnInfo = async (args: UserMintOrBurnInfoArgs): Promise<MintOrBurnInfo | undefined> => {
    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    // process arguments
    const { mintOrBurnParams } = processMintOrBurnArguments({
      ...args,
      marginErc20: 0,
      marginEth: undefined,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    const results = await getMintOrBurnResult({
      periphery: this.readOnlyContracts.periphery,
      params: mintOrBurnParams,
      tokenDescaler: this.tokenDescaler,
    });

    // additional margin
    const additionalMargin = getAdditionalMargin({
      requiredMargin: results.marginRequirement,
      currentMargin: await this.getPositionMargin(mintOrBurnParams),
      fee: 0,
    });

    return {
      marginRequirement: additionalMargin,
    };
  };

  // mint or burn operations
  mintOrBurn = async (args: UserMintOrBurnArgs): Promise<ContractReceipt | undefined> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.writeContracts)) {
      return;
    }

    // for ETH pools: deposit in ETH, withdrawals in WETH
    // for non-ETH pools: both in underlying token
    const [marginEth, marginErc20]: [number | undefined, number] =
      args.margin > 0 && this.isETH ? [args.margin, 0] : [undefined, args.margin];

    // process arguments
    const { mintOrBurnParams, ethDeposit } = processMintOrBurnArguments({
      ...args,
      marginErc20,
      marginEth,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // execute the swap and return the receipt
    const receipt = await execMintOrBurn({
      periphery: this.writeContracts.periphery,
      params: mintOrBurnParams,
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

  // update margin operation
  public updateMargin = async (
    args: UserUpdateMarginArgs,
  ): Promise<ContractReceipt | undefined> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.writeContracts)) {
      return;
    }

    // for ETH pools: deposit in ETH, withdrawals in WETH
    // for non-ETH pools: both in underlying token
    const [marginEth, marginErc20]: [number | undefined, number] =
      args.margin > 0 && this.isETH ? [args.margin, 0] : [undefined, args.margin];

    // process arguments
    const { updateMarginParams, ethDeposit } = processUpdateMarginArgumests({
      ...args,
      marginErc20,
      marginEth,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // execute the operation and get the receipt
    const receipt = await execUpdateMargin({
      periphery: this.writeContracts.periphery,
      params: updateMarginParams,
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

  // settle position
  public settle = async (args: UserSettleArgs): Promise<ContractReceipt | undefined> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      return;
    }

    // process arguments
    const settleParams = processSettleArguments({
      ...args,
      owner: this.userAddress,
      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
    });

    const receipt = await execSettle({
      periphery: this.writeContracts.periphery,
      params: settleParams,
    });

    // refresh state
    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh information post swap. ${error}`);
    }

    return receipt;
  };

  // Rollover with swap
  // 1. It settles and withdraw the position associated with this AMM
  //    (of [userAddress, previousFixedLow, previousFixedHigh])
  // 2. It creates a swap in the next margin engine [NOT this AMM]
  //    (of [userAddress, fixedLow, fixedHigh])
  public async rolloverWithSwap(
    userArgs: UserRolloverWithSwapArgs,
  ): Promise<ContractReceipt | undefined> {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      return;
    }

    // process arguments for Rollover with Swap
    const { rolloverWithSwapParams, ethDeposit } = processRolloverWithSwapArguments({
      ...userArgs,
      previousMarginEngine: this.readOnlyContracts.marginEngine.address,
      owner: this.userAddress,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // execute operation
    const receipt = await execRolloverWithSwap({
      periphery: this.writeContracts.periphery,
      params: rolloverWithSwapParams,
      ethDeposit,
    });

    // refresh state
    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh information post swap. ${error}`);
    }

    return receipt;
  }

  // Rollover with mint
  // 1. It settles and withdraw the position associated with this AMM
  //    (of [userAddress, previousFixedLow, previousFixedHigh])
  // 2. It creates a mint in the next margin engine [NOT this AMM]
  //    (of [userAddress, fixedLow, fixedHigh])
  public async rolloverWithMint(
    userArgs: UserRolloverWithMintArgs,
  ): Promise<ContractReceipt | undefined> {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      return;
    }

    // process arguments for Rollover with Mint
    const { rolloverWithMintParams, ethDeposit } = processRolloverWithMintArguments({
      ...userArgs,
      previousMarginEngine: this.readOnlyContracts.marginEngine.address,
      owner: this.userAddress,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // execute operation
    const receipt = await execRolloverWithMint({
      periphery: this.writeContracts.periphery,
      params: rolloverWithMintParams,
      ethDeposit,
    });

    // refresh state
    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh information post swap. ${error}`);
    }

    return receipt;
  }
}

export default AMM;
