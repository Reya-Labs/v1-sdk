/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable object-shorthand */
import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { before, describe, it } from 'mocha';
import { expect } from 'chai';
import { network, waffle } from 'hardhat';
import { isUndefined } from 'lodash';
import MellowLpRouter from '../src/entities/mellowLpRouter';
import { abi as MellowMultiVaultRouterABI } from '../src/ABIs/MellowMultiVaultRouterABI.json';
import { abi as Erc20RootVaultABI } from '../src/ABIs/Erc20RootVault.json';

const { provider } = waffle;
let ethMellowLpRouter: MellowLpRouter;
let erc20MellowLpRouter: MellowLpRouter;
let localMellowRouterContract: Contract;

const depositAmount = 10; // Set a default 10 ETH constant for use in tests;
const MellowRouterAddress = '0x631cad693b6f0463b2c2729299fcca8731553bb4';
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
      mellowRouterAddress: MellowRouterAddress,
      defaultWeights: defaultWeights,
      provider,
    });

    await ethMellowLpRouter.vaultInit();

    // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
    await ethMellowLpRouter.userInit(userWallet);

    localMellowRouterContract = new ethers.Contract(
      MellowRouterAddress,
      MellowMultiVaultRouterABI,
      signer,
    );
  });

  beforeEach(async function resetNetworkFork() {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.GOERLI_URL,
          },
        },
      ],
    });
  });

  describe('Deposit Scenarios', async () => {
    it('Check that vault has been initialised correctly', async () => {
      expect(ethMellowLpRouter.vaultInitialized).to.be.eq(true);

      const tokenAddress = await localMellowRouterContract.token();
      expect(ethMellowLpRouter.readOnlyContracts?.token.address).to.be.eq(tokenAddress);

      const erc20RootVaultAddresses = await localMellowRouterContract.getVaults();
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
        localMellowRouterContract.address,
      );
    });

    it('Check that user has been initialised correctly', async () => {
      expect(ethMellowLpRouter.writeContracts?.mellowRouter.address).to.be.eq(
        localMellowRouterContract.address,
      );
      const erc20RootVaultAddresses = await localMellowRouterContract.getVaults();
      expect(ethMellowLpRouter.writeContracts?.erc20RootVault[0].address).to.be.eq(
        erc20RootVaultAddresses[0],
      );

      const tokenAddress = await localMellowRouterContract.token();
      expect(ethMellowLpRouter.readOnlyContracts?.token.address).to.be.eq(tokenAddress);
    });

    it('User deposits eth into router contract with even split', async () => {
      const weights = [50, 50]; // Needs to sum to 100

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(depositAmount, weights);

      // Router gets the batched deposits
      const batchedDeposit =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits();
      // eslint-disable-next-line
      console.log("Get batched deposits in router contract: ", batchedDeposit.toString());

      // Submit the batch of deposits from the router to the erc20 root vault
      await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(0);

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      const userLpTokenBalance =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(userWallet.address);
      // eslint-disable-next-line
      console.log('user LP token balance in Router: ', userLpTokenBalance.toString());

      const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

      const tvl: BigNumber[] = [];
      if (!isUndefined(erc20RootVaultContracts)) {
        for (const erc20RootVaultContract of erc20RootVaultContracts) {
          // eslint-disable-next-line
          console.log(erc20RootVaultContract.address);

          tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
          // eslint-disable-next-line
          console.log(tvl.toString());
        }
      }
      // eslint-disable-next-line
      console.log("Printing tvl list of all erc20 root vaults: ", tvl );

      expect(tvl[0]).to.be.eq('11673207775126148888');
      expect(tvl[1]).to.be.eq('11673207775126148888');

      expect(userLpTokenBalance[0]).to.be.eq(BigNumber.from('4898906633876018356'));
      expect(userLpTokenBalance[1]).to.be.eq(BigNumber.from('4898906633876018355'));
    });

    it('User deposits eth into router contract uneven split', async () => {
      const weights = [100, 0];

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(depositAmount, weights);

      // Router gets the batched deposits
      const batchedDeposit =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits();
      // eslint-disable-next-line
      console.log("Get batched deposits in router contract: ", batchedDeposit.toString());

      // Submit the batch of deposits from the router to the erc20 root vault
      await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(0);

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      const userLpTokenBalance =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(userWallet.address);
      // eslint-disable-next-line
      console.log('user LP token balance in Router: ', userLpTokenBalance.toString());

      const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

      const tvl: BigNumber[] = [];
      if (!isUndefined(erc20RootVaultContracts)) {
        for (const erc20RootVaultContract of erc20RootVaultContracts) {
          // eslint-disable-next-line
          console.log(erc20RootVaultContract.address);

          tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
          // eslint-disable-next-line
          console.log(tvl.toString());
        }
      }
      // eslint-disable-next-line
      console.log("Printing tvl list of all erc20 root vaults: ", tvl);

      // For each vault
      expect(tvl[0]).to.be.eq('11673207775126148890');
      expect(tvl[1]).to.be.eq('11673207775126148890');

      // For each vault
      expect(userLpTokenBalance[0]).to.be.eq(BigNumber.from('9797813267752036713'));
      expect(userLpTokenBalance[1]).to.be.eq(BigNumber.from('0'));
    });

    it('User deposits eth into router without specifying weights', async () => {
      // User deposits funds into the router
      await ethMellowLpRouter.deposit(depositAmount);

      // Router gets the batched deposits
      const batchedDeposit =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits();
      // eslint-disable-next-line
      console.log("Get batched deposits in router contract: ", batchedDeposit.toString());

      // Submit the batch of deposits from the router to the erc20 root vault
      await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(0);

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      const userLpTokenBalance =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(userWallet.address);
      // eslint-disable-next-line
      console.log('user LP token balance in Router: ', userLpTokenBalance.toString());

      const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

      const tvl: BigNumber[] = [];
      if (!isUndefined(erc20RootVaultContracts)) {
        for (const erc20RootVaultContract of erc20RootVaultContracts) {
          // eslint-disable-next-line
          console.log(erc20RootVaultContract.address);

          tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
          // eslint-disable-next-line
          console.log(tvl.toString());
        }
      }
      // eslint-disable-next-line
      console.log("Printing tvl list of all erc20 root vaults: ", tvl);

      // For each vault
      expect(tvl[0]).to.be.eq('11673207775126148888');
      expect(tvl[1]).to.be.eq('11673207775126148888');

      // For each vault
      expect(userLpTokenBalance[0]).to.be.eq(BigNumber.from('4898906633876018356'));
      expect(userLpTokenBalance[1]).to.be.eq(BigNumber.from('4898906633876018355'));
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
});
