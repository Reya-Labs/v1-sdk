import { BigNumber, Contract, ethers, providers } from 'ethers';
import { descale } from '../utils/scaling';

export const fetchVariableApy = async (args: {
  rateOracle: Contract;
  rateOracleID: number;
  tokenAddress: string;
  provider: providers.Provider;
}): Promise<number> => {
  switch (args.rateOracleID) {
    case 1: {
      // Aave Lending Rate Oracle

      const lendingPoolAddress = await args.rateOracle.aaveLendingPool();
      const lendingPool = new ethers.Contract(
        lendingPoolAddress,
        AaveLendingPoolABI,
        args.provider,
      );

      const reservesData = await lendingPool.getReserveData(args.tokenAddress);
      return descale(reservesData.currentLiquidityRate, 25);
    }

    case 2: {
      // Compound Lending Rate Oracle

      const daysPerYear = 365;
      const blocksPerDay = 6570;

      const cTokenAddress = await args.rateOracle.ctoken();
      const cTokenContract = new ethers.Contract(cTokenAddress, CTokenABI, args.provider);

      const ratePerBlock = await cTokenContract.supplyRatePerBlock();
      return ((descale(ratePerBlock, 18) * blocksPerDay + 1) ** daysPerYear - 1) * 100;
    }

    case 3:
    case 4: {
      // Lido Rate Oracle
      // Rocket Rate Oracle

      const apyWindow = 28 * 60 * 60;

      const lastBlock = await args.provider.getBlockNumber();
      const to = BigNumber.from((await args.provider.getBlock(lastBlock - 1)).timestamp);
      const from = to.sub(apyWindow);

      const apy = await args.rateOracle.getApyFromTo(from, to);
      return descale(apy, 16);
    }

    case 5: {
      // Aave Borrowing Rate Oracle

      const lendingPoolAddress = await args.rateOracle.aaveLendingPool();
      const lendingPool = new ethers.Contract(
        lendingPoolAddress,
        AaveLendingPoolABI,
        args.provider,
      );

      const reservesData = await lendingPool.getReserveData(args.tokenAddress);
      return descale(reservesData.currentVariableBorrowRate, 25);
    }

    case 6: {
      // Compound Borrowing Rate Oracle

      const daysPerYear = 365;
      const blocksPerDay = 6570;

      const cTokenAddress = await args.rateOracle.ctoken();
      const cTokenContract = new ethers.Contract(cTokenAddress, CTokenABI, args.provider);

      const ratePerBlock = await cTokenContract.borrowRatePerBlock();
      return ((descale(ratePerBlock, 18) * blocksPerDay + 1) ** daysPerYear - 1) * 100;
    }

    default: {
      return 0;
    }
  }
};
