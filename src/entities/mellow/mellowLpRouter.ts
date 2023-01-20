/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
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

import { getTokenInfo } from '../../services/getTokenInfo';

import { getGasBuffer, MaxUint256Bn, TresholdApprovalBn } from '../../constants';

import { abi as Erc20RootVaultABI } from '../../ABIs/Erc20RootVault.json';
import { abi as IERC20MinimalABI } from '../../ABIs/IERC20Minimal.json';
import { abi as MellowMultiVaultRouterABI } from '../../ABIs/MellowMultiVaultRouterABI.json';
import { getSentryTracker } from '../../init';
import { MellowProductMetadata } from './config/types';
import { closeOrPastMaturity } from './config/utils';
import { convertGasUnitsToUSD } from '../../utils/mellowHelpers/convertGasUnitsToUSD';
import { geckoEthToUsd } from '../../utils/priceFetch';

export type MellowLpRouterArgs = {
  id: string;
  mellowRouterAddress: string; // live in env variable per router contract
  provider: providers.Provider;
  metadata: MellowProductMetadata & {
    underlyingPools: string[];
  };
  ethPrice?: () => Promise<number>;
};

type BatchedDeposit = {
  author: string;
  amount: BigNumber;
};

class MellowLpRouter {
  public readonly id: string;
  public readonly mellowRouterAddress: string;
  public readonly provider: providers.Provider;
  public readonly ethPrice: () => Promise<number>;
  metadata: MellowProductMetadata & {
    underlyingPools: string[];
  };

  public readOnlyContracts?: {
    token: Contract;
    mellowRouterContract: Contract;
    erc20RootVault: Contract[];
  };

  public writeContracts?: {
    token: Contract;
    erc20RootVault: Contract[];
    mellowRouter: Contract;
  };

  public signer?: Signer;

  public userIndividualCommittedDeposits: number[] = [];
  public userIndividualPendingDeposit: number[] = [];

  public userWalletBalance?: number;

  public userAddress?: string;

  public vaultInitialized = false;
  public userInitialized = false;

  public vaultsCount = 0;

  public isRegisteredForAutoRollover = false;

  private canManageVaultPositions?: boolean[];

  private gasUnitPriceUSD = 0;
  private autoRolloverRegistrationGasUnits = 0;

  public constructor({
    mellowRouterAddress,
    id,
    provider,
    metadata,
    ethPrice,
  }: MellowLpRouterArgs) {
    this.mellowRouterAddress = mellowRouterAddress;
    this.id = id;
    this.provider = provider;
    this.metadata = metadata;
    this.ethPrice =
      ethPrice || (() => geckoEthToUsd(process.env.REACT_APP_COINGECKO_API_KEY || ''));
  }

  descale = (amount: BigNumberish, decimals: number): number => {
    return Number(ethers.utils.formatUnits(amount, decimals));
  };

  scale = (amount: number): BigNumber => {
    return ethers.utils.parseUnits(amount.toFixed(this.tokenDecimals), this.tokenDecimals);
  };

  validateWeights = (weights: number[]): boolean => {
    if (!weights.every((value) => Number.isInteger(value))) {
      // All values of default weights must be integer
      return false;
    }

    if (weights.length !== this.vaultsCount) {
      // Lengths of vault indices and default weights array do not match
      return false;
    }

    return true;
  };

  // NEXT: to offload this to subgraph
  vaultInit = async (): Promise<void> => {
    if (this.vaultInitialized) {
      return;
    }

    // Instantiate the mellowRouterContract
    const mellowRouterContract = new ethers.Contract(
      this.mellowRouterAddress,
      MellowMultiVaultRouterABI,
      this.provider,
    );

    // Get the token from mellowRouter.token() here
    const tokenAddress = await mellowRouterContract.token();
    const tokenContract = new Contract(tokenAddress, IERC20MinimalABI, this.provider);

    // erc20rootvault addresses
    const ERC20RootVaultAddresses: string[] = await mellowRouterContract.getVaults();
    this.vaultsCount = ERC20RootVaultAddresses.length;

    // Map the addresses so that each of them is instantiated into a contract
    const erc20RootVaultContracts = ERC20RootVaultAddresses.map(
      (address: string) => new ethers.Contract(address, Erc20RootVaultABI, this.provider),
    );

    this.readOnlyContracts = {
      token: tokenContract,
      erc20RootVault: erc20RootVaultContracts,
      mellowRouterContract,
    };

    this.userIndividualCommittedDeposits = new Array(this.vaultsCount).fill(0x0);
    this.userIndividualPendingDeposit = new Array(this.vaultsCount).fill(0x0);

    await this.refreshGasUnitPriceUSD();

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
      token: new Contract(this.readOnlyContracts.token.address, IERC20MinimalABI, this.signer),
      erc20RootVault: this.readOnlyContracts.erc20RootVault.map(
        (contract) => new ethers.Contract(contract.address, Erc20RootVaultABI, this.signer),
      ),
      mellowRouter: new ethers.Contract(
        this.mellowRouterAddress,
        MellowMultiVaultRouterABI,
        this.signer,
      ),
    };

