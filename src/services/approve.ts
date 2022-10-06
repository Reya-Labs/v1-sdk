import { BigNumber, Contract, ContractReceipt } from 'ethers';
import { getReadableErrorMessage } from '../utils/errors/errorHandling';
import { getGasBuffer } from '../utils/gasBuffer';

export const execApprove = async ({
  token,
  args,
}: {
  token: Contract;
  args: {
    amount: BigNumber;
    spender: string;
  };
}): Promise<ContractReceipt> => {
  let transaction;
  try {
    await token.callStatic.approve(args.spender, args.amount);

    const estimatedGas = await token.estimateGas.approve(args.spender, args.amount);

    transaction = await token.approve(args.spender, args.amount, {
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
