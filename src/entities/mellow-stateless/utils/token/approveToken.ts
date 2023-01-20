import { ethers } from 'ethers';
import { isUndefined } from 'lodash';
import { IERC20MinimalABI } from '../../../../ABIs';
import { MaxUint256Bn, getGasBuffer } from '../../../../constants';
import { getTokenInfo } from '../../../../services/getTokenInfo';
import { scale } from '../../../../utils/scaling';

// Move to utilities
export const approveToken = async ({
  tokenId,
  to,
  amount,
  signer,
}: {
  tokenId: string;
  to: string;
  amount?: number;
  signer: ethers.Signer;
}): Promise<ethers.ContractReceipt> => {
  // Get the token decimals
  const { decimals: tokenDecimals } = getTokenInfo(tokenId);

  // Get the actual amount
  const actualAmount = isUndefined(amount) ? MaxUint256Bn : scale(amount, tokenDecimals);

  // Get the token contract
  const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);

  // Get the gas limit
  const gasLimit = await tokenContract.estimateGas.approve(to, actualAmount);

  // Send the approve transaction
  const tx = await tokenContract.approve(to, amount, {
    gasLimit: getGasBuffer(gasLimit),
  });

  // Wait for the transaction receipt
  const receipt = await tx.wait();

  // Return the receipt
  return receipt;
};