    await this.refreshUserDeposit();
    await this.refreshWalletBalance();

    // try-catch block to be removed once all routers have been upgraded on GOERLI & MAINNET
    try {
      this.isRegisteredForAutoRollover =
        await this.readOnlyContracts.mellowRouterContract.isRegisteredForAutoRollover(
          this.userAddress,
        );

      this.canManageVaultPositions = [];
      for (let vaultIndex = 0; vaultIndex < this.vaultsCount; vaultIndex += 1) {
        this.canManageVaultPositions.push(
          await this.readOnlyContracts.mellowRouterContract.canWithdrawOrRollover(
            vaultIndex,
            this.userAddress,
          ),
        );
      }
    } catch (error) {}

    // try-catch to not be removed
    try {
      this.autoRolloverRegistrationGasUnits = (
        await this.writeContracts.mellowRouter.estimateGas.registerForAutoRollover(
          !this.isRegisteredForAutoRollover,
        )
      ).toNumber();
    } catch (error) {
      this.autoRolloverRegistrationGasUnits = 0;
    }

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

  public get expired(): boolean {
    const latestMaturity = Math.max(...this.metadata.vaults.map((v) => v.maturityTimestampMS));
    return closeOrPastMaturity(latestMaturity);
  }

  public get depositable(): boolean {
    return !this.metadata.deprecated && !this.expired;
  }

  public withdrawable(vaultIndex: number): boolean {
    return (
      this.metadata.vaults[vaultIndex].withdrawable &&
      Date.now().valueOf() > this.metadata.vaults[vaultIndex].maturityTimestampMS
    );
  }

  public rolloverable(vaultIndex: number): boolean {
    return this.withdrawable(vaultIndex);
  }

  public get userComittedDeposit(): number {
    return this.userIndividualCommittedDeposits.reduce((total, deposit) => total + deposit, 0);
  }

  public get userPendingDeposit(): number {
    return this.userIndividualPendingDeposit.reduce((total, deposit) => total + deposit, 0);
  }

  public get userIndividualDeposits(): number[] {
    if (
      !(this.userIndividualPendingDeposit.length === this.userIndividualCommittedDeposits.length)
    ) {
      return [];
    }

    return this.userIndividualPendingDeposit.map(
      (pendingDeposit, index) => pendingDeposit + this.userIndividualCommittedDeposits[index],
    );
  }

  public get userDeposit(): number {
    return this.userIndividualDeposits.reduce((total, deposit) => total + deposit, 0);
  }

