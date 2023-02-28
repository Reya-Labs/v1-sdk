import { providers } from 'ethers';
import { exponentialBackoff } from './retry';

// It returns the block at given timestamp in a specific network
export async function getBlockAtTimestamp(
  provider: providers.Provider,
  timestamp: number,
): Promise<number> {
  let lo = 0;
  let hi = (await exponentialBackoff(() => provider.getBlock('latest'))).number;
  let answer = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    // eslint-disable-next-line no-await-in-loop
    const midBlock = await exponentialBackoff(() => provider.getBlock(mid));

    if (midBlock.timestamp >= timestamp) {
      answer = midBlock.number;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  return answer;
}

// It returns the block at given timestamp in a specific network
// using an heuristic method
export async function getBlockAtTimestampHeuristic(
  provider: providers.Provider,
  timestamp: number,
): Promise<number> {
  const currentBlock = await exponentialBackoff(() => provider.getBlock('latest'));
  const randomPastBlock = await exponentialBackoff(() =>
    provider.getBlock(Math.max(1, currentBlock.number - 100000)),
  );

  const blockNumberAtTimestamp = Math.max(
    1,
    Math.floor(
      currentBlock.number -
        ((currentBlock.number - randomPastBlock.number) /
          (currentBlock.timestamp - randomPastBlock.timestamp)) *
          (currentBlock.timestamp - timestamp),
    ),
  );

  return blockNumberAtTimestamp;
}
