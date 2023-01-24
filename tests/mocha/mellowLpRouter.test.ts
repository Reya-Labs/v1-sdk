import { BigNumber, Contract, ethers, utils, Wallet } from 'ethers';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { network, waffle } from 'hardhat';
import { isUndefined } from 'lodash';
import * as sinon from 'sinon';
import { BrowserClient } from '@sentry/browser';
import MellowLpRouter from '../../src/entities/mellow/mellowLpRouter';
import { abi as MellowMultiVaultRouterABI } from '../../src/ABIs/MellowMultiVaultRouterABI.json';
import { abi as WethABI } from '../../src/ABIs/WethABI.json';
import { abi as IERC20MinimalABI } from '../../src/ABIs/IERC20Minimal.json';
import { withSigner, fail } from '../utils';
import { advanceTimeAndBlock } from '../time';
import * as initSDK from '../../src/init';
import * as priceFetch from '../../src/utils/priceFetch';

const { provider } = waffle;
let ethMellowLpRouter: MellowLpRouter;
let ethMellowLpRouter2: MellowLpRouter;
let fee: BigNumber;

let localMellowRouterContract: Contract;

const MellowRouterAddress = '0x704F6E9cB4f7e041CC89B6a49DF8EE2027a55164';
const MellowRouterAddress_submitBatch = '0x7AaA278531D0baCb2aC483be3edDFf83E09564Aa'; // test submit batch

const signer = new Wallet(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  provider,
); // at address - 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

const signer2 = new Wallet(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  provider,
); // at address - 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

const userWallet = signer;
const userWallet2 = signer2;

