import { BigNumberish, Contract, ContractReceipt } from 'ethers';
import { getReadableErrorMessage } from '../utils/errors/errorHandling';
import { getGasBuffer } from '../utils/gasBuffer';

export type UserSettleArgs = {
  fixedLow: number;
  fixedHigh: number;
};

type RawSettleArgs = UserSettleArgs & {
  owner: string;
  marginEngine: string;
  tickFormat: ([fixedLow, fixedHigh]: [number, number]) => [number, number];
};

export type SettleParams = {
  marginEngine: string;
  owner: string;
  tickLower: BigNumberish;
  tickUpper: BigNumberish;
};

export const processSettleArguments = ({
  fixedLow,
  fixedHigh,

  owner,
  marginEngine,
  tickFormat,
}: RawSettleArgs): SettleParams => {
  // tick conversions
  const [tickLower, tickUpper] = tickFormat([fixedLow, fixedHigh]);

  // return processed arguments
  return {
    marginEngine,
    owner,
    tickLower,
    tickUpper,
  };
};

// execute settle operation
export const execSettle = async ({
  periphery,
  params,
}: {
  periphery: Contract;
  params: SettleParams;
}): Promise<ContractReceipt> => {
  let transaction;
  try {
    // simulate
    await periphery.callStatic.settlePositionAndWithdrawMargin(
      params.marginEngine,
      params.owner,
      params.tickLower,
      params.tickUpper,
    );

    // estimate gas and add buffer
    const estimatedGas = await periphery.estimateGas.settlePositionAndWithdrawMargin(
      params.marginEngine,
      params.owner,
      params.tickLower,
      params.tickUpper,
    );

    // create transaction
    transaction = await periphery.settlePositionAndWithdrawMargin(
      params.marginEngine,
      params.owner,
      params.tickLower,
      params.tickUpper,
      {
        gasLimit: getGasBuffer(estimatedGas),
      },
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
