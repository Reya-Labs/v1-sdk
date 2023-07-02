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

  return Number(json[0]['finalBalance']);
};
