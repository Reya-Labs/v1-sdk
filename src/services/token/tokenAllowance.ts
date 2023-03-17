import { BigNumber, ethers } from 'ethers';
import { IERC20MinimalABI } from '../../ABIs';
import { TresholdApprovalBn } from '../../constants';
import { getProvider } from '../../init';
import { getTokenInfo } from '../getTokenInfo';
import { SupportedChainId } from '../../types';
import { exponentialBackoff } from '../../utils/retry';
import { descaleToBigNumber } from '../../utils/scaling';

type TokenAllowanceArgs = {
  tokenId: string;
  userAddress: string;
  to: string;
  forceErc20?: boolean;
  chainId: SupportedChainId;
  alchemyApiKey: string;
};

export const tokenAllowance = async ({
  tokenId,
  userAddress,
  to,
  forceErc20,
  chainId,
  alchemyApiKey,
}: TokenAllowanceArgs): Promise<BigNumber> => {
  const provider = getProvider(chainId, alchemyApiKey);

  // Get the token decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);

  // If the token is ETH and the flag that forces ERC20 (i.e. WETH) is not set,
  // then return true
  if (!forceErc20 && tokenName === 'ETH') {
    return TresholdApprovalBn;
  }

  // Get the token contract
  const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, provider);

  // Query the allowance
  const tokenApproval = await exponentialBackoff(() => tokenContract.allowance(userAddress, to));

  return descaleToBigNumber(tokenApproval, tokenDecimals);
};
