import AMM from '../AMM/amm';
import { SwapInfo } from '../AMM/types';

export type BorrowAMMConstructorArgs = {
  id: string;
  amm: AMM;
};

export type BorrowSwapInfo = SwapInfo & {
  borrowMarginRequirement: number;
};
