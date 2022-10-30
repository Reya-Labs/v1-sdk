/* eslint-disable import/no-extraneous-dependencies */

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

// functionality that tries to fetch the eth/usd price from CoinGecko
const geckoEthToUsd = async (coingeckoApiKey: string): Promise<number> => {
  const noOfAttempts = 5;
  for (let attempt = 0; attempt < noOfAttempts; attempt += 1) {
    try {
      const data = await axios.get(
        `https://pro-api.coingecko.com/api/v3/simple/price?x_cg_pro_api_key=${coingeckoApiKey}&ids=ethereum&vs_currencies=usd`,
      );
      return data.data.ethereum.usd;
    } catch (error) {
      console.error(
        `Failed to fetch ETH-USD price [attempt: ${attempt}/${noOfAttempts}]. ${error}`,
      );
    }
  }
  return 0;
};

export class AMM {
  // address of the underlying VAMM
  public readonly id: string;
  // JSON RPC provider
  public readonly provider?: providers.Provider;
  // coingecko premium API key
  private readonly coingeckoApiKey: string;

  // factory address of the protocol
  public readonly factoryAddress: string;
  // margin engine address of the underlying pool
  public readonly marginEngineAddress: string;
  // rate oracle address of the underlying pool
  public readonly rateOracleAddress: string;
  // underlying token address of the underlying pool
  public readonly underlyingTokenAddress: string;

  // start timestamp of the pool in wad (scaled by 1e18)
  public readonly termStartTimestampWad: BigNumber;
  // end timestamp of the pool in wad (scaled by 1e18)
  public readonly termEndTimestampWad: BigNumber;

  // rate oracle ID
  // 1 - Aave Lending
  // 2 - Compound Lending
  // 3 - Lido
  // 4 - Rocket
  // 5 - Aave Borrowing
  // 6 - Compound Borrowing
  public readonly rateOracleID: number;
  // flag set when the pool has WETH as underlying token
  public readonly isETH: boolean;

  // current tick of the pool
  public tick: number;
  // tick spacing of the pool
  public readonly tickSpacing: number;
  // functionality that format the fixed rates into appropriate ticks
  public readonly tickFormat: ([fixedLow, fixedHigh]: [number, number]) => [number, number];
  // functionality that multiplies the numbers by 10 ** tokenDecimals
  public readonly tokenScaler: (amount: number) => BigNumber;
  // functionality that divides the numbers by 10 ** tokenDecimals
  public readonly tokenDescaler: (amount: BigNumberish) => number;

  // functionality that wraps up the rate oracle apy getter
  public apyGenerator: (from: number, to: number) => Promise<number> = async () => 0;

  // loading state
  // 0: uninitized
  // 1: amm general information loaded
  // 2: user general information loaded
  // 3: write functionalities loaded
  public ammInitialized: 0 | 1 | 2 | 3 = 0;

  // read-only contracts (connected with provider)
  public readOnlyContracts?: {
    factory: Contract;
    periphery: Contract;
    vamm: Contract;
    marginEngine: Contract;
    rateOracle: Contract;
    token: Contract;
  };

  // this value is loaded from CoinGecko (or set to 1 if the underlying token is stable-coin)
  public priceInUsd = 0;

  // current variable apy of the underlying protocol
  public variableApy: number;

  // latest refereshed block timestamp
  public latestBlockTimestamp: number;

  // write contracts (connected with signer)
  private writeContracts?: {
    periphery: Contract;
    token: Contract;
  };

  // the address of the signer
  public userAddress?: string;

  // the wallet balance of the signer in the underlying token
  public walletBalance = 0;

  // flag set when the signer hass approved the underlying token to periphery
  public approval = false;

