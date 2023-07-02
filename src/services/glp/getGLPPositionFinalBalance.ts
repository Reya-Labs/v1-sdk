import glpPositionsJSON from './glp_jun_28_2023_final_balances.json';

export type GetPositionFinalBalanceArgs = {
  ownerAddress: string;
  tickLower: number;
  tickUpper: number;
};

export type FinalBalancesCSVRow = {
  ownerAddress: string;
  tickLower: number;
  tickUpper: number;
  finalBalance: number;
};

export const getGLPPositionFinalBalance = async ({
  ownerAddress,
  tickLower,
  tickUpper,
}: GetPositionFinalBalanceArgs): Promise<number> => {
  const json = glpPositionsJSON;

  const filteredPosition = json.find((position: any) => {
    return (
      position['ownerAddress'] === ownerAddress &&
      position['tickLower'] === tickLower &&
      position['tickUpper'] === tickUpper
    );
  });

  if (!filteredPosition) {
    throw new Error(
      `No glp 28th june position found for ownerAddress: ${ownerAddress}, tickLower: ${tickLower}, tickUpper: ${tickUpper}`,
    );
  }

  return Number(filteredPosition['finalBalance']);
};
