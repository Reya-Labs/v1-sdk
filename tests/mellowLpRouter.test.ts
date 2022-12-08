/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { network, waffle } from 'hardhat';
import { isUndefined } from 'lodash';
import MellowLpRouter from '../src/entities/mellowLpRouter';
import { abi as MellowMultiVaultRouterABI } from '../src/ABIs/MellowMultiVaultRouterABI.json';
import { abi as Erc20RootVaultABI } from '../src/ABIs/Erc20RootVault.json';
import { abi as WethABI } from '../src/ABIs/WethABI.json';
import { withSigner } from './utils';

const { provider } = waffle;
let ethMellowLpRouter: MellowLpRouter;

let localMellowRouterContract: Contract;

const depositAmount = 10; // Set a default 10 ETH constant for use in tests;
const MellowRouterAddress = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
const defaultWeights: number[] = [50, 50]; // default even split between 2 pools

const signer = new Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  provider,
); // at address - 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

const userWallet = signer;

describe('Mellow Router Test Suite', () => {
  const resetNetwork = async () => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          chainId: 5,
          forking: {
            jsonRpcUrl: process.env.GOERLI_URL,
            blockNumber: 7992457,
          },
        },
      ],
    });
  };

  beforeEach('Reset Network & Setup Router Contract', async () => {
    await resetNetwork();

    localMellowRouterContract = new ethers.Contract(
      MellowRouterAddress,
      MellowMultiVaultRouterABI,
      signer,
    );

    await withSigner(
      network,
      await localMellowRouterContract.owner(),
      async (routerOwnerSigner) => {
        await localMellowRouterContract
          .connect(routerOwnerSigner)
          .addVault((await localMellowRouterContract.getVaults())[0]);
      },
    );
  });

  describe('Invalid vault initialisation scenarios', async () => {
    it('Weights values are not all integer', async () => {
      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        defaultWeights: [49.5, 50.5],
        provider,
      });

      await ethMellowLpRouter.vaultInit();
      expect(ethMellowLpRouter.vaultInitialized).to.be.eq(false);
    });

    it('Length of default weights arrays does not match', async () => {
      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        defaultWeights: [100],
        provider,
      });

      await ethMellowLpRouter.vaultInit();
      expect(ethMellowLpRouter.vaultInitialized).to.be.eq(false);
    });
  });

  describe('Deposit Scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        defaultWeights,
        provider,
      });

      await ethMellowLpRouter.vaultInit();

      // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
      await ethMellowLpRouter.userInit(userWallet);
    });

    it('Check that vault has been initialised correctly', async () => {
      expect(ethMellowLpRouter.vaultInitialized).to.be.eq(true);
      expect(ethMellowLpRouter.readOnlyContracts?.token.address).to.be.eq(
        '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      );

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
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        const batchedDeposit =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
        expect(batchedDeposit.length).to.be.eq(1);
        expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
        expect(batchedDeposit[0][1]).to.be.eq(
          BigNumber.from(depositAmount).mul('1000000000000000000').div(2),
        );

        // eslint-disable-next-line
        console.log(`Batched deposits in router for vault index ${vaultIndex}: ${batchedDeposit.toString()}`);
      }

      // Make sure the user LP token balance before batch submission is 0 for each vault
      expect(
        (
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet.address,
          )
        ).toString(),
      ).to.be.eq('0,0');

      // Submit the batch of deposits from the router to the erc20 root vaults
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
      }

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      const userLpTokenBalance =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(userWallet.address);
      expect(userLpTokenBalance[0]).to.be.eq('5000000000000000000');
      expect(userLpTokenBalance[1]).to.be.eq('5000000000000000000');
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
      console.log('Printing tvl list of all erc20 root vaults: ', tvl);

      expect(tvl[0]).to.be.eq('10010000000000000000');
      expect(tvl[1]).to.be.eq('10010000000000000000');
    });

    it('User deposits eth into router contract uneven split', async () => {
      const weights = [100, 0];

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(depositAmount, weights);

      // Router gets the batched deposits
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        const batchedDeposit =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
        expect(batchedDeposit.length).to.be.eq(1 - vaultIndex);
        if (batchedDeposit.length) {
          expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
          expect(batchedDeposit[0][1]).to.be.eq(
            BigNumber.from(depositAmount)
              .mul('1000000000000000000')
              .mul(1 - vaultIndex),
          );
        }

        // eslint-disable-next-line
        console.log(`Batched deposits in router for vault index ${vaultIndex}: ${batchedDeposit.toString()}`);
      }

      // Make sure the user LP token balance before batch submission is 0 for each vault
      expect(
        (
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet.address,
          )
        ).toString(),
      ).to.be.eq('0,0');

      // Submit the batch of deposits from the router to the erc20 root vaults
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
      }

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      const userLpTokenBalance =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(userWallet.address);
      expect(userLpTokenBalance[0]).to.be.eq('10000000000000000000');
      expect(userLpTokenBalance[1]).to.be.eq('0');
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
      console.log('Printing tvl list of all erc20 root vaults: ', tvl);

      // For each vault
      expect(tvl[0]).to.be.eq('10010000000000000000');
      expect(tvl[1]).to.be.eq('10010000000000000000');

      // For each vault
      expect(userLpTokenBalance[0]).to.be.eq(BigNumber.from('10000000000000000000'));
      expect(userLpTokenBalance[1]).to.be.eq(BigNumber.from('0'));
    });

    it('User deposits eth into router without specifying weights', async () => {
      // User deposits funds into the router
      await ethMellowLpRouter.deposit(depositAmount);

      // Router gets the batched deposits
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        const batchedDeposit =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
        expect(batchedDeposit.length).to.be.eq(1);
        expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
        expect(batchedDeposit[0][1]).to.be.eq(
          BigNumber.from(depositAmount).mul('1000000000000000000').div(2),
        );

        // eslint-disable-next-line
        console.log(`Batched deposits in router for vault index ${vaultIndex}: ${batchedDeposit.toString()}`);
      }

      // Make sure the user LP token balance before batch submission is 0 for each vault
      expect(
        (
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet.address,
          )
        ).toString(),
      ).to.be.eq('0,0');

      // Submit the batch of deposits from the router to the erc20 root vaults
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
      }

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      const userLpTokenBalance =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(userWallet.address);
      expect(userLpTokenBalance[0]).to.be.eq('5000000000000000000');
      expect(userLpTokenBalance[1]).to.be.eq('5000000000000000000');
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
      console.log('Printing tvl list of all erc20 root vaults: ', tvl);

      // For each vault
      expect(tvl[0]).to.be.eq('10010000000000000000');
      expect(tvl[1]).to.be.eq('10010000000000000000');

      // For each vault
      expect(userLpTokenBalance[0]).to.be.eq(BigNumber.from('5000000000000000000'));
      expect(userLpTokenBalance[1]).to.be.eq(BigNumber.from('5000000000000000000'));
    });

    it('Have we scaled properly?', async () => {
      const amount = 1;
      expect(ethMellowLpRouter.scale(amount)).to.be.eq(BigNumber.from('1000000000000000000'));
    });

    it('Have we descaled properly?', async () => {
      const amount = BigNumber.from('1000000000000000000');
      expect(ethMellowLpRouter.descale(amount, 18)).to.be.eq(BigNumber.from('1'));
    });

    describe('ERC20 Deposits', async () => {
      beforeEach('Convert eth to weth and approve weth to router', async () => {
        const tokenAddress = ethMellowLpRouter.readOnlyContracts?.token.address;
        if (!isUndefined(tokenAddress)) {
          const wethContract = new ethers.Contract(tokenAddress, WethABI, signer);

          // convert 10 ETH in WETH
          await wethContract.deposit({
            value: ethers.utils.parseEther('10'),
          });
          // approve 10 WETH to the router
          await ethMellowLpRouter.writeContracts?.token.approve(
            ethMellowLpRouter.mellowRouterAddress,
            ethers.utils.parseEther('10'),
          );
        }
      });

      it('User deposits erc20 into router with even split', async () => {
        // Check if WETH is approved to router from the beforeEach statement
        expect(await ethMellowLpRouter.isTokenApproved()).to.be.eq(true);
        // User deposits funds into the router
        await ethMellowLpRouter.deposit(depositAmount);

        // Router gets the batched deposits
        for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
          const batchedDeposit =
            await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
          expect(batchedDeposit.length).to.be.eq(1);
          expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
          expect(batchedDeposit[0][1]).to.be.eq(
            BigNumber.from(depositAmount).mul('1000000000000000000').div(2),
          );

          // eslint-disable-next-line
          console.log(`Batched deposits in router for vault index ${vaultIndex}: ${batchedDeposit.toString()}`);
        }

        // Make sure the user LP token balance before batch submission is 0 for each vault
        expect(
          (
            await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
              userWallet.address,
            )
          ).toString(),
        ).to.be.eq('0,0');

        // Submit the batch of deposits from the router to the erc20 root vaults
        for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
          await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
        }

        // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
        const userLpTokenBalance =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet.address,
          );
        expect(userLpTokenBalance[0]).to.be.eq('5000000000000000000');
        expect(userLpTokenBalance[1]).to.be.eq('5000000000000000000');
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
      console.log('Printing tvl list of all erc20 root vaults: ', tvl);

        // For each vault
        expect(tvl[0]).to.be.eq('10010000000000000000');
        expect(tvl[1]).to.be.eq('10010000000000000000');

        // For each vault
        expect(userLpTokenBalance[0]).to.be.eq(BigNumber.from('5000000000000000000'));
        expect(userLpTokenBalance[1]).to.be.eq(BigNumber.from('5000000000000000000'));
      });

      it('User deposits eth into router contract uneven split', async () => {
        // Check if WETH is approved to router from the beforeEach statement
        expect(await ethMellowLpRouter.isTokenApproved()).to.be.eq(true);
        const weights = [100, 0];

        // User deposits funds into the router
        await ethMellowLpRouter.deposit(depositAmount, weights);

        // Router gets the batched deposits
        for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
          const batchedDeposit =
            await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
          expect(batchedDeposit.length).to.be.eq(1 - vaultIndex);
          if (batchedDeposit.length) {
            expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
            expect(batchedDeposit[0][1]).to.be.eq(
              BigNumber.from(depositAmount)
                .mul('1000000000000000000')
                .mul(1 - vaultIndex),
            );
          }

          // eslint-disable-next-line
          console.log(`Batched deposits in router for vault index ${vaultIndex}: ${batchedDeposit.toString()}`);
        }

        // Make sure the user LP token balance before batch submission is 0 for each vault
        expect(
          (
            await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
              userWallet.address,
            )
          ).toString(),
        ).to.be.eq('0,0');

        // Submit the batch of deposits from the router to the erc20 root vaults
        for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
          await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
        }

        // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
        const userLpTokenBalance =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet.address,
          );
        expect(userLpTokenBalance[0]).to.be.eq('10000000000000000000');
        expect(userLpTokenBalance[1]).to.be.eq('0');
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
        console.log('Printing tvl list of all erc20 root vaults: ', tvl);

        // For each vault
        expect(tvl[0]).to.be.eq('10010000000000000000');
        expect(tvl[1]).to.be.eq('10010000000000000000');

        // For each vault
        expect(userLpTokenBalance[0]).to.be.eq(BigNumber.from('10000000000000000000'));
        expect(userLpTokenBalance[1]).to.be.eq(BigNumber.from('0'));
      });

      it('User deposits eth into router without specifying weights', async () => {
        // Check if WETH is approved to router from the beforeEach statement
        expect(await ethMellowLpRouter.isTokenApproved()).to.be.eq(true);
        // User deposits funds into the router
        await ethMellowLpRouter.deposit(depositAmount);

        // Router gets the batched deposits
        for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
          const batchedDeposit =
            await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
          expect(batchedDeposit.length).to.be.eq(1);
          expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
          expect(batchedDeposit[0][1]).to.be.eq(
            BigNumber.from(depositAmount).mul('1000000000000000000').div(2),
          );

          // eslint-disable-next-line
          console.log(`Batched deposits in router for vault index ${vaultIndex}: ${batchedDeposit.toString()}`);
        }

        // Make sure the user LP token balance before batch submission is 0 for each vault
        expect(
          (
            await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
              userWallet.address,
            )
          ).toString(),
        ).to.be.eq('0,0');

        // Submit the batch of deposits from the router to the erc20 root vaults
        for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
          await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
        }

        // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
        const userLpTokenBalance =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet.address,
          );
        expect(userLpTokenBalance[0]).to.be.eq('5000000000000000000');
        expect(userLpTokenBalance[1]).to.be.eq('5000000000000000000');
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
        console.log('Printing tvl list of all erc20 root vaults: ', tvl);

        // For each vault
        expect(tvl[0]).to.be.eq('10010000000000000000');
        expect(tvl[1]).to.be.eq('10010000000000000000');

        // For each vault
        expect(userLpTokenBalance[0]).to.be.eq(BigNumber.from('5000000000000000000'));
        expect(userLpTokenBalance[1]).to.be.eq(BigNumber.from('5000000000000000000'));
      });
    });

    it('Only committed deposits', async () => {
      await ethMellowLpRouter.deposit(1, [100, 0]);
      await ethMellowLpRouter.deposit(2, [0, 100]);
      await ethMellowLpRouter.deposit(3, [50, 50]);
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
      }

      await ethMellowLpRouter.refreshuserTotalDeposit();
      expect(ethMellowLpRouter.userDeposit).to.be.eq(6);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(0);
      expect(ethMellowLpRouter.userTotalDeposit).to.be.eq(6);
    });

    it('Only pending deposits', async () => {
      await ethMellowLpRouter.deposit(1, [100, 0]);
      await ethMellowLpRouter.deposit(2, [0, 100]);
      await ethMellowLpRouter.deposit(3, [50, 50]);

      expect(ethMellowLpRouter.userDeposit).to.be.eq(0);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(6);
      expect(ethMellowLpRouter.userTotalDeposit).to.be.eq(6);
    });

    it('Pending and committed deposits', async () => {
      await ethMellowLpRouter.deposit(1, [100, 0]);
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
      }
      await ethMellowLpRouter.deposit(2, [0, 100]);
      await ethMellowLpRouter.deposit(3, [50, 50]);

      expect(ethMellowLpRouter.userDeposit).to.be.eq(1);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(5);
      expect(ethMellowLpRouter.userTotalDeposit).to.be.eq(6);
    });
  });
});