describe('Mellow Router Test Suite', () => {
  beforeEach(() => {
    sinon.stub(initSDK, 'getSentryTracker').callsFake(
      () =>
        ({
          captureException: () => undefined,
          captureMessage: () => undefined,
        } as unknown as BrowserClient),
    );

    sinon.stub(priceFetch, 'geckoEthToUsd').callsFake(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve(1300);
          }, 10);
        }),
    );
  });

  afterEach(() => {
    // restore the original implementation of initSDK.getSentryTracker
    (initSDK.getSentryTracker as sinon.SinonStub).restore();

    // restore the original implementation of priceFetch.geckoEthToUsd
    (priceFetch.geckoEthToUsd as sinon.SinonStub).restore();
  });

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

  describe.skip('Deposit Scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(7992457);
      await extendRouter();

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        id: 'test',
        provider,
        metadata: {
          title: 'Test - ETH',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [
            {
              weight: 50,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
            {
              weight: 50,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
          ],
          underlyingPools: [],
        },
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

      const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

      const tvl: BigNumber[] = [];
      if (!isUndefined(erc20RootVaultContracts)) {
        for (const erc20RootVaultContract of erc20RootVaultContracts) {
          tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
        }
      }

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

      const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

      const tvl: BigNumber[] = [];
      if (!isUndefined(erc20RootVaultContracts)) {
        for (const erc20RootVaultContract of erc20RootVaultContracts) {
          tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
        }
      }

      // For each vault
      expect(tvl[0]).to.be.eq('10010000000000000000');
      expect(tvl[1]).to.be.eq('10010000000000000000');

      // For each vault
      expect(userLpTokenBalance[0]).to.be.eq(BigNumber.from('10000000000000000000'));
      expect(userLpTokenBalance[1]).to.be.eq(BigNumber.from('0'));
    });

    it('User deposits eth into router contract uneven split', async () => {
      const weights = [100];

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

      const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

      const tvl: BigNumber[] = [];
      if (!isUndefined(erc20RootVaultContracts)) {
        for (const erc20RootVaultContract of erc20RootVaultContracts) {
          tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
        }
      }

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

      const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

      const tvl: BigNumber[] = [];
      if (!isUndefined(erc20RootVaultContracts)) {
        for (const erc20RootVaultContract of erc20RootVaultContracts) {
          tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
        }
      }

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

    it('Token name', async () => {
      expect(ethMellowLpRouter.tokenName).to.be.eq('ETH');
    });

    it('isETH check', async () => {
      expect(ethMellowLpRouter.isETH).to.be.eq(true);
    });

    it('Token decimals', async () => {
      expect(ethMellowLpRouter.tokenDecimals).to.be.eq(18);
    });

    it('Depositable', async () => {
      expect(ethMellowLpRouter.depositable).to.be.eq(false);
    });

    it('Withdrawable', async () => {
      expect(ethMellowLpRouter.withdrawable(0)).to.be.eq(true);
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

        const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

        const tvl: BigNumber[] = [];
        if (!isUndefined(erc20RootVaultContracts)) {
          for (const erc20RootVaultContract of erc20RootVaultContracts) {
            tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
          }
        }

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

        const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

        const tvl: BigNumber[] = [];
        if (!isUndefined(erc20RootVaultContracts)) {
          for (const erc20RootVaultContract of erc20RootVaultContracts) {
            tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
          }
        }

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

        const erc20RootVaultContracts = ethMellowLpRouter.readOnlyContracts?.erc20RootVault;

        const tvl: BigNumber[] = [];
        if (!isUndefined(erc20RootVaultContracts)) {
          for (const erc20RootVaultContract of erc20RootVaultContracts) {
            tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
          }
        }

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

  describe.skip('Withdrawal Scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(8099085);
      await extendRouter();

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        id: 'Test - ETH',
        provider,
        metadata: {
          title: 'Test - Router',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [
            {
              weight: 50,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
            {
              weight: 50,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
          ],
          underlyingPools: [],
        },
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

  describe.skip('Rollover Scenarios', async () => {
    beforeEach('Setting up the Router Object for Deposit', async () => {
      await resetNetwork(8099085);
      await extendRouter();
      await extendRouter();
      await extendRouter();

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        id: 'Test - ETH',
        provider,
        metadata: {
          title: 'Test - Router',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [
            {
              weight: 25,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
            {
              weight: 25,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
            {
              weight: 25,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
            {
              weight: 25,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
          ],
          underlyingPools: [],
        },
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

    it('2-vault rollover with specific weights with cut weights', async () => {
      const wethContract = new ethers.Contract(
        ethMellowLpRouter.readOnlyContracts?.token.address || '',
        IERC20MinimalABI,
        signer,
      );

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(10, [50, 50]);

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

  describe.skip('Auto-rollover', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(8321776);

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        id: 'Test - ETH',
        provider,
        metadata: {
          title: 'Test - Router',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [],
          underlyingPools: [],
        },
      });

      await ethMellowLpRouter.vaultInit();

      // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
      await ethMellowLpRouter.userInit(userWallet);
    });

    it('Unregistered user opts INTO auto-rollover', async () => {
      await ethMellowLpRouter.registerForAutoRollover(true);
      expect(
        await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract.isRegisteredForAutoRollover(
          userWallet.address,
        ),
      ).to.be.eq(true);
      expect(ethMellowLpRouter.isRegisteredForAutoRollover).to.be.eq(true);
    });

    it('Unregistered user opts OUT of auto-rollover', async () => {
      try {
        await ethMellowLpRouter.registerForAutoRollover(false);
        fail();
      } catch (error) {
        if (!(error instanceof Error)) {
          fail();
        }

        expect((error as Error).message).to.be.eq(
          'Unsuccessful auto-rollover registration simulation',
        );
      }
    });

    it('Registered user opts OUT of auto-rollover', async () => {
      await ethMellowLpRouter.registerForAutoRollover(true);
      await ethMellowLpRouter.registerForAutoRollover(false);
      expect(
        await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract.isRegisteredForAutoRollover(
          userWallet.address,
        ),
      ).to.be.eq(false);
      expect(ethMellowLpRouter.isRegisteredForAutoRollover).to.be.eq(false);
    });

    it('Registered user opts INTO auto-rollover again', async () => {
      await ethMellowLpRouter.registerForAutoRollover(true);

      try {
        await ethMellowLpRouter.registerForAutoRollover(true);
        fail();
      } catch (error) {
        if (!(error instanceof Error)) {
          fail();
        }

        expect((error as Error).message).to.be.eq(
          'Unsuccessful auto-rollover registration simulation',
        );
      }
    });

    it('Check if getAutorolloverRegistrationFlag retrieves correct flag for registered user', async () => {
      await ethMellowLpRouter.registerForAutoRollover(true);
      expect(await ethMellowLpRouter.isRegisteredForAutoRollover).to.be.eq(true);

      await ethMellowLpRouter.registerForAutoRollover(false);
      expect(await ethMellowLpRouter.isRegisteredForAutoRollover).to.be.eq(false);
    });

    it('Calculate correct transaction fee in USD for autorollover registration', async () => {
      const currentEthPrice = await priceFetch.geckoEthToUsd('');
      expect(ethMellowLpRouter.autoRolloverRegistrationGasFeeUSD / currentEthPrice).to.be.closeTo(
        0.00239,
        0.00001,
      );
    });

    it('Can manage vault positions - init', async () => {
      await withSigner(
        network,
        await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract.owner(),
        async (routerOwnerSigner) => {
          await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract
            .connect(routerOwnerSigner)
            .deprecateVault(4);
        },
      );

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        id: 'Test - ETH',
        provider,
        metadata: {
          title: 'Test - Router',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [],
          underlyingPools: [],
        },
      });
      await ethMellowLpRouter.vaultInit();
      await ethMellowLpRouter.userInit(userWallet);

      for (let vaultIndex = 0; vaultIndex < ethMellowLpRouter.vaultsCount; vaultIndex += 1) {
        expect(ethMellowLpRouter.canManageVaultPosition(vaultIndex)).to.be.eq(true);
      }
    });

    it('Can manage vault positions - autorollover triggered', async () => {
      // User deposits funds into the router
      await ethMellowLpRouter.deposit(10, [0, 0, 0, 0, 100]);
      await ethMellowLpRouter.registerForAutoRollover(true);

      await ethMellowLpRouter.writeContracts?.mellowRouter.submitBatch(4, 0);

      await advanceTimeAndBlock(30 * 24 * 60 * 60, 1);

      await withSigner(
        network,
        await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract.owner(),
        async (routerOwnerSigner) => {
          await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract
            .connect(routerOwnerSigner)
            .deprecateVault(4);
        },
      );

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        id: 'Test - ETH',
        provider,
        metadata: {
          title: 'Test - Router',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [],
          underlyingPools: [],
        },
      });
      await ethMellowLpRouter.vaultInit();
      await ethMellowLpRouter.userInit(userWallet);

      for (let vaultIndex = 0; vaultIndex < ethMellowLpRouter.vaultsCount; vaultIndex += 1) {
        expect(ethMellowLpRouter.canManageVaultPosition(vaultIndex)).to.be.eq(true);
      }

      await withSigner(
        network,
        await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract.owner(),
        async (routerOwnerSigner) => {
          await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract
            .connect(routerOwnerSigner)
            .addVault(
              (
                await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract.getVaults()
              )[4],
            );
          await ethMellowLpRouter.readOnlyContracts?.mellowRouterContract
            .connect(routerOwnerSigner)
            .setAutoRolloverWeights([0, 0, 0, 0, 0, 100]);
        },
      );

      await ethMellowLpRouter.writeContracts?.mellowRouter.triggerAutoRollover(4);

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        id: 'Test - ETH',
        provider,
        metadata: {
          title: 'Test - Router',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [],
          underlyingPools: [],
        },
      });
      await ethMellowLpRouter.vaultInit();
      await ethMellowLpRouter.userInit(userWallet);

      for (let vaultIndex = 0; vaultIndex < ethMellowLpRouter.vaultsCount; vaultIndex += 1) {
        expect(ethMellowLpRouter.canManageVaultPosition(vaultIndex)).to.be.eq(vaultIndex < 4);
      }
    });

    it('Can manage vault positions - edge cases', async () => {
      expect(ethMellowLpRouter.canManageVaultPosition(-1)).to.be.eq(false);
      expect(ethMellowLpRouter.canManageVaultPosition(100)).to.be.eq(false);

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress,
        id: 'Test - ETH',
        provider,
        metadata: {
          title: 'Test - Router',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [],
          underlyingPools: [],
        },
      });

      expect(ethMellowLpRouter.canManageVaultPosition(0)).to.be.eq(false);
    });
  });

  describe('Submit Batch Scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(8344143);
      // await extendRouter();
      localMellowRouterContract = new ethers.Contract(
        MellowRouterAddress_submitBatch,
        MellowMultiVaultRouterABI,
        signer,
      );

      ethMellowLpRouter = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress_submitBatch,
        id: 'test',
        provider,
        metadata: {
          title: 'Test - ETH',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [
            {
              weight: 50,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
            {
              weight: 50,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
          ],
          underlyingPools: [],
        },
      });

      ethMellowLpRouter2 = new MellowLpRouter({
        mellowRouterAddress: MellowRouterAddress_submitBatch,
        id: 'test',
        provider,
        metadata: {
          title: 'Test - ETH',
          token: 'ETH',
          description: 'Test',
          show: true,
          soon: false,
          deprecated: false,
          vaults: [
            {
              weight: 50,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
            {
              weight: 50,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: [0.0, 0.0],
              withdrawable: true,
            },
          ],
          underlyingPools: [],
        },
      });

      await ethMellowLpRouter.vaultInit();
      await ethMellowLpRouter2.vaultInit();

      // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
      await ethMellowLpRouter.userInit(userWallet);
      await ethMellowLpRouter2.userInit(userWallet2);

      // set deposit fee
      fee = utils.parseEther('1');
      await withSigner(
        network,
        await localMellowRouterContract.owner(),
        async (routerOwnerSigner) => {
          await localMellowRouterContract.connect(routerOwnerSigner).setFee(fee);
        },
      );
    });

    it.skip('Get fee before and after fee change', async () => {
      let obtainedFee = await ethMellowLpRouter.getDepositFeeUnderlying();
      expect(obtainedFee).to.be.eq(fee);

      await withSigner(
        network,
        await localMellowRouterContract.owner(),
        async (routerOwnerSigner) => {
          await localMellowRouterContract.connect(routerOwnerSigner).setFee(0);
        },
      );

      obtainedFee = await ethMellowLpRouter.getDepositFeeUnderlying();
      expect(obtainedFee).to.be.eq('0');
    });

    it.skip('Get batch budget', async () => {
      const weights1 = [60, 40]; // Needs to sum to 100
      const weights2 = [30, 70]; // Needs to sum to 100

      let batchBudget = await ethMellowLpRouter.getBatchBudgetUsd();
      expect(batchBudget).to.be.eq(0);

      await ethMellowLpRouter.deposit(10, weights1);
      batchBudget = await ethMellowLpRouter.getBatchBudgetUsd();
      const descaledFeeUsd = ethMellowLpRouter.descale(fee, 18) * 1300;
      expect(batchBudget).to.be.eq(descaledFeeUsd);

      await ethMellowLpRouter2.deposit(10, weights2);
      batchBudget = await ethMellowLpRouter.getBatchBudgetUsd();
      expect(batchBudget).to.be.eq(descaledFeeUsd * 2);
    });

    it('Compare gas costs', async () => {
      const weights1 = [60, 40]; // Needs to sum to 100
      const weights2 = [30, 70]; // Needs to sum to 100

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(10, weights1);
      await ethMellowLpRouter2.deposit(10, weights2);

      // Submit the batch of deposits from the router to the erc20 root vaults
      await ethMellowLpRouter.submitAllBatchesForFee();
    });

    it('Submit batch after 1 deposit with even split', async () => {
      const weights = [50, 50]; // Needs to sum to 100

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(10, weights);

      const balanceInit = await ethMellowLpRouter.writeContracts?.token.balanceOf(
        userWallet.address,
      );
      const batchBudgetUsdc = await ethMellowLpRouter.getBatchBudgetUsd();
      const batchBudget = ethMellowLpRouter.scale(batchBudgetUsdc / 1300);

      // Router gets the batched deposits
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        const batchedDeposit =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
        expect(batchedDeposit.length).to.be.eq(1);
        expect(batchedDeposit[0][0]).to.be.eq(userWallet.address);
        expect(batchedDeposit[0][1]).to.be.eq(BigNumber.from(10).mul('900000000000000000').div(2));
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
      await ethMellowLpRouter.submitAllBatchesForFee();

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      const userLpTokenBalance =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(userWallet.address);
      expect(userLpTokenBalance[0]).to.be.eq('4500000000000000000');
      expect(userLpTokenBalance[1]).to.be.eq('4500000000000000000');

      // Check submitter has received fee
      const balanceAfter = await ethMellowLpRouter.writeContracts?.token.balanceOf(
        userWallet.address,
      );
      expect(balanceAfter).to.be.eq(balanceInit.add(fee));
      expect(balanceAfter).to.be.eq(balanceInit.add(batchBudget));
    });

    it.skip('Submit batch after 2 deposit with uneven split', async () => {
      const weights1 = [60, 40]; // Needs to sum to 100
      const weights2 = [30, 70]; // Needs to sum to 100

      // User deposits funds into the router
      await ethMellowLpRouter.deposit(10, weights1);
      await ethMellowLpRouter2.deposit(10, weights2);

      const balanceInit1 = await ethMellowLpRouter.writeContracts?.token.balanceOf(
        userWallet.address,
      );
      let batchBudgetUsdc = await ethMellowLpRouter.getBatchBudgetUsd();
      let batchBudget = ethMellowLpRouter.scale(batchBudgetUsdc / 1300);

      // Submit the batch of deposits from the router to the erc20 root vaults
      await ethMellowLpRouter.userInit(userWallet);
      await ethMellowLpRouter.submitAllBatchesForFee();

      // Check submitter has received fee
      const balanceAfter1 = await ethMellowLpRouter.writeContracts?.token.balanceOf(
        userWallet.address,
      );
      expect(balanceAfter1).to.be.eq(balanceInit1.add(fee.mul(2)));
      expect(balanceAfter1).to.be.eq(balanceInit1.add(batchBudget));

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      {
        const userLpTokenBalance1 =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet.address,
          );
        const userLpTokenBalance2 =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet2.address,
          );
        expect(userLpTokenBalance1[0]).to.be.eq('5400000000000000000');
        expect(userLpTokenBalance2[0]).to.be.eq('2700000000000000000');
        expect(userLpTokenBalance1[1]).to.be.eq('3600000000000000000');
        expect(userLpTokenBalance2[1]).to.be.eq('6300000000000000000');
      }

      // ------------------ DEPOSIT AGAIN ------------------

      await ethMellowLpRouter2.deposit(10, weights2);
      batchBudgetUsdc = await ethMellowLpRouter.getBatchBudgetUsd();
      batchBudget = ethMellowLpRouter.scale(batchBudgetUsdc / 1300);

      await ethMellowLpRouter.submitAllBatchesForFee();

      // Check submitter has received fee
      const balanceAfter2 = await ethMellowLpRouter.writeContracts?.token.balanceOf(
        userWallet.address,
      );
      expect(balanceAfter2).to.be.eq(balanceInit1.add(fee.mul(3)));
      expect(balanceAfter2).to.be.eq(balanceAfter1.add(batchBudget));

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      {
        const userLpTokenBalance2 =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet2.address,
          );
        expect(userLpTokenBalance2[0]).to.be.closeTo('5400000000000000000', '100000000000000000');
        expect(userLpTokenBalance2[1]).to.be.closeTo('12600000000000000000', '100000000000000000');
      }
    });

    it('Submit empty batch', async () => {
      const balanceInit = await ethMellowLpRouter.writeContracts?.token.balanceOf(
        userWallet.address,
      );

      // Router gets the batched deposits
      for (let vaultIndex = 0; vaultIndex < 2; vaultIndex += 1) {
        const batchedDeposit =
          await ethMellowLpRouter.writeContracts?.mellowRouter.getBatchedDeposits(vaultIndex);
        expect(batchedDeposit.length).to.be.eq(0);
      }

      const batchBudgetUsdc = await ethMellowLpRouter.getBatchBudgetUsd();
      const batchBudget = ethMellowLpRouter.scale(batchBudgetUsdc / 1300);
      expect(batchBudget).to.be.eq('0');

      // Make sure the user LP token balance before batch submission is 0 for each vault
      expect(
        (
          await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(
            userWallet.address,
          )
        ).toString(),
      ).to.be.eq('0,0');

      // Submit the batch of deposits from the router to the erc20 root vaults
      expect(ethMellowLpRouter.submitAllBatchesForFee()).to.be.revertedWith(
        'Unsuccessful batch submittion simulation',
      );

      // Get the user lp token balance after the router receives it from the erc20 root vault upon batch submission
      const userLpTokenBalance =
        await ethMellowLpRouter.writeContracts?.mellowRouter.getLPTokenBalances(userWallet.address);
      expect(userLpTokenBalance[0]).to.be.eq('0');

      // Check submitter has received fee
      const balanceAfter = await ethMellowLpRouter.writeContracts?.token.balanceOf(
        userWallet.address,
      );
      expect(balanceAfter).to.be.eq(balanceInit);
    });
  });
});
