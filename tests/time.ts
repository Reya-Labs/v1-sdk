/* eslint-disable no-await-in-loop */

import { waffle } from 'hardhat';

const { provider } = waffle;

export async function advanceTime(duration: number): Promise<void> {
  await provider.send('evm_increaseTime', [duration]);
  await provider.send('evm_mine', []);
}

export async function mineBlock(count?: number): Promise<void> {
  let blocks = count || 1;
  while (blocks > 0) {
    blocks -= 1;
    await provider.send('evm_mine', []);
  }
}

export async function advanceTimeAndBlock(time: number, blockCount: number): Promise<void> {
  if (blockCount < 1) {
    return;
  }
  await advanceTime(time);
  await mineBlock(blockCount - 1);
}
