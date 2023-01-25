import { ethers } from 'ethers';
import { isUndefined } from 'lodash';
import { IERC20MinimalABI } from '../../../../ABIs';
import { MaxUint256Bn, getGasBuffer } from '../../../../constants';
import { getTokenInfo } from '../../../../services/getTokenInfo';
import { exponentialBackoff } from '../../../../utils/retry';
import { scale } from '../../../../utils/scaling';

type ApproveTokenArgs = {
  tokenId: string;
  to: string;
  amount?: number;
  signer: ethers.Signer;
};

type ApproveTokenResponse = {
  transaction: {
    receipt: ethers.ContractReceipt;
  };
};

// Move to utilities
export const approveToken = async ({
  tokenId,
  to,
  amount,
  signer,
}: ApproveTokenArgs): Promise<ApproveTokenResponse> => {
  // Get the token decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);

  // Get the actual amount
  const actualAmount = isUndefined(amount) ? MaxUint256Bn : scale(amount, tokenDecimals);

  // Get the token contract
  const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, signer);

  if (tokenName === 'USDT') {
    const userAddress = await exponentialBackoff(() => signer.getAddress());
    const allowance: ethers.BigNumber = await exponentialBackoff(() =>
      tokenContract.allowance(userAddress, to),
    );

    if (allowance.gt(0)) {
      throw new Error('The current approval needs to be reset first.');
    }
  }

  // Get the gas limit
  const gasLimit = await tokenContract.estimateGas.approve(to, actualAmount);

  // Send the approve transaction
  const tx = await tokenContract.approve(to, actualAmount, {
    gasLimit: getGasBuffer(gasLimit),
  });

  // Wait for the transaction receipt
  const receipt: ethers.ContractReceipt = await tx.wait();

  // Return the receipt
  return {
    transaction: {
      receipt,
    },
  };
};