  refreshUserComittedDeposit = async (): Promise<void> => {
    this.userIndividualCommittedDeposits = this.userIndividualCommittedDeposits.map(() => 0);

    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.tokenDecimals)
    ) {
      return;
    }

    const lpTokensBalances: BigNumber[] =
      await this.readOnlyContracts.mellowRouterContract.getLPTokenBalances(this.userAddress);

    for (let i = 0; i < this.readOnlyContracts.erc20RootVault.length; i += 1) {
      const erc20RootVaultContract = this.readOnlyContracts.erc20RootVault[i];
      const lpTokensBalance = lpTokensBalances[i];

      const totalLpTokens = await erc20RootVaultContract.totalSupply();

      const tvl = await erc20RootVaultContract.tvl();

      if (totalLpTokens.gt(0)) {
        const userFunds = lpTokensBalance.mul(tvl[0][0]).div(totalLpTokens);
        this.userIndividualCommittedDeposits[i] = this.descale(userFunds, this.tokenDecimals);
      }
    }
  };

  refreshUserPendingDeposit = async (): Promise<void> => {
    this.userIndividualPendingDeposit = this.userIndividualPendingDeposit.map(() => 0);

    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.tokenDecimals)
    ) {
      return;
    }

    for (let i = 0; i < this.vaultsCount; i += 1) {
      const batchedDeposits: BatchedDeposit[] =
        await this.readOnlyContracts.mellowRouterContract.getBatchedDeposits(i);

      const userBatchedDeposits: BatchedDeposit[] = batchedDeposits.filter(
        (batchedDeposit) => batchedDeposit.author.toLowerCase() === this.userAddress?.toLowerCase(),
      );

      const userPendingFunds = userBatchedDeposits.reduce(
        (sum, batchedDeposit) => sum.add(batchedDeposit.amount),
        BigNumber.from(0),
      );

      const userPendingDeposit = this.descale(userPendingFunds, this.tokenDecimals);
      this.userIndividualPendingDeposit[i] += userPendingDeposit;
    }
  };

  refreshUserDeposit = async (): Promise<void> => {
    await this.refreshUserComittedDeposit();
    await this.refreshUserPendingDeposit();
  };

  refreshWalletBalance = async (): Promise<void> => {
    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.readOnlyContracts) ||
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
      this.writeContracts?.mellowRouter.address,
    );

    return tokenApproval.gte(TresholdApprovalBn);
  };

  approveToken = async (): Promise<ContractReceipt> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.writeContracts)) {
      throw new Error('Uninitialized contracts.');
    }

    const gasLimit = await this.writeContracts.token.estimateGas.approve(
      this.writeContracts.mellowRouter.address,
      MaxUint256Bn,
    );

    const tx = await this.writeContracts.token.approve(
      this.writeContracts.mellowRouter.address,
      MaxUint256Bn,
      {
        gasLimit: getGasBuffer(gasLimit),
      },
    );

    try {
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Unsuccessful approval confirmation.');
      throw new Error('Unsuccessful approval confirmation.');
    }
  };

  deposit = async (
    amount: number,
    _weights: number[],
    registration?: boolean | undefined,
  ): Promise<ContractReceipt> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      throw new Error('Uninitialized contracts.');
    }

    const weights = _weights;
    while (weights.length < this.vaultsCount) {
      weights.push(0);
    }

    if (!this.validateWeights(weights)) {
      throw new Error('Weights are invalid');
    }

    const scaledAmount = this.scale(amount);
    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH) {
      tempOverrides.value = scaledAmount;
    }

    if (registration !== undefined) {
      try {
        if (this.isETH) {
          this.writeContracts.mellowRouter.callStatic.depositEthAndRegisterForAutoRollover(
            weights,
            registration,
            tempOverrides,
          );
        } else {
          await this.writeContracts.mellowRouter.callStatic.depositErc20AndRegisterForAutoRollover(
            scaledAmount,
            weights,
            registration,
          );
        }
      } catch (error) {
        console.error('Error when simulating depositAndRegisterForAutoRollover.', error);
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Unsuccessful depositAndRegisterForAutoRollover simulation.');
        throw new Error('Unsuccessful depositAndRegisterForAutoRollover simulation.');
      }

      if (this.isETH) {
        const gasLimit =
          await this.writeContracts.mellowRouter.estimateGas.depositEthAndRegisterForAutoRollover(
            weights,
            registration,
            tempOverrides,
          );
        tempOverrides.gasLimit = getGasBuffer(gasLimit);
      } else {
        const gasLimit =
          await this.writeContracts.mellowRouter.estimateGas.depositErc20AndRegisterForAutoRollover(
            scaledAmount,
            weights,
            registration,
            tempOverrides,
          );
        tempOverrides.gasLimit = getGasBuffer(gasLimit);
      }

      const tx = this.isETH
        ? await this.writeContracts.mellowRouter.depositEthAndRegisterForAutoRollover(
            weights,
            registration,
            tempOverrides,
          )
        : await this.writeContracts.mellowRouter.depositErc20AndRegisterForAutoRollover(
            scaledAmount,
            weights,
            registration,
            tempOverrides,
          );

      try {
        const receipt = await tx.wait();
        this.isRegisteredForAutoRollover = registration;

        try {
          await this.refreshUserDeposit();
        } catch (error) {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureException(error);
          sentryTracker.captureMessage(
            'User deposit failed to refresh after depositAndRegisterForAutoRollover',
          );
          console.error(
            'User deposit failed to refresh after depositAndRegisterForAutoRollover.',
            error,
          );
        }

        try {
          await this.refreshWalletBalance();
        } catch (error) {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureException(error);
          sentryTracker.captureMessage(
            'Wallet user balance failed to refresh after depositAndRegisterForAutoRollover',
          );
          console.error(
            'Wallet user balance failed to refresh after depositAndRegisterForAutoRollover.',
            error,
          );
        }

        return receipt;
      } catch (error) {
        console.error('Unsuccessful depositAndRegisterForAutoRollover confirmation.', error);
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage(
          'Unsuccessful depositAndRegisterForAutoRollover confirmation.',
        );
        throw new Error('Unsuccessful depositAndRegisterForAutoRollover confirmation.');
      }
    } else {
      try {
        if (this.isETH) {
          this.writeContracts.mellowRouter.callStatic.depositEth(weights, tempOverrides);
        } else {
          await this.writeContracts.mellowRouter.callStatic.depositErc20(scaledAmount, weights);
        }
      } catch (error) {
        console.error('Error when simulating deposit.', error);
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Unsuccessful deposit simulation.');
        throw new Error('Unsuccessful deposit simulation.');
      }

      if (this.isETH) {
        const gasLimit = await this.writeContracts.mellowRouter.estimateGas.depositEth(
          weights,
          tempOverrides,
        );
        tempOverrides.gasLimit = getGasBuffer(gasLimit);
      } else {
        const gasLimit = await this.writeContracts.mellowRouter.estimateGas.depositErc20(
          scaledAmount,
          weights,
          tempOverrides,
        );
        tempOverrides.gasLimit = getGasBuffer(gasLimit);
      }

      const tx = this.isETH
        ? await this.writeContracts.mellowRouter.depositEth(weights, tempOverrides)
        : await this.writeContracts.mellowRouter.depositErc20(scaledAmount, weights, tempOverrides);

      try {
        const receipt = await tx.wait();

        try {
          await this.refreshUserDeposit();
        } catch (error) {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureException(error);
          sentryTracker.captureMessage('User deposit failed to refresh after deposit');
          console.error('User deposit failed to refresh after deposit.', error);
        }

        try {
          await this.refreshWalletBalance();
        } catch (error) {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureException(error);
          sentryTracker.captureMessage('Wallet user balance failed to refresh after deposit');
          console.error('Wallet user balance failed to refresh after deposit.', error);
        }

        return receipt;
      } catch (error) {
        console.error('Unsuccessful deposit confirmation.', error);
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Unsuccessful deposit confirmation.');
        throw new Error('Unsuccessful deposit confirmation.');
      }
    }
  };

  withdraw = async (vaultIndex: number): Promise<ContractReceipt> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      throw new Error('Uninitialized contracts.');
    }

    const subvaultsCount: number = (
      await this.readOnlyContracts.erc20RootVault[vaultIndex].subvaultNfts()
    ).length;

    const minTokenAmounts = BigNumber.from(0);
    const vaultsOptions = new Array(subvaultsCount).fill(0x0);

    console.log(`Calling claimLPTokens(${vaultIndex}, ${[minTokenAmounts]}, [${vaultsOptions}])`);

    try {
      await this.writeContracts.mellowRouter.callStatic.claimLPTokens(
        vaultIndex,
        [minTokenAmounts],
        vaultsOptions,
      );
    } catch (err) {
      console.error('Error during claimLPTokens:', err);
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Unsuccessful claimLPTokens simulation.');
      throw new Error('Unsuccessful claimLPTokens simulation.');
    }

    const gasLimit = await this.writeContracts.mellowRouter.estimateGas.claimLPTokens(
      vaultIndex,
      [minTokenAmounts],
      vaultsOptions,
    );

    const tx = await this.writeContracts.mellowRouter.claimLPTokens(
      vaultIndex,
      [minTokenAmounts],
      vaultsOptions,
      {
        gasLimit: getGasBuffer(gasLimit),
      },
    );

    try {
      const receipt = await tx.wait();

      try {
        await this.refreshWalletBalance();
      } catch (err) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(err);
        sentryTracker.captureMessage('Wallet user balance failed to refresh after withdrawal');
        console.error('Wallet user balance failed to refresh after withdraw');
      }

      try {
        await this.refreshUserDeposit();
      } catch (err) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(err);
        sentryTracker.captureMessage('User deposit failed to refresh after withdrawal');
        console.error('User deposit failed to refresh after withdraw');
      }

      return receipt;
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Unsucessful withdrawal confirmation.');
      throw new Error('Unsucessful withdraw confirmation.');
    }
  };

  rollover = async (vaultIndex: number, _weights: number[]): Promise<ContractReceipt> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      throw new Error('Uninitialized contracts.');
    }

    const weights = _weights;
    while (weights.length < this.vaultsCount) {
      weights.push(0);
    }

    if (!this.validateWeights(weights)) {
      throw new Error('Weights are invalid');
    }

    const subvaultsCount: number = (
      await this.readOnlyContracts.erc20RootVault[vaultIndex].subvaultNfts()
    ).length;

    const minTokenAmounts = BigNumber.from(0);
    const vaultsOptions = new Array(subvaultsCount).fill(0x0);

    console.log(
      `Calling rolloverLPTokens(${vaultIndex}, ${[
        minTokenAmounts,
      ]}, [${vaultsOptions}], ${weights})`,
    );

    try {
      await this.writeContracts.mellowRouter.callStatic.rolloverLPTokens(
        vaultIndex,
        [minTokenAmounts],
        vaultsOptions,
        weights,
      );
    } catch (err) {
      console.error('Error during rolloverLPTokens', err);
      throw new Error('Unsuccessful rolloverLPTokens simulation.');
    }

    const gasLimit = await this.writeContracts.mellowRouter.estimateGas.rolloverLPTokens(
      vaultIndex,
      [minTokenAmounts],
      vaultsOptions,
      weights,
    );

    const tx = await this.writeContracts.mellowRouter.rolloverLPTokens(
      vaultIndex,
      [minTokenAmounts],
      vaultsOptions,
      weights,
      {
        gasLimit: getGasBuffer(gasLimit),
      },
    );

    try {
      const receipt = await tx.wait();

      try {
        await this.refreshWalletBalance();
      } catch (err) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(err);
        sentryTracker.captureMessage('Wallet user balance failed to refresh after rollover');
        console.error('Wallet user balance failed to refresh after rollover');
      }

      try {
        await this.refreshUserDeposit();
      } catch (err) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(err);
        sentryTracker.captureMessage('User deposit failed to refresh after rollover');
        console.error('User deposit failed to refresh after rollover');
      }

      return receipt;
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Unsucessful rollover confirmation.');
      throw new Error('Unsucessful rollover confirmation.');
    }
  };

  registerForAutoRollover = async (registration: boolean): Promise<ContractReceipt> => {
    if (isUndefined(this.writeContracts) || isUndefined(this.userAddress)) {
      throw new Error('Uninitialized contracts.');
    }

    try {
      await this.writeContracts.mellowRouter.callStatic.registerForAutoRollover(registration);
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Unsuccessful auto-rollover registration simulation');
      console.error('Error during registration for auto-rollover', err);
      throw new Error('Unsuccessful auto-rollover registration simulation');
    }

    const gasLimit = await this.writeContracts.mellowRouter.estimateGas.registerForAutoRollover(
      registration,
    );

    const tx = await this.writeContracts.mellowRouter.registerForAutoRollover(registration, {
      gasLimit: getGasBuffer(gasLimit),
    });

    try {
      const receipt = await tx.wait();
      this.isRegisteredForAutoRollover = registration;

      return receipt;
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Unsucessful auto-rollover registration confirmation.');
      throw new Error('Unsucessful auto-rollover registration confirmation.');
    }
  };

  refreshGasUnitPriceUSD = async (): Promise<void> => {
    this.gasUnitPriceUSD = await convertGasUnitsToUSD(this.provider, 1);
  };

  public get autoRolloverRegistrationGasFeeUSD() {
    return this.autoRolloverRegistrationGasUnits * this.gasUnitPriceUSD;
  }

  public canManageVaultPosition = (vaultIndex: number): boolean => {
    if (this.canManageVaultPositions === undefined) {
      return false;
    }

    if (vaultIndex < 0 || vaultIndex >= this.vaultsCount) {
      return false;
    }

    if (
      this.isRegisteredForAutoRollover &&
      vaultIndex < this.metadata.vaults.length &&
      closeOrPastMaturity(this.metadata.vaults[vaultIndex].maturityTimestampMS)
    ) {
      return false;
    }

    return this.canManageVaultPositions[vaultIndex];
  };

  submitAllBatchesForFee = async (): Promise<ContractReceipt> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      throw new Error('Uninitialized contracts.');
    }

    try {
      await this.writeContracts.mellowRouter.callStatic.submitAllBatchesForFee();
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Unsuccessful batch submittion simulation');
      throw new Error('Unsuccessful batch submittion simulation');
    }

    const gasLimit = await this.writeContracts.mellowRouter.estimateGas.submitAllBatchesForFee();

    const tx = await this.writeContracts.mellowRouter.submitAllBatchesForFee({
      gasLimit: getGasBuffer(gasLimit),
    });

    try {
      const receipt = await tx.wait();

      return receipt;
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Unsuccessful batch submittion');
      throw new Error('Unsuccessful batch submittion');
    }
  };

  getSubmitBatchGasCost = async (): Promise<number> => {
    if (isUndefined(this.writeContracts)) {
      throw new Error('Uninitialized contracts.');
    }

    try {
      const gasUnitsEstimate =
        await this.writeContracts.mellowRouter.estimateGas.submitAllBatchesForFee();

      const gasPrice = gasUnitsEstimate.toNumber() * this.gasUnitPriceUSD;
      return gasPrice;
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Unsuccessful batch submittion simulation');
      console.error('Error during batch submittion', err);
      throw new Error('Unsuccessful batch submittion simulation');
    }
  };

  getDepositGasCost = async (
    amount: number,
    _weights: number[],
    registration?: boolean | undefined,
  ): Promise<number> => {
    if (isUndefined(this.writeContracts) || isUndefined(this.userAddress)) {
      throw new Error('Uninitialized contracts.');
    }

    const weights = _weights;
    while (weights.length < this.vaultsCount) {
      weights.push(0);
    }

    if (!this.validateWeights(weights)) {
      throw new Error('Weights are invalid');
    }

    const scaledAmount = this.scale(amount);
    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH) {
      tempOverrides.value = scaledAmount;
    }

    let gasUnitsEstimate: BigNumber;

    if (registration !== undefined) {
      try {
        if (this.isETH) {
          gasUnitsEstimate =
            await this.writeContracts.mellowRouter.estimateGas.depositEthAndRegisterForAutoRollover(
              weights,
              registration,
              tempOverrides,
            );
        } else {
          gasUnitsEstimate =
            await this.writeContracts.mellowRouter.estimateGas.depositErc20AndRegisterForAutoRollover(
              scaledAmount,
              weights,
              registration,
            );
        }
      } catch (error) {
        console.error('Error estimating gas for depositAndRegisterForAutoRollover.', error);
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage(
          'Unsuccessful depositAndRegisterForAutoRollover gas estimate.',
        );
        throw new Error('Unsuccessful depositAndRegisterForAutoRollover gas estimate.');
      }
    } else {
      try {
        if (this.isETH) {
          gasUnitsEstimate = await this.writeContracts.mellowRouter.estimateGas.depositEth(
            weights,
            tempOverrides,
          );
        } else {
          gasUnitsEstimate = await this.writeContracts.mellowRouter.estimateGas.depositErc20(
            scaledAmount,
            weights,
          );
        }
      } catch (error) {
        console.error('Error when estimating gas for deposit.', error);
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Unsuccessful deposit gas estimate.');
        throw new Error('Unsuccessful deposit gas estimate.');
      }
    }

    const gasPrice = gasUnitsEstimate.toNumber() * this.gasUnitPriceUSD;

    return gasPrice;
  };

  getBatchBudgetUsd = async (): Promise<number> => {
    if (isUndefined(this.writeContracts) || isUndefined(this.readOnlyContracts)) {
      throw new Error('Uninitialized contracts.');
    }

    try {
      const budgetUnderlyingToken = await this.readOnlyContracts.mellowRouterContract.getTotalFee();
      const usdExchangeRate = this.isETH ? await this.ethPrice() : 1;
      const budgetForBatchDescaled = this.descale(
        budgetUnderlyingToken.mul(usdExchangeRate),
        this.tokenDecimals,
      );

      return budgetForBatchDescaled;
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Failed to get batch budget');
      console.error('Error while getting batch budget', err);
      throw new Error('Failed to get batch budget');
    }
  };

  getDepositFeeUsd = async (): Promise<number> => {
    if (isUndefined(this.readOnlyContracts)) {
      throw new Error('Uninitialized contracts.');
    }

    try {
      const fee = await this.readOnlyContracts.mellowRouterContract.getFee();

      const usdExchangeRate = this.isETH ? await this.ethPrice() : 1;
      const feeDescaled = this.descale(
        fee.mul(toBn(usdExchangeRate.toString())),
        this.tokenDecimals,
      );

      return feeDescaled;
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Failed to get deposit fee');
      throw new Error('Failed to get deposit fee');
    }
  };
}

export default MellowLpRouter;
