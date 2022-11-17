/* eslint-disable object-shorthand */
import { ethers, Wallet } from 'ethers';
import { before, describe, it } from 'mocha';
import { expect } from 'chai';
import { waffle } from 'hardhat';
import MellowLpRouter from '../src/entities/mellowLpRouter';
import { abi as MellowMultiVaultRouterABI } from '../src/ABIs/MellowMultiVaultRouterABI.json';

const { provider } = waffle;
let ethMellowLpRouter: MellowLpRouter;
let erc20MellowLpRouter: MellowLpRouter;

const depositAmount = 1; // Set a default 1 ETH constant for use in tests;
const ethMellowRouterAddress = '';
const erc20MellowRouterAddress = '';
const defaultWeights: number[] = [0.5, 0.5]; // default even split between 2 pools

const signer = new Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  provider,
); // at address - 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

const userWallet = signer;

describe('Mellow Router Test Suite', () => {
  before('Setting up the suite', async () => {
    ethMellowLpRouter = new MellowLpRouter({
      mellowRouterAddress: ethMellowRouterAddress,
      defaultWeights: defaultWeights,
      provider,
    });

    erc20MellowLpRouter = new MellowLpRouter({
      mellowRouterAddress: erc20MellowRouterAddress,
      defaultWeights: defaultWeights,
      provider,
    });
    // Initialise the mellow vault
    await ethMellowLpRouter.vaultInit();

    // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
    await ethMellowLpRouter.userInit(userWallet);
  });

  describe('ETH POOLS', async () => {
    it('Check that vault has been initialised correctly', async () => {
      const mellowRouter = ethMellowLpRouter;
      expect(mellowRouter.vaultInitialized).to.be.eq(true);

      // Get the router contract (we can get this from a json once everything is deployed)
      const mellowRouterContract = new ethers.Contract(
        ethMellowRouterAddress,
        MellowMultiVaultRouterABI,
        provider,
      );

      const tokenAddress = await mellowRouterContract.token();
      expect(mellowRouter.readOnlyContracts?.token.address).to.be.eq(tokenAddress);
    });

    it('Check that user has been initialised correctly', async () => {
      const mellowRouter = ethMellowLpRouter;

      // Get the router contract
      const mellowRouterContract = new ethers.Contract(
        ethMellowRouterAddress,
        MellowMultiVaultRouterABI,
        provider,
      );

      expect(mellowRouter.writeContracts?.mellowRouter.address).to.be.eq(
        mellowRouterContract.address,
      );
    });

    it('User deposits eth into router contract with uneven split', async () => {
      const mellowRouter = ethMellowLpRouter;
      const weights = [0.2, 0.8]; // Need to know how many different maturities there are to know the split

      await mellowRouter.deposit(depositAmount, weights);

      const userWalletBalanceBefore = await userWallet.getBalance();
      const userWalletBalanceAfter = userWalletBalanceBefore.toNumber() - 1;

      expect(userWalletBalanceBefore).to.be.eq(userWalletBalanceAfter);
    });
    it('User deposits eth into router contract 1:0 split', async () => {
      const mellowRouter = ethMellowLpRouter;
      const weights = [1, 0];

      await mellowRouter.deposit(depositAmount, weights);
    });

    it('User deposits eth into router without specifying weights', async () => {
      const mellowRouter = ethMellowLpRouter;

      const receipt = await mellowRouter.deposit(depositAmount);
      // expect the default weights to be used here and the transaction to not fail
      expect(receipt).to.be.a('Promise<ContractReceipt>');
    });
  });

  describe('ERC20 DEPOSITS', async () => {
    it('User deposits ERC20 into router with uneven split', async () => {
      const mellowRouter = erc20MellowLpRouter;
      const weights = [0.2, 0.8];

      await mellowRouter.deposit(depositAmount, weights);
    });

    it('User deposits ERC20 into router with 1:0 split', async () => {
      const mellowRouter = erc20MellowLpRouter;
      const weights = [1, 0];

      await mellowRouter.deposit(depositAmount, weights);
    });

    it('User deposits ERC20 into router without specifying weights', async () => {
      const mellowRouter = erc20MellowLpRouter;

      await mellowRouter.deposit(depositAmount);
    });
  });
});
