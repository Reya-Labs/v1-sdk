import { BigNumber, BigNumberish, Contract, ContractReceipt } from 'ethers';
import { isUndefined } from 'lodash';
import { getReadableErrorMessage } from '../utils/errors/errorHandling';
import { getGasBuffer } from '../utils/gasBuffer';

export type UserUpdateMarginArgs = {
  margin: number;
  fixedLow: number;
  fixedHigh: number;
};

export type RawUpdateMarginArgs = UserUpdateMarginArgs & {
  marginErc20: number;
  marginEth: number | undefined;

  marginEngine: string;
  tickFormat: ([fixedLow, fixedHigh]: [number, number]) => [number, number];
  tokenScaler: (amount: number) => BigNumber;
};

export type UpdateMarginParams = {
  marginEngine: string;
  tickLower: number;
  tickUpper: number;
  marginDelta: BigNumberish;
};

export const processUpdateMarginArgumests = ({
  fixedLow,
  fixedHigh,
  marginErc20,
  marginEth,

  marginEngine,
  tickFormat,
  tokenScaler,
}: RawUpdateMarginArgs): {
  updateMarginParams: UpdateMarginParams;
  ethDeposit: BigNumber | undefined;
} => {
  // tick conversions
  const [tickLower, tickUpper] = tickFormat([fixedLow, fixedHigh]);

  // scale numbers
  const scaledMarginErc20 = tokenScaler(marginErc20);
  const scaledMarginEth = isUndefined(marginEth) ? undefined : tokenScaler(marginEth);

  // return processed arguments
  return {
    updateMarginParams: {
      marginEngine,
      tickLower,
      tickUpper,
      marginDelta: scaledMarginErc20,
    },
    ethDeposit: scaledMarginEth,
  };
};

// execute update margin operation
export const execUpdateMargin = async ({
  periphery,
  params,
  ethDeposit,
}: {
  periphery: Contract;
  params: UpdateMarginParams;
  ethDeposit?: BigNumber;
}): Promise<ContractReceipt> => {
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (!isUndefined(ethDeposit)) {
    tempOverrides.value = ethDeposit;
  }

  let transaction;
  try {
    // simulate
    await periphery.callStatic.updatePositionMargin(
      params.marginEngine,
      params.tickLower,
      params.tickUpper,
      params.marginDelta,
      false,
      tempOverrides,
    );

    // estimate gas and add buffer
    const estimatedGas = await periphery.estimateGas.updatePositionMargin(
      params.marginEngine,
      params.tickLower,
      params.tickUpper,
      params.marginDelta,
      false,
      tempOverrides,
    );
    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    // create transaction
    transaction = await periphery.updatePositionMargin(
      params.marginEngine,
      params.tickLower,
      params.tickUpper,
      params.marginDelta,
      false,
      tempOverrides,
    );
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