  // constructor of the AMM object
  public constructor(args: AMMConstructorArgs) {
    this.id = args.id;
    this.provider = args.provider;
    this.coingeckoApiKey = args.coingeckoApiKey;

    this.factoryAddress = args.factoryAddress;
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

  // GENERAL INFORMATION loader
  private ammInit = async (): Promise<void> => {
    // 0. check if the amm has not been initialized before and if the provider exists
    if (this.ammInitialized >= 1 || isUndefined(this.provider)) {
      return;
    }

    // 1. Fetch read-only contracts
    const factoryContract = new ethers.Contract(this.factoryAddress, FactoryABI, this.provider);

    const peripheryAddress = await factoryContract.periphery();

    this.readOnlyContracts = {
      factory: factoryContract,
      periphery: new ethers.Contract(peripheryAddress, PeripheryABI, this.provider),
      vamm: new ethers.Contract(this.id, VammABI, this.provider),
      marginEngine: new ethers.Contract(this.marginEngineAddress, MarginEngineABI, this.provider),
      rateOracle: new ethers.Contract(this.rateOracleAddress, BaseRateOracleABI, this.provider),
      token: new ethers.Contract(this.underlyingTokenAddress, IERC20MinimalABI, this.provider),
    };

    // 2. Build the APY generator around the rate oracle
    this.apyGenerator = async (from: number, to: number): Promise<number> => {
      if (isUndefined(this.readOnlyContracts)) {
        return 0;
      }
      return Number(descale(18)(await this.readOnlyContracts.rateOracle.getApyFromTo(from, to)));
    };

    // 3. Load the general information of the AMM
    await this.refreshVariableApy();
    await this.refreshPrices();
    await this.refreshTimestamp();

    // 4. Flag that the amm general information has been initialized
    this.ammInitialized = 1;
  };

  // USER INFORMATION loader
  private userGeneralInformationInit = async (userAddress: string): Promise<void> => {
    // 0. check that the general information loader has been successfully executed before
    if (this.ammInitialized >= 2 || isUndefined(this.readOnlyContracts)) {
      return;
    }

    // 1. Cache the connected user's address
    this.userAddress = userAddress;

    // 2. Load the user information
    await this.refreshWalletBalances();
    await this.refreshApprovals();

    // 3. Flag that the user general information has been initialized
    this.ammInitialized = 2;
  };

  // user write functionalities loader
  private userWriteFunctionalitiesInit = async (signer: Signer): Promise<void> => {
    // 0. check that the general information user loader has been successfully executed before
    if (this.ammInitialized >= 3 || isUndefined(this.readOnlyContracts)) {
      return;
    }

    // 1. Fetch write contracts
    this.writeContracts = {
      periphery: new ethers.Contract(
        this.readOnlyContracts.periphery.address,
        PeripheryABI,
        signer,
      ),
      token: new ethers.Contract(this.readOnlyContracts.token.address, IERC20MinimalABI, signer),
    };

    // 2. Flag that the write functionalities have been initialized
    this.ammInitialized = 3;
  };

  // external initializer
  init = async (signer?: Signer | string): Promise<void> => {
    if (isUndefined(signer)) {
      // case 1: signer is undefined -> load only the amm general information
      await this.ammInit();
    } else {
      // case 2: user address is passed -> load the amm and user general information
      if (typeof signer === 'string') {
        await this.ammInit();
        await this.userGeneralInformationInit(signer);
      } else {
        // case 3: signer is passed -> load the amm, user general information and user's write functionalities
        await this.ammInit();
        const userAddress = await signer.getAddress();
        await this.userGeneralInformationInit(userAddress);
        await this.userWriteFunctionalitiesInit(signer);
      }
    }
  };

  // timestamps (in seconds)
  public get termStartTimestamp(): number {
    return Number(ethers.utils.formatUnits(this.termStartTimestampWad.toString(), 18));
  }

  public get termEndTimestamp(): number {
    return Number(ethers.utils.formatUnits(this.termEndTimestampWad.toString(), 18));
  }

  // refresh latest block timestamp
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
  public getAmountInUSD(amount: number): number {
    return this.priceInUsd * amount;
  }

  // refresh fixed APR
  refreshFixedApr = async (): Promise<void> => {
    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    this.tick = (await this.readOnlyContracts.vamm.vammVars())[1];
  };

  // fixed APR getter
  public get fixedApr(): number {
    return 1.0001 ** -this.tick;
  }

  // refresh variable APY
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

  // refresh token prices
  refreshPrices = async (): Promise<void> => {
    if (!this.isETH) {
      this.priceInUsd = 1;
      return;
    }
    try {
      const ethToUsd = await geckoEthToUsd(this.coingeckoApiKey);
      this.priceInUsd = ethToUsd;
    } catch (error) {
      console.error(`Failing to fetch coinGecko prices. ${error}`);
      this.priceInUsd = 0;
    }
  };

  // refresh user's approvals
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

  // refresh user's wallet balances
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

  // get position real-time margin
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

  // approve [SMART CONTRACT CALL]
  approve = async (): Promise<ContractReceipt | undefined> => {
    // 0. Check if write functionalities are enabled
    if (isUndefined(this.writeContracts) || isUndefined(this.readOnlyContracts)) {
      return;
    }

    // 1. Execute the approve flow and get the receipt
    const receipt = await execApprove({
      token: this.writeContracts.token,
      params: {
        amount: MaxUint256Bn,
        spender: this.readOnlyContracts.periphery.address,
      },
    });

    // 2. Refresh the state that changes after operation
    try {
      await this.refreshApprovals();
    } catch (error) {
      console.error(`Failed to refresh approvals. ${error}`);
    }

    // 3. Return the receipt
    return receipt;
  };

  // get information about some potential swap
  getSwapInfo = async (args: UserSwapInfoArgs): Promise<SwapInfo | undefined> => {
    // 0. Check if the read-only contracts are loaded
    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    // 1. Build the parameters of the smart contract call
    const { swapParams } = processSwapArguments({
      ...args,
      marginErc20: 0,
      marginEth: undefined,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // 2. Get the results of the swap simulation
    const results = await getSwapResult({
      periphery: this.readOnlyContracts.periphery,
      params: swapParams,
      tokenDescaler: this.tokenDescaler,
    });

    // 3. Compute the slippage
    const slippage = getSlippage(this.tick, results.tick);

    // 4. Compute the additional margin
    const additionalMargin = getAdditionalMargin({
      requiredMargin: results.marginRequirement,
      currentMargin: await this.getPositionMargin(swapParams),
      fee: results.fee,
    });

    // 5. Simulate extremely large swap to get the maximum available notional of the pool
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

    // 6. Refresh provider timestamp and get the accrued cashflow information
    // of the position in the case this swap is executed

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
      apyGenerator: this.apyGenerator,
      currentTime: this.latestBlockTimestamp,
      endTime: this.termEndTimestamp,
    });

    // 7. Return the result
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

  // swap [SMART CONTRACT CALL]
  swap = async (args: UserSwapArgs): Promise<ContractReceipt | undefined> => {
    // 0. Check if write functionalities are enabled
    if (isUndefined(this.writeContracts) || isUndefined(this.readOnlyContracts)) {
      return;
    }

    // 1. Build the parameters of the smart contract call

    // for ETH pools: deposit in ETH, withdrawals in WETH
    // for non-ETH pools: both in underlying token
    const [marginEth, marginErc20]: [number | undefined, number] =
      args.margin > 0 && this.isETH ? [args.margin, 0] : [undefined, args.margin];

    const { swapParams, ethDeposit } = processSwapArguments({
      ...args,
      marginErc20,
      marginEth,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // 2. In the case when this swap is forced to be fully-collaterilased,
    // compute the variable factor and pass it to the execution

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

    // 3. Execute the swap flow and get the receipt
    const receipt = await execSwap({
      periphery: this.writeContracts.periphery,
      params: swapParams,
      ethDeposit,
      fullCollateralisation,
    });

    // 4. Refresh the state that changes after operation
    try {
      await this.refreshFixedApr();
    } catch (error) {
      console.error(`Failed to refresh fixed apr. ${error}`);
    }

    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh wallet balance. ${error}`);
    }

    // 5. Return the receipt
    return receipt;
  };

  // get information about some potential mint (or burn)
  getMintOrBurnInfo = async (args: UserMintOrBurnInfoArgs): Promise<MintOrBurnInfo | undefined> => {
    // 0. Check if the read-only contracts are loaded
    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    // 1. Build the parameters of the smart contract call
    const { mintOrBurnParams } = processMintOrBurnArguments({
      ...args,
      marginErc20: 0,
      marginEth: undefined,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // 2. Get the results of the swap simulation
    const results = await getMintOrBurnResult({
      periphery: this.readOnlyContracts.periphery,
      params: mintOrBurnParams,
      tokenDescaler: this.tokenDescaler,
    });

    // 3. Compute the additional margin
    const additionalMargin = getAdditionalMargin({
      requiredMargin: results.marginRequirement,
      currentMargin: await this.getPositionMargin(mintOrBurnParams),
      fee: 0,
    });

    // 4. Return the result
    return {
      marginRequirement: additionalMargin,
    };
  };

  // mint or burn [SMART CONTRACT CALL]
  mintOrBurn = async (args: UserMintOrBurnArgs): Promise<ContractReceipt | undefined> => {
    // 0. Check if write functionalities are enabled
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.writeContracts)) {
      return;
    }

    // 1. Build the parameters of the smart contract call

    // for ETH pools: deposit in ETH, withdrawals in WETH
    // for non-ETH pools: both in underlying token
    const [marginEth, marginErc20]: [number | undefined, number] =
      args.margin > 0 && this.isETH ? [args.margin, 0] : [undefined, args.margin];

    const { mintOrBurnParams, ethDeposit } = processMintOrBurnArguments({
      ...args,
      marginErc20,
      marginEth,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // 2. Execute the mint or burn flow and get the receipt
    const receipt = await execMintOrBurn({
      periphery: this.writeContracts.periphery,
      params: mintOrBurnParams,
      ethDeposit,
    });

    // 3. Refresh the state that changes after operation
    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh wallet balance. ${error}`);
    }

    // 4. Return the receipt
    return receipt;
  };

  // update margin [SMART CONTRACT CALL]
  public updateMargin = async (
    args: UserUpdateMarginArgs,
  ): Promise<ContractReceipt | undefined> => {
    // 0. Check if write functionalities are enabled
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.writeContracts)) {
      return;
    }

    // 1. Build the parameters of the smart contract call

    // for ETH pools: deposit in ETH, withdrawals in WETH
    // for non-ETH pools: both in underlying token
    const [marginEth, marginErc20]: [number | undefined, number] =
      args.margin > 0 && this.isETH ? [args.margin, 0] : [undefined, args.margin];

    const { updateMarginParams, ethDeposit } = processUpdateMarginArgumests({
      ...args,
      marginErc20,
      marginEth,

      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // 2. Execute the update margin flow and get the receipt
    const receipt = await execUpdateMargin({
      periphery: this.writeContracts.periphery,
      params: updateMarginParams,
      ethDeposit,
    });

    // 3. Refresh the state that changes after operation
    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh wallet balance. ${error}`);
    }

    // 4. Return the receipt
    return receipt;
  };

  // settle position [SMART CONTRACT CALL]
  public settle = async (args: UserSettleArgs): Promise<ContractReceipt | undefined> => {
    // 0. Check if write functionalities are enabled
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      return;
    }

    // 1. Build the parameters of the smart contract call
    const settleParams = processSettleArguments({
      ...args,
      owner: this.userAddress,
      marginEngine: this.readOnlyContracts.marginEngine.address,
      tickFormat: this.tickFormat,
    });

    // 2. Execute the settle position flow and get the receipt
    const receipt = await execSettle({
      periphery: this.writeContracts.periphery,
      params: settleParams,
    });

    // 3. Refresh the state that changes after operation
    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh wallet balance. ${error}`);
    }

    // 4. Return the receipt
    return receipt;
  };

