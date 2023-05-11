import { providers } from 'ethers';
import { exponentialBackoff } from './retry';
import { getCurrentBlock, getRandomBlock } from '../services/chainBlocks';
import { SupportedChainId } from '../types';

// It returns the block at given timestamp in a specific network
export async function getBlockAtTimestamp(
  chainId: SupportedChainId,
  provider: providers.Provider,
  timestamp: number,
): Promise<number> {
  let lo = 0;
  let hi = (await getCurrentBlock(chainId, provider)).number;
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
  chainId: SupportedChainId,
  provider: providers.Provider,
  timestamp: number,
): Promise<number> {
  const currentBlock = await getCurrentBlock(chainId, provider);
  const randomPastBlock = await getRandomBlock(chainId, provider);

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
