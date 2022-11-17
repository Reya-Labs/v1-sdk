/* eslint-disable object-shorthand */
import { ethers, Wallet } from 'ethers';
import { before, describe, it } from 'mocha';
import { expect } from 'chai';
import { waffle } from 'hardhat';
import MellowLpRouter from '../src/entities/mellowLpRouter';
import { abi as MellowMultiVaultRouterABI } from '../src/ABIs/MellowMultiVaultRouterABI.json';

const { provider } = waffle;
let mellowLpRouter: MellowLpRouter;

const mellowRouterAddress = '';
const defaultWeights: number[] = [];
const erc20RootVaultAddress = '';
const erc20RootVaultGovernanceAddress = '';

const signer = new Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  provider,
); // at address - 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

const userWallet = signer;

describe('Mellow Router Test Suite', () => {
  before('Setting up the suite', async () => {
    mellowLpRouter = new MellowLpRouter({
      mellowRouterAddress: mellowRouterAddress,
      defaultWeights: defaultWeights,
      erc20RootVaultAddress: erc20RootVaultAddress,
      erc20RootVaultGovernanceAddress: erc20RootVaultGovernanceAddress,
      provider,
    });

    // Initialise the mellow vault
    await mellowLpRouter.vaultInit();

    // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
    await mellowLpRouter.userInit(userWallet);
  });
  it('Dummy test', () => {
    expect(1).to.be.eq(1);
  });
  it('Check that vault has been initialised correctly', async () => {
    const mellowRouter = mellowLpRouter;
    expect(mellowRouter.vaultInitialized).to.be.eq(true);

    // Get the router contract (we can get this from a json once everything is deployed)
    const mellowRouterContract = new ethers.Contract(
      mellowRouterAddress,
      MellowMultiVaultRouterABI,
      provider,
    );

    const tokenAddress = await mellowRouterContract.token();
    expect(mellowRouter.readOnlyContracts?.token.address).to.be.eq(tokenAddress);
  });

  it('Check that user has been initialised correctly', async () => {
    const mellowRouter = mellowLpRouter;

    // Get the router contract
    const mellowRouterContract = new ethers.Contract(
      mellowRouterAddress,
      MellowMultiVaultRouterABI,
      provider,
    );

    expect(mellowRouter.writeContracts?.mellowRouter.address).to.be.eq(
      mellowRouterContract.address,
    );
  });

  it('User deposits funds into router contract with equal split', async () => {
    const mellowRouter = mellowLpRouter;
    const amount = ethers.constants.One.toNumber();
    const weights = [0.2, 0.8]; // Need to know how many different maturities there are to know the split

    await mellowRouter.deposit(amount, weights);

    const userWalletBalanceBefore = await userWallet.getBalance();
    const userWalletBalanceAfter = userWalletBalanceBefore.toNumber() - 1;

    expect(userWalletBalanceBefore).to.be.eq(userWalletBalanceAfter);
  });
});
