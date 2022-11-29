/* eslint-disable no-console */

import {
  Signer,
  providers,
  ethers,
  BigNumberish,
  BigNumber,
  ContractReceipt,
  Contract,
} from 'ethers';
import { isUndefined } from 'lodash';
import { toBn } from 'evm-bn';
import { getProtocolPrefix, getTokenInfo } from '../services/getTokenInfo';
import timestampWadToDateTime from '../utils/timestampWadToDateTime';
import { getGasBuffer, MaxUint256Bn, TresholdApprovalBn } from '../constants';

import { abi as VoltzVaultABI } from '../ABIs/VoltzVault.json';
import { abi as Erc20RootVaultABI } from '../ABIs/Erc20RootVault.json';
import { abi as Erc20RootVaultGovernanceABI } from '../ABIs/Erc20RootVaultGovernance.json';
import { abi as MarginEngineABI } from '../ABIs/MarginEngine.json';
import { abi as BaseRateOracleABI } from '../ABIs/BaseRateOracle.json';
import { abi as IERC20MinimalABI } from '../ABIs/IERC20Minimal.json';
import { abi as MellowDepositWrapperABI } from '../ABIs/MellowDepositWrapper.json';

export type MellowLpVaultArgs = {
  ethWrapperAddress: string;
  voltzVaultAddress: string;
  erc20RootVaultAddress: string;
  erc20RootVaultGovernanceAddress: string;
  provider?: providers.Provider;
};

class MellowLpVault {
  public readonly voltzVaultAddress: string;
  public readonly erc20RootVaultAddress: string;
  public readonly erc20RootVaultGovernanceAddress: string;
  public readonly provider?: providers.Provider;
  public readonly ethWrapperAddress: string;

  public readOnlyContracts?: {
    marginEngine: Contract;
    token: Contract;
    rateOracle: Contract;
    voltzVault: Contract;
    erc20RootVault: Contract;
    erc20RootVaultGovernance: Contract;
  };

  public writeContracts?: {
    token: Contract;
    erc20RootVault: Contract;
    ethWrapper: Contract;
  };

  public signer?: Signer;
  public maturity?: string;
  public protocolId?: number;

  public vaultCumulative?: number;
  public vaultCap?: number;
  public vaultExpectedApy?: number;

  public userDeposit?: number;
  public userWalletBalance?: number;

  public userAddress?: string;

  public vaultInitialized = false;
  public userInitialized = false;

  public constructor({
    ethWrapperAddress,
    erc20RootVaultAddress,
    erc20RootVaultGovernanceAddress,
    voltzVaultAddress,
    provider,
  }: MellowLpVaultArgs) {
    this.ethWrapperAddress = ethWrapperAddress;
    this.erc20RootVaultAddress = erc20RootVaultAddress;
    this.erc20RootVaultGovernanceAddress = erc20RootVaultGovernanceAddress;
    this.voltzVaultAddress = voltzVaultAddress;
    this.provider = provider;
  }

  descale = (amount: BigNumberish, decimals: number): number => {
    return Number(ethers.utils.formatUnits(amount, decimals));
  };

  scale = (amount: number): BigNumber => {
    return ethers.utils.parseUnits(amount.toString(), this.tokenDecimals);
  };

  // NEXT: to offload this to subgraph
  vaultInit = async (): Promise<void> => {
    if (this.vaultInitialized) {
      return;
    }

    if (isUndefined(this.provider)) {
      return;
    }

    const voltzVaultContract = new ethers.Contract(
      this.voltzVaultAddress,
      VoltzVaultABI,
      this.provider,
    );

    const marginEngineAddress = await voltzVaultContract.marginEngine();
    const marginEngineContract = new ethers.Contract(
      marginEngineAddress,
      MarginEngineABI,
      this.provider,
    );

    const tokenAddress = await marginEngineContract.underlyingToken();
    const tokenContract = new Contract(tokenAddress, IERC20MinimalABI, this.provider);

    const rateOracleAddress = await marginEngineContract.rateOracle();
    const rateOracleContract = new Contract(rateOracleAddress, BaseRateOracleABI, this.provider);

    this.readOnlyContracts = {
      marginEngine: marginEngineContract,
      token: tokenContract,
      rateOracle: rateOracleContract,
      voltzVault: voltzVaultContract,
      erc20RootVault: new ethers.Contract(
        this.erc20RootVaultAddress,
        Erc20RootVaultABI,
        this.provider,
      ),
      erc20RootVaultGovernance: new ethers.Contract(
        this.erc20RootVaultGovernanceAddress,
        Erc20RootVaultGovernanceABI,
        this.provider,
      ),
    };

    this.protocolId = await rateOracleContract.UNDERLYING_YIELD_BEARING_PROTOCOL_ID();

    const maturityWad = await marginEngineContract.termEndTimestampWad();
    const date = timestampWadToDateTime(maturityWad);

    this.maturity = `${date.day} ${date.monthShort} ${date.year % 100}`;

    await this.refreshVaultCumulative();
    await this.refreshVaultExpectedApy();

    this.vaultInitialized = true;
  };

