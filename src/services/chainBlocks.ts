import { ethers } from 'ethers';
import { SupportedChainId } from '../types';
import { exponentialBackoff } from '../utils/retry';

const refreshWindowInMs = 60 * 1000;

const currentBlock: {
  [chainId: string]: {
    number: number;
    timestamp: number;
    lastFetchInMS: number;
  };
} = {};

const randomPastBlock: {
  [chainId: string]: {
    number: number;
    timestamp: number;
  };
} = {};

export const getCurrentBlock = async (
  chainId: SupportedChainId,
  provider: ethers.providers.Provider,
): Promise<{
  number: number;
  timestamp: number;
}> => {
  const currentTimestampInMs = Date.now().valueOf();
  const key = chainId.toString();

  if (
    !Object.keys(currentBlock).includes(key) ||
    currentBlock[key].lastFetchInMS + refreshWindowInMs <= currentTimestampInMs
  ) {
    const block = await exponentialBackoff(() => provider.getBlock('latest'));
    currentBlock[key] = {
      number: block.number,
      timestamp: block.timestamp,
      lastFetchInMS: currentTimestampInMs,
    };
  }

  return currentBlock[key];
};

export const getRandomBlock = async (
  chainId: SupportedChainId,
  provider: ethers.providers.Provider,
): Promise<{
  number: number;
  timestamp: number;
}> => {
  const key = chainId.toString();

  if (!Object.keys(randomPastBlock).includes(key)) {
    const block = await getCurrentBlock(chainId, provider);
    const thatBlock = await exponentialBackoff(() =>
      provider.getBlock(Math.max(1, block.number - 100000)),
    );
    randomPastBlock[key] = {
      number: thatBlock.number,
      timestamp: thatBlock.timestamp,
    };
  }

  return randomPastBlock[key];
};
