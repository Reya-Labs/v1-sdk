/* eslint-disable no-restricted-syntax */

import { providers, Wallet } from 'ethers';
import * as dotenv from 'dotenv';
import { isUndefined } from 'lodash';
import { getAMM } from '../scripts/getAMM';

import * as mainnetPools from '../pool-addresses/mainnet.json';
import { getMaxAvailableNotional } from '../src/services/getMaxAvailableNotional';

dotenv.config();
jest.setTimeout(50000);

// LEFT TO TEST:
//    - settlement
//    - rollover with swap
//    - rollover with mint

// tests specific to mainnet @ block ...

describe('amm', () => {
  const provider = new providers.JsonRpcProvider('http://localhost:8545');
  const signer = new Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider,
  ); // at address - 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

  for (const poolName of ['aUSDC_v3', 'cDAI_v3', 'stETH_v1', 'rETH_v1']) {
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    it(`initialisation ${poolName}`, async () => {
      const amm = await getAMM(item.vamm, provider, signer);

      expect(amm.readOnlyContracts?.marginEngine.address).toBe(item.marginEngine);
      expect(amm.tokenDecimals).toBe(item.decimals);
      expect(amm.rateOracleID).toBe(item.rateOracleID);
      expect(amm.userAddress).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    });
  }

  it('approve operation', async () => {
    const poolName = 'aUSDC_v3';
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    const amm = await getAMM(item.vamm, provider, signer);

    await amm.approve();
    const approval = amm.approvals;

    expect(approval?.underlyingToken).toBe(true);
  });

  it('swap', async () => {
    const poolName = 'stETH_v1';
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    const amm = await getAMM(item.vamm, provider, signer);

    const swapArgs = {
      isFT: true,
      notional: 10,
      fixedLow: 1,
      fixedHigh: 2,
      margin: 1,
    };

    const swapInfo0 = await amm.getSwapInfo(swapArgs);
    const balance0 = amm.walletBalances?.underlyingToken;

    expect(swapInfo0?.availableNotional).toBe(10);

    await amm.swap(swapArgs);

    const swapInfo1 = await amm.getSwapInfo(swapArgs);
    const balance1 = amm.walletBalances?.underlyingToken;

    expect(swapInfo1?.maxAvailableNotional).toBe(
      (swapInfo0?.maxAvailableNotional ?? 0) - swapArgs.notional,
    );
    expect(balance1).toBeLessThanOrEqual((balance0 ?? 0) - swapArgs.margin);
  });

  it('swap - full collateralisation', async () => {
    const poolName = 'stETH_v1';
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    const amm = await getAMM(item.vamm, provider, signer);

    const swapArgs = {
      isFT: false,
      notional: 10,
      fixedLow: 1,
      fixedHigh: 2,
      margin: 1,
    };

    const swapInfo0 = await amm.getSwapInfo(swapArgs);
    const balance0 = amm.walletBalances?.underlyingToken;

    expect(swapInfo0?.availableNotional).toBe(10);

    await amm.swap({
      ...swapArgs,
      force: {
        fullCollateralisation: true,
      },
    });

    const swapInfo1 = await amm.getSwapInfo(swapArgs);
    const balance1 = amm.walletBalances?.underlyingToken;

    expect(swapInfo1?.maxAvailableNotional).toBe(
      (swapInfo0?.maxAvailableNotional ?? 0) - swapArgs.notional,
    );
    expect(balance1).toBeLessThanOrEqual((balance0 ?? 0) - swapArgs.margin);
  });

  it('mint', async () => {
    const poolName = 'stETH_v1';
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    const amm = await getAMM(item.vamm, provider, signer);

    const mintArgs = {
      isMint: true,
      notional: 10,
      fixedLow: 1,
      fixedHigh: 4,
      margin: 1,
    };

    if (isUndefined(amm.readOnlyContracts)) {
      expect(true).toBe(false);
      return;
    }

    // get information before Mint
    await amm.getMintOrBurnInfo(mintArgs);
    const availableFT0 = await getMaxAvailableNotional({
      periphery: amm.readOnlyContracts.periphery,
      marginEngineAddress: amm.readOnlyContracts.marginEngine.address,
      isFT: true,
      tokenDecimals: amm.tokenDecimals,
    });
    const balance0 = amm.walletBalances?.underlyingToken;

    // execute Mint
    await amm.mintOrBurn(mintArgs);

    // get information after Mint
    await amm.getMintOrBurnInfo(mintArgs);
    const availableFT1 = await getMaxAvailableNotional({
      periphery: amm.readOnlyContracts.periphery,
      marginEngineAddress: amm.readOnlyContracts.marginEngine.address,
      isFT: true,
      tokenDecimals: amm.tokenDecimals,
    });
    const balance1 = amm.walletBalances?.underlyingToken;

    // checks
    expect(availableFT1).toBe(availableFT0 + 10);
    expect(balance1).toBeLessThanOrEqual((balance0 ?? 0) - mintArgs.margin);
  });

  it('burn', async () => {
    const poolName = 'stETH_v1';
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    const amm = await getAMM(item.vamm, provider, signer);

    const burnArgs = {
      isMint: false,
      notional: 10,
      fixedLow: 1,
      fixedHigh: 4,
      margin: -0.5,
    };

    if (isUndefined(amm.readOnlyContracts)) {
      expect(true).toBe(false);
      return;
    }

    // get information before Burn
    await amm.getMintOrBurnInfo(burnArgs);
    const availableFT0 = await getMaxAvailableNotional({
      periphery: amm.readOnlyContracts.periphery,
      marginEngineAddress: amm.readOnlyContracts.marginEngine.address,
      isFT: true,
      tokenDecimals: amm.tokenDecimals,
    });
    const balance0 = amm.walletBalances?.underlyingToken;

    // execute Burn
    await amm.mintOrBurn(burnArgs);

    // get information after Burn
    await amm.getMintOrBurnInfo(burnArgs);
    const availableFT1 = await getMaxAvailableNotional({
      periphery: amm.readOnlyContracts.periphery,
      marginEngineAddress: amm.readOnlyContracts.marginEngine.address,
      isFT: true,
      tokenDecimals: amm.tokenDecimals,
    });
    const balance1 = amm.walletBalances?.underlyingToken;

    // checks
    expect(availableFT1).toBe(availableFT0 - 10);
    expect(balance1).toBeLessThanOrEqual((balance0 ?? 0) - burnArgs.margin);
  });

  it('update margin', async () => {
    const poolName = 'stETH_v1';
    const item = mainnetPools[poolName as keyof typeof mainnetPools];

    const amm = await getAMM(item.vamm, provider, signer);

    const updateMarginArgs = {
      fixedLow: 1,
      fixedHigh: 4,
      margin: 0.5,
    };

    if (isUndefined(amm.readOnlyContracts)) {
      expect(true).toBe(false);
      return;
    }

    // get information before Update Margin
    const balance0 = amm.walletBalances?.underlyingToken;

    // execute Update Margin
    await amm.updateMargin(updateMarginArgs);

    // get information after Update Margin
    const balance1 = amm.walletBalances?.underlyingToken;

    // checks
    expect(balance1).toBeLessThanOrEqual((balance0 ?? 0) - updateMarginArgs.margin);
  });
});