  userInit = async (signer: Signer): Promise<void> => {
    this.signer = signer;

    if (this.userInitialized) {
      return;
    }

    if (!this.vaultInitialized) {
      return;
    }

    if (isUndefined(this.readOnlyContracts)) {
      throw new Error('Uninitialized contracts.');
    }

    this.userAddress = await this.signer.getAddress();

    this.writeContracts = {
      token: new ethers.Contract(
        this.readOnlyContracts.token.address,
        IERC20MinimalABI,
        this.signer,
      ),
      erc20RootVault: new ethers.Contract(
        this.erc20RootVaultAddress,
        Erc20RootVaultABI,
        this.signer,
      ),
      ethWrapper: new ethers.Contract(this.ethWrapperAddress, MellowDepositWrapperABI, this.signer),
    };

    await this.refreshUserDeposit();
    await this.refreshWalletBalance();

    this.userInitialized = true;
  };

  public get tokenName(): string {
    if (isUndefined(this.readOnlyContracts)) {
      return '-';
    }

    return getTokenInfo(this.readOnlyContracts.token.address).name;
  }

  public get isETH(): boolean {
    return this.tokenName === 'ETH';
  }

  public get tokenDecimals(): number {
    if (isUndefined(this.readOnlyContracts)) {
      return 18;
    }

    return getTokenInfo(this.readOnlyContracts.token.address).decimals;
  }

  public get protocol(): string {
    if (isUndefined(this.protocolId)) {
      return '-';
    }

    const prefix = getProtocolPrefix(this.protocolId);

    return `${prefix}${this.tokenName}`;
  }

  refreshVaultCumulative = async (): Promise<void> => {
    if (isUndefined(this.readOnlyContracts)) {
      this.vaultCumulative = 0;
      this.vaultCap = 0;
      return;
    }

    const totalLpTokens = await this.readOnlyContracts.erc20RootVault.totalSupply();

    if (totalLpTokens.eq(0)) {
      this.vaultCumulative = 0;
      this.vaultCap = 0;
      return;
    }

    const tvl = await this.readOnlyContracts.erc20RootVault.tvl();

    const nft = await this.readOnlyContracts.erc20RootVault.nft();
    const strategyParams = await this.readOnlyContracts.erc20RootVaultGovernance.strategyParams(
      nft,
    );

    this.vaultCumulative = this.descale(tvl.minTokenAmounts[0], this.tokenDecimals);
    this.vaultCap = this.descale(
      totalLpTokens.mul(toBn('1', 18)).div(strategyParams.tokenLimit),
      16,
    );
  };

  refreshVaultExpectedApy = async (): Promise<void> => {
    this.vaultExpectedApy = 31.03;
  };

