/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumber, BigNumberish, Contract, ContractReceipt } from 'ethers';
import { isUndefined } from 'lodash';
import { ZERO_BN } from '../constants';
import {
  getErrorReason,
  getErrorSignature,
  getReadableErrorMessage,
  iface,
} from '../utils/errors/errorHandling';
import { getGasBuffer } from '../utils/gasBuffer';
import { descale, scale } from '../utils/scaling';

export type UserMintOrBurnInfoArgs = {
  isMint: boolean;
  notional: number;
  fixedLow: number;
  fixedHigh: number;
};

export type UserMintOrBurnArgs = UserMintOrBurnInfoArgs & {
  margin: number;
};

export type RawMintOrBurnArgs = UserMintOrBurnInfoArgs & {
  marginErc20: number;
  marginEth: number | undefined;

  marginEngine: string;
  tickFormat: ([fixedLow, fixedHigh]: [number, number]) => [number, number];
  tokenDecimals: number;
};

export type MintOrBurnParams = {
  marginEngine: string;
  tickLower: number;
  tickUpper: number;
  notional: BigNumberish;
  isMint: boolean;
  marginDelta: BigNumberish;
};

export const processMintOrBurnArguments = ({
  isMint,
  notional,
  fixedLow,
  fixedHigh,
  marginErc20,
  marginEth,

  marginEngine,
  tickFormat,
  tokenDecimals,
}: RawMintOrBurnArgs): {
  mintOrBurnParams: MintOrBurnParams;
  ethDeposit: BigNumber | undefined;
} => {
  // sanity checks
  if (notional <= 0) {
    throw new Error('Amount of notional must be greater than 0');
  }

  // tick conversions
  const [tickLower, tickUpper] = tickFormat([fixedLow, fixedHigh]);

  // scale numbers
  const scaledNotional = scale(notional, tokenDecimals);
  const scaledMarginErc20 = scale(marginErc20, tokenDecimals);
  const scaledMarginEth = isUndefined(marginEth) ? undefined : scale(marginEth, tokenDecimals);

  // return processed arguments
  return {
    mintOrBurnParams: {
      marginEngine,
      tickLower,
      tickUpper,
      notional: scaledNotional,
      isMint,
      marginDelta: scaledMarginErc20,
    },
    ethDeposit: scaledMarginEth,
  };
};

// execute mint or burn operation
export const execMintOrBurn = async ({
  periphery,
  params,
  ethDeposit,
}: {
  periphery: Contract;
  params: MintOrBurnParams;
  ethDeposit?: BigNumber;
}): Promise<ContractReceipt> => {
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (!isUndefined(ethDeposit)) {
    tempOverrides.value = ethDeposit;
  }

  let transaction;
  try {
    // simulate
    await periphery.callStatic.mintOrBurn(params, tempOverrides);

    // estimate gas and add buffer
    const estimatedGas = await periphery.estimateGas.mintOrBurn(params, tempOverrides);
    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    // create transaction
    transaction = await periphery.mintOrBurn(params, tempOverrides);
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
  params,
  tokenDecimals,
}: {
  periphery: Contract;
  params: MintOrBurnParams;
  tokenDecimals: number;
}): Promise<IntermmediateInfoPostMintOrBurn> => {
  let result = {
    marginRequirement: ZERO_BN,
  };

  try {
    const rawResults = await periphery.callStatic.mintOrBurn(params);

    result = {
      marginRequirement: rawResults,
    };
  } catch (error: any) {
    const errSig = getErrorSignature(error);

    if (errSig === 'MarginLessThanMinimum') {
      const reason = getErrorReason(error);
      const decodingResult = iface.decodeErrorResult(errSig, reason);

      result = {
        marginRequirement: decodingResult.marginRequirement,
      };
    }
  }

  return {
    marginRequirement: descale(result.marginRequirement, tokenDecimals),
  };
};
