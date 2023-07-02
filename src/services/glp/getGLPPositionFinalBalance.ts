export type GetPositionFinalBalanceArgs = {
  ownerAddress: string;
  tickLower: number;
  tickUpper: number;
};

export const getGLPPositionFinalBalance = async ({
  ownerAddress,
  tickLower,
  tickUpper,
}: GetPositionFinalBalanceArgs): Promise<number> => {
  return 0;
};
