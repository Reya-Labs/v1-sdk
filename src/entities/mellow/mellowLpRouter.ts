/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

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

import { getTokenInfo } from '../../services/getTokenInfo';

import { getGasBuffer, MaxUint256Bn, TresholdApprovalBn } from '../../constants';

import { abi as Erc20RootVaultABI } from '../../ABIs/Erc20RootVault.json';
import { abi as IERC20MinimalABI } from '../../ABIs/IERC20Minimal.json';
import { abi as MellowMultiVaultRouterABI } from '../../ABIs/MellowMultiVaultRouterABI.json';
import { abi as MellowLensContractABI } from '../../ABIs/MellowLensContract.json';
import { getSentryTracker } from '../../init';
import { closeOrPastMaturity, MellowProductMetadata } from './config';
import { convertGasUnitsToUSD } from '../../utils/mellowHelpers/convertGasUnitsToUSD';

export type MellowLpRouterArgs = {
  id: string;
  mellowRouterAddress: string; // live in env variable per router contract
  mellowLensContractAddress: string;
  provider: providers.Provider;
  metadata: MellowProductMetadata & {
    underlyingPools: string[];
  };
};

class MellowLpRouter {
  public readonly id: string;
  public readonly mellowRouterAddress: string;
  public readonly mellowLensContractAddress: string;
  public readonly provider: providers.Provider;
  metadata: MellowProductMetadata & {
    underlyingPools: string[];
  };

  public contracts?: {
    token: Contract;
    erc20RootVault: Contract[];
    mellowRouter: Contract;
    mellowLensContract: Contract;
  };

  public signer?: Signer;
  public userAddress?: string;

  public userWalletBalance = 0;

  private userIndividualCommittedDeposits: number[] = [];
  private userIndividualPendingDeposits: number[] = [];

  public vaultInitialized = false;
  public userInitialized = false;

  public vaultsCount = 0;

  public isRegisteredForAutoRollover = false;
  private canManageVaultPositions: boolean[] = [];

  private gasUnitPriceUSD = 0;
  private autoRolloverRegistrationGasUnits = 0;

  public constructor({
    mellowRouterAddress,
    mellowLensContractAddress,
    id,
    provider,
    metadata,
  }: MellowLpRouterArgs) {
    this.mellowRouterAddress = mellowRouterAddress;
    this.mellowLensContractAddress = mellowLensContractAddress;
    this.id = id;
    this.provider = provider;
    this.metadata = metadata;
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

    await this.refreshInfo();
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

    this.userAddress = await this.signer.getAddress();
    await this.refreshInfo();

    // try-catch to not be removed
    try {
      this.autoRolloverRegistrationGasUnits = (
        (await this.contracts?.mellowRouter.estimateGas.registerForAutoRollover(
          !this.isRegisteredForAutoRollover,
        )) || BigNumber.from(0)
      ).toNumber();
    } catch (error) {
      this.autoRolloverRegistrationGasUnits = 0;
    }

    this.userInitialized = true;
  };

  private refreshInfo = async (): Promise<void> => {
    // Instantiate the Mellow Contract Lens

    const mellowLensContract = new ethers.Contract(
      this.mellowLensContractAddress,
      MellowLensContractABI,
      this.provider,
    );

    const optimiserInfo: {
      token: string;
      tokenBalance: BigNumber;
      ethBalance: BigNumber;
      isRegisteredForAutoRollover: boolean;
      erc20RootVaults: {
        rootVault: string;
        latestMaturity: BigNumber;
        vaultDeprecated: boolean;
        pendingUserDeposit: BigNumber;
        committedUserDeposit: BigNumber;
        canWithdrawOrRollover: boolean;
      }[];
    } = (
      await mellowLensContract.getOptimisersInfo(
        [this.mellowRouterAddress],
        !!this.userAddress,
        this.userAddress || '0x0000000000000000000000000000000000000000',
      )
    )[0];

    this.contracts = {
      token: new ethers.Contract(
        optimiserInfo.token,
        IERC20MinimalABI,
        this.signer || this.provider,
      ),
      erc20RootVault: optimiserInfo.erc20RootVaults.map(
        (rootVault) => new ethers.Contract(rootVault.rootVault, Erc20RootVaultABI, this.provider),
      ),
      mellowRouter: new ethers.Contract(
        this.mellowRouterAddress,
        MellowMultiVaultRouterABI,
        this.signer || this.provider,
      ),
      mellowLensContract,
    };

    this.vaultsCount = optimiserInfo.erc20RootVaults.length;

    this.userIndividualCommittedDeposits = optimiserInfo.erc20RootVaults.map((rootVault) =>
      this.descale(rootVault.committedUserDeposit, this.tokenDecimals),
    );

    this.userIndividualPendingDeposits = optimiserInfo.erc20RootVaults.map((rootVault) =>
      this.descale(rootVault.pendingUserDeposit, this.tokenDecimals),
    );

    this.canManageVaultPositions = optimiserInfo.erc20RootVaults.map(
      (rootVault) => rootVault.canWithdrawOrRollover,
    );

    this.isRegisteredForAutoRollover = optimiserInfo.isRegisteredForAutoRollover;

    this.userWalletBalance = this.descale(
      this.isETH ? optimiserInfo.ethBalance : optimiserInfo.tokenBalance,
      this.tokenDecimals,
    );
  };

