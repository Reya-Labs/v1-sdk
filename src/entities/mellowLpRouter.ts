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

import { getTokenInfo } from '../services/getTokenInfo';

import { getGasBuffer, MaxUint256Bn, TresholdApprovalBn } from '../constants';

import { abi as Erc20RootVaultABI } from '../ABIs/Erc20RootVault.json';
import { abi as Erc20RootVaultGovernanceABI } from '../ABIs/Erc20RootVaultGovernance.json';
import { abi as IERC20MinimalABI } from '../ABIs/IERC20Minimal.json';
import { abi as MellowMultiVaultRouterABI } from '../ABIs/MellowMultiVaultRouterABI.json';
import { sentryTracker } from '../utils/sentry';

export type MellowLpRouterArgs = {
  mellowRouterAddress: string; // live in env variable per router contract
  vaultIndices: number[]; // live in env variable per router contract
  defaultWeights: number[]; // live in env variable per router contract
  provider?: providers.Provider;
};

type BatchedDeposit = {
  author: string;
  amount: BigNumber;
};

class MellowLpRouter {
  public readonly mellowRouterAddress: string;
  public readonly vaultIndices: number[];
  public readonly defaultWeights: number[] = [];
  public readonly provider?: providers.Provider;

  public readOnlyContracts?: {
    token: Contract;
    mellowRouterContract: Contract;
    erc20RootVault: Contract[];
    erc20RootVaultGovernance: Contract[];
  };

  public writeContracts?: {
    token: Contract;
    erc20RootVault: Contract[];
    mellowRouter: Contract;
  };

  public signer?: Signer;

  public vaultCumulative?: number;
  public vaultCap?: number;

  public userCommittedDeposit?: number;
  public userPendingDeposit?: number;
  public userDeposit?: number;

  public userWalletBalance?: number;

  public userAddress?: string;

  public vaultInitialized = false;
  public userInitialized = false;

  public vaultsCount = 0;

  public constructor({
    mellowRouterAddress,
    vaultIndices,
    defaultWeights,
    provider,
  }: MellowLpRouterArgs) {
    this.mellowRouterAddress = mellowRouterAddress;
    this.vaultIndices = vaultIndices;
    this.defaultWeights = defaultWeights;
    this.provider = provider;
  }

  descale = (amount: BigNumberish, decimals: number): number => {
    return Number(ethers.utils.formatUnits(amount, decimals));
  };

  scale = (amount: number): BigNumber => {
    return ethers.utils.parseUnits(amount.toString(), this.tokenDecimals);
  };

  validateVaultIndices = (): boolean => {
    if (!this.vaultIndices.every((val, i, arr) => !i || arr[i - 1] <= val)) {
      // The vault indices array is not sorted
      return false;
    }

    if (this.vaultIndices.length !== new Set(this.vaultIndices).size) {
      // The vault indices array contains duplicate values
      return false;
    }

    if (this.vaultIndices.length === 0) {
      // The vault indices array is empty
      return false;
    }

    if (this.vaultIndices[0] < 0 || this.vaultIndices.slice(-1)[0] >= this.vaultsCount) {
      // The vault indices array contains out-of-range values
      return false;
    }

    return true;
  };

  validateWeights = (weights: number[]): boolean => {
    if (!weights.every((value) => Number.isInteger(value))) {
      // All values of default weights must be integer
      return false;
    }

    if (weights.length !== this.vaultIndices.length) {
      // Lengths of vault indices and default weights array do not match
      return false;
    }

    return true;
  };

  expandedWeights = (weights: number[]): number[] => {
    const expandedWeights = new Array(this.vaultsCount).fill(0);
    for (let i = 0; i < this.vaultIndices.length; i += 1) {
      expandedWeights[this.vaultIndices[i]] = weights[i];
    }

    return expandedWeights;
  };