  // Rollover with swap [SMART CONTRACT CALL]
  // 1. It settles and withdraw the position associated with this AMM
  //    (of [userAddress, previousFixedLow, previousFixedHigh])
  // 2. It creates a swap in the next margin engine [NOT this AMM]
  //    (of [userAddress, fixedLow, fixedHigh])
  public async rolloverWithSwap(
    userArgs: UserRolloverWithSwapArgs,
  ): Promise<ContractReceipt | undefined> {
    // 0. Check if write functionalities are enabled
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      return;
    }

    // 1. Build the parameters of the smart contract call
    const { rolloverWithSwapParams, ethDeposit } = processRolloverWithSwapArguments({
      ...userArgs,
      previousMarginEngine: this.readOnlyContracts.marginEngine.address,
      owner: this.userAddress,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // 2. Execute the rollover with swap flow and get the receipt
    const receipt = await execRolloverWithSwap({
      periphery: this.writeContracts.periphery,
      params: rolloverWithSwapParams,
      ethDeposit,
    });

    // 3. Refresh the state that changes after operation
    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh wallet balance. ${error}`);
    }

    return receipt;
  }

  // Rollover with mint [SMART CONTRACT CALL]
  // 1. It settles and withdraw the position associated with this AMM
  //    (of [userAddress, previousFixedLow, previousFixedHigh])
  // 2. It creates a mint in the next margin engine [NOT this AMM]
  //    (of [userAddress, fixedLow, fixedHigh])
  public async rolloverWithMint(
    userArgs: UserRolloverWithMintArgs,
  ): Promise<ContractReceipt | undefined> {
    // 0. Check if write functionalities are enabled
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      return;
    }

    // 1. Build the parameters of the smart contract call
    const { rolloverWithMintParams, ethDeposit } = processRolloverWithMintArguments({
      ...userArgs,
      previousMarginEngine: this.readOnlyContracts.marginEngine.address,
      owner: this.userAddress,
      tickFormat: this.tickFormat,
      tokenScaler: this.tokenScaler,
    });

    // 2. Execute the rollover with mint flow and get the receipt
    const receipt = await execRolloverWithMint({
      periphery: this.writeContracts.periphery,
      params: rolloverWithMintParams,
      ethDeposit,
    });

    // 3. Refresh the state that changes after operation
    try {
      await this.refreshWalletBalances();
    } catch (error) {
      console.error(`Failed to refresh wallet balance. ${error}`);
    }

    // 4. Return the receipt
    return receipt;
  }
}