  public get tokenName(): string {
    return getTokenInfo(this.contracts?.token.address || '').name;
  }

  public get isETH(): boolean {
    return this.tokenName === 'ETH';
  }

  public get tokenDecimals(): number {
    return getTokenInfo(this.contracts?.token.address || '').decimals;
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

  public userComittedDeposit(): number {
    return this.userIndividualCommittedDeposits.reduce((total, deposit) => total + deposit, 0);
  }

  public userPendingDeposit(): number {
    return this.userIndividualPendingDeposits.reduce((total, deposit) => total + deposit, 0);
  }

  public userDeposit(): number {
    return this.userComittedDeposit() + this.userPendingDeposit();
  }

  public userIndividualDeposit(vaultIndex: number): number {
    return (
      this.userIndividualCommittedDeposit(vaultIndex) +
      this.userIndividualPendingDeposit(vaultIndex)
    );
  }

  public userIndividualPendingDeposit(vaultIndex: number): number {
    if (vaultIndex < this.userIndividualPendingDeposits.length) {
      return this.userIndividualPendingDeposits[vaultIndex];
    }
    return 0;
  }

  public userIndividualCommittedDeposit(vaultIndex: number): number {
    if (vaultIndex < this.userIndividualCommittedDeposits.length) {
      return this.userIndividualCommittedDeposits[vaultIndex];
    }
    return 0;
  }

  isTokenApproved = async (): Promise<boolean> => {
    if (this.isETH) {
      return true;
    }

    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.contracts) ||
      isUndefined(this.tokenDecimals)
    ) {
      return false;
    }

    const tokenApproval = await this.contracts.token.allowance(
      this.userAddress,
      this.contracts?.mellowRouter.address,
    );

