/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumber, BigNumberish, Contract, ContractReceipt } from 'ethers';
import { isUndefined } from 'lodash';
import { getReadableErrorMessage } from '../utils/errors/errorHandling';
import { getGasBuffer } from '../utils/gasBuffer';
import { scale } from '../utils/scaling';
import { MintOrBurnParams } from './mintOrBurn';

export type UserRolloverWithMintArgs = {
  isMint: boolean;
  notional: number;
  marginErc20: number; // ERC20 or WETH deposit
  marginEth: number; // ETH deposit
  fixedLow: number;
  fixedHigh: number;
  marginEngine: string;

  previousFixedLow: number;
  previousFixedHigh: number;
};

export type RolloverWithMintParams = {
  owner: string;
  previousMarginEngine: string;
  previousTickLower: BigNumberish;
  previousTickUpper: BigNumberish;

  mintParams: MintOrBurnParams;
};

type RawRolloverWithMintArgs = UserRolloverWithMintArgs & {
  previousMarginEngine: string;

  owner: string;
  tickFormat: ([fixedLow, fixedHigh]: [number, number]) => [number, number];
  tokenDecimals: number;
};

export const processRolloverWithMintArguments = ({
  isMint,
  notional,
  marginErc20,
  marginEth,
  fixedLow,
  fixedHigh,
  marginEngine,

  previousFixedLow,
  previousFixedHigh,
  previousMarginEngine,

  owner,
  tickFormat,
  tokenDecimals,
}: RawRolloverWithMintArgs): {
  rolloverWithMintParams: RolloverWithMintParams;
  ethDeposit: BigNumber | undefined;
} => {
  const [tickLower, tickUpper] = tickFormat([fixedLow, fixedHigh]);
  const [previousTickLower, previousTickUpper] = tickFormat([previousFixedLow, previousFixedHigh]);

  // scale numbers
  const scaledNotional = scale(notional, tokenDecimals);
  const scaledMarginErc20 = scale(marginErc20, tokenDecimals);
  const scaledMarginEth = scale(marginEth, tokenDecimals);

  // return processed arguments
  return {
    rolloverWithMintParams: {
      owner,
      previousMarginEngine,
      previousTickLower,
      previousTickUpper,

      mintParams: {
        marginEngine,
        isMint,
        notional: scaledNotional,
        tickLower,
        tickUpper,
        marginDelta: scaledMarginErc20,
      },
    },
    ethDeposit: scaledMarginEth,
  };
};

export const execRolloverWithMint = async ({
  periphery,
  params,
  ethDeposit,
}: {
  periphery: Contract;
  params: RolloverWithMintParams;
  ethDeposit: BigNumber | undefined;
}): Promise<ContractReceipt> => {
  const tempOverrides: { value?: BigNumber; gasLimit?: BigNumber } = {};

  if (!isUndefined(ethDeposit)) {
    tempOverrides.value = ethDeposit;
  }

  let transaction;
  try {
    await periphery.callStatic.rolloverWithMint(
      params.previousMarginEngine,
      params.owner,
      params.previousTickLower,
      params.previousTickUpper,
      params.mintParams,
      tempOverrides,
    );
    const estimatedGas = await periphery.estimateGas.rolloverWithMint(
      params.previousMarginEngine,
      params.owner,
      params.previousTickLower,
      params.previousTickUpper,
      params.mintParams,
      tempOverrides,
    );
    tempOverrides.gasLimit = getGasBuffer(estimatedGas);

    transaction = await periphery.rolloverWithMint(
      params.previousMarginEngine,
      params.owner,
      params.previousTickLower,
      params.previousTickUpper,
      params.mintParams,
      tempOverrides,
    );
  } catch (erorr: any) {
    const errorMessage = getReadableErrorMessage(erorr);
    throw new Error(errorMessage);
  }

  try {
    const receipt = transaction.wait();
    return receipt;
  } catch (error) {
    throw new Error('Transaction confirmation error');
  }
};
