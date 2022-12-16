/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */

import { BigNumber, ethers, Wallet } from 'ethers';
import { describe } from 'mocha';
import { network, waffle } from 'hardhat';
import { expect } from 'chai';
import MellowLpVault from '../src/entities/mellow/mellowLpVault';
import { abi as IERC20MinimalABI } from '../src/ABIs/IERC20Minimal.json';
import { advanceTimeAndBlock } from './time';

const { provider } = waffle;
let ethMellowLpVault: MellowLpVault;

const MellowWrapperAddress = '0xcF2f79d8DF97E09BF5c4DBF3F953aeEF4f4a204d';
const MellowErc20RootVaultAddress = '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB';

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

  describe('Invalid vault initialisation scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(7992457);
    });
  });

  describe('Deposit Scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(7992457);

      ethMellowLpVault = new MellowLpVault({
        ethWrapperAddress: MellowWrapperAddress,
        erc20RootVaultAddress: MellowErc20RootVaultAddress,
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
              weight: 100,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: 0.0,
              withdrawable: true,
            },
          ],
          underlyingPools: [],
        },
      });

      await ethMellowLpVault.vaultInit();

      // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
      await ethMellowLpVault.userInit(userWallet);
    });

    it('Check that vault has been initialised correctly', async () => {
      expect(ethMellowLpVault.vaultInitialized).to.be.eq(true);
      expect(ethMellowLpVault.readOnlyContracts?.token.address).to.be.eq(
        '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      );

      const erc20RootVaultGovernanceAddress =
        ethMellowLpVault.readOnlyContracts?.erc20RootVaultGovernance[0].address;
      expect(erc20RootVaultGovernanceAddress).to.be.eq(
        '0x4DCc9Ad7ff5964d13ee4A6932922f1a24f3f8e25',
      );
    });

    it('Check that user has been initialised correctly', async () => {
      expect(ethMellowLpVault.writeContracts?.ethWrapper.address).to.be.eq(
        '0xcF2f79d8DF97E09BF5c4DBF3F953aeEF4f4a204d',
      );
      expect(ethMellowLpVault.writeContracts?.erc20RootVault[0].address).to.be.eq(
        '0x62E224d9ae2f4702CC88695e6Ea4aA16D0925BdB',
      );

      expect(ethMellowLpVault.readOnlyContracts?.token.address).to.be.eq(
        '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
      );
    });

    it('User deposits eth into wrapper contract', async () => {
      // User deposits funds into the wrapper
      await ethMellowLpVault.deposit(10);

      const lpTokens = await ethMellowLpVault.readOnlyContracts?.erc20RootVault[0].balanceOf(
        userWallet.address,
      );
      expect(ethMellowLpVault.descale(lpTokens, ethMellowLpVault.tokenDecimals)).to.be.closeTo(
        9.798,
        0.01,
      );

      const erc20RootVaultContracts = ethMellowLpVault.readOnlyContracts?.erc20RootVault;

      const tvl: BigNumber[] = [];
      for (const erc20RootVaultContract of erc20RootVaultContracts || []) {
        tvl.push((await erc20RootVaultContract.tvl()).minTokenAmounts.toString());
      }

      expect(ethMellowLpVault.descale(tvl[0], ethMellowLpVault.tokenDecimals)).to.be.closeTo(
        11.763,
        0.01,
      );
    });

    it('Have we scaled properly?', async () => {
      const amount = 1;
      expect(ethMellowLpVault.scale(amount)).to.be.eq(BigNumber.from('1000000000000000000'));
    });

    it('Have we descaled properly?', async () => {
      const amount = BigNumber.from('1000000000000000000');
      expect(ethMellowLpVault.descale(amount, 18)).to.be.eq(BigNumber.from('1'));
    });

    it('Token name', async () => {
      expect(ethMellowLpVault.tokenName).to.be.eq('ETH');
    });

    it('isETH check', async () => {
      expect(ethMellowLpVault.isETH).to.be.eq(true);
    });

    it('Token decimals', async () => {
      expect(ethMellowLpVault.tokenDecimals).to.be.eq(18);
    });

    it('Depositable', async () => {
      expect(ethMellowLpVault.depositable).to.be.eq(false);
    });

    it('Withdrawable', async () => {
      expect(ethMellowLpVault.withdrawable()).to.be.eq(true);
    });
  });

  describe('Withdrawal Scenarios', async () => {
    beforeEach('Setting up the Router Object', async () => {
      await resetNetwork(8099085);

      ethMellowLpVault = new MellowLpVault({
        ethWrapperAddress: MellowWrapperAddress,
        erc20RootVaultAddress: MellowErc20RootVaultAddress,
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
              weight: 100,
              pools: ['Compound - ETH'],
              maturityTimestampMS: 1670427875000,
              estimatedHistoricApy: 0.0,
              withdrawable: true,
            },
          ],
          underlyingPools: [],
        },
      });

      await ethMellowLpVault.vaultInit();

      // Initialise the user so the router contract is connected with user to keep track of them as a signer for the deposits
      await ethMellowLpVault.userInit(userWallet);
    });

    it('2-vault withdrawal', async () => {
      const wethContract = new ethers.Contract(
        ethMellowLpVault.readOnlyContracts?.token.address || '',
        IERC20MinimalABI,
        signer,
      );

      // User deposits funds into the router
      await ethMellowLpVault.deposit(10);

      await advanceTimeAndBlock(30 * 24 * 60 * 60, 1);

      expect(ethMellowLpVault.userIndividualCommittedDeposits).to.be.deep.eq([10]);
      expect(ethMellowLpVault.userDeposit).to.be.eq(10);

      const initBalance: BigNumber = await wethContract.balanceOf(ethMellowLpVault.userAddress);

      await ethMellowLpVault.withdraw();

      await ethMellowLpVault.refreshUserDeposit();
      expect(ethMellowLpVault.userIndividualCommittedDeposits).to.be.deep.eq([0]);
      expect(ethMellowLpVault.userDeposit).to.be.eq(0);

      const finalBalance: BigNumber = await wethContract.balanceOf(ethMellowLpVault.userAddress);
      expect(ethMellowLpVault.descale(finalBalance.sub(initBalance), 18)).to.be.eq(10);
    });
  });
});
