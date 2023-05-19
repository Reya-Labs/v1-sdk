import { ethers } from 'ethers';
import { RateOracle } from '../../rateOracle';

import {
  AaveBorrowRateOracle__factory as aaveBorrowRateOracleFactory,
  IAaveV2LendingPool__factory as iAaveV2LendingPoolFactory,
  CompoundRateOracle__factory as compoundRateOracleFactory,
  GlpRateOracle__factory as glpRateOracleFactory,
  ICToken__factory as iCTokenFactory,
  IGlpManager__factory as glpManagerFactory,
  IRewardTracker__factory as rewardTrackerFactory,
  IPriceFeed__factory as iPriceFeedFactory,
} from '../../../typechain';
import { getBlockAtTimestampHeuristic } from '../../../utils/getBlockAtTimestamp';
import { SupportedChainId } from '../../../types';
import { ONE_YEAR_IN_SECONDS } from '../../../constants';
import { getVoltzPoolConfig } from '../voltz-config';

const getInstantApyAsArray = async (
  chainId: SupportedChainId,
  provider: ethers.providers.Provider,
  ethPrice: () => Promise<number>,

  rateOracle: RateOracle,
  underlyingTokenId: string,
  pastTimestamps: number[],
): Promise<number[]> => {
  const pastBlocks: number[] = [];
  for (const timestamp of pastTimestamps) {
    pastBlocks.push(await getBlockAtTimestampHeuristic(chainId, provider, timestamp));
  }

  switch (rateOracle.protocolId) {
    case 1:
    case 5:
    case 7:
    case 9: {
      // note: can replace this by hard-coded address for main networks
      const rateOracleContract = aaveBorrowRateOracleFactory.connect(rateOracle.id, provider);
      const lendingPoolAddress = await rateOracleContract.aaveLendingPool();

      const lendingPool = iAaveV2LendingPoolFactory.connect(lendingPoolAddress, provider);

      const responses = await Promise.allSettled([
        lendingPool.getReserveData(underlyingTokenId),
        ...pastBlocks.map((block) =>
          lendingPool.getReserveData(underlyingTokenId, {
            blockTag: block,
          }),
        ),
      ]);

      return responses.map((r) => {
        if (r.status === 'rejected') {
          throw new Error('Failed to fetch Aave reserve data');
        }

        const rate =
          rateOracle.protocolId === 1 || rateOracle.protocolId === 7
            ? r.value.currentLiquidityRate
            : r.value.currentVariableBorrowRate;

        return Number(ethers.utils.formatUnits(rate, 27));
      });
    }
    case 2:
    case 6: {
      // note: mainnet support only

      const daysPerYear = 365;
      const blocksPerDay = 6570; // 13.15 seconds per block

      const rateOracleContract = compoundRateOracleFactory.connect(rateOracle.id, provider);

      // note: can replace this by hard-coded address for main networks
      const cTokenAddress = await rateOracleContract.ctoken();

      const cTokenContract = iCTokenFactory.connect(cTokenAddress, provider);

      const responses = await Promise.allSettled([
        rateOracle.protocolId === 2
          ? cTokenContract.supplyRatePerBlock()
          : cTokenContract.borrowRatePerBlock(),
        ...pastBlocks.map((block) =>
          rateOracle.protocolId === 2
            ? cTokenContract.supplyRatePerBlock({
                blockTag: block,
              })
            : cTokenContract.borrowRatePerBlock({
                blockTag: block,
              }),
        ),
      ]);

      return responses.map((r) => {
        if (r.status === 'rejected') {
          throw new Error('Failed to fetch Compound rates per block');
        }

        const ratePerBlock = Number(ethers.utils.formatUnits(r.value, 18));
        const supplyApy = Math.pow(ratePerBlock * blocksPerDay + 1, daysPerYear) - 1;

        return supplyApy;
      });
    }

    case 3:
    case 4: {
      const lookbackWindow = 28 * 60 * 60;
      const currentTimestamp = Math.floor(Date.now().valueOf() / 1000);

      const rateOracleContract = aaveBorrowRateOracleFactory.connect(rateOracle.id, provider);

      const exactBlockTimestamps = (
        await Promise.allSettled(pastBlocks.map((b) => provider.getBlock(b)))
      ).map((r) => {
        if (r.status === 'rejected') {
          throw new Error('Failed to fetch exact block timestamps');
        }

        return r.value.timestamp;
      });

      const responses = await Promise.allSettled([
        rateOracleContract.getApyFromTo(currentTimestamp - lookbackWindow, currentTimestamp - 30),
        ...pastBlocks.map((block, i) =>
          rateOracleContract.getApyFromTo(
            exactBlockTimestamps[i] - lookbackWindow,
            exactBlockTimestamps[i] - 60,
            {
              blockTag: block,
            },
          ),
        ),
      ]);

      return responses.map((r) => {
        if (r.status === 'rejected') {
          throw new Error('Failed to fetch Compound rates per block');
        }

        return Number(ethers.utils.formatUnits(r.value, 18));
      });
    }

    case 8: {
      const ethUsdPrice = await ethPrice();

      // note: can replace this by hard-coded address for main networks
      const rateOracleContract = glpRateOracleFactory.connect(rateOracle.id, provider);
      const rewardTrackerAddress = await rateOracleContract.rewardTracker();
      const rewardTracker = rewardTrackerFactory.connect(rewardTrackerAddress, provider);

      const glpManagerAddress = await rateOracleContract.glpManager();
      const glpManager = glpManagerFactory.connect(glpManagerAddress, provider);

      const responses = await Promise.allSettled([
        rewardTracker.tokensPerInterval(),
        ...pastBlocks.map((block) => rewardTracker.tokensPerInterval({ blockTag: block })),
        glpManager.getAum(false),
        ...pastBlocks.map((block) => glpManager.getAum(false, { blockTag: block })),
      ]);

      const n = 1 + pastBlocks.length;

      return responses.slice(0, n).map((a, i) => {
        const b = responses[i + n];

        if (a.status === 'rejected' || b.status === 'rejected') {
          throw new Error('Failed to fetch GLPS instant APY');
        }

        const aumUsd = Number(ethers.utils.formatUnits(b.value, 30));
        const tokensPerInterval = Number(ethers.utils.formatUnits(a.value, 18));

        const instantApy = (tokensPerInterval * ONE_YEAR_IN_SECONDS * ethUsdPrice) / aumUsd;

        return instantApy;
      });
    }

    case 10: {
      // note: can replace this by hard-coded address for main networks
      const sofrRatePriceFeed = iPriceFeedFactory.connect(
        getVoltzPoolConfig(chainId).sofrRatePriceFeed || '',
        provider,
      );

      const responses = await Promise.allSettled([
        sofrRatePriceFeed.latestRoundData(),
        ...pastBlocks.map((block) =>
          sofrRatePriceFeed.latestRoundData({
            blockTag: block,
          }),
        ),
      ]);

      return responses.map((r) => {
        if (r.status === 'rejected') {
          throw new Error('Failed to fetch SOFR latest round data');
        }

        const rate = r.value.answer;

        return Number(ethers.utils.formatUnits(rate, 8 + 2));
      });
    }

    default:
      throw new Error('Unrecognized protocol');
  }
};

export const getInstantApy = async (
  chainId: SupportedChainId,
  provider: ethers.providers.Provider,
  ethPrice: () => Promise<number>,

  rateOracle: RateOracle,
  underlyingTokenId: string,
  pastTimestamps: number[],
): Promise<{
  currentApy: number;
  pastApys: number[];
}> => {
  const responses = await getInstantApyAsArray(
    chainId,
    provider,
    ethPrice,

    rateOracle,
    underlyingTokenId,
    pastTimestamps,
  );

  return {
    currentApy: responses[0],
    pastApys: responses.slice(1),
  };
};
