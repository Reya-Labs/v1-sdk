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
import { getAvgFixedRate } from '../services/getAvgFixedRate';

export type UserSwapInfoArgs = {
  isFT: boolean;
  notional: number;
  fixedLow: number;
  fixedHigh: number;
};

export type UserSwapArgs = UserSwapInfoArgs & {
  margin: number;
  force?: {
    fullCollateralisation?: boolean;
  };
};

export type RawSwapArgs = UserSwapInfoArgs & {
  marginErc20: number;
  marginEth: number | undefined;

  marginEngine: string;
  tickFormat: ([fixedLow, fixedHigh]: [number, number]) => [number, number];
  tokenScaler: (amount: number) => BigNumber;
};

export type SwapParams = {
  marginEngine: string;
  isFT: boolean;
  notional: BigNumberish;
  sqrtPriceLimitX96: BigNumberish;
  tickLower: number;
  tickUpper: number;
  marginDelta: BigNumberish;
};

export const processSwapArguments = ({
  isFT,
  notional,
  fixedLow,
  fixedHigh,
  marginErc20,
  marginEth,

  marginEngine,
  tickFormat,
  tokenScaler,
}: RawSwapArgs): {
  swapParams: SwapParams;
  ethDeposit: BigNumber | undefined;
} => {
  // sanity checks
  if (notional <= 0) {
    throw new Error('Amount of notional must be greater than 0');
  }

  // tick conversions
  const [tickLower, tickUpper] = tickFormat([fixedLow, fixedHigh]);

  // scale numbers
  const scaledNotional = tokenScaler(notional);
  const scaledMarginErc20 = tokenScaler(marginErc20);
  const scaledMarginEth = isUndefined(marginEth) ? undefined : tokenScaler(marginEth);

  // return processed arguments
  return {
    swapParams: {
      marginEngine,
      isFT,
      notional: scaledNotional,
      marginDelta: scaledMarginErc20,
      tickLower,
      tickUpper,
      sqrtPriceLimitX96: 0,
    },
    ethDeposit: scaledMarginEth,
  };
};

// execute Swap operation
export const execSwap = async ({
  periphery,
  params,
  ethDeposit,
  fullCollateralisation,
}: {
  periphery: Contract;
  params: SwapParams;
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
      await periphery.callStatic.swap(params, tempOverrides);

      // estimate gas and add buffer
      const estimatedGas = await periphery.estimateGas.swap(params, tempOverrides);
      tempOverrides.gasLimit = getGasBuffer(estimatedGas);

      // create transaction
      transaction = await periphery.swap(params, tempOverrides);
    } else {
      // simulate
      await periphery.callStatic.fullyCollateralisedVTSwap(
        params,
        fullCollateralisation.variableFactor,
        tempOverrides,
      );

      // estimate gas and add buffer
      const estimatedGas = await periphery.estimateGas.fullyCollateralisedVTSwap(
        params,
        fullCollateralisation.variableFactor,
        tempOverrides,
      );
      tempOverrides.gasLimit = getGasBuffer(estimatedGas);

      // create transaction
      transaction = await periphery.fullyCollateralisedVTSwap(
        params,
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
  params,
  tokenDescaler,
}: {
  periphery: Contract;
  params: SwapParams;
  tokenDescaler: (amount: BigNumberish) => number;
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
    const rawResults = await periphery.callStatic.swap(params);
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
    marginRequirement: tokenDescaler(result.marginRequirement),
    tick: result.tick,
    fee: tokenDescaler(result.marginRequirement),
    availableNotional: Math.abs(tokenDescaler(result.variableTokenDelta)),
    variableTokenDelta: tokenDescaler(result.variableTokenDelta),
    fixedTokenDelta: tokenDescaler(result.fixedTokenDelta),
    fixedTokenDeltaUnbalanced: tokenDescaler(result.fixedTokenDelta),
    averageFixedRate: getAvgFixedRate(result.fixedTokenDeltaUnbalanced, result.variableTokenDelta),
  };
};
