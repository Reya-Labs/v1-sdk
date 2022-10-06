/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumber, Contract, ContractReceipt } from 'ethers';
import { isUndefined } from 'lodash';
import { MIN_FIXED_RATE, MAX_FIXED_RATE, ZERO_BN } from '../constants';
import { MintOrBurnParams } from '../types';
import {
  getErrorReason,
  getErrorSignature,
  getReadableErrorMessage,
  iface,
} from '../utils/errors/errorHandling';
import { getGasBuffer } from '../utils/gasBuffer';
import { descale, scale } from '../utils/scaling';
import { fixedRateToClosestTick } from '../utils/tickHandling';

type RawMintOrBurnArgs = {
  isMint: boolean;
  notional: number;
  margin: number;
  fixedLow: number;
  fixedHigh: number;
  tickSpacing: number;
  tokenDecimals: number;
};

type ProcessedMintOrBurnArgs = {
  tickLower: number;
  tickUpper: number;
  notional: BigNumber;
  margin: BigNumber;
};

export const processMintOrBurnArguments = (args: RawMintOrBurnArgs): ProcessedMintOrBurnArgs => {
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

// execute mint or burn operation
export const execMintOrBurn = async ({
  periphery,
  args,
  ethDeposit,
}: {
  periphery: Contract;
  args: MintOrBurnParams;
  ethDeposit?: BigNumber;
}): Promise<ContractReceipt> => {
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (!isUndefined(ethDeposit)) {
    tempOverrides.value = ethDeposit;
  }

  let transaction;
  try {
    // simulate
    await periphery.callStatic.mintOrBurn(args, tempOverrides);

    // estimate gas and add buffer
    const estimatedGas = await periphery.estimateGas.mintOrBurn(args, tempOverrides);
    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    // create transaction
    transaction = await periphery.mintOrBurn(args, tempOverrides);
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

export type IntermmediateInfoPostMintOrBurn = {
  marginRequirement: number;
};

// get the results of Mint or Burn operation when the call is suceessful
// or use the error to get the information
export const getMintOrBurnResult = async ({
  periphery,
  args,
  tokenDecimals,
}: {
  periphery: Contract;
  args: MintOrBurnParams;
  tokenDecimals: number;
}): Promise<IntermmediateInfoPostMintOrBurn> => {
  let result = {
    marginRequirement: ZERO_BN,
  };

  try {
    const rawResults = await periphery.callStatic.mintOrBurn(args);

    console.log("raw results:", rawResults);
    result = {
      marginRequirement: rawResults,
    };
  } catch (error: any) {
    const errSig = getErrorSignature(error);

    if (errSig === 'MarginLessThanMinimum') {
      const reason = getErrorReason(error);
      const decodingResult = iface.decodeErrorResult(errSig, reason);

      console.log("decoding result:", decodingResult);

      result = {
        marginRequirement: decodingResult.marginRequirement,
      };
    }
  }

  return {
    marginRequirement: descale(result.marginRequirement, tokenDecimals),
  };
};
