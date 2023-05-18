import { ethers } from 'ethers';
import { IERC20MinimalABI } from '../../ABIs';
import { getProvider } from '../../init';
import { getTokenInfo } from '../getTokenInfo';
import { SupportedChainId } from '../../types';
import { exponentialBackoff } from '../../utils/retry';
import { descale, scale } from '../../utils/scaling';

type TokenAllowanceArgs = {
  tokenId: string;
  userAddress: string;
  to: string;
  forceErc20?: boolean;
  chainId: SupportedChainId;
  alchemyApiKey: string;
  infuraApiKey: string;
};

// Returns allowance, descaled and capped at Number.MAX_SAFE_INTEGER
export const tokenAllowance = async ({
  tokenId,
  userAddress,
  to,
  forceErc20,
  chainId,
  alchemyApiKey,
  infuraApiKey,
}: TokenAllowanceArgs): Promise<number> => {
  const provider = getProvider(chainId, alchemyApiKey, infuraApiKey);

  // Get the token decimals
  const { decimals: tokenDecimals, name: tokenName } = getTokenInfo(tokenId);

  // If the token is ETH and the flag that forces ERC20 (i.e. WETH) is not set,
  // then return true
  if (!forceErc20 && tokenName === 'ETH') {
    return Number.MAX_SAFE_INTEGER;
  }

  // Get the token contract
  const tokenContract = new ethers.Contract(tokenId, IERC20MinimalABI, provider);

  // Query the allowance
  const allowance = await exponentialBackoff(() => tokenContract.allowance(userAddress, to));

  let descaledCappedAllowance;
  if (allowance.gt(scale(Number.MAX_SAFE_INTEGER, tokenDecimals))) {
    descaledCappedAllowance = Number.MAX_SAFE_INTEGER;
  } else {
    descaledCappedAllowance = descale(allowance, tokenDecimals);
  }

  return descaledCappedAllowance;
};
