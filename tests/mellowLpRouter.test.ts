/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { network, waffle } from 'hardhat';
import { isUndefined } from 'lodash';
import MellowLpRouter from '../src/entities/mellow/mellowLpRouter';
import { abi as MellowMultiVaultRouterABI } from '../src/ABIs/MellowMultiVaultRouterABI.json';
import { abi as Erc20RootVaultABI } from '../src/ABIs/Erc20RootVault.json';
import { abi as WethABI } from '../src/ABIs/WethABI.json';
import { abi as IERC20MinimalABI } from '../src/ABIs/IERC20Minimal.json';
import { withSigner } from './utils';
import { advanceTimeAndBlock } from './time';

const { provider } = waffle;
let ethMellowLpRouter: MellowLpRouter;

let localMellowRouterContract: Contract;

const MellowRouterAddress = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';

const signer = new Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  provider,
); // at address - 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

const userWallet = signer;

describe('Mellow Router Test Suite', () => {
  const resetNetwork = async (blockNumber: number) => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          chainId: 5,
          forking: {
            jsonRpcUrl: process.env.GOERLI_URL,
            blockNumber,
          },
        },
      ],
    });
  };

  const extendRouter = async () => {
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
  };

  describe('Invalid vault initialisation scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(7992457);
      await extendRouter();
    });
  });

  describe('Deposit Scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(7992457);
      await extendRouter();

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
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
      await ethMellowLpRouter.deposit(10, weights);

      // Router gets the batched deposits
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        const batchedDeposit =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
        expect(batchedDeposit.length).to.be.eq(1);
        expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
        expect(batchedDeposit[0][1]).to.be.eq(BigNumber.from(10).mul('1000000000000000000').div(2));

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
      await ethMellowLpRouter.deposit(10, weights);

      // Router gets the batched deposits
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        const batchedDeposit =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
        expect(batchedDeposit.length).to.be.eq(1 - vaultIndex);
        if (batchedDeposit.length) {
          expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
          expect(batchedDeposit[0][1]).to.be.eq(
            BigNumber.from(10)
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
      await ethMellowLpRouter.deposit(10, [50, 50]);

      // Router gets the batched deposits
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        const batchedDeposit =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
        expect(batchedDeposit.length).to.be.eq(1);
        expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
        expect(batchedDeposit[0][1]).to.be.eq(BigNumber.from(10).mul('1000000000000000000').div(2));

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
        await ethMellowLpRouter.deposit(10, [50, 50]);

        // Router gets the batched deposits
        for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
          const batchedDeposit =
            await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
          expect(batchedDeposit.length).to.be.eq(1);
          expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
          expect(batchedDeposit[0][1]).to.be.eq(
            BigNumber.from(10).mul('1000000000000000000').div(2),
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
        await ethMellowLpRouter.deposit(10, weights);

        // Router gets the batched deposits
        for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
          const batchedDeposit =
            await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
          expect(batchedDeposit.length).to.be.eq(1 - vaultIndex);
          if (batchedDeposit.length) {
            expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
            expect(batchedDeposit[0][1]).to.be.eq(
              BigNumber.from(10)
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
        await ethMellowLpRouter.deposit(10, [50, 50]);

        // Router gets the batched deposits
        for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
          const batchedDeposit =
            await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
          expect(batchedDeposit.length).to.be.eq(1);
          expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
          expect(batchedDeposit[0][1]).to.be.eq(
            BigNumber.from(10).mul('1000000000000000000').div(2),
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

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(6);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(0);
      expect(ethMellowLpRouter.userDeposit).to.be.eq(6);
    });

    it('Only pending deposits', async () => {
      await ethMellowLpRouter.deposit(1, [100, 0]);
      await ethMellowLpRouter.deposit(2, [0, 100]);
      await ethMellowLpRouter.deposit(3, [50, 50]);

      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(0);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(6);
      expect(ethMellowLpRouter.userDeposit).to.be.eq(6);
    });

    it('Pending and committed deposits', async () => {
      await ethMellowLpRouter.deposit(1, [100, 0]);
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
      }
      await ethMellowLpRouter.deposit(2, [0, 100]);
      await ethMellowLpRouter.deposit(3, [50, 50]);

      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(1);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(5);
      expect(ethMellowLpRouter.userDeposit).to.be.eq(6);
    });
  });

  describe('Withdrawal Scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(8099085);
      await extendRouter();

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        provider,
      });

      await ethMellowLpRouter.vaultInit();

      // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
      await ethMellowLpRouter.userInit(userWallet);
    });

    it('2-vault withdrawal', async () => {
      const wethContract = new ethers.Contract(
        ethMellowLpRouter.readOnlyContracts?.token.address || '',
        IERC20MinimalABI,
        signer,
      );

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(10, [50, 50]);

      // Submit the batch of deposits from the router to the erc20 root vaults
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
      }

      await advanceTimeAndBlock(30 * 24 * 60 * 60, 1);

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userDeposit).to.be.eq(10);

      const initBalance: BigNumber = await wethContract.balanceOf(ethMellowLpRouter.userAddress);

      await ethMellowLpRouter.withdraw(0);

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userDeposit).to.be.eq(5);

      const midBalance: BigNumber = await wethContract.balanceOf(ethMellowLpRouter.userAddress);
      expect(ethMellowLpRouter.descale(midBalance.sub(initBalance), 18)).to.be.eq(5);

      await ethMellowLpRouter.withdraw(1);

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userDeposit).to.be.eq(0);

      const finalBalance: BigNumber = await wethContract.balanceOf(ethMellowLpRouter.userAddress);
      expect(ethMellowLpRouter.descale(finalBalance.sub(midBalance), 18)).to.be.eq(5);
    });
  });

  describe('Rollover Scenarios', async () => {
    beforeEach('Setting up the Router Object for Deposit', async () => {
      await resetNetwork(8099085);
      await extendRouter();
      await extendRouter();
      await extendRouter();

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        provider,
      });

      await ethMellowLpRouter.vaultInit();

      // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
      await ethMellowLpRouter.userInit(userWallet);
    });

    it('2-vault rollover', async () => {
      const wethContract = new ethers.Contract(
        ethMellowLpRouter.readOnlyContracts?.token.address || '',
        IERC20MinimalABI,
        signer,
      );

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(10, [50, 50, 0, 0]);

      await ethMellowLpRouter.vaultInit();

      // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
      await ethMellowLpRouter.userInit(userWallet);

      // Submit the batch of deposits from the router to the erc20 root vaults
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
      }

      await advanceTimeAndBlock(30 * 24 * 60 * 60, 1);

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(10);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(0);

      const initBalance: BigNumber = await wethContract.balanceOf(ethMellowLpRouter.userAddress);

      await ethMellowLpRouter.rollover(0, [0, 0, 25, 75]);

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(5);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(5);

      const midBalance: BigNumber = await wethContract.balanceOf(ethMellowLpRouter.userAddress);
      expect(ethMellowLpRouter.descale(midBalance.sub(initBalance), 18)).to.be.eq(0);

      await ethMellowLpRouter.rollover(1, [0, 0, 25, 75]);

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(0);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(10);

      await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(2, 0);
      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(2.5);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(7.5);

      await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(3, 0);
      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(10);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(0);

      const finalBalance: BigNumber = await wethContract.balanceOf(ethMellowLpRouter.userAddress);
      expect(ethMellowLpRouter.descale(finalBalance.sub(midBalance), 18)).to.be.eq(0);
    });

    it('2-vault rollover with specific weights', async () => {
      const wethContract = new ethers.Contract(
        ethMellowLpRouter.readOnlyContracts?.token.address || '',
        IERC20MinimalABI,
        signer,
      );

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(10, [50, 50, 0, 0]);

      await ethMellowLpRouter.vaultInit();

      // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
      await ethMellowLpRouter.userInit(userWallet);

      // Submit the batch of deposits from the router to the erc20 root vaults
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(vaultIndex, 0);
      }

      await advanceTimeAndBlock(30 * 24 * 60 * 60, 1);

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(10);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(0);

      const initBalance: BigNumber = await wethContract.balanceOf(ethMellowLpRouter.userAddress);

      await ethMellowLpRouter.rollover(0, [0, 0, 25, 75]);

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(5);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(5);

      const midBalance: BigNumber = await wethContract.balanceOf(ethMellowLpRouter.userAddress);
      expect(ethMellowLpRouter.descale(midBalance.sub(initBalance), 18)).to.be.eq(0);

      await ethMellowLpRouter.rollover(1, [0, 0, 50, 50]);

      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(0);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(10);

      await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(2, 0);
      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(3.75);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(6.25);

      await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(3, 0);
      await ethMellowLpRouter.refreshUserDeposit();
      expect(ethMellowLpRouter.userComittedDeposit).to.be.eq(10);
      expect(ethMellowLpRouter.userPendingDeposit).to.be.eq(0);

      const finalBalance: BigNumber = await wethContract.balanceOf(ethMellowLpRouter.userAddress);
      expect(ethMellowLpRouter.descale(finalBalance.sub(midBalance), 18)).to.be.eq(0);
    });
  });
});
