import { BigNumber, providers, Signer } from 'ethers';
import { isUndefined } from 'lodash';
import { Position } from '../../src/entities/Position/position';
import { getAMM } from './getAMM';

export const getPosition = async ({
  vammAddress,
  marginEngineAddress,
  provider,
  signer,
  tickLower,
  tickUpper,
}: {
  vammAddress: string;
  marginEngineAddress: string;
  provider: providers.Provider;
  signer: Signer | string;
  tickLower: number;
  tickUpper: number;
}): Promise<Position | undefined> => {
  const amm = await getAMM({ vammAddress, provider, signer });

  const userAddress = typeof signer === 'string' ? signer : await signer?.getAddress();
  const positionId = `${marginEngineAddress.toLowerCase()}#${userAddress}#${tickLower}#${tickUpper}`;

  const positionInfo: {
    isSettled: boolean;
    _liquidity: BigNumber;
    margin: BigNumber;
    fixedTokenGrowthInsideLastX128: BigNumber;
    variableTokenGrowthInsideLastX128: BigNumber;
    fixedTokenBalance: BigNumber;
    variableTokenBalance: BigNumber;
    feeGrowthInsideLastX128: BigNumber;
    rewardPerAmount: BigNumber;
    accumulatedFees: BigNumber;
  } = await amm.readOnlyContracts?.marginEngine.callStatic.getPosition(
    userAddress,
    tickLower,
    tickUpper,
  );

  if (isUndefined(positionInfo)) {
    return;
  }

  const position = new Position({
    id: positionId,
    amm,
    timestamp: 0,

    owner: userAddress,
    tickLower,
    tickUpper,
    positionType:
      positionInfo._liquidity.gt(0) || positionInfo.accumulatedFees.gt(0)
        ? 3
        : positionInfo.variableTokenBalance.gt(0)
        ? 2
        : 1,

    liquidity: positionInfo._liquidity,
    accumulatedFees: positionInfo.accumulatedFees,

    fixedTokenBalance: positionInfo.fixedTokenBalance,
    variableTokenBalance: positionInfo.variableTokenBalance,
    margin: positionInfo.margin,

    isSettled: positionInfo.isSettled,

    mints: [],
    burns: [],
    swaps: [],
    marginUpdates: [],
    liquidations: [],
    settlements: [],
  });

  await position.init();

  return position;
};