  // NEXT: to offload this to subgraph
  vaultInit = async (): Promise<void> => {
    if (this.vaultInitialized) {
      console.log('The vault is already initialized');
      return;
    }

    if (isUndefined(this.provider)) {
      console.log('Stop here... No provider provided');
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

    console.log('token address:', tokenAddress);

    // erc20rootvault addresses
    let ERC20RootVaultAddresses: string[] = await mellowRouterContract.getVaults();
    this.vaultsCount = ERC20RootVaultAddresses.length;

    if (!this.validateVaultIndices()) {
      return;
    }

    if (!this.validateWeights(this.defaultWeights)) {
      return;
    }

    ERC20RootVaultAddresses = this.vaultIndices.map((index) => ERC20RootVaultAddresses[index]);

    // Map the addresses so that each of them is instantiated into a contract
    const erc20RootVaultContracts = ERC20RootVaultAddresses.map(
      (address: string) => new ethers.Contract(address, Erc20RootVaultABI, this.provider),
    );

    // Instantiate an empty array of addresses
    const erc20RootVaultGovernanceAddresses = [];
    for (const erc20RootVaultContract of erc20RootVaultContracts) {
      erc20RootVaultGovernanceAddresses.push(await erc20RootVaultContract.vaultGovernance());
    }

    // ERC20RootVaultGovernanceContracts stores every governance contract associated with this router
    const erc20RootVaultGovernanceContracts = erc20RootVaultGovernanceAddresses.map(
      (address: string) => new ethers.Contract(address, Erc20RootVaultGovernanceABI, this.provider),
    );

    this.readOnlyContracts = {
      token: tokenContract,
      erc20RootVault: erc20RootVaultContracts,
      erc20RootVaultGovernance: erc20RootVaultGovernanceContracts,
      mellowRouterContract,
    };

    console.log('Read-only contracts are ready');

    await this.refreshVaultCumulative();
    console.log('vault cumulative refreshed', this.vaultCumulative);
    console.log('vault cap refreshed', this.vaultCap);

    this.vaultInitialized = true;
  };

  userInit = async (signer: Signer): Promise<void> => {
    this.signer = signer;

    if (this.userInitialized) {
      console.log('The user is already initialized');
      return;
    }

    if (!this.vaultInitialized) {
      console.log('The vault should be initialized first');
      return;
    }

    if (isUndefined(this.readOnlyContracts)) {
      throw new Error('Uninitialized contracts.');
    }

    this.userAddress = await this.signer.getAddress();
    console.log('user address', this.userAddress);

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

    console.log('write contracts ready');

    await this.refreshUserDeposit();
    console.log('user deposit refreshed', this.userDeposit);
    await this.refreshWalletBalance();
    console.log('user wallet balance refreshed', this.userWalletBalance);

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

  refreshVaultCumulative = async (): Promise<void> => {
    this.vaultCumulative = 0;
    this.vaultCap = 0;

    if (isUndefined(this.readOnlyContracts)) {
      return;
    }

    for (const erc20RootVaultContract of this.readOnlyContracts.erc20RootVault) {
      const totalLpTokens = await erc20RootVaultContract.totalSupply();
      const tvl = await erc20RootVaultContract.tvl();
      console.log('accumulated (tvl):', tvl.minTokenAmounts[0].toString());

      const nft = await erc20RootVaultContract.nft();

      for (const erc20RootVaultGovernanceContract of this.readOnlyContracts
        .erc20RootVaultGovernance) {
        const strategyParams = await erc20RootVaultGovernanceContract.strategyParams(nft);
        console.log('governance contract address: ', erc20RootVaultGovernanceContract.address);
        console.log('strategy params:', strategyParams);
        console.log('token limit', strategyParams.tokenLimit.toString());

        const vaultCumulative = this.descale(tvl.minTokenAmounts[0], this.tokenDecimals);
        const vaultCap = this.descale(
          totalLpTokens.mul(toBn('1', 18)).div(strategyParams.tokenLimit),
          16,
        );

        console.log('vault cumulative:', vaultCumulative);
        console.log('vault cap:', vaultCap);

        this.vaultCumulative += vaultCumulative;
        this.vaultCap += vaultCap;
      }
    }
  };

  refreshUserCommittedDeposit = async (): Promise<void> => {
    this.userCommittedDeposit = 0;
    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.tokenDecimals)
    ) {
      return;
    }

    let lpTokensBalances: BigNumber[] =
      await this.readOnlyContracts.mellowRouterContract.getLPTokenBalances(this.userAddress);

    lpTokensBalances = this.vaultIndices?.map((index) => lpTokensBalances[index]);

    for (let i = 0; i < this.readOnlyContracts.erc20RootVault.length; i += 1) {
      const erc20RootVaultContract = this.readOnlyContracts.erc20RootVault[i];
      const lpTokensBalance = lpTokensBalances[i];

      const totalLpTokens = await erc20RootVaultContract.totalSupply();

      console.log('lp tokens', lpTokensBalance.toString());
      console.log('total lp tokens:', totalLpTokens);

      const tvl = await erc20RootVaultContract.tvl();
      console.log('tvl', tvl.toString());

      if (totalLpTokens.gt(0)) {
        const userFunds = lpTokensBalance.mul(tvl[0][0]).div(totalLpTokens);
        console.log('user committed funds:', userFunds.toString());
        const userCommittedDeposit = this.descale(userFunds, this.tokenDecimals);
        console.log('user committed deposit:', userCommittedDeposit);
        this.userCommittedDeposit += userCommittedDeposit;
      }
    }
  };

