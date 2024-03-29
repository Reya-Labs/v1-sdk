import { ethers } from 'ethers';
import { isUndefined } from 'lodash';
import { IERC20MinimalABI } from '../../ABIs';
import { TresholdApprovalBn } from '../../constants';
import { getProvider } from '../../init';
import { getTokenInfo } from '../getTokenInfo';
import { SupportedChainId } from '../../types';
import { exponentialBackoff } from '../../utils/retry';
import { scale } from '../../utils/scaling';

type IsTokenApprovedArgs = {
  tokenId: string;
  userAddress: string;
  to: string;
  threshold?: number;
  forceErc20?: boolean;
  chainId: SupportedChainId;
  alchemyApiKey: string;
  infuraApiKey: string;
};

export const isTokenApproved = async ({
  tokenId,
  userAddress,
  to,
  threshold,
  forceErc20,
  chainId,
  alchemyApiKey,
  infuraApiKey,
}: IsTokenApprovedArgs): Promise<boolean> => {
  const provider = getProvider(chainId, alchemyApiKey, infuraApiKey);

  // Get the token decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);

  // If the token is ETH and the flag that forces ERC20 (i.e. WETH) is not set,
  // then return true
  if (!forceErc20 && tokenName === 'ETH') {
    return true;
  }

  // Get the actual threshold
  const actualAmount = isUndefined(threshold)
    ? TresholdApprovalBn
    : scale(threshold, tokenDecimals);

  // Get the token contract
  const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, provider);

  // Query the allowance
  const tokenApproval = await exponentialBackoff(() => tokenContract.allowance(userAddress, to));

  // Return if the allowance is above the threshold
  return tokenApproval.gte(actualAmount);
};
