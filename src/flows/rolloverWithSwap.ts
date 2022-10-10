/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, BigNumberish, Contract, ContractReceipt } from 'ethers';
import { isUndefined } from 'lodash';
import { getReadableErrorMessage } from '../utils/errors/errorHandling';
import { getGasBuffer } from '../utils/gasBuffer';
import { scale } from '../utils/scaling';
import { SwapParams } from './swap';

export type UserRolloverWithSwapArgs = {
  isFT: boolean;
  notional: number;
  marginErc20: number; // ERC20 or WETH deposit
  marginEth: number; // ETH deposit
  fixedLow: number;
  fixedHigh: number;
  marginEngine: string;

  previousFixedLow: number;
  previousFixedHigh: number;
};

export type RolloverWithSwapParams = {
  owner: string;
  previousMarginEngine: string;
  previousTickLower: BigNumberish;
  previousTickUpper: BigNumberish;

  swapParams: SwapParams;
};

type RawRolloverWithSwapArgs = UserRolloverWithSwapArgs & {
  previousMarginEngine: string;

  owner: string;
  tickFormat: ([fixedLow, fixedHigh]: [number, number]) => [number, number];
  tokenDecimals: number;
};

export const processRolloverWithSwapArguments = ({
  isFT,
  notional,
  marginErc20,
  marginEth,
  fixedLow,
  fixedHigh,
  marginEngine,

  previousFixedLow,
  previousFixedHigh,
  previousMarginEngine,

  owner,
  tickFormat,
  tokenDecimals,
}: RawRolloverWithSwapArgs): {
  rolloverWithSwapParams: RolloverWithSwapParams;
  ethDeposit: BigNumber | undefined;
} => {
  const [tickLower, tickUpper] = tickFormat([fixedLow, fixedHigh]);
  const [previousTickLower, previousTickUpper] = tickFormat([previousFixedLow, previousFixedHigh]);

  // scale numbers
  const scaledNotional = scale(notional, tokenDecimals);
  const scaledMarginErc20 = scale(marginErc20, tokenDecimals);
  const scaledMarginEth = scale(marginEth, tokenDecimals);

  // return processed arguments
  return {
    rolloverWithSwapParams: {
      owner,
      previousMarginEngine,
      previousTickLower,
      previousTickUpper,

      swapParams: {
        marginEngine,
        isFT,
        notional: scaledNotional,
        sqrtPriceLimitX96: 0,
        tickLower,
        tickUpper,
        marginDelta: scaledMarginErc20,
      },
    },
    ethDeposit: scaledMarginEth,
  };
};

export const execRolloverWithSwap = async ({
  periphery,
  params,
  ethDeposit,
}: {
  periphery: Contract;
  params: RolloverWithSwapParams;
  ethDeposit: BigNumber | undefined;
}): Promise<ContractReceipt> => {
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (!isUndefined(ethDeposit)) {
    tempOverrides.value = ethDeposit;
  }

  let transaction;
  try {
    await periphery.callStatic.rolloverWithSwap(
      params.previousMarginEngine,
      params.owner,
      params.previousTickLower,
      params.previousTickUpper,
      params.swapParams,
      tempOverrides,
    );
    const estimatedGas = await periphery.estimateGas.rolloverWithSwap(
      params.previousMarginEngine,
      params.owner,
      params.previousTickLower,
      params.previousTickUpper,
      params.swapParams,
      tempOverrides,
    );
    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    transaction = await periphery.rolloverWithSwap(
      params.previousMarginEngine,
      params.owner,
      params.previousTickLower,
      params.previousTickUpper,
      params.swapParams,
      tempOverrides,
    );
  } catch (erorr: any) {
    const errorMessage = getReadableErrorMessage(erorr);
    throw new Error(errorMessage);
  }

  try {
    const receipt = transaction.wait();
    return receipt;
  } catch (error) {
    throw new Error('Transaction confirmation error');
  }
};
