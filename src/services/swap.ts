/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumber, Contract, ContractReceipt } from 'ethers';
import { isUndefined } from 'lodash';
import { MAX_FIXED_RATE, MIN_FIXED_RATE, ZERO_BN } from '../constants';
import { SwapPeripheryParams } from '../types';
import {
  getErrorReason,
  getErrorSignature,
  getReadableErrorMessage,
  iface,
} from '../utils/errors/errorHandling';
import { getGasBuffer } from '../utils/gasBuffer';
import { descale, scale } from '../utils/scaling';
import { fixedRateToClosestTick } from '../utils/tickHandling';
import { getAvgFixedRate } from './getAvgFixedRate';

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

export type IntermmediateInfoPostSwap = {
  marginRequirement: number;
  tick: number;
  fee: number;
  availableNotional: number;
  variableTokenDelta: number;
  fixedTokenDeltaUnbalanced: number;
  fixedTokenDelta: number;
  averageFixedRate: number;
};

// get the results of Swap operation when the call is successful
// or use the error to get the information
export const getSwapResult = async ({
  periphery,
  args,
  tokenDecimals,
}: {
  periphery: Contract;
  args: SwapPeripheryParams;
  tokenDecimals: number;
}): Promise<IntermmediateInfoPostSwap> => {
  let result = {
    marginRequirement: ZERO_BN,
    tick: 0,
    fee: ZERO_BN,
    variableTokenDelta: ZERO_BN,
    fixedTokenDeltaUnbalanced: ZERO_BN,
    fixedTokenDelta: ZERO_BN,
  };

  try {
    const rawResults = await periphery.callStatic.swap(args);
    result = {
      marginRequirement: rawResults[4],
      tick: parseInt(rawResults[5], 10),
      fee: rawResults[2],
      variableTokenDelta: rawResults[1],
      fixedTokenDeltaUnbalanced: rawResults[3],
      fixedTokenDelta: rawResults[0],
    };
  } catch (error: any) {
    const errSig = getErrorSignature(error);

    if (errSig === 'MarginRequirementNotMet') {
      try {
        const reason = getErrorReason(error);
        const decodingResult = iface.decodeErrorResult(errSig, reason);

        result = {
          marginRequirement: decodingResult.marginRequirement,
          tick: decodingResult.tick,
          fee: decodingResult.cumulativeFeeIncurred,
          variableTokenDelta: decodingResult.variableTokenDelta,
          fixedTokenDelta: decodingResult.fixedTokenDelta,
          fixedTokenDeltaUnbalanced: decodingResult.fixedTokenDeltaUnbalanced,
        };
      } catch (err) {
        console.error(`Failing to get swap results. ${err}`);
      }
    }
  }

  return {
    marginRequirement: descale(result.marginRequirement, tokenDecimals),
    tick: result.tick,
    fee: descale(result.marginRequirement, tokenDecimals),
    availableNotional: Math.abs(descale(result.variableTokenDelta, tokenDecimals)),
    variableTokenDelta: descale(result.variableTokenDelta, tokenDecimals),
    fixedTokenDelta: descale(result.fixedTokenDelta, tokenDecimals),
    fixedTokenDeltaUnbalanced: descale(result.fixedTokenDelta, tokenDecimals),
    averageFixedRate: getAvgFixedRate(result.fixedTokenDeltaUnbalanced, result.variableTokenDelta),
  };
};
