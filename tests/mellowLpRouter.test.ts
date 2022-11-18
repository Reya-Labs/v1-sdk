/* eslint-disable object-shorthand */
import { BigNumber, ethers, Wallet } from 'ethers';
import { before, describe, it } from 'mocha';
import { expect } from 'chai';
import { waffle } from 'hardhat';
import MellowLpRouter from '../src/entities/mellowLpRouter';
import { abi as MellowMultiVaultRouterABI } from '../src/ABIs/MellowMultiVaultRouterABI.json';
import { abi as Erc20RootVaultABI } from '../src/ABIs/Erc20RootVault.json';

const { provider } = waffle;
let ethMellowLpRouter: MellowLpRouter;
let erc20MellowLpRouter: MellowLpRouter;

const depositAmount = 10; // Set a default 1 ETH constant for use in tests;
const ethMellowRouterAddress = '0x631cad693b6f0463b2c2729299fcca8731553bb4';
// const erc20MellowRouterAddress = '';
const defaultWeights: number[] = [50, 50]; // default even split between 2 pools

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

    // erc20MellowLpRouter = new MellowLpRouter({
    //   mellowRouterAddress: erc20MellowRouterAddress,
    //   defaultWeights: defaultWeights,
    //   provider,
    // });
    // Initialise the mellow vault
    await ethMellowLpRouter.vaultInit();

    // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
    await ethMellowLpRouter.userInit(userWallet);
  });

  describe('ETH POOLS', async () => {
    it('Check that vault has been initialised correctly', async () => {
      expect(ethMellowLpRouter.vaultInitialized).to.be.eq(true);

      // Get the router contract (we can get this from a json once everything is deployed)
      const mellowRouterContract = new ethers.Contract(
        ethMellowRouterAddress,
        MellowMultiVaultRouterABI,
        provider,
      );

      const tokenAddress = await mellowRouterContract.token();
      expect(ethMellowLpRouter.readOnlyContracts?.token.address).to.be.eq(tokenAddress);

      const erc20RootVaultAddresses = await mellowRouterContract.getVaults();
      expect(ethMellowLpRouter.readOnlyContracts?.erc20RootVault[0].address).to.be.eq(
        erc20RootVaultAddresses[0],
      );

      const erc20RootVaultGovernanceContract = new ethers.Contract(
        erc20RootVaultAddresses[0],
        Erc20RootVaultABI,
        provider,
      );
      const erc20RootVaultGovernanceAddress =
        await erc20RootVaultGovernanceContract.vaultGovernance();
      expect(ethMellowLpRouter.readOnlyContracts?.erc20RootVaultGovernance[0].address).to.be.eq(
        erc20RootVaultGovernanceAddress,
      );

      expect(ethMellowLpRouter.readOnlyContracts?.mellowRouterContract.address).to.be.eq(
        mellowRouterContract.address,
      );
    });

    it('Check that user has been initialised correctly', async () => {
      // Get the router contract
      const mellowRouterContract = new ethers.Contract(
        ethMellowRouterAddress,
        MellowMultiVaultRouterABI,
        provider,
      );

      expect(ethMellowLpRouter.writeContracts?.mellowRouter.address).to.be.eq(
        mellowRouterContract.address,
      );
      const erc20RootVaultAddresses = await mellowRouterContract.getVaults();
      expect(ethMellowLpRouter.writeContracts?.erc20RootVault[0].address).to.be.eq(
        erc20RootVaultAddresses[0],
      );

      const tokenAddress = await mellowRouterContract.token();
      expect(ethMellowLpRouter.readOnlyContracts?.token.address).to.be.eq(tokenAddress);
    });

    it('User deposits eth into router contract with even split', async () => {
      const weights = [50, 50]; // Needs to sum to 100

      const receipt = await ethMellowLpRouter.deposit(depositAmount, weights);
      // eslint-disable-next-line
      console.log("tx hash: ", receipt.transactionHash);
      // fails at the moment because goerli caps are not set
      expect(ethMellowLpRouter.vaultCap).to.be.greaterThan(ethMellowLpRouter.vaultCumulative);
    });
    it('User deposits eth into router contract uneven split', async () => {
      const weights = [100, 0];
      await ethMellowLpRouter.deposit(depositAmount, weights);
    });

    it('User deposits eth into router without specifying weights', async () => {
      await ethMellowLpRouter.deposit(depositAmount);
    });

    it('Is token approved?', async () => {
      expect(await ethMellowLpRouter.isTokenApproved()).to.be.eq(true);
    });

    it('Have we scaled properly?', async () => {
      const amount = 1;
      expect(ethMellowLpRouter.scale(amount)).to.be.eq(BigNumber.from('1000000000000000000'));
    });
    it('Have we descaled properly?', async () => {
      const amount = BigNumber.from('1000000000000000000');
      expect(ethMellowLpRouter.descale(amount, 18)).to.be.eq(BigNumber.from('1'));
    });
  });

  describe('ERC20 DEPOSITS', async () => {
    it('User deposits ERC20 into router with even split', async () => {
      const mellowRouter = erc20MellowLpRouter;
      const weights = [50, 50];

      await mellowRouter.deposit(depositAmount, weights);
    });

    it('User deposits ERC20 into router with uneven split', async () => {
      const mellowRouter = erc20MellowLpRouter;
      const weights = [100, 0];

      await mellowRouter.deposit(depositAmount, weights);
    });

    it('User deposits ERC20 into router without specifying weights', async () => {
      const mellowRouter = erc20MellowLpRouter;

      await mellowRouter.deposit(depositAmount);
    });
  });
});
