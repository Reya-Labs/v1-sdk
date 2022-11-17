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

export type MellowLpRouterArgs = {
  mellowRouterAddress: string;
  defaultWeights: number[]; // live in env variable per router contract
  erc20RootVaultAddress: string;
  erc20RootVaultGovernanceAddress: string;
  provider?: providers.Provider;
};

class MellowLpRouter {
  public readonly mellowRouterAddress: string;
  public readonly erc20RootVaultAddress: string;
  public readonly erc20RootVaultGovernanceAddress: string;
  public readonly provider?: providers.Provider;

  public defaultWeights: number[] = [];

  public readOnlyContracts?: {
    token: Contract;
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

  public userDeposit?: number;
  public userWalletBalance?: number;

  public userAddress?: string;

  public vaultInitialized = false;
  public userInitialized = false;

  public constructor({
    mellowRouterAddress,
    defaultWeights,
    erc20RootVaultAddress,
    erc20RootVaultGovernanceAddress,
    provider,
  }: MellowLpRouterArgs) {
    this.mellowRouterAddress = mellowRouterAddress;
    this.defaultWeights = defaultWeights;
    this.erc20RootVaultAddress = erc20RootVaultAddress;
    this.erc20RootVaultGovernanceAddress = erc20RootVaultGovernanceAddress;
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
    const getERC20RootVaultAddresses = await mellowRouterContract.getVaults();

    // Map the addresses so that each of them is instantiated into a contract
    const erc20RootVaultContracts = getERC20RootVaultAddresses.map(
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
      token: this.readOnlyContracts.token,
      erc20RootVault: this.readOnlyContracts.erc20RootVault,
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

  // TODO: to be changed for multi vault support
  refreshVaultCumulative = async (): Promise<void> => {
    if (isUndefined(this.readOnlyContracts)) {
      this.vaultCumulative = 0;
      this.vaultCap = 0;
      return;
    }

    let vaultCounter = 0;
    const totalLpTokens = [];
    const tvl = [];
    const nft = [];
    const strategyParams = [];
    for (const erc20RootVaultContract of this.readOnlyContracts.erc20RootVault) {
      // Add totalSupply of tokens of ith vault into this array
      totalLpTokens.push(await erc20RootVaultContract.totalSupply());

      // Check if the supply is 0
      if (totalLpTokens[vaultCounter].eq(0)) {
        this.vaultCumulative = 0;
        this.vaultCap = 0;
        return;
      }

      // Add the tvl of the ith vault into this array
      tvl.push(await erc20RootVaultContract.tvl());
      console.log('accumulated (tvl):', tvl[vaultCounter].minTokenAmounts[0].toString());

      // Add the nft of the ith vault into this array
      nft.push(await erc20RootVaultContract.nft());

      // Add the strategy params of the ith vault into this array
      strategyParams.push(await erc20RootVaultContract.strategyParams(nft[vaultCounter]));
      console.log('strategy params:', strategyParams);
      console.log('token limit', strategyParams[vaultCounter].tokenLimit.toString());

      this.vaultCumulative = this.descale(tvl[vaultCounter].minTokenAmounts[0], this.tokenDecimals);
      this.vaultCap = this.descale(
        totalLpTokens[vaultCounter].mul(toBn('1', 18)).div(strategyParams[vaultCounter].tokenLimit),
        16,
      );

      vaultCounter += 1;
    }
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

    let vaultCounter = 0;
    const lpTokensBalance = [];
    const totalLpTokens = [];
    const tvl = [];

    for (const erc20RootVaultContract of this.readOnlyContracts.erc20RootVault) {
      lpTokensBalance.push(await erc20RootVaultContract.balanceOf(this.userAddress));

      totalLpTokens.push(await erc20RootVaultContract.totalSupply());

      console.log('lp tokens', lpTokensBalance[vaultCounter].toString());
      console.log('total lp tokens:', totalLpTokens);

      tvl.push(await erc20RootVaultContract.tvl());
      console.log('tvl', tvl[vaultCounter].toString());

      if (totalLpTokens[vaultCounter].gt(0)) {
        const userFunds = lpTokensBalance[vaultCounter].mul(tvl[0][0]).div(totalLpTokens);
        console.log('user funds:', userFunds.toString());
        this.userDeposit = this.descale(userFunds, this.tokenDecimals);
      } else {
        this.userDeposit = 0;
      }

      vaultCounter += 1;
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

  isTokenApproved = async (): Promise<boolean[]> => {
    if (this.isETH) {
      return [true];
    }

    if (
      isUndefined(this.userAddress) ||
      isUndefined(this.readOnlyContracts) ||
      isUndefined(this.tokenDecimals)
    ) {
      return [false];
    }

    const tokenApprovalAllowance = [];
    let vaultCounter = 0;
    for (const tokenApprovalPerVault of this.readOnlyContracts.erc20RootVault) {
      tokenApprovalAllowance.push(
        await this.readOnlyContracts.token.allowance(
          this.userAddress,
          tokenApprovalPerVault[vaultCounter].address,
        ),
      );
      vaultCounter += 1;
    }

    return tokenApprovalAllowance.map((approvalAmount: BigNumber) =>
      approvalAmount.gte(TresholdApprovalBn),
    );
  };

  approveToken = async (): Promise<ContractReceipt[]> => {
    if (isUndefined(this.readOnlyContracts) || isUndefined(this.writeContracts)) {
      throw new Error('Uninitialized contracts.');
    }

    try {
      const tokenApprovalsPerVault = [];
      let vaultCounter = 0;

      for (const ercVault of this.readOnlyContracts.erc20RootVault) {
        tokenApprovalsPerVault.push(
          await this.writeContracts.token.callStatic.approve(
            ercVault[vaultCounter].address,
            MaxUint256Bn,
          ),
        );

        vaultCounter += 1;
      }
    } catch (_) {
      throw new Error('Unsuccessful approval simulation.');
    }

    const gasLimit = [];
    const txs = [];
    let vaultCounter = 0;

    for (const erc20Vault of this.readOnlyContracts.erc20RootVault) {
      gasLimit.push(
        await this.writeContracts.token.estimateGas.approve(
          erc20Vault[vaultCounter].address,
          MaxUint256Bn,
        ),
      );

      txs.push(
        await this.writeContracts.token.approve(erc20Vault[vaultCounter].address, MaxUint256Bn, {
          gasLimit: getGasBuffer(gasLimit[vaultCounter]),
        }),
      );

      vaultCounter += 1;
    }

    try {
      const receipts = [];
      for (let i = 0; i < this.readOnlyContracts.erc20RootVault.length; i += 1) {
        receipts.push(await txs[vaultCounter].wait());
      }

      return receipts;
    } catch (_) {
      throw new Error('Unsucessful approval confirmation.');
    }
  };

  // Here the deposit should no longer go to the wrapper contract but to the router contract
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

    const scaledAmount = this.scale(amount);
    console.log(`Calling deposit(${scaledAmount})...`);

    const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

    if (this.isETH) {
      tempOverrides.value = scaledAmount;
    }

    try {
      if (this.isETH) {
        this.writeContracts.mellowRouter.callStatic.depositEth(weights, tempOverrides);
      } else {
        await this.writeContracts.mellowRouter.callStatic.depositErc20([scaledAmount], weights);
      }
    } catch (err) {
      console.log('ERROR', err);
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
        [scaledAmount],
        weights,
      );
      tempOverrides.gasLimit = getGasBuffer(gasLimit);
    }

    const tx = this.isETH
      ? await this.writeContracts.mellowRouter.depositEth(weights, tempOverrides)
      : await this.writeContracts.mellowRouter.depositErc20([scaledAmount], weights); // tempOverrides

    try {
      const receipt = await tx.wait();

      try {
        await this.refreshWalletBalance();
      } catch (_) {
        console.error('Wallet user balance failed to refresh after deposit');
      }

      return receipt;
    } catch (err) {
      console.log('ERROR', err);
      throw new Error('Unsucessful deposit confirmation.');
    }
  };
}

export default MellowLpRouter;
