import { BigNumber, Contract, ContractReceipt } from 'ethers';
import { getReadableErrorMessage } from '../utils/errors/errorHandling';
import { getGasBuffer } from '../utils/gasBuffer';

export const execApprove = async ({
  token,
  params,
}: {
  token: Contract;
  params: {
    amount: BigNumber;
    spender: string;
  };
}): Promise<ContractReceipt> => {
  let transaction;
  try {
    await token.callStatic.approve(params.spender, params.amount);

    const estimatedGas = await token.estimateGas.approve(params.spender, params.amount);

    transaction = await token.approve(params.spender, params.amount, {
      gasLimit: getGasBuffer(estimatedGas),
    });
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
