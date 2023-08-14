import aavePositionsJSON from './aave_pools_final_balances.json';

export type GetPositionFinalBalanceArgs = {
  ownerAddress: string;
  tickLower: number;
  tickUpper: number;
  vammAddress: string;
};

export const getAavePositionFinalBalance = ({
  ownerAddress,
  tickLower,
  tickUpper,
  vammAddress,
}: GetPositionFinalBalanceArgs): number => {
  const json = aavePositionsJSON;

  const filteredPosition = json.find((position: any) => {
    return (
      position['ownerAddress'] === ownerAddress &&
      position['tickLower'] === tickLower &&
      position['tickUpper'] === tickUpper &&
      position['vammAddress'].toLowerCase() === vammAddress.toLowerCase()
    );
  });

  if (!filteredPosition) {
    throw new Error(
      `No aave (vamm: ${vammAddress}) position found for ownerAddress: ${ownerAddress}, tickLower: ${tickLower}, tickUpper: ${tickUpper}`,
    );
  }

  return Number(filteredPosition['finalBalance']);
};
