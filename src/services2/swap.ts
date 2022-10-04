/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumber, Contract, ContractReceipt } from 'ethers';
import { isUndefined } from 'lodash';
import { MAX_FIXED_RATE, MIN_FIXED_RATE } from '../constants2';
import { SwapPeripheryParams } from '../types2';
import {
  getErrorReason,
  getErrorSignature,
  getReadableErrorMessage,
  iface,
} from '../utils2/errors/errorHandling';
import { getGasBuffer } from '../utils2/gasBuffer';
import { scale } from '../utils2/scaling';
import { fixedRateToClosestTick } from '../utils2/tickHandling';

type RawSwapArgs = {
  isFT: boolean;
  notional: number;
  margin: number;
  fixedLow: number;
  fixedHigh: number;
  tickSpacing: number;
  tokenDecimals: number;
};

type ProcessedSwapArgs = {
  tickLower: number;
  tickUpper: number;
  notional: BigNumber;
  margin: BigNumber;
};

export const processSwapArguments = (args: RawSwapArgs): ProcessedSwapArgs => {
  // sanity checks
  if (args.fixedLow >= args.fixedHigh) {
    throw new Error('Lower Rate must be smaller than Upper Rate');
  }

  if (args.fixedLow < MIN_FIXED_RATE) {
    throw new Error('Lower Rate is too low');
  }

  if (args.fixedHigh > MAX_FIXED_RATE) {
    throw new Error('Upper Rate is too high');
  }

  if (args.notional <= 0) {
    throw new Error('Amount of notional must be greater than 0');
  }

  // tick conversions
  const tickUpper = fixedRateToClosestTick(args.fixedLow, args.tickSpacing);
  const tickLower = fixedRateToClosestTick(args.fixedHigh, args.tickSpacing);

  // scale numbers
  const scaledNotional = scale(args.notional, args.tokenDecimals);
  const scaledMargin = scale(args.margin, args.tokenDecimals);

  // return processed arguments
  return {
    tickLower,
    tickUpper,
    notional: scaledNotional,
    margin: scaledMargin,
  };
};

// execute Swap operation
export const execSwap = async ({
  periphery,
  args,
  ethDeposit,
  fullCollateralisation,
}: {
  periphery: Contract;
  args: SwapPeripheryParams;
  ethDeposit?: BigNumber;
  fullCollateralisation?: {
    variableFactor: BigNumber;
  };
}): Promise<ContractReceipt> => {
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (!isUndefined(ethDeposit)) {
    tempOverrides.value = ethDeposit;
  }

  let transaction;
  try {
    if (isUndefined(fullCollateralisation)) {
      // simulate
      await periphery.callStatic.swap(args, tempOverrides);

      // estimate gas and add buffer
      const estimatedGas = await periphery.estimateGas.swap(args, tempOverrides);
      tempOverrides.gasLimit = getGasBuffer(estimatedGas);

      // create transaction
      transaction = await periphery.swap(args, tempOverrides);
    } else {
      // simulate
      await periphery.callStatic.fullyCollateralisedVTSwap(
        args,
        fullCollateralisation.variableFactor,
        tempOverrides,
      );

      // estimate gas and add buffer
      const estimatedGas = await periphery.estimateGas.fullyCollateralisedVTSwap(
        args,
        fullCollateralisation.variableFactor,
        tempOverrides,
      );
      tempOverrides.gasLimit = getGasBuffer(estimatedGas);

      // create transaction
      transaction = await periphery.fullyCollateralisedVTSwap(
        args,
        fullCollateralisation.variableFactor,
        tempOverrides,
      );
    }
  } catch (error) {
    const errorMessage = getReadableErrorMessage(error);
    throw new Error(errorMessage);
  }

  try {
    const receipt = transaction.wait();
    return receipt;
  } catch (error) {
    throw new Error('Transaction confirmation error');
  }
};

export type RawInfoPostSwap = {
  marginRequirement: BigNumber;
  tick: number;
  fee: BigNumber;
  availableNotional: BigNumber;
  fixedTokenDeltaUnbalanced: BigNumber;
  fixedTokenDelta: BigNumber;
};

// get the results of Swap operation when the call is successful
// or use the error to get the information
export const getSwapResult = async ({
  periphery,
  args,
  ethDeposit,
}: {
  periphery: Contract;
  args: SwapPeripheryParams;
  ethDeposit?: BigNumber;
}): Promise<RawInfoPostSwap> => {
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (!isUndefined(ethDeposit)) {
    tempOverrides.value = ethDeposit;
  }

  const result = await periphery.callStatic.swap(args, tempOverrides).catch((error: any) => {
    const errSig = getErrorSignature(error);

    if (errSig === 'MarginRequirementNotMet') {
      try {
        const reason = getErrorReason(error);
        const decodingResult = iface.decodeErrorResult(errSig, reason);
        return {
          marginRequirement: decodingResult.marginRequirement,
          tick: decodingResult.tick,
          fee: decodingResult.cumulativeFeeIncurred,
          availableNotional: decodingResult.variableTokenDelta,
          fixedTokenDelta: decodingResult.fixedTokenDelta,
          fixedTokenDeltaUnbalanced: decodingResult.fixedTokenDeltaUnbalanced,
        };
      } catch (err) {
        console.error(`Failing to get swap results. Raw error: ${err}`);
      }
    }

    const errorMessage = getReadableErrorMessage(error);
    throw new Error(errorMessage);
  });

  return {
    marginRequirement: result[4],
    tick: parseInt(result[5], 10),
    fee: result[2],
    availableNotional: result[1],
    fixedTokenDeltaUnbalanced: result[3],
    fixedTokenDelta: result[0],
  };
};