  refreshUserPendingDeposit = async (): Promise<void> => {
    this.userPendingDeposit = 0;
    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.tokenDecimals)
    ) {
      return;
    }

    for (let i = 0; i < this.readOnlyContracts.erc20RootVault.length; i += 1) {
      const batchedDeposits: BatchedDeposit[] =
        await this.readOnlyContracts.mellowRouterContract.getBatchedDeposits(this.vaultIndices[i]);

      const userBatchedDeposits: BatchedDeposit[] = batchedDeposits.filter(
        (batchedDeposit) => batchedDeposit.author.toLowerCase() === this.userAddress?.toLowerCase(),
      );

      console.log('user batched deposits:', userBatchedDeposits);

      const userPendingFunds = userBatchedDeposits.reduce(
        (sum, batchedDeposit) => sum.add(batchedDeposit.amount),
        BigNumber.from(0),
      );

      console.log('user pending funds:', userPendingFunds.toString());

      const userPendingDeposit = this.descale(userPendingFunds, this.tokenDecimals);
      console.log('user pending deposit:', userPendingDeposit);

      this.userPendingDeposit += userPendingDeposit;
    }
  };

  refreshUserDeposit = async (): Promise<void> => {
    await this.refreshUserCommittedDeposit();
    await this.refreshUserPendingDeposit();
    this.userDeposit = this.userCommittedDeposit;
    if (!isUndefined(this.userDeposit) && !isUndefined(this.userPendingDeposit)) {
      this.userDeposit += this.userPendingDeposit;
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
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Unsuccessful approval confirmation.');
      throw new Error('Unsuccessful approval confirmation.');
    }
  };

  deposit = async (
    amount: number,
    weights: number[] = this.defaultWeights,
  ): Promise<ContractReceipt> => {
    if (
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.writeContracts) ||
      isUndefined(this.userAddress)
    ) {
      throw new Error('Uninitialized contracts.');
    }

    if (!this.validateWeights(weights)) {
      throw new Error('Weights are invalid');
    }

    const expandedWeights = this.expandedWeights(weights);

    const scaledAmount = this.scale(amount);
    console.log(`Calling deposit(${scaledAmount})...`);
    console.log('Weights', expandedWeights);

    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH) {
      tempOverrides.value = scaledAmount;
    }

    try {
      if (this.isETH) {
        this.writeContracts.mellowRouter.callStatic.depositEth(expandedWeights, tempOverrides);
      } else {
        await this.writeContracts.mellowRouter.callStatic.depositErc20(
          scaledAmount,
          expandedWeights,
        );
      }
    } catch (error) {
      console.log('ERROR', error);
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Unsuccessful deposit simulation.');
      throw new Error('Unsuccessful deposit simulation.');
    }

    if (this.isETH) {
      const gasLimit = await this.writeContracts.mellowRouter.estimateGas.depositEth(
        expandedWeights,
        tempOverrides,
      );
      tempOverrides.gasLimit = getGasBuffer(gasLimit);
    } else {
      const gasLimit = await this.writeContracts.mellowRouter.estimateGas.depositErc20(
        scaledAmount,
        expandedWeights,
        tempOverrides,
      );
      tempOverrides.gasLimit = getGasBuffer(gasLimit);
    }

    const tx = this.isETH
      ? await this.writeContracts.mellowRouter.depositEth(expandedWeights, tempOverrides)
      : await this.writeContracts.mellowRouter.depositErc20(
          scaledAmount,
          expandedWeights,
          tempOverrides,
        );

    try {
      const receipt = await tx.wait();

      try {
        await this.refreshWalletBalance();
      } catch (error) {
        sentryTracker.captureException(error);
        sentryTracker.captureMessage('Wallet user balance failed to refresh after deposit');
        console.error('Wallet user balance failed to refresh after deposit');
      }

      return receipt;
    } catch (error) {
      console.log('ERROR', error);
      sentryTracker.captureException(error);
      sentryTracker.captureMessage('Unsuccessful deposit confirmation.');
      throw new Error('Unsuccessful deposit confirmation.');
    }
  };
}

export default MellowLpRouter;