  refreshUserDeposit = async (): Promise<void> => {
    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.tokenDecimals)
    ) {
      this.userDeposit = 0;
      return;
    }

    const lpTokens = await this.readOnlyContracts.erc20RootVault.balanceOf(this.userAddress);
    const totalLpTokens = await this.readOnlyContracts.erc20RootVault.totalSupply();

    const tvl = await this.readOnlyContracts.erc20RootVault.tvl();

    if (totalLpTokens.gt(0)) {
      const userFunds = lpTokens.mul(tvl[0][0]).div(totalLpTokens);
      this.userDeposit = this.descale(userFunds, this.tokenDecimals);
    } else {
      this.userDeposit = 0;
    }
  };

  refreshWalletBalance = async (): Promise<void> => {
    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.provider) ||
      isUndefined(this.tokenDecimals)
    ) {
      this.userWalletBalance = 0;
      return;
    }

    const walletBalance = this.isETH
      ? await this.provider.getBalance(this.userAddress)
      : await this.readOnlyContracts.token.balanceOf(this.userAddress);

    this.userWalletBalance = this.descale(walletBalance, this.tokenDecimals);
  };

  isTokenApproved = async (): Promise<boolean> => {
    if (this.isETH) {
      return true;
    }

    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.tokenDecimals)
    ) {
      return false;
    }

    const tokenApproval = await this.readOnlyContracts.token.allowance(
      this.userAddress,
      this.readOnlyContracts.erc20RootVault.address,
    );

    return tokenApproval.gte(TresholdApprovalBn);
  };

  approveToken = async (): Promise<ContractReceipt> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.writeContracts)) {
      throw new Error('Uninitialized contracts.');
    }

    const gasLimit = await this.writeContracts.token.estimateGas.approve(
      this.readOnlyContracts.erc20RootVault.address,
      MaxUint256Bn,
    );

    const tx = await this.writeContracts.token.approve(
      this.readOnlyContracts.erc20RootVault.address,
      MaxUint256Bn,
      {
        gasLimit: getGasBuffer(gasLimit),
      },
    );

    try {
      const receipt = await tx.wait();
      return receipt;
    } catch (_) {
      throw new Error('Unsucessful approval confirmation.');
    }
  };

  deposit = async (amount: number): Promise<ContractReceipt> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      throw new Error('Uninitialized contracts.');
    }

    const scaledAmount = this.scale(amount);

    const minLPTokens = BigNumber.from(0);

    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH) {
      tempOverrides.value = scaledAmount;
    }

    try {
      if (this.isETH) {
        this.writeContracts.ethWrapper.callStatic.deposit(
          this.readOnlyContracts.erc20RootVault.address,
          minLPTokens,
          [],
          tempOverrides,
        );
      } else {
        await this.writeContracts.erc20RootVault.callStatic.deposit(
          [scaledAmount],
          minLPTokens,
          [],
        );
      }
    } catch (err) {
      console.error('Error in deposit simulation:', err);
      throw new Error('Unsuccessful deposit simulation.');
    }

    if (this.isETH) {
      const gasLimit = await this.writeContracts.ethWrapper.estimateGas.deposit(
        this.readOnlyContracts.erc20RootVault.address,
        minLPTokens,
        [],
        tempOverrides,
      );
      tempOverrides.gasLimit = getGasBuffer(gasLimit);
    } else {
      const gasLimit = await this.writeContracts.erc20RootVault.estimateGas.deposit(
        [scaledAmount],
        minLPTokens,
        [],
      );
      tempOverrides.gasLimit = getGasBuffer(gasLimit);
    }

    const tx = this.isETH
      ? await this.writeContracts.ethWrapper.deposit(
          this.readOnlyContracts.erc20RootVault.address,
          minLPTokens,
          [],
          tempOverrides,
        )
      : await this.writeContracts.erc20RootVault.deposit(
          [scaledAmount],
          minLPTokens,
          [],
          tempOverrides,
        );

    try {
      const receipt = await tx.wait();

      try {
        await this.refreshWalletBalance();
      } catch (_) {
        console.error('Wallet user balance failed to refresh after deposit');
      }

      try {
        await this.refreshUserDeposit();
      } catch (_) {
        console.error('User deposit failed to refresh after deposit');
      }

      try {
        await this.refreshVaultCumulative();
      } catch (_) {
        console.error('Vault accumulative failed to refresh after deposit');
      }

      return receipt;
    } catch (err) {
      throw new Error('Unsucessful deposit confirmation.');
    }
  };

  withdraw = async (): Promise<ContractReceipt> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      throw new Error('Uninitialized contracts.');
    }

    // Get the balance of LP tokens
    const lpTokens = await this.readOnlyContracts.erc20RootVault.balanceOf(this.userAddress);

    console.log(`Calling withdraw (${this.descale(lpTokens, this.tokenDecimals)} lp tokens)...`);

    // Get the number of subvaults to input the correct vault options
    const subvaultsCount: number = (await this.readOnlyContracts.erc20RootVault[0].subvaultNfts())
      .length;

    // Default arguments for withdraw
    const minTokenAmounts = BigNumber.from(0);
    const vaultsOptions = new Array(subvaultsCount).fill(0x0);

    console.log(
      `args of withdraw: (${this.userAddress}, ${lpTokens.toString()}, ${[
        minTokenAmounts.toString(),
      ]}, ${vaultsOptions}`,
    );

    // Simulate the withdrawal
    try {
      await this.writeContracts.erc20RootVault.callStatic.withdraw(
        this.userAddress,
        lpTokens,
        minTokenAmounts,
        vaultsOptions,
      );
    } catch (err) {
      console.error('Error in withdrawal simulation:', err);
      throw new Error('Unsuccessful withdrawal simulation.');
    }

    // Estimate the gas for this transaction
    const gasLimit = await this.writeContracts.erc20RootVault.estimateGas.withdraw(
      this.userAddress,
      lpTokens,
      minTokenAmounts,
      vaultsOptions,
    );

    // Send the transaction
    const tx = await this.writeContracts.erc20RootVault.withdraw(
      this.userAddress,
      lpTokens,
      minTokenAmounts,
      vaultsOptions,
      {
        gasLimit: getGasBuffer(gasLimit),
      },
    );

    // Wait for the confirmation and update the state post-operation
    try {
      const receipt = await tx.wait();

      try {
        await this.refreshWalletBalance();
      } catch (_) {
        console.error('Wallet user balance failed to refresh after withdraw');
      }

      try {
        await this.refreshUserDeposit();
      } catch (_) {
        console.error('User deposit failed to refresh after withdraw');
      }

      return receipt;
    } catch (err) {
      throw new Error('Unsucessful withdraw confirmation.');
    }
  };
}

export default MellowLpVault;