    return tokenApproval.gte(TresholdApprovalBn);
  };

  approveToken = async (): Promise<ContractReceipt> => {
    if (isUndefined(this.contracts)) {
      throw new Error('Uninitialized contracts.');
    }

    const gasLimit = await this.contracts.token.estimateGas.approve(
      this.contracts.mellowRouter.address,
      MaxUint256Bn,
    );

    const tx = await this.contracts.token.approve(
      this.contracts.mellowRouter.address,
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
    if (isUndefined(this.contracts) || isUndefined(this.userAddress)) {
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
          this.contracts.mellowRouter.callStatic.depositEthAndRegisterForAutoRollover(
            weights,
            registration,
            tempOverrides,
          );
        } else {
          await this.contracts.mellowRouter.callStatic.depositErc20AndRegisterForAutoRollover(
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
          await this.contracts.mellowRouter.estimateGas.depositEthAndRegisterForAutoRollover(
            weights,
            registration,
            tempOverrides,
          );
        tempOverrides.gasLimit = getGasBuffer(gasLimit);
      } else {
        const gasLimit =
          await this.contracts.mellowRouter.estimateGas.depositErc20AndRegisterForAutoRollover(
            scaledAmount,
            weights,
            registration,
            tempOverrides,
          );
        tempOverrides.gasLimit = getGasBuffer(gasLimit);
      }

      const tx = this.isETH
        ? await this.contracts.mellowRouter.depositEthAndRegisterForAutoRollover(
            weights,
            registration,
            tempOverrides,
          )
        : await this.contracts.mellowRouter.depositErc20AndRegisterForAutoRollover(
            scaledAmount,
            weights,
            registration,
            tempOverrides,
          );

      try {
        const receipt = await tx.wait();
        this.isRegisteredForAutoRollover = registration;

        try {
          await this.refreshInfo();
        } catch (error) {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureException(error);
          sentryTracker.captureMessage('Refresh failed after deposit.');
          console.error('Refresh failed after deposit.', error);
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
          this.contracts.mellowRouter.callStatic.depositEth(weights, tempOverrides);
        } else {
          await this.contracts.mellowRouter.callStatic.depositErc20(scaledAmount, weights);
        }
      } catch (error) {
        console.error('Error when simulating deposit.', error);
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Unsuccessful deposit simulation.');
        throw new Error('Unsuccessful deposit simulation.');
      }

      if (this.isETH) {
        const gasLimit = await this.contracts.mellowRouter.estimateGas.depositEth(
          weights,
          tempOverrides,
        );
        tempOverrides.gasLimit = getGasBuffer(gasLimit);
      } else {
        const gasLimit = await this.contracts.mellowRouter.estimateGas.depositErc20(
          scaledAmount,
          weights,
          tempOverrides,
        );
        tempOverrides.gasLimit = getGasBuffer(gasLimit);
      }

      const tx = this.isETH
        ? await this.contracts.mellowRouter.depositEth(weights, tempOverrides)
        : await this.contracts.mellowRouter.depositErc20(scaledAmount, weights, tempOverrides);

      try {
        const receipt = await tx.wait();

        try {
          await this.refreshInfo();
        } catch (error) {
          const sentryTracker = getSentryTracker();
          sentryTracker.captureException(error);
          sentryTracker.captureMessage('Refresh failed after deposit.');
          console.error('Refresh failed after deposit.', error);
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
    if (isUndefined(this.contracts) || isUndefined(this.userAddress)) {
      throw new Error('Uninitialized contracts.');
    }

    const subvaultsCount: number = (await this.contracts.erc20RootVault[vaultIndex].subvaultNfts())
      .length;

    const minTokenAmounts = BigNumber.from(0);
    const vaultsOptions = new Array(subvaultsCount).fill(0x0);

    try {
      await this.contracts.mellowRouter.callStatic.claimLPTokens(
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

    const gasLimit = await this.contracts.mellowRouter.estimateGas.claimLPTokens(
      vaultIndex,
      [minTokenAmounts],
      vaultsOptions,
    );

    const tx = await this.contracts.mellowRouter.claimLPTokens(
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
        await this.refreshInfo();
      } catch (error) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Refresh failed after deposit.');
        console.error('Refresh failed after deposit.', error);
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
    if (isUndefined(this.contracts) || isUndefined(this.userAddress)) {
      throw new Error('Uninitialized contracts.');
    }

    const weights = _weights;
    while (weights.length < this.vaultsCount) {
      weights.push(0);
    }

    if (!this.validateWeights(weights)) {
      throw new Error('Weights are invalid');
    }

    const subvaultsCount: number = (await this.contracts.erc20RootVault[vaultIndex].subvaultNfts())
      .length;

    const minTokenAmounts = BigNumber.from(0);
    const vaultsOptions = new Array(subvaultsCount).fill(0x0);

    try {
      await this.contracts.mellowRouter.callStatic.rolloverLPTokens(
        vaultIndex,
        [minTokenAmounts],
        vaultsOptions,
        weights,
      );
    } catch (err) {
      console.error('Error during rolloverLPTokens', err);
      throw new Error('Unsuccessful rolloverLPTokens simulation.');
    }

    const gasLimit = await this.contracts.mellowRouter.estimateGas.rolloverLPTokens(
      vaultIndex,
      [minTokenAmounts],
      vaultsOptions,
      weights,
    );

    const tx = await this.contracts.mellowRouter.rolloverLPTokens(
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
        await this.refreshInfo();
      } catch (error) {
        const sentryTracker = getSentryTracker();
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Refresh failed after deposit.');
        console.error('Refresh failed after deposit.', error);
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
    if (isUndefined(this.contracts) || isUndefined(this.userAddress)) {
      throw new Error('Uninitialized contracts.');
    }

    try {
      await this.contracts.mellowRouter.callStatic.registerForAutoRollover(registration);
    } catch (err) {
      const sentryTracker = getSentryTracker();
      sentryTracker.captureException(err);
      sentryTracker.captureMessage('Unsuccessful auto-rollover registration simulation');
      console.error('Error during registration for auto-rollover', err);
      throw new Error('Unsuccessful auto-rollover registration simulation');
    }

    const gasLimit = await this.contracts.mellowRouter.estimateGas.registerForAutoRollover(
      registration,
    );

    const tx = await this.contracts.mellowRouter.registerForAutoRollover(registration, {
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

  public get autoRolloverRegistrationGasFeeUSD(): number {
    return this.autoRolloverRegistrationGasUnits * this.gasUnitPriceUSD;
  }

  public canManageVaultPosition = (vaultIndex: number): boolean => {
    if (!this.canManageVaultPositions) {
      return false;
    }

    if (vaultIndex < 0 || vaultIndex >= this.vaultsCount) {
      return false;
    }

    return this.canManageVaultPositions[vaultIndex];
  };
}

export default MellowLpRouter;
